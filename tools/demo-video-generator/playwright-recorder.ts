import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

// Demo Script Types
export interface DemoScript {
  title: string;
  description?: string;
  actions: DemoAction[];
  viewport?: { width: number; height: number };
  slowMo?: number; // Milliseconds to slow down operations
}

export type DemoAction =
  | NavigateAction
  | ClickAction
  | TypeAction
  | ScrollAction
  | WaitAction
  | HoverAction
  | AnnotationAction
  | ScreenshotAction;

export interface NavigateAction {
  type: 'navigate';
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

export interface ClickAction {
  type: 'click';
  selector: string;
  highlight?: boolean;
  annotation?: string;
  waitBefore?: number;
  waitAfter?: number;
}

export interface TypeAction {
  type: 'type';
  selector: string;
  text: string;
  delay?: number; // Delay between keystrokes
  highlight?: boolean;
  annotation?: string;
  waitBefore?: number;
  waitAfter?: number;
}

export interface ScrollAction {
  type: 'scroll';
  direction: 'up' | 'down' | 'left' | 'right';
  amount?: number; // Pixels, default 500
  smooth?: boolean;
  waitAfter?: number;
}

export interface WaitAction {
  type: 'wait';
  duration: number; // Milliseconds
}

export interface HoverAction {
  type: 'hover';
  selector: string;
  highlight?: boolean;
  annotation?: string;
  waitBefore?: number;
  waitAfter?: number;
}

export interface AnnotationAction {
  type: 'annotation';
  text: string;
  position?: { x: number; y: number };
  duration?: number; // Milliseconds to show annotation
}

export interface ScreenshotAction {
  type: 'screenshot';
  filename?: string;
  fullPage?: boolean;
}

export interface RecorderOptions {
  headless?: boolean;
  videoDir?: string;
  viewport?: { width: number; height: number };
  slowMo?: number;
  highlightColor?: string;
  annotationStyle?: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: string;
    padding?: string;
  };
}

export class PlaywrightRecorder {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: Required<RecorderOptions>;
  private videoPath: string | null = null;

  constructor(options: RecorderOptions = {}) {
    this.options = {
      headless: options.headless ?? false,
      videoDir: options.videoDir ?? path.join(process.cwd(), 'recordings'),
      viewport: options.viewport ?? { width: 1920, height: 1080 },
      slowMo: options.slowMo ?? 100,
      highlightColor: options.highlightColor ?? '#00ff00',
      annotationStyle: {
        backgroundColor: options.annotationStyle?.backgroundColor ?? 'rgba(0, 0, 0, 0.8)',
        textColor: options.annotationStyle?.textColor ?? '#ffffff',
        fontSize: options.annotationStyle?.fontSize ?? '18px',
        padding: options.annotationStyle?.padding ?? '12px 20px',
      },
    };
  }

  /**
   * Record a demo based on the provided script
   */
  async recordDemo(script: DemoScript, appUrl: string): Promise<string> {
    try {
      console.log(`Starting demo recording: ${script.title}`);

      // Create recordings directory if it doesn't exist
      if (!fs.existsSync(this.options.videoDir)) {
        fs.mkdirSync(this.options.videoDir, { recursive: true });
      }

      // Launch browser with video recording
      await this.launchBrowser(script);

      // Navigate to the app
      console.log(`Navigating to ${appUrl}`);
      await this.page!.goto(appUrl, { waitUntil: 'networkidle' });
      await this.wait(1000);

      // Inject visual enhancement styles
      await this.injectStyles();

      // Execute all actions in the script
      for (let i = 0; i < script.actions.length; i++) {
        const action = script.actions[i];
        console.log(`Executing action ${i + 1}/${script.actions.length}: ${action.type}`);
        await this.executeAction(action);
      }

      // Wait a bit before closing
      await this.wait(2000);

      // Close browser and save video
      const videoPath = await this.closeBrowser();

      console.log(`Demo recording completed: ${videoPath}`);
      return videoPath;
    } catch (error) {
      console.error('Error recording demo:', error);
      if (this.browser) {
        await this.browser.close();
      }
      throw error;
    }
  }

  /**
   * Launch browser with recording configuration
   */
  private async launchBrowser(script: DemoScript): Promise<void> {
    const viewport = script.viewport ?? this.options.viewport;
    const slowMo = script.slowMo ?? this.options.slowMo;

    this.browser = await chromium.launch({
      headless: this.options.headless,
      slowMo: slowMo,
    });

    this.context = await this.browser.newContext({
      viewport: viewport,
      recordVideo: {
        dir: this.options.videoDir,
        size: viewport,
      },
    });

    this.page = await this.context.newPage();
  }

