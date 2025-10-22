import { PlaywrightRecorder, DemoScript } from './playwright-recorder';
import * as path from 'path';

async function quickTest() {
  console.log('Starting quick test recording...');

  const recorder = new PlaywrightRecorder({
    headless: false,
    videoDir: path.join(process.cwd(), 'recordings', 'test'),
    viewport: { width: 1280, height: 720 },
    slowMo: 100,
  });

  const testScript: DemoScript = {
    title: 'Quick 5-Second Test',
    description: 'Testing Playwright recorder functionality',
    actions: [
      {
        type: 'wait',
        duration: 1000,
      },
      {
        type: 'annotation',
        text: 'Playwright Recorder Test - Recording Started!',
        position: { x: 640, y: 100 },
        duration: 2000,
      },
      {
        type: 'wait',
        duration: 1000,
      },
      {
        type: 'annotation',
        text: 'Test Complete!',
        position: { x: 640, y: 100 },
        duration: 1000,
      },
    ],
  };

  try {
    const videoPath = await recorder.recordDemo(testScript, 'http://localhost:3100');
    console.log('\n========================================');
    console.log('SUCCESS! Test video created:');
    console.log(videoPath);
    console.log('========================================\n');
    return videoPath;
  } catch (error) {
    console.error('Error during recording:', error);
    throw error;
  }
}

quickTest()
  .then(() => {
    console.log('Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
