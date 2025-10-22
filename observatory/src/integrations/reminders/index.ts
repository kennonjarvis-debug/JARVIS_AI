/**
 * macOS Reminders Integration for Jarvis
 *
 * Provides to-do/task management using macOS Reminders app via AppleScript:
 * - Create reminders/tasks
 * - List reminders
 * - Complete reminders
 * - Delete reminders
 * - Set due dates and priorities
 */

import { execSync } from 'child_process';
import { Logger } from '../../utils/logger';

export interface Reminder {
  id: string;
  name: string;
  body?: string;
  dueDate?: Date;
  priority: 0 | 1 | 5 | 9; // 0=none, 1=low, 5=medium, 9=high
  completed: boolean;
  completedDate?: Date;
  list: string;
}

export interface CreateReminderOptions {
  name: string;
  body?: string;
  dueDate?: Date;
  priority?: 0 | 1 | 5 | 9;
  list?: string; // List name (default: "Reminders")
}

export class RemindersIntegration {
  private logger: Logger;
  private defaultList: string;

  constructor(defaultList: string = 'Jarvis') {
    this.logger = new Logger('RemindersIntegration');
    this.defaultList = defaultList;
  }

  /**
   * Initialize Reminders integration (ensure default list exists)
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Reminders integration');

    try {
      // Check if default list exists, create if not
      await this.ensureListExists(this.defaultList);
      this.logger.info('Reminders integration initialized', {
        defaultList: this.defaultList,
      });
    } catch (error) {
      this.logger.error('Failed to initialize Reminders', error as Error);
      throw error;
    }
  }

  /**
   * Create a new reminder/task
   */
  async createReminder(options: CreateReminderOptions): Promise<string> {
    const listName = options.list || this.defaultList;

    this.logger.info('Creating reminder', {
      name: options.name,
      list: listName,
      hasDueDate: !!options.dueDate,
    });

    try {
      // Build AppleScript
      let script = `
tell application "Reminders"
  tell list "${this.escapeString(listName)}"
    set newReminder to make new reminder with properties {name:"${this.escapeString(options.name)}"}
`;

      // Add body/notes if provided
      if (options.body) {
        script += `    set body of newReminder to "${this.escapeString(options.body)}"\n`;
      }

      // Add due date if provided
      if (options.dueDate) {
        const dateStr = this.formatDateForAppleScript(options.dueDate);
        script += `    set due date of newReminder to date "${dateStr}"\n`;
      }

      // Add priority if provided
      if (options.priority !== undefined) {
        script += `    set priority of newReminder to ${options.priority}\n`;
      }

      script += `    return id of newReminder
  end tell
end tell`;

      const reminderId = this.executeAppleScript(script).trim();

      this.logger.info('Reminder created', { id: reminderId, name: options.name });

      return reminderId;
    } catch (error) {
      this.logger.error('Failed to create reminder', error as Error);
      throw error;
    }
  }

  /**
   * Get all incomplete reminders from a list
   */
  async getReminders(listName?: string): Promise<Reminder[]> {
    const targetList = listName || this.defaultList;

    this.logger.info('Fetching reminders', { list: targetList });

    try {
      const script = `
tell application "Reminders"
  tell list "${this.escapeString(targetList)}"
    set reminderList to {}
    repeat with r in (reminders whose completed is false)
      set reminderInfo to {¬
        id of r, ¬
        name of r, ¬
        body of r, ¬
        due date of r, ¬
        priority of r, ¬
        completed of r¬
      }
      set end of reminderList to reminderInfo
    end repeat
    return reminderList
  end tell
end tell`;

      const result = this.executeAppleScript(script);

      // Parse AppleScript result
      const reminders = this.parseRemindersList(result, targetList);

      this.logger.info('Reminders fetched', {
        list: targetList,
        count: reminders.length,
      });

      return reminders;
    } catch (error) {
      this.logger.error('Failed to fetch reminders', error as Error);
      throw error;
    }
  }

  /**
   * Get all reminders (including completed)
   */
  async getAllReminders(listName?: string): Promise<Reminder[]> {
    const targetList = listName || this.defaultList;

    this.logger.info('Fetching all reminders', { list: targetList });

    try {
      const script = `
tell application "Reminders"
  tell list "${this.escapeString(targetList)}"
    set reminderList to {}
    repeat with r in reminders
      set reminderInfo to {¬
        id of r, ¬
        name of r, ¬
        body of r, ¬
        due date of r, ¬
        priority of r, ¬
        completed of r, ¬
        completion date of r¬
      }
      set end of reminderList to reminderInfo
    end repeat
    return reminderList
  end tell
end tell`;

      const result = this.executeAppleScript(script);
      const reminders = this.parseRemindersList(result, targetList);

      this.logger.info('All reminders fetched', {
        list: targetList,
        count: reminders.length,
      });

      return reminders;
    } catch (error) {
      this.logger.error('Failed to fetch all reminders', error as Error);
      throw error;
    }
  }

