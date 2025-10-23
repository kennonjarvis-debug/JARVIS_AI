/**
 * DAWG AI Project Exporter Integration
 *
 * Integrates the DAWG project exporter into JARVIS Control Plane
 * Allows JARVIS to fetch and export DAWG AI projects on command
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface DAWGExportOptions {
  projectIdentifier: string; // Project ID or name
  outputDir?: string;
  uiOnly?: boolean; // Strip functional logic, keep only UI
  format?: 'json' | 'yaml';
}

export interface DAWGExportResult {
  success: boolean;
  filepath?: string;
  project?: any;
  error?: string;
}

/**
 * DAWG AI Exporter Integration
 */
export class DAWGExporterIntegration {
  private exporterPath = '/Users/benkennon/JARVIS_AI/dev';

  constructor() {
    this.checkSetup();
  }

  /**
   * Check if exporter is set up correctly
   */
  private async checkSetup(): Promise<boolean> {
    try {
      await fs.access(path.join(this.exporterPath, 'dawg-project-exporter.ts'));
      await fs.access(path.join(this.exporterPath, 'package.json'));
      return true;
    } catch (error) {
      console.warn('⚠️  DAWG Exporter not found at:', this.exporterPath);
      console.warn('   Run setup: cd /Users/benkennon/JARVIS_AI/dev && npm install');
      return false;
    }
  }

  /**
   * List all available DAWG AI projects
   */
  async listProjects(): Promise<any[]> {
    try {
      const { stdout, stderr } = await execAsync(
        'npm run export list',
        {
          cwd: this.exporterPath,
          env: process.env
        }
      );

      if (stderr && stderr.includes('ERROR')) {
        throw new Error(stderr);
      }

      // Parse output to extract project list
      // This is a simplified version - adjust based on actual output format
      console.log('📁 Projects list:', stdout);
      return JSON.parse(stdout); // Adjust parsing as needed
    } catch (error) {
      console.error('❌ Failed to list DAWG projects:', error);
      throw error;
    }
  }

  /**
   * Export a DAWG AI project
   */
  async exportProject(options: DAWGExportOptions): Promise<DAWGExportResult> {
    const {
      projectIdentifier,
      outputDir = path.join(this.exporterPath, 'demo-project-2'),
      uiOnly = false,
    } = options;

    try {
      // Build command
      const uiOnlyFlag = uiOnly ? '--ui-only' : '';
      const command = `npm run export export "${projectIdentifier}" "${outputDir}" ${uiOnlyFlag}`;

      console.log(`📦 Exporting DAWG project: ${projectIdentifier}`);
      console.log(`   Output: ${outputDir}`);
      console.log(`   UI-only: ${uiOnly}`);

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.exporterPath,
        env: process.env,
      });

      if (stderr && stderr.includes('ERROR')) {
        return {
          success: false,
          error: stderr,
        };
      }

      console.log('✅ Export successful:', stdout);

      // Try to read the exported file
      try {
        const files = await fs.readdir(outputDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        if (jsonFiles.length > 0) {
          const latestFile = jsonFiles.sort().pop();
          const filepath = path.join(outputDir, latestFile!);
          const content = await fs.readFile(filepath, 'utf-8');
          const project = JSON.parse(content);

          return {
            success: true,
            filepath,
            project,
          };
        }
      } catch (readError) {
        console.warn('⚠️  Could not read exported file:', readError);
      }

      return {
        success: true,
        filepath: outputDir,
      };
    } catch (error) {
      console.error('❌ Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Export a shared DAWG AI project (no auth required)
   */
  async exportSharedProject(
    shareToken: string,
    outputDir?: string,
    uiOnly = false
  ): Promise<DAWGExportResult> {
    const outDir = outputDir || path.join(this.exporterPath, 'demo-project-2');

    try {
      const uiOnlyFlag = uiOnly ? '--ui-only' : '';
      const command = `npm run export export-shared "${shareToken}" "${outDir}" ${uiOnlyFlag}`;

      console.log(`📦 Exporting shared DAWG project: ${shareToken.substring(0, 8)}...`);

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.exporterPath,
        env: process.env,
      });

      if (stderr && stderr.includes('ERROR')) {
        return {
          success: false,
          error: stderr,
        };
      }

      console.log('✅ Shared project export successful');

      return {
        success: true,
        filepath: outDir,
      };
    } catch (error) {
      console.error('❌ Shared project export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get export status and available projects
   */
  async getStatus(): Promise<{
    available: boolean;
    configured: boolean;
    exporterPath: string;
    projectsCount?: number;
  }> {
    const available = await this.checkSetup();

    // Check if credentials are configured
    const envPath = path.join(this.exporterPath, '.env');
    let configured = false;
    try {
      await fs.access(envPath);
      configured = true;
    } catch {
      configured = false;
    }

    return {
      available,
      configured,
      exporterPath: this.exporterPath,
    };
  }
}

// Export singleton
export const dawgExporter = new DAWGExporterIntegration();

/**
 * Register DAWG Exporter with JARVIS Control Plane
 *
 * Call this in your main server setup to enable DAWG export commands
 */
export function registerDAWGExporter(app: any) {
  console.log('🔌 Registering DAWG AI Exporter integration...');

  // Status endpoint
  app.get('/api/integrations/dawg-exporter/status', async (req: any, res: any) => {
    const status = await dawgExporter.getStatus();
    res.json(status);
  });

  // List projects endpoint
  app.get('/api/integrations/dawg-exporter/projects', async (req: any, res: any) => {
    try {
      const projects = await dawgExporter.listProjects();
      res.json({ success: true, projects });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Export project endpoint
  app.post('/api/integrations/dawg-exporter/export', async (req: any, res: any) => {
    const { projectIdentifier, outputDir, uiOnly } = req.body;

    if (!projectIdentifier) {
      return res.status(400).json({
        success: false,
        error: 'projectIdentifier is required',
      });
    }

    const result = await dawgExporter.exportProject({
      projectIdentifier,
      outputDir,
      uiOnly: uiOnly || false,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  });

  // Export shared project endpoint
  app.post('/api/integrations/dawg-exporter/export-shared', async (req: any, res: any) => {
    const { shareToken, outputDir, uiOnly } = req.body;

    if (!shareToken) {
      return res.status(400).json({
        success: false,
        error: 'shareToken is required',
      });
    }

    const result = await dawgExporter.exportSharedProject(shareToken, outputDir, uiOnly || false);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  });

  console.log('✅ DAWG AI Exporter integration registered');
  console.log('   GET  /api/integrations/dawg-exporter/status');
  console.log('   GET  /api/integrations/dawg-exporter/projects');
  console.log('   POST /api/integrations/dawg-exporter/export');
  console.log('   POST /api/integrations/dawg-exporter/export-shared');
}
