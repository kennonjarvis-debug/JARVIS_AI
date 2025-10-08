/**
 * Jarvis Automation Module
 *
 * Handles:
 * - BI data aggregation (daily/weekly metrics)
 * - Predictive planning with GPT forecasting
 * - CI/CD workflow automation
 * - Resource scaling for AI workloads
 * - Scheduled reporting
 */
import { Router } from 'express';
import { BaseModule } from '../../core/base-module';
import {
  JarvisCommand,
  JarvisCommandResult,
  ModuleHealth,
  ScheduledJob,
} from '../../core/jarvis.interfaces';
import { MetricsAggregator } from './services/metrics-aggregator';
import { ForecastingService } from './services/forecasting';
import { WorkflowAutomation } from './services/workflow-automation';
import { ResourceScaler } from './services/resource-scaler';

export class AutomationModule extends BaseModule {
  name = 'automation';
  version = '1.0.0';
  description = 'Business automation, BI aggregation, and predictive planning';

  private metricsAggregator: MetricsAggregator;
  private forecastingService: ForecastingService;
  private workflowAutomation: WorkflowAutomation;
  private resourceScaler: ResourceScaler;

  // Stats
  private aggregationsRun = 0;
  private forecastsGenerated = 0;
  private workflowsExecuted = 0;
  private scalingActions = 0;

  constructor() {
    super();

    // Initialize services
    this.metricsAggregator = new MetricsAggregator();
    this.forecastingService = new ForecastingService();
    this.workflowAutomation = new WorkflowAutomation();
    this.resourceScaler = new ResourceScaler();

    // Register commands
    this.registerCommand('aggregate-metrics', this.handleAggregateMetrics.bind(this));
    this.registerCommand('generate-forecast', this.handleGenerateForecast.bind(this));
    this.registerCommand('execute-workflow', this.handleExecuteWorkflow.bind(this));
    this.registerCommand('scale-resources', this.handleScaleResources.bind(this));
    this.registerCommand('generate-report', this.handleGenerateReport.bind(this));
    this.registerCommand('get-stats', this.handleGetStats.bind(this));
  }

  /**
   * Initialize automation services
   */
  protected async onInitialize(): Promise<void> {
    this.logger.info('Initializing automation module...');

    // Initialize all services
    await this.metricsAggregator.initialize();
    await this.forecastingService.initialize();
    await this.workflowAutomation.initialize();
    await this.resourceScaler.initialize();

    this.logger.info('Automation module initialized successfully');
  }

  /**
   * Shutdown automation services
   */
  protected async onShutdown(): Promise<void> {
    this.logger.info('Shutting down automation module...');

    // Graceful shutdown of all services
    await this.metricsAggregator.shutdown();
    await this.forecastingService.shutdown();
    await this.workflowAutomation.shutdown();
    await this.resourceScaler.shutdown();

    this.logger.info('Automation module shut down successfully');
  }

