# 🎵 Music Creation System - Phase 1 Setup Guide

## Overview

Phase 1 implements the complete **Input Processing Infrastructure** for creating music from iPhone voice memos and notes. This includes:

✅ **Vocal Isolation** - Separate vocals from beats using AI (Demucs/Spleeter)
✅ **Voice Transcription** - Convert vocals to text using OpenAI Whisper
✅ **Musical Intent Analysis** - Analyze content to determine genre, mood, tempo, themes
✅ **Upload API** - RESTful endpoints for uploading from iPhone
✅ **Creative Music Domain Agent** - Autonomous processing orchestration

---

## Prerequisites

### 1. System Requirements

- **Node.js** 18+ with npm
- **Python 3.8+** (for vocal isolation)
- **FFmpeg** (for audio processing)

### 2. Required Python Packages

Install vocal isolation tools:

```bash
# Option 1: Demucs (Highest Quality - Recommended)
pip install demucs

# Option 2: Spleeter (Faster)
pip install spleeter

# Option 3: Both
pip install demucs spleeter
```

### 3. Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

### 4. OpenAI API Key

You need an OpenAI API key for:
- Whisper API (voice transcription)
- GPT-4 (musical intent analysis)

Get your key from: https://platform.openai.com/api-keys

---

## Installation

### 1. Clone and Install Dependencies

```bash
cd /Users/benkennon/Jarvis
npm install
```

### 2. Configure Environment

