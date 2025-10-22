# Demo Video Compositor

Professional video composition system using ffmpeg to create polished demo videos from screen recordings and narration audio.

## Overview

This tool combines screen recordings (from Playwright) with AI-generated narration (from ElevenLabs) to create professional demo videos with intro/outro cards, background music, and professional effects.

## Features

- **Multi-format Export**: Exports to both MP4 (H.264) and WebM (VP9) formats
- **Professional Cards**: Customizable intro and outro title cards
- **Audio Mixing**: Combines narration with optional background music
- **Fade Effects**: Smooth fade in/out transitions
- **High Quality**: Full HD 1920x1080 at 30fps
- **Flexible Configuration**: Customizable bitrates, resolution, and effects

## Prerequisites

- Node.js 18+ and npm
- ffmpeg (version 8.0+)

### Installing ffmpeg

```bash
brew install ffmpeg
```

Verify installation:
```bash
ffmpeg -version
```

## Installation

```bash
cd ~/Jarvis/tools/demo-video-generator
npm install
```

## Usage

### Basic Example

```typescript
import VideoCompositor from './video-compositor';

const compositor = new VideoCompositor({
  outputDir: './output',
  resolution: '1920x1080',
  frameRate: 30,
  videoBitrate: '5000k',
  audioBitrate: '128k',
});

const script = {
  title: 'My Product Demo',
  appName: 'MyApp',
  scenes: [
    {
      narration: 'Welcome to the demo',
      startTime: 0,
      duration: 5,
    },
  ],
  totalDuration: 5,
};

const result = await compositor.composeVideo(
  'path/to/screen-recording.mp4',
  ['path/to/narration-1.aac', 'path/to/narration-2.aac'],
  script,
  {
    includeIntro: true,
    includeOutro: true,
    backgroundMusic: 'path/to/music.mp3', // optional
  }
);

console.log('MP4:', result.mp4Path);
console.log('WebM:', result.webmPath);
console.log('Duration:', result.duration);
console.log('File sizes:', result.fileSize);
```

### Running the Test

```bash
npm run test
# or
npx ts-node video-compositor.ts
```

This creates test assets and generates a sample video with intro and outro cards.

## Configuration Options

```typescript
interface VideoCompositorConfig {
  outputDir?: string;              // Default: './output'
  resolution?: string;              // Default: '1920x1080'
  frameRate?: number;               // Default: 30
  videoBitrate?: string;            // Default: '5000k'
  audioBitrate?: string;            // Default: '128k'
  backgroundMusicVolume?: number;   // Default: 0.15 (15% volume)
  fadeInDuration?: number;          // Default: 0.5 seconds
  fadeOutDuration?: number;         // Default: 1.0 seconds
}
```

## Output Specifications

### MP4 Format
- **Container**: MP4
- **Video Codec**: H.264 (libx264)
- **Video Profile**: High, Level 4.2
- **Pixel Format**: yuv420p
- **Resolution**: 1920x1080 (configurable)
- **Frame Rate**: 30fps (configurable)
- **Audio Codec**: AAC
- **Audio Bitrate**: 128kbps
- **Sample Rate**: 48kHz

### WebM Format
- **Container**: WebM
- **Video Codec**: VP9 (libvpx-vp9)
- **Video Bitrate**: 5000kbps (configurable)
- **Resolution**: 1920x1080 (configurable)
- **Frame Rate**: 30fps (configurable)
- **Audio Codec**: Opus
- **Audio Bitrate**: 128kbps
- **Sample Rate**: 48kHz

## Video Processing Pipeline

The compositor follows this processing pipeline:

1. **Audio Combination**: Merges multiple narration segments into a single audio track
2. **Intro Card**: Creates a professional title card with app name and demo title
3. **Video Merging**: Combines intro with main screen recording
4. **Outro Card**: Adds end card with call-to-action
5. **Audio Sync**: Synchronizes narration with video
6. **Background Music**: Optionally mixes background music at low volume
7. **Fade Effects**: Applies smooth fade in/out transitions
8. **Export**: Generates both MP4 and WebM formats

