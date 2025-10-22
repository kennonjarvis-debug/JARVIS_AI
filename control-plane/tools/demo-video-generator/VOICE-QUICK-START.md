# Voice Narrator - Quick Start Guide

## Instant Test

```bash
cd ~/Jarvis/tools/demo-video-generator
npx tsx test-narrator.ts
afplay /tmp/dawg-ai-narration/dawg-ai-intro.mp3
```

## Basic Usage (5 lines of code)

```typescript
import { createNarrator } from "./voice-narrator";

const narrator = createNarrator();
const audio = await narrator.generateTestAudio("Hey, I'm DAWG AI!");
console.log(`Audio saved: ${audio}`);
```

## Generate Demo Script

```typescript
import { createNarrator } from "./voice-narrator";

const narrator = createNarrator();

const script = {
  title: "DAWG AI Demo",
  segments: [
    { text: "Hey, I'm DAWG AI!", startTime: 0 },
    { text: "Let me show you something awesome!", startTime: 2.5 },
  ],
};

const result = await narrator.generateNarration(script);
// Returns: { audioPath: "/tmp/dawg-ai-narration", segments: [...] }
```

## Voice Selection

```typescript
// List all voices
const voices = await narrator.listVoices();

// Use specific voice
const narrator = createNarrator("IKne3meq5aSn9XLyUdCD"); // Charlie
```

## Current Voice

**Charlie** (IKne3meq5aSn9XLyUdCD)
- Young Australian male
- Confident and energetic
- Perfect for DAWG AI persona

## Output

All files saved to: `/tmp/dawg-ai-narration/`
- Audio files: `.mp3` format
- Metadata: `timing-metadata.json`

## Play Audio

```bash
afplay /tmp/dawg-ai-narration/dawg-ai-intro.mp3
```

## Full Documentation

See: `VOICE-NARRATOR.md`
