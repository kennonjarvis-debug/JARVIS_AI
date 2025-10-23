# Jarvis iOS App - Setup Instructions

## Prerequisites
- macOS 14.0+ (Sonoma or later)
- Xcode 15.0+
- iOS device or simulator running iOS 17.0+
- Active Apple Developer account (for device testing)
- Backend running (local or cloud)

## Step 1: Create Xcode Project

Since Xcode projects cannot be created via command line with proper configuration, follow these steps:

### 1.1 Create New Project
```
1. Open Xcode
2. File > New > Project (⇧⌘N)
3. Select "iOS" tab
4. Choose "App" template
5. Click "Next"
```

### 1.2 Configure Project
```
Product Name: JarvisApp
Team: [Your Team]
Organization Identifier: com.yourcompany
Bundle Identifier: com.yourcompany.jarvis
Interface: SwiftUI
Language: Swift
Storage: None (we'll add CloudKit manually)
Include Tests: ✓ (optional)
```

### 1.3 Save Location
```
Save to: /Users/benkennon/Jarvis/JarvisApp-iOS/
Create Git repository: ✓ (optional)
```

## Step 2: Add Source Files

### 2.1 Delete Default Files
```
1. In Xcode, select and delete:
   - ContentView.swift (we have a better one)
   - JarvisAppApp.swift (we have JarvisApp.swift)
```

### 2.2 Add Our Files
```
1. In Finder, navigate to: /Users/benkennon/Jarvis/JarvisApp-iOS/JarvisApp/
2. Drag all .swift files into Xcode project navigator:
   - JarvisApp.swift
   - AppDelegate.swift
   - ContentView.swift
   - Models.swift
   - WebSocketService.swift
   - AudioService.swift
   - WakeWordService.swift
   - TranscriptionService.swift
   - CloudSyncService.swift
3. Select "Copy items if needed"
4. Add to targets: JarvisApp ✓
```

### 2.3 Replace Info.plist
```
1. Delete existing Info.plist in Xcode
2. Drag our Info.plist into project
3. In Build Settings, set "Info.plist File" to: JarvisApp/Info.plist
```

## Step 3: Configure Capabilities

### 3.1 Enable Background Modes
```
1. Select project in navigator
2. Select "JarvisApp" target
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability"
5. Add "Background Modes"
6. Enable:
   ✓ Audio, AirPlay, and Picture in Picture
   ✓ Background fetch
   ✓ Background processing
```

### 3.2 Enable iCloud (for sync)
```
1. Click "+ Capability" again
2. Add "iCloud"
3. Enable:
   ✓ CloudKit
4. Click "+" under Containers
5. Create new container: iCloud.com.yourcompany.jarvis
```

### 3.3 Enable Push Notifications (optional)
```
1. Click "+ Capability" again
2. Add "Push Notifications"
```

## Step 4: Configure Backend Connection

### 4.1 Backend URL (UPDATED - Railway Production)
The iOS app is now configured to use Railway production by default!

**Production (Default):**
```swift
static let backendURL = "wss://control-plane-production-e966.up.railway.app"
```

**For Local Development:**
To test locally, add environment variable in Xcode:
```
Product > Scheme > Edit Scheme > Run > Arguments > Environment Variables
Add: BACKEND_URL = ws://localhost:5001
```

Note: Local development uses port **5001** (not 4000)

### 4.2 Add OpenAI API Key
Option A: Environment Variable
```swift
// In Xcode:
// Product > Scheme > Edit Scheme > Run > Arguments > Environment Variables
// Add: OPENAI_API_KEY = sk-...
```

Option B: Hardcode (NOT recommended for production)
```swift
// In Models.swift:
static let openAIAPIKey = "sk-your-key-here"
```

## Step 5: Build and Run

### 5.1 Select Device
```
1. In Xcode toolbar, select device:
   - iPhone 15 Pro (Simulator) for testing
   - Your iPhone for real device testing
```

### 5.2 Build
```
Press ⌘B or Product > Build
Fix any errors (there shouldn't be any)
```

### 5.3 Run
```
Press ⌘R or Product > Run
App should launch on device/simulator
```

## Step 6: Test Features

### 6.1 Basic Chat
```
1. Launch app
2. Type a message in chat
3. Press send
4. Verify response from backend
```

### 6.2 Voice Input
```
1. Tap microphone button
2. Speak a command
3. Wait for transcription
4. Verify message appears in chat
```

### 6.3 Wake Word (requires real device)
```
1. Go to Settings tab
2. Enable "Wake Word Detection"
3. Enable "Background Listening"
4. Say "Hey Jarvis"
5. Speak your command
6. Verify app responds
```

### 6.4 iCloud Sync
```
1. Have two devices with same Apple ID
2. Create conversation on device 1
3. Wait 30 seconds
4. Open app on device 2
5. Verify conversation appears
```

## Troubleshooting

### Build Errors
```
Problem: "Cannot find 'AppState' in scope"
Solution: Make sure all .swift files are added to target

Problem: "No such module 'AVFoundation'"
Solution: Add framework: Target > Build Phases > Link Binary With Libraries
```

### Runtime Errors
```
Problem: "WebSocket connection failed"
Solution:
- Production: Verify Railway is up at https://control-plane-production-e966.up.railway.app/health
- Local: Check backend is running: lsof -i :5001
- Check URL in Models.swift (or set BACKEND_URL environment variable)
- For localhost, enable NSExceptionAllowsInsecureHTTPLoads in Info.plist

Problem: "Microphone permission denied"
Solution:
- Go to iOS Settings > Privacy & Security > Microphone
- Enable for Jarvis

Problem: "CloudKit not available"
Solution:
- Sign in to iCloud on device
- Go to Settings > [Your Name] > iCloud
- Enable iCloud Drive
```

### Wake Word Not Working
```
Problem: Wake word not detecting
Note: Current implementation is placeholder
Solution: Implement one of these:
1. Core ML model (recommended)
2. Porcupine SDK (free tier available)
3. Apple Speech framework (requires internet)

See WakeWordService.swift for implementation notes
```

## Next Steps

1. **Test thoroughly** - Run through all features
2. **Optimize wake word** - Replace placeholder with real detection
3. **Add push notifications** - For cross-device sync
4. **Add Live Activities** - Show active listening on lock screen
5. **Add widgets** - Quick access to Jarvis
6. **Polish UI** - Add animations, haptics, sounds
7. **App Store** - Prepare for distribution

## Development Timeline

✅ **Phase 1 (COMPLETE)** - Project setup + UI (4-6 hrs)
- SwiftUI views
- Navigation
- Chat interface
- Settings

🚧 **Phase 2 (IN PROGRESS)** - Audio + Wake Word (6-8 hrs)
- Background recording
- Wake word detection (needs real implementation)
- Audio playback

⏳ **Phase 3 (PENDING)** - iCloud + Sync (7-9 hrs)
- CloudKit integration
- Push notifications
- Cross-device sync
- Offline support

## Estimated Completion
- With 1 developer: 2-3 weeks
- With 3 parallel developers: 1 week
- Current progress: ~60% (Phase 1 complete, Phase 2 partial)

## Support

Questions? Check:
- README.md - Architecture overview
- IPHONE_APP_PROMPTS.md - Original spec
- Backend docs: /Users/benkennon/Jarvis/README.md
