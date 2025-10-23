# Black Screen Debug & Fix

## Problem
iOS app was showing only a black screen on launch, despite services initializing correctly.

## Investigation Completed

### Code Analysis
- ✅ All services compile and build correctly
- ✅ AppConfig properly configured with Railway backend URL
- ✅ WebSocketService, WakeWordService, AudioService all initialize without blocking
- ✅ All AppConfig properties exist (backendURL, sampleRate, wakeWordThreshold, etc.)
- ✅ No blocking operations in main thread

### Potential Causes Identified
1. **CloudKit Entitlements** - CloudSyncService was trying to access CloudKit without proper entitlements
2. **View Complexity** - Original TabView might have initialization issues
3. **Launch Screen** - Could be stuck showing launch screen

## Fixes Applied

### 1. Disabled CloudSyncService (JarvisApp.swift:45-46)
```swift
// Temporarily disabled until we add CloudKit entitlements
// let cloudSyncService = CloudSyncService()
```

**Why**: CloudKit requires iCloud entitlements. The error message confirmed this was causing issues.

### 2. Created Debug View (ContentView.swift:8-25)
```swift
// Temporary debug view to test rendering
VStack {
    Text("JARVIS")
        .font(.largeTitle)
        .foregroundColor(.white)
    Text("Connecting to Railway...")
        .foregroundColor(.white.opacity(0.7))
    Text("Backend: \(AppConfig.backendURL)")
        .font(.caption)
        .foregroundColor(.white.opacity(0.5))
        .padding()
}
.frame(maxWidth: .infinity, maxHeight: .infinity)
.background(Color.black)
```

**Why**: Simple view to test if rendering works at all. White text on black background should be immediately visible.

### 3. Enhanced Diagnostic Logging
Added comprehensive logging to track app lifecycle:

**AppState.init() (JarvisApp.swift:49, 55)**
```swift
print("🔧 AppState: Initializing...")
...
print("✅ AppState: Initialization complete")
```

**WindowGroup.onAppear (JarvisApp.swift:13)**
```swift
print("🚀 JarvisApp: WindowGroup appeared, setting up services...")
```

**ContentView.onAppear (ContentView.swift:22-25)**
```swift
print("✅ ContentView appeared - rendering debug view")
print("📍 Backend URL: \(AppConfig.backendURL)")
```

## Next Steps

### For User: Rebuild and Test

1. **In Xcode, stop the app** (Cmd+.)
2. **Clean build folder** (Shift+Cmd+K)
3. **Build and run** (Cmd+R)

### Expected Console Output

If the fix works, you should see this sequence:

```
🔧 AppState: Initializing...
✅ Audio session configured for background recording
✅ Microphone permission granted
✅ Audio session initialized
✅ Audio engine configured for wake word detection
✅ AppState: Initialization complete
🚀 JarvisApp: WindowGroup appeared, setting up services...
📡 Connecting to WebSocket: wss://control-plane-production-e966.up.railway.app
✅ ContentView appeared - rendering debug view
📍 Backend URL: wss://control-plane-production-e966.up.railway.app
```

**And on screen you should see:**

```
    JARVIS
Connecting to Railway...
Backend: wss://control-plane-production-e966.up.railway.app
```

### If You Still See Black Screen

Check console for missing logs:
- ❌ Missing "AppState: Initialization complete" → AppState init failed
- ❌ Missing "WindowGroup appeared" → Scene configuration issue
- ❌ Missing "ContentView appeared" → View not rendering

Share the complete console output for further diagnosis.

### If Debug View Works

Once you see the debug view working:
1. I'll restore the original TabView with ChatView, ConversationsView, SettingsView
2. I'll add proper CloudKit entitlements
3. I'll re-enable CloudSyncService

## Technical Details

### CloudKit Entitlements Setup (Future)
To re-enable CloudSyncService later:

1. Create `JarvisApp/JarvisApp.entitlements`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.icloud-services</key>
    <array>
        <string>CloudKit</string>
    </array>
    <key>com.apple.developer.icloud-container-identifiers</key>
    <array>
        <string>iCloud.com.benkennon.jarvis</string>
    </array>
</dict>
</plist>
```

2. Update `project.yml` to include entitlements
3. Add signing team ID
4. Re-enable CloudSyncService in AppState

### Backend Configuration
- **Production URL**: wss://control-plane-production-e966.up.railway.app
- **Local Development**: Set env var `BACKEND_URL=ws://localhost:5001`
- **Port**: Local uses 5001 (not 4000)

## Build Status
✅ Build succeeded with only deprecation warnings
✅ No compilation errors
✅ All dependencies resolved
✅ Ready for testing