  /**
   * Inject CSS styles for visual enhancements
   */
  private async injectStyles(): Promise<void> {
    await this.page!.addStyleTag({
      content: `
        /* Highlight effect for elements */
        .pw-highlight {
          outline: 3px solid ${this.options.highlightColor} !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 20px ${this.options.highlightColor} !important;
          transition: all 0.3s ease !important;
        }

        /* Click animation */
        @keyframes clickPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.7);
          }
          50% {
            box-shadow: 0 0 0 20px rgba(0, 255, 0, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 255, 0, 0);
          }
        }

        .pw-click-animation {
          animation: clickPulse 0.6s ease-out !important;
        }

        /* Annotation tooltip */
        .pw-annotation {
          position: fixed !important;
          background-color: ${this.options.annotationStyle.backgroundColor} !important;
          color: ${this.options.annotationStyle.textColor} !important;
          padding: ${this.options.annotationStyle.padding} !important;
          border-radius: 8px !important;
          font-size: ${this.options.annotationStyle.fontSize} !important;
          font-family: system-ui, -apple-system, sans-serif !important;
          z-index: 10000 !important;
          pointer-events: none !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
          animation: fadeIn 0.3s ease-in !important;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Typing indicator */
        .pw-typing-indicator {
          border-right: 2px solid ${this.options.highlightColor} !important;
          animation: blink 0.7s step-end infinite !important;
        }

        @keyframes blink {
          from, to {
            border-color: transparent;
          }
          50% {
            border-color: ${this.options.highlightColor};
          }
        }

        /* Smooth scroll */
        html {
          scroll-behavior: smooth !important;
        }
      `,
    });
  }

  /**
   * Execute a single demo action
   */
  private async executeAction(action: DemoAction): Promise<void> {
    switch (action.type) {
      case 'navigate':
        await this.handleNavigate(action);
        break;
      case 'click':
        await this.handleClick(action);
        break;
      case 'type':
        await this.handleType(action);
        break;
      case 'scroll':
        await this.handleScroll(action);
        break;
      case 'wait':
        await this.handleWait(action);
        break;
      case 'hover':
        await this.handleHover(action);
        break;
      case 'annotation':
        await this.handleAnnotation(action);
        break;
      case 'screenshot':
        await this.handleScreenshot(action);
        break;
      default:
        console.warn(`Unknown action type:`, action);
    }
  }

  /**
   * Handle navigate action
   */
  private async handleNavigate(action: NavigateAction): Promise<void> {
    await this.page!.goto(action.url, {
      waitUntil: action.waitUntil ?? 'networkidle'
    });
  }

