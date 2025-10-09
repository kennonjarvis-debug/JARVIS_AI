# 📱 iPhone Companion App - Implementation Prompts

**Stage 4: Cross-Platform Mobile Integration**

Use these prompts with Claude instances to build the Jarvis iPhone companion app in parallel.

---

## 🎯 Overview

**Goal:** Create native iOS app that syncs with macOS JarvisDesktop and web dashboard

**Architecture:**
- SwiftUI cross-platform (share 80% code with macOS)
- WebSocket sync with backend
- Background audio listening (iOS 17+)
- Live Activities for proactive notifications
- iCloud sync for conversation history

**Estimated Time:** 2-3 weeks with 2-3 Claude instances in parallel

---

## 🤖 **AGENT ALPHA: iOS Project Setup & Core UI**

### Prompt for Claude Instance #1

```
You are a senior iOS developer specializing in SwiftUI and cross-platform development.

CONTEXT:
- Existing macOS app: /Users/benkennon/JarvisDesktop
- 80% of the Swift code can be reused for iOS
- Goal: Create iPhone companion app with conversation sync

PROJECT STRUCTURE:
JarvisDesktop/
├── Shared/               # NEW - Cross-platform code
│   ├── Models/
│   ├── ViewModels/
│   ├── Services/
│   └── Intelligence/
├── macOS/                # Platform-specific
│   └── MenuBarController.swift
└── iOS/                  # NEW - iOS-specific
    ├── JarvisApp.swift
    ├── ContentView.swift
    └── AppDelegate.swift

TASK 1: Create iOS Target (30 min)

1. Open JarvisDesktop.xcodeproj in Xcode
2. Add new iOS target:
   - File → New → Target → iOS → App
   - Name: "Jarvis iOS"
   - Bundle ID: com.jarvis.ios
   - Interface: SwiftUI
   - Life Cycle: SwiftUI App
   - iOS Deployment Target: 17.0

3. Move shared code to "Shared" folder:
   - Models/ChatMessage.swift
   - Models/PrivacySettings.swift
   - ViewModels/ChatViewModel.swift
   - Services/APIClient.swift
   - Services/WebSocketClient.swift
   - Intelligence/VoiceInputManager.swift
   - Intelligence/VisionAnalyzer.swift
   - Intelligence/IntentRecognizer.swift
   - Intelligence/ContextBuilder.swift

4. Update target membership:
   - Select each shared file
   - Check BOTH "JarvisDesktop" and "Jarvis iOS" in Target Membership

5. Update imports for cross-platform:
   - Replace `import AppKit` with:
     ```swift
     #if os(macOS)
     import AppKit
     #else
     import UIKit
     #endif
     ```
   - Wrap macOS-specific code (NSWorkspace, etc.) in `#if os(macOS)`

TASK 2: Create iOS Main UI (1-2 hours)

Create iOS/JarvisApp.swift:
```swift
import SwiftUI

@main
struct JarvisApp: App {
    @StateObject private var chatViewModel = ChatViewModel()
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(chatViewModel)
                .environmentObject(appState)
                .onAppear {
                    // Initialize background tasks
                    BackgroundTaskManager.shared.registerTasks()
                }
        }
    }
}

class AppState: ObservableObject {
    @Published var isActive = false
    @Published var hasPermissions = false
}
```

Create iOS/ContentView.swift:
```swift
import SwiftUI

struct ContentView: View {
    @EnvironmentObject var chatViewModel: ChatViewModel
    @EnvironmentObject var appState: AppState
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Chat Tab
            ChatView()
                .tabItem {
                    Label("Chat", systemImage: "message.fill")
                }
                .tag(0)

            // Voice Tab
            VoiceView()
                .tabItem {
                    Label("Voice", systemImage: "mic.fill")
                }
                .tag(1)

            // Dashboard Tab
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar.fill")
                }
                .tag(2)

            // Settings Tab
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(3)
        }
        .onAppear {
            checkPermissions()
        }
    }

    private func checkPermissions() {
        // Check microphone, notifications, background refresh
        PermissionManager.shared.requestAllPermissions { granted in
            appState.hasPermissions = granted
        }
    }
}
```

