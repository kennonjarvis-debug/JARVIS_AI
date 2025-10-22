import { AIRouterService } from '../../services/ai/ai-router.service.js';
import { PromptManagerService } from '../../services/ai/prompt-manager.service.js';
import { logger } from '../../services/logger.service.js';

export interface SocialMediaConfig {
  aiRouter: AIRouterService;
  promptManager: PromptManagerService;
  defaultPlatform?: 'twitter' | 'linkedin' | 'facebook' | 'instagram';
}

export interface PostRequest {
  topic: string;
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram';
  tone?: 'professional' | 'casual' | 'humorous' | 'inspirational';
  includeHashtags?: boolean;
  includeCTA?: boolean;
  keywords?: string[];
}

export interface GeneratedPost {
  content: string;
  hashtags: string[];
  platform: string;
  estimatedEngagement: number;
  cost: number;
}

/**
 * Social Media Content Generation Template
 * Creates engaging posts for various platforms
 */
export class SocialMediaTemplate {
  private aiRouter: AIRouterService;
  private promptManager: PromptManagerService;
  private config: Required<SocialMediaConfig>;

  // Platform-specific limits
  private platformLimits = {
    twitter: 280,
    linkedin: 3000,
    facebook: 63206,
    instagram: 2200,
  };

  constructor(config: SocialMediaConfig) {
    this.config = {
      aiRouter: config.aiRouter,
      promptManager: config.promptManager,
      defaultPlatform: config.defaultPlatform || 'twitter',
    };

    this.aiRouter = config.aiRouter;
    this.promptManager = config.promptManager;

    logger.info('Social Media template initialized');
  }

