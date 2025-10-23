/**
 * DAWG AI Project Exporter
 *
 * Fetches project data from DAWG AI production API and exports it locally.
 * Can be called by JARVIS Control Plane to export projects on demand.
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

interface ProjectData {
  tracks: any[];
  tempo: number;
  timeSignature: [number, number];
  effects?: any[];
  automation?: any[];
  clips?: any[];
}

interface Project {
  id: string;
  user_id: string;
  name: string;
  data: ProjectData;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  share_token?: string;
}

class DAWGProjectExporter {
  private supabase: SupabaseClient | null = null;
  private authenticated = false;

  constructor() {
    // Initialize Supabase client
    const supabaseUrl = process.env.DAWG_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.DAWG_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Connected to DAWG AI Supabase');
    } else {
      console.warn('⚠️  Supabase credentials not found in environment variables');
      console.warn('   Set DAWG_SUPABASE_URL and DAWG_SUPABASE_ANON_KEY');
    }
  }

  /**
   * Authenticate with email/password
   */
  async authenticate(email: string, password: string): Promise<boolean> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Authentication failed:', error.message);
      return false;
    }

    this.authenticated = true;
    console.log('✅ Authenticated as:', data.user?.email);
    return true;
  }

  /**
   * List all projects for authenticated user
   */
  async listProjects(): Promise<Project[]> {
    if (!this.supabase || !this.authenticated) {
      throw new Error('Not authenticated');
    }

    const { data: projects, error } = await this.supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list projects: ${error.message}`);
    }

    return projects || [];
  }

  /**
   * Fetch project by ID
   */
  async fetchProject(projectId: string): Promise<Project> {
    if (!this.supabase || !this.authenticated) {
      throw new Error('Not authenticated');
    }

    const { data: project, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    return project;
  }

  /**
   * Fetch project by name (searches for matching project)
   */
  async fetchProjectByName(projectName: string): Promise<Project> {
    if (!this.supabase || !this.authenticated) {
      throw new Error('Not authenticated');
    }

    const { data: projects, error } = await this.supabase
      .from('projects')
      .select('*')
      .ilike('name', `%${projectName}%`);

    if (error) {
      throw new Error(`Failed to search projects: ${error.message}`);
    }

    if (!projects || projects.length === 0) {
      throw new Error(`No project found matching: ${projectName}`);
    }

    if (projects.length > 1) {
      console.warn(`⚠️  Found ${projects.length} matching projects:`);
      projects.forEach(p => console.warn(`   - ${p.name} (${p.id})`));
      console.warn('   Using first match');
    }

    return projects[0];
  }

  /**
   * Fetch shared project by token (no auth required)
   */
  async fetchSharedProject(shareToken: string): Promise<Project> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data: project, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('share_token', shareToken)
      .eq('is_public', true)
      .single();

    if (error) {
      throw new Error(`Failed to fetch shared project: ${error.message}`);
    }

    return project;
  }

  /**
   * Export project to local directory
   */
  async exportProject(
    project: Project,
    outputDir: string,
    options: { format?: 'json' | 'yaml'; stripFunctional?: boolean } = {}
  ): Promise<string> {
    const { format = 'json', stripFunctional = false } = options;

    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    // Prepare project data
    let projectData = { ...project };

    if (stripFunctional) {
      // Remove functional logic, keep only UI/layout data
      projectData = this.stripFunctionalLogic(projectData);
    }

    // Generate filename
    const sanitizedName = project.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${sanitizedName}_${timestamp}.${format}`;
    const filepath = path.join(outputDir, filename);

    // Write to file
    if (format === 'json') {
      await fs.writeFile(filepath, JSON.stringify(projectData, null, 2));
    } else {
      // TODO: Implement YAML export if needed
      throw new Error('YAML export not yet implemented');
    }

    console.log(`✅ Exported project to: ${filepath}`);
    return filepath;
  }

  /**
   * Strip functional logic from project, leaving only UI/layout structure
   */
  private stripFunctionalLogic(project: Project): Partial<Project> {
    return {
      id: project.id,
      name: project.name + ' (UI Only)',
      created_at: project.created_at,
      updated_at: project.updated_at,
      data: {
        tracks: project.data.tracks.map(track => ({
          id: track.id || 'track-placeholder',
          name: track.name || 'Unnamed Track',
          type: track.type || 'audio',
          volume: 0.8,
          pan: 0,
          muted: false,
          solo: false,
          // Remove actual audio data/buffers
          clips: [],
          effects: [],
        })),
        tempo: 120, // Default tempo
        timeSignature: [4, 4] as [number, number],
        // Remove automation curves, effects chains, etc.
        effects: [],
        automation: [],
        clips: [],
      },
    };
  }
}