TASK 3: Adapt ChatView for iOS (1 hour)

Create iOS/Views/ChatView.swift (based on macOS ChatViewModel):
```swift
import SwiftUI

struct ChatView: View {
    @EnvironmentObject var chatViewModel: ChatViewModel
    @State private var messageText = ""
    @State private var showingVoiceInput = false

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Messages List
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(chatViewModel.messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                            }
                        }
                        .padding()
                    }
                    .onChange(of: chatViewModel.messages.count) { _ in
                        scrollToBottom(proxy)
                    }
                }

                // Input Bar
                MessageInputBar(
                    text: $messageText,
                    onSend: sendMessage,
                    onVoice: { showingVoiceInput = true }
                )
            }
            .navigationTitle("Jarvis")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if chatViewModel.isListeningForWakeWord {
                        Image(systemName: "waveform")
                            .foregroundColor(.blue)
                    }
                }
            }
        }
        .sheet(isPresented: $showingVoiceInput) {
            VoiceInputSheet(
                onComplete: { transcript in
                    messageText = transcript
                    sendMessage()
                }
            )
        }
    }

    private func sendMessage() {
        guard !messageText.isEmpty else { return }
        chatViewModel.sendMessage(messageText)
        messageText = ""
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        if let lastMessage = chatViewModel.messages.last {
            withAnimation {
                proxy.scrollTo(lastMessage.id, anchor: .bottom)
            }
        }
    }
}
```

TASK 4: Platform-Specific Adaptations (2 hours)

Update VoiceInputManager.swift for iOS:
```swift
import Speech
import AVFoundation
#if os(iOS)
import UIKit
#else
import AppKit
#endif

class VoiceInputManager: NSObject, ObservableObject {
    // ... existing code ...

    #if os(iOS)
    func configureAudioSessionForBackground() throws {
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(
            .playAndRecord,
            mode: .default,
            options: [.defaultToSpeaker, .allowBluetooth]
        )
        try audioSession.setActive(true)
    }
    #endif
}
```

Update ContextBuilder.swift for iOS:
```swift
#if os(iOS)
import UIKit

extension ContextBuilder {
    func getDeviceInfo() -> DeviceInfo {
        DeviceInfo(
            model: UIDevice.current.model,
            systemVersion: UIDevice.current.systemVersion,
            batteryLevel: UIDevice.current.batteryLevel,
            batteryState: UIDevice.current.batteryState
        )
    }

    func getLocationIfAuthorized() -> CLLocation? {
        // iOS location services
        return LocationManager.shared.currentLocation
    }
}
#endif
```

DELIVERABLES:
1. iOS target added to Xcode project
2. Shared folder with cross-platform code
3. iOS/JarvisApp.swift - Main app entry point
4. iOS/ContentView.swift - Tab-based UI
5. iOS/Views/ChatView.swift - Chat interface
6. Platform-specific code wrapped in #if os(iOS)
7. Build succeeds for both macOS and iOS

EXPECTED TIME: 4-6 hours

Start by creating the iOS target and moving shared code into the Shared folder.
```

---

## 🤖 **AGENT BETA: Background Audio & Voice**

### Prompt for Claude Instance #2

```
You are an iOS audio specialist with expertise in background audio and Speech Recognition.

CONTEXT:
- Building Jarvis iPhone app
- Need always-on voice listening (like Siri)
- Must work when app is in background
- iOS 17+ with Live Activities support

TASK: Implement Background Audio & Wake Word for iOS

REQUIREMENTS:
1. Background audio capability
2. Wake word detection ("Hey Jarvis")
3. Voice Activity Detection (VAD)
4. Low power consumption (<1% battery/hour)
5. Works with screen locked

STEP 1: Configure Background Modes (30 min)

