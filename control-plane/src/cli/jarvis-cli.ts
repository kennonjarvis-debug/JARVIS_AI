#!/usr/bin/env node
/**
 * Jarvis CLI Tool
 *
 * Command-line interface for managing Jarvis AI.
 * Provides quick access to common operations and system status.
 *
 * Commands:
 * - status: Show Jarvis status
 * - start: Start Jarvis services
 * - stop: Stop Jarvis services
 * - restart: Restart Jarvis services
 * - logs: View logs
 * - config: Manage configuration
 * - system: Show system information
 * - integrations: Manage macOS integrations
 */

import { program } from 'commander';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const execAsync = promisify(exec);

const JARVIS_HOME = process.env.JARVIS_HOME || path.join(process.env.HOME || '', 'Jarvis');
const PID_FILE = path.join(JARVIS_HOME, 'pids', 'jarvis.pid');
const LOG_FILE = path.join(JARVIS_HOME, 'logs', 'jarvis.log');
const CONFIG_FILE = path.join(JARVIS_HOME, '.env');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string): void {
  log(`✓ ${message}`, colors.green);
}

function error(message: string): void {
  log(`✗ ${message}`, colors.red);
}

function info(message: string): void {
  log(`ℹ ${message}`, colors.cyan);
}

function warning(message: string): void {
  log(`⚠ ${message}`, colors.yellow);
}

/**
 * Check if Jarvis is running
 */
