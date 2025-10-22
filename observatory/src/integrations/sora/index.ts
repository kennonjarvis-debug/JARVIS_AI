/**
 * OpenAI Sora 2 Integration for Video Generation
 *
 * Enables Jarvis to create AI-generated videos for automated social media posting
 */

import OpenAI from 'openai';
import { Logger } from '../../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SoraVideoRequest {
  prompt: string;
  duration?: number; // seconds (e.g., 5, 10, 20)
  aspectRatio?: '16:9' | '9:16' | '1:1';
  style?: string; // e.g., "cinematic", "realistic", "animated"
}

export interface SoraVideoResult {
  videoUrl: string;
  videoPath?: string;
  duration: number;
  prompt: string;
}

export class SoraIntegration {
  private logger: Logger;
  private openai: OpenAI;
  private outputDir: string;

  constructor() {
    this.logger = new Logger('SoraIntegration');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    this.openai = new OpenAI({ apiKey });
    this.outputDir = path.join(process.cwd(), 'generated-videos');
  }

  /**
   * Initialize the Sora integration
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Sora integration');

    // Create output directory for videos
    await fs.mkdir(this.outputDir, { recursive: true });

    this.logger.info('Sora integration initialized', {
      outputDir: this.outputDir,
    });
  }

  /**
   * Generate a video using Sora 2
   *
   * NOTE: As of October 2025, Sora may require special access.
   * This implementation uses the OpenAI API structure.
   */
  async generateVideo(request: SoraVideoRequest): Promise<SoraVideoResult> {
    this.logger.info('Generating video with Sora', {
      prompt: request.prompt.substring(0, 100),
      duration: request.duration,
    });

    try {
      // NOTE: Update this endpoint when Sora 2 API is officially released
      // Current structure based on OpenAI patterns
      const response = await this.openai.videos.generate({
        model: 'sora-2',
        prompt: request.prompt,
        duration: request.duration || 5,
        // @ts-ignore - Sora-specific parameters
        aspect_ratio: request.aspectRatio || '16:9',
        style: request.style || 'realistic',
      } as any);

      // Download the video
      const videoUrl = response.data[0].url!;
      const videoPath = await this.downloadVideo(videoUrl, request.prompt);

      this.logger.info('Video generated successfully', {
        videoPath,
        duration: request.duration,
      });

      return {
        videoUrl,
        videoPath,
        duration: request.duration || 5,
        prompt: request.prompt,
      };
    } catch (error: any) {
      // Handle Sora not available error
      if (error.message?.includes('model_not_found') || error.status === 404) {
        this.logger.warn('Sora 2 not yet available in your account');
        throw new Error(
          'Sora 2 is not yet available. You may need to:\n' +
          '1. Join the Sora waitlist at https://openai.com/sora\n' +
          '2. Get access approval from OpenAI\n' +
          '3. Upgrade your API tier\n\n' +
          'In the meantime, Jarvis can generate text content and images with DALL-E 3!'
        );
      }

      this.logger.error('Failed to generate video', error);
      throw error;
    }
  }

  /**
   * Generate video prompt ideas using GPT-4
   */
  async generateVideoPrompt(topic: string, style: string = 'engaging'): Promise<string> {
    this.logger.info('Generating video prompt', { topic, style });

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert at creating viral video prompts for Sora AI. Generate detailed, cinematic prompts that will create ${style} videos.`,
        },
        {
          role: 'user',
          content: `Create a detailed video prompt for: ${topic}\n\nThe prompt should be:\n- Highly visual and descriptive\n- Include camera movements\n- Specify lighting and mood\n- Be 2-3 sentences max`,
        },
      ],
    });

    const prompt = completion.choices[0].message.content || '';
    this.logger.info('Generated video prompt', { prompt });

    return prompt;
  }

  /**
   * Download generated video to local storage
   */
  private async downloadVideo(url: string, promptHint: string): Promise<string> {
    const timestamp = Date.now();
    const sanitizedPrompt = promptHint
      .substring(0, 50)
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();

    const filename = `${timestamp}-${sanitizedPrompt}.mp4`;
    const filepath = path.join(this.outputDir, filename);

    this.logger.info('Downloading video', { url, filepath });

    // Download video
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(buffer));

    this.logger.info('Video downloaded', { filepath, size: buffer.byteLength });

    return filepath;
  }

  /**
   * Check if Sora is available in the account
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const models = await this.openai.models.list();
      const soraAvailable = models.data.some(m => m.id.includes('sora'));

      this.logger.info('Sora availability check', { available: soraAvailable });
      return soraAvailable;
    } catch (error) {
      this.logger.error('Failed to check Sora availability', error as Error);
      return false;
    }
  }
}
