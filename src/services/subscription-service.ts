/**
 * Subscription Management Service
 *
 * Handles user subscriptions, trials, and plan limits for Jarvis + AI DAWG
 */

import { PrismaClient, User, Subscription, PlanTier, Product, SubscriptionStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export interface SubscriptionLimits {
  aiRequestsPerDay: number;
  observatoriesLimit: number;
  songsPerMonth?: number;
  voiceCharsPerMonth?: number;
  storageGB?: number;
}

const PLAN_LIMITS: Record<Product, Record<PlanTier, SubscriptionLimits>> = {
  JARVIS: {
    FREE_TRIAL: {
      aiRequestsPerDay: 10,
      observatoriesLimit: 1,
    },
    STARTER: {
      aiRequestsPerDay: 50,
      observatoriesLimit: 3,
    },
    PROFESSIONAL: {
      aiRequestsPerDay: 200,
      observatoriesLimit: 999, // Unlimited
    },
    ENTERPRISE: {
      aiRequestsPerDay: 99999, // Unlimited
      observatoriesLimit: 999,
    },
  },
  AIDAWG: {
    FREE_TRIAL: {
      aiRequestsPerDay: 5,
      observatoriesLimit: 0,
      songsPerMonth: 1,
      voiceCharsPerMonth: 0,
      storageGB: 1,
    },
    STARTER: {
      aiRequestsPerDay: 20,
      observatoriesLimit: 0,
      songsPerMonth: 10,
      voiceCharsPerMonth: 5000,
      storageGB: 5,
    },
    PROFESSIONAL: {
      aiRequestsPerDay: 100,
      observatoriesLimit: 0,
      songsPerMonth: 30,
      voiceCharsPerMonth: 50000,
      storageGB: 50,
    },
    ENTERPRISE: {
      aiRequestsPerDay: 99999,
      observatoriesLimit: 0,
      songsPerMonth: 99999,
      voiceCharsPerMonth: 999999,
      storageGB: 500,
    },
  },
};

export class SubscriptionService {
  /**
   * Create new user with free trial
   */
  async createUserWithTrial(
    email: string,
    name: string | null,
    product: Product,
    googleId?: string
  ): Promise<User> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7-day trial

    const limits = PLAN_LIMITS[product].FREE_TRIAL;

    const user = await prisma.user.create({
      data: {
        email,
        name,
        googleId,
        subscription: {
          create: {
            product,
            planTier: 'FREE_TRIAL',
            status: 'TRIAL',
            trialStartedAt: new Date(),
            trialEndsAt,
            ...limits,
          },
        },
        usageStats: {
          create: {},
        },
      },
      include: {
        subscription: true,
        usageStats: true,
      },
    });

    logger.info('Created user with free trial', {
      userId: user.id,
      email: user.email,
      product,
      trialEndsAt,
    });

    return user;
  }

  /**
   * Get user with subscription and usage stats
   */
  async getUserWithDetails(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        usageStats: true,
        observatories: true,
        projects: true,
      },
    });
  }

  /**
   * Check if user can perform action based on plan limits
   */
  async canPerformAction(
    userId: string,
    action: 'ai_request' | 'create_observatory' | 'generate_song' | 'voice_clone' | 'upload_file'
  ): Promise<{ allowed: boolean; reason?: string; upgradeRequired?: boolean }> {
    const user = await this.getUserWithDetails(userId);
    if (!user || !user.subscription || !user.usageStats) {
      return { allowed: false, reason: 'User not found or no subscription' };
    }

    const { subscription, usageStats } = user;

    // Check if trial has expired
    if (subscription.status === 'TRIAL' && subscription.trialEndsAt) {
      if (new Date() > subscription.trialEndsAt) {
        return {
          allowed: false,
          reason: 'Free trial has expired. Please upgrade to continue.',
          upgradeRequired: true,
        };
      }
    }

    // Check if subscription is active
    if (!['TRIAL', 'ACTIVE'].includes(subscription.status)) {
      return {
        allowed: false,
        reason: `Subscription status: ${subscription.status}`,
        upgradeRequired: true,
      };
    }

    // Reset daily counters if needed
    await this.resetDailyUsageIfNeeded(userId);

    // Check specific limits
    switch (action) {
      case 'ai_request':
        if (usageStats.aiRequestsToday >= subscription.aiRequestsPerDay) {
          return {
            allowed: false,
            reason: `Daily AI request limit reached (${subscription.aiRequestsPerDay} requests/day)`,
            upgradeRequired: true,
          };
        }
        break;

      case 'create_observatory':
        const observatoryCount = await prisma.observatory.count({
          where: { userId, active: true },
        });
        if (observatoryCount >= subscription.observatoriesLimit) {
          return {
            allowed: false,
            reason: `Observatory limit reached (${subscription.observatoriesLimit} max)`,
            upgradeRequired: true,
          };
        }
        break;

      case 'generate_song':
        if (subscription.product !== 'AIDAWG') {
          return { allowed: false, reason: 'Feature not available on your plan' };
        }
        if (usageStats.songsThisMonth >= (subscription.songsPerMonth || 0)) {
          return {
            allowed: false,
            reason: `Monthly song generation limit reached (${subscription.songsPerMonth} songs/month)`,
            upgradeRequired: true,
          };
        }
        break;

      case 'voice_clone':
        if (subscription.product !== 'AIDAWG') {
          return { allowed: false, reason: 'Feature not available on your plan' };
        }
        if (usageStats.voiceCharsThisMonth >= (subscription.voiceCharsPerMonth || 0)) {
          return {
            allowed: false,
            reason: `Monthly voice cloning limit reached (${subscription.voiceCharsPerMonth} characters/month)`,
            upgradeRequired: true,
          };
        }
        break;

      case 'upload_file':
        if (subscription.product !== 'AIDAWG') {
          return { allowed: true }; // No upload limits for Jarvis
        }
        if (usageStats.storageUsedGB >= (subscription.storageGB || 0)) {
          return {
            allowed: false,
            reason: `Storage limit reached (${subscription.storageGB} GB)`,
            upgradeRequired: true,
          };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Track usage (increment counters)
   */
  async trackUsage(
    userId: string,
    action: 'ai_request' | 'song_generation' | 'voice_clone',
    details?: {
      model?: string;
      provider?: string;
      inputTokens?: number;
      outputTokens?: number;
      characters?: number;
      cost?: number;
    }
  ): Promise<void> {
    await this.resetDailyUsageIfNeeded(userId);
    await this.resetMonthlyUsageIfNeeded(userId);

    const updates: any = {
      updatedAt: new Date(),
    };

    switch (action) {
      case 'ai_request':
        updates.aiRequestsToday = { increment: 1 };
        updates.totalAIRequests = { increment: 1 };
        if (details?.cost) {
          updates.totalCostAccrued = { increment: details.cost };
        }
        break;

      case 'song_generation':
        updates.songsThisMonth = { increment: 1 };
        updates.totalSongsGenerated = { increment: 1 };
        if (details?.cost) {
          updates.totalCostAccrued = { increment: details.cost };
        }
        break;

      case 'voice_clone':
        if (details?.characters) {
          updates.voiceCharsThisMonth = { increment: details.characters };
        }
        if (details?.cost) {
          updates.totalCostAccrued = { increment: details.cost };
        }
        break;
    }

    await prisma.usageStats.update({
      where: { userId },
      data: updates,
    });

    // Log the usage
    await prisma.usageLog.create({
      data: {
        userId,
        requestType: action,
        model: details?.model,
        provider: details?.provider,
        inputTokens: details?.inputTokens,
        outputTokens: details?.outputTokens,
        characters: details?.characters,
        cost: details?.cost || 0,
      },
    });

    logger.debug('Usage tracked', { userId, action, details });
  }

  /**
   * Reset daily usage if it's a new day
   */
  private async resetDailyUsageIfNeeded(userId: string): Promise<void> {
    const stats = await prisma.usageStats.findUnique({
      where: { userId },
    });

    if (!stats) return;

    const now = new Date();
    const lastReset = stats.lastAIRequestReset;

    // Check if it's a new day
    if (lastReset.toDateString() !== now.toDateString()) {
      await prisma.usageStats.update({
        where: { userId },
        data: {
          aiRequestsToday: 0,
          lastAIRequestReset: now,
        },
      });
      logger.debug('Daily usage reset', { userId });
    }
  }

  /**
   * Reset monthly usage if it's a new month
   */
  private async resetMonthlyUsageIfNeeded(userId: string): Promise<void> {
    const stats = await prisma.usageStats.findUnique({
      where: { userId },
    });

    if (!stats) return;

    const now = new Date();
    const lastReset = stats.lastMonthlyReset;

    // Check if it's a new month
    if (
      lastReset.getFullYear() !== now.getFullYear() ||
      lastReset.getMonth() !== now.getMonth()
    ) {
      await prisma.usageStats.update({
        where: { userId },
        data: {
          songsThisMonth: 0,
          voiceCharsThisMonth: 0,
          lastMonthlyReset: now,
        },
      });
      logger.debug('Monthly usage reset', { userId });
    }
  }

  /**
   * Upgrade user to paid plan
   */
  async upgradePlan(
    userId: string,
    planTier: PlanTier,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ): Promise<Subscription> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user || !user.subscription) {
      throw new Error('User or subscription not found');
    }

    const product = user.subscription.product;
    const limits = PLAN_LIMITS[product][planTier];

    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const updated = await prisma.subscription.update({
      where: { userId },
      data: {
        planTier,
        status: 'ACTIVE',
        stripeCustomerId,
        stripeSubscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        ...limits,
      },
    });

    logger.info('Plan upgraded', {
      userId,
      planTier,
      product,
    });

    return updated;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, immediately: boolean = false): Promise<Subscription> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (immediately) {
      return prisma.subscription.update({
        where: { userId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
        },
      });
    } else {
      return prisma.subscription.update({
        where: { userId },
        data: {
          cancelAtPeriodEnd: true,
        },
      });
    }
  }

  /**
   * Get superadmin users
   */
  async getSuperadmins(): Promise<User[]> {
    return prisma.user.findMany({
      where: { role: 'SUPERADMIN' },
      include: {
        subscription: true,
      },
    });
  }

  /**
   * Create superadmin user (for deployment initialization)
   */
  async createSuperadmin(email: string, name: string): Promise<User> {
    // Check if superadmin already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      // Upgrade to superadmin if not already
      if (existing.role !== 'SUPERADMIN') {
        return prisma.user.update({
          where: { id: existing.id },
          data: { role: 'SUPERADMIN' },
        });
      }
      return existing;
    }

    // Create new superadmin with unlimited Enterprise plan
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: 'SUPERADMIN',
        subscription: {
          create: {
            product: 'JARVIS',
            planTier: 'ENTERPRISE',
            status: 'ACTIVE',
            ...PLAN_LIMITS.JARVIS.ENTERPRISE,
          },
        },
        usageStats: {
          create: {},
        },
      },
      include: {
        subscription: true,
      },
    });

    logger.info('Superadmin created', {
      userId: user.id,
      email: user.email,
    });

    return user;
  }
}

export default new SubscriptionService();
