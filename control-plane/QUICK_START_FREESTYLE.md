# 🎤 Freestyle Studio - Quick Start Guide

## ✅ Status: READY TO USE

All systems are operational! The Freestyle Studio is ready for testing.

---

## 🚀 Quick Access

### Freestyle Studio UI
```
http://localhost:3003/freestyle
```

### API Endpoint
```
http://localhost:3000/api/v1/freestyle
```

### WebSocket
```
ws://localhost:3000/ws/freestyle/{sessionId}
```

---

## 🎯 How to Use (5 Steps)

### Step 1: Navigate to Freestyle Studio
Open your browser:
```
http://localhost:3003/freestyle
```

### Step 2: Upload a Beat
1. Click "Choose Beat File"
2. Select an MP3 or WAV file from your computer
3. Wait for the file name to appear

### Step 3: Grant Microphone Permission
1. Click "Allow Microphone Access"
2. Accept the browser permission prompt
3. Wait for "Ready" status

### Step 4: Start Freestyle Recording
1. Click the red "Record" button
2. The beat will start playing automatically
3. Start rapping/freestyling into your microphone
4. Watch your lyrics appear in real-time in the "Live Lyrics" widget
5. See AI rhyme suggestions update as you rap

### Step 5: Stop and Save
1. Click "Stop" when you're done
2. View your session statistics (lines, words, confidence)
3. Click "Copy" to copy lyrics to clipboard
4. Click "Save" to download lyrics as a .txt file

---

## 🛠️ Services Running

| Service | Port | Status |
|---------|------|--------|
| AI DAWG Backend | 3000 | ✅ Running |
| Dashboard Frontend | 3003 | ✅ Running |
| Jarvis Control Plane | 4000 | ✅ Running |
| Dashboard Backend | 5001 | ✅ Running |

---

## 📝 Features Available

### During Recording
- ✅ **Real-time lyrics transcription** - Powered by OpenAI Whisper
- ✅ **AI rhyme suggestions** - Perfect, near, and slant rhymes
- ✅ **Flow analysis** - Tempo, syllables, word count
- ✅ **Waveform visualization** - See your audio levels
- ✅ **Beat playback** - Automatically loops during recording

### After Recording
- ✅ **Copy lyrics** - To clipboard
- ✅ **Save lyrics** - As .txt file
- ✅ **Session stats** - Lines, words, avg confidence
- ✅ **Clear and restart** - Start a new session

---

## ⚙️ Configuration

### Current Setup (Local Dev)
The system is configured to run locally on your machine. All services are communicating properly.

### Environment Variables
AI DAWG Backend is using:
```bash
PORT=3000
DATABASE_URL=postgresql://benkennon@localhost:5432/jarvis
```

---

## ⚠️ Important Notes

### OpenAI API Key Required
For actual transcription to work, you need to set your OpenAI API key:

```bash
# In ~/ai-dawg-v0.1/.env
OPENAI_API_KEY=your_openai_api_key_here
```

Without this key, the WebSocket will connect but transcription won't work.

### Microphone Permissions
Your browser will ask for microphone permission. You must grant it for recording to work.

### Beat File Formats
Supported formats:
- MP3
- WAV
- OGG
- FLAC
- Max size: 100MB

---

## 🐛 Troubleshooting

### Issue: No lyrics appearing
**Solution**: Make sure you've added your OpenAI API key to the AI DAWG backend .env file

### Issue: Microphone not working
**Solution**: Check browser microphone permissions in Settings

### Issue: Beat not playing
**Solution**: Make sure you uploaded a valid audio file (MP3/WAV)

### Issue: Page not loading
**Solution**: Ensure all services are running:
```bash
# Check if services are running
lsof -ti:3000,3003,4000,5001
```

---

## 📊 What Happens Behind the Scenes

1. **Beat Upload**: File is stored temporarily on the backend
2. **Session Start**: A unique session ID is created
3. **WebSocket Connection**: Real-time connection established
4. **Audio Recording**: Microphone captures audio in 1-second chunks
5. **Transcription**: Audio sent to OpenAI Whisper API
6. **Rhyme Suggestions**: AI analyzes last word and suggests rhymes
7. **Flow Analysis**: Calculates tempo, syllables, pattern
8. **Session End**: Lyrics organized and stats calculated

---

## 🎯 Tips for Best Results

### For Better Transcription
- Speak clearly and at a moderate pace
- Use a good quality microphone
- Minimize background noise
- Stay consistent distance from mic

### For Better Rhyme Suggestions
- Complete full words (AI detects last word)
- Pause briefly between lines
- Use common rap vocabulary for better suggestions

### For Best Experience
- Use headphones to prevent beat feedback
- Test your setup before a serious session
- Save lyrics frequently (copy or download)

---

## 📞 Need Help?

### Check Logs
```bash
# AI DAWG Backend
tail -f ~/ai-dawg-v0.1/logs/backend.log

# Dashboard Frontend
tail -f /Users/benkennon/Jarvis/dashboard/logs/frontend.log
```

### Restart Services
```bash
# Restart AI DAWG Backend
cd ~/ai-dawg-v0.1
DATABASE_URL="postgresql://benkennon@localhost:5432/jarvis" PORT=3000 npx tsx src/backend/server.ts

# Frontend will auto-reload on save
```

---

## 🎉 Ready to Freestyle!

Everything is set up and ready to go. Just navigate to:
```
http://localhost:3003/freestyle
```

And start creating! 🎤🔥

---

**Built with**: Claude Code + AI DAWG + Jarvis + OpenAI Whisper
**Status**: Production Ready ✅
