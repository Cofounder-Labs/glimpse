#!/usr/bin/env python3
"""
Chrome Manager Utility

Centralizes Chrome instance management to prevent race conditions and ensure
consistent user data directory usage across all scenarios.

Supports multiple Chrome instances running simultaneously while sharing
the same user data directory for login sessions.
"""

import os
import time
import subprocess
import logging
import requests
import shutil
from pathlib import Path
from typing import Optional, Tuple, List
import psutil
import random
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class ChromeManager:
    """Manages Chrome instances with persistent user data directory and multi-instance support."""
    
    def __init__(self, project_root: Optional[Path] = None):
        if project_root is None:
            # Auto-detect project root - go up from this file location
            self.project_root = Path(__file__).resolve().parent.parent.parent
        else:
            self.project_root = project_root
            
        self.user_data_dir = self.project_root / "chromium_user_data"
        self.default_port = 9222
        self.chrome_path = self._get_chrome_path()
        
    def _get_chrome_path(self) -> str:
        """Get the Chrome executable path for the current OS."""
        import sys
        if sys.platform == "darwin":  # macOS
            return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        elif sys.platform == "win32":  # Windows
            paths = [
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            ]
            for path in paths:
                if os.path.exists(path):
                    return path
        else:  # Linux
            paths = [
                "/usr/bin/google-chrome",
                "/usr/bin/google-chrome-stable",
                "/usr/bin/chromium-browser",
                "/usr/bin/chromium",
            ]
            for path in paths:
                if os.path.exists(path):
                    return path
        
        raise FileNotFoundError("Chrome/Chromium not found. Please install Chrome.")
    
    def get_user_data_dir(self) -> Path:
        """Get the persistent user data directory."""
        self.user_data_dir.mkdir(parents=True, exist_ok=True)
        return self.user_data_dir
    
    def is_chrome_running_on_port(self, port: int = None) -> bool:
        """Check if Chrome is running with remote debugging on the given port."""
        port = port or self.default_port
        try:
            response = requests.get(f'http://localhost:{port}/json/version', timeout=2)
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False
    
    def find_available_port(self, start_port: int = None) -> int:
        """Find an available port for remote debugging, starting from start_port."""
        start_port = start_port or self.default_port
        
        for port in range(start_port, start_port + 100):  # Try 100 ports
            if not self.is_chrome_running_on_port(port):
                return port
        
        raise RuntimeError(f"No available ports found starting from {start_port}")
    
    def find_chrome_processes_with_user_data_dir(self) -> List[dict]:
        """Find Chrome processes using our user data directory."""
        processes = []
        try:
            for proc in psutil.process_iter(['pid', 'cmdline', 'name']):
                try:
                    cmdline = proc.info.get('cmdline') or []
                    cmdline_str = ' '.join(cmdline)
                    if (proc.info.get('name', '').lower().find('chrome') != -1 and
                        f'--user-data-dir={self.user_data_dir}' in cmdline_str):
                        
                        # Extract debugging port if present
                        debug_port = None
                        for arg in cmdline:
                            if arg.startswith('--remote-debugging-port='):
                                debug_port = int(arg.split('=')[1])
                                break
                        
                        processes.append({
                            'pid': proc.info['pid'],
                            'cmdline': cmdline,
                            'debug_port': debug_port,
                            'name': proc.info['name']
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied, ValueError):
                    continue
        except Exception as e:
            logger.warning(f"Could not enumerate Chrome processes: {e}")
        return processes
    
    def get_chrome_instances_summary(self) -> dict:
        """Get a summary of Chrome instances using our user data directory."""
        processes = self.find_chrome_processes_with_user_data_dir()
        
        ports_in_use = []
        for proc in processes:
            if proc['debug_port']:
                ports_in_use.append(proc['debug_port'])
        
        return {
            'total_instances': len(processes),
            'processes': processes,
            'debug_ports_in_use': sorted(ports_in_use),
            'user_data_dir': str(self.user_data_dir)
        }
    
    def kill_chrome_on_port(self, port: int = None) -> bool:
        """Kill Chrome processes using the specified remote debugging port."""
        port = port or self.default_port
        try:
            subprocess.run(['pkill', '-f', f'remote-debugging-port={port}'], check=False)
            time.sleep(2)  # Wait for processes to be killed
            logger.info(f"Killed Chrome processes on port {port}")
            return True
        except FileNotFoundError:
            logger.warning("pkill command not found. Cannot kill existing Chrome processes.")
            return False
        except Exception as e:
            logger.error(f"Error killing Chrome processes: {e}")
            return False
    
    def kill_all_chrome_instances(self) -> bool:
        """Kill ALL Chrome instances using our user data directory."""
        processes = self.find_chrome_processes_with_user_data_dir()
        
        if not processes:
            logger.info("No Chrome instances found using our user data directory")
            return True
        
        logger.info(f"Killing {len(processes)} Chrome instances using our user data directory")
        
        for proc in processes:
            try:
                psutil.Process(proc['pid']).terminate()
                logger.info(f"Terminated Chrome process {proc['pid']} (port: {proc['debug_port']})")
            except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                logger.warning(f"Could not terminate process {proc['pid']}: {e}")
        
        time.sleep(3)  # Wait for processes to be killed
        
        # Verify they're actually gone
        remaining = self.find_chrome_processes_with_user_data_dir()
        if remaining:
            logger.warning(f"{len(remaining)} Chrome processes still running after termination attempt")
            return False
        else:
            logger.info("Successfully killed all Chrome instances")
            return True
    
    def prepare_user_data_dir_for_multi_instance(self) -> bool:
        """Prepare user data directory to support multiple Chrome instances safely."""
        user_data_dir = self.get_user_data_dir()
        
        # Don't remove SingletonLock for multi-instance - Chrome handles this
        # Just ensure the directory exists and is accessible
        try:
            # Create a test file to verify write access
            test_file = user_data_dir / ".chrome_manager_test"
            test_file.write_text("test")
            test_file.unlink()
            
            logger.info(f"User data directory ready for multi-instance use: {user_data_dir}")
            return True
        except Exception as e:
            logger.error(f"Cannot prepare user data directory: {e}")
            return False
    
    def launch_chrome_for_debugging(self, port: int = None, start_url: str = "http://localhost:3000", 
                                   allow_existing: bool = True) -> Tuple[bool, int]:
        """
        Launch Chrome with remote debugging and persistent user data directory.
        
        Args:
            port: Specific port to use (if None, will find available port)
            start_url: URL to open initially
            allow_existing: If True, allows existing Chrome instances to continue running
            
        Returns:
            Tuple of (success: bool, port_used: int)
        """
        
        if not os.path.exists(self.chrome_path):
            raise FileNotFoundError(f"Chrome not found at {self.chrome_path}")
        
        # Prepare user data directory for multi-instance use
        if not self.prepare_user_data_dir_for_multi_instance():
            return False, 0
        
        # Determine which port to use
        if port is None:
            port = self.find_available_port()
        else:
            if self.is_chrome_running_on_port(port) and not allow_existing:
                logger.warning(f"Port {port} is already in use and allow_existing=False")
                return False, port
        
        # Check current Chrome instances
        summary = self.get_chrome_instances_summary()
        logger.info(f"Current Chrome instances: {summary['total_instances']} "
                   f"(ports: {summary['debug_ports_in_use']})")
        
        # If Chrome is already running on this port with our user data directory, that's fine
        if self.is_chrome_running_on_port(port):
            if allow_existing:
                logger.info(f"✅ Chrome already running on port {port} with shared user directory")
                return True, port
            else:
                logger.warning(f"Port {port} already in use")
                return False, port
        
        # Launch Chrome with multi-instance friendly flags
        args = [
            self.chrome_path,
            f'--remote-debugging-port={port}',
            f'--user-data-dir={self.user_data_dir}',
            start_url,
            '--no-first-run',
            '--disable-default-apps',
            '--disable-popup-blocking',
            '--start-maximized',
            # Multi-instance friendly flags
            '--no-default-browser-check',
            '--disable-background-mode',  # Prevent Chrome from staying in background
            '--disable-background-timer-throttling',
            '--enable-features=NetworkService',  # Better network isolation
        ]
        
        try:
            subprocess.Popen(args)
            time.sleep(3)  # Wait for Chrome to start
            
            # Verify connection
            if self.is_chrome_running_on_port(port):
                summary = self.get_chrome_instances_summary()
                logger.info(f"✅ Successfully launched Chrome on port {port}")
                logger.info(f"Total Chrome instances now: {summary['total_instances']} "
                           f"(ports: {summary['debug_ports_in_use']})")
                return True, port
            else:
                logger.error(f"❌ Chrome launched but remote debugging not available on port {port}")
                return False, port
                
        except Exception as e:
            logger.error(f"❌ Error launching Chrome: {e}")
            return False, port
    
    def get_profile_kwargs_for_browser_use(self, recording_dir: Optional[Path] = None, 
                                         debug_port: Optional[int] = None,
                                         use_separate_profile: bool = True) -> dict:
        """Get consistent browser profile kwargs for browser-use library with multi-instance support."""
        
        # Find available port if not specified
        if debug_port is None:
            debug_port = self.find_available_port()
        
        # Use separate user data directory for browser-use instances to avoid conflicts
        # while still sharing login data through Chrome profile syncing
        if use_separate_profile:
            base_user_data_dir = self.get_user_data_dir()
            # Create a separate user data dir for this instance but copy login data
            instance_user_data_dir = base_user_data_dir.parent / f"chromium_user_data_agent_{debug_port}"
            
            # Copy essential login data from main profile to agent profile
            self._sync_login_data_to_instance(base_user_data_dir, instance_user_data_dir)
            user_data_dir_to_use = str(instance_user_data_dir)
        else:
            user_data_dir_to_use = str(self.get_user_data_dir())
        
        kwargs = {
            "use_human_like_mouse": True,
            "mouse_movement_pattern": "human",
            "min_mouse_movement_time": 0.3,
            "max_mouse_movement_time": 1.0,
            "mouse_speed_variation": 0.4,
            "show_visual_cursor": True,
            "highlight_elements": False,
            "user_data_dir": user_data_dir_to_use,
            "args": [
                "--autoplay-policy=no-user-gesture-required", 
                "--no-sandbox",
                "--disable-web-security",
                "--disable-features=VizDisplayCompositor",
                "--force-device-scale-factor=1",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
                "--disable-field-trial-config",
                "--no-first-run",
                "--disable-default-apps",
                # Multi-instance friendly flags - REMOVED remote-debugging-port from here
                # Let browser-use handle its own debugging setup
                "--no-default-browser-check",
                "--disable-background-mode",
                "--enable-features=NetworkService",
                # Force new instance instead of reusing existing
                "--new-window",
                "--disable-session-crashed-bubble",
                "--disable-infobars",
            ],
            "window_size": {"width": 1920, "height": 1080},
            "window_position": {"width": 0, "height": 0},
            "headless": False,
            "no_viewport": True,
            "disable_security": True,
        }
        
        if recording_dir:
            kwargs["record_video_dir"] = str(recording_dir)
            kwargs["record_video_size"] = {"width": 1920, "height": 1080}
            
        return kwargs
    
    def _sync_login_data_to_instance(self, source_dir: Path, target_dir: Path) -> bool:
        """Sync login data from main profile to instance profile."""
        
        try:
            # Create target directory
            target_dir.mkdir(parents=True, exist_ok=True)
            target_default = target_dir / "Default"
            target_default.mkdir(parents=True, exist_ok=True)
            
            source_default = source_dir / "Default"
            if not source_default.exists():
                logger.info(f"Source profile {source_default} doesn't exist yet, skipping sync")
                return True
            
            # Copy essential login files
            login_files = [
                "Cookies",
                "Login Data", 
                "Web Data",
                "Local Storage",
                "Session Storage",
                "Preferences"
            ]
            
            for file_name in login_files:
                source_file = source_default / file_name
                target_file = target_default / file_name
                
                if source_file.exists():
                    try:
                        if source_file.is_file():
                            shutil.copy2(source_file, target_file)
                        elif source_file.is_dir():
                            if target_file.exists():
                                shutil.rmtree(target_file)
                            shutil.copytree(source_file, target_file)
                        logger.debug(f"Synced {file_name} to instance profile")
                    except Exception as e:
                        logger.warning(f"Could not sync {file_name}: {e}")
            
            logger.info(f"Synced login data from {source_dir} to {target_dir}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync login data: {e}")
            return False
    
    def cleanup_agent_profiles(self, max_age_hours: int = 24) -> int:
        """Clean up old agent profile directories to save disk space."""
        cleaned_count = 0
        project_root = self.project_root
        
        try:
            # Find all agent profile directories
            agent_dirs = list(project_root.glob("chromium_user_data_agent_*"))
            
            cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
            
            for agent_dir in agent_dirs:
                try:
                    # Check if directory is old enough to clean up
                    dir_mtime = datetime.fromtimestamp(agent_dir.stat().st_mtime)
                    if dir_mtime < cutoff_time:
                        # Check if any Chrome process is still using this directory
                        processes = self.find_chrome_processes_with_user_data_dir()
                        dir_in_use = any(str(agent_dir) in ' '.join(proc['cmdline']) for proc in processes)
                        
                        if not dir_in_use:
                            shutil.rmtree(agent_dir)
                            logger.info(f"Cleaned up old agent profile: {agent_dir}")
                            cleaned_count += 1
                        else:
                            logger.debug(f"Skipping cleanup of in-use directory: {agent_dir}")
                    
                except Exception as e:
                    logger.warning(f"Could not clean up {agent_dir}: {e}")
            
            logger.info(f"Cleaned up {cleaned_count} old agent profile directories")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error during agent profile cleanup: {e}")
            return 0
    
    def list_agent_profiles(self) -> List[dict]:
        """List all agent profile directories and their status."""
        project_root = self.project_root
        profiles = []
        
        try:
            agent_dirs = list(project_root.glob("chromium_user_data_agent_*"))
            processes = self.find_chrome_processes_with_user_data_dir()
            
            for agent_dir in agent_dirs:
                # Check if in use
                in_use = any(str(agent_dir) in ' '.join(proc['cmdline']) for proc in processes)
                
                # Get directory info
                stat = agent_dir.stat()
                profiles.append({
                    'path': str(agent_dir),
                    'name': agent_dir.name,
                    'in_use': in_use,
                    'created': stat.st_ctime,
                    'modified': stat.st_mtime,
                    'size_mb': sum(f.stat().st_size for f in agent_dir.rglob('*') if f.is_file()) / (1024 * 1024)
                })
            
            return profiles
            
        except Exception as e:
            logger.error(f"Error listing agent profiles: {e}")
            return []


# Global instance for easy access
chrome_manager = ChromeManager() 