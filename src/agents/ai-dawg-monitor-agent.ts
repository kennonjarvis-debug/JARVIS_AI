/**
 * AI DAWG Monitor Agent
 *
 * Monitors the AI DAWG repository for changes and generates marketing content
 * based on features, commits, and progress.
 *
 * Features:
 * - Track git commits and feature additions
 * - Analyze code changes for marketing opportunities
 * - Generate automated social media posts about progress
 * - Monitor project health metrics
 * - Control AI DAWG codebase (when integrated)
 */

import { Logger } from '../utils/logger.js';
import { getAnthropicClient } from '../integrations/anthropic.js';
import { ContentAutomationAgent } from './content-automation-agent.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import chokidar from 'chokidar';

const execAsync = promisify(exec);

export interface CommitInfo {
  hash: string;
  author: string;
  date: Date;
  message: string;
  files: string[];
}

export interface FeatureInfo {
  name: string;
  description: string;
  files: string[];
  commits: string[];
  significance: 'major' | 'minor' | 'patch';
}

export interface ProjectMetrics {
  totalCommits: number;
  linesOfCode: number;
  filesCount: number;
  lastActivity: Date;
  contributors: string[];
  features: FeatureInfo[];
}

export interface MarketingContent {
  topic: string;
  platform: 'twitter' | 'linkedin' | 'all';
  contentType: 'image' | 'text';
  style: string;
}

export class AIDawgMonitorAgent {
  private logger: Logger;
  private anthropic: ReturnType<typeof getAnthropicClient>;
  private contentAgent: ContentAutomationAgent;
  private repoPath: string;
  private watcher: chokidar.FSWatcher | null = null;
  private lastCheckedCommit: string = '';
  private metricsCache: ProjectMetrics | null = null;

  constructor(repoPath: string = '/Users/benkennon/ai-dawg-v0.1') {
    this.logger = new Logger('AIDawgMonitorAgent');
    this.anthropic = getAnthropicClient();
    this.contentAgent = new ContentAutomationAgent();
    this.repoPath = repoPath;
  }

  /**
   * Initialize the monitor agent
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing AI DAWG Monitor Agent', { repoPath: this.repoPath });

    // Initialize content automation agent
    await this.contentAgent.initialize();

    // Get initial commit hash
    this.lastCheckedCommit = await this.getLatestCommitHash();

    // Fetch initial metrics
    this.metricsCache = await this.getProjectMetrics();

    this.logger.info('AI DAWG Monitor Agent initialized', {
      lastCommit: this.lastCheckedCommit.substring(0, 7),
      totalCommits: this.metricsCache.totalCommits,
    });
  }

  /**
   * Start monitoring the repository for changes
   */
  async startMonitoring(options: { autoPost?: boolean } = {}): Promise<void> {
    this.logger.info('Starting AI DAWG repository monitoring', { autoPost: options.autoPost });

    // Watch for file changes
    this.watcher = chokidar.watch(this.repoPath, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    });

    this.watcher.on('change', async (filePath: string) => {
      this.logger.info('File changed', { file: filePath });

      // Check for new commits
      await this.checkForNewCommits(options.autoPost || false);
    });

    // Also check periodically (every 5 minutes)
    setInterval(
      async () => {
        await this.checkForNewCommits(options.autoPost || false);
      },
      5 * 60 * 1000
    );

