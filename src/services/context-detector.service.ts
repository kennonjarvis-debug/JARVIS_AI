/**
 * Context Detector Service
 *
 * Analyzes activity signals from multiple sources to determine what the user is doing.
 * This is the "intelligence layer" that transforms raw data into meaningful context.
 *
 * Features:
 * - Multi-signal analysis (app, screen, audio)
 * - Context detection (freestyling, coding, meeting, etc.)
 * - Pattern recognition
 * - Confidence scoring
 * - Real-time context updates
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { ActivityContext } from './activity-monitor.service.js';

export interface ContextSignals {
  appName?: string;
  windowTitle?: string;
  audioLevel?: number;
  isSpeech?: boolean;
  beatDetected?: boolean;
  screenshotPath?: string;
  extractedText?: string;
}

export interface ContextDetection {
  context: ActivityContext;
  confidence: number;              // 0-1
  signals: string[];               // Which signals contributed to detection
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface ContextRule {
  context: ActivityContext;
  conditions: {
    appPatterns?: string[];        // App name must match one of these
    windowPatterns?: string[];     // Window title must match one of these
    audioRequired?: boolean;        // Must have audio input
    speechRequired?: boolean;       // Must have speech
    beatRequired?: boolean;         // Must have beat/music
    screenKeywords?: string[];     // Screen must contain these keywords
  };
  weight: number;                  // 0-1, how strong is this rule
}

export class ContextDetector extends EventEmitter {
  private currentContext: ActivityContext = ActivityContext.UNKNOWN;
  private contextHistory: ContextDetection[] = [];
  private contextRules: ContextRule[];

  // Buffers for multi-signal analysis
  private recentApps: string[] = [];
  private recentAudioSignals: ContextSignals[] = [];

  constructor() {
    super();
    this.contextRules = this.initializeContextRules();
  }

  /**
   * Initialize context detection rules
   */
  private initializeContextRules(): ContextRule[] {
    return [
      // FREESTYLING: Speech + Beat + Music app
      {
        context: ActivityContext.FREESTYLING,
        conditions: {
          speechRequired: true,
          beatRequired: true,
          appPatterns: ['Spotify', 'Music', 'Logic', 'Ableton', 'GarageBand', 'FL Studio', 'Chrome', 'Safari']
        },
        weight: 0.95
      },

      // CODING: IDE/Editor open + typing
      {
        context: ActivityContext.CODING,
        conditions: {
          appPatterns: ['Code', 'VS Code', 'Xcode', 'IntelliJ', 'PyCharm', 'WebStorm', 'Sublime', 'Atom', 'Terminal', 'iTerm'],
          screenKeywords: ['function', 'const', 'class', 'import', 'export', 'def', 'public']
        },
        weight: 0.9
      },

      // MEETING: Zoom/Teams + audio input
      {
        context: ActivityContext.MEETING,
        conditions: {
          appPatterns: ['Zoom', 'Teams', 'Google Meet', 'Discord', 'FaceTime'],
          audioRequired: true
        },
        weight: 0.9
      },

      // MUSIC_PRODUCTION: DAW open
      {
        context: ActivityContext.MUSIC_PRODUCTION,
        conditions: {
          appPatterns: ['Logic Pro', 'Ableton', 'FL Studio', 'GarageBand', 'Pro Tools', 'Cubase', 'Studio One']
        },
        weight: 0.85
      },

      // RESEARCHING: Browser + multiple tabs/windows
      {
        context: ActivityContext.RESEARCHING,
        conditions: {
          appPatterns: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Arc'],
          windowPatterns: ['Google', 'Stack Overflow', 'GitHub', 'Documentation', 'Wikipedia']
        },
        weight: 0.7
      },

      // WRITING: Word processor or notes app
      {
        context: ActivityContext.WRITING,
        conditions: {
          appPatterns: ['Word', 'Pages', 'Google Docs', 'Notion', 'Bear', 'Obsidian', 'Notes'],
          screenKeywords: ['paragraph', 'sentence', 'chapter', 'article']
        },
        weight: 0.75
      },

      // BROWSING: Browser without specific research patterns
      {
        context: ActivityContext.BROWSING,
        conditions: {
          appPatterns: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Arc']
        },
        weight: 0.5
      },

      // IDLE: Low activity
      {
        context: ActivityContext.IDLE,
        conditions: {
          // No specific conditions - detected by absence of other signals
        },
        weight: 0.3
      }
    ];
  }

  /**
   * Analyze app switch to detect context
   */
  analyzeAppSwitch(appName: string, windowTitle: string): void {
    // Add to recent apps buffer
    this.recentApps.push(appName);
    if (this.recentApps.length > 10) {
      this.recentApps.shift();
    }

    // Detect context based on app and window
    const signals: ContextSignals = {
      appName,
      windowTitle
    };

    this.detectContext(signals);
  }

  /**
   * Analyze screenshot to detect context
   */
  analyzeScreenshot(screenshotPath: string, extractedText?: string): void {
    const signals: ContextSignals = {
      screenshotPath,
      extractedText
    };

    this.detectContext(signals);
  }

  /**
   * Analyze audio to detect context
   */
  analyzeAudio(audioData: { audioLevel: number; isSpeech: boolean; beatDetected: boolean }): void {
    const signals: ContextSignals = {
      audioLevel: audioData.audioLevel,
      isSpeech: audioData.isSpeech,
      beatDetected: audioData.beatDetected
    };

    // Add to recent audio buffer
    this.recentAudioSignals.push(signals);
    if (this.recentAudioSignals.length > 20) {
      this.recentAudioSignals.shift();
    }

    this.detectContext(signals);
  }

  /**
   * Main context detection logic
   */
  private detectContext(newSignals: ContextSignals): void {
    // Merge with recent signals for more accurate detection
    const allSignals = this.mergeSignals(newSignals);

    // Score each context based on rules
    const scores = this.scoreContexts(allSignals);

    // Get highest scoring context
    const bestMatch = scores.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    // Only change context if confidence is high enough
    if (bestMatch.score > 0.6 && bestMatch.context !== this.currentContext) {
      const previousContext = this.currentContext;
      this.currentContext = bestMatch.context;

      const detection: ContextDetection = {
        context: bestMatch.context,
        confidence: bestMatch.score,
        signals: bestMatch.signals,
        metadata: {
          previousContext,
          allSignals
        },
        timestamp: new Date()
      };

      this.contextHistory.push(detection);

      // Trim history
      if (this.contextHistory.length > 100) {
        this.contextHistory = this.contextHistory.slice(-50);
      }

      logger.info('📍 Context detected', {
        context: ActivityContext[bestMatch.context],
        confidence: `${Math.round(bestMatch.score * 100)}%`,
        signals: bestMatch.signals
      });

      this.emit('context:changed', bestMatch.context);
      this.emit('context:detected', detection);
    }
  }

  /**
   * Merge new signals with recent signals for context
   */
  private mergeSignals(newSignals: ContextSignals): ContextSignals {
    // Get most recent app
    const recentApp = this.recentApps[this.recentApps.length - 1];

    // Get recent audio state (average of last few samples)
    const recentAudio = this.recentAudioSignals.slice(-5);
    const avgAudioLevel = recentAudio.length > 0
      ? recentAudio.reduce((sum, s) => sum + (s.audioLevel || 0), 0) / recentAudio.length
      : 0;

    const anySpeech = recentAudio.some(s => s.isSpeech);
    const anyBeat = recentAudio.some(s => s.beatDetected);

    return {
      appName: newSignals.appName || recentApp,
      windowTitle: newSignals.windowTitle,
      audioLevel: newSignals.audioLevel !== undefined ? newSignals.audioLevel : avgAudioLevel,
      isSpeech: newSignals.isSpeech !== undefined ? newSignals.isSpeech : anySpeech,
      beatDetected: newSignals.beatDetected !== undefined ? newSignals.beatDetected : anyBeat,
      screenshotPath: newSignals.screenshotPath,
      extractedText: newSignals.extractedText
    };
  }

  /**
   * Score each possible context against current signals
   */
  private scoreContexts(signals: ContextSignals): Array<{
    context: ActivityContext;
    score: number;
    signals: string[];
  }> {
    const results: Array<{
      context: ActivityContext;
      score: number;
      signals: string[];
    }> = [];

    for (const rule of this.contextRules) {
      const { score, matchedSignals } = this.scoreRule(rule, signals);
      results.push({
        context: rule.context,
        score,
        signals: matchedSignals
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Score a single rule against signals
   */
  private scoreRule(rule: ContextRule, signals: ContextSignals): {
    score: number;
    matchedSignals: string[];
  } {
    let score = 0;
    const matchedSignals: string[] = [];
    let totalConditions = 0;
    let metConditions = 0;

    // Check app patterns
    if (rule.conditions.appPatterns) {
      totalConditions++;
      if (signals.appName &&
          rule.conditions.appPatterns.some(pattern =>
            signals.appName!.toLowerCase().includes(pattern.toLowerCase())
          )) {
        metConditions++;
        matchedSignals.push(`app:${signals.appName}`);
      }
    }

    // Check window patterns
    if (rule.conditions.windowPatterns) {
      totalConditions++;
      if (signals.windowTitle &&
          rule.conditions.windowPatterns.some(pattern =>
            signals.windowTitle!.toLowerCase().includes(pattern.toLowerCase())
          )) {
        metConditions++;
        matchedSignals.push(`window:${signals.windowTitle}`);
      }
    }

    // Check audio required
    if (rule.conditions.audioRequired !== undefined) {
      totalConditions++;
      if (signals.audioLevel && signals.audioLevel > 0.2) {
        metConditions++;
        matchedSignals.push('audio:present');
      }
    }

    // Check speech required
    if (rule.conditions.speechRequired !== undefined) {
      totalConditions++;
      if (signals.isSpeech) {
        metConditions++;
        matchedSignals.push('speech:detected');
      }
    }

    // Check beat required
    if (rule.conditions.beatRequired !== undefined) {
      totalConditions++;
      if (signals.beatDetected) {
        metConditions++;
        matchedSignals.push('beat:detected');
      }
    }

    // Check screen keywords
    if (rule.conditions.screenKeywords) {
      totalConditions++;
      if (signals.extractedText &&
          rule.conditions.screenKeywords.some(keyword =>
            signals.extractedText!.toLowerCase().includes(keyword.toLowerCase())
          )) {
        metConditions++;
        matchedSignals.push('screen:keywords_matched');
      }
    }

    // Calculate score based on conditions met
    if (totalConditions > 0) {
      const conditionScore = metConditions / totalConditions;
      score = conditionScore * rule.weight;
    }

    return { score, matchedSignals };
  }

  /**
   * Get current context
   */
  getCurrentContext(): ActivityContext {
    return this.currentContext;
  }

  /**
   * Get context history
   */
  getContextHistory(limit: number = 20): ContextDetection[] {
    return this.contextHistory.slice(-limit);
  }

  /**
   * Get context confidence
   */
  getCurrentConfidence(): number {
    const latest = this.contextHistory[this.contextHistory.length - 1];
    return latest ? latest.confidence : 0;
  }

  /**
   * Force context change (for testing or manual override)
   */
  setContext(context: ActivityContext, reason: string = 'manual_override'): void {
    const previousContext = this.currentContext;
    this.currentContext = context;

    const detection: ContextDetection = {
      context,
      confidence: 1.0,
      signals: [reason],
      metadata: { previousContext, manual: true },
      timestamp: new Date()
    };

    this.contextHistory.push(detection);

    logger.info('📍 Context manually set', {
      context: ActivityContext[context],
      reason
    });

    this.emit('context:changed', context);
    this.emit('context:detected', detection);
  }

  /**
   * Get context statistics
   */
  getStats(): {
    currentContext: ActivityContext;
    currentConfidence: number;
    totalDetections: number;
    contextDistribution: Record<string, number>;
  } {
    const distribution: Record<string, number> = {};

    for (const detection of this.contextHistory) {
      const contextName = ActivityContext[detection.context];
      distribution[contextName] = (distribution[contextName] || 0) + 1;
    }

    return {
      currentContext: this.currentContext,
      currentConfidence: this.getCurrentConfidence(),
      totalDetections: this.contextHistory.length,
      contextDistribution: distribution
    };
  }
}
