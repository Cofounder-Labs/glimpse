#!/usr/bin/env python3
"""
Setup script to launch Chromium with a persistent user directory.

This script allows you to:
1. Launch Chromium with a persistent user data directory
2. Login to any services you need (GitHub, Google, etc.)
3. Save those login sessions for use by the agent

The same user directory will be used by the agent when running demos.
"""

import os
import sys
import subprocess
import time
from pathlib import Path
import requests


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
    print("🔧 Glimpse Chromium Profile Setup")
    print("=" * 40)
    
    # Get Chrome path
    chrome_path = get_chrome_path()
    if not chrome_path:
        return 1
    
    # Get user data directory
    user_data_dir = get_user_data_dir()
    
    print(f"📂 User data directory: {user_data_dir}")
    print(f"🌐 Chrome executable: {chrome_path}")
    
    # Kill existing processes if needed
    if not kill_existing_chrome_processes():
        return 1
    
    # Launch Chrome
    launch_chrome_with_profile(chrome_path, user_data_dir)
    
    return 0


if __name__ == "__main__":
    sys.exit(main()) 