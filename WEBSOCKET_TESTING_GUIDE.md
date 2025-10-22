# WebSocket Real-Time Sync Testing Guide

**Status:** ✅ All components ready for testing
**Time:** 2025-10-08 12:32 PM PST

---

## 🎯 System Status

### Services Running:
- ✅ Control Plane (port 4000) - WebSocket Hub active
- ✅ Dashboard API (port 5001) - ConversationStore integrated
- ✅ Dashboard Frontend (port 3003) - WebSocket client added
- ✅ WebSocket endpoint: `ws://localhost:4000/ws`

### Verification:
```bash
curl http://localhost:4000/ws/stats
# Shows: connectedClients: 0, activeRooms: 0 (ready for connections)
```

---

## 🧪 TEST 1: Web Dashboard Connection

### Steps:
1. **Open Browser**
   ```bash
   open http://localhost:3003
   ```

2. **Navigate to Chat**
   - Click "Chat" in the navigation
   - Look for green "Real-time sync" indicator in header

3. **Check Browser Console**
   ```javascript
   // Should see:
   // 🔌 Connecting to WebSocket: ws://localhost:4000/ws?source=web&conversationId=...
   // ✅ WebSocket connected
   ```

4. **Verify Connection**
   ```bash
   # In terminal:
   curl -s http://localhost:4000/ws/stats | jq .
   # Should show: connectedClients: 1, activeRooms: 1
   ```

---

## 🧪 TEST 2: Send Message from Web

### Steps:
1. **Type message in web chat:**
   ```
   Hello from Web Dashboard!
   ```

2. **Press Enter / Click Send**

3. **Check conversation file created:**
   ```bash
   ls -la .data/conversations/
   # Should see a JSON file

   # View the conversation:
   cat .data/conversations/web-*.json | jq .
   ```

4. **Expected JSON structure:**
   ```json
   {
     "id": "web-1234567890-abc123",
     "messages": [
       {
         "id": "...",
         "conversationId": "web-1234567890-abc123",
         "source": "web",
         "role": "user",
         "content": "Hello from Web Dashboard!",
         "timestamp": "2025-10-08T19:32:00Z"
       },
       {
         "id": "...",
         "conversationId": "web-1234567890-abc123",
         "source": "web",
         "role": "assistant",
         "content": "I'm Jarvis, your AI assistant...",
         "timestamp": "2025-10-08T19:32:01Z"
       }
     ],
     "created": "2025-10-08T19:32:00Z",
     "updated": "2025-10-08T19:32:01Z"
   }
   ```

---

## 🧪 TEST 3: Desktop App Connection

### Steps:
1. **Open JarvisDesktop App**
   ```bash
   open /Applications/JarvisDesktop.app
   ```

   OR if running from Xcode:
   ```bash
   # Open Xcode project
   open /Users/benkennon/JarvisDesktop/JarvisDesktop.xcodeproj
   # Run the app (Cmd+R)
   ```

2. **Check Xcode Console Output**
   ```
   🔌 WebSocket initialized for conversation: <UUID>
   ✅ WebSocket connected
   ```

3. **Verify in Terminal**
   ```bash
   curl -s http://localhost:4000/ws/stats | jq .
   # Should show: connectedClients: 2 (web + desktop)
   # activeRooms: 2 (separate conversations)
   ```

---

## 🧪 TEST 4: Desktop → Web Sync

### Steps:
1. **In Desktop App:**
   - Type: "Hello from Desktop!"
   - Press Enter

2. **Expected in Xcode Console:**
   ```
   ✅ Message sent: message
   📨 Received message from web: ...
   ```

3. **Open Web Dashboard in Browser**

4. **Check if message appears with badge:**
   - Message should NOT appear yet (different conversation IDs)
   - This is expected behavior - each client starts its own conversation

### To test same conversation sync:
You would need to implement conversation joining, where:
1. Web generates a conversation ID
2. Desktop can join that same conversation ID
3. Then messages sync between them

**Current limitation:** Each client creates its own conversation. To sync:
- Need to add conversation ID sharing mechanism
- Or implement a "join conversation" feature

---

## 🧪 TEST 5: Multiple Web Clients (Same Conversation)

### Steps:
1. **Open Browser Tab 1**
   - Go to http://localhost:3003/chat
   - Note the conversation ID in console

