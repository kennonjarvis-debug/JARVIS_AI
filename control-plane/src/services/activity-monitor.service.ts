/**
 * Activity Monitor Service
 *
 * Core service for monitoring user activity across the system.
 * Coordinates screen recording, audio monitoring, app usage tracking, and context detection.
 *
 * Features:
 * - Privacy-aware monitoring with configurable levels
 * - Event-driven architecture for real-time detection
 * - Integration with autonomous orchestrator
 * - Secure local storage with encryption
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { ScreenRecorder } from './screen-recorder.service.js';
import { AudioMonitor } from './audio-monitor.service.js';
import { AppUsageTracker } from './app-usage-tracker.service.js';
import { ContextDetector } from './context-detector.service.js';

export enum MonitoringLevel {
  OFF = 'off',
  MINIMAL = 'minimal',       // Only app usage and basic metrics
  STANDARD = 'standard',      // + periodic screenshots
  COMPREHENSIVE = 'comprehensive'  // + audio monitoring, full context
}

export enum ActivityContext {
  FREESTYLING = 'freestyling',
  CODING = 'coding',
  MEETING = 'meeting',
  RESEARCHING = 'researching',
  MUSIC_PRODUCTION = 'music_production',
  BROWSING = 'browsing',
  WRITING = 'writing',
  IDLE = 'idle',
  UNKNOWN = 'unknown'
}

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: 'app_switch' | 'screen_change' | 'audio_detected' | 'context_change' | 'session_start' | 'session_end';
  context: ActivityContext;
  metadata: {
    appName?: string;
    windowTitle?: string;
    audioLevel?: number;
    duration?: number;
    [key: string]: any;
  };
}

export interface ActivitySession {
  id: string;
  userId: string;
  context: ActivityContext;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  events: ActivityEvent[];
  metadata: Record<string, any>;
}

export interface MonitoringConfig {
  level: MonitoringLevel;
  privacy: {
    excludedApps: string[];           // Apps to never monitor
    excludedKeywords: string[];       // Screen content keywords to ignore
    encryptionEnabled: boolean;
    autoDeleteAfterDays: number;
  };
  monitoring: {
    screenCaptureInterval: number;    // seconds
    audioSamplingInterval: number;    // seconds
    appCheckInterval: number;         // seconds
  };
  storage: {
    localPath: string;
    maxStorageGB: number;
  };
}

export class ActivityMonitorService extends EventEmitter {
  private static instance: ActivityMonitorService;

  private config: MonitoringConfig;
  private isMonitoring: boolean = false;

  // Component services
  private screenRecorder: ScreenRecorder;
  private audioMonitor: AudioMonitor;
  private appUsageTracker: AppUsageTracker;
  private contextDetector: ContextDetector;

  // State
  private currentSession?: ActivitySession;
  private currentContext: ActivityContext = ActivityContext.UNKNOWN;
  private activityEvents: ActivityEvent[] = [];
  private sessions: Map<string, ActivitySession> = new Map();

  private constructor(config?: Partial<MonitoringConfig>) {
    super();

    // Default configuration
    this.config = {
      level: MonitoringLevel.STANDARD,
      privacy: {
        excludedApps: [
          'Passwords',
          'KeyChain Access',
          '1Password',
          'Banking',
          'Messages',
          'Signal',
          ...((config?.privacy?.excludedApps as string[]) || [])
        ],
        excludedKeywords: [
          'password',
          'ssn',
          'credit card',
          'api key',
          'secret',
          ...((config?.privacy?.excludedKeywords as string[]) || [])
        ],
        encryptionEnabled: true,
        autoDeleteAfterDays: 7
      },
      monitoring: {
        screenCaptureInterval: 60,
        audioSamplingInterval: 5,
        appCheckInterval: 10
      },
      storage: {
        localPath: '/Users/benkennon/Jarvis/data/activity-logs',
        maxStorageGB: 10
      },
      ...config
    };

    // Initialize component services
    this.screenRecorder = new ScreenRecorder({
      interval: this.config.monitoring.screenCaptureInterval,
      storagePath: `${this.config.storage.localPath}/screenshots`,
      excludedApps: this.config.privacy.excludedApps
    });

    this.audioMonitor = new AudioMonitor({
      samplingInterval: this.config.monitoring.audioSamplingInterval,
      storagePath: `${this.config.storage.localPath}/audio`
    });

    this.appUsageTracker = new AppUsageTracker({
      checkInterval: this.config.monitoring.appCheckInterval,
      excludedApps: this.config.privacy.excludedApps
    });

    this.contextDetector = new ContextDetector();

    this.setupEventListeners();
  }

  static getInstance(config?: Partial<MonitoringConfig>): ActivityMonitorService {
    if (!ActivityMonitorService.instance) {
      ActivityMonitorService.instance = new ActivityMonitorService(config);
    }
    return ActivityMonitorService.instance;
  }

  /**
   * Setup event listeners for component services
   */
  private setupEventListeners(): void {
    // App usage events
    this.appUsageTracker.on('app:switched', (data) => {
      this.handleAppSwitch(data);
    });

    // Screen activity events
    this.screenRecorder.on('screen:captured', (data) => {
      this.handleScreenCapture(data);
    });

    // Audio events
    this.audioMonitor.on('audio:detected', (data) => {
      this.handleAudioDetection(data);
    });

    // Context changes
    this.contextDetector.on('context:changed', (context) => {
      this.handleContextChange(context);
    });
  }

  /**
   * Start monitoring user activity
   */
  async startMonitoring(userId: string): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('Activity monitoring already running');
      return;
    }

    if (this.config.level === MonitoringLevel.OFF) {
      logger.info('Activity monitoring is disabled');
      return;
    }

    logger.info('🔍 Starting activity monitoring...', {
      level: this.config.level,
      userId
    });

    this.isMonitoring = true;

    // Start all component services based on monitoring level
    await this.appUsageTracker.start();

    if (this.config.level === MonitoringLevel.STANDARD ||
        this.config.level === MonitoringLevel.COMPREHENSIVE) {
      await this.screenRecorder.start();
    }

    if (this.config.level === MonitoringLevel.COMPREHENSIVE) {
      await this.audioMonitor.start();
    }

    // Create initial session
    this.currentSession = this.createSession(userId, ActivityContext.UNKNOWN);

    this.emit('monitoring:started', { userId, level: this.config.level });
    logger.info('✅ Activity monitoring started successfully');
  }

  /**
   * Stop monitoring user activity
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    logger.info('🛑 Stopping activity monitoring...');

    this.isMonitoring = false;

    // Stop all component services
    await this.appUsageTracker.stop();
    await this.screenRecorder.stop();
    await this.audioMonitor.stop();

    // End current session
    if (this.currentSession) {
      this.endSession(this.currentSession.id);
    }

    this.emit('monitoring:stopped');
    logger.info('✅ Activity monitoring stopped');
  }

  /**
   * Handle app switch event
   */
  private handleAppSwitch(data: { appName: string; windowTitle: string }): void {
    const event: ActivityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'app_switch',
      context: this.currentContext,
      metadata: {
        appName: data.appName,
        windowTitle: data.windowTitle
      }
    };

    this.recordEvent(event);

    // Send to context detector
    this.contextDetector.analyzeAppSwitch(data.appName, data.windowTitle);

    this.emit('activity:app_switch', event);
  }

  /**
   * Handle screen capture event
   */
  private handleScreenCapture(data: { screenshotPath: string; timestamp: Date }): void {
    const event: ActivityEvent = {
      id: this.generateEventId(),
      timestamp: data.timestamp,
      type: 'screen_change',
      context: this.currentContext,
      metadata: {
        screenshotPath: data.screenshotPath
      }
    };

    this.recordEvent(event);

    // Send to context detector for OCR/analysis
    this.contextDetector.analyzeScreenshot(data.screenshotPath);

    this.emit('activity:screen_change', event);
  }

  /**
   * Handle audio detection event
   */
  private handleAudioDetection(data: { audioLevel: number; isSpeech: boolean; beatDetected: boolean }): void {
    const event: ActivityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'audio_detected',
      context: this.currentContext,
      metadata: {
        audioLevel: data.audioLevel,
        isSpeech: data.isSpeech,
        beatDetected: data.beatDetected
      }
    };

    this.recordEvent(event);

    // Send to context detector
    this.contextDetector.analyzeAudio(data);

    this.emit('activity:audio_detected', event);
  }

  /**
   * Handle context change event
   */
  private handleContextChange(newContext: ActivityContext): void {
    if (newContext === this.currentContext) {
      return;
    }

    const previousContext = this.currentContext;
    this.currentContext = newContext;

    logger.info('📍 Context changed', {
      from: previousContext,
      to: newContext
    });

    const event: ActivityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'context_change',
      context: newContext,
      metadata: {
        previousContext,
        newContext
      }
    };

    this.recordEvent(event);

    // If context significantly changed, end current session and start new one
    if (this.isSignificantContextChange(previousContext, newContext)) {
      if (this.currentSession) {
        this.endSession(this.currentSession.id);
      }
      this.currentSession = this.createSession(
        this.currentSession?.userId || 'default',
        newContext
      );
    }

    this.emit('activity:context_changed', {
      event,
      previousContext,
      newContext,
      session: this.currentSession
    });
  }

  /**
   * Create a new activity session
   */
  private createSession(userId: string, context: ActivityContext): ActivitySession {
    const session: ActivitySession = {
      id: this.generateSessionId(),
      userId,
      context,
      startTime: new Date(),
      events: [],
      metadata: {}
    };

    this.sessions.set(session.id, session);

    const event: ActivityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'session_start',
      context,
      metadata: {
        sessionId: session.id,
        userId
      }
    };

    this.recordEvent(event);
    this.emit('session:started', session);

    logger.info('📝 New activity session started', {
      sessionId: session.id,
      context
    });

    return session;
  }

  /**
   * End an activity session
   */
  private endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.endTime = new Date();
    session.duration = session.endTime.getTime() - session.startTime.getTime();

    const event: ActivityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'session_end',
      context: session.context,
      metadata: {
        sessionId: session.id,
        duration: session.duration
      }
    };

    this.recordEvent(event);
    this.emit('session:ended', session);

    logger.info('✅ Activity session ended', {
      sessionId: session.id,
      context: session.context,
      duration: `${Math.round(session.duration / 1000)}s`
    });
  }

  /**
   * Record an activity event
   */
  private recordEvent(event: ActivityEvent): void {
    this.activityEvents.push(event);

    if (this.currentSession) {
      this.currentSession.events.push(event);
    }

    // Trim events to prevent memory issues
    if (this.activityEvents.length > 10000) {
      this.activityEvents = this.activityEvents.slice(-5000);
    }
  }

  /**
   * Check if context change is significant enough to end session
   */
  private isSignificantContextChange(from: ActivityContext, to: ActivityContext): boolean {
    // Don't end session for minor changes
    const minorChanges = [
      [ActivityContext.UNKNOWN, ActivityContext.IDLE],
      [ActivityContext.BROWSING, ActivityContext.RESEARCHING]
    ];

    for (const [c1, c2] of minorChanges) {
      if ((from === c1 && to === c2) || (from === c2 && to === c1)) {
        return false;
      }
    }

    return from !== to;
  }

  /**
   * Get current context
   */
  getCurrentContext(): ActivityContext {
    return this.currentContext;
  }

  /**
   * Get current session
   */
  getCurrentSession(): ActivitySession | undefined {
    return this.currentSession;
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 100): ActivityEvent[] {
    return this.activityEvents.slice(-limit);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ActivitySession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): ActivitySession[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(updates: Partial<MonitoringConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      privacy: {
        ...this.config.privacy,
        ...(updates.privacy || {})
      },
      monitoring: {
        ...this.config.monitoring,
        ...(updates.monitoring || {})
      },
      storage: {
        ...this.config.storage,
        ...(updates.storage || {})
      }
    };

    logger.info('Activity monitoring configuration updated', this.config);
    this.emit('config:updated', this.config);
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    isMonitoring: boolean;
    currentContext: ActivityContext;
    totalEvents: number;
    totalSessions: number;
    currentSessionDuration: number | null;
  } {
    return {
      isMonitoring: this.isMonitoring,
      currentContext: this.currentContext,
      totalEvents: this.activityEvents.length,
      totalSessions: this.sessions.size,
      currentSessionDuration: this.currentSession
        ? Date.now() - this.currentSession.startTime.getTime()
        : null
    };
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const activityMonitor = ActivityMonitorService.getInstance();
