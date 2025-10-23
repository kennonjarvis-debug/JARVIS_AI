# Jarvis iOS App

**Cross-platform AI assistant with wake word detection and real-time sync**

## Features
- ✅ Wake word detection ("Hey Jarvis")
- ✅ Real-time WebSocket sync with backend
- ✅ Background audio listening
- ✅ iCloud conversation sync
- ✅ Voice transcription (Whisper API)
- ✅ Screen capture sharing (iOS 17+)
- ✅ Proactive suggestions
- ✅ Offline-first with smart sync

## Requirements
- iOS 17.0+
- Xcode 15.0+
- Active backend (local or cloud)

## Project Structure
```
JarvisApp-iOS/
├── JarvisApp/
│   ├── App/
│   │   ├── JarvisApp.swift          # Main app entry
│   │   └── AppDelegate.swift        # Background audio setup
│   ├── Views/
│   │   ├── ContentView.swift        # Root TabView
│   │   ├── ChatView.swift           # Chat interface
│   │   ├── SettingsView.swift       # Settings
│   │   └── Components/              # Reusable UI
│   ├── Services/
│   │   ├── WebSocketService.swift   # Real-time sync
│   │   ├── AudioService.swift       # Recording & playback
│   │   ├── WakeWordService.swift    # Wake word detection
│   │   ├── TranscriptionService.swift
│   │   └── CloudSyncService.swift   # iCloud sync
│   ├── Models/
│   │   ├── Message.swift
│   │   ├── Conversation.swift
│   │   └── AppState.swift
│   └── Resources/
│       ├── Assets.xcassets
│       └── Info.plist
```

## Setup
1. Open `JarvisApp.xcodeproj` in Xcode
2. Update backend URL in `Config.swift`
3. Add your OpenAI API key to backend
4. Build and run (⌘R)

## Backend Integration
- Local: `ws://localhost:4000`
- Cloud: `wss://your-backend.com`

Update in `Services/WebSocketService.swift:15`

## Development Timeline
- **Phase 1 (Alpha)**: Project setup + UI (4-6 hrs) ✅
- **Phase 2 (Beta)**: Background audio + wake word (6-8 hrs)
- **Phase 3 (Gamma)**: iCloud sync + push notifications (7-9 hrs)

Total: 2-3 weeks with parallel development

## Testing
1. Launch app
2. Say "Hey Jarvis"
3. Speak your command
4. Verify response in chat

## Architecture
- **SwiftUI**: Modern declarative UI
- **Combine**: Reactive data flow
- **CloudKit**: Cross-device sync
- **AVFoundation**: Audio recording
- **NaturalLanguage**: Wake word detection
