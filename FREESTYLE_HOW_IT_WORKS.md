# 🎤 Freestyle Studio - How It Works

## 📱 User Flow (Simple Version)

```
┌─────────────┐
│ 1. Upload   │ → User selects MP3/WAV beat file
│    Beat     │
└─────────────┘
      ↓
┌─────────────┐
│ 2. Grant    │ → Browser asks for microphone permission
│    Mic      │
│    Access   │
└─────────────┘
      ↓
┌─────────────┐
│ 3. Click    │ → Beat starts playing (looped)
│    Record   │ → Microphone starts capturing
└─────────────┘
      ↓
┌─────────────┐
│ 4. Rap!     │ → Your words appear as text in real-time
│             │ → AI suggests rhymes for your last word
│             │ → Flow analysis shows your tempo
└─────────────┘
      ↓
┌─────────────┐
│ 5. Stop     │ → Get your lyrics as text
│    & Save   │ → Copy or download as .txt file
└─────────────┘
```

---

## 🔧 Technical Flow (Detailed)

### Phase 1: Beat Upload

```
Frontend (Port 3003)                     Backend (Port 3000)
─────────────────────                    ───────────────────

User selects file
     ↓
FormData created
     ↓
POST /api/v1/freestyle/beat/upload
     │                                        ↓
     │                                   Multer receives file
     │                                        ↓
     │                                   Save to temp storage
     │                                   (.data/freestyle-sessions/)
     │                                        ↓
     ←────────── Response ──────────── Return beatId

beatId stored in state ✅
```

**What happens:**
1. User clicks "Choose Beat File" and selects MP3/WAV
2. JavaScript creates FormData with the file
3. File is uploaded via HTTP POST to backend
4. Backend saves it temporarily and assigns a unique ID
5. Frontend receives the beatId and stores it

---

### Phase 2: Start Recording Session

```
Frontend                                 Backend
────────                                 ───────

Click "Record" button
     ↓
POST /api/v1/freestyle/session/start
     │ Body: { beatId: "abc123" }
     │                                        ↓
     │                                   Create new session
     │                                   sessionId = uuid()
     │                                   Store in Map:
     │                                   {
     │                                     id: sessionId,
     │                                     userId: "user123",
     │                                     beatId: "abc123",
     │                                     lyrics: [],
     │                                     status: "active"
     │                                   }
     │                                        ↓
     ←────────── Response ──────────── {
                                         sessionId,
                                         wsUrl: "ws://localhost:3000/ws/freestyle/abc123"
                                       }

WebSocket connection opens
     ↓
ws://localhost:3000/ws/freestyle/abc123
     │                                        ↓
     │                                   WebSocket upgrade event
     │                                   FreestyleWebSocketHandler
     │                                   validates session exists
     │                                        ↓
     ←────────── Message ───────────── {
                                         type: "connected",
                                         sessionId: "abc123"
                                       }

Connection established ✅
Beat starts playing (looped)
Microphone starts recording
```

**What happens:**
1. User clicks "Record"
2. Frontend sends beatId to backend
3. Backend creates a session object with unique ID
4. Frontend receives session ID and WebSocket URL
5. Frontend opens WebSocket connection
6. Backend validates session and confirms connection
7. Beat starts playing automatically
8. Microphone starts capturing audio

---

### Phase 3: Real-Time Recording & Transcription

```
Frontend (Browser)                       Backend                        OpenAI
──────────────────                       ───────                        ──────

Microphone captures audio
     ↓
MediaRecorder chunks audio
(every 1 second)
     ↓
WebSocket.send(audioChunk)
     │                                        ↓
     │                                   Receive audio chunk (Buffer)
     │                                        ↓
     │                                   Buffer audio for 2 seconds
     │                                   (Whisper optimal window)
     │                                        ↓
     │                                   Convert to WAV format
     │                                        ↓
     │                                   POST to Whisper API ──────→ Transcribe
     │                                                                    ↓
     │                                   ←──────── Text ─────────────  "I'm spittin'"
     │                                        ↓
     │                                   Add to session.lyrics[]
     │                                   {
     │                                     text: "I'm spittin'",
     │                                     timestamp: 1234567890,
     │                                     confidence: 0.95
     │                                   }
     │                                        ↓
     │                                   Extract last word: "spittin'"
     │                                        ↓
     │                                   Call RhymeService
     │                                   getRhymeSuggestions("spittin'")
     │                                        ↓
     ←────────── Message ──────────── {
     │                                  type: "transcription",
     │                                  data: {
     │                                    text: "I'm spittin'",
     │                                    timestamp: 1234567890,
     │                                    confidence: 0.95
     │                                  }
     │                                }
     ↓
Display in LiveLyricsWidget ✅

     ←────────── Message ──────────── {
                                       type: "rhyme_suggestions",
                                       targetWord: "spittin'",
                                       suggestions: [
                                         {
                                           word: "hittin'",
                                           type: "perfect",
                                           syllables: 2,
                                           score: 1.0
                                         },
                                         {
                                           word: "quittin'",
                                           type: "perfect",
                                           syllables: 2,
                                           score: 1.0
                                         },
                                         ...
                                       ]
                                     }
     ↓
Display in AIRhymeSuggestions ✅
```

