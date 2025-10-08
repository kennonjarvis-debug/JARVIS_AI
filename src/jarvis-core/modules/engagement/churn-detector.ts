/**
 * Churn Detector
 *
 * Analyzes user behavior and calculates churn risk
 * Updates CustomerHealth records in the database
 */

import { PrismaClient, ChurnRisk } from '@prisma/client';
import { ChurnAnalysisResult, HealthScoreUpdate, UserActivityMetrics } from './types';

export class ChurnDetector {
  private prisma: PrismaClient;

  // Thresholds for churn risk
  private readonly CRITICAL_THRESHOLD = 40;
  private readonly HIGH_THRESHOLD = 55;
  private readonly MEDIUM_THRESHOLD = 70;

  // Activity thresholds (days)
  private readonly INACTIVE_DAYS_CRITICAL = 30;
  private readonly INACTIVE_DAYS_HIGH = 14;
  private readonly INACTIVE_DAYS_MEDIUM = 7;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Initialize the detector
   */
  async initialize(): Promise<void> {
    // Placeholder for initialization logic
  }

  /**
   * Check churn risk for a specific user
   */
  async checkUser(userId: string): Promise<ChurnAnalysisResult> {
    // Get user data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        CustomerHealth: true,
        Project: { select: { id: true, createdAt: true, updatedAt: true } },
        SupportTicket: { select: { id: true, status: true, createdAt: true } }
      }
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Get activity metrics
    const metrics = await this.getUserActivityMetrics(userId);

    // Calculate scores
    const usageScore = this.calculateUsageScore(metrics);
    const engagementScore = this.calculateEngagementScore(metrics);
    const errorScore = this.calculateErrorScore(metrics);
    const supportScore = this.calculateSupportScore(metrics);

    // Calculate overall health score (weighted average)
    const healthScore = Math.round(
      usageScore * 0.35 +
      engagementScore * 0.35 +
      errorScore * 0.15 +
      supportScore * 0.15
    );

    // Determine churn risk
    const churnRisk = this.calculateChurnRisk(healthScore, metrics);

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(metrics, {
      usageScore,
      engagementScore,
      errorScore,
      supportScore
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(churnRisk, riskFactors, metrics);

    // Update database
    await this.updateHealthRecord(userId, {
      healthScore,
      usageScore,
      engagementScore,
      errorScore,
      supportScore,
      churnRisk,
      lastActivityAt: user.lastLoginAt || undefined
    });

    return {
      userId,
      healthScore,
      churnRisk,
      scores: {
        usage: usageScore,
        engagement: engagementScore,
        error: errorScore,
        support: supportScore
      },
      riskFactors,
      recommendations,
      lastActivity: user.lastLoginAt || undefined,
      daysSinceLastActivity: metrics.daysSinceLastLogin
    };
  }

  /**
   * Get users at risk of churning
   */
  async getAtRiskUsers(threshold?: number): Promise<ChurnAnalysisResult[]> {
    const riskThreshold = threshold || this.HIGH_THRESHOLD;

    const users = await this.prisma.customerHealth.findMany({
      where: {
        OR: [
          { healthScore: { lte: riskThreshold } },
          { churnRisk: { in: ['HIGH', 'CRITICAL'] } }
        ]
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            username: true,
            lastLoginAt: true
          }
        }
      },
      orderBy: {
        healthScore: 'asc'
      }
    });

    const results: ChurnAnalysisResult[] = [];

    for (const health of users) {
      const metrics = await this.getUserActivityMetrics(health.userId);

      results.push({
        userId: health.userId,
        healthScore: health.healthScore,
        churnRisk: health.churnRisk,
        scores: {
          usage: health.usageScore,
          engagement: health.engagementScore,
          error: health.errorScore,
          support: health.supportScore
        },
        riskFactors: this.identifyRiskFactors(metrics, {
          usageScore: health.usageScore,
          engagementScore: health.engagementScore,
          errorScore: health.errorScore,
          supportScore: health.supportScore
        }),
        recommendations: [],
        lastActivity: health.lastActivityAt || undefined,
        daysSinceLastActivity: metrics.daysSinceLastLogin
      });
    }

