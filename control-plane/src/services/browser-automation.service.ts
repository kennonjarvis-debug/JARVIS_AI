/**
 * Browser Automation Service
 * Provides browser automation capabilities using Playwright
 * Allows Jarvis to access developer consoles, collect logs, and perform automated actions
 */

import { chromium, Browser, Page, ConsoleMessage, Request, Response } from 'playwright';
import { logger, withCorrelationId } from '../utils/logger.js';

export interface BrowserAction {
  type: 'click' | 'type' | 'wait' | 'scroll' | 'screenshot' | 'evaluate';
  selector?: string;
  value?: string | number;
  code?: string;
}

export interface BrowserAutomationRequest {
  url: string;
  actions?: BrowserAction[];
  waitForSelector?: string;
  timeout?: number;
  headless?: boolean;
  captureNetwork?: boolean;
  captureConsole?: boolean;
  captureScreenshot?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  correlationId?: string;
}

export interface ConsoleLog {
  type: 'log' | 'error' | 'warn' | 'info' | 'debug';
  text: string;
  timestamp: number;
  args?: any[];
}

export interface NetworkLog {
  method: string;
  url: string;
  status?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  timing?: number;
  timestamp: number;
}

export interface BrowserAutomationResult {
  success: boolean;
  url: string;
  consoleLogs?: ConsoleLog[];
  networkLogs?: NetworkLog[];
  screenshot?: string;  // Base64 encoded
  pageContent?: string;
  error?: string;
  metadata: {
    duration: number;
    timestamp: string;
    correlationId?: string;
  };
}

export class BrowserAutomationService {
  private browser: Browser | null = null;
  private activeSessions: Map<string, Page> = new Map();

