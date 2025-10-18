# Video Compositor - Quick Reference

## Installation Check
```bash
ffmpeg -version  # Should show version 8.0+
```

## Quick Test
```bash
cd ~/Jarvis/tools/demo-video-generator
npx ts-node video-compositor.ts
```

## Basic Usage
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
  title: 'My Demo',
  appName: 'MyApp',
  scenes: [
    { narration: 'Scene 1', startTime: 0, duration: 5 }
  ],
  totalDuration: 5,
};

const result = await compositor.composeVideo(
  'recording.mp4',           // Screen recording
  ['narration.aac'],         // Audio files
  script,                    // Script object
  {
    includeIntro: true,      // Add intro card
    includeOutro: true,      // Add outro card
    backgroundMusic: 'bg.mp3' // Optional music
  }
);

console.log(result.mp4Path);   // Path to MP4
console.log(result.webmPath);  // Path to WebM
console.log(result.duration);  // Duration in seconds
console.log(result.fileSize);  // File sizes

await compositor.cleanup();    // Remove temp files
```

## Configuration Options
```typescript
{
  outputDir: './output',           // Output directory
  resolution: '1920x1080',         // Video resolution
  frameRate: 30,                   // FPS (30 or 60)
  videoBitrate: '5000k',           // Video quality
  audioBitrate: '128k',            // Audio quality
  backgroundMusicVolume: 0.15,     // 0.0-1.0
  fadeInDuration: 0.5,             // Seconds
  fadeOutDuration: 1.0             // Seconds
}
```

## Output Formats

### MP4 (H.264)
- Universal compatibility
- Smaller file size
- Codec: H.264 (libx264)
- Audio: AAC

### WebM (VP9)
- Web-optimized
- Higher quality at same bitrate
- Codec: VP9 (libvpx-vp9)
- Audio: Opus

## File Paths
- **Compositor**: `/Users/benkennon/Jarvis/tools/demo-video-generator/video-compositor.ts`
- **Test Output**: `/Users/benkennon/Jarvis/tools/demo-video-generator/demo-videos/`
- **Documentation**: `/Users/benkennon/Jarvis/tools/demo-video-generator/README.md`

## Common Tasks

### Create test assets
```typescript
const video = await VideoCompositor.createTestVideo('./output');
const audio = await VideoCompositor.createTestAudio('./output');
```

### Format file size
```typescript
const size = VideoCompositor.formatFileSize(bytes);
// Returns: "714.24 KB"
```

### Get video duration
```bash
ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 video.mp4
```

## Troubleshooting

### ffmpeg not found
```bash
brew install ffmpeg
```

### Font errors
Update font paths in `createIntroCard()` and `createOutroCard()` methods

### Large files
Reduce bitrate:
```typescript
videoBitrate: '2000k'  // Lower = smaller files
```

### Slow processing
Use hardware acceleration (macOS):
```bash
-hwaccel videotoolbox
```

## Quality Presets

### High Quality (Large files)
```typescript
{
  videoBitrate: '10000k',
  audioBitrate: '192k',
  frameRate: 60
}
```

### Standard Quality (Balanced)
```typescript
{
  videoBitrate: '5000k',
  audioBitrate: '128k',
  frameRate: 30
}
```

### Low Quality (Small files)
```typescript
{
  videoBitrate: '2000k',
  audioBitrate: '96k',
  frameRate: 30
}
```

## Status
✅ Production Ready
✅ Tested and Working
✅ Fully Documented
