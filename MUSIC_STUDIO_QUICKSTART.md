# Jarvis Music Studio - Quick Start Guide 🎵

Get your AI music creation system running in **5 minutes**!

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 16+ installed
- OpenAI API key

---

## Step 1: Install Dependencies (2 min)

```bash
cd /Users/benkennon/Jarvis

# Install backend dependencies
npm install

# Install dashboard dependencies
cd dashboard/frontend
npm install
cd ../..
```

---

## Step 2: Configure Environment (1 min)

Create `.env` file in the root directory:

```bash
# OpenAI (Required)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Database
DATABASE_URL=postgresql://localhost:5432/jarvis_music

# Authentication
AUTH_TOKEN=test-token

# Node Environment
NODE_ENV=development

# Music Generation (Optional - use local mode for now)
MUSIC_GENERATION_PROVIDER=local
MUSIC_GENERATION_OUTPUT_DIR=/tmp/jarvis-music-output

# Vocal Isolation
VOCAL_ISOLATION_OUTPUT_DIR=/tmp/jarvis-vocals
VOCAL_ISOLATION_TEMP_DIR=/tmp/jarvis-temp
```

Create `dashboard/frontend/.env.local`:

```bash
NEXT_PUBLIC_JARVIS_TOKEN=test-token
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Step 3: Set Up Database (1 min)

```bash
# Create database
createdb jarvis_music

# Run schema
psql jarvis_music < src/db/schema/music-library.sql

# Verify
psql jarvis_music -c "SELECT COUNT(*) FROM songs;"
```

---

## Step 4: Install Audio Tools (1 min - Optional)

For best quality, install these tools:

```bash
# FFmpeg (Required)
brew install ffmpeg

# Demucs (Optional - best vocal isolation)
pip3 install demucs

# Spleeter (Optional - faster vocal isolation)
pip3 install spleeter
```

**Note**: If you skip Demucs/Spleeter, the system will use FFmpeg as fallback (lower quality but functional).

---

## Step 5: Start the System (30 seconds)

### Terminal 1: Start API Gateway
```bash
cd /Users/benkennon/Jarvis
npm run start:gateway
```

Expected output:
```
🚀 Jarvis Control Plane started on port 4000
📡 AI Dawg Backend: http://localhost:8080
🔐 Auth: Development mode
```

### Terminal 2: Start Dashboard
```bash
cd /Users/benkennon/Jarvis/dashboard/frontend
npm run dev
```

Expected output:
```
▲ Next.js 15.x.x
- Local: http://localhost:3003
```

---

## Step 6: Open Music Studio! 🎉

Open your browser and navigate to:

**http://localhost:3003/music**

You should see the Jarvis Music Studio interface with:
- Library tab
- Upload tab
- Folders tab
- Music player sidebar

---

## Quick Test: Upload Your First Song

1. **Prepare a test file**:
   - Use any voice memo from your iPhone (M4A format)
   - Or create a quick test file:
     ```bash
     # Record 5 seconds of audio on your iPhone Voice Memos app
     # Or use any MP3/M4A file you have
     ```

2. **Upload**:
   - Go to the "Upload" tab
   - Drag and drop your file
   - Watch the progress:
     - Uploading... ✅
     - Processing vocals... 🎤
     - Analyzing musical intent... 🧠
     - Composing song... 🎵
     - Complete! ✅

3. **Play**:
   - Go to "Library" tab
   - Click on your new song
   - Music player loads and plays!

---

## Troubleshooting

### API not starting?
```bash
# Check if port 4000 is in use
lsof -i :4000

# Kill process if needed
kill -9 <PID>
```

### Dashboard not starting?
```bash
# Check if port 3003 is in use
lsof -i :3003

# Try different port
npm run dev -- -p 3004
```

### Database errors?
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Start if needed
brew services start postgresql@16

# Verify connection
psql postgres -c "SELECT version();"
```

### OpenAI API errors?
```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Or check .env file
cat .env | grep OPENAI_API_KEY

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Upload fails immediately?
- Check disk space in `/tmp/jarvis-music-output`
- Verify file is under 50MB
- Ensure file format is supported (MP3, M4A, WAV, TXT)

### Processing takes forever?
- First upload takes longer (services initializing)
- Without Demucs installed, processing is slower
- Check server logs for errors: `tail -f logs/jarvis-music.log`

---

## Next Steps

Once you have the system running:

### Explore Features
- ✅ Upload multiple voice memos simultaneously
- ✅ Browse library with grid/list view
- ✅ Search by text, genre, mood
- ✅ Create custom playlists
- ✅ View auto-generated smart folders
- ✅ Play songs with full controls
- ✅ View lyrics

### Optimize Performance
1. **Install Demucs** for better vocal isolation:
   ```bash
   pip3 install demucs
   ```

2. **Add Suno API key** for professional music generation:
   ```env
   SUNO_API_KEY=your-suno-key
   MUSIC_GENERATION_PROVIDER=suno
   ```

3. **Enable GPU acceleration** (if available):
   ```bash
   # Install CUDA/Metal support for faster processing
   pip3 install torch torchvision torchaudio
   ```

### Customize
- Edit `.env` to change upload limits, output directories
- Modify `src/services/music-generator.ts` to adjust composition style
- Update `src/services/music-tagger.ts` to add custom tag dimensions

---

## Usage Examples

### Example 1: Hip-Hop Song from Beatbox
```
1. Record yourself beatboxing a beat on iPhone
2. Upload M4A file to dashboard
3. System isolates your beatbox
4. AI analyzes: "Hip-hop, energetic, 90 BPM"
5. Generates rap lyrics based on vibe
6. Creates full beat matching your rhythm
7. Mixes your beatbox with generated beat
8. Song auto-organized into "Hip-Hop" folder
```

### Example 2: R&B Song from Humming
```
1. Hum a melody into Voice Memos
2. Upload to dashboard
3. AI transcribes melody
4. Analyzes: "R&B, smooth, 75 BPM"
5. Generates soulful lyrics
6. Creates full R&B production
7. Your humming becomes the lead vocal
8. Song appears in "Chill Vibes" folder
```

### Example 3: Song from Text Note
```
1. Write lyrics in Notes app
2. Export as TXT file
3. Upload to dashboard
4. AI analyzes lyrical themes
5. Generates matching music
6. Creates full song from your words
7. Organized by detected mood/genre
```

---

## Command Reference

### Start Services
```bash
# API Gateway
npm run start:gateway