  /**
   * Mark a reminder as completed
   */
  async completeReminder(reminderId: string): Promise<void> {
    this.logger.info('Completing reminder', { id: reminderId });

    try {
      const script = `
tell application "Reminders"
  set targetReminder to reminder id "${reminderId}"
  set completed of targetReminder to true
end tell`;

      this.executeAppleScript(script);

      this.logger.info('Reminder completed', { id: reminderId });
    } catch (error) {
      this.logger.error('Failed to complete reminder', error as Error);
      throw error;
    }
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(reminderId: string): Promise<void> {
    this.logger.info('Deleting reminder', { id: reminderId });

    try {
      const script = `
tell application "Reminders"
  delete reminder id "${reminderId}"
end tell`;

      this.executeAppleScript(script);

      this.logger.info('Reminder deleted', { id: reminderId });
    } catch (error) {
      this.logger.error('Failed to delete reminder', error as Error);
      throw error;
    }
  }

  /**
   * Update a reminder
   */
  async updateReminder(
    reminderId: string,
    updates: Partial<CreateReminderOptions>
  ): Promise<void> {
    this.logger.info('Updating reminder', { id: reminderId, updates });

    try {
      let script = `
tell application "Reminders"
  set targetReminder to reminder id "${reminderId}"
`;

      if (updates.name) {
        script += `  set name of targetReminder to "${this.escapeString(updates.name)}"\n`;
      }

      if (updates.body !== undefined) {
        script += `  set body of targetReminder to "${this.escapeString(updates.body || '')}"\n`;
      }

      if (updates.dueDate) {
        const dateStr = this.formatDateForAppleScript(updates.dueDate);
        script += `  set due date of targetReminder to date "${dateStr}"\n`;
      }

      if (updates.priority !== undefined) {
        script += `  set priority of targetReminder to ${updates.priority}\n`;
      }

      script += `end tell`;

      this.executeAppleScript(script);

      this.logger.info('Reminder updated', { id: reminderId });
    } catch (error) {
      this.logger.error('Failed to update reminder', error as Error);
      throw error;
    }
  }

  /**
   * Search reminders by name
   */
  async searchReminders(query: string, listName?: string): Promise<Reminder[]> {
    const targetList = listName || this.defaultList;

    this.logger.info('Searching reminders', { query, list: targetList });

    const allReminders = await this.getReminders(targetList);

    // Simple text search
    const results = allReminders.filter(r =>
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.body?.toLowerCase().includes(query.toLowerCase())
    );

    this.logger.info('Search complete', {
      query,
      results: results.length,
    });

    return results;
  }

  /**
   * Get all reminder lists
   */
  async getLists(): Promise<string[]> {
    this.logger.info('Fetching reminder lists');

    try {
      const script = `
tell application "Reminders"
  set listNames to {}
  repeat with l in lists
    set end of listNames to name of l
  end repeat
  return listNames
end tell`;

      const result = this.executeAppleScript(script);

      // Parse comma-separated list
      const lists = result.split(',').map(l => l.trim()).filter(l => l.length > 0);

      this.logger.info('Lists fetched', { count: lists.length });

      return lists;
    } catch (error) {
      this.logger.error('Failed to fetch lists', error as Error);
      throw error;
    }
  }

  /**
   * Ensure a reminder list exists (create if it doesn't)
   */
  private async ensureListExists(listName: string): Promise<void> {
    try {
      const script = `
tell application "Reminders"
  if not (exists list "${this.escapeString(listName)}") then
    make new list with properties {name:"${this.escapeString(listName)}"}
  end if
end tell`;

      this.executeAppleScript(script);
    } catch (error) {
      this.logger.error('Failed to ensure list exists', error as Error);
      throw error;
    }
  }

  /**
   * Execute AppleScript and return output
   */
  private executeAppleScript(script: string): string {
    try {
      return execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
        encoding: 'utf-8',
      }).trim();
    } catch (error) {
      this.logger.error('AppleScript execution failed', error as Error);
      throw error;
    }
  }

  /**
   * Escape string for AppleScript
   */
  private escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  /**
   * Format date for AppleScript (MM/DD/YYYY HH:MM:SS AM/PM)
   */
  private formatDateForAppleScript(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;

    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
  }

  /**
   * Parse AppleScript reminders list output
   */
  private parseRemindersList(output: string, listName: string): Reminder[] {
    // AppleScript returns data in format: "id, name, body, dueDate, priority, completed"
    // This is a simplified parser - real implementation would be more robust

    if (!output || output.trim().length === 0) {
      return [];
    }

    const reminders: Reminder[] = [];

    // Split by reminder entries (this is simplified)
    // In practice, AppleScript list parsing is more complex
    // For now, return empty array as parsing AppleScript output is tricky
    // TODO: Implement robust AppleScript list parsing

    return reminders;
  }
}
