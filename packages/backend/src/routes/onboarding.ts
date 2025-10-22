/**
 * Onboarding Routes
 * Handles business onboarding flow for new users
 */

import { Router, type Request, type Response } from 'express';
import { Logger } from '@jarvis/shared';
import { getSupabaseClient } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import type { CompleteOnboardingRequest, OnboardingData } from '../types/week2.types.js';

const router = Router();
const logger = new Logger('OnboardingRoutes');

/**
 * POST /api/onboarding/complete
 * Complete business onboarding and save data
 */
router.post('/complete', requireAuth, async (req: Request, res: Response) => {
  try {
    const { onboardingData }: CompleteOnboardingRequest = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found in request',
      });
    }

    if (!onboardingData || !onboardingData.businessName || !onboardingData.industry) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Business name and industry are required',
      });
    }

    // Get user's first observatory (created during signup)
    const { data: observatories, error: obsError } = await getSupabaseClient()
      .from('observatories')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (obsError || !observatories || observatories.length === 0) {
      return res.status(404).json({
        error: 'No observatory found',
        message: 'Please contact support',
      });
    }

    const observatory = observatories[0];

    // Update observatory with onboarding data
    const onboardingDataWithTimestamp: OnboardingData = {
      ...onboardingData,
      completedAt: new Date().toISOString(),
    };

    const { data: updatedObservatory, error: updateError } = await getSupabaseClient()
      .from('observatories')
      .update({
        name: onboardingData.businessName,
        onboarding_completed: true,
        onboarding_data: onboardingDataWithTimestamp,
        updated_at: new Date().toISOString(),
      })
      .eq('id', observatory.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update observatory with onboarding data', updateError);
      throw updateError;
    }

    logger.info('Onboarding completed', {
      userId,
      observatoryId: observatory.id,
      businessName: onboardingData.businessName,
    });

    res.json({
      observatory: updatedObservatory,
      message: 'Onboarding completed successfully',
    });
  } catch (error) {
    logger.error('Failed to complete onboarding', error);
    res.status(500).json({
      error: 'Failed to complete onboarding',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/onboarding/status
 * Check if user has completed onboarding
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    // Get user's observatories with onboarding status
    const { data: observatories, error: obsError } = await getSupabaseClient()
      .from('observatories')
      .select('id, name, onboarding_completed, onboarding_data')
      .eq('owner_id', userId);

    if (obsError) {
      throw obsError;
    }

    const hasCompletedOnboarding = observatories?.some(obs => obs.onboarding_completed) || false;

    res.json({
      completed: hasCompletedOnboarding,
      observatories: observatories || [],
    });
  } catch (error) {
    logger.error('Failed to get onboarding status', error);
    res.status(500).json({
      error: 'Failed to get onboarding status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
