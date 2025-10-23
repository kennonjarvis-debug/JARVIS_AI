import Foundation

// MARK: - Message
struct Message: Identifiable, Codable {
    let id: String
    let role: String // "user" or "assistant"
    let content: String
    let timestamp: Date

    enum CodingKeys: String, CodingKey {
        case id, role, content, timestamp
    }
}

// MARK: - Conversation
struct Conversation: Identifiable, Codable {
    let id: String
    var title: String
    var messages: [Message]
    let createdAt: Date
    var updatedAt: Date

    var lastMessage: Message? {
        messages.last
    }

    var preview: String {
        lastMessage?.content.prefix(100).description ?? "No messages"
    }
}

// MARK: - WebSocket Message Types
enum WebSocketMessageType: String, Codable {
    case message
    case sync
    case notification
    case error
}

struct WebSocketMessage: Codable {
    let type: WebSocketMessageType
    let payload: WebSocketPayload
}

struct WebSocketPayload: Codable {
    var message: Message?
    var conversationId: String?
    var metadata: [String: String]?

    init(message: Message? = nil, conversationId: String? = nil, metadata: [String: String]? = nil) {
        self.message = message
        self.conversationId = conversationId
        self.metadata = metadata
    }
}

// MARK: - API Response
struct TranscriptionResponse: Codable {
    let text: String
}

struct ChatCompletionResponse: Codable {
    let id: String
    let choices: [Choice]

    struct Choice: Codable {
        let message: ChatMessage
    }

    struct ChatMessage: Codable {
        let role: String
        let content: String
    }
}

// MARK: - App Configuration
struct AppConfig {
    // Backend URL - Use environment variable or fall back to production
    // For local development: ws://localhost:5001/ws
    // For production: wss://control-plane-production-e966.up.railway.app/ws
    static let backendURL = ProcessInfo.processInfo.environment["BACKEND_URL"] ?? "wss://control-plane-production-e966.up.railway.app/ws"

    static let openAIAPIKey = ProcessInfo.processInfo.environment["OPENAI_API_KEY"] ?? ""
    static let wakeWord = "hey jarvis"

    // Audio settings
    static let sampleRate: Double = 16000
    static let audioChannels: UInt32 = 1
    static let audioBitDepth: UInt32 = 16

    // Wake word detection
    static let wakeWordThreshold: Float = 0.7
    static let wakeWordTimeout: TimeInterval = 5.0

    // Recording
    static let maxRecordingDuration: TimeInterval = 60.0
    static let silenceThreshold: Float = -40.0 // dB
    static let silenceDuration: TimeInterval = 1.5 // seconds
}
