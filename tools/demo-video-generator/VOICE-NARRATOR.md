# DAWG AI Voice Narrator

Voice narration system using ElevenLabs API to generate natural-sounding AI voice for demo videos.

## Features

- Text-to-speech narration using ElevenLabs API
- Multiple voice options (21 available voices)
- Automatic timing and segmentation
- MP3 audio output (44.1kHz stereo)
- Timing metadata for video synchronization
- DAWG AI persona: Confident, enthusiastic tech explainer

## Installation

The ElevenLabs SDK has been installed:

```bash
cd ~/Jarvis
npm install elevenlabs
```

**Note:** The package shows a deprecation warning suggesting to use `@elevenlabs/elevenlabs-js` instead, but the current version works perfectly.

## Files

- **voice-narrator.ts** - Main VoiceNarrator class implementation
- **test-narrator.ts** - Test script demonstrating usage
- **VOICE-NARRATOR.md** - This documentation

## Usage

### Basic Usage

```typescript
import { createNarrator } from "./voice-narrator";

// Create narrator (uses ELEVENLABS_API_KEY from environment)
const narrator = createNarrator();

// Generate test audio
const audioPath = await narrator.generateTestAudio(
  "Hey, I'm DAWG AI!",
  "intro.mp3"
);

// Play the audio (macOS)
// afplay /tmp/dawg-ai-narration/intro.mp3
```

### Generate Full Narration Script

```typescript
import { createNarrator } from "./voice-narrator";

const narrator = createNarrator();

const script = {
  title: "My Demo Video",
  segments: [
    {
      text: "Hey, I'm DAWG AI!",
      startTime: 0,  // seconds
    },
    {
      text: "Let me show you something awesome!",
      startTime: 2.5,
    },
  ],
};

const result = await narrator.generateNarration(script);

// Result contains:
// - audioPath: Directory with all audio files
// - segments: Array of audio segments with timing
console.log(result.audioPath);  // "/tmp/dawg-ai-narration"
console.log(result.segments);   // Audio files with timing metadata
```

### List Available Voices

```typescript
const narrator = createNarrator();
const voices = await narrator.listVoices();

voices.forEach(voice => {
  console.log(`${voice.name}: ${voice.voice_id}`);
});
```

### Change Voice

```typescript
// Use a different voice
const narrator = createNarrator("N2lVS1w4EtoT3dr4eOWO"); // Callum's voice

// Or change it later
narrator.setVoice("IKne3meq5aSn9XLyUdCD"); // Charlie's voice
```

## Available Voices

**Recommended for DAWG AI:**

1. **Charlie** (IKne3meq5aSn9XLyUdCD) - **DEFAULT**
   - Young Australian male
   - Confident and energetic
   - Perfect for tech explanations

2. **Callum** (N2lVS1w4EtoT3dr4eOWO)
   - Gravelly with unsettling edge
   - Alternative dramatic option

**All Available Voices (21 total):**
- Clyde, Roger, Sarah, Laura, Charlie, George, Callum, River
- Harry, Liam, Alice, Matilda, Will, Jessica, Eric, Chris
- Brian, Daniel, Lily, Bill, and more

## Running Tests

```bash
cd ~/Jarvis/tools/demo-video-generator
npx tsx test-narrator.ts
```

This will:
1. List all available voices
2. Generate test audio: "Hey, I'm DAWG AI, and I'm about to show you something awesome!"
3. Generate a full demo script with 5 segments
4. Save all files to `/tmp/dawg-ai-narration/`

## Output Format

### Audio Files
- **Format:** MP3
- **Sample Rate:** 44.1kHz
- **Channels:** Stereo
- **Location:** `/tmp/dawg-ai-narration/` (configurable)

### Timing Metadata
A JSON file is generated with all timing information:

```json
{
  "title": "DAWG AI Demo",
  "totalSegments": 2,
  "segments": [
    {
      "file": "segment_000_abc123.mp3",
      "startTime": 0,
      "duration": 3.6,
      "text": "Hey, I'm DAWG AI!"
    }
  ]
}
```

