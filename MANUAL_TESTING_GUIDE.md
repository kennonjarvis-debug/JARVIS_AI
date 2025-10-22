# 🧪 Jarvis Manual Testing Guide

**Last Updated:** October 8, 2025
**Estimated Time:** 30-45 minutes
**Prerequisites:** JarvisDesktop.app running, backends healthy

---

## 🎯 Quick Pre-Test Checklist

Before starting tests, verify all services are running:

```bash
# Check backends
curl http://localhost:3001/api/v1/jarvis/desktop/health
curl http://localhost:5001/health

# Check JarvisDesktop app is running
ps aux | grep JarvisDesktop | grep -v grep

# Check dashboard is accessible
open http://localhost:3003
```

**Expected Results:**
- ✅ AI DAWG: `{"status":"ok"}`
- ✅ Dashboard API: `{"status":"healthy"}`
- ✅ JarvisDesktop: Process ID shown
- ✅ Dashboard: Opens in browser

---

## 📋 Test Suite

### Test 1: Basic App Launch & Menu Bar

**Objective:** Verify app starts correctly and appears in menu bar

**Steps:**
1. Look for Jarvis brain icon (🧠) in macOS menu bar (top-right)
2. Click the menu bar icon
3. Verify menu options appear:
   - Enable Wake Word Mode
   - Open Chat
   - Capture Screen
   - Settings
   - Quit

**Pass Criteria:**
- ✅ Menu bar icon visible
- ✅ Menu opens on click
- ✅ All options present

**If Failed:**
- Check Console.app for errors (filter: "JarvisDesktop")
- Verify Info.plist permissions granted
- Restart app: `killall JarvisDesktop && open build/.../JarvisDesktop.app`

---

### Test 2: Wake Word Detection

**Objective:** Verify "Hey Jarvis" triggers voice input

**Steps:**
1. Click menu bar icon → **"Enable Wake Word Mode"**
2. Wait 2 seconds for initialization
3. Say clearly: **"Hey Jarvis"**
4. Observe:
   - Menu bar icon should pulse or change color
   - Microphone indicator should appear
   - Chat window should open (if configured)

**Pass Criteria:**
- ✅ Wake word detected within 1 second
- ✅ Visual feedback shown
- ✅ Voice input auto-starts

**If Failed:**
- Check System Settings → Privacy & Security → Microphone
- Enable JarvisDesktop if not listed
- Verify Background Audio Manager logs:
  ```bash
  log stream --predicate 'process == "JarvisDesktop"' | grep -i wake
  ```

**Performance Check:**
- CPU usage should be <5% while listening
- Check Activity Monitor → JarvisDesktop

---

### Test 3: Voice Input & Transcription

**Objective:** Verify voice is captured and transcribed

**Steps:**
1. Trigger wake word (or click menu → "Open Chat" → mic button)
2. Speak: **"What's the weather like today?"**
3. Stop recording (should auto-stop after silence)
4. Observe:
   - Transcription appears in chat window
   - Message sent to backend
   - Response received from Jarvis

**Pass Criteria:**
- ✅ Voice transcribed accurately (>90%)
- ✅ Message sent to backend
- ✅ Response received within 5 seconds

**Alternative Test (Whisper API):**
- If local transcription fails, app should fallback to Whisper
- Verify `OPENAI_API_KEY` is set if using Whisper

---

### Test 4: Screen Capture

**Objective:** Verify screen can be captured and analyzed

**Steps:**
1. Open a simple app (e.g., TextEdit with some text)
2. Click menu bar → "Capture Screen"
3. Observe:
   - Red recording indicator appears (top-right)
   - Screen captured
   - Vision analysis runs (if OpenAI key configured)
   - Capture shown in chat with preview

**Pass Criteria:**
- ✅ Screen captured successfully
- ✅ Recording indicator shows and hides
- ✅ Image data saved
- ✅ Vision analysis returns description (if API key set)

**Privacy Test:**
- Open 1Password or Banking app
- Attempt screen capture
- Should be **BLOCKED** with privacy error

---

### Test 5: Privacy Zones (Blacklist)

**Objective:** Verify sensitive apps are protected

