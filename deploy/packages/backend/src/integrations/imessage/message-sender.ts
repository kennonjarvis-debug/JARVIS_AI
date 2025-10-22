/**
 * Message Sender
 * Sends iMessages via AppleScript
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '@jarvis/shared';

const execAsync = promisify(exec);
const logger = new Logger('MessageSender');

export class MessageSender {
  /**
   * Send an iMessage to a contact
   */
  async send(handle: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Escape quotes in the message
      const escapedMessage = message.replace(/"/g, '\\"').replace(/'/g, "'\\''");

      const script = `
tell application "Messages"
    set targetService to 1st account whose service type = iMessage
    set targetBuddy to participant "${handle}" of targetService
    send "${escapedMessage}" to targetBuddy
end tell
`;

      await execAsync(`osascript -e '${script}'`);

      logger.info('Message sent successfully', {
        handle,
        messageLength: message.length,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to send message', {
        error: error.message,
        handle,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send a message with retry logic
   */
  async sendWithRetry(
    handle: string,
    message: string,
    maxRetries: number = 3
  ): Promise<{ success: boolean; error?: string }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.send(handle, message);

      if (result.success) {
        return result;
      }

      if (attempt < maxRetries) {
        logger.warn('Retrying message send', {
          handle,
          attempt,
          maxRetries,
        });

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts`,
    };
  }

  /**
   * Check if Messages.app is running
   */
  async isMessagesAppRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('ps aux | grep -i "Messages.app" | grep -v grep');
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Launch Messages.app
   */
  async launchMessagesApp(): Promise<void> {
    try {
      await execAsync('open -a Messages');
      // Wait for app to launch
      await new Promise(resolve => setTimeout(resolve, 2000));
      logger.info('Messages.app launched');
    } catch (error: any) {
      logger.error('Failed to launch Messages.app', { error: error.message });
      throw error;
    }
  }
}
