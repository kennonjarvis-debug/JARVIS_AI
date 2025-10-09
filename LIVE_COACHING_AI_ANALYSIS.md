# Live Coaching AI - Feature Analysis & Implementation Plan

**Date**: October 8, 2025
**Status**: Gap Analysis Complete

---

## Executive Summary

AI DAWG has substantial backend infrastructure for AI features, but the **real-time live coaching workflow** requested is not yet fully integrated. This document outlines what exists, what's missing, and the implementation plan.

---

## Requested Features Analysis

### 1. Real-Time Audio Monitoring During Recording

#### What Exists ✅
- **Vocal Coach Python Service** (`/src/ai/vocal_coach/vocal_coach.py`)
  - Real-time pitch detection
  - Performance analysis
  - Vocal health monitoring
  - Harmony generation
  - Exercise generation

- **Audio Engine** (`/src/audio-engine/core/AudioEngine.ts`)
  - Web Audio API integration
  - Real-time audio playback
  - Audio routing
  - Plugin hosting

- **Backend API** (`/api/v1/ai/vocal-coach/analyze-pitch`)
  - Pitch analysis endpoint
  - Performance feedback endpoint

#### What's Missing ❌
- **Real-time audio stream from recording to Vocal Coach**
- **WebSocket connection for live audio monitoring**
- **UI widget showing real-time feedback during recording**
- **Integration between AudioEngine and Vocal Coach service**

---

### 2. Live Transcription to Lyrics Widget

#### What Exists ✅
- **OpenAI Realtime API** (in venv packages)
  - Realtime transcription support
  - Audio input turn detection

- **Chatbot Widget** (`/src/ui/chatbot/ChatbotWidget.tsx`)
  - Chat interface exists
  - Can be adapted for lyrics display

#### What's Missing ❌
- **Live audio transcription service** (not integrated)
- **Lyrics widget in DAW timeline view**
- **Real-time text synchronization with audio**
- **Speech-to-text streaming integration**

---

### 3. Voice-to-Instrument Conversion

#### What Exists ✅
- **Voice Cloning** (`/src/ai/vocal_coach/voice_cloner.py`)
  - Tortoise TTS integration
  - CREPE pitch detection
  - Parselmouth for pitch manipulation

- **Topline Generator** (`/src/ai/producer/generators/topline_generator.py`)
  - Melody generation from lyrics
  - Syllable-to-note alignment
  - MIDI output

- **Music Generator AI** (Backend `/api/v1/ai/dawg`)
  - Full music generation from prompts
  - Multi-track arrangement
  - Genre/mood control

#### What's Missing ❌
- **Beatbox-to-drums conversion** (no implementation found)
- **Melody-to-guitar conversion** (no implementation found)
- **Voice-to-instrument ML models** (not trained/deployed)
- **Real-time audio-to-MIDI with instrument synthesis**
- **Conversational AI workflow**: "I'm going to beatbox, turn it into Metro Boomin drums"

---

### 4. AI Proactive Coaching and Warm-ups

#### What Exists ✅
- **Vocal Coach Features**:
  - Performance analysis
  - AI-powered feedback
  - Exercise generation
  - Vocal health monitoring

- **Chatbot System** (`/src/ui/chatbot/ChatbotWidget.tsx`)
  - Conversational interface
  - Intent detection
  - Prompt templates

#### What's Missing ❌
- **Proactive coaching workflow** (AI initiates suggestions)
- **Warm-up routines** (automated exercises)
- **Context-aware suggestions during sessions**
- **Real-time performance coaching** (while recording)
- **Voice command integration**: "turn this melody into a Stratocaster riff like Morgan Wallen"

---

## Python AI Services Status

### Vocal Coach Service (Port 8000)
**Status**: ❌ Not Running (Dashboard logs show health check failures)

```
Location: /Users/benkennon/ai-dawg-v0.1/src/ai/vocal_coach/
Files:
  - vocal_coach.py (Main orchestrator)
  - pitch_analyzer.py
  - performance_analyzer.py
  - harmony_generator.py
  - vocal_health_monitor.py
  - voice_cloner.py
  - server.py (FastAPI server)
```

**Capabilities**:
- ✅ Real-time pitch detection
- ✅ Performance analysis
- ✅ Vocal health monitoring
- ✅ Voice cloning
- ❌ Not started/accessible

### Producer AI Service (Port 8001)
**Status**: ❌ Not Running (Dashboard logs show health check failures)

```
Location: /Users/benkennon/ai-dawg-v0.1/src/ai/producer/
Files:
  - generators/topline_generator.py
  - generators/lyric_generator.py
  - processors/auto_comp.py
  - synthesis/synthesis_pipeline.py
  - server-mvp.py (FastAPI server)
```

**Capabilities**:
- ✅ Lyric generation
- ✅ Topline melody generation
- ✅ Auto-comp (comping takes)
- ✅ Synthesis pipeline
- ❌ Not started/accessible

---

## Implementation Plan

### Phase 1: Start Python AI Services (15 minutes)

**Task**: Get Vocal Coach and Producer AI services running

