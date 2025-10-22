/**
 * Content Automation Agent
 *
 * Generates and posts content automatically using:
 * - DALL-E 3 for images (available now)
 * - Sora 2 for videos (when available)
 * - GPT-4 for captions and text
 *
 * Can post to: Twitter, LinkedIn, Instagram (via APIs when configured)
 */

import { getOpenAIClient, getAnthropicClient } from '../integrations/anthropic.js';
import { TwitterIntegration } from '../integrations/twitter/index.js';
import { LinkedInIntegration } from '../integrations/linkedin/index.js';
import { Logger } from '../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ContentRequest {
  topic: string;
  platform?: 'twitter' | 'linkedin' | 'instagram' | 'all';
  contentType?: 'image' | 'video' | 'text';
  style?: string;
  schedule?: Date;
}

export interface GeneratedContent {
  type: 'image' | 'video' | 'text';
  caption: string;
  mediaUrl?: string;
  mediaPath?: string;
  hashtags: string[];
  platform: string;
}

export class ContentAutomationAgent {
  private logger: Logger;
  private openai: ReturnType<typeof getOpenAIClient>;
  private anthropic: ReturnType<typeof getAnthropicClient>;
  private twitter: TwitterIntegration;
  private linkedin: LinkedInIntegration;
  private outputDir: string;

  constructor() {
    this.logger = new Logger('ContentAutomationAgent');
    this.openai = getOpenAIClient();
    this.anthropic = getAnthropicClient();
    this.twitter = new TwitterIntegration();
    this.linkedin = new LinkedInIntegration();
    this.outputDir = path.join(process.cwd(), 'generated-content');
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Content Automation Agent');

    // Create output directory
    await fs.mkdir(this.outputDir, { recursive: true });

    this.logger.info('Content Automation Agent initialized');
  }

  /**
   * Generate automated content for social media
   */
  async generateContent(request: ContentRequest): Promise<GeneratedContent> {
    this.logger.info('Generating content', {
      topic: request.topic,
      platform: request.platform || 'all',
      type: request.contentType || 'auto',
    });

    // Step 1: Generate caption using Claude
    const caption = await this.generateCaption(request.topic, request.platform || 'twitter');

    // Step 2: Generate hashtags
    const hashtags = await this.generateHashtags(request.topic, request.platform || 'twitter');

    // Step 3: Generate media (image for now, video when Sora available)
    let mediaUrl: string | undefined;
    let mediaPath: string | undefined;
    let contentType: 'image' | 'video' | 'text' = 'text';

    if (request.contentType !== 'text') {
      try {
        // Try to generate image with DALL-E 3
        const imageResult = await this.generateImage(request.topic, request.style);
        mediaUrl = imageResult.url;
        mediaPath = imageResult.path;
        contentType = 'image';

        this.logger.info('Generated image with DALL-E 3', {
          url: mediaUrl,
          path: mediaPath,
        });
      } catch (error) {
        this.logger.warn('Failed to generate image, using text-only post', error);
      }
    }

    return {
      type: contentType,
      caption,
      mediaUrl,
      mediaPath,
      hashtags,
      platform: request.platform || 'all',
    };
  }