**Steps:**
1. Open **1Password** (or any blacklisted app)
2. Try to capture screen (menu → "Capture Screen")
3. Observe:
   - Capture should be **BLOCKED**
   - Error message: "Screen capture blocked by privacy rules"
   - Privacy indicator (lock icon) should show

**Pass Criteria:**
- ✅ Screen capture blocked when 1Password is frontmost
- ✅ Error message shown
- ✅ No image data saved

**Test Other Blacklisted Apps:**
- Keychain Access
- Safari (on banking websites)
- Mail
- Messages

**Whitelist Test:**
- Open TextEdit or Chrome
- Capture should work normally

---

### Test 6: WebSocket Message Sync

**Objective:** Verify messages sync between native app and web dashboard

**Steps:**
1. Open web dashboard: http://localhost:3003
2. Click "Chat" tab
3. In **web dashboard**, send message: "Hello from web"
4. Observe in **JarvisDesktop native app**:
   - Message should appear with "🌐 Web" badge
   - No delay (real-time)

5. In **JarvisDesktop native app**, send: "Hello from desktop"
6. Observe in **web dashboard**:
   - Message should appear with "🖥️ Desktop" badge
   - Real-time sync

**Pass Criteria:**
- ✅ Messages sync instantly (<500ms)
- ✅ Source badges shown correctly
- ✅ No duplicates
- ✅ Conversation ID shared

**Debug WebSocket:**
```bash
# Check WebSocket connection logs
log stream --predicate 'process == "JarvisDesktop"' | grep -i websocket

# Expected logs:
# "🔌 Connecting to WebSocket: ws://localhost:4000/desktop/ws"
# "✅ WebSocket connected"
# "📨 Received message from web: ..."
```

---

### Test 7: Context Awareness

**Objective:** Verify app detects active app and provides contextual suggestions

**Steps:**
1. Open **Xcode** (or Visual Studio Code)
2. Wait 30 seconds for context detection
3. Open JarvisDesktop chat
4. Check suggestions:
   - Should show coding-related suggestions
   - "Review my code on screen"
   - "Explain what this code does"
   - "Find potential bugs"

5. Switch to **Safari** (browse a website)
6. Wait 30 seconds
7. Check suggestions:
   - Should update to browsing suggestions
   - "Summarize this page"
   - "Find key information"

**Pass Criteria:**
- ✅ Context detected within 30 seconds
- ✅ Suggestions update based on active app
- ✅ Accurate app detection

---

### Test 8: Chat with Backend

**Objective:** Verify end-to-end chat flow

**Steps:**
1. Open JarvisDesktop chat window
2. Type: **"What is 2+2?"**
3. Send message
4. Observe:
   - Message sent to backend (localhost:3001 or localhost:4000)
   - Streaming response (word-by-word)
   - Response completes
   - Message saved to conversation

**Pass Criteria:**
- ✅ Message sent successfully
- ✅ Response received within 5 seconds
- ✅ Streaming works (see words appear)
- ✅ Conversation history persists

**Check Backend Logs:**
```bash
# AI DAWG logs
tail -f /Users/benkennon/ai-dawg-v0.1/logs/combined.log | grep -i chat

# Dashboard API logs
tail -f /Users/benkennon/Jarvis/dashboard/logs/backend.log
```

---

### Test 9: Proactive Suggestions (Dashboard)

**Objective:** Verify proactive intelligence system

**Steps:**
1. Open web dashboard: http://localhost:3003
2. Click notification bell (top-right)
3. Observe:
   - Proactive suggestions panel opens
   - Active suggestions shown (if any)
   - User can provide feedback

4. In dashboard chat, perform several actions:
   - Ask about business metrics
   - View instance activity
   - Check system health

5. Wait 2-3 minutes
6. Check notification bell again:
   - New suggestions should appear based on your activity

**Pass Criteria:**
- ✅ Proactive panel opens
- ✅ Suggestions generated based on patterns
- ✅ Feedback buttons work
- ✅ Toast notifications appear (if configured)

**API Test:**
```bash
curl http://localhost:5001/api/proactive/suggestions
# Should return active suggestions
```

---

### Test 10: LaunchAgent Auto-Start

**Objective:** Verify app starts automatically on login