    return results;
  }

  /**
   * Update health score for a user
   */
  async updateHealthScore(userId: string, updates: HealthScoreUpdate): Promise<void> {
    await this.updateHealthRecord(userId, updates);
  }

  // Private Methods
  // ===============

  /**
   * Get user activity metrics
   */
  private async getUserActivityMetrics(userId: string): Promise<UserActivityMetrics> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [user, totalProjects, recentProjects, totalTickets, openTickets, usageEvents] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { lastLoginAt: true }
      }),
      this.prisma.project.count({ where: { userId } }),
      this.prisma.project.count({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      this.prisma.supportTicket.count({ where: { userId } }),
      this.prisma.supportTicket.count({
        where: {
          userId,
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        }
      }),
      this.prisma.usageEvent.findMany({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo }
        },
        select: { featureKey: true }
      })
    ]);

    // Calculate days since last login
    let daysSinceLastLogin: number | undefined;
    if (user?.lastLoginAt) {
      const diffMs = Date.now() - user.lastLoginAt.getTime();
      daysSinceLastLogin = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    }

    // Count feature usage
    const featureUsage: Record<string, number> = {};
    for (const event of usageEvents) {
      featureUsage[event.featureKey] = (featureUsage[event.featureKey] || 0) + 1;
    }

    return {
      totalProjects,
      recentProjects,
      totalSessions: 0, // Could track sessions separately
      lastLogin: user?.lastLoginAt || undefined,
      daysSinceLastLogin,
      featureUsage,
      totalTickets,
      openTickets
    };
  }

  /**
   * Calculate usage score (0-100)
   */
  private calculateUsageScore(metrics: UserActivityMetrics): number {
    let score = 50; // Base score

    // Recent projects (0-30 points)
    score += Math.min(30, metrics.recentProjects * 5);

    // Total projects (0-10 points)
    score += Math.min(10, metrics.totalProjects * 2);

    // Feature usage (0-10 points)
    const featureCount = Object.keys(metrics.featureUsage).length;
    score += Math.min(10, featureCount * 2);

    return Math.min(100, score);
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(metrics: UserActivityMetrics): number {
    let score = 100; // Start at 100, deduct for inactivity

    // Days since last login penalty
    if (metrics.daysSinceLastLogin !== undefined) {
      if (metrics.daysSinceLastLogin >= this.INACTIVE_DAYS_CRITICAL) {
        score -= 60; // Critical penalty
      } else if (metrics.daysSinceLastLogin >= this.INACTIVE_DAYS_HIGH) {
        score -= 40; // High penalty
      } else if (metrics.daysSinceLastLogin >= this.INACTIVE_DAYS_MEDIUM) {
        score -= 20; // Medium penalty
      } else {
        score -= metrics.daysSinceLastLogin * 2; // 2 points per day
      }
    }

    return Math.max(0, score);
  }

  /**
   * Calculate error score (0-100)
   */
  private calculateErrorScore(metrics: UserActivityMetrics): number {
    // For now, return high score (100 = no errors)
    // In the future, track failed UsageEvents and reduce score
    return 100;
  }

  /**
   * Calculate support score (0-100)
   */
  private calculateSupportScore(metrics: UserActivityMetrics): number {
    let score = 100;

    // Penalty for open tickets
    score -= metrics.openTickets * 10;

    // Penalty for total tickets
    score -= metrics.totalTickets * 2;

    return Math.max(0, score);
  }

  /**
   * Calculate churn risk level
   */
  private calculateChurnRisk(healthScore: number, metrics: UserActivityMetrics): ChurnRisk {
    // Override based on extreme inactivity
    if (metrics.daysSinceLastLogin !== undefined) {
      if (metrics.daysSinceLastLogin >= this.INACTIVE_DAYS_CRITICAL) {
        return 'CRITICAL';
      }
      if (metrics.daysSinceLastLogin >= this.INACTIVE_DAYS_HIGH && healthScore <= this.HIGH_THRESHOLD) {
        return 'HIGH';
      }
    }

    // Standard score-based risk
    if (healthScore <= this.CRITICAL_THRESHOLD) {
      return 'CRITICAL';
    } else if (healthScore <= this.HIGH_THRESHOLD) {
      return 'HIGH';
    } else if (healthScore <= this.MEDIUM_THRESHOLD) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(
    metrics: UserActivityMetrics,
    scores: { usageScore: number; engagementScore: number; errorScore: number; supportScore: number }
  ): string[] {
    const factors: string[] = [];

    // Inactivity
    if (metrics.daysSinceLastLogin !== undefined) {
      if (metrics.daysSinceLastLogin >= this.INACTIVE_DAYS_CRITICAL) {
        factors.push('Critical inactivity: No login for 30+ days');
      } else if (metrics.daysSinceLastLogin >= this.INACTIVE_DAYS_HIGH) {
        factors.push('High inactivity: No login for 14+ days');
      } else if (metrics.daysSinceLastLogin >= this.INACTIVE_DAYS_MEDIUM) {
        factors.push('Moderate inactivity: No login for 7+ days');
      }
    }

    // Low usage
    if (scores.usageScore < 50) {
      factors.push('Low feature usage');
    }

    if (metrics.recentProjects === 0) {
      factors.push('No projects created in last 30 days');
    }

    // Support issues
    if (metrics.openTickets > 0) {
      factors.push(`${metrics.openTickets} open support ticket(s)`);
    }

    if (scores.supportScore < 70) {
      factors.push('Multiple support tickets');
    }

    // Errors
    if (scores.errorScore < 80) {
      factors.push('Frequent errors encountered');
    }

    return factors;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    risk: ChurnRisk,
    factors: string[],
    metrics: UserActivityMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (risk === 'CRITICAL' || risk === 'HIGH') {
      recommendations.push('Immediate personal outreach required');
      recommendations.push('Offer 1-on-1 onboarding session');
    }

    if (metrics.daysSinceLastLogin && metrics.daysSinceLastLogin >= 7) {
      recommendations.push('Send re-engagement email with new features');
    }

    if (metrics.recentProjects === 0) {
      recommendations.push('Share project templates and tutorials');
    }

    if (metrics.openTickets > 0) {
      recommendations.push('Priority support ticket resolution');
    }

    if (Object.keys(metrics.featureUsage).length < 3) {
      recommendations.push('Highlight unused features');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring health metrics');
    }

    return recommendations;
  }

  /**
   * Update or create health record
   */
  private async updateHealthRecord(userId: string, updates: HealthScoreUpdate): Promise<void> {
    await this.prisma.customerHealth.upsert({
      where: { userId },
      create: {
        userId,
        healthScore: updates.healthScore || 75,
        usageScore: updates.usageScore || 50,
        engagementScore: updates.engagementScore || 50,
        errorScore: updates.errorScore || 100,
        supportScore: updates.supportScore || 100,
        churnRisk: updates.churnRisk || 'LOW',
        lastActivityAt: updates.lastActivityAt
      },
      update: {
        ...(updates.healthScore !== undefined && { healthScore: updates.healthScore }),
        ...(updates.usageScore !== undefined && { usageScore: updates.usageScore }),
        ...(updates.engagementScore !== undefined && { engagementScore: updates.engagementScore }),
        ...(updates.errorScore !== undefined && { errorScore: updates.errorScore }),
        ...(updates.supportScore !== undefined && { supportScore: updates.supportScore }),
        ...(updates.churnRisk && { churnRisk: updates.churnRisk }),
        ...(updates.lastActivityAt && { lastActivityAt: updates.lastActivityAt }),
        updatedAt: new Date()
      }
    });
  }
}