**What happens:**
1. Your microphone captures audio continuously
2. Browser's MediaRecorder chunks audio every 1 second
3. Each chunk is sent via WebSocket to backend
4. Backend buffers 2 seconds of audio (optimal for Whisper)
5. Backend converts audio to WAV format
6. Backend sends to OpenAI Whisper API for transcription
7. Whisper returns the text: "I'm spittin'"
8. Backend extracts the last word: "spittin'"
9. Backend calls RhymeService to find rhyming words
10. Backend sends both transcription AND rhyme suggestions to frontend
11. Frontend displays lyrics in the LiveLyricsWidget
12. Frontend displays rhymes in the AIRhymeSuggestions widget

This happens **continuously** while you're recording! Every 1-2 seconds, new lyrics and rhymes appear.

---

### Phase 4: Stop Recording

```
Frontend                                 Backend
────────                                 ───────

Click "Stop" button
     ↓
WebSocket.close()
     │                                        ↓
     │                                   WebSocket disconnects
     │                                   Session still in memory
     ↓
POST /api/v1/freestyle/session/:id/end
     │                                        ↓
     │                                   Mark session.status = "ended"
     │                                   session.endTime = now()
     │                                        ↓
     │                                   Organize lyrics with AI
     │                                   (split into lines, clean up)
     │                                        ↓
     │                                   Calculate statistics:
     │                                   - Total lines
     │                                   - Total words
     │                                   - Avg confidence
     │                                   - Duration
     │                                        ↓
     ←────────── Response ──────────── {
                                         sessionId,
                                         duration: 180000, // 3 min
                                         lyrics: {
                                           raw: [...],
                                           organized: [
                                             "I'm spittin' fire on this beat",
                                             "Can't nobody compete",
                                             "Rising to the top elite"
                                           ]
                                         },
                                         statistics: {
                                           totalLines: 3,
                                           totalWords: 15,
                                           avgConfidence: 0.92
                                         }
                                       }

Display session summary ✅
Enable Copy/Save buttons ✅
```

**What happens:**
1. User clicks "Stop"
2. WebSocket connection closes
3. Backend marks session as ended
4. Backend organizes all collected lyrics
5. Backend calculates statistics
6. Frontend receives summary
7. User can now copy or save lyrics

---

## 🏗️ Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         BROWSER                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  http://localhost:3003/freestyle                       │  │
│  │                                                         │  │
│  │  ┌──────────────┐  ┌──────────────┐                   │  │
│  │  │ Beat Player  │  │ Live Lyrics  │                   │  │
│  │  │              │  │              │                   │  │
│  │  │ [▶ Play]     │  │ "I'm spittin"│                   │  │
│  │  │ ━━●━━━━━━━   │  │ "fire on..."  │                   │  │
│  │  └──────────────┘  └──────────────┘                   │  │
│  │                                                         │  │
│  │  ┌──────────────┐  ┌──────────────┐                   │  │
│  │  │ Mic Recorder │  │ AI Rhymes    │                   │  │
│  │  │              │  │              │                   │  │
│  │  │ [🔴 Record]  │  │ • hittin'    │                   │  │
│  │  │ ▁▃▅▇█▅▃▁     │  │ • quittin'   │                   │  │
│  │  └──────────────┘  └──────────────┘                   │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ HTTP POST (beat upload)
                        │ HTTP POST (start session)
                        │ WebSocket (audio stream)
                        │ HTTP POST (end session)
                        │
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                   AI DAWG BACKEND (Port 3000)                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Express REST API                                       │  │
│  │                                                        │  │
│  │ POST /api/v1/freestyle/beat/upload                    │  │
│  │ POST /api/v1/freestyle/session/start                  │  │
│  │ POST /api/v1/freestyle/session/:id/end                │  │
│  │ GET  /api/v1/freestyle/session/:id/lyrics             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ WebSocket Handler                                      │  │
│  │                                                        │  │
│  │ WS /ws/freestyle/:sessionId                           │  │
│  │                                                        │  │
│  │ • Receives audio chunks                               │  │
│  │ • Buffers 2 seconds                                   │  │
│  │ • Sends to Whisper API                                │  │
│  │ • Returns transcription + rhymes                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Services                                               │  │
│  │                                                        │  │
│  │ • FreestyleController     (session management)        │  │
│  │ • TranscriptionService    (Whisper integration)       │  │
│  │ • RhymeService            (phonetic matching)         │  │
│  │ • Storage Service         (file handling)             │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ HTTPS POST
                        │
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                    OpenAI Whisper API                        │
│                                                              │
│  POST https://api.openai.com/v1/audio/transcriptions       │
│                                                              │
│  Input:  Audio file (WAV)                                   │
│  Output: { text: "I'm spittin' fire" }                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Technologies