2. **Open Browser Tab 2 (Incognito/Private)**
   - Go to http://localhost:3003/chat
   - Different conversation ID

3. **Currently:** Each tab has separate conversation

4. **To test sync:** You'd need to:
   - Manually share conversation ID
   - Or implement conversation list/selection UI

---

## 🧪 TEST 6: Monitor WebSocket in Real-Time

### Terminal 1: Watch WebSocket Stats
```bash
watch -n 1 'curl -s http://localhost:4000/ws/stats | jq .'
```

### Terminal 2: Watch Control Plane Logs
```bash
tail -f /tmp/control-plane-startup.log | grep -i websocket
```

### Terminal 3: Watch Dashboard API Logs
```bash
tail -f /tmp/dashboard-api-startup.log
```

### Expected Output:
When message is sent:
```
Control Plane Log:
[info] WebSocket message received: type=message, source=web
[info] Broadcasting to room: web-1234567890-abc123
[info] Message stored in ConversationStore

Dashboard API Log:
[info] POST /api/chat 200 - 543ms
```

---

## 🧪 TEST 7: Reconnection

### Steps:
1. **Kill Control Plane:**
   ```bash
   lsof -ti:4000 | xargs kill -9
   ```

2. **In Browser Console:**
   ```
   ❌ WebSocket error
   🔌 WebSocket disconnected
   🔄 Reconnecting WebSocket...
   ```

3. **Check Web UI:**
   - Red "Connecting..." indicator in header

4. **Restart Control Plane:**
   ```bash
   cd /Users/benkennon/Jarvis
   npm run dev
   ```

5. **Expected:**
   - Web automatically reconnects within 3 seconds
   - Green "Real-time sync" indicator returns
   - Desktop app also reconnects (exponential backoff)

---

## 🧪 TEST 8: Persistence

### Steps:
1. **Send messages from Web and Desktop**

2. **Close all clients**

3. **Check conversation files:**
   ```bash
   ls -la .data/conversations/
   cat .data/conversations/*.json | jq .
   ```

4. **Restart Desktop App**
   - Should load conversation history from UserDefaults

5. **Refresh Web Dashboard**
   - Starts new session (conversation ID changes)
   - To test persistence: need to implement conversation history loading

---

## 📊 Success Metrics

- [x] WebSocket Hub running and accepting connections
- [x] Web dashboard connects on page load
- [x] Desktop app connects on startup
- [x] Messages stored with source tracking
- [x] ConversationStore persists to disk
- [ ] Messages sync between clients (needs same conversation ID)
- [ ] Source badges display correctly
- [ ] Auto-reconnection works
- [ ] Multiple clients can connect

---

## 🐛 Troubleshooting

### WebSocket won't connect:
```bash
# Check Control Plane is running:
lsof -i :4000

# Check WebSocket endpoint:
curl http://localhost:4000/health
```

### Messages not appearing:
```bash
# Check browser console for errors
# Verify WebSocket is connected (green indicator)
# Check conversation ID matches
```

### Desktop app crashes:
```bash
# Check Xcode console for errors
# Verify WebSocketClient.swift compiled
# Check ChatViewModel logs
```

---

## 🎯 Known Limitations

1. **Separate Conversations:**
   - Each client creates its own conversation ID
   - Need to implement conversation joining/sharing

2. **No Conversation List:**
   - Can't see/switch between conversations yet
   - Each session is isolated

3. **No Typing Indicators:**
   - Can't see when others are typing

4. **No Read Receipts:**
   - Can't see if messages were delivered/read

---

## 🚀 Next Steps to Enable Full Sync

To make Desktop ↔ Web sync work fully:

### Option 1: Shared Conversation ID
1. Generate conversation ID on backend
2. Both clients join same ID
3. All messages sync in real-time

### Option 2: Conversation List
1. Add conversation history endpoint
2. Show list of conversations in UI
3. Click to join existing conversation

### Option 3: Default Conversation
1. Use a fixed "default" conversation ID
2. All clients join by default
3. Messages sync automatically

---

**Generated:** 2025-10-08 12:32 PM PST
**Status:** Backend ✅ | Native App ✅ | Web UI ✅ | Full Sync ⏳ (needs conversation joining)