## Configuration

### Environment Variables

Set in `~/Jarvis/.env`:

```bash
ELEVENLABS_API_KEY=sk_9cb83b392c74798cc17d46ac27b676e1a04aacd4c33f6bac
```

### Voice Settings

The narrator uses optimized voice settings for DAWG AI's personality:

- **Stability:** 0.5 - Balanced for natural variation
- **Similarity Boost:** 0.75 - High voice character consistency
- **Style:** 0.5 - Moderate enthusiasm
- **Speaker Boost:** Enabled - Enhanced clarity

### Custom Configuration

```typescript
import { VoiceNarrator } from "./voice-narrator";

const narrator = new VoiceNarrator({
  apiKey: "your-api-key",
  voiceId: "IKne3meq5aSn9XLyUdCD",  // Charlie
  outputDir: "/custom/output/path",
  modelId: "eleven_turbo_v2_5",  // Fast & high quality
});
```

## Generated Files

After running tests, you'll find:

```
/tmp/dawg-ai-narration/
├── dawg-ai-intro.mp3           # Test audio (50KB)
├── segment_000_d6ede86b.mp3    # Segment 1 (58KB)
├── segment_001_9b84cfee.mp3    # Segment 2 (67KB)
├── segment_002_fad5cfbc.mp3    # Segment 3 (62KB)
├── segment_003_9efd3beb.mp3    # Segment 4 (55KB)
├── segment_004_f19b3500.mp3    # Segment 5 (25KB)
└── timing-metadata.json         # Timing info (1KB)
```

## Playing Audio Files

**macOS:**
```bash
afplay /tmp/dawg-ai-narration/dawg-ai-intro.mp3
```

**Linux:**
```bash
mpg123 /tmp/dawg-ai-narration/dawg-ai-intro.mp3
```

**Windows:**
```powershell
Start-Process /tmp/dawg-ai-narration/dawg-ai-intro.mp3
```

## API Reference

### VoiceNarrator Class

```typescript
class VoiceNarrator {
  constructor(config: VoiceNarratorConfig);

  // Generate narration for full script
  async generateNarration(script: DemoScript): Promise<{
    audioPath: string;
    segments: AudioSegment[];
  }>;

  // Generate single test audio
  async generateTestAudio(text: string, filename?: string): Promise<string>;

  // List available voices
  async listVoices(): Promise<Voice[]>;

  // Voice management
  setVoice(voiceId: string): void;
  getVoice(): string;

  // Output directory management
  setOutputDir(dir: string): void;
  getOutputDir(): string;
}
```

### Helper Function

```typescript
// Create narrator from environment variables
createNarrator(voiceId?: string, outputDir?: string): VoiceNarrator;
```

## Next Steps

1. **Video Integration:** Use the timing metadata to sync audio with video clips
2. **Custom Voices:** Upload your own voice samples to ElevenLabs
3. **Voice Cloning:** Clone DAWG AI's actual voice for authenticity
4. **Multi-language:** Extend to support multiple languages
5. **Emotion Control:** Add emotion parameters for different moods

## Troubleshooting

**404 Error - Voice not found:**
- Make sure you're using a valid voice ID from `listVoices()`
- Default voice is Charlie: `IKne3meq5aSn9XLyUdCD`

**API Key Error:**
- Verify `ELEVENLABS_API_KEY` is set in `~/Jarvis/.env`
- Check API key is valid at https://elevenlabs.io/

**Permission Errors:**
- Ensure `/tmp/dawg-ai-narration/` is writable
- Or set a custom output directory

## Cost Information

ElevenLabs pricing (as of 2024):
- Free tier: 10,000 characters/month
- Starter: $5/month - 30,000 characters
- Creator: $22/month - 100,000 characters
- Pro: $99/month - 500,000 characters

Each demo script (~200 words) uses approximately 1,000 characters.

## License

Part of the Jarvis/DAWG AI system.
