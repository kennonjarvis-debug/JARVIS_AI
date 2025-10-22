import { logger } from '../logger.service.js';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface PromptVersion {
  version: number;
  template: string;
  performance?: {
    avgRating: number;
    usageCount: number;
    successRate: number;
  };
  createdAt: Date;
}

/**
 * Prompt Management Service
 * Template management, versioning, and A/B testing
 */
export class PromptManagerService {
  private templates: Map<string, PromptTemplate> = new Map();
  private versions: Map<string, PromptVersion[]> = new Map();
  private usageStats: Map<string, { uses: number; ratings: number[] }> = new Map();

  constructor() {
    logger.info('Prompt Manager service initialized');
    this.initializeCommonPrompts();
  }

  /**
   * Initialize common prompt templates
   */
  private initializeCommonPrompts(): void {
    // Email response template
    this.createTemplate({
      id: 'email-response',
      name: 'Email Response',
      description: 'Professional email response template',
      template: `You are a professional email assistant. Compose a ${'{tone}'} response to the following email:

Original email: ${'{email_content}'}

Context: ${'{context}'}

Please provide a well-structured response that addresses all points raised.`,
      category: 'email',
      variables: ['tone', 'email_content', 'context'],
    });

    // Social media post template
    this.createTemplate({
      id: 'social-post',
      name: 'Social Media Post',
      description: 'Engaging social media post generator',
      template: `Create an engaging ${'{platform}'} post about ${'{topic}'}.

Tone: ${'{tone}'}
Max length: ${'{max_length}'} characters
Include hashtags: ${'{include_hashtags}'}

Make it compelling and shareable.`,
      category: 'social-media',
      variables: ['platform', 'topic', 'tone', 'max_length', 'include_hashtags'],
    });

    // Customer support template
    this.createTemplate({
      id: 'customer-support',
      name: 'Customer Support Response',
      description: 'Empathetic customer support response',
      template: `You are a customer support specialist. Respond to this customer inquiry:

Issue: ${'{issue}'}
Customer sentiment: ${'{sentiment}'}
Priority: ${'{priority}'}

Provide a helpful, empathetic response that resolves the issue or escalates appropriately.`,
      category: 'customer-service',
      variables: ['issue', 'sentiment', 'priority'],
    });

    // Content summarization template
    this.createTemplate({
      id: 'summarize',
      name: 'Content Summarization',
      description: 'Summarize content concisely',
      template: `Summarize the following ${'{content_type}'} in ${'{length}'} style:

Content: ${'{content}'}

Focus on: ${'{focus_areas}'}

Provide a clear, structured summary.`,
      category: 'analysis',
      variables: ['content_type', 'length', 'content', 'focus_areas'],
    });

    // Code review template
    this.createTemplate({
      id: 'code-review',
      name: 'Code Review',
      description: 'Comprehensive code review',
      template: `Review the following ${'{language}'} code:

\`\`\`${'{language}'}
${'{code}'}
\`\`\`

Focus on:
- Code quality and best practices
- Potential bugs or issues
- Performance optimization
- Security concerns
${'{additional_focus}'}

Provide constructive feedback with specific suggestions.`,
      category: 'coding',
      variables: ['language', 'code', 'additional_focus'],
    });
  }