async function isRunning(): Promise<boolean> {
  try {
    if (!fs.existsSync(PID_FILE)) {
      return false;
    }

    const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
    await execAsync(`ps -p ${pid}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Jarvis PID
 */
function getPid(): string | null {
  try {
    if (fs.existsSync(PID_FILE)) {
      return fs.readFileSync(PID_FILE, 'utf8').trim();
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Status command
 */
async function statusCommand(): Promise<void> {
  log('\n' + colors.bright + '=== Jarvis AI Status ===' + colors.reset + '\n');

  const running = await isRunning();
  const pid = getPid();

  if (running && pid) {
    success(`Jarvis is running (PID: ${pid})`);

    // Get uptime
    try {
      const { stdout } = await execAsync(`ps -o etime= -p ${pid}`);
      info(`Uptime: ${stdout.trim()}`);
    } catch {
      // Could not get uptime
    }

    // Get memory usage
    try {
      const { stdout } = await execAsync(`ps -o rss= -p ${pid}`);
      const memoryKB = parseInt(stdout.trim(), 10);
      const memoryMB = Math.round(memoryKB / 1024);
      info(`Memory: ${memoryMB} MB`);
    } catch {
      // Could not get memory
    }
  } else {
    error('Jarvis is not running');
  }

  // Check macOS integrations
  log('\n' + colors.bright + 'macOS Integrations:' + colors.reset);

  // Check if iMessage is accessible
  const imessageDb = path.join(process.env.HOME || '', 'Library/Messages/chat.db');
  if (fs.existsSync(imessageDb)) {
    try {
      fs.accessSync(imessageDb, fs.constants.R_OK);
      success('iMessage: Accessible');
    } catch {
      warning('iMessage: No permission (Full Disk Access required)');
    }
  } else {
    warning('iMessage: Not configured');
  }

  // Check Shortcuts
  try {
    await execAsync('shortcuts list');
    success('Shortcuts: Available');
  } catch {
    warning('Shortcuts: Not available');
  }

  // Check Contacts
  try {
    await execAsync('osascript -e "tell application \\"Contacts\\" to return count of people"');
    success('Contacts: Accessible');
  } catch {
    warning('Contacts: No permission');
  }

  // Check Calendar
  try {
    await execAsync('osascript -e "tell application \\"Calendar\\" to return count of calendars"');
    success('Calendar: Accessible');
  } catch {
    warning('Calendar: No permission');
  }

  console.log();
}

/**
 * Start command
 */
async function startCommand(): Promise<void> {
  const running = await isRunning();

  if (running) {
    warning('Jarvis is already running');
    return;
  }

  info('Starting Jarvis...');

  try {
    // Start Jarvis in the background
    const jarvisDir = JARVIS_HOME;
    await execAsync(`cd "${jarvisDir}" && npm run dev > "${LOG_FILE}" 2>&1 &`);

    // Wait a moment for the process to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    const isNowRunning = await isRunning();
    if (isNowRunning) {
      success('Jarvis started successfully');
      info(`Logs: ${LOG_FILE}`);
    } else {
      error('Failed to start Jarvis. Check logs for details.');
    }
  } catch (err) {
    error(`Failed to start Jarvis: ${err}`);
  }
}

/**
 * Stop command
 */
async function stopCommand(): Promise<void> {
  const running = await isRunning();

  if (!running) {
    warning('Jarvis is not running');
    return;
  }

  info('Stopping Jarvis...');

  try {
    const pid = getPid();
    if (pid) {
      await execAsync(`kill ${pid}`);
      success('Jarvis stopped');

      // Clean up PID file
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
    }
  } catch (err) {
    error(`Failed to stop Jarvis: ${err}`);
  }
}

/**
 * Restart command
 */
async function restartCommand(): Promise<void> {
  info('Restarting Jarvis...');
  await stopCommand();
  await new Promise(resolve => setTimeout(resolve, 1000));
  await startCommand();
}

/**
 * Logs command
 */
async function logsCommand(options: { follow?: boolean; lines?: number }): Promise<void> {
  if (!fs.existsSync(LOG_FILE)) {
    warning('No log file found');
    return;
  }

  if (options.follow) {
    // Follow logs in real-time
    const tail = exec(`tail -f "${LOG_FILE}"`);
    tail.stdout?.pipe(process.stdout);
    tail.stderr?.pipe(process.stderr);
  } else {
    // Show last N lines
    const lines = options.lines || 50;
    try {
      const { stdout } = await execAsync(`tail -n ${lines} "${LOG_FILE}"`);
      console.log(stdout);
    } catch (err) {
      error(`Failed to read logs: ${err}`);
    }
  }
}

/**
 * Config command
 */
async function configCommand(action: 'show' | 'edit', key?: string, value?: string): Promise<void> {
  if (!fs.existsSync(CONFIG_FILE)) {
    error('Configuration file not found');
    return;
  }

  if (action === 'show') {
    // Show configuration
    const config = fs.readFileSync(CONFIG_FILE, 'utf8');
    console.log(config);
  } else if (action === 'edit' && key && value) {
    // Edit configuration
    let config = fs.readFileSync(CONFIG_FILE, 'utf8');
    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(config)) {
      config = config.replace(regex, `${key}=${value}`);
    } else {
      config += `\n${key}=${value}`;
    }

    fs.writeFileSync(CONFIG_FILE, config);
    success(`Updated ${key}=${value}`);
  }
}

/**
 * System command
 */
async function systemCommand(): Promise<void> {
  log('\n' + colors.bright + '=== System Information ===' + colors.reset + '\n');

  // macOS version
  try {
    const { stdout: version } = await execAsync('sw_vers -productVersion');
    const { stdout: build } = await execAsync('sw_vers -buildVersion');
    info(`macOS: ${version.trim()} (${build.trim()})`);
  } catch {
    // Could not get version
  }

  // CPU info
  try {
    const { stdout } = await execAsync('sysctl -n machdep.cpu.brand_string');
    info(`CPU: ${stdout.trim()}`);
  } catch {
    // Could not get CPU info
  }

  // Memory
  try {
    const { stdout } = await execAsync('sysctl -n hw.memsize');
    const memoryBytes = parseInt(stdout.trim(), 10);
    const memoryGB = Math.round(memoryBytes / 1024 / 1024 / 1024);
    info(`Memory: ${memoryGB} GB`);
  } catch {
    // Could not get memory
  }

  // Disk space
  try {
    const { stdout } = await execAsync('df -h / | tail -1');
    const parts = stdout.trim().split(/\s+/);
    info(`Disk: ${parts[1]} total, ${parts[3]} available (${parts[4]} used)`);
  } catch {
    // Could not get disk space
  }

  // Battery
  try {
    const { stdout } = await execAsync('pmset -g batt');
    const match = stdout.match(/(\d+)%/);
    if (match) {
      info(`Battery: ${match[1]}%`);
    }
  } catch {
    // No battery (desktop Mac)
  }

  console.log();
}

/**
 * Interactive mode
 */
async function interactiveMode(): Promise<void> {
  log('\n' + colors.bright + '=== Jarvis Interactive Mode ===' + colors.reset);
  log('Type "help" for available commands, "exit" to quit\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: colors.cyan + 'jarvis> ' + colors.reset,
  });

  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();

    switch (input) {
      case 'help':
        console.log('Available commands:');
        console.log('  status    - Show Jarvis status');
        console.log('  start     - Start Jarvis');
        console.log('  stop      - Stop Jarvis');
        console.log('  restart   - Restart Jarvis');
        console.log('  logs      - Show logs');
        console.log('  system    - Show system info');
        console.log('  exit      - Exit interactive mode');
        break;

      case 'status':
        await statusCommand();
        break;

      case 'start':
        await startCommand();
        break;

      case 'stop':
        await stopCommand();
        break;

      case 'restart':
        await restartCommand();
        break;

      case 'logs':
        await logsCommand({ lines: 20 });
        break;

      case 'system':
        await systemCommand();
        break;

      case 'exit':
      case 'quit':
        log('Goodbye!', colors.green);
        process.exit(0);

      case '':
        break;

      default:
        warning(`Unknown command: ${input}`);
        log('Type "help" for available commands');
    }

    rl.prompt();
  });
}

// CLI Setup
program
  .name('jarvis')
  .description('Jarvis AI - Command Line Interface')
  .version('2.0.0');

program
  .command('status')
  .description('Show Jarvis status')
  .action(statusCommand);

program
  .command('start')
  .description('Start Jarvis services')
  .action(startCommand);

program
  .command('stop')
  .description('Stop Jarvis services')
  .action(stopCommand);

program
  .command('restart')
  .description('Restart Jarvis services')
  .action(restartCommand);

program
  .command('logs')
  .description('View Jarvis logs')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <number>', 'Number of lines to show', '50')
  .action(logsCommand);

program
  .command('config <action> [key] [value]')
  .description('Manage configuration (show, edit)')
  .action(configCommand);

program
  .command('system')
  .description('Show system information')
  .action(systemCommand);

program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode')
  .action(interactiveMode);

// Parse arguments
if (process.argv.length === 2) {
  // No command provided, show status
  statusCommand();
} else {
  program.parse();
}
