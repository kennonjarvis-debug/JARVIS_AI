/**
 * Notes Integration
 * Access and create notes in macOS Notes app
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseIntegration, type IntegrationConfig } from '../base/index.js';

const execAsync = promisify(exec);

export interface Note {
  id: string;
  title: string;
  body: string;
  folder: string;
  created: Date;
  modified: Date;
}

export interface CreateNoteParams {
  title: string;
  body: string;
  folder?: string;
}

/**
 * Notes integration for accessing macOS Notes app
 */
export class NotesIntegration extends BaseIntegration {
  get name(): string {
    return 'notes';
  }

  get displayName(): string {
    return 'Notes';
  }

  /**
   * Initialize Notes integration
   */
  async initialize(): Promise<void> {
    try {
      const isAvailable = await this.testConnection();

      if (!isAvailable) {
        throw new Error('Notes.app not accessible');
      }

      this.isInitialized = true;
      this.logger.info('Notes integration initialized');

      await this.updateStatus('connected');
    } catch (error) {
      this.logger.error('Failed to initialize Notes integration', error);
      await this.updateStatus('error', error instanceof Error ? error.message : 'Initialization failed');
      throw error;
    }
  }

  /**
   * Test Notes connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Check if Notes.app is available
      await execAsync('mdfind "kMDItemKind == \'Application\'" | grep Notes.app');
      return true;
    } catch (error) {
      this.logger.error('Notes.app not found', error);
      return false;
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    this.isInitialized = false;
    await this.updateStatus('disconnected');
    this.logger.info('Notes integration disconnected');
  }

  /**
   * Create a new note
   */
  async createNote(params: CreateNoteParams): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Notes integration not initialized');
    }

    try {
      const escapedTitle = params.title.replace(/"/g, '\\"');
      const escapedBody = params.body.replace(/"/g, '\\"');
      const escapedFolder = (params.folder || 'Notes').replace(/"/g, '\\"');

      const script = `
tell application "Notes"
    tell folder "${escapedFolder}"
        make new note with properties {name:"${escapedTitle}", body:"${escapedBody}"}
    end tell
end tell
`;

      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);

      await this.logActivity({
        activityType: 'note',
        action: 'created',
        title: `Created note: ${params.title}`,
        description: params.body.substring(0, 100),
        metadata: { folder: params.folder || 'Notes' },
        status: 'success',
      });

      return {
        success: true,
        title: params.title,
        folder: params.folder || 'Notes',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to create note', error);

      await this.logActivity({
        activityType: 'note',
        action: 'created',
        title: `Failed to create note: ${params.title}`,
        description: error instanceof Error ? error.message : 'Unknown error',
        metadata: { folder: params.folder || 'Notes' },
        status: 'failed',
      });

      throw error;
    }
  }

  /**
   * Search notes by keyword
   */
  async searchNotes(keyword: string): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('Notes integration not initialized');
    }

    try {
      const escapedKeyword = keyword.replace(/"/g, '\\"');

      const script = `
tell application "Notes"
    set foundNotes to {}
    repeat with aNote in every note
        if body of aNote contains "${escapedKeyword}" or name of aNote contains "${escapedKeyword}" then
            set end of foundNotes to {name:name of aNote, body:body of aNote}
        end if
    end repeat
    return foundNotes
end tell
`;

      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);

      // Simple parsing - in production, would need better AppleScript output formatting
      return [];
    } catch (error) {
      this.logger.error('Failed to search notes', error);
      throw error;
    }
  }
}
