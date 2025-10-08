/**
 * Sentiment Analyzer
 *
 * Analyzes text sentiment using NLP techniques
 * Uses a simple lexicon-based approach with support for contextual analysis
 */

import { SentimentResult, SentimentKeyword } from './types';

export class SentimentAnalyzer {
  private positiveWords: Set<string>;
  private negativeWords: Set<string>;
  private intensifiers: Set<string>;
  private negations: Set<string>;

  constructor() {
    // Positive sentiment keywords
    this.positiveWords = new Set([
      'love', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'happy', 'pleased', 'satisfied', 'good', 'nice', 'awesome',
      'perfect', 'best', 'helpful', 'thanks', 'appreciate', 'recommend',
      'enjoy', 'impressed', 'outstanding', 'brilliant', 'superb',
      'delighted', 'thrilled', 'grateful', 'glad', 'excited'
    ]);

    // Negative sentiment keywords
    this.negativeWords = new Set([
      'hate', 'terrible', 'awful', 'horrible', 'bad', 'poor',
      'disappointed', 'frustrated', 'angry', 'upset', 'annoyed',
      'useless', 'broken', 'worst', 'fail', 'issue', 'problem',
      'bug', 'error', 'slow', 'difficult', 'confusing', 'unhappy',
      'dissatisfied', 'waste', 'regret', 'complaint', 'concern'
    ]);

    // Intensifiers (increase sentiment strength)
    this.intensifiers = new Set([
      'very', 'extremely', 'really', 'absolutely', 'incredibly',
      'totally', 'completely', 'utterly', 'highly', 'so'
    ]);

    // Negations (flip sentiment)
    this.negations = new Set([
      'not', 'no', 'never', 'neither', 'nobody', 'nothing',
      'nowhere', 'hardly', 'barely', 'scarcely', 'cant', 'wont'
    ]);
  }

  /**
   * Initialize the analyzer
   */
  async initialize(): Promise<void> {
    // Placeholder for future enhancements (loading ML models, etc.)
  }

  /**
   * Analyze sentiment of text
   *
   * @param text - Text to analyze
   * @param context - Optional context for better analysis
   * @returns Sentiment analysis result
   */
  async analyze(text: string, context?: string): Promise<SentimentResult> {
    if (!text || text.trim().length === 0) {
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
        keywords: [],
        context
      };
    }

    // Tokenize and normalize
    const tokens = this.tokenize(text);
    const normalizedTokens = tokens.map(t => t.toLowerCase());

    // Count sentiment keywords
    let positiveCount = 0;
    let negativeCount = 0;
    const keywords: SentimentKeyword[] = [];

    for (let i = 0; i < normalizedTokens.length; i++) {
      const token = normalizedTokens[i];
      const prevToken = i > 0 ? normalizedTokens[i - 1] : null;
      const isNegated = prevToken && this.negations.has(prevToken);
      const isIntensified = prevToken && this.intensifiers.has(prevToken);
      const weight = isIntensified ? 2 : 1;

      // Check positive
      if (this.positiveWords.has(token)) {
        if (isNegated) {
          negativeCount += weight;
          keywords.push({ word: token, sentiment: 'negative', weight: -weight });
        } else {
          positiveCount += weight;
          keywords.push({ word: token, sentiment: 'positive', weight });
        }
      }

      // Check negative
      if (this.negativeWords.has(token)) {
        if (isNegated) {
          positiveCount += weight;
          keywords.push({ word: token, sentiment: 'positive', weight });
        } else {
          negativeCount += weight;
          keywords.push({ word: token, sentiment: 'negative', weight: -weight });
        }
      }
    }

    // Calculate score (-1 to 1)
    const total = positiveCount + negativeCount;
    let score = 0;
    if (total > 0) {
      score = (positiveCount - negativeCount) / total;
    }

    // Determine sentiment label
    let sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    if (Math.abs(score) < 0.2) {
      sentiment = total > 3 ? 'mixed' : 'neutral';
    } else if (score > 0) {
      sentiment = 'positive';
    } else {
      sentiment = 'negative';
    }

    // Calculate confidence (0-1)
    const confidence = Math.min(1, total / 10); // Max confidence at 10+ keywords