# Dashboard
cd dashboard/frontend && npm run dev

# Both (in separate terminals)
./scripts/start-all.sh  # (if script exists)
```

### Stop Services
```bash
# Ctrl+C in each terminal
# Or kill processes:
pkill -f "node.*gateway"
pkill -f "next.*dev"
```

### Database Commands
```bash
# Create database
createdb jarvis_music

# Drop database (caution!)
dropdb jarvis_music

# Run schema
psql jarvis_music < src/db/schema/music-library.sql

# Connect to database
psql jarvis_music

# View songs
psql jarvis_music -c "SELECT id, title, artist FROM songs LIMIT 10;"

# View folders
psql jarvis_music -c "SELECT name, type, song_count FROM folders;"
```

### Testing
```bash
# Run E2E tests
./tests/e2e/test-music-dashboard.sh

# Test specific endpoint
curl -H "Authorization: Bearer test-token" \
  http://localhost:4000/api/v1/library/songs?userId=demo-user

# Test upload
curl -X POST \
  -H "Authorization: Bearer test-token" \
  -F "file=@test-voice-memo.m4a" \
  -F "userId=demo-user" \
  http://localhost:4000/api/v1/music/upload
```

---

## Development Tips

### Hot Reload
Both services support hot reload:
- **Backend**: Edit `src/**/*.ts` → Auto-reloads
- **Frontend**: Edit `app/**/*.tsx` → Browser refreshes

### Debug Mode
```bash
# Enable debug logging
DEBUG=jarvis:* npm run start:gateway

# View logs in real-time
tail -f logs/jarvis-music.log
```

### API Testing
Use tools like:
- **Thunder Client** (VS Code extension)
- **Postman**
- **cURL** (command line)

Example Thunder Client collection:
```json
{
  "name": "Jarvis Music API",
  "requests": [
    {
      "name": "Get Songs",
      "method": "GET",
      "url": "http://localhost:4000/api/v1/library/songs?userId=demo-user",
      "headers": {
        "Authorization": "Bearer test-token"
      }
    },
    {
      "name": "Upload Song",
      "method": "POST",
      "url": "http://localhost:4000/api/v1/music/upload",
      "headers": {
        "Authorization": "Bearer test-token"
      },
      "body": {
        "type": "formData",
        "formData": {
          "file": "@test-voice-memo.m4a",
          "userId": "demo-user"
        }
      }
    }
  ]
}
```

---

## Production Deployment

For production deployment, see:
- [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md) (coming soon)

Quick checklist:
- [ ] Change `AUTH_TOKEN` to secure token
- [ ] Set `NODE_ENV=production`
- [ ] Use production PostgreSQL instance
- [ ] Configure cloud storage (S3, GCS)
- [ ] Set up monitoring and logging
- [ ] Configure CORS for production domain
- [ ] Add SSL/TLS certificates
- [ ] Set up CI/CD pipeline

---

## Getting Help

### Documentation
- [Complete System Documentation](COMPLETE_MUSIC_CREATION_SYSTEM.md)
- [Phase 1: Input Processing](MUSIC_CREATION_PHASE1_SETUP.md)
- [Phase 2: AI Composition](MUSIC_CREATION_PHASE2_COMPLETE.md)
- [Phase 5: Dashboard](MUSIC_PHASE5_DASHBOARD_COMPLETE.md)

### Common Questions

**Q: Can I use this without OpenAI API?**
A: Not currently. OpenAI is required for transcription and analysis. We're exploring open-source alternatives.

**Q: How much does it cost per song?**
A: ~$0.60-1.10 per song (OpenAI + Suno). Use local mode to reduce costs.

**Q: Can I run this offline?**
A: Partially. Voice processing works offline with Demucs, but AI analysis requires internet.

**Q: How do I backup my songs?**
A: Database backup: `pg_dump jarvis_music > backup.sql`
   Files backup: `cp -r /tmp/jarvis-music-output ~/music-backup/`

**Q: Can I share songs with others?**
A: Not yet. Sharing features planned for Phase 6 (v1.1).

---

## Success! 🎉

You now have a fully functional AI music creation system!

**What you can do:**
- ✅ Upload voice memos from iPhone
- ✅ AI isolates vocals from backing music
- ✅ Automatically compose complete songs
- ✅ Intelligent organization by genre, mood, activity
- ✅ Browse and play your music library
- ✅ Create custom playlists

**Next: Try uploading your first voice memo and watch the magic happen!**

---

**Need help?** Check the troubleshooting section above or review the full documentation.

**Ready for more?** Explore advanced features:
- Custom tagging dimensions
- Smart playlist creation
- Semantic search
- Song recommendations
- Audio effects and mixing

**Happy music creating!** 🎵🎤🎹