// CLI Usage
async function main() {
  const exporter = new DAWGProjectExporter();

  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'list': {
        const email = process.env.DAWG_USER_EMAIL;
        const password = process.env.DAWG_USER_PASSWORD;

        if (!email || !password) {
          console.error('❌ Set DAWG_USER_EMAIL and DAWG_USER_PASSWORD environment variables');
          process.exit(1);
        }

        await exporter.authenticate(email, password);
        const projects = await exporter.listProjects();

        console.log(`\n📁 Found ${projects.length} projects:`);
        projects.forEach(p => {
          console.log(`   - ${p.name} (${p.id})`);
          console.log(`     Updated: ${new Date(p.updated_at).toLocaleDateString()}`);
        });
        break;
      }

      case 'export': {
        const projectIdentifier = args[1]; // Can be ID or name
        const outputDir = args[2] || '/Users/benkennon/JARVIS_AI/dev';
        const stripFunctional = args.includes('--ui-only');

        if (!projectIdentifier) {
          console.error('❌ Usage: export <project-id-or-name> [output-dir] [--ui-only]');
          process.exit(1);
        }

        // Try to authenticate
        const email = process.env.DAWG_USER_EMAIL;
        const password = process.env.DAWG_USER_PASSWORD;

        if (email && password) {
          await exporter.authenticate(email, password);

          // Try to fetch by ID first, then by name
          let project: Project;
          try {
            project = await exporter.fetchProject(projectIdentifier);
          } catch {
            project = await exporter.fetchProjectByName(projectIdentifier);
          }

          const filepath = await exporter.exportProject(project, outputDir, { stripFunctional });
          console.log(`\n📦 Project exported successfully!`);
          console.log(`   Location: ${filepath}`);
        } else {
          console.error('❌ Set DAWG_USER_EMAIL and DAWG_USER_PASSWORD environment variables');
          process.exit(1);
        }
        break;
      }

      case 'export-shared': {
        const shareToken = args[1];
        const outputDir = args[2] || '/Users/benkennon/JARVIS_AI/dev';
        const stripFunctional = args.includes('--ui-only');

        if (!shareToken) {
          console.error('❌ Usage: export-shared <share-token> [output-dir] [--ui-only]');
          process.exit(1);
        }

        const project = await exporter.fetchSharedProject(shareToken);
        const filepath = await exporter.exportProject(project, outputDir, { stripFunctional });
        console.log(`\n📦 Shared project exported successfully!`);
        console.log(`   Location: ${filepath}`);
        break;
      }

      default:
        console.log(`
DAWG AI Project Exporter
========================

Commands:
  list                                  List all projects for authenticated user
  export <id-or-name> [dir] [--ui-only] Export project by ID or name
  export-shared <token> [dir] [--ui-only]   Export shared project by share token

Environment Variables:
  DAWG_SUPABASE_URL         Supabase project URL
  DAWG_SUPABASE_ANON_KEY    Supabase anon/public key
  DAWG_USER_EMAIL           User email for authentication
  DAWG_USER_PASSWORD        User password for authentication

Examples:
  # List all projects
  npm run export list

  # Export project by name
  npm run export export "demo-project-2" /Users/benkennon/JARVIS_AI/dev/demo-project-2

  # Export as UI-only placeholder
  npm run export export "demo-project-2" /Users/benkennon/JARVIS_AI/dev/demo-project-2 --ui-only

  # Export shared project
  npm run export export-shared abc123token /Users/benkennon/JARVIS_AI/dev/demo-project-2
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DAWGProjectExporter, type Project, type ProjectData };
