/**
 * Service Controller
 * Manages lifecycle of AI DAWG services (start, stop, restart)
 */

import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { ServiceConfig, ServiceOperation } from './types';
import { ServiceRegistry } from './service-registry';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export class ServiceController {
  private registry: ServiceRegistry;
  private processes: Map<string, ChildProcess>;
  private auditLog: string;

  constructor(registry: ServiceRegistry, auditLogPath: string = '/Users/benkennon/Jarvis/data/audit.log') {
    this.registry = registry;
    this.processes = new Map();
    this.auditLog = auditLogPath;

    // Ensure audit log exists
    const dir = path.dirname(this.auditLog);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Start a service
   */
  async startService(serviceName: string, config: ServiceConfig): Promise<ServiceOperation> {
    const startTime = Date.now();

    try {
      console.log(`🚀 Starting ${config.name} on port ${config.port}...`);

      // Check if port is already in use
      const portInUse = await this.isPortInUse(config.port);
      if (portInUse) {
        console.log(`⚠️  Port ${config.port} already in use, attempting to kill existing process...`);
        await this.killProcessOnPort(config.port);
        await this.sleep(2000); // Wait for port to free up
      }

      // Mark as starting
      this.registry.updateState(serviceName, { status: 'starting' });

      // Ensure logs directory exists
      const logDir = path.dirname(config.log_file);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Start the service
      const process = await this.executeCommand(config.start_command, config.log_file);

      if (process) {
        this.processes.set(serviceName, process);
        this.registry.markRunning(serviceName, process.pid!);

        this.logAudit({
          service: serviceName,
          operation: 'start',
          success: true,
          timestamp: new Date(),
          duration_ms: Date.now() - startTime
        });

        console.log(`✅ ${config.name} started successfully (PID: ${process.pid})`);

        return {
          service: serviceName,
          operation: 'start',
          success: true,
          timestamp: new Date(),
          duration_ms: Date.now() - startTime
        };
      } else {
        throw new Error('Failed to start process');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to start ${config.name}:`, errorMsg);

      this.registry.markStopped(serviceName);

      this.logAudit({
        service: serviceName,
        operation: 'start',
        success: false,
        error: errorMsg,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime
      });

      return {
        service: serviceName,
        operation: 'start',
        success: false,
        error: errorMsg,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Stop a service
   */
  async stopService(serviceName: string, config: ServiceConfig): Promise<ServiceOperation> {
    const startTime = Date.now();

    try {
      console.log(`🛑 Stopping ${config.name}...`);

      this.registry.updateState(serviceName, { status: 'stopping' });

      const process = this.processes.get(serviceName);
      const state = this.registry.getState(serviceName);

      // Try to kill by PID from registry
      if (state?.pid) {
        try {
          await execAsync(`kill ${state.pid}`);
          await this.sleep(1000);

          // Force kill if still running
          try {
            await execAsync(`kill -9 ${state.pid}`);
          } catch {
            // Process already dead
          }
        } catch (error) {
          // Process already dead or not found
        }
      }

      // Try to kill by port
      await this.killProcessOnPort(config.port);

      // Clean up process reference
      if (process) {
        process.kill('SIGTERM');
        this.processes.delete(serviceName);
      }

      this.registry.markStopped(serviceName);

      this.logAudit({
        service: serviceName,
        operation: 'stop',
        success: true,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime
      });

      console.log(`✅ ${config.name} stopped successfully`);

      return {
        service: serviceName,
        operation: 'stop',
        success: true,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to stop ${config.name}:`, errorMsg);

      this.logAudit({
        service: serviceName,
        operation: 'stop',
        success: false,
        error: errorMsg,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime
      });

      return {
        service: serviceName,
        operation: 'stop',
        success: false,
        error: errorMsg,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Restart a service
   */
  async restartService(serviceName: string, config: ServiceConfig): Promise<ServiceOperation> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Restarting ${config.name}...`);

      // Stop first
      await this.stopService(serviceName, config);
      await this.sleep(2000); // Wait before restart

      // Then start
      const startResult = await this.startService(serviceName, config);

      if (startResult.success) {
        this.registry.incrementRestartCount(serviceName);
      }

      this.logAudit({
        service: serviceName,
        operation: 'restart',
        success: startResult.success,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime
      });

      return {
        service: serviceName,
        operation: 'restart',
        success: startResult.success,
        error: startResult.error,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to restart ${config.name}:`, errorMsg);

      this.logAudit({
        service: serviceName,
        operation: 'restart',
        success: false,
        error: errorMsg,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime
      });

      return {
        service: serviceName,
        operation: 'restart',
        success: false,
        error: errorMsg,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Execute a command and return the process
   */
  private executeCommand(command: string, logFile: string): Promise<ChildProcess | null> {
    return new Promise((resolve, reject) => {
      // Parse command to run in shell
      const process = spawn('bash', ['-c', command], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Redirect stdout and stderr to log file
      const logStream = fs.createWriteStream(logFile, { flags: 'a' });

      if (process.stdout) {
        process.stdout.pipe(logStream);
      }

      if (process.stderr) {
        process.stderr.pipe(logStream);
      }

      // Handle process events
      process.on('error', (error) => {
        logStream.end();
        reject(error);
      });

      process.on('spawn', () => {
        // Process started successfully
        process.unref(); // Allow parent to exit independently
        resolve(process);
      });

      // If process exits immediately, it's an error
      process.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          logStream.end();
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Check if a port is in use
   */
  private async isPortInUse(port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Kill process on a specific port
   */
  private async killProcessOnPort(port: number): Promise<void> {
    try {
      await execAsync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
    } catch {
      // Ignore errors (process might not exist)
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log operation to audit trail
   */
  private logAudit(operation: ServiceOperation): void {
    const logEntry = `${operation.timestamp.toISOString()} | ${operation.service} | ${operation.operation} | ${operation.success ? 'SUCCESS' : 'FAILURE'} | ${operation.duration_ms}ms${operation.error ? ` | ERROR: ${operation.error}` : ''}\n`;

    try {
      fs.appendFileSync(this.auditLog, logEntry);
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Get running process for a service
   */
  getProcess(serviceName: string): ChildProcess | undefined {
    return this.processes.get(serviceName);
  }
}