  /**
   * Handle click action with visual effects
   */
  private async handleClick(action: ClickAction): Promise<void> {
    if (action.waitBefore) {
      await this.wait(action.waitBefore);
    }

    const element = await this.page!.locator(action.selector);

    // Highlight element
    if (action.highlight !== false) {
      await this.highlightElement(action.selector);
    }

    // Show annotation if provided
    if (action.annotation) {
      await this.showAnnotation(action.annotation, action.selector);
    }

    await this.wait(500);

    // Add click animation
    await this.page!.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (el) {
        el.classList.add('pw-click-animation');
        setTimeout(() => el.classList.remove('pw-click-animation'), 600);
      }
    }, action.selector);

    // Perform the click
    await element.click();

    // Remove annotation
    if (action.annotation) {
      await this.hideAnnotation();
    }

    // Remove highlight
    if (action.highlight !== false) {
      await this.unhighlightElement(action.selector);
    }

    if (action.waitAfter) {
      await this.wait(action.waitAfter);
    }
  }

  /**
   * Handle type action with visual effects
   */
  private async handleType(action: TypeAction): Promise<void> {
    if (action.waitBefore) {
      await this.wait(action.waitBefore);
    }

    const element = await this.page!.locator(action.selector);

    // Highlight element
    if (action.highlight !== false) {
      await this.highlightElement(action.selector);
    }

    // Show annotation if provided
    if (action.annotation) {
      await this.showAnnotation(action.annotation, action.selector);
    }

    await this.wait(500);

    // Focus the element
    await element.click();

    // Type with delay for realistic effect
    const delay = action.delay ?? 100;
    await element.type(action.text, { delay });

    await this.wait(500);

    // Remove annotation
    if (action.annotation) {
      await this.hideAnnotation();
    }

    // Remove highlight
    if (action.highlight !== false) {
      await this.unhighlightElement(action.selector);
    }

    if (action.waitAfter) {
      await this.wait(action.waitAfter);
    }
  }

  /**
   * Handle scroll action
   */
  private async handleScroll(action: ScrollAction): Promise<void> {
    const amount = action.amount ?? 500;

    let scrollX = 0;
    let scrollY = 0;

    switch (action.direction) {
      case 'down':
        scrollY = amount;
        break;
      case 'up':
        scrollY = -amount;
        break;
      case 'right':
        scrollX = amount;
        break;
      case 'left':
        scrollX = -amount;
        break;
    }

    if (action.smooth !== false) {
      await this.page!.evaluate(({ x, y }) => {
        window.scrollBy({ left: x, top: y, behavior: 'smooth' });
      }, { x: scrollX, y: scrollY });
    } else {
      await this.page!.evaluate(({ x, y }) => {
        window.scrollBy(x, y);
      }, { x: scrollX, y: scrollY });
    }

    await this.wait(action.waitAfter ?? 800);
  }

  /**
   * Handle wait action
   */
  private async handleWait(action: WaitAction): Promise<void> {
    await this.wait(action.duration);
  }

  /**
   * Handle hover action
   */
  private async handleHover(action: HoverAction): Promise<void> {
    if (action.waitBefore) {
      await this.wait(action.waitBefore);
    }

    const element = await this.page!.locator(action.selector);

    // Highlight element
    if (action.highlight !== false) {
      await this.highlightElement(action.selector);
    }

    // Show annotation if provided
    if (action.annotation) {
      await this.showAnnotation(action.annotation, action.selector);
    }

    await element.hover();
    await this.wait(1000);

    // Remove annotation
    if (action.annotation) {
      await this.hideAnnotation();
    }

    // Remove highlight
    if (action.highlight !== false) {
      await this.unhighlightElement(action.selector);
    }

    if (action.waitAfter) {
      await this.wait(action.waitAfter);
    }
  }

  /**
   * Handle annotation action
   */
  private async handleAnnotation(action: AnnotationAction): Promise<void> {
    await this.showAnnotation(action.text, undefined, action.position);
    await this.wait(action.duration ?? 2000);
    await this.hideAnnotation();
  }

  /**
   * Handle screenshot action
   */
  private async handleScreenshot(action: ScreenshotAction): Promise<void> {
    const filename = action.filename ?? `screenshot-${Date.now()}.png`;
    const screenshotPath = path.join(this.options.videoDir, filename);

    await this.page!.screenshot({
      path: screenshotPath,
      fullPage: action.fullPage ?? false,
    });

    console.log(`Screenshot saved: ${screenshotPath}`);
  }

  /**
   * Highlight an element
   */
  private async highlightElement(selector: string): Promise<void> {
    await this.page!.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.classList.add('pw-highlight');
      }
    }, selector);
  }

  /**
   * Remove highlight from an element
   */
  private async unhighlightElement(selector: string): Promise<void> {
    await this.page!.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.classList.remove('pw-highlight');
      }
    }, selector);
  }

  /**
   * Show annotation near an element or at a specific position
   */
  private async showAnnotation(
    text: string,
    selector?: string,
    position?: { x: number; y: number }
  ): Promise<void> {
    await this.page!.evaluate(
      ({ text, selector, position }) => {
        // Remove any existing annotation
        const existing = document.querySelector('.pw-annotation');
        if (existing) {
          existing.remove();
        }

        const annotation = document.createElement('div');
        annotation.className = 'pw-annotation';
        annotation.textContent = text;

        if (position) {
          annotation.style.left = `${position.x}px`;
          annotation.style.top = `${position.y}px`;
        } else if (selector) {
          const el = document.querySelector(selector);
          if (el) {
            const rect = el.getBoundingClientRect();
            annotation.style.left = `${rect.left}px`;
            annotation.style.top = `${rect.top - 60}px`;
          }
        } else {
          annotation.style.left = '50%';
          annotation.style.top = '20px';
          annotation.style.transform = 'translateX(-50%)';
        }

        document.body.appendChild(annotation);
      },
      { text, selector, position }
    );
  }

  /**
   * Hide annotation
   */
  private async hideAnnotation(): Promise<void> {
    await this.page!.evaluate(() => {
      const annotation = document.querySelector('.pw-annotation');
      if (annotation) {
        annotation.remove();
      }
    });
  }

  /**
   * Wait helper
   */
  private async wait(ms: number): Promise<void> {
    await this.page!.waitForTimeout(ms);
  }

  /**
   * Close browser and return video path
   */
  private async closeBrowser(): Promise<string> {
    if (!this.page || !this.context || !this.browser) {
      throw new Error('Browser not initialized');
    }

    // Close the page to finalize the video
    await this.page.close();

    // Get the video path
    const video = this.page.video();
    if (video) {
      this.videoPath = await video.path();
    }

    // Close the context and browser
    await this.context.close();
    await this.browser.close();

    if (!this.videoPath) {
      throw new Error('Video path not available');
    }

    return this.videoPath;
  }
}

// Example usage
export async function runExample() {
  const recorder = new PlaywrightRecorder({
    headless: false,
    videoDir: path.join(process.cwd(), 'recordings'),
    viewport: { width: 1920, height: 1080 },
    slowMo: 100,
  });

  const testScript: DemoScript = {
    title: 'Simple Test Demo',
    description: 'A simple 5-second test recording',
    actions: [
      {
        type: 'wait',
        duration: 2000,
      },
      {
        type: 'annotation',
        text: 'Welcome to the demo!',
        position: { x: 100, y: 100 },
        duration: 2000,
      },
      {
        type: 'wait',
        duration: 1000,
      },
    ],
  };

  const videoPath = await recorder.recordDemo(testScript, 'http://localhost:3100');
  console.log(`Test video saved to: ${videoPath}`);
  return videoPath;
}

// Run example if executed directly
if (require.main === module) {
  runExample()
    .then((videoPath) => {
      console.log(`Success! Video: ${videoPath}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
