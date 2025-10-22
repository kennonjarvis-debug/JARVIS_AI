import { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { RunCommandRequest, CommandResult } from '../types';
import { config } from '../utils/config';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);

function isCommandWhitelisted(cmd: string): boolean {
  // Check if command starts with any whitelisted command
  return config.allowedCommands.some((allowedCmd) => {
    // Exact match
    if (cmd === allowedCmd) return true;

    // Command with arguments (e.g., "git status" allows "git status --short")
    if (cmd.startsWith(allowedCmd + ' ')) return true;

    return false;
  });
}

function sanitizeCommand(cmd: string): string {
  // Remove potentially dangerous characters and patterns
  const dangerous = [';', '&&', '||', '|', '>', '<', '`', '$', '(', ')'];
  for (const char of dangerous) {
    if (cmd.includes(char)) {
      throw new Error(`Dangerous character detected: ${char}`);
    }
  }
  return cmd.trim();
}

export async function runCommand(req: Request, res: Response): Promise<void> {
  try {
    const { cmd }: RunCommandRequest = req.body;

    if (!cmd || typeof cmd !== 'string') {
      Logger.warn('Invalid run request: missing or invalid cmd', {
        ip: req.ip,
        body: req.body,
      });
      res.status(400).json({
        success: false,
        error: 'Missing or invalid "cmd" parameter',
      });
      return;
    }

    // Sanitize command
    let sanitizedCmd: string;
    try {
      sanitizedCmd = sanitizeCommand(cmd);
    } catch (error) {
      Logger.warn('Command sanitization failed', error, {
        ip: req.ip,
        cmd,
      });
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Command sanitization failed',
      });
      return;
    }

    // Check whitelist
    if (!isCommandWhitelisted(sanitizedCmd)) {
      Logger.warn('Command not whitelisted', {
        ip: req.ip,
        cmd: sanitizedCmd,
      });
      res.status(403).json({
        success: false,
        error: 'Command not whitelisted',
        hint: 'Only whitelisted commands can be executed. Check ALLOWED_COMMANDS in config.',
      });
      return;
    }

    Logger.info('Executing command', {
      ip: req.ip,
      cmd: sanitizedCmd,
    });

    // Execute command
    const { stdout, stderr } = await execAsync(sanitizedCmd, {
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024 * 10, // 10MB max buffer
    });

    Logger.info('Command executed successfully', {
      ip: req.ip,
      cmd: sanitizedCmd,
      outputLength: stdout.length,
    });

    // Return Custom GPT compatible format
    res.status(200).json({
      stdout: stdout,
      stderr: stderr || '',
      code: 0,
    });
  } catch (error: unknown) {
    const err = error as { code?: number; message: string; killed?: boolean; stdout?: string; stderr?: string };

    Logger.error('Command execution failed', error, {
      ip: req.ip,
      cmd: req.body?.cmd,
    });

    // Return Custom GPT compatible format even on error
    res.status(500).json({
      stdout: err.stdout || '',
      stderr: err.stderr || err.message,
      code: err.code || 1,
    });
  }
}
