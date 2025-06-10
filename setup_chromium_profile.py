#!/usr/bin/env python3
"""
Enhanced Setup script to launch Chromium with a persistent user directory.

This script allows you to:
1. Launch Chromium with a persistent user data directory
2. Login to any services you need (GitHub, Google, etc.)
3. Save those login sessions for use by the agent

The same user directory will be used by the agent when running demos.
Now uses the centralized ChromeManager for consistency.
"""

import os
import sys
import subprocess
import time
from pathlib import Path
import requests

# Add the glimpse module to the path so we can import ChromeManager
sys.path.insert(0, str(Path(__file__).parent / "glimpse"))

try:
    from api.chrome_manager import ChromeManager
    chrome_manager = ChromeManager()
    print("✅ Using ChromeManager for consistent configuration")
except ImportError:
    print("⚠️  ChromeManager not available, falling back to standalone mode")
    chrome_manager = None


def launch_chrome_for_setup():
    """Launch Chrome for manual setup using ChromeManager if available."""
    
    if chrome_manager:
        # Use ChromeManager for consistent behavior
        print(f"🚀 Launching Chrome with persistent user directory: {chrome_manager.user_data_dir}")
        print("🔧 Using ChromeManager for consistent configuration with agent runs")
        
        try:
            # Show current Chrome instances
            summary = chrome_manager.get_chrome_instances_summary()
            if summary['total_instances'] > 0:
                print(f"📊 Found {summary['total_instances']} existing Chrome instance(s) using shared directory")
                print(f"🔧 Current debug ports: {summary['debug_ports_in_use']}")
                
                restart_choice = input("Do you want to launch a new Chrome instance for setup? (Y/n): ").lower()
                if restart_choice in ['n', 'no']:
                    print("✅ Using existing Chrome instances. You can login in any of the running windows.")
                    print("💡 All Chrome instances share the same user data directory for login sessions.")
                    return True
            
            # Find available port for setup
            setup_port = chrome_manager.find_available_port(9222)
            
            # Launch Chrome for setup, allowing existing instances
            success, port_used = chrome_manager.launch_chrome_for_debugging(
                port=setup_port,
                start_url="about:blank",  # Start with blank page for setup
                allow_existing=True
            )
            
            if success:
                summary = chrome_manager.get_chrome_instances_summary()
                print(f"✅ Chrome launched successfully for profile setup on port {port_used}")
                print(f"📊 Total Chrome instances now: {summary['total_instances']} (all sharing login data)")
                print("📝 Chrome is now ready for you to login to any services you need.")
                print("\n🎯 To use this profile with the agent:")
                print("   1. Login to any services you need in this Chrome window")
                print("   2. You can keep Chrome running while using the agent")
                print("   3. Run 'poetry run python glimpse/run.py' - it will use the same shared directory")
                print("   4. All Chrome instances will share your login sessions!")
                print(f"\n💡 Chrome instances will use ports: {summary['debug_ports_in_use']}")
                print("⚠️  Note: You can close this terminal - Chrome will keep running")
                
                return True
            else:
                print("❌ Chrome launched but setup verification failed")
                return False
                
        except Exception as e:
            print(f"❌ Error launching Chrome with ChromeManager: {e}")
            return False
    
    else:
        # Fallback to original method
        return launch_chrome_fallback()


def launch_chrome_fallback():
    """Fallback method if ChromeManager is not available."""
    print("🔄 Using fallback Chrome launching method")
    
    chrome_path = get_chrome_path()
    if not chrome_path:
        return False
    
    user_data_dir = get_user_data_dir()
    
    if not kill_existing_chrome_processes():
        return False
    
    launch_chrome_with_profile(chrome_path, user_data_dir)
    return True


def get_chrome_path():
    """Get the Chrome executable path for the current OS."""
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
    
    print("❌ Chrome/Chromium not found. Please install Chrome or update the path in this script.")
    return None


def get_user_data_dir():
    """Get the user data directory path relative to the repo."""
    repo_root = Path(__file__).parent
    user_data_dir = repo_root / "chromium_user_data"
    return user_data_dir


