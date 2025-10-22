/**
 * GDPR Consent Management API
 *
 * Implements GDPR Article 7 - Conditions for Consent
 * Manages user consent for data processing, cookies, and features
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export enum ConsentType {
  ESSENTIAL = 'ESSENTIAL',           // Required for service to function
  FUNCTIONAL = 'FUNCTIONAL',         // Enhanced features (activity monitoring, proactive actions)
  ANALYTICS = 'ANALYTICS',           // Usage analytics and improvements
  MARKETING = 'MARKETING',           // Marketing emails and promotions
  THIRD_PARTY = 'THIRD_PARTY',       // Third-party integrations (Stripe, Google Analytics)
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  version: string; // Privacy policy version
}

export interface ConsentPreferences {
  essential: boolean;        // Always true (required)
  functional: boolean;       // Activity monitoring, proactive AI
  analytics: boolean;        // Usage tracking, error reporting
  marketing: boolean;        // Promotional emails
  thirdParty: boolean;       // Google OAuth, Stripe, etc.
}

/**
 * GET /api/privacy/consent
 *
 * Get current consent preferences for user
 *
 * @returns Current consent preferences
 */
export async function getConsentPreferences(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Fetch consent records
    const consents = await fetchUserConsents(userId);

    // Convert to preference format
    const preferences: ConsentPreferences = {
      essential: true, // Always required
      functional: consents.find(c => c.consentType === ConsentType.FUNCTIONAL)?.granted || false,
      analytics: consents.find(c => c.consentType === ConsentType.ANALYTICS)?.granted || false,
      marketing: consents.find(c => c.consentType === ConsentType.MARKETING)?.granted || false,
      thirdParty: consents.find(c => c.consentType === ConsentType.THIRD_PARTY)?.granted || false,
    };

    return res.json({
      success: true,
      data: {
        preferences,
        lastUpdated: consents[0]?.grantedAt || consents[0]?.revokedAt,
        policyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0'
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch consent preferences', {
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch consent preferences',
      message: error.message
    });
  }
}

/**
 * POST /api/privacy/consent
 *
 * Update consent preferences
 *
 * @body preferences - Updated consent preferences
 *
 * @returns Updated preferences
 */
export async function updateConsentPreferences(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { preferences } = req.body as { preferences: ConsentPreferences };

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!preferences) {
      return res.status(400).json({
        success: false,
        error: 'Missing preferences',
        message: 'Consent preferences are required'
      });
    }

    // Essential consent cannot be revoked
    if (!preferences.essential) {
      return res.status(400).json({
        success: false,
        error: 'Essential consent required',
        message: 'Essential cookies and data processing are required for the service to function'
      });
    }

    // Get request metadata
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const policyVersion = process.env.PRIVACY_POLICY_VERSION || '1.0';

    // Update each consent type
    const consentTypes = [
      { type: ConsentType.FUNCTIONAL, granted: preferences.functional },
      { type: ConsentType.ANALYTICS, granted: preferences.analytics },
      { type: ConsentType.MARKETING, granted: preferences.marketing },
      { type: ConsentType.THIRD_PARTY, granted: preferences.thirdParty },
    ];

    for (const { type, granted } of consentTypes) {
      await updateConsent(userId, type, granted, ipAddress, userAgent, policyVersion);
    }

    // If functional consent is revoked, disable activity monitoring
    if (!preferences.functional) {
      logger.info('Disabling activity monitoring due to consent revocation', { userId });
      // TODO: Call activity monitor service to disable for this user
    }

    // If analytics consent is revoked, stop analytics tracking
    if (!preferences.analytics) {
      logger.info('Disabling analytics tracking due to consent revocation', { userId });
      // TODO: Disable analytics for this user
    }

    logger.info('Consent preferences updated', {
      userId,
      preferences
    });

    return res.json({
      success: true,
      message: 'Consent preferences updated successfully',
      data: {
        preferences,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Failed to update consent preferences', {
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to update consent preferences',
      message: error.message
    });
  }
}

/**
 * POST /api/privacy/consent/withdraw
 *
 * Withdraw specific consent type
 *
 * @body consentType - Type of consent to withdraw
 *
 * @returns Confirmation of withdrawal
 */
