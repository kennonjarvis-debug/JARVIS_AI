# Demo Video Script Generator - Quick Reference

## Commands

```bash
cd ~/Jarvis/tools/demo-video-generator

# Generate all 6 scripts
npx ts-node script-generator.ts

# Generate one script
npx ts-node script-generator.ts "First Song"

# List available videos
npx ts-node script-generator.ts --list

# View example script
cat scripts/ai-dawg-your-first-song.json | jq '.'
```

## Available Videos (6 Total)

### Jarvis (3 videos)
1. **Getting Started** - 3 min - Setup and basics
2. **Power User Features** - 4 min - Advanced capabilities
3. **Autonomous Mode** - 3 min - Self-management

### AI DAWG (3 videos)
4. **Your First Song** - 3 min - Create first track
5. **Voice Cloning** - 4 min - Clone and use voice
6. **Studio Workflow** - 4 min - Professional production

## File Paths

```
Script Generator: /Users/benkennon/Jarvis/tools/demo-video-generator/script-generator.ts
Example Scripts:  /Users/benkennon/Jarvis/tools/demo-video-generator/scripts/
Output Location:  /Users/benkennon/Jarvis/tools/demo-video-generator/scripts/*.json
```

## Script Structure

```typescript
{
  title: string;
  duration: number; // seconds
  product: 'jarvis' | 'ai-dawg';
  narration: [{text, timing}];     // Voice-over
  actions: [{type, selector, timing}]; // User interactions
  callouts: [{text, position, timing}] // Visual annotations
}
```

## Usage Examples

### Extract Narration
```bash
cat scripts/ai-dawg-your-first-song.json | jq '.narration'
```

### Count Actions
```bash
cat scripts/getting-started-with-jarvis.json | jq '.actions | length'
```

### Export for Voice Recording
```bash
cat scripts/ai-dawg-your-first-song.json | jq '.narration[] | "\(.timing): \(.text)"'
```

### Get Script Stats
```bash
cat scripts/getting-started-with-jarvis.json | jq '{
  title,
  duration,
  narration: (.narration | length),
  actions: (.actions | length),
  callouts: (.callouts | length)
}'
```

## Cost

- **Per Script**: ~$0.02
- **All 6 Scripts**: ~$0.12
- **API**: Claude Sonnet 4 via Anthropic

## Requirements

- ANTHROPIC_API_KEY in `~/Jarvis/.env`
- Node.js 18+
- TypeScript 5+

## Example Output

**AI DAWG: Your First Song**
- 13 narration segments
- 22 user actions
- 15 visual callouts
- 180 seconds total

**Getting Started with Jarvis**
- 13 narration segments
- 33 user actions
- 17 visual callouts
- 180 seconds total

## Quick Start Workflow

1. Generate scripts: `npx ts-node script-generator.ts`
2. Review JSON output in `/scripts/` folder
3. Use narration for voice-over generation
4. Use actions for browser automation
5. Use callouts for video annotations

## Documentation

- **Full Guide**: `SCRIPT_GENERATOR_GUIDE.md`
- **Deployment**: `DEPLOYMENT_SUMMARY.md`
- **This File**: Quick reference only

## Support

Issues? Check:
1. ANTHROPIC_API_KEY is set
2. API credits available
3. Example scripts for format reference
