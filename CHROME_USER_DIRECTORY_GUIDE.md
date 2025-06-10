# Chrome User Directory Management Guide - Multi-Instance Support (Fixed)

This guide explains how Chrome user directories are managed across different scenarios in Glimpse, with **support for multiple Chrome instances running simultaneously** while sharing login sessions.

**🔧 RECENT FIX**: Resolved "Opening in existing browser session" error by using separate user data directories with login data syncing.

## ✅ **Fixed Issues**

### **Problem**: Chrome Tab-Sharing Behavior
- **Issue**: Chrome opens tabs in existing processes instead of new instances
- **Error**: "Opening in existing browser session" and `BrowserType.launch_persistent_context` failures
- **Solution**: Use separate user data directories for each agent instance with login data syncing

### **Problem**: Inconsistent User Data Directories  
- **Before**: Server startup used `/tmp/chrome-debug-profile-{port}` (temporary)
- **After**: All scenarios use persistent directories with shared login data

### **Problem**: Race Conditions
- **Before**: Multiple Chrome processes could conflict on the same user directory
- **After**: `ChromeManager` handles process coordination with separate directories

## 🎯 **How the Fixed Multi-Instance Works**

### **Architecture Overview**
```
Main Profile: chromium_user_data/
├── Default/                    # Your manual login sessions
│   ├── Cookies                # Master login data
│   ├── Login Data             # Saved passwords  
│   └── Preferences            # Settings

Agent Profiles: (auto-created with synced login data)
├── chromium_user_data_agent_9223/   # Agent instance 1
├── chromium_user_data_agent_9224/   # Agent instance 2  
└── chromium_user_data_agent_9225/   # Workflow instance
```

### **Login Data Syncing**
- **Main profile**: Where you manually login via `setup_chromium_profile.py`
- **Agent profiles**: Auto-created copies with synced login data
- **Sync process**: Copies `Cookies`, `Login Data`, `Web Data`, etc. before each agent run
- **Independence**: Each agent gets its own Chrome process without conflicts

### **ChromeManager** (`glimpse/api/chrome_manager.py`)
Enhanced with separate profile management:
- **`get_profile_kwargs_for_browser_use()`**: Creates separate user data directories
- **`_sync_login_data_to_instance()`**: Copies login data from main to agent profiles  
- **`cleanup_agent_profiles()`**: Removes old agent profiles to save disk space
- **`list_agent_profiles()`**: Shows all agent profiles and their status

## 🚀 **Fixed Multi-Instance Workflow**

### **Scenario 1: Setup + Monitoring + Agent Demo**
```bash
# 1. Setup login sessions (main profile)
python setup_chromium_profile.py  
# Creates: chromium_user_data/ with your login sessions

# 2. Start server (uses main profile for monitoring)
poetry run python glimpse/run.py  
# Uses: chromium_user_data/ (port 9222+)

# 3. Create demo (agent gets separate profile with synced login)
# Click "Create Demo" in web interface  
# Creates: chromium_user_data_agent_XXXX/ with copied login data

# Result: 2 separate Chrome instances, both with access to login sessions
```

### **Scenario 2: Multiple Concurrent Demos**
```bash
# 1. First demo
# Click "Create Demo" → chromium_user_data_agent_9223/

# 2. Second demo (while first still running)  
# Click "Create Demo" → chromium_user_data_agent_9224/

# Result: Multiple agents running independently with shared login access
```

## 📋 **Usage Instructions (Updated)**

### **1. First Time Setup**
```bash
# Run setup script to save login sessions to main profile
python setup_chromium_profile.py

# Login to GitHub, Google, etc. in the Chrome window
# These sessions are saved to chromium_user_data/Default/
```

### **2. Start Server** 
```bash
poetry run python glimpse/run.py
# ✅ Uses main profile for monitoring Chrome instance
# ✅ Shows instance summary with ports in use
```

### **3. Create Demos**
```bash
# Click "Create Demo" in web interface
# ✅ Agent automatically gets separate profile with synced login data
# ✅ No more "Opening in existing browser session" errors
# ✅ True separate Chrome instance created
```