### Frontend
- **React** - UI components
- **Next.js** - Framework (port 3003)
- **WebSocket API** - Real-time communication
- **MediaRecorder API** - Microphone capture
- **Web Audio API** - Waveform visualization
- **Tailwind CSS** - Styling

### Backend
- **Express.js** - REST API server
- **WebSocket (ws)** - Real-time protocol
- **Multer** - File upload handling
- **TypeScript** - Type safety
- **Node.js** - Runtime (port 3000)

### AI Services
- **OpenAI Whisper** - Speech-to-text transcription
- **Custom RhymeService** - Phonetic rhyme matching
- **GPT-4** (optional) - Lyrics organization

---

## 🎯 Data Flow Example

Let's trace a single word through the system:

### You say: "fire" 🎤

```
1. Microphone → captures audio wave
                  ↓
2. MediaRecorder → converts to WebM format
                  ↓
3. WebSocket → sends 1-second chunk to backend
                  ↓
4. Backend → buffers 2 seconds of audio
                  ↓
5. Backend → converts to WAV (16kHz, mono)
                  ↓
6. Backend → POST to OpenAI Whisper API
                  ↓
7. Whisper → returns: { text: "fire", confidence: 0.95 }
                  ↓
8. Backend → saves to session: { text: "fire", timestamp: 1234 }
                  ↓
9. Backend → calls RhymeService.getRhymeSuggestions("fire")
                  ↓
10. RhymeService → analyzes phonetics:
                   "fire" → /faɪər/
                   Finds rhymes: "higher", "buyer", "wire"
                  ↓
11. Backend → sends TWO WebSocket messages:

     Message 1: {
       type: "transcription",
       data: { text: "fire", timestamp: 1234, confidence: 0.95 }
     }

     Message 2: {
       type: "rhyme_suggestions",
       targetWord: "fire",
       suggestions: [
         { word: "higher", type: "perfect", syllables: 2, score: 1.0 },
         { word: "wire", type: "perfect", syllables: 1, score: 0.9 }
       ]
     }
                  ↓
12. Frontend → receives both messages
                  ↓
13. LiveLyricsWidget → displays "fire"
                  ↓
14. AIRhymeSuggestions → displays "higher, wire"
                  ↓
15. You see both on screen within ~1-2 seconds! ⚡
```

---

## ⚙️ Configuration Files

### Backend (.env)
```bash
PORT=3000
DATABASE_URL=postgresql://benkennon@localhost:5432/jarvis
OPENAI_API_KEY=sk-...  # Required for Whisper
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_AI_DAWG_URL=http://localhost:3000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:3000
```

---

## 🚀 Performance

### Latency Breakdown
- **Audio capture**: ~0ms (continuous)
- **WebSocket send**: ~10ms
- **Backend buffering**: 2000ms (intentional)
- **Whisper API**: ~500-1000ms
- **Rhyme calculation**: ~5ms
- **WebSocket receive**: ~10ms
- **UI render**: ~10ms

**Total time from speaking to seeing text**: ~2.5-3 seconds

This is **real-time** for music production! 🎵

---

## 💡 Smart Features

### Intelligent Buffering
The system buffers 2 seconds of audio before transcription because:
- Whisper works best with 2-3 second chunks
- Prevents partial word transcription
- Reduces API costs (fewer calls)

### Context-Aware Rhymes
RhymeService considers:
- **Phonetic similarity** (how words sound)
- **Syllable count** (rhythm matching)
- **Recent word history** (avoids repetition)
- **Perfect vs Near rhymes** (varying creativity)

### Flow Analysis
Calculates in real-time:
- **Words per line** (density)
- **Syllables per line** (complexity)
- **Tempo** (fast, moderate, slow)

---

## 🎉 Why It's Cool

1. **Real-time AI** - Your words appear as you rap
2. **Smart suggestions** - AI helps you find rhymes instantly
3. **Professional workflow** - Like a $10,000 studio setup
4. **Cost effective** - Only $0.05 per 3-minute session
5. **Browser-based** - No downloads or installs

---

## 📊 Example Session

```
Time: 0:00 - User uploads beat.mp3
Time: 0:05 - User clicks Record
Time: 0:06 - Beat starts playing
Time: 0:07 - User starts rapping
Time: 0:09 - First lyrics appear: "I'm back in the game"
Time: 0:09 - Rhymes appear: "fame, name, claim"
Time: 0:12 - More lyrics: "Got nobody to blame"
Time: 0:12 - New rhymes: "shame, frame, tame"
Time: 3:00 - User clicks Stop
Time: 3:01 - Session summary shows:
           - 15 lines
           - 82 words
           - 94% confidence
           - Copy/Save buttons enabled
```

---

That's how it works! Any specific part you want to dive deeper into? 🎤