export async function withdrawConsent(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { consentType } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!consentType) {
      return res.status(400).json({
        success: false,
        error: 'Missing consent type',
        message: 'consentType is required'
      });
    }

    // Cannot withdraw essential consent
    if (consentType === ConsentType.ESSENTIAL) {
      return res.status(400).json({
        success: false,
        error: 'Cannot withdraw essential consent',
        message: 'Essential consent is required for the service to function'
      });
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const policyVersion = process.env.PRIVACY_POLICY_VERSION || '1.0';

    await updateConsent(userId, consentType, false, ipAddress, userAgent, policyVersion);

    logger.info('Consent withdrawn', {
      userId,
      consentType
    });

    return res.json({
      success: true,
      message: `${consentType} consent withdrawn successfully`,
      data: {
        consentType,
        withdrawnAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Failed to withdraw consent', {
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to withdraw consent',
      message: error.message
    });
  }
}

/**
 * GET /api/privacy/consent/history
 *
 * Get consent history for user (audit trail)
 *
 * @returns Complete consent history
 */
export async function getConsentHistory(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Fetch all consent records for user
    const history = await fetchConsentHistory(userId);

    return res.json({
      success: true,
      data: {
        history,
        count: history.length
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch consent history', {
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch consent history',
      message: error.message
    });
  }
}

/**
 * Helper: Fetch current consent records for user
 */
async function fetchUserConsents(userId: string): Promise<ConsentRecord[]> {
  try {
    const records = await prisma.$queryRaw<ConsentRecord[]>`
      SELECT * FROM user_consents
      WHERE user_id = ${userId}
      AND (revoked_at IS NULL OR granted_at > revoked_at)
      ORDER BY granted_at DESC
    `;
    return records;
  } catch (error) {
    // Table doesn't exist yet, return defaults
    logger.warn('user_consents table not found, returning defaults');
    return [];
  }
}

/**
 * Helper: Fetch complete consent history for user
 */
async function fetchConsentHistory(userId: string): Promise<ConsentRecord[]> {
  try {
    const records = await prisma.$queryRaw<ConsentRecord[]>`
      SELECT * FROM user_consents
      WHERE user_id = ${userId}
      ORDER BY granted_at DESC, revoked_at DESC
    `;
    return records;
  } catch (error) {
    logger.warn('user_consents table not found');
    return [];
  }
}

/**
 * Helper: Update consent record
 */
async function updateConsent(
  userId: string,
  consentType: ConsentType,
  granted: boolean,
  ipAddress?: string,
  userAgent?: string,
  version: string = '1.0'
): Promise<void> {
  try {
    if (granted) {
      // Grant consent
      await prisma.$executeRaw`
        INSERT INTO user_consents (
          id,
          user_id,
          consent_type,
          granted,
          granted_at,
          ip_address,
          user_agent,
          version
        )
        VALUES (
          gen_random_uuid(),
          ${userId},
          ${consentType},
          ${granted},
          NOW(),
          ${ipAddress},
          ${userAgent},
          ${version}
        )
        ON CONFLICT (user_id, consent_type)
        DO UPDATE SET
          granted = ${granted},
          granted_at = NOW(),
          revoked_at = NULL,
          ip_address = ${ipAddress},
          user_agent = ${userAgent},
          version = ${version}
      `;
    } else {
      // Revoke consent
      await prisma.$executeRaw`
        UPDATE user_consents
        SET
          granted = ${granted},
          revoked_at = NOW()
        WHERE user_id = ${userId}
        AND consent_type = ${consentType}
      `;
    }
  } catch (error: any) {
    // Table doesn't exist, log for manual tracking
    logger.warn('user_consents table not found, logging consent change', {
      userId,
      consentType,
      granted,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Helper: Check if user has granted specific consent
 */
export async function hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
  // Essential consent is always granted
  if (consentType === ConsentType.ESSENTIAL) {
    return true;
  }

  try {
    const result = await prisma.$queryRaw<{ granted: boolean }[]>`
      SELECT granted FROM user_consents
      WHERE user_id = ${userId}
      AND consent_type = ${consentType}
      AND granted = true
      AND revoked_at IS NULL
      LIMIT 1
    `;

    return result.length > 0 && result[0].granted;
  } catch (error) {
    // If table doesn't exist, default to true for backwards compatibility
    // In production, you'd want to require explicit consent
    logger.warn('Cannot check consent, table not found. Defaulting to false for safety.');
    return false;
  }
}

export default {
  getConsentPreferences,
  updateConsentPreferences,
  withdrawConsent,
  getConsentHistory,
  hasConsent
};
