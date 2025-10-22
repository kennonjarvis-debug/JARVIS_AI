import SwiftUI

@main
struct JarvisApp: App {
    @StateObject private var appState = AppState()
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .onAppear {
                    // Initialize services
                    setupServices()
                }
        }
    }

    private func setupServices() {
        // Connect to WebSocket
        appState.webSocketService.connect()

        // Start wake word detection if enabled
        if appState.settings.wakeWordEnabled {
            appState.wakeWordService.start()
        }
    }
}

// MARK: - App State
class AppState: ObservableObject {
    @Published var messages: [Message] = []
    @Published var conversations: [Conversation] = []
    @Published var currentConversationId: String?
    @Published var isRecording = false
    @Published var isProcessing = false
    @Published var settings = AppSettings()

    // Services
    let webSocketService = WebSocketService()
    let audioService = AudioService()
    let wakeWordService = WakeWordService()
    let transcriptionService = TranscriptionService()
    let cloudSyncService = CloudSyncService()

    init() {
        // Load saved conversations
        loadConversations()

        // Setup service callbacks
        setupServiceBindings()
    }

    private func loadConversations() {
        // Load from UserDefaults or CloudKit
        if let data = UserDefaults.standard.data(forKey: "conversations"),
           let decoded = try? JSONDecoder().decode([Conversation].self, from: data) {
            conversations = decoded
        }
    }

    private func setupServiceBindings() {
        // WebSocket message handler
        webSocketService.onMessage = { [weak self] message in
            DispatchQueue.main.async {
                self?.handleIncomingMessage(message)
            }
        }

        // Wake word detected handler
        wakeWordService.onWakeWordDetected = { [weak self] in
            DispatchQueue.main.async {
                self?.startVoiceInput()
            }
        }
    }

    func handleIncomingMessage(_ message: Message) {
        messages.append(message)
        saveConversations()
    }

    func startVoiceInput() {
        guard !isRecording else { return }
        isRecording = true
        audioService.startRecording()
    }

    func stopVoiceInput() {
        guard isRecording else { return }
        isRecording = false

        audioService.stopRecording { [weak self] audioData in
            self?.processAudioData(audioData)
        }
    }

    private func processAudioData(_ data: Data) {
        isProcessing = true

        Task {
            do {
                let transcription = try await transcriptionService.transcribe(data)
                await sendMessage(transcription)
            } catch {
                print("Transcription failed: \(error)")
            }

            await MainActor.run {
                isProcessing = false
            }
        }
    }

    func sendMessage(_ text: String) async {
        let message = Message(
            id: UUID().uuidString,
            role: "user",
            content: text,
            timestamp: Date()
        )

        await MainActor.run {
            messages.append(message)
        }

        // Send via WebSocket
        webSocketService.send(message)
    }

    private func saveConversations() {
        if let encoded = try? JSONEncoder().encode(conversations) {
            UserDefaults.standard.set(encoded, forKey: "conversations")
        }
    }
}

// MARK: - App Settings
struct AppSettings: Codable {
    var wakeWordEnabled = true
    var backgroundListening = true
    var autoSync = true
    var notificationsEnabled = true
    var backendURL = "ws://localhost:4000"
}
