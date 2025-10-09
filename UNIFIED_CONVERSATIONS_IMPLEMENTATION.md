# 🔄 Unified Conversation Sync - Implementation Guide

**Status:** Backend Foundation Complete ✅ | Native App & Dashboard Pending ⏳

**Time Invested:** ~15 minutes
**Remaining Estimated Time:** 5-6 hours
**Completion:** 15% (Backend Foundation)

---

## 📊 Current Progress

### ✅ COMPLETED (Backend Foundation - 15%)

**Time: 12:08 PM - 12:15 PM PST**

1. ✅ **ConversationStore** (`src/core/conversation-store.ts`)
   - Unified message storage with source tracking
   - File-based persistence (`.data/conversations/`)
   - Participant presence tracking
   - Conversation querying and search
   - Auto-save with debouncing

2. ✅ **WebSocket Hub** (`src/core/websocket-hub.ts`)
   - WebSocket server on `ws://localhost:4000/ws`
   - Room-based routing per conversation ID
   - Client presence tracking
   - Message broadcasting
   - Heartbeat for dead connection detection
   - Source tracking (desktop | web | chatgpt | iphone)

3. ✅ **Gateway Integration** (`src/core/gateway.ts`)
   - WebSocket Hub mounted on Control Plane (port 4000)
   - ConversationStore initialization
   - Graceful shutdown handlers
   - Stats endpoint: `GET /ws/stats`

4. ✅ **Dependencies Installed**
   - `ws` and `@types/ws` packages added

---

## 🚧 REMAINING WORK (85%)

### Phase 1: Test Backend Foundation (30 min)

**Goal:** Verify WebSocket Hub and ConversationStore work correctly

**Steps:**
1. **Restart Control Plane**
   ```bash
   cd /Users/benkennon/Jarvis
   # Kill existing process on port 4000
   lsof -ti:4000 | xargs kill -9

   # Start Control Plane
   npm run dev
   ```

2. **Check Initialization**
   Look for these logs:
   ```
   📚 Conversation store initialized
   🔌 WebSocket Hub initialized
   🔌 WebSocket endpoint: ws://localhost:4000/ws
   ```

3. **Test WebSocket Connection**
   ```bash
   # Install wscat if needed
   npm install -g wscat

   # Connect to WebSocket
   wscat -c "ws://localhost:4000/ws?source=test"

   # Should receive welcome message:
   # {"type":"presence","clientId":"...","source":"test","connected":true}
   ```

4. **Test Stats Endpoint**
   ```bash
   curl http://localhost:4000/ws/stats | python3 -m json.tool

   # Should show:
   # {
   #   "success": true,
   #   "data": {
   #     "websocket": {
   #       "connectedClients": 0,
   #       "activeRooms": 0,
   #       "clientsBySource": {}
   #     },
   #     "conversations": {
   #       "totalConversations": 0,
   #       "totalMessages": 0
   #     }
   #   }
   # }
   ```

5. **Test Message Flow**
   ```bash
   # Join conversation
   > {"type": "join", "conversationId": "test-123"}

   # Send message
   > {"type": "message", "conversationId": "test-123", "message": {"role": "user", "content": "Hello"}}

   # Should see broadcast to other clients in room
   ```

**Expected Results:**
- ✅ WebSocket server starts on port 4000
- ✅ Clients can connect
- ✅ Messages broadcast to conversation rooms
- ✅ Conversations persist to `.data/conversations/*.json`

---

### Phase 2: Update Dashboard API (1 hour)

**Goal:** Replace in-memory conversation storage with unified ConversationStore

**File:** `dashboard/backend/dashboard-api.ts`

**Changes:**

1. **Import ConversationStore**
   ```typescript
   import { conversationStore, Message as StoredMessage, MessageSource } from '../../src/core/conversation-store.js';
   import { websocketHub } from '../../src/core/websocket-hub.js';
   ```

2. **Remove In-Memory Conversations**
   ```typescript
   // DELETE this section (lines ~130-157):
   // interface Message { ... }
   // interface Conversation { ... }
   // const conversations = new Map<string, Conversation>();
   // function getOrCreateConversation(...) { ... }
   ```

