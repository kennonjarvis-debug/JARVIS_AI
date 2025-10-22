import { PlaywrightRecorder, DemoScript } from './playwright-recorder';
import * as path from 'path';

/**
 * Example: Recording Jarvis Dashboard Demo (localhost:3100)
 */
export async function recordJarvisDemo() {
  const recorder = new PlaywrightRecorder({
    headless: false,
    videoDir: path.join(process.cwd(), 'recordings', 'jarvis'),
    viewport: { width: 1920, height: 1080 },
    slowMo: 150,
  });

  const jarvisScript: DemoScript = {
    title: 'Jarvis Dashboard Demo',
    description: 'Demonstrating Jarvis control plane features',
    actions: [
      {
        type: 'annotation',
        text: 'Welcome to Jarvis Control Plane!',
        position: { x: 960, y: 50 },
        duration: 2000,
      },
      {
        type: 'wait',
        duration: 500,
      },
      {
        type: 'click',
        selector: 'button[aria-label="Menu"]',
        annotation: 'Opening navigation menu',
        waitAfter: 1000,
      },
      {
        type: 'scroll',
        direction: 'down',
        amount: 300,
        waitAfter: 1000,
      },
      {
        type: 'hover',
        selector: 'nav a:first-child',
        annotation: 'Exploring menu options',
        waitAfter: 1000,
      },
      {
        type: 'screenshot',
        filename: 'jarvis-dashboard.png',
      },
    ],
  };

  const videoPath = await recorder.recordDemo(jarvisScript, 'http://localhost:3100');
  console.log(`Jarvis demo video saved to: ${videoPath}`);
  return videoPath;
}

/**
 * Example: Recording AI DAWG Demo (localhost:5173)
 */
export async function recordAIDawgDemo() {
  const recorder = new PlaywrightRecorder({
    headless: false,
    videoDir: path.join(process.cwd(), 'recordings', 'ai-dawg'),
    viewport: { width: 1920, height: 1080 },
    slowMo: 150,
  });

  const aiDawgScript: DemoScript = {
    title: 'AI DAWG Interface Demo',
    description: 'Demonstrating AI DAWG chat interface',
    actions: [
      {
        type: 'annotation',
        text: 'AI DAWG - Your AI Assistant',
        position: { x: 960, y: 50 },
        duration: 2000,
      },
      {
        type: 'click',
        selector: 'input[type="text"], textarea, [contenteditable="true"]',
        annotation: 'Typing a message',
        waitAfter: 500,
      },
      {
        type: 'type',
        selector: 'input[type="text"], textarea, [contenteditable="true"]',
        text: 'Hello! Can you help me with a task?',
        delay: 80,
        waitAfter: 1000,
      },
      {
        type: 'click',
        selector: 'button[type="submit"], button:has-text("Send")',
        annotation: 'Sending message',
        waitAfter: 2000,
      },
      {
        type: 'screenshot',
        filename: 'ai-dawg-chat.png',
      },
    ],
  };

  const videoPath = await recorder.recordDemo(aiDawgScript, 'http://localhost:5173');
  console.log(`AI DAWG demo video saved to: ${videoPath}`);
  return videoPath;
}

/**
 * Example: Simple 5-second test recording
 */
export async function recordSimpleTest() {
  const recorder = new PlaywrightRecorder({
    headless: false,
    videoDir: path.join(process.cwd(), 'recordings', 'tests'),
    viewport: { width: 1280, height: 720 },
    slowMo: 100,
  });

  const testScript: DemoScript = {
    title: 'Simple 5-Second Test',
    description: 'A quick test to verify recording functionality',
    actions: [
      {
        type: 'annotation',
        text: 'Testing Playwright Recorder...',
        position: { x: 640, y: 50 },
        duration: 2000,
      },
      {
        type: 'wait',
        duration: 1000,
      },
      {
        type: 'annotation',
        text: 'Recording complete!',
        position: { x: 640, y: 50 },
        duration: 2000,
      },
    ],
  };

  const videoPath = await recorder.recordDemo(testScript, 'http://localhost:3100');
  console.log(`Test video saved to: ${videoPath}`);
  return videoPath;
}

/**
 * Advanced example: Form interaction demo
 */
export async function recordFormDemo() {
  const recorder = new PlaywrightRecorder({
    headless: false,
    videoDir: path.join(process.cwd(), 'recordings', 'forms'),
    viewport: { width: 1920, height: 1080 },
    slowMo: 150,
    highlightColor: '#ff6b6b',
  });

  const formScript: DemoScript = {
    title: 'Form Interaction Demo',
    description: 'Demonstrating form filling with visual effects',
    actions: [
      {
        type: 'click',
        selector: 'input[name="email"], input[type="email"]',
        annotation: 'Entering email address',
        waitAfter: 500,
      },
      {
        type: 'type',
        selector: 'input[name="email"], input[type="email"]',
        text: 'demo@example.com',
        delay: 100,
        waitAfter: 1000,
      },
      {
        type: 'click',
        selector: 'input[name="password"], input[type="password"]',
        annotation: 'Entering password',
        waitAfter: 500,
      },
      {
        type: 'type',
        selector: 'input[name="password"], input[type="password"]',
        text: 'SecurePassword123!',
        delay: 80,
        waitAfter: 1000,
      },
      {
        type: 'hover',
        selector: 'button[type="submit"]',
        annotation: 'Ready to submit',
        waitAfter: 1500,
      },
      {
        type: 'click',
        selector: 'button[type="submit"]',
        annotation: 'Submitting form',
        waitAfter: 2000,
      },
    ],
  };

  const videoPath = await recorder.recordDemo(formScript, 'http://localhost:3100');
  console.log(`Form demo video saved to: ${videoPath}`);
  return videoPath;
}

// CLI interface
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'jarvis':
      await recordJarvisDemo();
      break;
    case 'aidawg':
      await recordAIDawgDemo();
      break;
    case 'test':
      await recordSimpleTest();
      break;
    case 'form':
      await recordFormDemo();
      break;
    default:
      console.log('Usage: tsx example-usage.ts [jarvis|aidawg|test|form]');
      console.log('');
      console.log('Examples:');
      console.log('  tsx example-usage.ts test      - Record a simple 5-second test');
      console.log('  tsx example-usage.ts jarvis    - Record Jarvis dashboard demo');
      console.log('  tsx example-usage.ts aidawg    - Record AI DAWG chat demo');
      console.log('  tsx example-usage.ts form      - Record form interaction demo');
      process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('Recording completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Recording failed:', error);
      process.exit(1);
    });
}
