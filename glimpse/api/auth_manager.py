#!/usr/bin/env python3
"""
Authentication Manager

Uses browser-use's built-in cookies storage to handle login sessions
instead of complex Chrome profile directory syncing.

This approach is more reliable across different browser instances and security contexts.
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional, List, Dict, Any

# Add the local browser-use directory to the Python path (same as agent.py)
current_dir = Path(__file__).resolve().parent
local_browser_use_path = current_dir / "browser-use"
if str(local_browser_use_path) not in sys.path:
    sys.path.insert(0, str(local_browser_use_path))
parent_dir = current_dir.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

# Note for IDE type checking (this comment helps IDEs recognize the import)
# browser_use can be found in glimpse/api/browser-use/browser_use/

logger = logging.getLogger(__name__)

class AuthManager:
    """Manages authentication cookies and storage state for browser sessions."""
    
    def __init__(self, project_root: Optional[Path] = None):
        if project_root is None:
            # Auto-detect project root - go up from this file location
            self.project_root = Path(__file__).resolve().parent.parent.parent
        else:
            self.project_root = project_root
            
        # Store auth data in project root
        self.auth_dir = self.project_root / "auth_data"
        self.auth_dir.mkdir(parents=True, exist_ok=True)
        
        # Main storage files
        self.cookies_file = self.auth_dir / "cookies.json"
        self.storage_state_file = self.auth_dir / "storage_state.json"
        
    def save_cookies_from_session(self, cookies: List[Dict[str, Any]]) -> bool:
        """Save cookies from a browser session."""
        try:
            self.cookies_file.write_text(json.dumps(cookies, indent=2))
            logger.info(f"Saved {len(cookies)} cookies to {self.cookies_file}")
            return True
        except Exception as e:
            logger.error(f"Failed to save cookies: {e}")
            return False
    
    def load_cookies(self) -> List[Dict[str, Any]]:
        """Load saved cookies."""
        try:
            if self.cookies_file.exists():
                cookies = json.loads(self.cookies_file.read_text())
                logger.info(f"Loaded {len(cookies)} cookies from {self.cookies_file}")
                return cookies
            else:
                logger.info("No saved cookies found")
                return []
        except Exception as e:
            logger.error(f"Failed to load cookies: {e}")
            return []
    
    def save_storage_state_from_session(self, storage_state: Dict[str, Any]) -> bool:
        """Save complete storage state (cookies + localStorage + sessionStorage)."""
        try:
            self.storage_state_file.write_text(json.dumps(storage_state, indent=2))
            logger.info(f"Saved storage state to {self.storage_state_file}")
            return True
        except Exception as e:
            logger.error(f"Failed to save storage state: {e}")
            return False
    
    def load_storage_state(self) -> Optional[Dict[str, Any]]:
        """Load saved storage state."""
        try:
            if self.storage_state_file.exists():
                storage_state = json.loads(self.storage_state_file.read_text())
                logger.info(f"Loaded storage state from {self.storage_state_file}")
                return storage_state
            else:
                logger.info("No saved storage state found")
                return None
        except Exception as e:
            logger.error(f"Failed to load storage state: {e}")
            return None
    
    def get_browser_profile_kwargs(self, **additional_kwargs) -> Dict[str, Any]:
        """Get browser profile kwargs with authentication data loaded."""
        
        # Import BrowserChannel to use enum values from local browser-use
        from browser_use.browser.profile import BrowserChannel
        
        kwargs = {
            # Use Chromium for better compatibility and user preference
            "channel": BrowserChannel.CHROMIUM,
            
            # Basic configuration
            "headless": False,
            "disable_security": True,
            "keep_alive": True,
            
            # Human-like behavior
            "use_human_like_mouse": True,
            "mouse_movement_pattern": "human",
            "min_mouse_movement_time": 0.3,
            "max_mouse_movement_time": 1.0,
            "mouse_speed_variation": 0.4,
            "show_visual_cursor": True,
            "highlight_elements": False,
            
            # Window configuration
            "window_size": {"width": 1920, "height": 1080},
            "window_position": {"width": 0, "height": 0},
            "no_viewport": True,
            
            # Remove user_data_dir to avoid conflicts with storage_state
            "user_data_dir": None,
            
            # Chrome args for consistency
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
                "--no-default-browser-check",
                "--disable-background-mode",
                "--enable-features=NetworkService",
                "--new-window",
                "--disable-session-crashed-bubble",
                "--disable-infobars",
            ],
        }
        
        # Load storage state if available (preferred method)
        storage_state = self.load_storage_state()
        if storage_state:
            kwargs["storage_state"] = storage_state
            logger.info("Browser profile configured with saved storage state")
        elif self.cookies_file.exists():
            # Fallback to cookies_file if no storage state
            kwargs["cookies_file"] = str(self.cookies_file)
            logger.info("Browser profile configured with saved cookies file")
        else:
            logger.info("Browser profile configured without authentication data")
        
        # Apply additional kwargs
        kwargs.update(additional_kwargs)
        
        return kwargs
    
    def has_saved_auth(self) -> bool:
        """Check if we have any saved authentication data."""
        return (self.cookies_file.exists() and self.cookies_file.stat().st_size > 10) or \
               (self.storage_state_file.exists() and self.storage_state_file.stat().st_size > 10)
    
    def clear_auth_data(self) -> bool:
        """Clear all saved authentication data."""
        try:
            if self.cookies_file.exists():
                self.cookies_file.unlink()
            if self.storage_state_file.exists():
                self.storage_state_file.unlink()
            logger.info("Cleared all authentication data")
            return True
        except Exception as e:
            logger.error(f"Failed to clear auth data: {e}")
            return False
    
    def get_auth_status(self) -> Dict[str, Any]:
        """Get current authentication status."""
        status = {
            "has_cookies": self.cookies_file.exists(),
            "has_storage_state": self.storage_state_file.exists(),
            "cookies_count": 0,
            "auth_dir": str(self.auth_dir)
        }
        
        if status["has_cookies"]:
            try:
                cookies = self.load_cookies()
                status["cookies_count"] = len(cookies)
                
                # Check for Google-specific cookies
                google_cookies = [c for c in cookies if 'google.com' in c.get('domain', '')]
                status["google_cookies_count"] = len(google_cookies)
                status["has_google_auth"] = len(google_cookies) > 0
                
            except Exception as e:
                logger.warning(f"Could not analyze cookies: {e}")
        
        return status


# Global instance for easy access
auth_manager = AuthManager() 