  /**
   * Generate caption using Claude
   */
  private async generateCaption(topic: string, platform: string): Promise<string> {
    this.logger.info('Generating caption', { topic, platform });

    const maxLength = platform === 'twitter' ? 280 : 500;

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Create an engaging ${platform} post about: ${topic}\n\nRequirements:\n- Maximum ${maxLength} characters\n- Engaging and conversational\n- Include a call-to-action\n- NO hashtags (they'll be added separately)\n\nReturn only the caption text.`,
        },
      ],
    });

    const caption = (message.content[0] as any).text.trim();
    this.logger.info('Generated caption', { caption: caption.substring(0, 100) });

    return caption;
  }

  /**
   * Generate relevant hashtags
   */
  private async generateHashtags(topic: string, platform: string): Promise<string[]> {
    this.logger.info('Generating hashtags', { topic, platform });

    const count = platform === 'twitter' ? 3 : 5;

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Generate ${count} relevant hashtags for a ${platform} post about: ${topic}\n\nReturn ONLY the hashtags, one per line, with the # symbol.`,
        },
      ],
    });

    const hashtagText = (message.content[0] as any).text;
    const hashtags = hashtagText
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.startsWith('#'))
      .slice(0, count);

    this.logger.info('Generated hashtags', { hashtags });

    return hashtags;
  }

  /**
   * Generate image using DALL-E 3
   */
  private async generateImage(
    topic: string,
    style?: string
  ): Promise<{ url: string; path: string }> {
    this.logger.info('Generating image with DALL-E 3', { topic, style });

    // Generate detailed image prompt
    const promptResponse = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating detailed image prompts for DALL-E 3.',
        },
        {
          role: 'user',
          content: `Create a detailed DALL-E 3 prompt for an image about: ${topic}\n\nStyle: ${style || 'professional and eye-catching'}\n\nReturn only the prompt.`,
        },
      ],
    });

    const imagePrompt = promptResponse.choices[0].message.content || topic;

    // Generate image
    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageUrl = response.data[0].url!;

    // Download image
    const imagePath = await this.downloadImage(imageUrl, topic);

    this.logger.info('Image generated', { url: imageUrl, path: imagePath });

    return {
      url: imageUrl,
      path: imagePath,
    };
  }

  /**
   * Download image to local storage
   */
  private async downloadImage(url: string, topicHint: string): Promise<string> {
    const timestamp = Date.now();
    const sanitizedTopic = topicHint
      .substring(0, 50)
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();

    const filename = `${timestamp}-${sanitizedTopic}.png`;
    const filepath = path.join(this.outputDir, filename);

    this.logger.info('Downloading image', { url, filepath });

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(buffer));

    return filepath;
  }

  /**
   * Generate a batch of content ideas for the week
   */
  async generateContentCalendar(
    theme: string,
    daysCount: number = 7
  ): Promise<ContentRequest[]> {
    this.logger.info('Generating content calendar', { theme, daysCount });

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Create ${daysCount} content ideas for social media posts about: ${theme}\n\nFor each idea, provide:\n1. A specific topic/angle\n2. Best platform (twitter, linkedin, or instagram)\n3. Content type (image or text)\n\nFormat as JSON array with objects: {topic: string, platform: string, contentType: string}\n\nReturn only the JSON array.`,
        },
      ],
    });

    const jsonText = (message.content[0] as any).text;
    const ideas = JSON.parse(jsonText);

    this.logger.info('Generated content calendar', { count: ideas.length });

    return ideas.map((idea: any, index: number) => ({
      topic: idea.topic,
      platform: idea.platform,
      contentType: idea.contentType,
      schedule: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000), // Each day
    }));
  }

  /**
   * Generate and post content automatically
   */
  async generateAndPost(request: ContentRequest): Promise<{ content: GeneratedContent; postUrl?: string }> {
    this.logger.info('Generating and posting content', {
      topic: request.topic,
      platform: request.platform,
    });

    // Generate content
    const content = await this.generateContent(request);

    // Post to appropriate platform(s)
    let postUrl: string | undefined;

    try {
      if (request.platform === 'twitter' || request.platform === 'all') {
        const result = await this.postToTwitter(content);
        postUrl = result.url;
        this.logger.info('Posted to Twitter', { url: result.url });
      }

      if (request.platform === 'linkedin' || (request.platform === 'all' && !postUrl)) {
        const result = await this.postToLinkedIn(content);
        if (!postUrl) postUrl = result.url;
        this.logger.info('Posted to LinkedIn', { url: result.url });
      }
    } catch (error: any) {
      this.logger.error('Failed to post content', error);
      throw new Error(`Posting failed: ${error.message}`);
    }

    return { content, postUrl };
  }

  /**
   * Post content to Twitter
   */
  private async postToTwitter(content: GeneratedContent): Promise<{ tweetId: string; url: string }> {
    const fullText = `${content.caption}\n\n${content.hashtags.join(' ')}`;

    return await this.twitter.postTweet({
      text: fullText,
      mediaPath: content.mediaPath,
      mediaType: content.type === 'video' ? 'video' : 'image',
    });
  }

  /**
   * Post content to LinkedIn
   */
  private async postToLinkedIn(content: GeneratedContent): Promise<{ postId: string; url: string }> {
    const fullText = `${content.caption}\n\n${content.hashtags.join(' ')}`;

    return await this.linkedin.postUpdate({
      text: fullText,
      mediaPath: content.mediaPath,
    });
  }
}
