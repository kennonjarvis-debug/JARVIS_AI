/**
 * AppleScript Integration Service
 *
 * Provides comprehensive AppleScript execution and macOS app automation.
 * Enables control of Mail, Calendar, Contacts, Finder, and other apps.
 *
 * Features:
 * - Execute AppleScript from Node.js
 * - Control macOS applications
 * - System automation
 * - Error handling and result parsing
 * - Common automation templates
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface AppleScriptResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface EmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: string[];
}

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  calendar?: string;
}

export class AppleScriptService extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Execute AppleScript code
   */
  async execute(script: string): Promise<AppleScriptResult> {
    try {
      // Escape single quotes in the script
      const escapedScript = script.replace(/'/g, "'\\''");

      const { stdout, stderr } = await execAsync(`osascript -e '${escapedScript}'`);

      if (stderr) {
        console.warn('[AppleScript] Warning:', stderr);
      }

      this.emit('script_executed', { script, output: stdout });

      return {
        success: true,
        output: stdout.trim(),
      };
    } catch (error: any) {
      console.error('[AppleScript] Execution failed:', error);
      this.emit('error', error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute AppleScript from a file
   */
  async executeFile(filePath: string): Promise<AppleScriptResult> {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'Script file not found',
        };
      }

      const { stdout, stderr } = await execAsync(`osascript "${filePath}"`);

      if (stderr) {
        console.warn('[AppleScript] Warning:', stderr);
      }

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
   * Mail.app automation
   */
  mail = {
    /**
     * Send an email
     */
    sendEmail: async (options: EmailOptions): Promise<AppleScriptResult> => {
      const { to, cc, bcc, subject, body, attachments } = options;

      const script = `
        tell application "Mail"
          set newMessage to make new outgoing message with properties {subject:"${subject}", content:"${body}"}
          tell newMessage
            ${to.map(email => `make new to recipient with properties {address:"${email}"}`).join('\n')}
            ${cc ? cc.map(email => `make new cc recipient with properties {address:"${email}"}`).join('\n') : ''}
            ${bcc ? bcc.map(email => `make new bcc recipient with properties {address:"${email}"}`).join('\n') : ''}
            ${attachments ? attachments.map(file => `make new attachment with properties {file name:"${file}" as POSIX file}`).join('\n') : ''}
            send
          end tell
        end tell
      `;

      return this.execute(script);
    },

    /**
     * Get unread email count
     */
    getUnreadCount: async (): Promise<number> => {
      const script = `
        tell application "Mail"
          count of (messages of inbox whose read status is false)
        end tell
      `;

      const result = await this.execute(script);
      return result.success ? parseInt(result.output || '0', 10) : 0;
    },

    /**
     * Open Mail.app
     */
    open: async (): Promise<AppleScriptResult> => {
      return this.execute('tell application "Mail" to activate');
    },
  };

  /**
   * Calendar.app automation
   */
  calendar = {
    /**
     * Create a calendar event
     */
    createEvent: async (event: CalendarEvent): Promise<AppleScriptResult> => {
      const startDate = event.startDate.toLocaleString();
      const endDate = event.endDate.toLocaleString();
      const calendarName = event.calendar || 'Calendar';

      const script = `
        tell application "Calendar"
          tell calendar "${calendarName}"
            make new event with properties {summary:"${event.title}", start date:date "${startDate}", end date:date "${endDate}"${event.location ? `, location:"${event.location}"` : ''}${event.notes ? `, description:"${event.notes}"` : ''}}
          end tell
        end tell
      `;

      return this.execute(script);
    },

    /**
     * Get today's events
     */
    getTodayEvents: async (): Promise<string[]> => {
      const script = `
        tell application "Calendar"
          set todayStart to current date
          set time of todayStart to 0
          set todayEnd to todayStart + (1 * days)

          set eventList to {}
          repeat with cal in calendars
            set calEvents to (every event of cal whose start date ≥ todayStart and start date < todayEnd)
            repeat with evt in calEvents
              set end of eventList to summary of evt
            end repeat
          end repeat

          return eventList
        end tell
      `;

      const result = await this.execute(script);
      if (result.success && result.output) {
        return result.output.split(', ');
      }
      return [];
    },

    /**
     * Open Calendar.app
     */
    open: async (): Promise<AppleScriptResult> => {
      return this.execute('tell application "Calendar" to activate');
    },
  };

  /**
   * Contacts.app automation
   */
  contacts = {
    /**
     * Search for a contact
     */
    search: async (query: string): Promise<string[]> => {
      const script = `
        tell application "Contacts"
          set matchingPeople to people whose name contains "${query}"
          set resultList to {}
          repeat with p in matchingPeople
            set end of resultList to name of p
          end repeat
          return resultList
        end tell
      `;

      const result = await this.execute(script);
      if (result.success && result.output) {
        return result.output.split(', ');
      }
      return [];
    },

    /**
     * Get contact details
     */
    getContact: async (name: string): Promise<AppleScriptResult> => {
      const script = `
        tell application "Contacts"
          set p to first person whose name is "${name}"
          set contactInfo to "Name: " & name of p & return
          set contactInfo to contactInfo & "Email: " & value of first email of p & return
          set contactInfo to contactInfo & "Phone: " & value of first phone of p
          return contactInfo
        end tell
      `;

      return this.execute(script);
    },

    /**
     * Open Contacts.app
     */
    open: async (): Promise<AppleScriptResult> => {
      return this.execute('tell application "Contacts" to activate');
    },
  };

  /**
   * Finder automation
   */
  finder = {
    /**
     * Open a folder in Finder
     */
    openFolder: async (folderPath: string): Promise<AppleScriptResult> => {
      const script = `tell application "Finder" to open POSIX file "${folderPath}"`;
      return this.execute(script);
    },

    /**
     * Select a file in Finder
     */
    selectFile: async (filePath: string): Promise<AppleScriptResult> => {
      const script = `tell application "Finder" to reveal POSIX file "${filePath}"`;
      return this.execute(script);
    },

    /**
     * Get selected files
     */
    getSelection: async (): Promise<string[]> => {
      const script = `
        tell application "Finder"
          set selectedFiles to selection
          set filePaths to {}
          repeat with aFile in selectedFiles
            set end of filePaths to POSIX path of (aFile as alias)
          end repeat
          return filePaths
        end tell
      `;

      const result = await this.execute(script);
      if (result.success && result.output) {
        return result.output.split(', ');
      }
      return [];
    },

    /**
     * Create a new folder
     */
    createFolder: async (parentPath: string, folderName: string): Promise<AppleScriptResult> => {
      const script = `
        tell application "Finder"
          make new folder at POSIX file "${parentPath}" with properties {name:"${folderName}"}
        end tell
      `;
      return this.execute(script);
    },
  };

  /**
   * System automation
   */
  system = {
    /**
     * Display a dialog
     */
    dialog: async (message: string, buttons: string[] = ['OK']): Promise<string> => {
      const buttonsStr = buttons.map(b => `"${b}"`).join(', ');
      const script = `
        display dialog "${message}" buttons {${buttonsStr}} default button 1
        set theButton to button returned of result
        return theButton
      `;

      const result = await this.execute(script);
      return result.output || '';
    },

    /**
     * Display an alert
     */
    alert: async (title: string, message: string): Promise<AppleScriptResult> => {
      const script = `display alert "${title}" message "${message}"`;
      return this.execute(script);
    },

    /**
     * Choose a file
     */
    chooseFile: async (prompt: string = 'Choose a file'): Promise<string> => {
      const script = `
        set theFile to choose file with prompt "${prompt}"
        return POSIX path of theFile
      `;

      const result = await this.execute(script);
      return result.output || '';
    },

    /**
     * Choose a folder
     */
    chooseFolder: async (prompt: string = 'Choose a folder'): Promise<string> => {
      const script = `
        set theFolder to choose folder with prompt "${prompt}"
        return POSIX path of theFolder
      `;

      const result = await this.execute(script);
      return result.output || '';
    },

    /**
     * Get clipboard contents
     */
    getClipboard: async (): Promise<string> => {
      const script = 'the clipboard';
      const result = await this.execute(script);
      return result.output || '';
    },

    /**
     * Set clipboard contents
     */
    setClipboard: async (text: string): Promise<AppleScriptResult> => {
      const script = `set the clipboard to "${text}"`;
      return this.execute(script);
    },

    /**
     * Speak text
     */
    speak: async (text: string, voice?: string): Promise<AppleScriptResult> => {
      const script = voice
        ? `say "${text}" using "${voice}"`
        : `say "${text}"`;
      return this.execute(script);
    },

    /**
     * Set volume
     */
    setVolume: async (level: number): Promise<AppleScriptResult> => {
      const script = `set volume output volume ${level}`;
      return this.execute(script);
    },

    /**
     * Get volume
     */
    getVolume: async (): Promise<number> => {
      const script = 'output volume of (get volume settings)';
      const result = await this.execute(script);
      return result.success ? parseInt(result.output || '50', 10) : 50;
    },
  };

  /**
   * Application control
   */
  app = {
    /**
     * Launch an application
     */
    launch: async (appName: string): Promise<AppleScriptResult> => {
      const script = `tell application "${appName}" to activate`;
      return this.execute(script);
    },

    /**
     * Quit an application
     */
    quit: async (appName: string): Promise<AppleScriptResult> => {
      const script = `tell application "${appName}" to quit`;
      return this.execute(script);
    },

    /**
     * Check if application is running
     */
    isRunning: async (appName: string): Promise<boolean> => {
      const script = `
        tell application "System Events"
          return name of processes contains "${appName}"
        end tell
      `;

      const result = await this.execute(script);
      return result.output === 'true';
    },

    /**
     * Get list of running applications
     */
    listRunning: async (): Promise<string[]> => {
      const script = `
        tell application "System Events"
          return name of every process whose background only is false
        end tell
      `;

      const result = await this.execute(script);
      if (result.success && result.output) {
        return result.output.split(', ');
      }
      return [];
    },
  };
}

/**
 * Create a singleton instance
 */
export const applescriptService = new AppleScriptService();