```bash
# 1. Start Vocal Coach
cd /Users/benkennon/ai-dawg-v0.1/src/ai/vocal_coach
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000

# 2. Start Producer AI
cd /Users/benkennon/ai-dawg-v0.1/src/ai/producer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python server-mvp.py --port 8001
```

**Expected Outcome**:
- Vocal Coach health check passes (port 8000)
- Producer AI health check passes (port 8001)
- Dashboard Backend stops showing health check failures

---

### Phase 2: Real-Time Audio Monitoring (2-3 hours)

**Architecture**:
```
Recording Audio Stream
  ↓ (WebSocket)
AudioEngine.ts
  ↓ (Real-time packets)
Backend WebSocket Handler
  ↓ (HTTP/WS)
Vocal Coach Service (port 8000)
  ↓ (Analysis results)
UI Widget (Real-time feedback)
```

**Files to Create**:

1. **Backend WebSocket Handler** (`/src/backend/services/audio-stream.service.ts`)
   - Accept audio chunks from frontend
   - Forward to Vocal Coach
   - Stream analysis back to frontend

2. **Frontend Audio Capture** (`/src/ui/recording/AudioCapture.tsx`)
   - Capture microphone input during recording
   - Send audio chunks via WebSocket
   - Display real-time feedback

3. **Real-Time Feedback Widget** (`/src/ui/recording/LiveCoachWidget.tsx`)
   - Show pitch accuracy (visual meter)
   - Display AI suggestions
   - Show vocal health warnings

**APIs to Implement**:
- `WS /api/v1/audio-stream` - WebSocket for audio streaming
- `POST /api/v1/vocal-coach/analyze-realtime` - Real-time analysis

---

### Phase 3: Live Transcription to Lyrics (1-2 hours)

**Architecture**:
```
Recording Audio
  ↓ (Streaming)
OpenAI Whisper API (Realtime)
  ↓ (Transcription)
Lyrics Widget (Live updates)
```

**Files to Create**:

1. **Transcription Service** (`/src/backend/services/transcription.service.ts`)
   - Integrate OpenAI Whisper API
   - Stream transcription results
   - Sync with timeline position

2. **Lyrics Widget** (`/src/ui/recording/LyricsWidget.tsx`)
   - Display lyrics as they're transcribed
   - Sync with playback position
   - Allow manual editing
   - Export to project

**APIs to Implement**:
- `WS /api/v1/transcribe-live` - Live transcription WebSocket
- `POST /api/v1/lyrics/save` - Save transcribed lyrics to project

---

### Phase 4: Voice-to-Instrument Conversion (4-6 hours)

**This is the most complex feature requiring ML model integration**

#### 4A. Beatbox-to-Drums

**Architecture**:
```
Beatbox Audio
  ↓ (Analysis)
Onset Detection + Spectral Analysis
  ↓ (Classification)
Drum Sound Classifier (ML Model)
  ↓ (MIDI + Samples)
Drum Track with Samples
```

**Implementation**:
- Use **librosa** for onset detection
- Use **Essentia** or custom CNN for drum sound classification
- Map detected sounds to drum MIDI (kick, snare, hi-hat, etc.)
- Apply "Metro Boomin" style processing (trap drums, hi-hat rolls, 808s)

**Files to Create**:
1. `src/ai/producer/voice-to-drums/beatbox_analyzer.py`
2. `src/ai/producer/voice-to-drums/drum_classifier.py`
3. `src/ai/producer/voice-to-drums/style_processor.py`

#### 4B. Melody-to-Guitar

**Architecture**:
```
Hummed Melody
  ↓ (Pitch Detection)
CREPE/pYIN Pitch Tracker
  ↓ (MIDI Conversion)
Melody MIDI
  ↓ (Style Transfer)
Guitar Patch + Strumming Pattern
  ↓ (Synthesis)
"Stratocaster" Guitar Audio
```

**Implementation**:
- Use **CREPE** for accurate pitch detection
- Convert pitch track to MIDI
- Apply guitar-specific articulations (bends, slides, vibrato)
- Use **Ample Guitar** or **Neural DSP** for guitar synthesis
- Apply artist-specific style (Morgan Wallen = country rock guitar tone)

**Files to Create**:
1. `src/ai/producer/voice-to-instrument/melody_extractor.py`
2. `src/ai/producer/voice-to-instrument/guitar_synthesizer.py`
3. `src/ai/producer/voice-to-instrument/style_templates.py`

---

### Phase 5: Conversational AI Workflow (2-3 hours)

**User says**: "I'm going to sing, turn this melody into a Stratocaster riff like Morgan Wallen"

**AI Workflow**:
1. Parse intent: "melody-to-guitar conversion, country rock style"
2. Enable recording mode
3. Capture audio
4. Extract melody using CREPE
5. Apply guitar synthesis with country rock style
6. Place on new track in DAW
7. Respond: "Done! I've placed a Stratocaster country riff on Track 5"

**Files to Create**:

1. **Conversational AI Handler** (`/src/ai/brain/conversational_coach.ts`)
   - Intent parsing for voice-to-instrument commands
   - Context management (remembers user preferences)
   - Workflow orchestration

