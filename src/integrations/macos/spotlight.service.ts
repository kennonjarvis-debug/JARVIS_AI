/**
 * macOS Spotlight Integration Service
 *
 * Provides fast file and data search using Spotlight (mdfind).
 * Integrates Jarvis data into Spotlight index.
 *
 * Features:
 * - Fast file search using mdfind
 * - Content-based search
 * - Metadata queries
 * - Index Jarvis data in Spotlight
 * - Quick access to projects and documents
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface SpotlightResult {
  path: string;
  filename: string;
  type?: string;
  modified?: Date;
  size?: number;
}

export interface SearchOptions {
  scope?: string; // Directory to search in
  contentType?: string; // kMDItemContentType
  maxResults?: number;
  sortBy?: 'name' | 'date' | 'size';
}

export class SpotlightService extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Search files using Spotlight
   */
  async search(query: string, options: SearchOptions = {}): Promise<SpotlightResult[]> {
    const { scope, contentType, maxResults = 100 } = options;

    let command = `mdfind`;

    // Add scope if provided
    if (scope) {
      command += ` -onlyin "${scope}"`;
    }

    // Add content type filter
    if (contentType) {
      command += ` "kMDItemContentType == '${contentType}'"`;
    } else {
      command += ` "${query}"`;
    }

    // Add max results limit
    command += ` | head -n ${maxResults}`;

    try {
      const { stdout } = await execAsync(command);

      const paths = stdout
        .split('\n')
        .filter(line => line.trim())
        .map(filePath => filePath.trim());

      const results: SpotlightResult[] = [];

      for (const filePath of paths) {
        try {
          const stats = fs.statSync(filePath);
          results.push({
            path: filePath,
            filename: path.basename(filePath),
            modified: stats.mtime,
            size: stats.size,
          });
        } catch {
          // File might have been deleted, skip
          results.push({
            path: filePath,
            filename: path.basename(filePath),
          });
        }
      }

      this.emit('search_completed', { query, resultCount: results.length });
      return results;
    } catch (error) {
      console.error('[Spotlight] Search failed:', error);
      this.emit('error', error);
      return [];
    }
  }

  /**
   * Search by file name
   */
  async searchByName(filename: string, options: SearchOptions = {}): Promise<SpotlightResult[]> {
    const query = `kMDItemFSName == "*${filename}*"wc`;
    return this.search(query, options);
  }

  /**
   * Search by content
   */
  async searchByContent(content: string, options: SearchOptions = {}): Promise<SpotlightResult[]> {
    const query = `kMDItemTextContent == "*${content}*"wc`;
    return this.search(query, options);
  }

  /**
   * Search by file type
   */
  async searchByType(fileType: string, options: SearchOptions = {}): Promise<SpotlightResult[]> {
    const query = `kMDItemContentType == "${fileType}"`;
    return this.search(query, options);
  }

  /**
   * Search for documents
   */
  async searchDocuments(query: string, scope?: string): Promise<SpotlightResult[]> {
    const types = [
      'public.text',
      'public.pdf',
      'com.microsoft.word.doc',
      'org.openxmlformats.wordprocessingml.document',
    ];

    const typeQuery = types.map(t => `kMDItemContentType == "${t}"`).join(' || ');
    const fullQuery = `(${typeQuery}) && kMDItemTextContent == "*${query}*"wc`;

    return this.search(fullQuery, { scope });
  }

  /**
   * Search for images
   */
  async searchImages(query?: string, scope?: string): Promise<SpotlightResult[]> {
    const baseQuery = 'kMDItemContentTypeTree == "public.image"';
    const fullQuery = query ? `${baseQuery} && kMDItemFSName == "*${query}*"wc` : baseQuery;

    return this.search(fullQuery, { scope });
  }

  /**
   * Search for code files
   */
  async searchCode(query: string, scope?: string): Promise<SpotlightResult[]> {
    const extensions = ['.ts', '.js', '.py', '.java', '.cpp', '.go', '.rs', '.swift'];
    const extQuery = extensions.map(ext => `kMDItemFSName == "*${ext}"`).join(' || ');
    const fullQuery = `(${extQuery}) && kMDItemTextContent == "*${query}*"wc`;

    return this.search(fullQuery, { scope });
  }

  /**
   * Search Jarvis projects
   */
  async searchJarvisProjects(query?: string): Promise<SpotlightResult[]> {
    const jarvisDir = path.join(process.env.HOME || '', 'Jarvis');

    if (query) {
      return this.search(query, { scope: jarvisDir });
    } else {
      return this.search('*', { scope: jarvisDir, maxResults: 50 });
    }
  }

  /**
   * Get file metadata using mdls
   */
  async getMetadata(filePath: string): Promise<Record<string, any>> {
    try {
      const { stdout } = await execAsync(`mdls "${filePath}"`);

      const metadata: Record<string, any> = {};
      const lines = stdout.split('\n');

      for (const line of lines) {
        const match = line.match(/^(\w+)\s+=\s+(.+)$/);
        if (match) {
          const [, key, value] = match;
          metadata[key] = value.trim();
        }
      }

      return metadata;
    } catch (error) {
      console.error('[Spotlight] Failed to get metadata:', error);
      return {};
    }
  }

  /**
   * Index a file for Spotlight (add metadata)
   */
  async indexFile(filePath: string, metadata: Record<string, string>): Promise<boolean> {
    // Note: Indexing custom metadata requires writing .xattr files
    // This is a simplified version
    try {
      for (const [key, value] of Object.entries(metadata)) {
        await execAsync(`xattr -w "com.jarvis.${key}" "${value}" "${filePath}"`);
      }

      this.emit('file_indexed', { filePath, metadata });
      return true;
    } catch (error) {
      console.error('[Spotlight] Failed to index file:', error);
      return false;
    }
  }

  /**
   * Search recently modified files
   */
  async searchRecentFiles(days: number = 7, scope?: string): Promise<SpotlightResult[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const dateStr = date.toISOString().split('T')[0];

    const query = `kMDItemFSContentChangeDate >= $time.iso(${dateStr})`;
    return this.search(query, { scope, maxResults: 100 });
  }

  /**
   * Search large files
   */
  async searchLargeFiles(minSizeMB: number = 100, scope?: string): Promise<SpotlightResult[]> {
    const minSizeBytes = minSizeMB * 1024 * 1024;
    const query = `kMDItemFSSize >= ${minSizeBytes}`;
    return this.search(query, { scope, maxResults: 50 });
  }

  /**
   * Quick search presets for common tasks
   */
  presets = {
    /**
     * Find all PDFs
     */
    pdfs: async (scope?: string) => {
      return this.searchByType('com.adobe.pdf', { scope });
    },

    /**
     * Find all screenshots
     */
    screenshots: async () => {
      const desktopPath = path.join(process.env.HOME || '', 'Desktop');
      return this.searchByName('Screen Shot', { scope: desktopPath });
    },

    /**
     * Find downloads
     */
    downloads: async (days: number = 7) => {
      const downloadsPath = path.join(process.env.HOME || '', 'Downloads');
      return this.searchRecentFiles(days, downloadsPath);
    },

    /**
     * Find documents modified today
     */
    todayDocuments: async () => {
      const today = new Date().toISOString().split('T')[0];
      const query = `kMDItemContentTypeTree == "public.content" && kMDItemFSContentChangeDate >= $time.iso(${today})`;
      return this.search(query);
    },

    /**
     * Find all videos
     */
    videos: async (scope?: string) => {
      const query = 'kMDItemContentTypeTree == "public.movie"';
      return this.search(query, { scope });
    },

    /**
     * Find all audio files
     */
    audio: async (scope?: string) => {
      const query = 'kMDItemContentTypeTree == "public.audio"';
      return this.search(query, { scope });
    },
  };

  /**
   * Open file in Finder
   */
  async openInFinder(filePath: string): Promise<void> {
    try {
      await execAsync(`open -R "${filePath}"`);
    } catch (error) {
      console.error('[Spotlight] Failed to open in Finder:', error);
      throw error;
    }
  }

  /**
   * Open file with default application
   */
  async openFile(filePath: string): Promise<void> {
    try {
      await execAsync(`open "${filePath}"`);
    } catch (error) {
      console.error('[Spotlight] Failed to open file:', error);
      throw error;
    }
  }

  /**
   * Trigger Spotlight search UI
   */
  async openSpotlight(query?: string): Promise<void> {
    try {
      if (query) {
        // AppleScript to open Spotlight with query
        const script = `
          tell application "System Events"
            keystroke space using command down
            delay 0.5
            keystroke "${query}"
          end tell
        `;
        await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      } else {
        // Just open Spotlight
        const script = `
          tell application "System Events"
            keystroke space using command down
          end tell
        `;
        await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      }
    } catch (error) {
      console.error('[Spotlight] Failed to open Spotlight:', error);
      throw error;
    }
  }
}

/**
 * Create a singleton instance
 */
export const spotlightService = new SpotlightService();
