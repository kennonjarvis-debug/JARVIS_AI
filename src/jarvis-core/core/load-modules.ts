/**
 * Jarvis Module Loader
 * Imports and registers all Jarvis modules
 */

import { moduleRegistry } from './module-registry';
import { logger } from '../../backend/utils/logger';

// Import all modules
import musicModule from '../modules/music';
import marketingModule from '../modules/marketing';
import engagementModule from '../modules/engagement';
import automationModule from '../modules/automation';
import testingModule from '../modules/testing';
import autoAdaptationModule from '../modules/auto-adaptation';

/**
 * Load and register all Jarvis modules
 * Modules are registered in priority order (lower number = higher priority)
 */
export async function loadAllModules(): Promise<void> {
  logger.info('Loading Jarvis modules...');

  try {
    // Register music module (priority 1 - highest)
    // Music generation is core functionality
    moduleRegistry.register(musicModule, {
      enabled: true,
      priority: 1,
      settings: {
        vocalCoachEnabled: true,
        producerAIEnabled: true,
        autoToplineEnabled: true,
        voiceCloneEnabled: true,
      },
      features: {
        pitchCorrection: true,
        chordGeneration: true,
        melodyGeneration: true,
        drumGeneration: true,
      },
      limits: {
        maxConcurrency: 5,
        maxMemoryMB: 512,
        timeoutMs: 300000, // 5 minutes
      },
    });

    logger.info('Music module registered');

    // Register marketing module (priority 2)
    // Marketing automation and analytics
    moduleRegistry.register(marketingModule, {
      enabled: true,
      priority: 2,
      settings: {
        gptAnalyticsEnabled: true,
        contentGenerationEnabled: true,
        campaignAutomationEnabled: true,
        revenueTrackingEnabled: true,
      },
      features: {
        blogGeneration: true,
        socialMedia: true,
        emailCampaigns: true,
        seoOptimization: true,
      },
      limits: {
        maxConcurrency: 10,
        maxMemoryMB: 256,
        timeoutMs: 120000, // 2 minutes
      },
    });

    logger.info('Marketing module registered');

    // Register engagement module (priority 3)
    // User engagement and churn prevention
    moduleRegistry.register(engagementModule, {
      enabled: true,
      priority: 3,
      settings: {
        chatbotEnabled: true,
        sentimentAnalysisEnabled: true,
        churnDetectionEnabled: true,
        proactiveOutreachEnabled: true,
      },
      features: {
        supportChat: true,
        healthMonitoring: true,
        autoEngagement: true,
        feedbackAnalysis: true,
      },
      limits: {
        maxConcurrency: 20,
        maxMemoryMB: 256,
        timeoutMs: 60000, // 1 minute
      },
    });

    logger.info('Engagement module registered');

    // Register automation module (priority 4)
    // Business process automation
    moduleRegistry.register(automationModule, {
      enabled: true,
      priority: 4,
      settings: {
        workflowAutomationEnabled: true,
        biEngineEnabled: true,
        predictivePlanningEnabled: true,
        cicdIntegrationEnabled: true,
      },
      features: {
        dataAggregation: true,
        metricsReporting: true,
        forecasting: true,
        alerting: true,
      },
      limits: {
        maxConcurrency: 15,
        maxMemoryMB: 512,
        timeoutMs: 180000, // 3 minutes
      },
    });

    logger.info('Automation module registered');

    // Register testing module (priority 5)
    // Autonomous test orchestration and quality assurance
    moduleRegistry.register(testingModule, {
      enabled: true,
      priority: 5,
      settings: {
        autoFixEnabled: true,
        pythonOrchestratorEnabled: true,
        e2eTestingEnabled: true,
        dailyTestsEnabled: true,
      },
      features: {
        testOrchestration: true,
        autoDebug: true,
        healthReporting: true,
        preDeployValidation: true,
      },
      limits: {
        maxConcurrency: 3,
        maxMemoryMB: 1024,
        timeoutMs: 600000, // 10 minutes
      },
    });

    logger.info('Testing module registered');

    // Register auto-adaptation module (priority 6)
    // Analytics-driven autonomous optimization
    moduleRegistry.register(autoAdaptationModule, {
      enabled: true,
      priority: 6,
      settings: {
        analysisIntervalMinutes: 60,
        minVitalityForAdaptation: 60,
        maxConcurrentAdaptations: 3,
        lowTierAutoExecute: true,
        mediumTierDelayMinutes: 5,
      },
      features: {
        autoOptimization: true,
        analyticsEngine: true,
        tieredAutonomy: true,
        learningEnabled: true,
      },
      limits: {
        maxConcurrency: 3,
        maxMemoryMB: 256,
        timeoutMs: 300000, // 5 minutes
      },
    });

    logger.info('Auto-Adaptation module registered');

    const stats = moduleRegistry.getStats();
    logger.info('All Jarvis modules loaded successfully', {
      totalModules: stats.totalModules,
      enabledModules: stats.enabledModules,
      modules: stats.moduleList.map(m => m.name),
    });
  } catch (error) {
    logger.error('Failed to load Jarvis modules', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
}

/**
 * Get module configuration summary
 */
export function getModuleConfiguration(): {
  modules: Array<{
    name: string;
    version: string;
    priority: number;
    enabled: boolean;
    features: string[];
  }>;
} {
  const stats = moduleRegistry.getStats();

  return {
    modules: stats.moduleList.map(m => ({
      name: m.name,
      version: m.version,
      priority: m.priority,
      enabled: m.enabled,
      features: [], // Features would be extracted from config
    })),
  };
}