3. **Update Chat Endpoint** (lines ~419-556)
   ```typescript
   app.post('/api/chat', async (req: Request, res: Response) => {
     try {
       const { message, conversationId, context } = req.body;

       if (!message) {
         res.status(400).json({ success: false, error: 'Message is required' });
         return;
       }

       const convId = conversationId || randomUUID();

       // Add user message to store
       const userMsg: StoredMessage = {
         id: randomUUID(),
         conversationId: convId,
         role: 'user',
         content: message,
         source: 'web',
         context: context || {},
         timestamp: new Date()
       };
       conversationStore.addMessage(userMsg);

       // Broadcast to WebSocket clients
       websocketHub.broadcastMessage(userMsg);

       // Set up SSE for response streaming
       res.setHeader('Content-Type', 'text/event-stream');
       res.setHeader('Cache-Control', 'no-cache');
       res.setHeader('Connection', 'keep-alive');

       res.write(`data: ${JSON.stringify({
         type: 'start',
         conversationId: convId,
         messageId: userMsg.id
       })}\n\n`);

       try {
         // Call Jarvis Control Plane (existing code)
         const jarvisResponse = await axios.post(...);

         // ... streaming logic ...

         // On completion, save assistant message
         const assistantMsg: StoredMessage = {
           id: randomUUID(),
           conversationId: convId,
           role: 'assistant',
           content: assistantContent,
           source: 'web',
           timestamp: new Date()
         };
         conversationStore.addMessage(assistantMsg);
         websocketHub.broadcastMessage(assistantMsg);

       } catch (apiError: any) {
         // Mock response fallback (existing code)
         const assistantMsg: StoredMessage = {
           id: randomUUID(),
           conversationId: convId,
           role: 'assistant',
           content: mockResponse,
           source: 'web',
           timestamp: new Date()
         };
         conversationStore.addMessage(assistantMsg);
         websocketHub.broadcastMessage(assistantMsg);
       }

       res.end();
     } catch (error) {
       // ... error handling ...
     }
   });
   ```

4. **Update GET /api/chat/:conversationId**
   ```typescript
   app.get('/api/chat/:conversationId', (req: Request, res: Response) => {
     try {
       const { conversationId } = req.params;
       const conversation = conversationStore.getConversation(conversationId);

       if (!conversation) {
         res.status(404).json({ success: false, error: 'Conversation not found' });
         return;
       }

       res.json({ success: true, data: conversation });
     } catch (error) {
       res.status(500).json({ success: false, error: (error as Error).message });
     }
   });
   ```

5. **Update DELETE /api/chat/:conversationId**
   ```typescript
   app.delete('/api/chat/:conversationId', async (req: Request, res: Response) => {
     try {
       const { conversationId } = req.params;
       await conversationStore.deleteConversation(conversationId);
       res.json({ success: true, message: 'Conversation cleared' });
     } catch (error) {
       res.status(500).json({ success: false, error: (error as Error).message });
     }
   });
   ```

**Testing:**
```bash
# Send message via Dashboard API
curl -X POST http://localhost:5001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from web", "conversationId": "web-test-1"}'

# Check conversation persisted
curl http://localhost:4000/ws/stats | python3 -m json.tool

# Verify message appears in .data/conversations/web-test-1.json
cat .data/conversations/web-test-1.json
```

---

### Phase 3: Native App Integration (2-3 hours)

#### 3A. Create WebSocketClient.swift (1 hour)

**File:** `/Users/benkennon/JarvisDesktop/Services/WebSocketClient.swift`

