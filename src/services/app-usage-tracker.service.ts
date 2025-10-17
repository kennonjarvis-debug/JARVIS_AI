/**
 * App Usage Tracker Service
 *
 * Tracks which applications the user is using and for how long.
 * Helps detect patterns like coding sessions, music production, meetings, etc.
 *
 * Features:
 * - Track active app and window title
 * - Measure time spent in each app
 * - Detect app switching patterns
 * - Privacy-aware (excludes sensitive apps)
 * - Usage analytics and reporting
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

export interface AppUsageTrackerConfig {
  checkInterval: number;          // How often to check (seconds)
  excludedApps: string[];         // Apps to never track
  trackWindowTitles?: boolean;    // Track window titles (more detailed)
}

export interface AppUsage {
  appName: string;
  windowTitle?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;              // milliseconds
  switchCount: number;            // How many times user switched to this app
}

export interface AppSession {
  id: string;
  appName: string;
  windowTitle: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  metadata: Record<string, any>;
}

export class AppUsageTracker extends EventEmitter {
  private config: AppUsageTrackerConfig;
  private isRunning: boolean = false;
  private checkTimer?: NodeJS.Timeout;

  // Current state
  private currentApp?: string;
  private currentWindow?: string;
  private currentSession?: AppSession;

  // Usage tracking
  private appUsage: Map<string, AppUsage> = new Map();
  private sessions: AppSession[] = [];

  constructor(config: AppUsageTrackerConfig) {
    super();
    this.config = {
      trackWindowTitles: true,
      ...config
    };
  }

  /**
   * Start tracking app usage
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('App usage tracker already running');
      return;
    }

    logger.info('📱 Starting app usage tracker...', {
      interval: `${this.config.checkInterval}s`
    });

    this.isRunning = true;

    // Start periodic checking
    this.checkTimer = setInterval(async () => {
      await this.checkCurrentApp();
    }, this.config.checkInterval * 1000);

    // Check immediately
    await this.checkCurrentApp();

    this.emit('tracker:started');
    logger.info('✅ App usage tracker started');
  }

  /**
   * Stop tracking app usage
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping app usage tracker...');

    this.isRunning = false;

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }

    // End current session
    if (this.currentSession) {
      this.endSession(this.currentSession);
    }

    this.emit('tracker:stopped');
    logger.info('✅ App usage tracker stopped');
  }

  /**
   * Check currently active application
   */
  private async checkCurrentApp(): Promise<void> {
    try {
      const appName = await this.getActiveApp();
      const windowTitle = this.config.trackWindowTitles
        ? await this.getActiveWindowTitle()
        : '';

      // Check if app is excluded
      if (this.isAppExcluded(appName)) {
        logger.debug('Skipping excluded app', { app: appName });
        return;
      }

      // Check if app changed
      if (appName !== this.currentApp || windowTitle !== this.currentWindow) {
        await this.handleAppSwitch(appName, windowTitle);
      } else {
        // Same app - update duration
        if (this.currentSession) {
          this.currentSession.duration = Date.now() - this.currentSession.startTime.getTime();
        }
      }

    } catch (error) {
      logger.error('Failed to check current app:', error);
      this.emit('tracker:error', error);
    }
  }

  /**
   * Handle app switch event
   */
  private async handleAppSwitch(newApp: string, newWindow: string): Promise<void> {
    logger.debug('App switched', {
      from: this.currentApp,
      to: newApp,
      window: newWindow
    });

    // End previous session
    if (this.currentSession) {
      this.endSession(this.currentSession);
    }

    // Update current app
    this.currentApp = newApp;
    this.currentWindow = newWindow;

    // Update usage statistics
    this.updateAppUsage(newApp, newWindow);

    // Start new session
    this.currentSession = this.startSession(newApp, newWindow);

    // Emit app switch event
    this.emit('app:switched', {
      appName: newApp,
      windowTitle: newWindow,
      timestamp: new Date()
    });
  }

  /**
   * Start new app session
   */
  private startSession(appName: string, windowTitle: string): AppSession {
    const session: AppSession = {
      id: this.generateSessionId(),
      appName,
      windowTitle,
      startTime: new Date(),
      metadata: {}
    };

    this.sessions.push(session);

    logger.debug('New app session started', {
      sessionId: session.id,
      app: appName
    });

    this.emit('session:started', session);

    return session;
  }

  /**
   * End app session
   */
  private endSession(session: AppSession): void {
    session.endTime = new Date();
    session.duration = session.endTime.getTime() - session.startTime.getTime();

    logger.debug('App session ended', {
      sessionId: session.id,
      app: session.appName,
      duration: `${Math.round(session.duration / 1000)}s`
    });

    this.emit('session:ended', session);
  }

  /**
   * Update app usage statistics
   */
  private updateAppUsage(appName: string, windowTitle: string): void {
    let usage = this.appUsage.get(appName);

    if (!usage) {
      usage = {
        appName,
        windowTitle,
        startTime: new Date(),
        switchCount: 0,
        duration: 0
      };
      this.appUsage.set(appName, usage);
    }

    usage.switchCount++;
    usage.endTime = new Date();

    // Calculate total duration
    usage.duration = usage.endTime.getTime() - usage.startTime.getTime();
  }

  /**
   * Get currently active application
   */
  private async getActiveApp(): Promise<string> {
    try {
      const { stdout } = await execAsync(`
        osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'
      `);
      return stdout.trim();
    } catch (error) {
      logger.error('Failed to get active app:', error);
      return 'Unknown';
    }
  }

  /**
   * Get active window title
   */
  private async getActiveWindowTitle(): Promise<string> {
    try {
      const { stdout } = await execAsync(`
        osascript -e 'tell application "System Events" to get name of front window of first application process whose frontmost is true'
      `);
      return stdout.trim();
    } catch (error) {
      // Window title might not be accessible
      return '';
    }
  }

  /**
   * Check if app should be excluded
   */
  private isAppExcluded(appName: string): boolean {
    return this.config.excludedApps.some(excluded =>
      appName.toLowerCase().includes(excluded.toLowerCase())
    );
  }

  /**
   * Get app usage summary
   */
  getAppUsageSummary(): AppUsage[] {
    return Array.from(this.appUsage.values())
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  /**
   * Get most used apps
   */
  getMostUsedApps(limit: number = 10): AppUsage[] {
    return this.getAppUsageSummary().slice(0, limit);
  }

  /**
   * Get recent sessions
   */
  getRecentSessions(limit: number = 20): AppSession[] {
    return this.sessions.slice(-limit);
  }

  /**
   * Get sessions for specific app
   */
  getAppSessions(appName: string): AppSession[] {
    return this.sessions.filter(s => s.appName === appName);
  }

  /**
   * Get total time spent in app
   */
  getTotalTimeInApp(appName: string): number {
    const usage = this.appUsage.get(appName);
    return usage?.duration || 0;
  }

  /**
   * Detect patterns in app usage
   */
  detectPatterns(): {
    codingApps: string[];
    designApps: string[];
    communicationApps: string[];
    musicApps: string[];
    browserUsage: number;
  } {
    const summary = this.getAppUsageSummary();

    const codingApps = summary
      .filter(u => this.isCodingApp(u.appName))
      .map(u => u.appName);

    const designApps = summary
      .filter(u => this.isDesignApp(u.appName))
      .map(u => u.appName);

    const communicationApps = summary
      .filter(u => this.isCommunicationApp(u.appName))
      .map(u => u.appName);

    const musicApps = summary
      .filter(u => this.isMusicApp(u.appName))
      .map(u => u.appName);

    const browserUsage = summary
      .filter(u => this.isBrowserApp(u.appName))
      .reduce((total, u) => total + (u.duration || 0), 0);

    return {
      codingApps,
      designApps,
      communicationApps,
      musicApps,
      browserUsage
    };
  }

  /**
   * App category helpers
   */
  private isCodingApp(appName: string): boolean {
    const codingApps = ['Code', 'VS Code', 'Xcode', 'IntelliJ', 'PyCharm', 'WebStorm', 'Sublime', 'Atom', 'Terminal', 'iTerm'];
    return codingApps.some(app => appName.includes(app));
  }

  private isDesignApp(appName: string): boolean {
    const designApps = ['Figma', 'Sketch', 'Photoshop', 'Illustrator', 'Canva'];
    return designApps.some(app => appName.includes(app));
  }

  private isCommunicationApp(appName: string): boolean {
    const commApps = ['Slack', 'Teams', 'Zoom', 'Discord', 'Messages', 'Mail', 'Outlook'];
    return commApps.some(app => appName.includes(app));
  }

  private isMusicApp(appName: string): boolean {
    const musicApps = ['Spotify', 'Music', 'Logic Pro', 'Ableton', 'GarageBand', 'FL Studio'];
    return musicApps.some(app => appName.includes(app));
  }

  private isBrowserApp(appName: string): boolean {
    const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Arc', 'Brave'];
    return browsers.some(browser => appName.includes(browser));
  }

  /**
   * Get tracking statistics
   */
  getStats(): {
    isRunning: boolean;
    currentApp: string | undefined;
    totalApps: number;
    totalSessions: number;
    currentSessionDuration: number | null;
  } {
    return {
      isRunning: this.isRunning,
      currentApp: this.currentApp,
      totalApps: this.appUsage.size,
      totalSessions: this.sessions.length,
      currentSessionDuration: this.currentSession
        ? Date.now() - this.currentSession.startTime.getTime()
        : null
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `app-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
