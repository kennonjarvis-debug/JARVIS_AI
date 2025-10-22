# Demo Video Script Generator - Usage Guide

AI-powered demo video script generator using Claude to create detailed, production-ready video scripts for Jarvis and AI DAWG.

## Overview

This tool generates comprehensive demo video scripts with:
- **Narration**: Natural voice-over text with precise timing
- **Actions**: User interactions (clicks, typing, scrolling) with CSS selectors
- **Callouts**: Visual annotations with positioning and timing
- **Full Synchronization**: All elements timed for seamless video production

## Quick Start

### Generate All 6 Scripts

```bash
cd ~/Jarvis/tools/demo-video-generator
npx ts-node script-generator.ts
```

This generates:
1. Jarvis: Getting Started (3 min)
2. Jarvis: Power User Features (4 min)
3. Jarvis: Autonomous Mode (3 min)
4. AI DAWG: Your First Song (3 min)
5. AI DAWG: Voice Cloning (4 min)
6. AI DAWG: Studio Workflow (4 min)

### Generate Single Script

```bash
npx ts-node script-generator.ts "First Song"
```

### List Available Videos

```bash
npx ts-node script-generator.ts --list
```

## Example Output: AI DAWG - Your First Song

### Script Structure

**Duration**: 180 seconds (3 minutes)
**Narration Segments**: 13
**User Actions**: 22
**Visual Callouts**: 15

### Sample Narration (First 3 segments)

```json
{
  "narration": [
    {
      "text": "Welcome to AI DAWG, where creating professional music is as easy as having a conversation. In the next three minutes, we'll create your first complete song from scratch.",
      "timing": 0
    },
    {
      "text": "First, let's start a new project. Click the 'New Song' button to open the AI DAWG studio. This is where all the magic happens.",
      "timing": 8
    },
    {
      "text": "Now, let's tell AI DAWG what kind of song we want. I'll type 'Create a chill hip-hop track about summer vibes and good times with friends.' The AI understands natural language, so just describe your vision.",
      "timing": 18
    }
  ]
}
```

### Sample Actions

```json
{
  "actions": [
    {
      "type": "click",
      "selector": "[data-testid='new-song-button']",
      "timing": 14,
      "description": "Click 'New Song' button"
    },
    {
      "type": "type",
      "selector": "#lyric-prompt-input",
      "text": "Create a chill hip-hop track about summer vibes and good times with friends",
      "timing": 22,
      "description": "Type song description"
    },
    {
      "type": "click",
      "selector": "[data-testid='generate-lyrics-button']",
      "timing": 30,
      "description": "Click 'Generate Lyrics' button"
    }
  ]
}
```

### Sample Callouts

```json
{
  "callouts": [
    {
      "text": "No musical experience needed!",
      "position": { "x": 50, "y": 15 },
      "timing": 5,
      "duration": 4
    },
    {
      "text": "AI understands natural language",
      "position": { "x": 45, "y": 50 },
      "timing": 25,
      "duration": 5
    },
    {
      "text": "Professional lyrics in seconds",
      "position": { "x": 60, "y": 35 },
      "timing": 38,
      "duration": 4
    }
  ]
}
```

## Example Output: Getting Started with Jarvis

### Script Structure

**Duration**: 180 seconds (3 minutes)
**Narration Segments**: 13
**User Actions**: 31
**Visual Callouts**: 17

### Key Moments

| Time | Narration | Action | Callout |
|------|-----------|--------|---------|
| 0:00 | "Meet Jarvis, your AI-powered assistant..." | Wait | "Your AI assistant in 3 minutes" |
| 0:10 | "First, let's create your account..." | Click Get Started | "Secure authentication" |
| 0:25 | "Welcome to your Jarvis dashboard..." | Dashboard tour | "Conversation history" |
| 0:40 | "Let's start with a simple question..." | Type question | "Natural language understanding" |
| 1:08 | "Now let's try voice commands..." | Click microphone | "Voice commands powered by AI" |
| 2:00 | "You can also upload documents..." | Drag PDF | "AI reads documents" |
| 2:28 | "Want to customize Jarvis?..." | Open settings | "Customize to your needs" |