### **4. Monitor Agent Profiles**
```bash
# Check agent profiles and cleanup
python -c "
from glimpse.api.chrome_manager import chrome_manager
profiles = chrome_manager.list_agent_profiles()
print(f'Agent profiles: {len(profiles)}')
for p in profiles:
    print(f'  {p["name"]}: {p["size_mb"]:.1f}MB, in_use={p["in_use"]}')
"
```

## 🔧 **Technical Details (Updated)**

### **Profile Directory Structure**
```
/Users/aby/Documents/glimpse/
├── chromium_user_data/                      # Main profile (manual login)
│   └── Default/
│       ├── Cookies                         # Your login sessions
│       ├── Login Data                      # Saved passwords
│       └── Preferences                     # Settings
├── chromium_user_data_agent_9223/          # Agent instance 1  
│   └── Default/                            # (synced login data)
├── chromium_user_data_agent_9224/          # Agent instance 2
│   └── Default/                            # (synced login data)  
└── chromium_user_data_agent_9225/          # Workflow instance
    └── Default/                            # (synced login data)
```

### **Login Data Sync Process**
```python
# When agent starts:
1. ChromeManager creates new agent user data directory
2. Copies login files from main profile:
   - Cookies (session tokens)
   - Login Data (saved passwords)  
   - Web Data (form data)
   - Local Storage (website data)
   - Preferences (settings)
3. Agent launches Chrome with separate profile
4. Agent has full access to login sessions
```

### **Chrome Launch Differences**
```
Main Chrome (manual):
  --user-data-dir=chromium_user_data
  --remote-debugging-port=9222

Agent Chrome (automatic):  
  --user-data-dir=chromium_user_data_agent_9223
  --new-window                    # Force new instance
  --disable-session-crashed-bubble
  (browser-use handles debugging port)
```

## 🐛 **Troubleshooting (Updated)**

### **"Opening in existing browser session" - FIXED** 
- ✅ **Fixed**: Agents now use separate user data directories
- ✅ **No more tab-sharing**: Each instance gets its own Chrome process
- ✅ **Login data preserved**: Automatically synced from main profile

### **Login sessions not working in agent**
- Check that main profile has login data: `ls chromium_user_data/Default/Cookies`
- Re-run setup: `python setup_chromium_profile.py`
- Check agent profiles: `chrome_manager.list_agent_profiles()`

### **Too many agent profiles (disk space)**
```python
# Auto-cleanup profiles older than 24 hours old
from glimpse.api.chrome_manager import chrome_manager
cleaned = chrome_manager.cleanup_agent_profiles(max_age_hours=24)
print(f"Cleaned up {cleaned} old profiles")
```

### **Agent instance fails to start**
- Check browser-use library compatibility
- Verify Chrome installation
- Check agent profile was created correctly

## 🎉 **Benefits of the Fixed Approach**

1. **✅ True Separate Instances**: No more tab-sharing, each agent gets own Chrome process
2. **✅ Reliable Login Access**: Login data automatically synced to each agent  
3. **✅ No Process Conflicts**: Separate user data directories eliminate race conditions
4. **✅ Browser-Use Compatibility**: Works with playwright's `launch_persistent_context()`
5. **✅ Automatic Cleanup**: Old agent profiles auto-removed to save disk space
6. **✅ Easy Monitoring**: Track all agent profiles and their status

## 🔍 **Advanced Usage (Updated)**

### **Manual Agent Profile Management**
```python
from glimpse.api.chrome_manager import chrome_manager

# List all agent profiles
profiles = chrome_manager.list_agent_profiles()
for profile in profiles:
    print(f"{profile['name']}: {profile['size_mb']:.1f}MB, in_use={profile['in_use']}")

# Clean up old profiles (24+ hours old)
cleaned = chrome_manager.cleanup_agent_profiles(max_age_hours=24)
print(f"Cleaned up {cleaned} profiles")

# Test login data sync
base_dir = chrome_manager.get_user_data_dir()
test_dir = base_dir.parent / "test_agent_profile"
success = chrome_manager._sync_login_data_to_instance(base_dir, test_dir)
```

### **Verify the Fix**
```bash
# Test the separate profile approach
python test_separate_profiles.py

# Should show:
# ✅ Separate and shared profiles use different directories
# ✅ Login data sync test passed  
# ✅ Chrome args properly configured for separate instances
```

This fixed approach eliminates the "Opening in existing browser session" error and provides **true multi-instance support** with shared login sessions! 🎉 