  /**
   * Launch browser automation session
   */
  async executeAutomation(request: BrowserAutomationRequest): Promise<BrowserAutomationResult> {
    const startTime = Date.now();
    const requestLogger = request.correlationId
      ? withCorrelationId(request.correlationId)
      : logger;

    requestLogger.info(`[BrowserAutomation] Starting automation for ${request.url}`);

    const consoleLogs: ConsoleLog[] = [];
    const networkLogs: NetworkLog[] = [];
    let screenshot: string | undefined;
    let pageContent: string | undefined;

    try {
      // Launch browser
      const browser = await chromium.launch({
        headless: request.headless !== false, // Default to headless unless explicitly set to false
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      requestLogger.info('[BrowserAutomation] Browser launched successfully');

      // Create new page
      const page = await browser.newPage({
        viewport: request.viewport || { width: 1920, height: 1080 },
        userAgent: request.userAgent || undefined
      });

      // Set default timeout
      page.setDefaultTimeout(request.timeout || 30000);

      // Capture console logs
      if (request.captureConsole !== false) {
        page.on('console', (msg: ConsoleMessage) => {
          const log: ConsoleLog = {
            type: msg.type() as any,
            text: msg.text(),
            timestamp: Date.now(),
            args: msg.args().map(arg => arg.toString())
          };
          consoleLogs.push(log);
          requestLogger.debug(`[Console ${log.type}] ${log.text}`);
        });

        // Capture page errors
        page.on('pageerror', (error) => {
          const log: ConsoleLog = {
            type: 'error',
            text: `Page Error: ${error.message}`,
            timestamp: Date.now()
          };
          consoleLogs.push(log);
          requestLogger.error(`[Page Error] ${error.message}`);
        });
      }

      // Capture network requests
      if (request.captureNetwork) {
        page.on('request', (req: Request) => {
          const log: NetworkLog = {
            method: req.method(),
            url: req.url(),
            requestHeaders: req.headers(),
            timestamp: Date.now()
          };
          networkLogs.push(log);
        });

        page.on('response', (res: Response) => {
          const req = res.request();
          const existingLog = networkLogs.find(
            log => log.url === req.url() && !log.status
          );
          if (existingLog) {
            existingLog.status = res.status();
            existingLog.responseHeaders = res.headers();
            existingLog.timing = Date.now() - existingLog.timestamp;
          }
        });
      }

      // Navigate to URL
      requestLogger.info(`[BrowserAutomation] Navigating to ${request.url}`);
      await page.goto(request.url, {
        waitUntil: 'domcontentloaded',
        timeout: request.timeout || 30000
      });

      requestLogger.info('[BrowserAutomation] Page loaded successfully');

      // Wait for specific selector if provided
      if (request.waitForSelector) {
        requestLogger.info(`[BrowserAutomation] Waiting for selector: ${request.waitForSelector}`);
        await page.waitForSelector(request.waitForSelector, {
          timeout: request.timeout || 30000
        });
      }

      // Execute actions
      if (request.actions && request.actions.length > 0) {
        requestLogger.info(`[BrowserAutomation] Executing ${request.actions.length} actions`);

        for (const action of request.actions) {
          await this.executeAction(page, action, requestLogger);
        }
      }

      // Capture screenshot
      if (request.captureScreenshot) {
        requestLogger.info('[BrowserAutomation] Capturing screenshot');
        const screenshotBuffer = await page.screenshot({ fullPage: true });
        screenshot = screenshotBuffer.toString('base64');
      }

      // Get page content
      pageContent = await page.content();

      // Close browser
      await browser.close();
      requestLogger.info('[BrowserAutomation] Browser closed successfully');

      const duration = Date.now() - startTime;

      return {
        success: true,
        url: request.url,
        consoleLogs: request.captureConsole !== false ? consoleLogs : undefined,
        networkLogs: request.captureNetwork ? networkLogs : undefined,
        screenshot,
        pageContent,
        metadata: {
          duration,
          timestamp: new Date().toISOString(),
          correlationId: request.correlationId
        }
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      requestLogger.error(`[BrowserAutomation] Automation failed: ${error.message}`);
      requestLogger.error(error.stack);

      return {
        success: false,
        url: request.url,
        consoleLogs: request.captureConsole !== false ? consoleLogs : undefined,
        networkLogs: request.captureNetwork ? networkLogs : undefined,
        error: error.message,
        metadata: {
          duration,
          timestamp: new Date().toISOString(),
          correlationId: request.correlationId
        }
      };
    }
  }

  /**
   * Execute a single browser action
   */
  private async executeAction(page: Page, action: BrowserAction, requestLogger: any): Promise<void> {
    requestLogger.info(`[BrowserAutomation] Executing action: ${action.type}`);

    switch (action.type) {
      case 'click':
        if (!action.selector) {
          throw new Error('Selector required for click action');
        }
        await page.click(action.selector);
        requestLogger.debug(`[Action] Clicked: ${action.selector}`);
        break;

      case 'type':
        if (!action.selector || !action.value) {
          throw new Error('Selector and value required for type action');
        }
        await page.fill(action.selector, String(action.value));
        requestLogger.debug(`[Action] Typed into: ${action.selector}`);
        break;

      case 'wait':
        const waitTime = typeof action.value === 'number' ? action.value : 1000;
        await page.waitForTimeout(waitTime);
        requestLogger.debug(`[Action] Waited: ${waitTime}ms`);
        break;

      case 'scroll':
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        requestLogger.debug('[Action] Scrolled to bottom');
        break;

      case 'screenshot':
        // Screenshot is handled separately
        requestLogger.debug('[Action] Screenshot requested');
        break;

      case 'evaluate':
        if (!action.code) {
          throw new Error('Code required for evaluate action');
        }
        const result = await page.evaluate(action.code);
        requestLogger.debug(`[Action] Evaluated code: ${result}`);
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Get a summary of console errors
   */
  getConsoleErrors(consoleLogs: ConsoleLog[]): ConsoleLog[] {
    return consoleLogs.filter(log => log.type === 'error');
  }

  /**
   * Get a summary of failed network requests
   */
  getFailedRequests(networkLogs: NetworkLog[]): NetworkLog[] {
    return networkLogs.filter(log => log.status && log.status >= 400);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.activeSessions.clear();
  }
}

// Singleton instance
export const browserAutomationService = new BrowserAutomationService();

export default BrowserAutomationService;
