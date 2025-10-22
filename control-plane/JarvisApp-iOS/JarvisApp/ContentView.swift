import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            ChatView()
                .tabItem {
                    Label("Chat", systemImage: "bubble.left.and.bubble.right")
                }
                .tag(0)

            ConversationsView()
                .tabItem {
                    Label("History", systemImage: "clock")
                }
                .tag(1)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(2)
        }
        .overlay(alignment: .bottom) {
            // Voice input indicator
            if appState.isRecording || appState.isProcessing {
                VoiceInputIndicator()
                    .padding(.bottom, 60)
            }
        }
    }
}

// MARK: - Chat View
struct ChatView: View {
    @EnvironmentObject var appState: AppState
    @State private var inputText = ""
    @State private var isListening = false

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Messages list
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(appState.messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                            }
                        }
                        .padding()
                    }
                    .onChange(of: appState.messages.count) { _ in
                        // Scroll to bottom on new message
                        if let lastMessage = appState.messages.last {
                            withAnimation {
                                proxy.scrollTo(lastMessage.id, anchor: .bottom)
                            }
                        }
                    }
                }

                Divider()

                // Input bar
                HStack(spacing: 12) {
                    // Text input
                    TextField("Message Jarvis...", text: $inputText)
                        .textFieldStyle(.roundedBorder)
                        .submitLabel(.send)
                        .onSubmit {
                            sendTextMessage()
                        }

                    // Voice input button
                    Button(action: toggleVoiceInput) {
                        Image(systemName: isListening ? "mic.fill" : "mic")
                            .font(.title2)
                            .foregroundColor(isListening ? .red : .blue)
                    }
                    .buttonStyle(.borderless)

                    // Send button
                    Button(action: sendTextMessage) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.title2)
                            .foregroundColor(inputText.isEmpty ? .gray : .blue)
                    }
                    .disabled(inputText.isEmpty)
                    .buttonStyle(.borderless)
                }
                .padding()
                .background(Color(.systemBackground))
            }
            .navigationTitle("Jarvis")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    ConnectionStatusView()
                }
            }
        }
    }

    private func sendTextMessage() {
        guard !inputText.isEmpty else { return }

        Task {
            await appState.sendMessage(inputText)
            inputText = ""
        }
    }

    private func toggleVoiceInput() {
        if isListening {
            appState.stopVoiceInput()
            isListening = false
        } else {
            appState.startVoiceInput()
            isListening = true
        }
    }
}

// MARK: - Message Bubble
struct MessageBubble: View {
    let message: Message

    var body: some View {
        HStack {
            if message.role == "user" {
                Spacer()
            }

            VStack(alignment: message.role == "user" ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .padding(12)
                    .background(
                        message.role == "user" ? Color.blue : Color(.systemGray5)
                    )
                    .foregroundColor(
                        message.role == "user" ? .white : .primary
                    )
                    .cornerRadius(16)

                Text(message.timestamp, style: .time)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            if message.role == "assistant" {
                Spacer()
            }
        }
    }
}

// MARK: - Voice Input Indicator
struct VoiceInputIndicator: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        HStack(spacing: 12) {
            if appState.isRecording {
                Image(systemName: "waveform")
                    .foregroundColor(.red)
                Text("Listening...")
                    .font(.subheadline)
            } else if appState.isProcessing {
                ProgressView()
                Text("Processing...")
                    .font(.subheadline)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(Color(.systemGray6))
        .cornerRadius(20)
        .shadow(radius: 4)
    }
}

// MARK: - Connection Status
struct ConnectionStatusView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(appState.webSocketService.isConnected ? Color.green : Color.red)
                .frame(width: 8, height: 8)

            Text(appState.webSocketService.isConnected ? "Connected" : "Offline")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Conversations View
struct ConversationsView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationView {
            List(appState.conversations) { conversation in
                NavigationLink(destination: Text("Conversation Detail")) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(conversation.title)
                            .font(.headline)
                        Text("\(conversation.messages.count) messages")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(conversation.updatedAt, style: .relative)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("Conversations")
        }
    }
}

// MARK: - Settings View
struct SettingsView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationView {
            Form {
                Section("Voice Control") {
                    Toggle("Wake Word Detection", isOn: $appState.settings.wakeWordEnabled)
                    Toggle("Background Listening", isOn: $appState.settings.backgroundListening)
                }

                Section("Sync") {
                    Toggle("Auto Sync", isOn: $appState.settings.autoSync)
                    Toggle("Notifications", isOn: $appState.settings.notificationsEnabled)
                }

                Section("Backend") {
                    TextField("Backend URL", text: $appState.settings.backendURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }

                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("Backend Status")
                        Spacer()
                        Text(appState.webSocketService.isConnected ? "Connected" : "Disconnected")
                            .foregroundColor(appState.webSocketService.isConnected ? .green : .red)
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

// MARK: - Preview
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(AppState())
    }
}
