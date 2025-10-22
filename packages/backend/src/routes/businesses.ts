/**
 * Business Management Routes
 * Handles multi-business management and limit enforcement
 */

import { Router, type Request, type Response } from 'express';
import { Logger } from '@jarvis/shared';
import { getSupabaseClient } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import type { BusinessLimitInfo } from '../types/week2.types.js';

const router = Router();
const logger = new Logger('BusinessRoutes');

/**
 * GET /api/businesses
 * Get all businesses (observatories) for the authenticated user
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    // Get all observatories where user is a member
    const { data: members, error: membersError } = await getSupabaseClient()
      .from('observatory_members')
      .select(`
        observatory_id,
        role,
        observatories (
          id,
          name,
          owner_id,
          onboarding_completed,
          onboarding_data,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);

    if (membersError) {
      throw membersError;
    }

    const businesses = members?.map(m => ({
      ...(m.observatories as any),
      userRole: m.role,
    })) || [];

    res.json({
      businesses,
      count: businesses.length,
    });
  } catch (error) {
    logger.error('Failed to get businesses', error);
    res.status(500).json({
      error: 'Failed to get businesses',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/businesses/limit
 * Check business creation limit for user
 */
router.get('/limit', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    // Count owned businesses
    const { count: businessCount, error: countError } = await getSupabaseClient()
      .from('observatory_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role', 'owner');

    if (countError) {
      throw countError;
    }

    // Count active additional_business subscriptions
    const { count: subCount, error: subError } = await getSupabaseClient()
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'additional_business')
      .eq('status', 'active');

    if (subError) {
      throw subError;
    }

    const currentCount = businessCount || 0;
    const additionalBusinesses = subCount || 0;
    const maxCount = 1 + additionalBusinesses; // 1 free business + paid additional businesses

    const limitInfo: BusinessLimitInfo = {
      canAddBusiness: currentCount < maxCount,
      currentCount,
      maxCount,
      requiresPayment: currentCount >= 1, // First business is free
    };

    res.json(limitInfo);
  } catch (error) {
    logger.error('Failed to check business limit', error);
    res.status(500).json({
      error: 'Failed to check business limit',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/businesses
 * Create a new business (with limit check)
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, onboardingData } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    if (!name) {
      return res.status(400).json({
        error: 'Business name is required',
      });
    }

    // Check business limit
    const { count: businessCount, error: countError } = await getSupabaseClient()
      .from('observatory_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role', 'owner');

    if (countError) {
      throw countError;
    }

    const { count: subCount, error: subError } = await getSupabaseClient()
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'additional_business')
      .eq('status', 'active');

    if (subError) {
      throw subError;
    }

    const currentCount = businessCount || 0;
    const maxCount = 1 + (subCount || 0);

    if (currentCount >= maxCount) {
      return res.status(403).json({
        error: 'Business limit reached',
        message: 'You need to purchase an additional business subscription',
        requiresPayment: true,
        currentCount,
        maxCount,
      });
    }

    // Create new observatory
    const { data: observatory, error: obsError } = await getSupabaseClient()
      .from('observatories')
      .insert({
        name,
        owner_id: userId,
        onboarding_completed: !!onboardingData,
        onboarding_data: onboardingData || {},
      })
      .select()
      .single();

    if (obsError) {
      throw obsError;
    }

    // Add user as owner in observatory_members
    const { error: memberError } = await getSupabaseClient()
      .from('observatory_members')
      .insert({
        observatory_id: observatory.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) {
      // Rollback: delete the observatory
      await getSupabaseClient()
        .from('observatories')
        .delete()
        .eq('id', observatory.id);

      throw memberError;
    }

    logger.info('Business created', {
      userId,
      observatoryId: observatory.id,
      name,
    });

    res.json({
      business: observatory,
      message: 'Business created successfully',
    });
  } catch (error) {
    logger.error('Failed to create business', error);
    res.status(500).json({
      error: 'Failed to create business',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/businesses/:id
 * Update a business
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, onboardingData } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    // Check if user is owner or admin
    const { data: member, error: memberError } = await getSupabaseClient()
      .from('observatory_members')
      .select('role')
      .eq('observatory_id', id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Only owners and admins can update businesses',
      });
    }

    // Update observatory
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name) {
      updateData.name = name;
    }

    if (onboardingData) {
      updateData.onboarding_data = onboardingData;
      updateData.onboarding_completed = true;
    }

    const { data: observatory, error: updateError } = await getSupabaseClient()
      .from('observatories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    logger.info('Business updated', {
      userId,
      observatoryId: id,
    });

    res.json({
      business: observatory,
      message: 'Business updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update business', error);
    res.status(500).json({
      error: 'Failed to update business',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/businesses/:id
 * Delete a business (only for owners)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    // Check if user is owner
    const { data: member, error: memberError } = await getSupabaseClient()
      .from('observatory_members')
      .select('role')
      .eq('observatory_id', id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member || member.role !== 'owner') {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Only owners can delete businesses',
      });
    }

    // Delete observatory (cascade will delete members, connections, etc.)
    const { error: deleteError } = await getSupabaseClient()
      .from('observatories')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    logger.info('Business deleted', {
      userId,
      observatoryId: id,
    });

    res.json({
      message: 'Business deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete business', error);
    res.status(500).json({
      error: 'Failed to delete business',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