Create `.env` file (or copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
# AI Provider API Keys
OPENAI_API_KEY=sk-...

# Music Creation Settings
VOCAL_ISOLATION_TEMP_DIR=/tmp/jarvis-vocal-isolation
MUSIC_UPLOAD_DIR=/tmp/jarvis-music-uploads
VOCAL_ISOLATION_MODEL=auto
```

### 3. Create Upload Directories

```bash
mkdir -p /tmp/jarvis-music-uploads
mkdir -p /tmp/jarvis-vocal-isolation
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│  iPhone Upload (Voice Memo + Notes)    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  POST /api/v1/music/upload              │
│  (Gateway: Port 4000)                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Creative Music Domain Agent            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Step 1: Vocal Isolation Service        │
│  - Demucs/Spleeter AI separation        │
│  - Isolate vocals from beats            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Step 2: Transcription Service          │
│  - OpenAI Whisper API                   │
│  - Convert vocals to text               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Step 3: Content Analyzer               │
│  - GPT-4 musical intent analysis        │
│  - Extract: genre, mood, tempo, themes  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Result: Musical Intent + Composition   │
│  Brief (ready for Phase 2)              │
└─────────────────────────────────────────┘
```

---

## API Endpoints

### Upload Voice Memo or Note

```bash
POST /api/v1/music/upload
Authorization: Bearer <your-token>
Content-Type: multipart/form-data

# Body:
- file: (audio/text file)
- userId: (optional, default: "anonymous")
- notes: (optional additional context)
- autoCompose: (true/false, default: true)
```

**Example (cURL):**
```bash
curl -X POST http://localhost:4000/api/v1/music/upload \
  -H "Authorization: Bearer test-token" \
  -F "file=@voice-memo.m4a" \
  -F "userId=ben" \
  -F "notes=This is a chill vibe track"
```

**Response:**
```json
{
  "success": true,
  "uploadId": "upload-1234567890-abc123",
  "fileName": "voice-memo.m4a",
  "fileSize": 2048576,
  "type": "voice-memo",
  "status": "processing",
  "message": "Upload received and processing started",
  "statusEndpoint": "/api/v1/music/upload/upload-1234567890-abc123/status"
}
```

### Check Upload Status

```bash
GET /api/v1/music/upload/:uploadId/status
Authorization: Bearer <your-token>
```

**Example:**
```bash
curl http://localhost:4000/api/v1/music/upload/upload-1234567890-abc123/status \
  -H "Authorization: Bearer test-token"
```

**Response:**
```json
{
  "success": true,
  "upload": {
    "id": "upload-1234567890-abc123",
    "fileName": "voice-memo.m4a",
    "type": "voice-memo",
    "status": "analyzed",
    "uploadedAt": "2025-01-15T10:30:00.000Z",
    "musicalIntent": {
      "genre": "hip-hop",
      "mood": "chill",
      "tempo": 85,
      "energy": 5,
      "themes": ["love", "nostalgia"]
    },
    "transcription": "Thinking about you late at night...",
    "songId": null
  }
}
```

### Get All Uploads

```bash
GET /api/v1/music/uploads?userId=ben
Authorization: Bearer <your-token>
```

### Manually Trigger Composition

```bash
POST /api/v1/music/upload/:uploadId/compose
Authorization: Bearer <your-token>
```

---

## Testing

### 1. Start the Server

```bash
npm run dev:gateway
```

Expected output:
```
🚀 Jarvis Control Plane started on port 4000
📡 AI Dawg Backend: http://localhost:3001
🔐 Auth: Development mode
[VocalIsolation] Demucs model available
[VocalIsolation] Initialized with models: demucs, ffmpeg
[CreativeMusicDomain] Initialized successfully
```

### 2. Test with Sample Voice Memo

Create a test voice memo (or use one from your iPhone):

```bash
# Record a quick voice memo with your mic
# Example: "Yo, this is a chill track about late night vibes, feeling nostalgic"

# Upload it
curl -X POST http://localhost:4000/api/v1/music/upload \
  -H "Authorization: Bearer test-token" \
  -F "file=@test-voice-memo.m4a" \
  -F "userId=testuser"
```

### 3. Check Processing Status

```bash
# Use the uploadId from the previous response
curl http://localhost:4000/api/v1/music/upload/upload-XXXXX/status \
  -H "Authorization: Bearer test-token"
```

### 4. Expected Processing Flow

1. **Upload received** → Status: `processing`
2. **Vocal isolation** (10-30 seconds for 1-minute audio)
   - Separates vocals from any backing beats
   - Output: `vocals.wav` + `instrumentals.wav`
3. **Transcription** (5-10 seconds)
   - Whisper API transcribes isolated vocals
   - Output: Text transcription
4. **Musical intent analysis** (3-5 seconds)
   - GPT-4 analyzes content
   - Extracts: genre, mood, tempo, themes, structure
5. **Status: `analyzed`** → Ready for composition (Phase 2)

### 5. Verify Vocal Isolation

Check the temporary directory:

```bash
ls -lh /tmp/jarvis-vocal-isolation/
```

You should see subdirectories with:
- `vocals.wav` - Isolated vocal track
- `no_vocals.wav` or `accompaniment.wav` - Instrumentals

### 6. Test with Text Notes

```bash
curl -X POST http://localhost:4000/api/v1/music/upload \
  -H "Authorization: Bearer test-token" \
  -F "file=@song-idea.txt" \
  -F "userId=testuser"
```

---

## File Structure

```
src/
├── services/
│   ├── vocal-isolation-service.ts    # AI vocal separation
│   ├── transcription-service.ts      # OpenAI Whisper integration
│   └── content-analyzer.ts           # Musical intent analysis
├── autonomous/domains/
│   └── creative-music-domain.ts      # Orchestration agent
├── routes/
│   └── music-upload-routes.ts        # Upload API endpoints
└── core/
    └── gateway.ts                    # Updated with music routes
```

---

## Troubleshooting

### Error: "No vocal isolation models available"

**Solution:**
```bash
pip install demucs
# or
pip install spleeter
```

Verify installation:
```bash
python3 -m demucs --help
```

### Error: "FFmpeg not found"

**Solution:**
```bash
brew install ffmpeg  # macOS
# or
sudo apt-get install ffmpeg  # Linux
```

Verify:
```bash
ffmpeg -version
```

### Error: "OpenAI API key not configured"

**Solution:**
Add to `.env`:
```env
OPENAI_API_KEY=sk-...
```

### Slow Processing

- **Demucs** (highest quality) takes 10-30 seconds per minute of audio
- **Spleeter** (faster) takes 5-15 seconds per minute
- **FFmpeg fallback** (lowest quality) takes 1-3 seconds

To use faster model, set in `.env`:
```env
VOCAL_ISOLATION_MODEL=spleeter
```

### Audio File Too Large

Maximum file size: 50MB

For Whisper API: Maximum 25MB

If files exceed limits:
```bash
# Compress with FFmpeg
ffmpeg -i large-file.m4a -b:a 128k compressed.m4a
```

---

## Cost Estimates

Per voice memo (3-minute average):

| Service | Cost |
|---------|------|
| Whisper Transcription | $0.018 (3 min × $0.006/min) |
| GPT-4 Analysis | ~$0.01-0.02 |
| **Total per upload** | **~$0.03** |

Monthly (100 uploads):
- **$3.00** for processing
- Vocal isolation is free (local processing)

---

## Next Steps (Phase 2)

Phase 1 is now complete! Here's what Phase 2 will add:

✅ **Music Generation APIs**
- Suno AI integration for full song generation
- MusicGen for instrumentals
- Beat matching with original backing track

✅ **End-to-End Composition**
- Generate melody from isolated vocals
- Create beats based on mood/genre
- Mix and master final track

✅ **Quality Enhancement**
- Vocal effects and auto-tune
- Professional mixing
- Mastering pipeline

---

## iPhone Integration (Preview)

Create an iOS Shortcut to quickly upload voice memos:

1. Open **Shortcuts** app on iPhone
2. Create new shortcut: **"Send to Jarvis Music"**
3. Add actions:
   ```
   Get File from Share Sheet
   Set Variable: audioFile
   Get Contents of [audioFile]
   Make HTTP Request:
     URL: https://your-jarvis-url.com/api/v1/music/upload
     Method: POST
     Headers:
       Authorization: Bearer YOUR_TOKEN
     Body: Form
       file: [Contents]
       userId: YOUR_USER_ID
   Show Notification: "Uploaded to Jarvis!"
   ```

Now you can share any voice memo directly to Jarvis from the Voice Memos app!

---

## Support

For issues or questions:
- Check logs: Gateway logs will show detailed processing steps
- Review `/tmp/jarvis-vocal-isolation/` for debug audio files
- Test individual services manually (see Architecture section)

---

## Summary

**Phase 1 is complete!** 🎉

You now have a fully functional system that can:
1. ✅ Accept voice memo uploads from iPhone
2. ✅ Isolate vocals from backing beats using AI
3. ✅ Transcribe vocals with high accuracy
4. ✅ Analyze musical intent (genre, mood, tempo, themes)
5. ✅ Generate composition briefs ready for music generation

**Ready for Phase 2:** Music composition and generation!
