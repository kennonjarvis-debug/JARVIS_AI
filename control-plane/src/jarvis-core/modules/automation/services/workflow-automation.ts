/**
 * Workflow Automation Service
 *
 * Handles CI/CD pipeline automation and business workflow orchestration
 * Integrates with GitHub Actions, Docker, and deployment systems
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WorkflowResult {
  workflow: string;
  status: 'success' | 'failed' | 'running';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  output?: string;
  error?: string;
  steps: Array<{
    name: string;
    status: 'success' | 'failed' | 'skipped';
    duration: number;
  }>;
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  steps: Array<{
    name: string;
    command: string;
    continueOnError?: boolean;
  }>;
}

export class WorkflowAutomation {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private runningWorkflows: Map<string, WorkflowResult> = new Map();
  private workflowHistory: WorkflowResult[] = [];

  async initialize(): Promise<void> {
    console.log('[WorkflowAutomation] Initialized');

    // Register default workflows
    this.registerDefaultWorkflows();
  }

  async shutdown(): Promise<void> {
    console.log('[WorkflowAutomation] Shutting down');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      registeredWorkflows: Array.from(this.workflows.keys()),
      runningWorkflows: Array.from(this.runningWorkflows.keys()),
      completedWorkflows: this.workflowHistory.length,
    };
  }

  /**
   * Register default workflows
   */
  private registerDefaultWorkflows(): void {
    // Test & Build workflow
    this.registerWorkflow({
      name: 'test-and-build',
      description: 'Run tests and build the application',
      steps: [
        { name: 'Install dependencies', command: 'npm ci' },
        { name: 'Run linter', command: 'npm run lint', continueOnError: true },
        { name: 'Run type check', command: 'npm run typecheck' },
        { name: 'Run tests', command: 'npm run test' },
        { name: 'Build application', command: 'npm run build' },
      ],
    });

    // Deploy workflow
    this.registerWorkflow({
      name: 'deploy-production',
      description: 'Deploy to production environment',
      steps: [
        { name: 'Run pre-deploy tests', command: 'npm run test' },
        { name: 'Build for production', command: 'npm run build' },
        { name: 'Generate Prisma client', command: 'npx prisma generate' },
        { name: 'Run migrations', command: 'npx prisma migrate deploy' },
        { name: 'Deploy to server', command: 'echo "Deploy command here"' },
        { name: 'Health check', command: 'curl -f http://localhost:3001/health || exit 1' },
      ],
    });

    // Database maintenance workflow
    this.registerWorkflow({
      name: 'database-maintenance',
      description: 'Perform database maintenance tasks',
      steps: [
        { name: 'Backup database', command: 'echo "Backup database"' },
        { name: 'Optimize tables', command: 'echo "Optimize tables"' },
        { name: 'Update statistics', command: 'echo "Update statistics"' },
        { name: 'Vacuum old data', command: 'echo "Vacuum old data"' },
      ],
    });

    // Monitoring setup workflow
    this.registerWorkflow({
      name: 'setup-monitoring',
      description: 'Set up monitoring and alerting',
      steps: [
        { name: 'Start Prometheus', command: 'docker-compose -f config/docker-compose.monitoring.yml up -d prometheus' },
        { name: 'Start Grafana', command: 'docker-compose -f config/docker-compose.monitoring.yml up -d grafana' },
        { name: 'Configure data sources', command: 'echo "Configure Grafana data sources"' },
        { name: 'Import dashboards', command: 'echo "Import Grafana dashboards"' },
      ],
    });

    // Cleanup workflow
    this.registerWorkflow({
      name: 'cleanup-resources',
      description: 'Clean up temporary resources and logs',
      steps: [
        { name: 'Remove old logs', command: 'find ./logs -name "*.log" -mtime +7 -delete' },
        { name: 'Clean temp files', command: 'rm -rf /tmp/ai-dawg-*' },
        { name: 'Prune Docker images', command: 'docker system prune -f' },
        { name: 'Clear build cache', command: 'rm -rf .next dist' },
      ],
    });
  }

  /**
   * Register a custom workflow
   */
  registerWorkflow(definition: WorkflowDefinition): void {
    this.workflows.set(definition.name, definition);
    console.log(`[WorkflowAutomation] Registered workflow: ${definition.name}`);
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflow: string, params: Record<string, any> = {}): Promise<WorkflowResult> {
    const definition = this.workflows.get(workflow);
    if (!definition) {
      throw new Error(`Workflow not found: ${workflow}`);
    }

    // Check if workflow is already running
    if (this.runningWorkflows.has(workflow)) {
      throw new Error(`Workflow already running: ${workflow}`);
    }

    const result: WorkflowResult = {
      workflow,
      status: 'running',
      startedAt: new Date(),
      steps: [],
    };

    this.runningWorkflows.set(workflow, result);

    try {
      console.log(`[WorkflowAutomation] Executing workflow: ${workflow}`);

      // Execute each step
      for (const step of definition.steps) {
        const stepStartTime = Date.now();

        try {
          console.log(`[WorkflowAutomation] Running step: ${step.name}`);

          // Replace placeholders in command with params
          let command = step.command;
          for (const [key, value] of Object.entries(params)) {
            command = command.replace(`{{${key}}}`, String(value));
          }

          // Execute command
          const { stdout, stderr } = await execAsync(command, {
            timeout: 300000, // 5 minutes timeout
          });

          result.steps.push({
            name: step.name,
            status: 'success',
            duration: Date.now() - stepStartTime,
          });

          if (stdout) {
            console.log(`[WorkflowAutomation] ${step.name} output:`, stdout);
          }
        } catch (error) {
          const stepError = error as Error;

          result.steps.push({
            name: step.name,
            status: 'failed',
            duration: Date.now() - stepStartTime,
          });

          if (!step.continueOnError) {
            throw new Error(`Step failed: ${step.name} - ${stepError.message}`);
          }

          console.warn(`[WorkflowAutomation] Step failed but continuing: ${step.name}`);
        }
      }

      // Workflow succeeded
      result.status = 'success';
      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - result.startedAt.getTime();

      console.log(`[WorkflowAutomation] Workflow completed: ${workflow} in ${result.duration}ms`);
    } catch (error) {
      // Workflow failed
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - result.startedAt.getTime();

      console.error(`[WorkflowAutomation] Workflow failed: ${workflow}`, error);
    } finally {
      // Clean up
      this.runningWorkflows.delete(workflow);
      this.workflowHistory.push(result);

      // Keep only last 100 workflow results
      if (this.workflowHistory.length > 100) {
        this.workflowHistory.shift();
      }
    }

    return result;
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflow: string): WorkflowResult | null {
    return this.runningWorkflows.get(workflow) || null;
  }

  /**
   * Get workflow history
   */
  getWorkflowHistory(workflow?: string): WorkflowResult[] {
    if (workflow) {
      return this.workflowHistory.filter((r) => r.workflow === workflow);
    }
    return this.workflowHistory;
  }

  /**
   * Cancel a running workflow
   */
  async cancelWorkflow(workflow: string): Promise<boolean> {
    const running = this.runningWorkflows.get(workflow);
    if (!running) {
      return false;
    }

    // In a production system, you would kill the actual process here
    console.log(`[WorkflowAutomation] Cancelling workflow: ${workflow}`);

    running.status = 'failed';
    running.error = 'Cancelled by user';
    running.completedAt = new Date();
    running.duration = running.completedAt.getTime() - running.startedAt.getTime();

    this.runningWorkflows.delete(workflow);
    this.workflowHistory.push(running);

    return true;
  }

  /**
   * List available workflows
   */
  listWorkflows(): Array<{ name: string; description: string; steps: number }> {
    return Array.from(this.workflows.values()).map((w) => ({
      name: w.name,
      description: w.description,
      steps: w.steps.length,
    }));
  }
}
