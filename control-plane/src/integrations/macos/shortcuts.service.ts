/**
 * Apple Shortcuts Integration Service
 *
 * Provides integration with Apple Shortcuts for automation.
 * Allows triggering shortcuts from Node.js and passing/receiving data.
 *
 * Features:
 * - Run shortcuts via command line
 * - Pass input parameters to shortcuts
 * - Receive return values from shortcuts
 * - List available shortcuts
 * - Create shortcuts programmatically
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface ShortcutResult {
  success: boolean;
  output?: any;
  error?: string;
}

export interface ShortcutInfo {
  name: string;
  folder?: string;
  actionCount?: number;
}

export class ShortcutsService extends EventEmitter {
  private readonly shortcutsPath: string;

  constructor() {
    super();
    // Path to user's shortcuts
    this.shortcutsPath = path.join(
      process.env.HOME || '',
      'Library/Shortcuts'
    );
  }

  /**
   * Run a shortcut by name
   */
  async runShortcut(name: string, input?: any): Promise<ShortcutResult> {
    try {
      let command = `shortcuts run "${name}"`;

      // Add input if provided
      if (input !== undefined) {
        const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
        command += ` --input-path /dev/stdin <<< '${inputStr.replace(/'/g, "'\\''")}'`;
      }

      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        console.warn(`[Shortcuts] Warning: ${stderr}`);
      }

      // Try to parse output as JSON, fallback to raw string
      let output = stdout.trim();
      try {
        output = JSON.parse(output);
      } catch {
        // Keep as string
      }

      this.emit('shortcut_executed', { name, input, output });

      return {
        success: true,
        output,
      };
    } catch (error: any) {
      console.error('[Shortcuts] Failed to run shortcut:', error);
      this.emit('error', error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List all available shortcuts
   */
  async listShortcuts(): Promise<ShortcutInfo[]> {
    try {
      const { stdout } = await execAsync('shortcuts list');

      const shortcuts = stdout
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => ({
          name: line.trim(),
        }));

      return shortcuts;
    } catch (error) {
      console.error('[Shortcuts] Failed to list shortcuts:', error);
      return [];
    }
  }

  /**
   * Check if a shortcut exists
   */
  async shortcutExists(name: string): Promise<boolean> {
    const shortcuts = await this.listShortcuts();
    return shortcuts.some(s => s.name === name);
  }

  /**
   * Run Jarvis-specific shortcuts
   */
  async runJarvisShortcut(shortcutName: string, params?: any): Promise<ShortcutResult> {
    const fullName = `Jarvis - ${shortcutName}`;
    return this.runShortcut(fullName, params);
  }

  /**
   * Send text to a shortcut
   */
  async sendText(shortcutName: string, text: string): Promise<ShortcutResult> {
    return this.runShortcut(shortcutName, text);
  }

  /**
   * Send file to a shortcut
   */
  async sendFile(shortcutName: string, filePath: string): Promise<ShortcutResult> {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: 'File not found',
      };
    }

    try {
      const command = `shortcuts run "${shortcutName}" --input-path "${filePath}"`;
      const { stdout } = await execAsync(command);

      return {
        success: true,
        output: stdout.trim(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a simple text-processing shortcut
   */
  async createTextShortcut(name: string, actions: string[]): Promise<boolean> {
    // Note: Creating shortcuts programmatically requires using the Shortcuts
    // URL scheme or creating .shortcut files. This is a simplified version.
    console.warn('[Shortcuts] Creating shortcuts programmatically is limited.');
    console.warn('Please create shortcuts manually in the Shortcuts app.');
    return false;
  }

  /**
   * Open the Shortcuts app
   */
  async openShortcutsApp(): Promise<void> {
    try {
      await execAsync('open -a Shortcuts');
    } catch (error) {
      console.error('[Shortcuts] Failed to open Shortcuts app:', error);
      throw error;
    }
  }

  /**
   * Open a specific shortcut in the Shortcuts app
   */
  async openShortcut(name: string): Promise<void> {
    try {
      // URL scheme to open shortcut
      const url = `shortcuts://open-shortcut?name=${encodeURIComponent(name)}`;
      await execAsync(`open "${url}"`);
    } catch (error) {
      console.error('[Shortcuts] Failed to open shortcut:', error);
      throw error;
    }
  }

  /**
   * Common Jarvis shortcuts
   */
  async jarvisShortcuts() {
    return {
      /**
       * Send a file to Jarvis Observatory
       */
      sendToObservatory: async (filePath: string) => {
        return this.runJarvisShortcut('Send to Observatory', filePath);
      },

      /**
       * Process text with Jarvis
       */
      processText: async (text: string) => {
        return this.runJarvisShortcut('Process Text', text);
      },

      /**
       * Create a task in Jarvis
       */
      createTask: async (taskData: any) => {
        return this.runJarvisShortcut('Create Task', taskData);
      },

      /**
       * Get Jarvis status
       */
      getStatus: async () => {
        return this.runJarvisShortcut('Get Status');
      },

      /**
       * Take a screenshot and send to Jarvis
       */
      screenshotToJarvis: async () => {
        return this.runJarvisShortcut('Screenshot to Jarvis');
      },

      /**
       * Record audio and transcribe with Jarvis
       */
      recordAndTranscribe: async () => {
        return this.runJarvisShortcut('Record and Transcribe');
      },

      /**
       * Get daily briefing from Jarvis
       */
      getDailyBriefing: async () => {
        return this.runJarvisShortcut('Daily Briefing');
      },
    };
  }

  /**
   * Setup example shortcuts (provides instructions)
   */
  getSetupInstructions(): string[] {
    return [
      'Create the following shortcuts in the Shortcuts app:',
      '',
      '1. "Jarvis - Send to Observatory"',
      '   - Get File from Input',
      '   - Get Contents of File',
      '   - Make HTTP Request to: http://localhost:3000/api/observatory/upload',
      '',
      '2. "Jarvis - Process Text"',
      '   - Get Text from Input',
      '   - Make HTTP Request to: http://localhost:3000/api/ai/process',
      '   - Show Result',
      '',
      '3. "Jarvis - Create Task"',
      '   - Get Text from Input',
      '   - Make HTTP Request to: http://localhost:3000/api/tasks',
      '',
      '4. "Jarvis - Get Status"',
      '   - Make HTTP Request to: http://localhost:3000/api/status',
      '   - Show Notification with Result',
      '',
      '5. "Jarvis - Screenshot to Jarvis"',
      '   - Take Screenshot',
      '   - Make HTTP Request to: http://localhost:3000/api/vision/analyze',
      '   - Show Result',
      '',
      '6. "Jarvis - Record and Transcribe"',
      '   - Record Audio',
      '   - Make HTTP Request to: http://localhost:3000/api/transcribe',
      '   - Show Result',
      '',
      '7. "Jarvis - Daily Briefing"',
      '   - Make HTTP Request to: http://localhost:3000/api/briefing',
      '   - Speak Text (Result)',
    ];
  }

  /**
   * Verify Jarvis shortcuts are installed
   */
  async verifyJarvisShortcuts(): Promise<{
    installed: string[];
    missing: string[];
  }> {
    const requiredShortcuts = [
      'Jarvis - Send to Observatory',
      'Jarvis - Process Text',
      'Jarvis - Create Task',
      'Jarvis - Get Status',
      'Jarvis - Screenshot to Jarvis',
      'Jarvis - Record and Transcribe',
      'Jarvis - Daily Briefing',
    ];

    const allShortcuts = await this.listShortcuts();
    const shortcutNames = allShortcuts.map(s => s.name);

    const installed = requiredShortcuts.filter(name => shortcutNames.includes(name));
    const missing = requiredShortcuts.filter(name => !shortcutNames.includes(name));

    return { installed, missing };
  }
}

/**
 * Create a singleton instance
 */
export const shortcutsService = new ShortcutsService();