  /**
   * Register API routes
   */
  protected onRegisterRoutes(router: Router): void {
    // GET /jarvis/automation/stats
    router.get('/stats', (req, res) => {
      res.json({
        aggregationsRun: this.aggregationsRun,
        forecastsGenerated: this.forecastsGenerated,
        workflowsExecuted: this.workflowsExecuted,
        scalingActions: this.scalingActions,
        services: {
          metricsAggregator: this.metricsAggregator.getStatus(),
          forecastingService: this.forecastingService.getStatus(),
          workflowAutomation: this.workflowAutomation.getStatus(),
          resourceScaler: this.resourceScaler.getStatus(),
        },
      });
    });

    // POST /jarvis/automation/aggregate
    router.post('/aggregate', async (req, res) => {
      try {
        const { type = 'daily', force = false } = req.body;
        const result = await this.metricsAggregator.runAggregation(type, force);
        this.aggregationsRun++;
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // POST /jarvis/automation/forecast
    router.post('/forecast', async (req, res) => {
      try {
        const { metric, horizon = 30 } = req.body;
        const forecast = await this.forecastingService.generateForecast(metric, horizon);
        this.forecastsGenerated++;
        res.json({ success: true, forecast });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // POST /jarvis/automation/workflow
    router.post('/workflow', async (req, res) => {
      try {
        const { workflow, params = {} } = req.body;
        const result = await this.workflowAutomation.executeWorkflow(workflow, params);
        this.workflowsExecuted++;
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // POST /jarvis/automation/scale
    router.post('/scale', async (req, res) => {
      try {
        const { resource, action } = req.body;
        const result = await this.resourceScaler.scaleResource(resource, action);
        this.scalingActions++;
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  /**
   * Get health metrics
   */
  protected async onGetHealthMetrics(): Promise<ModuleHealth['metrics']> {
    return {
      aggregationsRun: this.aggregationsRun,
      forecastsGenerated: this.forecastsGenerated,
      workflowsExecuted: this.workflowsExecuted,
      scalingActions: this.scalingActions,
      errorRate: 0, // Would track actual errors in production
      cpuUsage: 0,
      memoryUsage: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
    };
  }

  /**
   * Register scheduled jobs
   */
  protected onGetScheduledJobs(): ScheduledJob[] {
    return [
      {
        id: 'daily-metrics-aggregation',
        name: 'Daily Metrics Aggregation',
        schedule: '0 0 * * *', // Daily at midnight
        enabled: true,
        description: 'Aggregate daily metrics from all systems',
        handler: async () => {
          this.logger.info('Running daily metrics aggregation...');
          await this.metricsAggregator.runAggregation('daily');
          this.aggregationsRun++;
        },
      },
      {
        id: 'weekly-report-generation',
        name: 'Weekly Report Generation',
        schedule: '0 9 * * 1', // Monday at 9am
        enabled: true,
        description: 'Generate weekly automation reports',
        handler: async () => {
          this.logger.info('Generating weekly report...');
          await this.generateWeeklyReport();
        },
      },
      {
        id: 'hourly-resource-check',
        name: 'Hourly Resource Check',
        schedule: '0 * * * *', // Every hour
        enabled: true,
        description: 'Check and scale resources as needed',
        handler: async () => {
          this.logger.info('Checking resource utilization...');
          await this.resourceScaler.checkAndScale();
        },
      },
      {
        id: 'forecast-update',
        name: 'Forecast Update',
        schedule: '0 6 * * *', // Daily at 6am
        enabled: true,
        description: 'Update predictive forecasts',
        handler: async () => {
          this.logger.info('Updating forecasts...');
          await this.forecastingService.updateAllForecasts();
          this.forecastsGenerated++;
        },
      },
    ];
  }

  // ==================== Command Handlers ====================

  /**
   * Handle aggregate-metrics command
   */
  private async handleAggregateMetrics(cmd: JarvisCommand): Promise<JarvisCommandResult> {
    const startTime = Date.now();
    const { type = 'daily', force = false } = cmd.parameters || {};

    try {
      const result = await this.metricsAggregator.runAggregation(type, force);
      this.aggregationsRun++;

      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime: Date.now() - startTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Handle generate-forecast command
   */
  private async handleGenerateForecast(cmd: JarvisCommand): Promise<JarvisCommandResult> {
    const startTime = Date.now();
    const { metric, horizon = 30 } = cmd.parameters || {};

    if (!metric) {
      return {
        success: false,
        error: 'Missing required parameter: metric',
        metadata: {
          executionTime: Date.now() - startTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    }

    try {
      const forecast = await this.forecastingService.generateForecast(metric, horizon);
      this.forecastsGenerated++;

      return {
        success: true,
        data: forecast,
        metadata: {
          executionTime: Date.now() - startTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime: Date.now() - startTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Handle execute-workflow command
   */
  private async handleExecuteWorkflow(cmd: JarvisCommand): Promise<JarvisCommandResult> {
    const startTime = Date.now();
    const { workflow, params = {} } = cmd.parameters || {};

    if (!workflow) {
      return {
        success: false,
        error: 'Missing required parameter: workflow',
        metadata: {
          executionTime: Date.now() - startTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    }

    try {
      const result = await this.workflowAutomation.executeWorkflow(workflow, params);
      this.workflowsExecuted++;

      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime: Date.now() - startTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Handle scale-resources command
   */
  private async handleScaleResources(cmd: JarvisCommand): Promise<JarvisCommandResult> {
    const startTime = Date.now();
    const { resource, action } = cmd.parameters || {};

    if (!resource || !action) {
      return {
        success: false,
        error: 'Missing required parameters: resource, action',
        metadata: {
          executionTime: Date.now() - startTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    }

    try {
      const result = await this.resourceScaler.scaleResource(resource, action);
      this.scalingActions++;

      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime: Date.now() - startTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Handle generate-report command
   */
  private async handleGenerateReport(cmd: JarvisCommand): Promise<JarvisCommandResult> {
    const startTime = Date.now();
    const { type = 'weekly', format = 'json' } = cmd.parameters || {};

    // Validate type
    const validTypes: Array<'daily' | 'weekly' | 'monthly'> = ['daily', 'weekly', 'monthly'];
    const reportType = validTypes.includes(type as any) ? (type as 'daily' | 'weekly' | 'monthly') : 'weekly';

    try {
      const report = await this.generateReport(reportType, format);

      return {
        success: true,
        data: report,
        metadata: {
          executionTime: Date.now() - startTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime: Date.now() - startTime,
          module: this.name,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Handle get-stats command
   */
  private async handleGetStats(cmd: JarvisCommand): Promise<JarvisCommandResult> {
    const startTime = Date.now();

    return {
      success: true,
      data: {
        aggregationsRun: this.aggregationsRun,
        forecastsGenerated: this.forecastsGenerated,
        workflowsExecuted: this.workflowsExecuted,
        scalingActions: this.scalingActions,
        uptime: this.getUptime(),
      },
      metadata: {
        executionTime: Date.now() - startTime,
        module: this.name,
        timestamp: new Date(),
      },
    };
  }

  // ==================== Helper Methods ====================

  /**
   * Generate weekly report
   */
  private async generateWeeklyReport(): Promise<any> {
    return this.generateReport('weekly', 'json');
  }

  /**
   * Generate report
   */
  private async generateReport(type: 'daily' | 'weekly' | 'monthly', format: string): Promise<any> {
    const metrics = await this.metricsAggregator.getAggregatedMetrics(type);
    const forecasts = await this.forecastingService.getAllForecasts();

    return {
      type,
      format,
      generatedAt: new Date().toISOString(),
      metrics,
      forecasts,
      summary: {
        totalAggregations: this.aggregationsRun,
        totalForecasts: this.forecastsGenerated,
        totalWorkflows: this.workflowsExecuted,
        totalScalingActions: this.scalingActions,
      },
    };
  }
}

// Export singleton instance
export default new AutomationModule();