def kill_existing_chrome_processes(port=9222):
    """Kill any existing Chrome processes using the remote debugging port."""
    try:
        # Try to connect to see if Chrome is already running on this port
        response = requests.get(f'http://localhost:{port}/json/version', timeout=2)
        if response.status_code == 200:
            print(f"🔄 Chrome is already running on port {port}")
            kill_choice = input("Do you want to kill existing Chrome processes? (y/N): ").lower()
            if kill_choice in ['y', 'yes']:
                if sys.platform == "darwin":
                    subprocess.run(['pkill', '-f', f'remote-debugging-port={port}'], check=False)
                elif sys.platform == "win32":
                    subprocess.run(['taskkill', '/F', '/IM', 'chrome.exe'], check=False)
                else:  # Linux
                    subprocess.run(['pkill', '-f', f'remote-debugging-port={port}'], check=False)
                time.sleep(2)
                print(f"✅ Killed existing Chrome processes")
            else:
                print("❌ Keeping existing Chrome processes. You may need to close them manually.")
                return False
    except requests.exceptions.ConnectionError:
        # Chrome is not running on this port, which is fine
        pass
    except Exception as e:
        print(f"⚠️  Warning: Could not check for existing Chrome processes: {e}")
    
    return True


def launch_chrome_with_profile(chrome_path, user_data_dir, port=9222):
    """Launch Chrome with the persistent user data directory and remote debugging."""
    
    # Ensure user data directory exists
    user_data_dir.mkdir(parents=True, exist_ok=True)
    
    chrome_args = [
        chrome_path,
        f'--user-data-dir={user_data_dir}',
        f'--remote-debugging-port={port}',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--start-maximized',
    ]
    
    print(f"🚀 Launching Chrome with user data directory: {user_data_dir}")
    print(f"🔧 Remote debugging port: {port}")
    print("💡 You can now login to any services you need. These login sessions will be saved.")
    print("💡 The agent will use the same user directory and will have access to your login sessions.")
    
    try:
        # Launch Chrome
        process = subprocess.Popen(chrome_args)
        
        # Wait a moment for Chrome to start
        time.sleep(3)
        
        # Verify Chrome is running with remote debugging
        try:
            response = requests.get(f'http://localhost:{port}/json/version', timeout=5)
            if response.status_code == 200:
                print(f"✅ Chrome launched successfully with remote debugging on port {port}")
                print("📝 Chrome is now ready for you to login to any services you need.")
                print("\n🎯 To use this profile with the agent:")
                print("   1. Login to any services you need in this Chrome window")
                print("   2. Close Chrome when done")
                print("   3. Run the agent - it will automatically use this profile")
                print("\n⚠️  Note: Keep this terminal open if you want to monitor Chrome's output")
                print("   Press Ctrl+C to stop monitoring (Chrome will keep running)")
                
                # Keep the script running to monitor
                try:
                    process.wait()
                except KeyboardInterrupt:
                    print("\n🔄 Monitoring stopped. Chrome is still running.")
                    
            else:
                print(f"❌ Chrome started but remote debugging is not responding on port {port}")
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Chrome started but remote debugging is not available on port {port}")
            
    except FileNotFoundError:
        print(f"❌ Chrome executable not found at: {chrome_path}")
        print("Please install Chrome or update the path in this script.")
    except Exception as e:
        print(f"❌ Error launching Chrome: {e}")


def main():
    print("🔧 Enhanced Glimpse Chromium Profile Setup")
    print("=" * 45)
    
    if chrome_manager:
        print(f"📂 User data directory: {chrome_manager.user_data_dir}")
        print(f"🌐 Chrome executable: {chrome_manager.chrome_path}")
        print("🎯 Using ChromeManager for consistency with agent runs")
    else:
        user_data_dir = get_user_data_dir()
        chrome_path = get_chrome_path()
        if not chrome_path:
            return 1
        print(f"📂 User data directory: {user_data_dir}")
        print(f"🌐 Chrome executable: {chrome_path}")
        print("⚠️  Using fallback mode (ChromeManager not available)")
    
    # Launch Chrome for setup
    if launch_chrome_for_setup():
        print("\n✅ Setup completed successfully!")
        print("🎉 Your login sessions are now saved for agent use.")
        return 0
    else:
        print("\n❌ Setup failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main()) 