**Implementation:**
```swift
import Foundation
import Combine

class WebSocketClient: ObservableObject {
    @Published var isConnected = false
    @Published var lastError: String?

    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession
    private let serverURL = URL(string: "ws://localhost:4000/ws?source=desktop")!
    private var reconnectTimer: Timer?
    private var messageSubject = PassthroughSubject<WSMessage, Never>()

    var messagePublisher: AnyPublisher<WSMessage, Never> {
        messageSubject.eraseToAnyPublisher()
    }

    init() {
        self.urlSession = URLSession(configuration: .default)
    }

    // MARK: - Connection Management

    func connect() {
        disconnect() // Close existing connection

        webSocketTask = urlSession.webSocketTask(with: serverURL)
        webSocketTask?.resume()
        isConnected = true

        print("🔌 WebSocket connecting to \(serverURL.absoluteString)")

        // Start receiving messages
        receiveMessage()
    }

    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
        print("🔌 WebSocket disconnected")
    }

    func reconnect() {
        guard !isConnected else { return }

        reconnectTimer?.invalidate()
        reconnectTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { [weak self] _ in
            self?.connect()
        }
    }

    // MARK: - Messaging

    func send(message: WSMessage) {
        guard let data = try? JSONEncoder().encode(message),
              let jsonString = String(data: data, encoding: .utf8) else {
            print("⚠️  Failed to encode message")
            return
        }

        let message = URLSessionWebSocketTask.Message.string(jsonString)
        webSocketTask?.send(message) { [weak self] error in
            if let error = error {
                print("⚠️  WebSocket send error: \(error)")
                self?.lastError = error.localizedDescription
                self?.isConnected = false
                self?.reconnect()
            }
        }
    }

    func joinConversation(_ conversationId: String) {
        let message = WSMessage(
            type: "join",
            conversationId: conversationId
        )
        send(message: message)
    }

    func leaveConversation(_ conversationId: String) {
        let message = WSMessage(
            type: "leave",
            conversationId: conversationId
        )
        send(message: message)
    }

    func sendChatMessage(_ chatMessage: ChatMessage, conversationId: String) {
        let wsMessage = WSMessage(
            type: "message",
            conversationId: conversationId,
            message: Message(
                id: chatMessage.id.uuidString,
                conversationId: conversationId,
                role: chatMessage.isUser ? "user" : "assistant",
                content: chatMessage.text,
                source: "desktop",
                context: MessageContext(
                    hasScreen: chatMessage.hasScreenCapture,
                    hasVoice: chatMessage.hasVoiceInput
                ),
                timestamp: chatMessage.timestamp
            )
        )
        send(message: wsMessage)
    }

    // MARK: - Receiving

    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleMessage(text)
                    }
                @unknown default:
                    break
                }

                // Continue receiving
                self.receiveMessage()

            case .failure(let error):
                print("⚠️  WebSocket receive error: \(error)")
                self.lastError = error.localizedDescription
                self.isConnected = false
                self.reconnect()
            }
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let wsMessage = try? JSONDecoder().decode(WSMessage.self, from: data) else {
            print("⚠️  Failed to decode WebSocket message")
            return
        }

        print("📨 Received WebSocket message: \(wsMessage.type)")

        // Publish to subscribers
        DispatchQueue.main.async {
            self.messageSubject.send(wsMessage)
        }
    }
}

// MARK: - Message Types

struct WSMessage: Codable {
    let type: String // "message" | "sync" | "presence" | "typing" | "join" | "leave"
    let conversationId: String?
    let message: Message?
    let source: String?
    let clientId: String?
    let timestamp: String?
    let data: AnyCodable?

    init(type: String, conversationId: String? = nil, message: Message? = nil) {
        self.type = type
        self.conversationId = conversationId
        self.message = message
        self.source = nil
        self.clientId = nil
        self.timestamp = nil
        self.data = nil
    }
}

struct Message: Codable {
    let id: String
    let conversationId: String
    let role: String // "user" | "assistant"
    let content: String
    let source: String // "desktop" | "web" | "chatgpt"
    let context: MessageContext?
    let timestamp: Date
}

struct MessageContext: Codable {
    let hasScreen: Bool?
    let hasVoice: Bool?
    let appName: String?
    let metadata: [String: AnyCodable]?

    init(hasScreen: Bool? = nil, hasVoice: Bool? = nil, appName: String? = nil, metadata: [String: AnyCodable]? = nil) {
        self.hasScreen = hasScreen
        self.hasVoice = hasVoice
        self.appName = appName
        self.metadata = metadata
    }
}

// Helper for encoding/decoding Any values
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let string = try? container.decode(String.self) {
            value = string
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let string = value as? String {
            try container.encode(string)
        } else if let int = value as? Int {
            try container.encode(int)
        } else if let double = value as? Double {
            try container.encode(double)
        } else if let bool = value as? Bool {
            try container.encode(bool)
        }
    }
}
```