  /**
   * Create a new prompt template
   */
  createTemplate(params: Omit<PromptTemplate, 'version' | 'createdAt' | 'updatedAt'>): void {
    const template: PromptTemplate = {
      ...params,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(template.id, template);

    // Initialize version history
    this.versions.set(template.id, [{
      version: 1,
      template: template.template,
      createdAt: new Date(),
    }]);

    logger.info('Prompt template created', {
      id: template.id,
      name: template.name,
    });
  }

  /**
   * Update a prompt template (creates new version)
   */
  updateTemplate(id: string, newTemplate: string): void {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    // Increment version
    template.version++;
    template.template = newTemplate;
    template.updatedAt = new Date();

    // Add to version history
    const versions = this.versions.get(id) || [];
    versions.push({
      version: template.version,
      template: newTemplate,
      createdAt: new Date(),
    });
    this.versions.set(id, versions);

    this.templates.set(id, template);

    logger.info('Prompt template updated', {
      id,
      version: template.version,
    });
  }

  /**
   * Get a prompt template
   */
  getTemplate(id: string, version?: number): PromptTemplate | undefined {
    const template = this.templates.get(id);
    if (!template) return undefined;

    // If specific version requested, reconstruct from history
    if (version !== undefined && version !== template.version) {
      const versions = this.versions.get(id) || [];
      const versionData = versions.find(v => v.version === version);

      if (versionData) {
        return {
          ...template,
          template: versionData.template,
          version: versionData.version,
        };
      }
    }

    return template;
  }

  /**
   * Render a prompt with variables
   */
  render(id: string, variables: Record<string, any>): string {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    // Replace variables in template
    let rendered = template.template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `\${'{${key}'}'}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Track usage
    const stats = this.usageStats.get(id) || { uses: 0, ratings: [] };
    stats.uses++;
    this.usageStats.set(id, stats);

    return rendered;
  }

  /**
   * List all templates
   */
  listTemplates(category?: string): PromptTemplate[] {
    const templates = Array.from(this.templates.values());

    if (category) {
      return templates.filter(t => t.category === category);
    }

    return templates;
  }

  /**
   * Get template version history
   */
  getVersionHistory(id: string): PromptVersion[] {
    return this.versions.get(id) || [];
  }

  /**
   * Rate a prompt template
   */
  rateTemplate(id: string, rating: number): void {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const stats = this.usageStats.get(id) || { uses: 0, ratings: [] };
    stats.ratings.push(rating);
    this.usageStats.set(id, stats);

    logger.debug('Prompt template rated', { id, rating });
  }

  /**
   * Get template performance metrics
   */
  getMetrics(id: string): {
    uses: number;
    avgRating: number;
    totalRatings: number;
  } | undefined {
    const stats = this.usageStats.get(id);
    if (!stats) return undefined;

    const avgRating = stats.ratings.length > 0
      ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length
      : 0;

    return {
      uses: stats.uses,
      avgRating,
      totalRatings: stats.ratings.length,
    };
  }

  /**
   * A/B test two prompt versions
   */
  async abTest(
    id: string,
    versionA: number,
    versionB: number,
    testData: Array<{ variables: Record<string, any> }>
  ): Promise<{
    versionA: { version: number; avgRating: number };
    versionB: { version: number; avgRating: number };
    winner: number;
  }> {
    const templateA = this.getTemplate(id, versionA);
    const templateB = this.getTemplate(id, versionB);

    if (!templateA || !templateB) {
      throw new Error('Invalid versions for A/B test');
    }

    logger.info('Starting A/B test', { id, versionA, versionB });

    // In production, this would run actual tests with users
    // For now, return mock results
    const mockRatingA = 4.2;
    const mockRatingB = 4.5;

    return {
      versionA: { version: versionA, avgRating: mockRatingA },
      versionB: { version: versionB, avgRating: mockRatingB },
      winner: mockRatingB > mockRatingA ? versionB : versionA,
    };
  }

  /**
   * Optimize prompt using AI feedback
   */
  async optimizePrompt(
    id: string,
    feedback: string[]
  ): Promise<string> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    // In production, use AI to improve prompt based on feedback
    // For now, log optimization request
    logger.info('Prompt optimization requested', {
      id,
      feedbackCount: feedback.length,
    });

    return template.template;
  }

  /**
   * Export templates
   */
  export(): any[] {
    return Array.from(this.templates.values()).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      template: t.template,
      variables: t.variables,
      category: t.category,
      version: t.version,
    }));
  }

  /**
   * Import templates
   */
  import(data: any[]): void {
    for (const item of data) {
      this.createTemplate(item);
    }

    logger.info('Prompt templates imported', { count: data.length });
  }

  /**
   * Delete a template
   */
  deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) {
      this.versions.delete(id);
      this.usageStats.delete(id);
      logger.info('Prompt template deleted', { id });
    }
    return deleted;
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): PromptTemplate[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.category.toLowerCase().includes(lowerQuery)
    );
  }
}

export default PromptManagerService;