1. In Xcode, select "Jarvis iOS" target
2. Signing & Capabilities → + Capability
3. Add "Background Modes"
4. Enable:
   - ✅ Audio, AirPlay, and Picture in Picture
   - ✅ Background fetch
   - ✅ Background processing

5. Add to Info.plist:
```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
    <string>fetch</string>
    <string>processing</string>
</array>
<key>NSMicrophoneUsageDescription</key>
<string>Jarvis needs microphone access for voice commands.</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>Jarvis uses speech recognition to understand your voice commands.</string>
```

STEP 2: Create BackgroundAudioManager for iOS (3-4 hours)

Create iOS/Services/BackgroundAudioManager.swift:
```swift
import AVFoundation
import Speech
import Combine

class BackgroundAudioManager: NSObject, ObservableObject {
    @Published var isListening = false
    @Published var wakeWordDetected = false

    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))

    // Wake word detection
    private let wakeWords = ["hey jarvis", "jarvis"]
    private var audioSession: AVAudioSession { AVAudioSession.sharedInstance() }

    // Performance tracking
    private var detectionCount = 0
    private var startTime: Date?

    override init() {
        super.init()
        configureAudioSession()
    }

    // MARK: - Audio Session Configuration

    private func configureAudioSession() {
        do {
            try audioSession.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]
            )
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

            // Register for audio interruptions
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(handleInterruption),
                name: AVAudioSession.interruptionNotification,
                object: audioSession
            )
        } catch {
            print("❌ Failed to configure audio session: \(error)")
        }
    }

    @objc private func handleInterruption(notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        switch type {
        case .began:
            // Audio session interrupted (phone call, etc.)
            stopListening()
        case .ended:
            // Resume listening if needed
            if let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt {
                let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                if options.contains(.shouldResume) {
                    startListening()
                }
            }
        @unknown default:
            break
        }
    }

    // MARK: - Wake Word Detection

    func startListening() {
        guard !isListening else { return }

        do {
            try startSpeechRecognition()
            isListening = true
            startTime = Date()
            print("🎤 Background audio listening started")
        } catch {
            print("❌ Failed to start listening: \(error)")
        }
    }

    func stopListening() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()

        isListening = false
        print("🔇 Background audio listening stopped")
    }

    private func startSpeechRecognition() throws {
        recognitionTask?.cancel()
        recognitionTask = nil

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            throw NSError(domain: "BackgroundAudio", code: 1, userInfo: nil)
        }

        recognitionRequest.shouldReportPartialResults = true
        recognitionRequest.requiresOnDeviceRecognition = true // Critical for background

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()

        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }

            if let result = result {
                let transcript = result.bestTranscription.formattedString.lowercased()

                // Check for wake word
                for wakeWord in self.wakeWords {
                    if transcript.contains(wakeWord) {
                        self.handleWakeWordDetected(transcript)
                        break
                    }
                }
            }

            if error != nil {
                self.stopListening()
                // Auto-restart after error
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    self.startListening()
                }
            }
        }
    }

    private func handleWakeWordDetected(_ transcript: String) {
        print("🔔 Wake word detected: \(transcript)")

        detectionCount += 1
        wakeWordDetected = true

        // Post notification
        NotificationCenter.default.post(
            name: .wakeWordDetected,
            object: nil,
            userInfo: ["transcript": transcript]
        )

        // Trigger haptic feedback
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()

        // Show Live Activity (if available)
        updateLiveActivity(listening: true)

        // Reset after 2 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.wakeWordDetected = false
        }
    }

    // MARK: - Live Activities

    private func updateLiveActivity(listening: Bool) {
        #if compiler(>=5.9)
        if #available(iOS 16.1, *) {
            // Update Live Activity to show "Listening..."
            // Implementation depends on ActivityKit integration
        }
        #endif
    }

    // MARK: - Battery Optimization

    func enableLowPowerMode() {
        // Reduce recognition frequency
        // Use smaller buffer sizes
        // Implement Voice Activity Detection
    }
}

// MARK: - Notifications

extension Notification.Name {
    static let wakeWordDetected = Notification.Name("wakeWordDetected")
}
```

