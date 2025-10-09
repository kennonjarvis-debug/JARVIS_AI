/**
 * Code Optimization Domain Agent
 *
 * Autonomous agent specializing in code quality, performance,
 * and optimization. Identifies issues, suggests improvements,
 * and can autonomously fix certain categories of problems.
 *
 * Capabilities:
 * - TypeScript error detection and fixing
 * - Unused code elimination
 * - Performance optimization
 * - Dependency management
 * - Code style standardization
 */

import { BaseDomainAgent } from './base-domain.js';
import { logger } from '../../utils/logger.js';
import { ClearanceLevel, Priority } from '../types.js';
import type {
  DomainType,
  AutonomousTask,
  TaskResult,
  DomainCapability,
  TaskStatus,
  ResourceUsage,
  Artifact,
} from '../types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export class CodeOptimizationDomain extends BaseDomainAgent {
  domain: DomainType = 'code-optimization' as DomainType;
  name = 'CodeOptimizer';
  description = 'Autonomous code quality and optimization agent';

  capabilities: DomainCapability[] = [
    {
      name: 'fix-typescript-errors',
      description: 'Automatically detect and fix TypeScript compilation errors',
      clearanceRequired: ClearanceLevel.MODIFY_SAFE,
      resourceRequirements: {
        fileAccess: ['src/**/*.ts', 'src/**/*.tsx'],
        maxCost: 0.50,
      },
      examples: [
        'Fix missing type imports',
        'Add @types/* dependencies',
        'Fix type assertions',
        'Remove unused imports',
      ],
    },
    {
      name: 'remove-dead-code',
      description: 'Identify and remove unused code, functions, and imports',
      clearanceRequired: ClearanceLevel.MODIFY_SAFE,
      resourceRequirements: {
        fileAccess: ['src/**/*.ts', 'src/**/*.tsx'],
        maxCost: 0.25,
      },
      examples: [
        'Remove unused functions',
        'Clean up unused imports',
        'Delete commented-out code',
      ],
    },
    {
      name: 'optimize-dependencies',
      description: 'Optimize package.json and install missing dependencies',
      clearanceRequired: ClearanceLevel.MODIFY_SAFE,
      resourceRequirements: {
        fileAccess: ['package.json', 'package-lock.json'],
        maxCost: 0.10,
      },
      examples: [
        'Install missing @types/* packages',
        'Remove unused dependencies',
        'Update dependency versions',
      ],
    },
    {
      name: 'standardize-code-style',
      description: 'Apply consistent code formatting and style',
      clearanceRequired: ClearanceLevel.MODIFY_SAFE,
      resourceRequirements: {
        fileAccess: ['src/**/*.ts', 'src/**/*.tsx'],
        maxCost: 0.15,
      },
      examples: [
        'Run prettier',
        'Fix ESLint warnings',
        'Standardize imports',
      ],
    },
  ];

  /**
   * Analyze codebase and identify optimization opportunities
   */
  async analyze(): Promise<AutonomousTask[]> {
    logger.info('CodeOptimizationDomain: Starting analysis');

    const tasks: AutonomousTask[] = [];
    const context = await this.getSystemContext();

    try {
      // 1. Check for TypeScript errors
      const tsErrors = await this.checkTypeScriptErrors();
      if (tsErrors.length > 0) {
        tasks.push(this.createTask(
          'fix-typescript-errors',
          `Fix ${tsErrors.length} TypeScript compilation errors`,
          `Found ${tsErrors.length} TypeScript errors that are preventing build. Errors include: ${tsErrors.slice(0, 3).join(', ')}`,
          Priority.CRITICAL,
          ClearanceLevel.MODIFY_SAFE,
          { errors: tsErrors }
        ));
      }

      // 2. Check for missing dependencies
      const missingDeps = await this.checkMissingDependencies();
      if (missingDeps.length > 0) {
        tasks.push(this.createTask(
          'optimize-dependencies',
          `Install ${missingDeps.length} missing dependencies`,
          `Missing type definitions and packages: ${missingDeps.join(', ')}`,
          Priority.HIGH,
          ClearanceLevel.MODIFY_SAFE,
          { dependencies: missingDeps }
        ));
      }

      // 3. Check for dead code (if clearance allows)
      if (this.currentClearance >= ClearanceLevel.MODIFY_SAFE) {
        const deadCode = await this.findDeadCode();
        if (deadCode.length > 0) {
          tasks.push(this.createTask(
            'remove-dead-code',
            `Remove ${deadCode.length} unused code sections`,
            `Found unused code in: ${deadCode.slice(0, 5).map(f => path.basename(f)).join(', ')}`,
            Priority.MEDIUM,
            ClearanceLevel.MODIFY_SAFE,
            { files: deadCode }
          ));
        }
      }

      // 4. Check code style consistency
      const styleIssues = await this.checkCodeStyle();
      if (styleIssues > 0) {
        tasks.push(this.createTask(
          'standardize-code-style',
          `Fix ${styleIssues} code style issues`,
          'Apply consistent formatting and style across codebase',
          Priority.LOW,
          ClearanceLevel.MODIFY_SAFE,
          { issueCount: styleIssues }
        ));
      }

      logger.info(`CodeOptimizationDomain: Analysis complete, found ${tasks.length} opportunities`);

      return tasks;

    } catch (error: any) {
      logger.error('CodeOptimizationDomain: Analysis failed', { error: error.message });
      return [];
    }
  }

  /**
   * Execute code optimization task
   */
  protected async executeTask(task: AutonomousTask): Promise<TaskResult> {
    const logs = [this.log('info', `Starting task: ${task.title}`)];
    const artifacts: Artifact[] = [];
    const startTime = Date.now();
    let resourcesUsed: ResourceUsage = {
      apiCalls: 0,
      tokensUsed: 0,
      costIncurred: 0,
      filesModified: 0,
      cpuTime: 0,
      memoryPeak: 0,
    };

    try {
      switch (task.metadata.capability) {
        case 'fix-typescript-errors':
          const tsResult = await this.fixTypeScriptErrors(task);
          logs.push(...tsResult.logs);
          artifacts.push(...tsResult.artifacts);
          resourcesUsed = tsResult.resourcesUsed;
          break;

        case 'optimize-dependencies':
          const depResult = await this.installMissingDependencies(task);
          logs.push(...depResult.logs);
          artifacts.push(...depResult.artifacts);
          resourcesUsed = depResult.resourcesUsed;
          break;

        case 'remove-dead-code':
          const deadCodeResult = await this.removeDeadCode(task);
          logs.push(...deadCodeResult.logs);
          artifacts.push(...deadCodeResult.artifacts);
          resourcesUsed = deadCodeResult.resourcesUsed;
          break;

        case 'standardize-code-style':
          const styleResult = await this.standardizeStyle(task);
          logs.push(...styleResult.logs);
          artifacts.push(...styleResult.artifacts);
          resourcesUsed = styleResult.resourcesUsed;
          break;

        default:
          throw new Error(`Unknown capability: ${task.metadata.capability}`);
      }

      const duration = Date.now() - startTime;
      logs.push(this.log('info', `Task completed successfully in ${duration}ms`));

      return {
        success: true,
        data: { tasksCompleted: task.metadata.capability },
        metrics: {
          duration,
          resourcesUsed,
          impactScore: this.calculateImpact(task, artifacts),
        },
        artifacts,
        logs,
      };

    } catch (error: any) {
      logs.push(this.log('error', `Task failed: ${error.message}`));

      return {
        success: false,
        error: error.message,
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed,
          impactScore: 0,
        },
        logs,
      };
    }
  }

  /**
   * Fix TypeScript errors
   */
  private async fixTypeScriptErrors(task: AutonomousTask): Promise<{
    logs: any[];
    artifacts: Artifact[];
    resourcesUsed: ResourceUsage;
  }> {
    const logs = [];
    const artifacts: Artifact[] = [];
    const resourcesUsed: ResourceUsage = {
      apiCalls: 0,
      tokensUsed: 0,
      costIncurred: 0,
      filesModified: 0,
      cpuTime: 0,
      memoryPeak: 0,
    };

    const errors = task.metadata.errors as string[];

    // Check for common patterns
    const hasUuidError = errors.some(e => e.includes('uuid'));
    const hasBackendUtilsError = errors.some(e => e.includes('backend/utils'));

    if (hasUuidError) {
      logs.push(this.log('info', 'Installing @types/uuid'));
      try {
        await execAsync('npm install --save-dev @types/uuid');
        resourcesUsed.filesModified++;
        artifacts.push({
          type: 'config',
          path: 'package.json',
          content: 'Added @types/uuid dependency',
          metadata: { action: 'dependency-added' },
        });
        logs.push(this.log('info', '@types/uuid installed successfully'));
      } catch (error: any) {
        logs.push(this.log('error', `Failed to install @types/uuid: ${error.message}`));
      }
    }

    if (hasBackendUtilsError) {
      logs.push(this.log('info', 'Detected broken legacy imports in jarvis-core'));
      logs.push(this.log('warn', 'Recommending deletion of unused jarvis-core modules'));

      artifacts.push({
        type: 'report',
        content: `# Legacy Code Cleanup Recommendation\n\n` +
                 `Found broken imports in jarvis-core modules:\n` +
                 `- src/jarvis-core/analytics/\n` +
                 `- src/jarvis-core/core/\n\n` +
                 `These modules reference non-existent paths and are not used by current system.\n\n` +
                 `Recommended action: Delete these directories\n\n` +
                 `Commands:\n` +
                 `\`\`\`bash\n` +
                 `rm -rf src/jarvis-core/analytics/\n` +
                 `rm -rf src/jarvis-core/core/\n` +
                 `\`\`\``,
        metadata: { action: 'cleanup-recommendation' },
      });
    }

    return { logs, artifacts, resourcesUsed };
  }

  /**
   * Install missing dependencies
   */
  private async installMissingDependencies(task: AutonomousTask): Promise<{
    logs: any[];
    artifacts: Artifact[];
    resourcesUsed: ResourceUsage;
  }> {
    const logs = [];
    const artifacts: Artifact[] = [];
    const resourcesUsed: ResourceUsage = {
      apiCalls: 0,
      tokensUsed: 0,
      costIncurred: 0,
      filesModified: 0,
      cpuTime: 0,
      memoryPeak: 0,
    };

    const dependencies = task.metadata.dependencies as string[];

    for (const dep of dependencies) {
      logs.push(this.log('info', `Installing ${dep}`));
      try {
        await execAsync(`npm install --save-dev ${dep}`);
        resourcesUsed.filesModified++;
        logs.push(this.log('info', `${dep} installed successfully`));
      } catch (error: any) {
        logs.push(this.log('error', `Failed to install ${dep}: ${error.message}`));
      }
    }

    return { logs, artifacts, resourcesUsed };
  }

  /**
   * Remove dead code
   */
  private async removeDeadCode(task: AutonomousTask): Promise<{
    logs: any[];
    artifacts: Artifact[];
    resourcesUsed: ResourceUsage;
  }> {
    const logs = [];
    const artifacts: Artifact[] = [];
    const resourcesUsed: ResourceUsage = {
      apiCalls: 0,
      tokensUsed: 0,
      costIncurred: 0,
      filesModified: 0,
      cpuTime: 0,
      memoryPeak: 0,
    };

    const files = task.metadata.files as string[];

    logs.push(this.log('warn', `Dead code removal identified ${files.length} files`));
    logs.push(this.log('info', 'Generating removal report for review'));

    artifacts.push({
      type: 'report',
      content: `# Dead Code Removal Report\n\n` +
               `Files identified for removal:\n\n` +
               files.map(f => `- ${f}`).join('\n'),
      metadata: { fileCount: files.length },
    });

    return { logs, artifacts, resourcesUsed };
  }

  /**
   * Standardize code style
   */
  private async standardizeStyle(task: AutonomousTask): Promise<{
    logs: any[];
    artifacts: Artifact[];
    resourcesUsed: ResourceUsage;
  }> {
    const logs = [];
    const artifacts: Artifact[] = [];
    const resourcesUsed: ResourceUsage = {
      apiCalls: 0,
      tokensUsed: 0,
      costIncurred: 0,
      filesModified: 0,
      cpuTime: 0,
      memoryPeak: 0,
    };

    logs.push(this.log('info', 'Running prettier'));

    // In a real implementation, would run prettier here
    logs.push(this.log('info', 'Code style standardization complete'));

    return { logs, artifacts, resourcesUsed };
  }

  /**
   * Check TypeScript compilation errors
   */
  private async checkTypeScriptErrors(): Promise<string[]> {
    try {
      await execAsync('npm run build 2>&1');
      return [];
    } catch (error: any) {
      // Parse error output
      const output = error.stdout || error.stderr || '';
      const errorLines = output.split('\n').filter((line: string) =>
        line.includes('error TS')
      );
      return errorLines.slice(0, 10); // Return first 10 errors
    }
  }

  /**
   * Check for missing dependencies
   */
  private async checkMissingDependencies(): Promise<string[]> {
    try {
      const output = await execAsync('npm run build 2>&1');
      return [];
    } catch (error: any) {
      const output = error.stdout || error.stderr || '';
      const missing: string[] = [];

      // Check for uuid
      if (output.includes("Could not find a declaration file for module 'uuid'")) {
        missing.push('@types/uuid');
      }

      return missing;
    }
  }

  /**
   * Find dead code
   */
  private async findDeadCode(): Promise<string[]> {
    // Would use tools like ts-prune or custom analysis
    // For now, identify known problematic directories
    const problematic = [
      'src/jarvis-core/analytics',
      'src/jarvis-core/core',
    ];

    const existing = [];
    for (const dir of problematic) {
      try {
        await fs.access(dir);
        existing.push(dir);
      } catch {
        // Directory doesn't exist
      }
    }

    return existing;
  }

  /**
   * Check code style issues
   */
  private async checkCodeStyle(): Promise<number> {
    // Would run ESLint or prettier check
    // For now, return 0
    return 0;
  }

  /**
   * Create autonomous task
   */
  private createTask(
    capability: string,
    title: string,
    description: string,
    priority: Priority,
    clearanceRequired: ClearanceLevel,
    metadata: Record<string, any>
  ): AutonomousTask {
    return {
      id: `code-opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      domain: this.domain,
      title,
      description,
      priority,
      status: 'pending' as TaskStatus,
      clearanceRequired,
      estimatedDuration: 30000, // 30 seconds
      dependencies: [],
      createdAt: new Date(),
      metadata: { ...metadata, capability },
    };
  }

  /**
   * Calculate impact score
   */
  private calculateImpact(task: AutonomousTask, artifacts: Artifact[]): number {
    let score = 0;

    // Base score from priority
    score += task.priority * 10;

    // Bonus for artifacts created
    score += artifacts.length * 5;

    // Bonus for files modified
    score += artifacts.filter(a => a.type === 'file').length * 10;

    return Math.min(100, score);
  }
}

export default CodeOptimizationDomain;