    this.logger.info('Repository monitoring started');
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.logger.info('Repository monitoring stopped');
    }
  }

  /**
   * Check for new commits since last check
   */
  private async checkForNewCommits(autoPost: boolean): Promise<void> {
    const latestCommit = await this.getLatestCommitHash();

    if (latestCommit !== this.lastCheckedCommit) {
      this.logger.info('New commits detected', {
        old: this.lastCheckedCommit.substring(0, 7),
        new: latestCommit.substring(0, 7),
      });

      // Get commits since last check
      const commits = await this.getCommitsSince(this.lastCheckedCommit);

      // Analyze commits for marketing opportunities
      const marketingOpportunities = await this.analyzeCommitsForMarketing(commits);

      // Post if significant and autoPost enabled
      if (marketingOpportunities.length > 0 && autoPost) {
        for (const opportunity of marketingOpportunities) {
          await this.generateAndPostContent(opportunity);
        }
      }

      // Update last checked commit
      this.lastCheckedCommit = latestCommit;

      // Refresh metrics cache
      this.metricsCache = await this.getProjectMetrics();
    }
  }

  /**
   * Get latest commit hash
   */
  private async getLatestCommitHash(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: this.repoPath });
      return stdout.trim();
    } catch (error) {
      this.logger.warn('Failed to get latest commit', error);
      return '';
    }
  }

  /**
   * Get commits since a specific hash
   */
  private async getCommitsSince(sinceHash: string): Promise<CommitInfo[]> {
    try {
      const { stdout } = await execAsync(
        `git log ${sinceHash}..HEAD --pretty=format:"%H|||%an|||%ad|||%s" --name-only --date=iso`,
        { cwd: this.repoPath }
      );

      const commits: CommitInfo[] = [];
      const commitBlocks = stdout.split('\n\n').filter(Boolean);

      for (const block of commitBlocks) {
        const lines = block.split('\n');
        const [hash, author, date, message] = lines[0].split('|||');
        const files = lines.slice(1).filter(Boolean);

        commits.push({
          hash,
          author,
          date: new Date(date),
          message,
          files,
        });
      }

      return commits;
    } catch (error) {
      this.logger.warn('Failed to get commits', error);
      return [];
    }
  }

  /**
   * Analyze commits for marketing opportunities
   */
  private async analyzeCommitsForMarketing(commits: CommitInfo[]): Promise<MarketingContent[]> {
    if (commits.length === 0) return [];

    this.logger.info('Analyzing commits for marketing opportunities', { count: commits.length });

    const commitSummary = commits
      .map((c) => `- ${c.message} (${c.files.length} files)`)
      .join('\n');

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `Analyze these recent commits to the AI DAWG project (a browser-based DAW):

${commitSummary}

Should we create social media content about these changes? If yes, suggest 1-2 marketing angles.

Return JSON array of marketing opportunities:
[{
  "topic": "specific marketing angle",
  "platform": "twitter" | "linkedin" | "all",
  "contentType": "image" | "text",
  "style": "description of desired style",
  "shouldPost": true | false
}]

Only include entries where shouldPost is true. Return empty array if nothing is marketing-worthy.`,
          },
        ],
      });

      const jsonText = (response.content[0] as any).text;
      const cleanedJson = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const opportunities = JSON.parse(cleanedJson);

      const validOpportunities = opportunities.filter((o: any) => o.shouldPost);

      this.logger.info('Marketing opportunities identified', { count: validOpportunities.length });

      return validOpportunities;
    } catch (error) {
      this.logger.error('Failed to analyze commits', error as Error);
      return [];
    }
  }

  /**
   * Generate and post marketing content
   */
  private async generateAndPostContent(content: MarketingContent): Promise<void> {
    try {
      this.logger.info('Generating and posting content', { topic: content.topic });

      const result = await this.contentAgent.generateAndPost({
        topic: content.topic,
        platform: content.platform,
        contentType: content.contentType,
        style: content.style,
      });

      this.logger.info('Content posted successfully', {
        topic: content.topic,
        url: result.postUrl,
      });
    } catch (error) {
      this.logger.error('Failed to generate/post content', error as Error);
    }
  }

  /**
   * Get comprehensive project metrics
   */
  async getProjectMetrics(): Promise<ProjectMetrics> {
    this.logger.info('Gathering project metrics');

    const [totalCommits, contributors, filesInfo, features] = await Promise.all([
      this.getTotalCommits(),
      this.getContributors(),
      this.getFilesInfo(),
      this.detectFeatures(),
    ]);

    const lastActivity = await this.getLastActivityDate();

    return {
      totalCommits,
      linesOfCode: filesInfo.linesOfCode,
      filesCount: filesInfo.filesCount,
      lastActivity,
      contributors,
      features,
    };
  }

  /**
   * Get total commit count
   */
  private async getTotalCommits(): Promise<number> {
    try {
      const { stdout } = await execAsync('git rev-list --count HEAD', { cwd: this.repoPath });
      return parseInt(stdout.trim(), 10);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get list of contributors
   */
  private async getContributors(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git log --format="%an" | sort -u', {
        cwd: this.repoPath,
      });
      return stdout.split('\n').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get files info (count and LOC)
   */
  private async getFilesInfo(): Promise<{ filesCount: number; linesOfCode: number }> {
    try {
      // Use git ls-files which is much faster than find
      const { stdout: filesCount } = await execAsync(
        'git ls-files "*.ts" "*.tsx" "*.js" "*.jsx" | wc -l',
        { cwd: this.repoPath, timeout: 10000 }
      );

      // Use cloc if available, otherwise estimate
      try {
        const { stdout: linesOfCode } = await execAsync(
          'git ls-files "*.ts" "*.tsx" "*.js" "*.jsx" | xargs wc -l | tail -1 | awk \'{print $1}\'',
          { cwd: this.repoPath, timeout: 10000 }
        );

        return {
          filesCount: parseInt(filesCount.trim(), 10),
          linesOfCode: parseInt(linesOfCode.trim(), 10),
        };
      } catch {
        // Estimate based on file count (average 100 lines per file)
        const count = parseInt(filesCount.trim(), 10);
        return {
          filesCount: count,
          linesOfCode: count * 100,
        };
      }
    } catch (error) {
      return { filesCount: 0, linesOfCode: 0 };
    }
  }

  /**
   * Get last activity date
   */
  private async getLastActivityDate(): Promise<Date> {
    try {
      const { stdout } = await execAsync('git log -1 --format=%ai', { cwd: this.repoPath });
      return new Date(stdout.trim());
    } catch (error) {
      return new Date();
    }
  }

  /**
   * Detect features from commit messages and code structure
   */
  private async detectFeatures(): Promise<FeatureInfo[]> {
    try {
      const { stdout } = await execAsync(
        'git log --pretty=format:"%s" --all | grep -iE "feat|feature|add" | head -20',
        { cwd: this.repoPath }
      );

      const featureCommits = stdout.split('\n').filter(Boolean);

      // Use Claude to cluster and summarize features
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `Analyze these commit messages from a browser-based DAW project and group them into distinct features:

${featureCommits.join('\n')}

Return JSON array of features:
[{
  "name": "feature name",
  "description": "what it does",
  "significance": "major" | "minor" | "patch"
}]`,
          },
        ],
      });

      const jsonText = (response.content[0] as any).text;
      const cleanedJson = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const features = JSON.parse(cleanedJson);

      return features.map((f: any) => ({
        name: f.name,
        description: f.description,
        files: [],
        commits: [],
        significance: f.significance || 'minor',
      }));
    } catch (error) {
      this.logger.warn('Failed to detect features', error);
      return [];
    }
  }

  /**
   * Generate marketing content on demand
   */
  async generateMarketingContent(topic: string, platform: 'twitter' | 'linkedin' | 'all' = 'all'): Promise<void> {
    this.logger.info('Generating marketing content on demand', { topic, platform });

    await this.generateAndPostContent({
      topic,
      platform,
      contentType: 'image',
      style: 'professional and engaging',
    });
  }

  /**
   * Get cached metrics
   */
  getCachedMetrics(): ProjectMetrics | null {
    return this.metricsCache;
  }
}
