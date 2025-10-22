import { config as dotenvConfig } from 'dotenv';
import { BridgeConfig } from '../types';

dotenvConfig();

const DEFAULT_ALLOWED_COMMANDS = [
  'git status',
  'git diff',
  'git log',
  'ls',
  'pwd',
  'whoami',
  'date',
  'echo',
  'cat',
  'head',
  'tail',
  'grep',
  'find',
  'wc',
  'du',
  'df',
  'ps',
  'top',
  'uname',
  'which',
  'node --version',
  'npm --version',
  'pnpm --version',
];

const DEFAULT_ALLOWED_PATHS = [
  process.env.HOME || '/Users',
  '/tmp',
  '/var/tmp',
];

export const config: BridgeConfig = {
  port: parseInt(process.env.BRIDGE_PORT || '5555', 10),
  bearerToken: process.env.BRIDGE_BEARER_TOKEN || '',
  allowedCommands: process.env.ALLOWED_COMMANDS
    ? process.env.ALLOWED_COMMANDS.split(',')
    : DEFAULT_ALLOWED_COMMANDS,
  allowedPaths: process.env.ALLOWED_PATHS
    ? process.env.ALLOWED_PATHS.split(',')
    : DEFAULT_ALLOWED_PATHS,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
};

export function validateConfig(): void {
  if (!config.bearerToken) {
    throw new Error(
      'BRIDGE_BEARER_TOKEN environment variable is required. Please set it in .env file.'
    );
  }

  if (config.bearerToken.length < 32) {
    throw new Error(
      'BRIDGE_BEARER_TOKEN must be at least 32 characters long for security.'
    );
  }

  if (config.allowedCommands.length === 0) {
    console.warn('Warning: No commands are whitelisted. /run endpoint will reject all commands.');
  }

  if (config.allowedPaths.length === 0) {
    console.warn('Warning: No paths are whitelisted. /read endpoint will reject all file reads.');
  }
}
