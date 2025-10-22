import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export interface SendMessageOptions {
  to: string; // Phone number or email
  message: string;
  service?: 'iMessage' | 'SMS'; // Default to iMessage
}

export class IMessageSender {
  private logger: Logger;
  private applescriptPath: string;

  constructor() {
    this.logger = new Logger('IMessageSender');
    this.applescriptPath = path.join(os.tmpdir(), 'send_imessage.applescript');
  }

  public async initialize(): Promise<void> {
    // Create AppleScript file for sending messages
    await this.createAppleScript();
    this.logger.info('iMessage sender initialized');
  }

  private async createAppleScript(): Promise<void> {
    const script = `
on run argv
    set targetBuddy to item 1 of argv
    set targetMessage to item 2 of argv

    tell application "Messages"
        set targetService to 1st service whose service type = iMessage
        set targetBuddy to buddy targetBuddy of targetService
        send targetMessage to targetBuddy
    end tell
end run
    `.trim();

    await fs.writeFile(this.applescriptPath, script, 'utf-8');
    this.logger.debug('AppleScript created', { path: this.applescriptPath });
  }

  public async sendMessage(options: SendMessageOptions): Promise<void> {
    const { to, message, service = 'iMessage' } = options;

    this.logger.info('Sending iMessage', {
      to: this.redactHandle(to),
      messageLength: message.length
    });

    try {
      // Escape the message for shell (only double quotes need escaping)
      const escapedMessage = message.replace(/"/g, '\\"');

      // Execute AppleScript
      const command = `osascript "${this.applescriptPath}" "${to}" "${escapedMessage}"`;

      const { stdout, stderr } = await execAsync(command, {
        timeout: 10000 // 10 second timeout
      });

      if (stderr) {
        this.logger.warn('AppleScript stderr', { stderr });
      }

      this.logger.info('Message sent successfully', { to: this.redactHandle(to) });
    } catch (error) {
      this.logger.error('Failed to send message', error);
      throw new Error(`Failed to send iMessage: ${error}`);
    }
  }

  public async sendMessageAlternative(options: SendMessageOptions): Promise<void> {
    // Alternative method using inline AppleScript
    const { to, message } = options;

    this.logger.info('Sending iMessage (alternative method)', {
      to: this.redactHandle(to),
      messageLength: message.length
    });

    try {
      // Escape for AppleScript
      const escapedMessage = message
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n');

      const script = `
tell application "Messages"
    set targetService to 1st service whose service type = iMessage
    set targetBuddy to buddy "${to}" of targetService
    send "${escapedMessage}" to targetBuddy
end tell
      `.trim();

      const command = `osascript -e '${script.replace(/'/g, "'\\''")}'`;

      const { stdout, stderr } = await execAsync(command, {
        timeout: 10000
      });

      if (stderr) {
        this.logger.warn('AppleScript stderr', { stderr });
      }

      this.logger.info('Message sent successfully (alternative)', {
        to: this.redactHandle(to)
      });
    } catch (error) {
      this.logger.error('Failed to send message (alternative)', error);
      throw new Error(`Failed to send iMessage: ${error}`);
    }
  }

  /**
   * Verify that Messages.app is running and accessible
   */
  public async verifyMessagesApp(): Promise<boolean> {
    try {
      const script = `
tell application "System Events"
    set isRunning to (name of processes) contains "Messages"
end tell
return isRunning
      `.trim();

      const { stdout } = await execAsync(`osascript -e '${script}'`);
      const isRunning = stdout.trim() === 'true';

      this.logger.info('Messages.app status', { isRunning });
      return isRunning;
    } catch (error) {
      this.logger.error('Failed to verify Messages.app', error);
      return false;
    }
  }

  /**
   * Launch Messages.app if not running
   */
  public async launchMessagesApp(): Promise<void> {
    this.logger.info('Launching Messages.app');

    try {
      const script = `
tell application "Messages"
    activate
end tell
      `.trim();

      await execAsync(`osascript -e '${script}'`);
      this.logger.info('Messages.app launched');

      // Wait a moment for it to start
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      this.logger.error('Failed to launch Messages.app', error);
      throw error;
    }
  }

  /**
   * Send typing indicator (if supported)
   */
  public async sendTypingIndicator(to: string, isTyping: boolean): Promise<void> {
    // Note: This is not reliably supported via AppleScript
    // Keeping for future implementation if Apple provides API access
    this.logger.debug('Typing indicator requested', { to: this.redactHandle(to), isTyping });
  }

  /**
   * Redact phone number or email for logging (privacy)
   */
  private redactHandle(handle: string): string {
    if (handle.includes('@')) {
      // Email: show first 2 chars + domain
      const parts = handle.split('@');
      return `${parts[0].substring(0, 2)}***@${parts[1]}`;
    } else {
      // Phone: show last 4 digits
      return `***${handle.slice(-4)}`;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      await fs.unlink(this.applescriptPath);
      this.logger.info('Cleaned up AppleScript file');
    } catch (error) {
      // Ignore errors
    }
  }
}
