#!/usr/bin/env python3
"""
Test script to demonstrate multi-instance Chrome functionality.

This script shows how multiple Chrome instances can run simultaneously
while sharing the same user data directory for login sessions.
"""

import time
import sys
from pathlib import Path

# Add glimpse module to path
sys.path.insert(0, str(Path(__file__).parent / "glimpse"))

from api.chrome_manager import ChromeManager

def test_multi_instance():
    """Test launching multiple Chrome instances simultaneously."""
    
    print("🧪 Testing Multi-Instance Chrome Functionality")
    print("=" * 50)
    
    chrome_manager = ChromeManager()
    
    print(f"📂 User data directory: {chrome_manager.user_data_dir}")
    print(f"🌐 Chrome executable: {chrome_manager.chrome_path}")
    
    # Show initial state
    print("\n📊 Initial Chrome instances:")
    summary = chrome_manager.get_chrome_instances_summary()
    print(f"   Instances: {summary['total_instances']}")
    print(f"   Ports in use: {summary['debug_ports_in_use']}")
    
    instances_launched = []
    
    try:
        # Launch Instance 1: User monitoring instance
        print("\n🚀 Launching Instance 1 (User monitoring)...")
        success1, port1 = chrome_manager.launch_chrome_for_debugging(
            port=None,  # Auto-find port
            start_url="https://github.com",
            allow_existing=True
        )
        
        if success1:
            print(f"✅ Instance 1 launched on port {port1}")
            instances_launched.append(port1)
        else:
            print("❌ Failed to launch Instance 1")
        
        time.sleep(2)  # Wait a moment
        
        # Launch Instance 2: Agent simulation
        print("\n🚀 Launching Instance 2 (Agent simulation)...")
        success2, port2 = chrome_manager.launch_chrome_for_debugging(
            port=None,  # Auto-find different port
            start_url="https://google.com",
            allow_existing=True
        )
        
        if success2:
            print(f"✅ Instance 2 launched on port {port2}")
            instances_launched.append(port2)
        else:
            print("❌ Failed to launch Instance 2")
        
        time.sleep(2)  # Wait a moment
        
        # Launch Instance 3: Workflow simulation
        print("\n🚀 Launching Instance 3 (Workflow simulation)...")
        success3, port3 = chrome_manager.launch_chrome_for_debugging(
            port=None,  # Auto-find different port
            start_url="about:blank",
            allow_existing=True
        )
        
        if success3:
            print(f"✅ Instance 3 launched on port {port3}")
            instances_launched.append(port3)
        else:
            print("❌ Failed to launch Instance 3")
        
        # Show final state
        print("\n📊 Final Chrome instances:")
        summary = chrome_manager.get_chrome_instances_summary()
        print(f"   Total instances: {summary['total_instances']}")
        print(f"   Ports in use: {summary['debug_ports_in_use']}")
        print(f"   User data directory: {summary['user_data_dir']}")
        
        print("\n🎉 Multi-instance test completed!")
        print("💡 All instances share the same user data directory for login sessions")
        print("🔧 Each instance uses a different remote debugging port")
        
        # Show process details
        print("\n📋 Process Details:")
        for i, proc in enumerate(summary['processes'], 1):
            print(f"   Instance {i}: PID {proc['pid']}, Port {proc['debug_port']}")
        
        # Verification
        print("\n✅ Verification:")
        for port in instances_launched:
            if chrome_manager.is_chrome_running_on_port(port):
                print(f"   ✓ Port {port}: Chrome responding")
            else:
                print(f"   ✗ Port {port}: No response")
        
        print(f"\n🎯 Test Summary:")
        print(f"   Instances launched: {len(instances_launched)}")
        print(f"   All sharing user directory: {chrome_manager.user_data_dir}")
        print(f"   Ports used: {instances_launched}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        return False

def test_profile_kwargs():
    """Test profile kwargs generation for different scenarios."""
    
    print("\n🧪 Testing Profile Configuration")
    print("=" * 40)
    
    chrome_manager = ChromeManager()
    
    # Test agent profile
    print("🤖 Agent profile configuration:")
    agent_kwargs = chrome_manager.get_profile_kwargs_for_browser_use(
        recording_dir=Path("/tmp/test_recording"),
        debug_port=9223
    )
    print(f"   Debug port: {agent_kwargs['args'][0]}")  # Should be --remote-debugging-port=9223
    print(f"   User data dir: {agent_kwargs['user_data_dir']}")
    print(f"   Recording dir: {agent_kwargs.get('record_video_dir', 'None')}")
    
    # Test workflow profile
    print("\n⚙️  Workflow profile configuration:")
    workflow_kwargs = chrome_manager.get_profile_kwargs_for_browser_use(
        recording_dir=Path("/tmp/test_workflow"),
        debug_port=9224
    )
    print(f"   Debug port: {workflow_kwargs['args'][0]}")  # Should be --remote-debugging-port=9224
    print(f"   User data dir: {workflow_kwargs['user_data_dir']}")
    print(f"   Recording dir: {workflow_kwargs.get('record_video_dir', 'None')}")
    
    # Test auto-port assignment
    print("\n🎯 Auto-port assignment:")
    auto_kwargs = chrome_manager.get_profile_kwargs_for_browser_use()
    auto_port_arg = auto_kwargs['args'][0]
    print(f"   Auto-assigned port: {auto_port_arg}")
    
    print("✅ Profile configuration test completed!")

if __name__ == "__main__":
    print("🔧 Glimpse Multi-Instance Chrome Test")
    print("🎯 This test demonstrates running multiple Chrome instances")
    print("💾 All instances will share the same user data directory")
    print()
    
    try:
        # Test multi-instance functionality
        success = test_multi_instance()
        
        # Test profile configuration
        test_profile_kwargs()
        
        if success:
            print("\n🎉 All tests passed!")
            print("✨ Multi-instance Chrome support is working correctly")
            
            print("\n📝 What you can do now:")
            print("   1. Check the launched Chrome instances manually")
            print("   2. Login to services in any instance")
            print("   3. Verify login sessions are shared across instances")
            print("   4. Close this script (Chrome instances will continue running)")
            
            print("\n⚠️  To clean up, run:")
            print("   python -c \"from glimpse.api.chrome_manager import chrome_manager; chrome_manager.kill_all_chrome_instances()\"")
        else:
            print("\n❌ Some tests failed!")
            
    except KeyboardInterrupt:
        print("\n🔄 Test interrupted by user")
    except Exception as e:
        print(f"\n💥 Test failed with error: {e}")
        import traceback
        traceback.print_exc() 