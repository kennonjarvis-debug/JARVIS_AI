import Foundation
import Combine

class WebSocketService: NSObject, ObservableObject {
    @Published var isConnected = false
    private var webSocketTask: URLSessionWebSocketTask?
    private var session: URLSession!
    private var reconnectTimer: Timer?

    var onMessage: ((Message) -> Void)?

    override init() {
        super.init()
        session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
    }

    func connect() {
        guard webSocketTask == nil else { return }

        guard let url = URL(string: AppConfig.backendURL) else {
            print("❌ Invalid WebSocket URL: \(AppConfig.backendURL)")
            return
        }

        print("📡 Connecting to WebSocket: \(url)")

        webSocketTask = session.webSocketTask(with: url)
        webSocketTask?.resume()

        // Start listening for messages
        receiveMessage()
    }

    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
        reconnectTimer?.invalidate()
        reconnectTimer = nil
    }

    func send(_ message: Message) {
        guard isConnected else {
            print("❌ WebSocket not connected. Queueing message...")
            // TODO: Implement message queue for offline support
            return
        }

        let wsMessage = WebSocketMessage(
            type: .message,
            payload: WebSocketPayload(message: message)
        )

        guard let data = try? JSONEncoder().encode(wsMessage),
              let jsonString = String(data: data, encoding: .utf8) else {
            print("❌ Failed to encode message")
            return
        }

        let message = URLSessionWebSocketTask.Message.string(jsonString)

        webSocketTask?.send(message) { error in
            if let error = error {
                print("❌ WebSocket send error: \(error)")
            } else {
                print("✅ Message sent via WebSocket")
            }
        }
    }

    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                self?.handleMessage(message)
                // Continue listening
                self?.receiveMessage()

            case .failure(let error):
                print("❌ WebSocket receive error: \(error)")
                self?.handleDisconnection()
            }
        }
    }

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            guard let data = text.data(using: .utf8),
                  let wsMessage = try? JSONDecoder().decode(WebSocketMessage.self, from: data) else {
                print("❌ Failed to decode WebSocket message")
                return
            }

            handleWebSocketMessage(wsMessage)

        case .data(let data):
            guard let wsMessage = try? JSONDecoder().decode(WebSocketMessage.self, from: data) else {
                print("❌ Failed to decode WebSocket message")
                return
            }

            handleWebSocketMessage(wsMessage)

        @unknown default:
            print("❌ Unknown WebSocket message type")
        }
    }

    private func handleWebSocketMessage(_ wsMessage: WebSocketMessage) {
        switch wsMessage.type {
        case .message:
            if let message = wsMessage.payload.message {
                onMessage?(message)
            }

        case .sync:
            print("🔄 Sync message received")
            // Handle conversation sync

        case .notification:
            print("🔔 Notification received")
            // Handle push notification

        case .error:
            print("❌ Error message received")
        }
    }

    private func handleDisconnection() {
        isConnected = false
        webSocketTask = nil

        // Attempt reconnection
        scheduleReconnection()
    }

    private func scheduleReconnection() {
        reconnectTimer?.invalidate()
        reconnectTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: false) { [weak self] _ in
            print("🔄 Attempting to reconnect...")
            self?.connect()
        }
    }
}

// MARK: - URLSessionWebSocketDelegate
extension WebSocketService: URLSessionWebSocketDelegate {
    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?
    ) {
        print("✅ WebSocket connected")
        DispatchQueue.main.async {
            self.isConnected = true
        }
    }

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?
    ) {
        print("📡 WebSocket closed: \(closeCode)")
        DispatchQueue.main.async {
            self.handleDisconnection()
        }
    }
}