STEP 3: Create Background Task Manager (2 hours)

Create iOS/Services/BackgroundTaskManager.swift:
```swift
import BackgroundTasks
import UIKit

class BackgroundTaskManager {
    static let shared = BackgroundTaskManager()

    private let backgroundTaskID = "com.jarvis.ios.refresh"
    private let audioManager = BackgroundAudioManager()

    func registerTasks() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: backgroundTaskID,
            using: nil
        ) { task in
            self.handleBackgroundRefresh(task: task as! BGAppRefreshTask)
        }
    }

    func scheduleBackgroundRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: backgroundTaskID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 minutes

        do {
            try BGTaskScheduler.shared.submit(request)
            print("✅ Background refresh scheduled")
        } catch {
            print("❌ Failed to schedule background refresh: \(error)")
        }
    }

    private func handleBackgroundRefresh(task: BGAppRefreshTask) {
        // Sync conversations
        // Check for new proactive suggestions
        // Update Live Activity

        task.expirationHandler = {
            // Clean up
            task.setTaskCompleted(success: false)
        }

        // Perform background work
        Task {
            await syncConversations()
            task.setTaskCompleted(success: true)

            // Schedule next refresh
            scheduleBackgroundRefresh()
        }
    }

    private func syncConversations() async {
        // Sync with backend via WebSocket
    }
}
```

DELIVERABLES:
1. Background audio capability configured
2. BackgroundAudioManager.swift with wake word detection
3. BackgroundTaskManager.swift for background sync
4. Info.plist with required permissions
5. Low-power optimization implemented
6. Live Activity integration (iOS 16.1+)

EXPECTED TIME: 6-8 hours

Start with audio session configuration and wake word detection.
```

---

## 🤖 **AGENT GAMMA: iCloud Sync & Cross-Device**

### Prompt for Claude Instance #3

```
You are an iOS CloudKit specialist focused on cross-device sync and data persistence.

CONTEXT:
- Jarvis has macOS app, web dashboard, and iPhone app (in progress)
- Need conversation history to sync across all devices
- iCloud used for Apple-device sync
- WebSocket for real-time sync

TASK: Implement iCloud Sync & Cross-Device Communication

REQUIREMENTS:
1. Conversation sync via iCloud (macOS ↔ iPhone)
2. Real-time sync via WebSocket (all devices)
3. Offline-first with sync on reconnect
4. Conflict resolution
5. Privacy-first (end-to-end encryption)

STEP 1: Enable iCloud Capability (30 min)

1. In Xcode, select both "JarvisDesktop" and "Jarvis iOS" targets
2. Signing & Capabilities → + Capability → iCloud
3. Enable:
   - ✅ CloudKit
   - ✅ Key-value storage

4. Create iCloud Container:
   - Container ID: iCloud.com.jarvis.sync
   - Enable for both targets

5. Add to Info.plist (both targets):
```xml
<key>NSUbiquitousContainers</key>
<dict>
    <key>iCloud.com.jarvis.sync</key>
    <dict>
        <key>NSUbiquitousContainerIsDocumentScopePublic</key>
        <true/>
    </dict>
</dict>
```

STEP 2: Create iCloudSyncManager (4-5 hours)