## Advanced Features

### Custom Intro/Outro Cards

The system automatically generates professional cards with:
- **Intro**: App name (large), demo title (smaller)
- **Outro**: "Start Your Free Trial" CTA, "7 Days • No Credit Card Required", app name
- Dark background (0x1a1a2e)
- Professional typography using system fonts

### Background Music Mixing

When background music is provided:
- Narration plays at 100% volume
- Background music plays at 15% volume (configurable)
- Audio is mixed in real-time during composition

### Fade Effects

- **Fade In**: 0.5 seconds (configurable) at the start
- **Fade Out**: 1.0 seconds (configurable) at the end
- Applied to both video and audio streams

## API Reference

### `VideoCompositor`

#### Constructor
```typescript
constructor(config?: VideoCompositorConfig)
```

#### Methods

##### `composeVideo()`
Main composition method that creates the final video.

```typescript
async composeVideo(
  screenRecording: string,
  narrationAudio: string[],
  script: DemoScript,
  options?: {
    backgroundMusic?: string;
    includeIntro?: boolean;
    includeOutro?: boolean;
  }
): Promise<CompositionResult>
```

##### `cleanup()`
Removes temporary files after composition.

```typescript
async cleanup(): Promise<void>
```

##### Static Methods

```typescript
static createTestVideo(outputDir: string): Promise<string>
static createTestAudio(outputDir: string): Promise<string>
static formatFileSize(bytes: number): string
```

## File Structure

```
demo-video-generator/
├── video-compositor.ts      # Main compositor class
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── README.md                # This file
└── demo-videos/             # Output directory (generated)
    ├── product-demo-final.mp4
    ├── product-demo-final.webm
    ├── test-screen-recording.mp4
    └── test-narration.aac
```

## Test Results

The test generates a sample video with the following characteristics:

- **Duration**: ~5 seconds (plus intro/outro = ~12 seconds total)
- **MP4 File Size**: ~714 KB
- **WebM File Size**: ~21 MB (VP9 encodes differently for quality)
- **Resolution**: 1920x1080 Full HD
- **Frame Rate**: 30fps
- **Video Codec (MP4)**: H.264, ~1028 kbps
- **Video Codec (WebM)**: VP9, 5000 kbps target
- **Audio Codec (MP4)**: AAC, 122 kbps, 48 kHz
- **Audio Codec (WebM)**: Opus, 128 kbps target, 48 kHz

## Troubleshooting

### ffmpeg not found
```bash
brew install ffmpeg
```

### Font not found errors
The system uses macOS system fonts. If you encounter font errors, update the font paths in the `createIntroCard` and `createOutroCard` methods.

### Memory issues with long videos
For videos longer than 10 minutes, consider:
- Reducing video bitrate
- Processing in segments
- Using hardware acceleration (add `-hwaccel videotoolbox` for macOS)

### Audio sync issues
Ensure narration audio segments match the scene timings in your script. The compositor uses the `shortest` strategy to prevent extending video or audio.

## Performance

- Test video (5 seconds): ~3-5 seconds processing time
- Typical demo video (2 minutes): ~30-60 seconds processing time
- Processing is CPU-intensive; consider hardware acceleration for production

## Integration Examples

### With Playwright Screen Recorder
```typescript
// Record screen
const recording = await playwright.recordScreen();

// Generate narration
const narration = await elevenLabs.generateAudio(script);

// Compose final video
const result = await compositor.composeVideo(
  recording,
  narration,
  script
);
```

### Batch Processing
```typescript
const scripts = loadDemoScripts();

for (const script of scripts) {
  const result = await compositor.composeVideo(
    script.recording,
    script.narration,
    script.metadata
  );
  console.log(`Generated: ${result.mp4Path}`);
}
```

## License

MIT

## Author

Created for Jarvis/AI DAWG demo video generation system.
