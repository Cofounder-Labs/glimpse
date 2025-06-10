#!/usr/bin/env python3
"""
Authentication Setup for Glimpse

Uses browser-use's built-in storage mechanisms to save/restore login sessions.
This replaces the complex Chrome profile directory syncing approach.
"""

import asyncio
import sys
import json
from pathlib import Path

# Add glimpse to Python path
sys.path.insert(0, str(Path(__file__).parent / "glimpse"))

from api.auth_manager import auth_manager
from api.browser_use import Browser


async def setup_authentication():
    """Set up authentication by capturing login sessions from browser."""
    
    print("🔐 Glimpse Authentication Setup")
    print("=" * 40)
    
    # Check current auth status
    status = auth_manager.get_auth_status()
    print(f"📂 Auth directory: {status['auth_dir']}")
    
    if status['has_cookies'] or status['has_storage_state']:
        print(f"✅ Found existing auth data:")
        if status['has_cookies']:
            print(f"   - {status['cookies_count']} cookies")
            if status.get('has_google_auth'):
                print(f"   - {status['google_cookies_count']} Google cookies")
        if status['has_storage_state']:
            print(f"   - Storage state available")
        
        choice = input("\n🔄 Clear existing auth and start fresh? (y/N): ").strip().lower()
        if choice == 'y':
            auth_manager.clear_auth_data()
            print("🗑️ Cleared existing authentication data")
    
    print("\n🌐 Starting browser for authentication setup...")
    print("💡 Please login to any services you need (Google, GitHub, etc.)")
    print("💡 When finished, close the browser or press Ctrl+C here")
    
    # Configure browser with auth manager
    browser_kwargs = auth_manager.get_browser_profile_kwargs()
    
    try:
        # Start browser session
        browser = Browser(**browser_kwargs)
        
        # Navigate to a useful starting page
        await browser.navigate_to("https://google.com")
        
        print("\n✅ Browser started! Please:")
        print("   1. Login to any services you need")
        print("   2. Complete any 2FA or verification steps")  
        print("   3. When finished, close the browser or press Ctrl+C")
        
        # Wait for user to finish logging in
        try:
            input("\n⏳ Press Enter when you're done logging in (or Ctrl+C to finish)...")
        except KeyboardInterrupt:
            print("\n⚡ Finishing setup...")
        
        # Save authentication data
        print("\n💾 Saving authentication data...")
        
        # Get current browser context  
        session = browser
        
        # Save cookies
        if session and hasattr(session, 'browser_context') and session.browser_context:
            cookies = await session.get_cookies()
            if cookies:
                auth_manager.save_cookies_from_session(cookies)
                print(f"✅ Saved {len(cookies)} cookies")
            
            # Save complete storage state
            try:
                storage_state = await session.browser_context.storage_state()
                auth_manager.save_storage_state_from_session(storage_state)
                print("✅ Saved storage state (cookies + localStorage + sessionStorage)")
            except Exception as e:
                print(f"⚠️  Could not save storage state: {e}")
        
        await browser.close()
        
    except Exception as e:
        print(f"❌ Error during setup: {e}")
        return False
    
    # Verify saved data
    final_status = auth_manager.get_auth_status()
    print(f"\n🎉 Authentication setup complete!")
    print(f"📊 Final status:")
    print(f"   - Cookies: {final_status['cookies_count']}")
    if final_status.get('has_google_auth'):
        print(f"   - Google authentication: ✅ ({final_status['google_cookies_count']} cookies)")
    print(f"   - Storage state: {'✅' if final_status['has_storage_state'] else '❌'}")
    
    print(f"\n🚀 Your authentication is now saved and will be used by:")
    print(f"   - Agent execution")
    print(f"   - Workflow recording") 
    print(f"   - Workflow playback")
    print(f"   - All other Glimpse browser operations")
    
    return True


async def test_authentication():
    """Test if saved authentication works."""
    
    print("🧪 Testing Authentication")
    print("=" * 30)
    
    if not auth_manager.has_saved_auth():
        print("❌ No saved authentication found")
        print("💡 Run setup first: python setup_auth.py")
        return False
    
    status = auth_manager.get_auth_status()
    print(f"📊 Found auth data:")
    print(f"   - Cookies: {status['cookies_count']}")
    if status.get('has_google_auth'):
        print(f"   - Google authentication: ✅")
    
    print(f"\n🌐 Starting test browser with saved authentication...")
    
    try:
        browser_kwargs = auth_manager.get_browser_profile_kwargs()
        browser = Browser(**browser_kwargs)
        
        # Test Google login status
        await browser.navigate_to("https://accounts.google.com")
        await asyncio.sleep(3)  # Wait for page to load
        
        # Take a screenshot to see current state
        screenshot = await browser.browser_session.take_screenshot()
        print(f"📸 Screenshot saved: {screenshot}")
        print(f"🔍 Check the screenshot to verify login status")
        
        await browser.close()
        print(f"✅ Test completed")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Test mode
        asyncio.run(test_authentication())
    else:
        # Setup mode
        asyncio.run(setup_authentication()) 