Create Shared/Services/iCloudSyncManager.swift:
```swift
import Foundation
import CloudKit
import Combine

class iCloudSyncManager: ObservableObject {
    static let shared = iCloudSyncManager()

    @Published var isSyncing = false
    @Published var lastSyncDate: Date?
    @Published var syncError: Error?

    private let container: CKContainer
    private let privateDatabase: CKDatabase
    private var cancellables = Set<AnyCancellable>()

    // Record types
    private let conversationRecordType = "Conversation"
    private let messageRecordType = "Message"

    init() {
        container = CKContainer(identifier: "iCloud.com.jarvis.sync")
        privateDatabase = container.privateCloudDatabase

        // Subscribe to iCloud account changes
        NotificationCenter.default.publisher(for: .CKAccountChanged)
            .sink { [weak self] _ in
                self?.checkAccountStatus()
            }
            .store(in: &cancellables)
    }

    // MARK: - Account Status

    func checkAccountStatus() {
        container.accountStatus { status, error in
            switch status {
            case .available:
                print("✅ iCloud account available")
                self.setupSubscriptions()
            case .noAccount:
                print("⚠️ No iCloud account")
            case .restricted, .couldNotDetermine:
                print("❌ iCloud access restricted")
            @unknown default:
                break
            }
        }
    }

    // MARK: - Sync Conversations

    func syncConversations() async throws {
        isSyncing = true
        defer { isSyncing = false }

        // Fetch conversations from iCloud
        let conversations = try await fetchConversations()

        // Merge with local conversations
        await mergeConversations(conversations)

        // Upload new local conversations
        try await uploadLocalConversations()

        lastSyncDate = Date()
    }

    private func fetchConversations() async throws -> [CKRecord] {
        let query = CKQuery(
            recordType: conversationRecordType,
            predicate: NSPredicate(value: true)
        )
        query.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]

        return try await withCheckedThrowingContinuation { continuation in
            privateDatabase.perform(query, inZoneWith: nil) { records, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: records ?? [])
                }
            }
        }
    }

    private func mergeConversations(_ cloudRecords: [CKRecord]) async {
        for record in cloudRecords {
            let conversationId = record["conversationId"] as? String ?? ""
            let messages = record["messages"] as? [String: Any] ?? [:]

            // Check if conversation exists locally
            if let local = ConversationStore.shared.getConversation(conversationId) {
                // Merge (cloud wins for now, can add conflict resolution)
                await ConversationStore.shared.updateConversation(
                    conversationId,
                    with: messages
                )
            } else {
                // Create new local conversation
                await ConversationStore.shared.createConversation(
                    id: conversationId,
                    messages: messages
                )
            }
        }
    }

    private func uploadLocalConversations() async throws {
        let localConversations = await ConversationStore.shared.getAllConversations()

        for conversation in localConversations {
            // Check if already in iCloud
            let recordID = CKRecord.ID(recordName: conversation.id)

            do {
                _ = try await privateDatabase.record(for: recordID)
                // Already exists, update if needed
                try await updateConversation(conversation)
            } catch {
                // Doesn't exist, create new
                try await createConversation(conversation)
            }
        }
    }

    private func createConversation(_ conversation: Conversation) async throws {
        let recordID = CKRecord.ID(recordName: conversation.id)
        let record = CKRecord(recordType: conversationRecordType, recordID: recordID)

        record["conversationId"] = conversation.id as CKRecordValue
        record["created"] = conversation.created as CKRecordValue
        record["updated"] = conversation.updated as CKRecordValue
        record["messages"] = conversation.messagesData as CKRecordValue

        try await privateDatabase.save(record)
    }

    private func updateConversation(_ conversation: Conversation) async throws {
        let recordID = CKRecord.ID(recordName: conversation.id)
        let record = try await privateDatabase.record(for: recordID)

        record["updated"] = conversation.updated as CKRecordValue
        record["messages"] = conversation.messagesData as CKRecordValue

        try await privateDatabase.save(record)
    }

    // MARK: - Real-Time Subscriptions

    private func setupSubscriptions() {
        let subscription = CKQuerySubscription(
            recordType: conversationRecordType,
            predicate: NSPredicate(value: true),
            options: [.firesOnRecordCreation, .firesOnRecordUpdate]
        )

        let notification = CKSubscription.NotificationInfo()
        notification.shouldSendContentAvailable = true
        subscription.notificationInfo = notification

        privateDatabase.save(subscription) { _, error in
            if let error = error {
                print("❌ Failed to create subscription: \(error)")
            } else {
                print("✅ iCloud subscription created")
            }
        }
    }

    // MARK: - Handle Push Notifications

    func handleCloudKitNotification(_ notification: CKQueryNotification) {
        guard let recordID = notification.recordID else { return }

        // Fetch updated record
        privateDatabase.fetch(withRecordID: recordID) { record, error in
            if let record = record {
                Task {
                    await self.mergeConversations([record])
                }
            }
        }
    }
}

// MARK: - Conversation Model Extension

extension Conversation {
    var messagesData: [String: Any] {
        // Convert messages to dictionary for iCloud storage
        messages.reduce(into: [String: Any]()) { result, message in
            result[message.id] = [
                "role": message.role,
                "content": message.content,
                "source": message.source.rawValue,
                "timestamp": message.timestamp
            ]
        }
    }
}
```

