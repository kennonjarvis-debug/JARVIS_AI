/**
 * Unified Agent System Configuration
 *
 * Centralized configuration for all autonomous and proactive agent features
 */

import { AgentConfig, ClearanceLevel } from './types.js';

/**
 * Default configuration
 */
export const defaultConfig: AgentConfig = {
  enabled: process.env.AUTONOMOUS_ENABLED === 'true',
  analysisInterval: parseInt(process.env.AUTONOMOUS_ANALYSIS_INTERVAL || '300000', 10), // 5 minutes
  maxConcurrentTasks: parseInt(process.env.AUTONOMOUS_MAX_CONCURRENT_TASKS || '3', 10),
  globalClearance: (process.env.AUTONOMOUS_CLEARANCE as ClearanceLevel) || ClearanceLevel.SUGGEST,

  autoApprove: {
    readOnly: process.env.AUTONOMOUS_AUTO_APPROVE_READ_ONLY === 'true',
    suggestionsOnly: process.env.AUTONOMOUS_AUTO_APPROVE_SUGGESTIONS === 'true',
    modifySafe: process.env.AUTONOMOUS_AUTO_APPROVE_MODIFY_SAFE === 'false',
    modifyProduction: process.env.AUTONOMOUS_AUTO_APPROVE_MODIFY_PRODUCTION === 'false'
  },

  proactive: {
    enabled: process.env.PROACTIVE_ENABLED === 'true',
    maxNotificationsPerHour: parseInt(process.env.PROACTIVE_MAX_PER_HOUR || '5', 10),
    maxNotificationsPerDay: parseInt(process.env.PROACTIVE_MAX_PER_DAY || '20', 10),
    minTimeBetweenNotifications: parseInt(process.env.PROACTIVE_MIN_INTERVAL || '15', 10),
    respectDoNotDisturb: process.env.PROACTIVE_RESPECT_DND !== 'false',
    confidenceThreshold: parseFloat(process.env.PROACTIVE_CONFIDENCE || '0.6')
  },

  learning: {
    enabled: process.env.LEARNING_ENABLED === 'true',
    learningRate: parseFloat(process.env.LEARNING_RATE || '0.7'),
    confidenceThreshold: parseFloat(process.env.LEARNING_CONFIDENCE || '0.75'),
    maxPatternsPerDomain: parseInt(process.env.LEARNING_MAX_PATTERNS || '100', 10),
    retentionDays: parseInt(process.env.LEARNING_RETENTION_DAYS || '90', 10),
    autoAdapt: process.env.LEARNING_AUTO_ADAPT === 'true'
  }
};

/**
 * Production-safe configuration
 */
export const productionConfig: Partial<AgentConfig> = {
  globalClearance: ClearanceLevel.SUGGEST,
  autoApprove: {
    readOnly: true,
    suggestionsOnly: true,
    modifySafe: false,
    modifyProduction: false
  },
  learning: {
    ...defaultConfig.learning,
    autoAdapt: false // Require human approval in production
  }
};

/**
 * Development configuration
 */
export const developmentConfig: Partial<AgentConfig> = {
  globalClearance: ClearanceLevel.MODIFY_SAFE,
  autoApprove: {
    readOnly: true,
    suggestionsOnly: true,
    modifySafe: true,
    modifyProduction: false
  },
  learning: {
    ...defaultConfig.learning,
    autoAdapt: true,
    learningRate: 0.8 // Learn faster in development
  }
};

/**
 * Get config based on environment
 */
export function getConfig(): AgentConfig {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    return { ...defaultConfig, ...productionConfig };
  }

  return { ...defaultConfig, ...developmentConfig };
}
