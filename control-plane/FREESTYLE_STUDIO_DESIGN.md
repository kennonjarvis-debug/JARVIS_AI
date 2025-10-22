# AI DAWG Freestyle Studio - Architecture & Implementation Plan

## 🎯 Overview
Build a real-time freestyle recording studio using existing AI DAWG technology, managed by Jarvis Control Plane.

---

## 📊 Existing AI DAWG Components (Research Complete)

### 1. **TranscriptionService** (`/src/backend/services/transcription.service.ts`)
- ✅ Real-time Whisper API integration
- ✅ WebSocket-based audio streaming
- ✅ 2-second buffer duration before transcription
- ✅ 16kHz sample rate (Whisper optimal)
- **Usage**: Live lyrics capture from freestyle rap

### 2. **RhymeService** (`/src/services/rhymeService.ts`)
- ✅ AI-powered rhyme suggestions
- ✅ Phonetic similarity scoring
- ✅ Syllable counting
- ✅ Perfect/near/slant rhyme detection
- **Usage**: Real-time rhyme suggestions as you freestyle

### 3. **AudioStreamService** (`/src/backend/services/audio-stream.service.ts`)
- ✅ WebSocket audio streaming
- ✅ Real-time pitch analysis
- ✅ Performance feedback
- ✅ Vocal Coach AI integration
- **Usage**: Stream microphone + beat playback

### 4. **Lyrics Routes** (`/src/backend/routes/lyrics.routes.ts`)
- ✅ `/api/v1/lyrics/organize` - AI lyrics organization
- ✅ `/api/v1/lyrics` - Save lyrics to project
- ✅ `/api/v1/lyrics/:projectId` - Get project lyrics
- **Usage**: Store and organize freestyle lyrics

### 5. **Audio Routes** (`/src/backend/routes/audio.routes.ts`)
- ✅ `/upload` - MP3/WAV file upload (100MB max)
- ✅ `/:id/waveform` - Waveform visualization
- ✅ `/:id/download` - Presigned download URLs
- **Usage**: Upload beat files for freestyle

### 6. **Music Production Module** (`/src/modules/music/`)
- ✅ Creative music domain
- ✅ Music production workflows
- ✅ AI-powered music generation
- **Usage**: Generate beats or enhance recordings

---

## 🏗️ Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│                    JARVIS CONTROL PLANE                      │
│                    (Port 4000)                               │
│  - Orchestrates AI DAWG requests                            │
│  - Circuit breakers for reliability                         │
│  - Business intelligence tracking                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─── Module Router ───┐
                 │                     │
                 v                     v