#### 3B. Update ChatViewModel.swift (1-2 hours)

**File:** `/Users/benkennon/JarvisDesktop/ViewModels/ChatViewModel.swift`

**Changes:**

1. **Add WebSocketClient Property**
   ```swift
   private let webSocketClient = WebSocketClient()
   private var currentConversationId = UUID().uuidString
   ```

2. **Initialize WebSocket in init()**
   ```swift
   init() {
       startContextMonitoring()
       loadConversationHistory()

       // Connect WebSocket
       webSocketClient.connect()
       webSocketClient.joinConversation(currentConversationId)

       // Subscribe to WebSocket messages
       webSocketClient.messagePublisher
           .sink { [weak self] wsMessage in
               self?.handleWebSocketMessage(wsMessage)
           }
           .store(in: &cancellables)
   }
   ```

3. **Send Messages via WebSocket**
   ```swift
   func sendMessage(_ text: String) {
       var userMessage = ChatMessage(
           text: text,
           isUser: true,
           isSending: true,
           hasScreenCapture: hasScreenContext,
           hasVoiceInput: hasVoiceContext
       )

       messages.append(userMessage)
       isSending = true

       // Send via WebSocket
       webSocketClient.sendChatMessage(userMessage, conversationId: currentConversationId)

       // Also send to API for AI response (existing code)
       Task {
           // ... existing API call logic ...
       }
   }
   ```

4. **Handle Incoming WebSocket Messages**
   ```swift
   private func handleWebSocketMessage(_ wsMessage: WSMessage) {
       switch wsMessage.type {
       case "message":
           guard let message = wsMessage.message,
                 message.source != "desktop" else { return } // Ignore own messages

           let chatMessage = ChatMessage(
               text: message.content,
               isUser: message.role == "user",
               source: message.source
           )

           DispatchQueue.main.async {
               self.messages.append(chatMessage)
           }

       case "sync":
           if let messages = wsMessage.data?.value as? [[String: Any]] {
               // Load message history
               syncMessages(messages)
           }

       case "presence":
           // Handle participant presence
           print("👥 Presence update: \(wsMessage.source ?? "unknown")")

       case "typing":
           // Show typing indicator
           DispatchQueue.main.async {
               self.isTyping = wsMessage.source != "desktop"
           }

       default:
           break
       }
   }
   ```

5. **Update ChatMessage Model** to include source indicator
   ```swift
   struct ChatMessage: Identifiable, Codable {
       let id: UUID
       let text: String
       let isUser: Bool
       let timestamp: Date
       var isSending: Bool = false
       var hasError: Bool = false
       var hasScreenCapture: Bool = false
       var hasVoiceInput: Bool = false
       var source: String? = nil // "desktop" | "web" | "chatgpt"

       init(text: String, isUser: Bool, source: String? = nil, hasScreenCapture: Bool = false, hasVoiceInput: Bool = false) {
           self.id = UUID()
           self.text = text
           self.isUser = isUser
           self.timestamp = Date()
           self.hasScreenCapture = hasScreenCapture
           self.hasVoiceInput = hasVoiceInput
           self.source = source
       }
   }
   ```

6. **Update UI to Show Source Badge**
   In ChatMessageView, add source indicator:
   ```swift
   // Show source badge for non-desktop messages
   if let source = message.source, source != "desktop" {
       HStack(spacing: 4) {
           Text(sourceIcon(source))
           Text(source.capitalized)
               .font(.caption2)
               .foregroundColor(.secondary)
       }
       .padding(.horizontal, 6)
       .padding(.vertical, 2)
       .background(Color.secondary.opacity(0.2))
       .cornerRadius(4)
   }

   private func sourceIcon(_ source: String) -> String {
       switch source {
       case "web": return "🌐"
       case "chatgpt": return "🤖"
       case "iphone": return "📱"
       default: return "💬"
       }
   }
   ```