    return {
      sentiment,
      score,
      confidence,
      keywords: keywords.slice(0, 10), // Top 10 keywords
      context,
      metadata: {
        positiveCount,
        negativeCount,
        totalKeywords: total,
        textLength: text.length,
        wordCount: tokens.length
      }
    };
  }

  /**
   * Analyze multiple texts and return aggregate sentiment
   */
  async analyzeBatch(texts: string[]): Promise<{
    overall: SentimentResult;
    individual: SentimentResult[];
  }> {
    const individual = await Promise.all(
      texts.map(text => this.analyze(text))
    );

    // Calculate aggregate
    const avgScore = individual.reduce((sum, r) => sum + r.score, 0) / individual.length;
    const avgConfidence = individual.reduce((sum, r) => sum + r.confidence, 0) / individual.length;

    let overallSentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    if (Math.abs(avgScore) < 0.2) {
      overallSentiment = 'neutral';
    } else if (avgScore > 0) {
      overallSentiment = 'positive';
    } else {
      overallSentiment = 'negative';
    }

    // Aggregate keywords
    const allKeywords: SentimentKeyword[] = [];
    for (const result of individual) {
      allKeywords.push(...result.keywords);
    }

    const overall: SentimentResult = {
      sentiment: overallSentiment,
      score: avgScore,
      confidence: avgConfidence,
      keywords: this.getTopKeywords(allKeywords, 20),
      metadata: {
        totalTexts: texts.length,
        positiveTexts: individual.filter(r => r.sentiment === 'positive').length,
        negativeTexts: individual.filter(r => r.sentiment === 'negative').length,
        neutralTexts: individual.filter(r => r.sentiment === 'neutral').length,
        mixedTexts: individual.filter(r => r.sentiment === 'mixed').length
      }
    };

    return { overall, individual };
  }

  /**
   * Analyze support ticket sentiment
   */
  async analyzeSupportTicket(messages: Array<{ role: string; content: string }>): Promise<SentimentResult> {
    // Analyze customer messages only (not agent responses)
    const customerMessages = messages
      .filter(m => m.role === 'customer' || m.role === 'user')
      .map(m => m.content);

    if (customerMessages.length === 0) {
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
        keywords: [],
        context: 'support_ticket'
      };
    }

    const batch = await this.analyzeBatch(customerMessages);
    return {
      ...batch.overall,
      context: 'support_ticket'
    };
  }

  /**
   * Get sentiment trend over time
   */
  async analyzeTimeSeries(
    texts: Array<{ text: string; timestamp: Date }>
  ): Promise<{
    trend: 'improving' | 'declining' | 'stable';
    dataPoints: Array<{ timestamp: Date; score: number }>;
  }> {
    const dataPoints = await Promise.all(
      texts.map(async ({ text, timestamp }) => ({
        timestamp,
        score: (await this.analyze(text)).score
      }))
    );

    // Sort by timestamp
    dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate trend (simple linear regression)
    const n = dataPoints.length;
    if (n < 2) {
      return { trend: 'stable', dataPoints };
    }

    const meanX = dataPoints.reduce((sum, _, i) => sum + i, 0) / n;
    const meanY = dataPoints.reduce((sum, p) => sum + p.score, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const dx = i - meanX;
      const dy = dataPoints[i].score - meanY;
      numerator += dx * dy;
      denominator += dx * dx;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;

    let trend: 'improving' | 'declining' | 'stable';
    if (Math.abs(slope) < 0.01) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'improving';
    } else {
      trend = 'declining';
    }

    return { trend, dataPoints };
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s']/g, ' ') // Remove punctuation except apostrophes
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  /**
   * Get top N keywords by frequency
   */
  private getTopKeywords(keywords: SentimentKeyword[], n: number): SentimentKeyword[] {
    const wordMap = new Map<string, SentimentKeyword>();

    for (const keyword of keywords) {
      const existing = wordMap.get(keyword.word);
      if (existing) {
        existing.weight += keyword.weight;
      } else {
        wordMap.set(keyword.word, { ...keyword });
      }
    }

    return Array.from(wordMap.values())
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
      .slice(0, n);
  }

  /**
   * Add custom positive words
   */
  addPositiveWords(words: string[]): void {
    words.forEach(word => this.positiveWords.add(word.toLowerCase()));
  }

  /**
   * Add custom negative words
   */
  addNegativeWords(words: string[]): void {
    words.forEach(word => this.negativeWords.add(word.toLowerCase()));
  }
}