## Script Format

All scripts follow this TypeScript interface:

```typescript
interface DemoScript {
  title: string;
  duration: number; // seconds
  product: 'jarvis' | 'ai-dawg';

  narration: {
    text: string;     // Voice-over text
    timing: number;   // When to start (seconds)
  }[];

  actions: {
    type: 'click' | 'type' | 'wait' | 'scroll' | 'hover';
    selector?: string;  // CSS selector
    text?: string;      // For 'type' actions
    timing: number;     // When to perform
    description: string;
  }[];

  callouts: {
    text: string;       // Callout text
    position: {         // Position (0-100%)
      x: number;
      y: number;
    };
    timing: number;     // When to show
    duration: number;   // How long to display
  }[];
}
```

## How to Use Generated Scripts

### 1. For Voice-Over Recording

Use the narration segments with timing:

```bash
# Extract narration for voice recording
cd ~/Jarvis/tools/demo-video-generator/scripts
cat ai-dawg-your-first-song.json | jq '.narration'
```

**Professional Tip**: Import to your voice recording software (Audacity, Adobe Audition) aligned to timestamps.

### 2. For Automated Browser Recording

Use with Playwright or Puppeteer:

```typescript
import { chromium } from 'playwright';
import script from './scripts/ai-dawg-your-first-song.json';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto('http://localhost:5173');

// Start recording
await page.video();

// Execute actions
for (const action of script.actions) {
  await page.waitForTimeout(action.timing * 1000);

  switch (action.type) {
    case 'click':
      await page.click(action.selector!);
      break;
    case 'type':
      await page.fill(action.selector!, action.text!);
      break;
    case 'scroll':
      await page.evaluate(() => window.scrollBy(0, 300));
      break;
    case 'hover':
      await page.hover(action.selector!);
      break;
  }
}
```

### 3. For Video Editing

Import scripts into your video editor:

1. **Narration Track**: Sync voice-over at specified timings
2. **Screen Recording**: Follow actions for what to show
3. **Callouts/Annotations**: Add text overlays at positions and timings
4. **Transitions**: Use wait actions for smooth transitions

### 4. Export Formats

```bash
# Export as CSV for spreadsheet
node -e "const s = require('./scripts/ai-dawg-your-first-song.json'); console.log(s.narration.map(n => \`\${n.timing},\${n.text}\`).join('\\n'))"

# Export actions only
cat scripts/ai-dawg-your-first-song.json | jq '.actions' > actions.json

# Export narration only
cat scripts/ai-dawg-your-first-song.json | jq '.narration' > narration.json
```

## File Locations

```
~/Jarvis/tools/demo-video-generator/
├── script-generator.ts                      # Main generator
├── scripts/
│   ├── ai-dawg-your-first-song.json        # Example 1
│   ├── getting-started-with-jarvis.json    # Example 2
│   ├── jarvis-power-user-features.json     # Generated
│   ├── jarvis-autonomous-mode.json         # Generated
│   ├── ai-dawg-voice-cloning-magic.json    # Generated
│   └── ai-dawg-studio-workflow.json        # Generated
└── SCRIPT_GENERATOR_GUIDE.md               # This file
```

## Customization

### Add New Video Specs

Edit `script-generator.ts` and add to `VIDEO_SPECS`:

```typescript
{
  title: 'My Custom Demo',
  duration: 300, // 5 minutes
  product: 'jarvis', // or 'ai-dawg'
  description: 'Custom demo showcasing...',
  keyFeatures: [
    'Feature 1',
    'Feature 2',
    'Feature 3'
  ]
}
```

Then run:

```bash
npx ts-node script-generator.ts "My Custom Demo"
```

### Adjust AI Model

In `script-generator.ts`, change the Claude model:

```typescript
model: 'claude-sonnet-4-20250514', // Current
// or
model: 'claude-3-5-sonnet-20241022', // Older version
```

### Modify Prompt Engineering

Edit the `buildPrompt()` method to change how Claude generates scripts.

## Requirements

- Node.js 18+
- TypeScript 5+
- ANTHROPIC_API_KEY in `~/Jarvis/.env`

## Cost Estimation

Per script generation:
- Tokens: ~3,000-4,000
- Cost: ~$0.02 per script
- **Total (6 scripts): ~$0.12**

Very affordable for production-quality scripts!

## Troubleshooting

### "ANTHROPIC_API_KEY not found"

Ensure `~/Jarvis/.env` contains:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### "Credit balance too low"

Add credits at [console.anthropic.com](https://console.anthropic.com).

### Scripts seem incomplete

Increase `max_tokens` in the API call:

```typescript
max_tokens: 4096, // Current
// Change to:
max_tokens: 8192,
```

### Want more detailed actions

Modify the prompt to request more granular steps.

## Advanced Usage

### Programmatic Generation

```typescript
import { DemoScriptGenerator } from './script-generator';

const generator = new DemoScriptGenerator();

const customSpec = {
  title: 'Advanced Features',
  duration: 300,
  product: 'jarvis',
  description: 'Deep dive into advanced capabilities',
  keyFeatures: ['Feature A', 'Feature B', 'Feature C']
};

const script = await generator.generateScript(customSpec);
console.log(JSON.stringify(script, null, 2));
```

### Batch Processing

Generate multiple variations:

```typescript
const variations = [
  { title: 'Quick Start', duration: 120 },
  { title: 'Full Tutorial', duration: 600 },
  { title: 'Advanced Guide', duration: 480 }
];

for (const spec of variations) {
  const script = await generator.generateScript({
    ...baseSpec,
    ...spec
  });
  // Process script...
}
```

## Integration with Video Production

### Recommended Workflow

1. **Generate Scripts**: Use this tool
2. **Review & Edit**: Adjust narration/timing as needed
3. **Record Voice**: Use ElevenLabs with narration text
4. **Automate Browser**: Use Playwright with actions
5. **Edit Video**: Sync everything in editing software
6. **Add Callouts**: Place at specified positions/timings
7. **Export**: Produce final video

### Recommended Tools

- **Voice-Over**: ElevenLabs (AI voice from script)
- **Browser Automation**: Playwright (execute actions)
- **Screen Recording**: OBS Studio or built-in Playwright recording
- **Video Editing**: DaVinci Resolve, Adobe Premiere, Final Cut Pro
- **Callouts**: Camtasia, ScreenFlow, or video editor overlays

## Examples in Action

### View Example Scripts

```bash
# Pretty-print JSON
cat scripts/ai-dawg-your-first-song.json | jq '.'

# Count elements
cat scripts/getting-started-with-jarvis.json | jq '.narration | length'
# Output: 13

# Extract specific timing
cat scripts/ai-dawg-your-first-song.json | jq '.actions[] | select(.timing == 90)'
```

### Analyze Script Coverage

```bash
# Total script duration
cat scripts/ai-dawg-your-first-song.json | jq '.duration'

# All action types used
cat scripts/ai-dawg-your-first-song.json | jq '[.actions[].type] | unique'

# Callouts timeline
cat scripts/ai-dawg-your-first-song.json | jq '.callouts[] | "\(.timing)s: \(.text)"'
```

## Support

For questions:
1. Review this guide
2. Check example scripts in `/scripts/`
3. Examine `script-generator.ts` source code
4. Refer to [Anthropic API docs](https://docs.anthropic.com)

---

**Generated with Claude AI** - Professional demo video scripts in minutes!