**Steps:**
1. Verify LaunchAgent is installed:
   ```bash
   launchctl list | grep jarvis
   ```

2. **Logout** from macOS

3. **Login** again

4. Wait 5 seconds

5. Check menu bar for Jarvis icon

**Pass Criteria:**
- ✅ App appears in menu bar within 5 seconds
- ✅ No errors in Console.app
- ✅ All features work as before

**Manual Install (if needed):**
```bash
cd /Users/benkennon/JarvisDesktop/Scripts
./install-launch-agent.sh
```

---

### Test 11: Memory & Performance

**Objective:** Verify app is performant and doesn't leak memory

**Steps:**
1. Open **Activity Monitor**
2. Find "JarvisDesktop" process
3. Record initial stats:
   - Memory: ~25-50 MB
   - CPU: <1% (idle)
   - Energy: Low

4. Use app heavily for 10 minutes:
   - Say "Hey Jarvis" 10 times
   - Capture screen 5 times
   - Send 20 chat messages
   - Switch between apps

5. Check Activity Monitor again:
   - Memory: Should increase slightly but not double
   - CPU: Should return to <5% when idle
   - Energy: Should remain Low

**Pass Criteria:**
- ✅ Memory usage <100 MB
- ✅ CPU idle <5%
- ✅ No memory leaks (stable after 10 min)
- ✅ Energy impact: Low

---

### Test 12: Error Handling

**Objective:** Verify graceful error handling

**Test Scenarios:**

**A. Backend Offline**
1. Stop AI DAWG backend:
   ```bash
   # Stop the backend
   pkill -f "ai-dawg"
   ```
2. Try sending a chat message
3. Expected: Error message shown, app doesn't crash

**B. No Internet (Whisper API)**
1. Disconnect from WiFi
2. Try voice input with Whisper enabled
3. Expected: Fallback to local speech recognition

**C. Permissions Denied**
1. System Settings → Privacy → Screen Recording
2. Disable JarvisDesktop
3. Try screen capture
4. Expected: Permission error shown, prompt to enable

**Pass Criteria:**
- ✅ No crashes
- ✅ Helpful error messages
- ✅ Graceful degradation

---

## 🎯 Test Results Summary

After completing all tests, fill out this scorecard:

| Test | Status | Notes |
|------|--------|-------|
| 1. App Launch & Menu Bar | ⚠️ | |
| 2. Wake Word Detection | ⚠️ | |
| 3. Voice Input | ⚠️ | |
| 4. Screen Capture | ⚠️ | |
| 5. Privacy Zones | ⚠️ | |
| 6. WebSocket Sync | ⚠️ | |
| 7. Context Awareness | ⚠️ | |
| 8. Chat Backend | ⚠️ | |
| 9. Proactive Suggestions | ⚠️ | |
| 10. LaunchAgent | ⚠️ | |
| 11. Performance | ⚠️ | |
| 12. Error Handling | ⚠️ | |

**Overall Grade:** ___/12 passed

---

## 🐛 Troubleshooting

### Common Issues

**Issue: Wake word not detecting**
- Check microphone permissions
- Verify Background Audio Manager is running
- Reduce background noise
- Try louder/clearer pronunciation

**Issue: WebSocket not connecting**
- Check Control Plane is running (port 4000)
- Verify WebSocket endpoint exists: `ws://localhost:4000/desktop/ws`
- Check firewall settings

**Issue: Screen capture fails**
- Grant Screen Recording permission in System Settings
- Restart app after granting permission
- Check privacy zones aren't blocking

**Issue: High CPU usage**
- Disable wake word mode when not needed
- Check for infinite loops in logs
- Restart app

---

## 📊 Performance Benchmarks

Record actual measurements:

```
Wake Word Detection Latency: ___ ms
Voice Transcription Time (5s audio): ___ s
Screen Capture Time: ___ ms
WebSocket Message Sync: ___ ms
Chat Response Time: ___ s
Memory Usage (idle): ___ MB
CPU Usage (idle): ___ %
```

---

## ✅ Sign-Off

**Tester:** ___________________
**Date:** ___________________
**Build:** JarvisDesktop v1.0.0
**Overall Status:** ✅ Pass / ⚠️ Partial / ❌ Fail

**Comments:**