STEP 3: Integrate with WebSocketClient (2 hours)

Update Shared/Services/WebSocketClient.swift:
```swift
// Add iCloud sync integration

class WebSocketClient: ObservableObject {
    // ... existing code ...

    private let iCloudSync = iCloudSyncManager.shared

    func connect() {
        // ... existing code ...

        // After WebSocket connects, sync with iCloud
        Task {
            try? await iCloudSync.syncConversations()
        }
    }

    private func handleReceivedData(_ data: Data) {
        // ... existing code ...

        // After receiving message, sync to iCloud
        Task {
            try? await iCloudSync.syncConversations()
        }
    }
}
```

STEP 4: Add AppDelegate for Push Notifications (1 hour)

Create iOS/AppDelegate.swift:
```swift
import UIKit
import CloudKit

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil
    ) -> Bool {
        // Register for remote notifications
        application.registerForRemoteNotifications()
        return true
    }

    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable : Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        // Handle CloudKit notification
        let notification = CKQueryNotification(fromRemoteNotificationDictionary: userInfo)
        iCloudSyncManager.shared.handleCloudKitNotification(notification)
        completionHandler(.newData)
    }
}
```

Update iOS/JarvisApp.swift:
```swift
import SwiftUI

@main
struct JarvisApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    // ... rest of code ...
}
```

DELIVERABLES:
1. iCloud capability enabled for both targets
2. iCloudSyncManager.swift with conversation sync
3. CloudKit subscriptions for real-time updates
4. Push notification handling
5. Conflict resolution logic
6. Offline-first architecture

EXPECTED TIME: 7-9 hours

Start with enabling iCloud capability and creating the sync manager.
```

---

## 📋 **Summary: iPhone App Development Plan**

### Phase 1: Foundation (Week 1)
- **Agent Alpha**: iOS project setup + Core UI (4-6 hours)
- **Agent Beta**: Background audio + Wake word (6-8 hours)
- Total: 10-14 hours

### Phase 2: Sync & Integration (Week 2)
- **Agent Gamma**: iCloud sync + Cross-device (7-9 hours)
- Testing & debugging: 4-6 hours
- Total: 11-15 hours

### Phase 3: Polish & Deploy (Week 3)
- Live Activities integration
- Widget support
- App Store submission prep
- TestFlight beta
- Total: 8-12 hours

**Grand Total:** 29-41 hours (~2-3 weeks with 3 parallel agents)

---

## 🚀 **Quick Start Commands**

```bash
# Open Xcode project
open /Users/benkennon/JarvisDesktop/JarvisDesktop.xcodeproj

# Run iOS simulator
# Xcode → Product → Destination → iPhone 15 Pro
# Xcode → Product → Run (⌘R)

# Check iOS build
xcodebuild -scheme "Jarvis iOS" -destination 'platform=iOS Simulator,name=iPhone 15 Pro' clean build
```

---

## ✅ **Success Criteria**

- ✅ iOS app builds and runs on simulator
- ✅ Conversation sync works (iCloud + WebSocket)
- ✅ Wake word detection works in background
- ✅ Voice input captures and transcribes
- ✅ Messages sync instantly with macOS app
- ✅ App works offline, syncs when online
- ✅ Battery usage <2% per hour (background mode)
- ✅ Memory usage <100 MB

---

**Ready to build?** Paste these prompts into separate Claude instances and run in parallel! 🚀