2. **Voice Command Integration** (`/src/ui/chatbot/VoiceCommands.tsx`)
   - Voice input capture
   - Real-time command processing
   - Feedback display

**Supported Commands**:
- "I'm going to beatbox, turn it into Metro Boomin drums"
- "I'm going to sing a melody, make it a guitar riff like Morgan Wallen"
- "Warm me up" (starts vocal warm-up routine)
- "Give me feedback on that take"
- "Turn my melody into synth pads"

---

### Phase 6: Proactive AI Coaching (1-2 hours)

**AI Behaviors**:
- Detects when user opens recording session → suggests warm-up
- Detects strain in vocal performance → recommends break
- Detects repetitive recording → suggests alternative approach
- Learns user patterns → proactively optimizes workflow

**Files to Create**:

1. **Proactive Coach Agent** (`/src/ai/brain/proactive_coach.ts`)
   - Session monitoring
   - Pattern detection
   - Suggestion generation

2. **Coaching Notification UI** (`/src/ui/notifications/CoachingSuggestion.tsx`)
   - Non-intrusive suggestions
   - Dismiss/accept actions
   - Feedback loop

---

## Priority Roadmap

### Immediate (Today)
1. ✅ **Start Python AI Services** (Vocal Coach + Producer AI)
   - **Time**: 15-30 minutes
   - **Impact**: Unblocks all AI features

### Short-term (This Week)
2. **Real-Time Audio Monitoring**
   - **Time**: 2-3 hours
   - **Impact**: Core feature for live coaching

3. **Live Transcription to Lyrics**
   - **Time**: 1-2 hours
   - **Impact**: High user value, relatively easy

### Medium-term (Next Week)
4. **Conversational AI Workflow**
   - **Time**: 2-3 hours
   - **Impact**: Enables voice commands

5. **Proactive AI Coaching**
   - **Time**: 1-2 hours
   - **Impact**: Differentiating feature

### Long-term (2+ Weeks)
6. **Voice-to-Instrument Conversion**
   - **Time**: 4-6 hours (+ ML model training)
   - **Impact**: Revolutionary feature, requires ML expertise

---

## Technical Dependencies

### Already Available
- ✅ Web Audio API (browser)
- ✅ WebSocket support (backend + frontend)
- ✅ OpenAI Whisper API (for transcription)
- ✅ CREPE (pitch detection)
- ✅ Tortoise TTS (voice cloning)
- ✅ Audio processing libraries (librosa, numpy, scipy)

### Need to Add
- ⚠️ **Essentia** (for drum sound classification)
- ⚠️ **Guitar synthesis library** (Ample Guitar plugin or Neural DSP)
- ⚠️ **ML models for beatbox classification** (train custom or use pre-trained)
- ⚠️ **Real-time audio streaming infrastructure** (WebRTC or WebSocket audio)

---

## Cost Analysis

### API Costs
- **OpenAI Whisper API**: $0.006/minute transcription
- **OpenAI Realtime API**: $0.06/minute (audio input + output)
- **Estimated monthly cost @ 100 sessions/day**: ~$180/month

### Compute Costs
- **Vocal Coach Service**: CPU-bound, ~$20/month VPS
- **Producer AI Service**: CPU-bound, ~$20/month VPS
- **ML Model Inference** (beatbox/melody-to-instrument): GPU recommended, ~$100/month

**Total Estimated**: ~$320/month for full live coaching AI

---

## Success Metrics

### Phase 1 (Python Services)
- ✅ Vocal Coach health check passing
- ✅ Producer AI health check passing
- ✅ Response time < 100ms

### Phase 2 (Real-Time Monitoring)
- ✅ Real-time pitch feedback (< 50ms latency)
- ✅ Visual pitch indicator updates at 60 FPS
- ✅ User can see pitch accuracy while recording

### Phase 3 (Live Transcription)
- ✅ Transcription appears within 2 seconds
- ✅ 95%+ accuracy for clear vocals
- ✅ Lyrics sync with timeline position

### Phase 4 (Voice-to-Instrument)
- ✅ Beatbox-to-drums conversion works in real-time (< 3 seconds)
- ✅ Melody-to-guitar captures musical intent accurately
- ✅ Generated tracks sound professional

### Phase 5 (Conversational AI)
- ✅ Voice commands recognized 95%+ of the time
- ✅ AI responds within 1-2 seconds
- ✅ Workflow completes end-to-end automatically

### Phase 6 (Proactive Coaching)
- ✅ AI suggests warm-ups before recording
- ✅ AI detects vocal strain and recommends breaks
- ✅ User acceptance rate > 30%

---

## Next Steps

**Immediate action**:
1. Start Vocal Coach service (port 8000)
2. Start Producer AI service (port 8001)
3. Verify health checks pass
4. Test basic API endpoints

**Then proceed to Phase 2**: Real-Time Audio Monitoring

---

**Created**: October 8, 2025, 15:32 MST
**Last Updated**: October 8, 2025, 15:32 MST