#### 3C. Update APIClient.swift

**File:** `/Users/benkennon/JarvisDesktop/Services/APIClient.swift`

**Change baseURL to point to Control Plane:**

```swift
private let baseURL = "http://localhost:4000" // Changed from 3001
```

**Note:** May need to add authentication token if Control Plane auth is enabled.

---

### Phase 4: Dashboard Frontend Integration (1 hour)

**File:** `dashboard/frontend/app/components/ChatInterface.tsx`

**Add WebSocket Connection:**

```typescript
useEffect(() => {
  const ws = new WebSocket('ws://localhost:4000/ws?source=web');
  const conversationId = 'web-dashboard-session';

  ws.onopen = () => {
    console.log('🔌 WebSocket connected');
    // Join conversation
    ws.send(JSON.stringify({
      type: 'join',
      conversationId
    }));
  };

  ws.onmessage = (event) => {
    const wsMessage = JSON.parse(event.data);

    if (wsMessage.type === 'message' && wsMessage.message.source !== 'web') {
      // Add message from other source
      setMessages(prev => [...prev, {
        id: wsMessage.message.id,
        role: wsMessage.message.role,
        content: wsMessage.message.content,
        source: wsMessage.message.source,
        timestamp: wsMessage.message.timestamp
      }]);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket closed, reconnecting...');
    setTimeout(() => {
      // Reconnect logic
    }, 3000);
  };

  return () => {
    ws.send(JSON.stringify({ type: 'leave', conversationId }));
    ws.close();
  };
}, []);
```

**Update Message Display to Show Source:**

```tsx
{messages.map((message) => (
  <div key={message.id} className={`message ${message.role}`}>
    <div className="message-content">
      {message.content}
    </div>
    {message.source && message.source !== 'web' && (
      <div className="message-source">
        {sourceIcon(message.source)} {message.source}
      </div>
    )}
  </div>
))}

function sourceIcon(source: string) {
  switch (source) {
    case 'desktop': return '🖥️';
    case 'chatgpt': return '🤖';
    case 'iphone': return '📱';
    default: return '💬';
  }
}
```

---

### Phase 5: ChatGPT Integration (1 hour)

**File:** `src/integrations/chatgpt/webhook-handler.ts`

**Add ConversationStore Integration:**

1. **Import at top**
   ```typescript
   import { conversationStore, Message as StoredMessage } from '../../core/conversation-store.js';
   import { websocketHub } from '../../core/websocket-hub.js';
   ```

2. **In each action handler that sends/receives messages:**
   ```typescript
   // After ChatGPT sends a message
   const message: StoredMessage = {
     id: randomUUID(),
     conversationId: 'chatgpt-session', // or derive from request
     role: 'assistant',
     content: response,
     source: 'chatgpt',
     timestamp: new Date()
   };

   conversationStore.addMessage(message);
   websocketHub.broadcastMessage(message);
   ```

3. **When ChatGPT receives a message from user:**
   ```typescript
   // Before processing
   const userMessage: StoredMessage = {
     id: randomUUID(),
     conversationId: 'chatgpt-session',
     role: 'user',
     content: query,
     source: 'chatgpt',
     timestamp: new Date()
   };

   conversationStore.addMessage(userMessage);
   websocketHub.broadcastMessage(userMessage);
   ```

---

### Phase 6: End-to-End Testing (1 hour)

**Test Scenario 1: Desktop → Web Sync**