  /**
   * Generate a social media post
   */
  async generatePost(request: PostRequest): Promise<GeneratedPost> {
    logger.info('Generating social media post', {
      topic: request.topic,
      platform: request.platform,
    });

    const maxLength = this.platformLimits[request.platform];

    const prompt = this.promptManager.render('social-post', {
      platform: request.platform,
      topic: request.topic,
      tone: request.tone || 'professional',
      max_length: maxLength.toString(),
      include_hashtags: request.includeHashtags ? 'yes' : 'no',
    });

    // Add platform-specific guidelines
    const guidelines = this.getPlatformGuidelines(request.platform);

    const response = await this.aiRouter.chat([
      { role: 'system', content: guidelines },
      { role: 'user', content: prompt },
    ], { taskType: 'creative' });

    // Extract hashtags
    const hashtags = this.extractHashtags(response.content);

    // Remove hashtags from content if they should be separate
    let content = response.content;
    if (request.platform === 'instagram' || request.platform === 'twitter') {
      content = content.replace(/#\w+/g, '').trim();
    }

    return {
      content,
      hashtags,
      platform: request.platform,
      estimatedEngagement: this.estimateEngagement(content, hashtags.length),
      cost: response.cost,
    };
  }

  /**
   * Generate a thread/carousel
   */
  async generateThread(
    topic: string,
    platform: 'twitter' | 'linkedin',
    numPosts: number = 3
  ): Promise<GeneratedPost[]> {
    logger.info('Generating thread', { topic, platform, numPosts });

    const prompt = `Create a ${numPosts}-post thread about "${topic}" for ${platform}.
Each post should:
1. Build on the previous one
2. Be engaging and informative
3. Stay within character limits
4. Use appropriate hashtags

Format each post clearly labeled as "Post 1:", "Post 2:", etc.`;

    const response = await this.aiRouter.chat([
      { role: 'system', content: this.getPlatformGuidelines(platform) },
      { role: 'user', content: prompt },
    ], { taskType: 'creative' });

    // Parse individual posts
    const posts = this.parseThread(response.content);

    return posts.slice(0, numPosts).map((content, index) => ({
      content,
      hashtags: this.extractHashtags(content),
      platform,
      estimatedEngagement: this.estimateEngagement(content, 0),
      cost: response.cost / numPosts,
    }));
  }

  /**
   * Generate content calendar
   */
  async generateContentCalendar(
    topics: string[],
    platform: string,
    daysAhead: number = 7
  ): Promise<Array<{
    date: Date;
    post: GeneratedPost;
  }>> {
    const calendar: Array<{ date: Date; post: GeneratedPost }> = [];

    for (let i = 0; i < Math.min(topics.length, daysAhead); i++) {
      const post = await this.generatePost({
        topic: topics[i],
        platform: platform as any,
        includeHashtags: true,
      });

      const date = new Date();
      date.setDate(date.getDate() + i + 1);

      calendar.push({ date, post });
    }

    return calendar;
  }

  /**
   * Analyze post performance and suggest improvements
   */
  async analyzeAndImprove(
    post: string,
    platform: string,
    metrics: {
      likes: number;
      shares: number;
      comments: number;
      reach: number;
    }
  ): Promise<{
    analysis: string;
    suggestions: string[];
    improvedPost: string;
  }> {
    const prompt = `Analyze this ${platform} post and its performance:

Post: "${post}"

Metrics:
- Likes: ${metrics.likes}
- Shares: ${metrics.shares}
- Comments: ${metrics.comments}
- Reach: ${metrics.reach}

Provide:
1. Analysis of what worked and what didn't
2. 3-5 specific improvement suggestions
3. An improved version of the post

Format your response as JSON:
{
  "analysis": "...",
  "suggestions": ["...", "..."],
  "improvedPost": "..."
}`;

    const response = await this.aiRouter.chat([
      { role: 'user', content: prompt },
    ], { taskType: 'analysis' });

    try {
      return JSON.parse(response.content);
    } catch {
      return {
        analysis: 'Unable to analyze post',
        suggestions: [],
        improvedPost: post,
      };
    }
  }

  /**
   * Generate hashtag suggestions
   */
  async suggestHashtags(
    topic: string,
    platform: string,
    count: number = 5
  ): Promise<string[]> {
    const prompt = `Suggest ${count} relevant, trending hashtags for a ${platform} post about "${topic}".
Return only the hashtags, one per line, without the # symbol.`;

    const response = await this.aiRouter.chat([
      { role: 'user', content: prompt },
    ], { taskType: 'simple' });

    return response.content
      .split('\n')
      .map(h => h.trim())
      .filter(h => h.length > 0)
      .slice(0, count);
  }

  /**
   * Get platform-specific guidelines
   */
  private getPlatformGuidelines(platform: string): string {
    const guidelines = {
      twitter: `Twitter best practices:
- Keep it concise and punchy
- Use 1-2 relevant hashtags
- Include a call-to-action
- Make it shareable
- Current character limit: 280`,

      linkedin: `LinkedIn best practices:
- Professional and insightful tone
- Share expertise and value
- Use clear formatting with line breaks
- 3-5 relevant hashtags at the end
- Engage with industry trends`,

      facebook: `Facebook best practices:
- Conversational and engaging
- Use questions to encourage comments
- Include visual descriptions
- Emoji usage is acceptable
- Clear call-to-action`,

      instagram: `Instagram best practices:
- Visual-first mindset
- Engaging caption with story
- Use 5-10 relevant hashtags
- Include call-to-action
- Emoji usage encouraged
- Break text with line breaks`,
    };

    return guidelines[platform as keyof typeof guidelines] || guidelines.twitter;
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[\w]+/g) || [];
    return matches.map(h => h.substring(1));
  }

  /**
   * Parse thread into individual posts
   */
  private parseThread(content: string): string[] {
    const posts: string[] = [];
    const lines = content.split('\n');

    let currentPost = '';
    for (const line of lines) {
      if (line.match(/^Post \d+:/)) {
        if (currentPost) {
          posts.push(currentPost.trim());
        }
        currentPost = line.replace(/^Post \d+:/, '').trim();
      } else {
        currentPost += '\n' + line;
      }
    }

    if (currentPost) {
      posts.push(currentPost.trim());
    }

    return posts;
  }

  /**
   * Estimate engagement score
   */
  private estimateEngagement(content: string, hashtagCount: number): number {
    let score = 50; // Base score

    // Length score
    if (content.length > 100 && content.length < 300) score += 10;

    // Question mark (engagement prompt)
    if (content.includes('?')) score += 15;

    // Call to action
    if (content.toLowerCase().match(/click|learn|discover|join|share/)) {
      score += 10;
    }

    // Hashtags
    if (hashtagCount >= 1 && hashtagCount <= 5) score += 10;

    // Emoji
    if (content.match(/[\u{1F600}-\u{1F64F}]/u)) score += 5;

    return Math.min(100, score);
  }
}

export default SocialMediaTemplate;