┌────────────────────────────┐  ┌──────────────────────────┐
│      AI DAWG BACKEND       │  │    DASHBOARD FRONTEND    │
│   (localhost:3001/AWS)     │  │   (localhost:3003)       │
│                            │  │                          │
│  Endpoints:                │  │  New Page:               │
│  - /api/v1/lyrics/*        │  │  /freestyle-studio       │
│  - /api/v1/audio/*         │  │                          │
│  - /ws/transcription       │  │  Components:             │
│  - /ws/audio-stream        │  │  - Audio Player          │
│                            │  │  - Mic Recorder          │
│  Services:                 │  │  - Lyrics Widget         │
│  - TranscriptionService    │  │  - AI Suggestions        │
│  - RhymeService            │  │  - Waveform Display      │
│  - AudioStreamService      │  │                          │
└────────────────────────────┘  └──────────────────────────┘
```

---

## 🎨 Frontend UI Design

### Page: `/freestyle-studio` (New Dashboard Page)

```
┌─────────────────────────────────────────────────────────────┐
│  🎤 AI DAWG Freestyle Studio                    [Settings]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐  ┌─────────────────────────────┐ │
│  │  🎵 Beat Player      │  │  📝 Live Lyrics Widget      │ │
│  │                      │  │                             │ │
│  │  [Choose File]       │  │  🎤 Recording...            │ │
│  │  beat.mp3            │  │                             │ │
│  │                      │  │  I'm spittin' fire on this  │ │
│  │  [▶️ Play] [⏸️ Pause] │  │  beat                       │ │
│  │                      │  │  Lyrics coming in hot       │ │
│  │  ━━━━●━━━━━ 1:23     │  │  Can't be stopped           │ │
│  │                      │  │                             │ │
│  │  🔊 Volume: ████     │  │  [Clear] [Save Project]     │ │
│  └──────────────────────┘  └─────────────────────────────┘ │
│                                                              │
│  ┌──────────────────────┐  ┌─────────────────────────────┐ │
│  │  🎙️ Mic Recorder     │  │  🤖 AI Suggestions          │ │
│  │                      │  │                             │ │
│  │  [🔴 Record]         │  │  Based on "hot":            │ │
│  │  [⏹️ Stop]           │  │                             │ │
│  │                      │  │  🎯 Perfect Rhymes:         │ │
│  │  ▁▃▅▇█▅▃▁ Waveform  │  │  • got, shot, plot, lot    │ │
│  │                      │  │                             │ │
│  │  Status: Listening   │  │  🎵 Near Rhymes:            │ │
│  │  Detected: "fire"    │  │  • not, dot, fought        │ │
│  │                      │  │                             │ │
│  │  [Download Mix]      │  │  💡 Melody Detected:        │ │
│  └──────────────────────┘  │  4 syllables, upbeat flow   │ │
│                             └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Steps

### Phase 1: Backend Integration (AI DAWG)

**1.1. Create Freestyle Studio Endpoint**
```typescript
// File: ~/ai-dawg-v0.1/src/backend/routes/freestyle.routes.ts

import { Router } from 'express';
import { FreestyleController } from '../controllers/freestyle.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import multer from 'multer';

const router = Router();
const freestyleController = new FreestyleController();

const upload = multer({ storage: multer.memoryStorage() });

// Upload beat file
router.post(
  '/beat/upload',
  authenticate,
  upload.single('beat'),
  asyncHandler(freestyleController.uploadBeat)
);

// Start freestyle session
router.post(
  '/session/start',
  authenticate,
  asyncHandler(freestyleController.startSession)
);

// End session and get mixed audio
router.post(
  '/session/:sessionId/end',
  authenticate,
  asyncHandler(freestyleController.endSession)
);

export default router;
```

**1.2. Create Freestyle Controller**
```typescript
// File: ~/ai-dawg-v0.1/src/backend/controllers/freestyle.controller.ts

import { Request, Response } from 'express';
import { transcriptionService } from '../services/transcription.service';
import { rhymeService } from '../../services/rhymeService';
import { audioMixer } from '../services/audio-mixer';
import { v4 as uuidv4 } from 'uuid';

export class FreestyleController {
  async uploadBeat(req: Request, res: Response) {
    const { file } = req;
    const beatId = uuidv4();

    // Store beat file
    const beatPath = await audioStorage.save(beatId, file.buffer);

    res.json({
      success: true,
      data: {
        beatId,
        beatPath,
        duration: await getAudioDuration(beatPath),
      },
    });
  }

  async startSession(req: Request, res: Response) {
    const { beatId } = req.body;
    const sessionId = uuidv4();

    // Initialize transcription WebSocket
    const wsUrl = `ws://localhost:3001/ws/freestyle/${sessionId}`;

    res.json({
      success: true,
      data: {
        sessionId,
        wsUrl,
        beatId,
      },
    });
  }

  async endSession(req: Request, res: Response) {
    const { sessionId } = req.params;

    // Mix recorded vocals + beat
    const mixedAudio = await audioMixer.mix(sessionId);

    // Get all lyrics
    const lyrics = await transcriptionService.getSessionLyrics(sessionId);

    res.json({
      success: true,
      data: {
        audioUrl: mixedAudio.url,
        lyrics: lyrics.organized,
        rawTranscript: lyrics.raw,
      },
    });
  }
}
```

**1.3. Enhance TranscriptionService for Freestyle**
```typescript
// Add to: ~/ai-dawg-v0.1/src/backend/services/transcription.service.ts

// New method for melody detection
async detectMelodyAndAssignWords(
  audioChunk: Buffer,
  rawTranscript: string
): Promise<{ words: string[]; syllables: number[]; melody: number[] }> {
  // Use pitch detection to find melody
  const pitches = await this.analyzePitch(audioChunk);

  // Syllable count from gibberish
  const syllables = this.countSyllablesFromAudio(audioChunk);

  // Match syllables to closest dictionary words
  const words = await this.matchSyllablesToWords(syllables, rawTranscript);

  return { words, syllables, melody: pitches };
}

// Handle gibberish → real words
private async matchSyllablesToWords(
  syllables: number,
  context: string
): Promise<string[]> {
  // Call AI to suggest words based on:
  // 1. Syllable count
  // 2. Context from previous lines
  // 3. Rhyme scheme

  const suggestions = await this.aiClient.complete({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a hip-hop lyricist. Given syllable counts and context, suggest appropriate words.',
      },
      {
        role: 'user',
        content: `Context: "${context}"\nSyllables needed: ${syllables}\nSuggest words:`,
      },
    ],
  });

  return suggestions.choices[0].message.content.split(',');
}
```

---

### Phase 2: Frontend Development (Dashboard)

**2.1. Create Freestyle Studio Page**
```typescript
// File: /Users/benkennon/Jarvis/dashboard/frontend/app/freestyle/page.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { FreestyleBeatPlayer } from '../components/FreestyleBeatPlayer';
import { FreestyleMicRecorder } from '../components/FreestyleMicRecorder';
import { LiveLyricsWidget } from '../components/LiveLyricsWidget';
import { AIRhymeSuggestions } from '../components/AIRhymeSuggestions';

export default function FreestyleStudioPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [beatFile, setBeatFile] = useState<File | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Start session when beat is loaded and recording starts
  const startFreestyle = async () => {
    if (!beatFile) {
      alert('Please upload a beat first!');
      return;
    }

    // Upload beat to AI DAWG
    const formData = new FormData();
    formData.append('beat', beatFile);

    const beatRes = await fetch('http://localhost:3001/api/v1/freestyle/beat/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const { beatId } = await beatRes.json();

    // Start freestyle session
    const sessionRes = await fetch('http://localhost:3001/api/v1/freestyle/session/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ beatId }),
    });
    const { sessionId: newSessionId, wsUrl } = await sessionRes.json();

    setSessionId(newSessionId);
    setIsRecording(true);

    // Connect to WebSocket for live transcription
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'transcription') {
        setLyrics((prev) => [...prev, data.text]);
      }
      if (data.type === 'rhyme_suggestions') {
        // Update rhyme suggestions component
      }
    };

    wsRef.current = ws;
  };

  // Stop recording and get mixed audio
  const stopFreestyle = async () => {
    if (!sessionId) return;

    wsRef.current?.close();
    setIsRecording(false);

    const res = await fetch(`http://localhost:3001/api/v1/freestyle/session/${sessionId}/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const { audioUrl, lyrics: finalLyrics } = await res.json();

    // Download mixed audio
    window.open(audioUrl, '_blank');
  };

  return (
    <div className="freestyle-studio-container">
      <h1>🎤 AI DAWG Freestyle Studio</h1>

      <div className="studio-grid">
        <FreestyleBeatPlayer
          beatFile={beatFile}
          onFileChange={setBeatFile}
        />

        <LiveLyricsWidget
          lyrics={lyrics}
          isRecording={isRecording}
        />

        <FreestyleMicRecorder
          isRecording={isRecording}
          onStart={startFreestyle}
          onStop={stopFreestyle}
          wsRef={wsRef}
        />

        <AIRhymeSuggestions
          currentLyrics={lyrics}
          sessionId={sessionId}
        />
      </div>
    </div>
  );
}
```

---

### Phase 3: Jarvis Integration

**3.1. Add Freestyle Module to Jarvis**
```typescript
// File: /Users/benkennon/Jarvis/src/core/module-router.ts

// Add to executeModule method
case 'freestyle':
  return await this.callAIDawg('/api/v1/freestyle', action, params);
```

**3.2. Health Monitoring**
```typescript
// Add to HealthAggregator
async checkFreestyleStudio(): Promise<ServiceHealth> {
  const transcription = await this.checkService(
    'transcription',
    `${AI_DAWG_URL}/ws/transcription`
  );
  const audio = await this.checkService(
    'audio-stream',
    `${AI_DAWG_URL}/ws/audio-stream`
  );

  return {
    name: 'Freestyle Studio',
    status: transcription.status === 'healthy' && audio.status === 'healthy'
      ? 'healthy'
      : 'degraded',
    components: { transcription, audio },
  };
}
```

---

## 🚀 Deployment Plan

### Local Development
```bash
# Terminal 1: AI DAWG Backend
cd ~/ai-dawg-v0.1
npm run dev

# Terminal 2: Jarvis Control Plane
cd /Users/benkennon/Jarvis
npm run start:control-plane

# Terminal 3: Dashboard Frontend
cd /Users/benkennon/Jarvis/dashboard/frontend
npm run dev
```

### AWS Deployment
- **AI DAWG**: Already deployed on AWS (needs freestyle routes added)
- **Jarvis**: Port 4000, ECS service
- **Dashboard**: Vercel deployment at jarvis-ai-web.vercel.app

---

## 🎯 Key Features Enabled

✅ **Upload MP3/WAV beat** - Use existing audio upload
✅ **Real-time freestyle recording** - WebSocket audio streaming
✅ **Live lyrics transcription** - Whisper API via TranscriptionService
✅ **AI rhyme suggestions** - Existing RhymeService
✅ **Gibberish → words** - New melody detection + syllable matching
✅ **Mixed audio export** - Audio mixer combines beat + vocals
✅ **Lyrics organization** - Existing lyrics routes save to projects
✅ **Jarvis orchestration** - Control plane manages all requests

---

## 📊 Cost Estimate

- **OpenAI Whisper**: ~$0.006/minute of audio
- **GPT-4 for lyrics**: ~$0.03 per request
- **Storage**: S3 ~$0.023/GB
- **Estimated cost per session**: $0.10 - $0.50

---

## 🎵 Next Steps

1. **Add freestyle routes to AI DAWG**
2. **Create frontend page in dashboard**
3. **Integrate with Jarvis module router**
4. **Deploy and test end-to-end**
5. **Add advanced features** (melody visualization, flow analysis, etc.)

---

**Ready to build!** All technology exists in AI DAWG, just needs to be wired together.