1. Open JarvisDesktop native app
2. Send message: "Hello from desktop"
3. Open Dashboard web UI (http://localhost:3003)
4. Verify message appears in web chat with 🖥️ Desktop badge

**Test Scenario 2: Web → Desktop Sync**

1. Open Dashboard web UI
2. Send message: "Hello from web"
3. Check JarvisDesktop native app
4. Verify message appears with 🌐 Web badge

**Test Scenario 3: ChatGPT → All Clients**

1. Send message to ChatGPT Custom GPT
2. Check both JarvisDesktop and Dashboard
3. Verify ChatGPT response appears with 🤖 badge

**Test Scenario 4: Persistence**

1. Send messages from all 3 sources
2. Restart Control Plane
3. Verify messages persist in `.data/conversations/*.json`
4. Reconnect clients, verify history syncs

**Test Scenario 5: Real-time Sync**

1. Open 2 browser tabs with Dashboard
2. Send message from Tab 1
3. Verify instant appearance in Tab 2
4. Send from native app
5. Verify instant appearance in both tabs

---

## 📁 File Structure Summary

```
/Users/benkennon/Jarvis/
├── src/
│   ├── core/
│   │   ├── conversation-store.ts ✅ CREATED
│   │   ├── websocket-hub.ts ✅ CREATED
│   │   ├── gateway.ts ✅ UPDATED
│   │   └── ...
│   ├── integrations/
│   │   └── chatgpt/
│   │       └── webhook-handler.ts ⏳ TODO
│   └── main.ts ✅ UPDATED
├── dashboard/
│   ├── backend/
│   │   └── dashboard-api.ts ⏳ TODO
│   └── frontend/
│       └── app/components/
│           └── ChatInterface.tsx ⏳ TODO
├── .data/
│   └── conversations/ ✅ AUTO-CREATED
│       └── *.json (persisted conversations)
└── package.json ✅ UPDATED (ws deps)

/Users/benkennon/JarvisDesktop/
├── Services/
│   ├── WebSocketClient.swift ⏳ TODO (CREATE)
│   └── APIClient.swift ⏳ TODO (UPDATE baseURL)
└── ViewModels/
    └── ChatViewModel.swift ⏳ TODO (UPDATE)
```

---

## 🎯 Success Criteria

- ✅ All 3 chat interfaces share conversation history
- ✅ Messages appear in real-time across all clients
- ✅ Source badges show where each message originated
- ✅ Conversations persist across restarts
- ✅ Reconnection works automatically
- ✅ No message loss during reconnections

---

## 🐛 Common Issues & Fixes

### Issue: WebSocket connection refused
**Fix:** Ensure Control Plane is running on port 4000
```bash
lsof -ti:4000
curl http://localhost:4000/health
```

### Issue: Messages not syncing
**Fix:** Check WebSocket connection status
```bash
curl http://localhost:4000/ws/stats
# Should show connected clients
```

### Issue: Conversations not persisting
**Fix:** Check file permissions
```bash
ls -la .data/conversations/
# Ensure directory is writable
```

### Issue: Native app can't connect
**Fix:** Update APIClient baseURL and ensure Control Plane is accessible
```swift
private let baseURL = "http://localhost:4000"
```

---

## 📊 Estimated Time Breakdown

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Backend Foundation | 15 min | ✅ DONE |
| 2 | Test Backend | 30 min | ⏳ TODO |
| 3 | Dashboard API Update | 1 hour | ⏳ TODO |
| 4 | Native App WebSocketClient | 1 hour | ⏳ TODO |
| 5 | Native App Integration | 1-2 hours | ⏳ TODO |
| 6 | Dashboard Frontend | 1 hour | ⏳ TODO |
| 7 | ChatGPT Integration | 1 hour | ⏳ TODO |
| 8 | End-to-End Testing | 1 hour | ⏳ TODO |
| **TOTAL** | | **6-8 hours** | **15% Complete** |

---

## 🚀 Quick Start (Continue Implementation)

```bash
# 1. Test backend foundation
cd /Users/benkennon/Jarvis
npm run dev

# In another terminal
wscat -c "ws://localhost:4000/ws?source=test"
> {"type": "join", "conversationId": "test-123"}

# 2. Update Dashboard API
code dashboard/backend/dashboard-api.ts
# Follow Phase 2 instructions above

# 3. Create WebSocketClient.swift
code /Users/benkennon/JarvisDesktop/Services/WebSocketClient.swift
# Follow Phase 3A instructions above

# 4. Continue with remaining phases...
```

---

**Next Agent:** Continue with Phase 2 (Test Backend) and Phase 3 (Dashboard API Update)

**Estimated Completion:** 5-6 more hours of focused work

**Priority:** High - This unifies all chat interfaces and is critical for seamless UX
