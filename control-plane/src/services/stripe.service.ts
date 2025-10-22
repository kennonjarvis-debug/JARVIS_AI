/**
 * Stripe Service
 *
 * Handles Stripe integration for subscription management
 * Requires: npm install stripe
 *
 * SETUP INSTRUCTIONS:
 * 1. Run: npm install stripe
 * 2. Add STRIPE_SECRET_KEY to your .env file
 * 3. Uncomment the Stripe import below
 */

import { logger } from '../utils/logger.js';
// import Stripe from 'stripe'; // UNCOMMENT after installing stripe package

export class StripeService {
  // private stripe: Stripe; // UNCOMMENT after installing stripe package

  constructor() {
    // UNCOMMENT after installing stripe package:
    /*
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.warn('STRIPE_SECRET_KEY not found in environment variables');
      throw new Error('Stripe API key is required');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia', // Use latest API version
      typescript: true
    });

    logger.info('Stripe service initialized');
    */

    logger.warn('Stripe service initialized in STUB mode - install stripe package to enable');
  }

  /**
   * Cancel a subscription
   *
   * @param subscriptionId - Stripe subscription ID
   * @param immediately - If true, cancel immediately; if false, cancel at period end
   * @returns Cancelled subscription object
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = true
  ): Promise<any> {
    try {
      logger.info('Cancelling Stripe subscription', {
        subscriptionId,
        immediately
      });

      // UNCOMMENT after installing stripe package:
      /*
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: !immediately,
          ...(immediately && { cancel_at: 'now' })
        }
      );

      if (immediately) {
        // Immediately cancel
        const cancelledSubscription = await this.stripe.subscriptions.cancel(
          subscriptionId
        );

        logger.info('Subscription cancelled immediately', {
          subscriptionId,
          status: cancelledSubscription.status
        });

        return cancelledSubscription;
      } else {
        logger.info('Subscription set to cancel at period end', {
          subscriptionId,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: subscription.current_period_end
        });

        return subscription;
      }
      */

      // STUB implementation until stripe package is installed
      logger.warn('STUB: Stripe subscription cancellation called', {
        subscriptionId,
        immediately,
        message: 'Install stripe package to enable real cancellation'
      });

      return {
        id: subscriptionId,
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
        stubMode: true
      };

    } catch (error: any) {
      logger.error('Failed to cancel Stripe subscription', {
        subscriptionId,
        error: error.message,
        code: error.code
      });

      throw new Error(`Stripe cancellation failed: ${error.message}`);
    }
  }

  /**
   * Retrieve subscription details
   *
   * @param subscriptionId - Stripe subscription ID
   * @returns Subscription object
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      // UNCOMMENT after installing stripe package:
      /*
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      logger.debug('Retrieved subscription', {
        subscriptionId,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end
      });

      return subscription;
      */

      // STUB implementation
      logger.warn('STUB: Get subscription called', { subscriptionId });

      return {
        id: subscriptionId,
        status: 'active',
        stubMode: true
      };

    } catch (error: any) {
      logger.error('Failed to retrieve subscription', {
        subscriptionId,
        error: error.message
      });

      throw new Error(`Failed to retrieve subscription: ${error.message}`);
    }
  }

  /**
   * Refund a charge
   *
   * @param chargeId - Stripe charge ID
   * @param amount - Amount to refund (in cents), optional - full refund if not specified
   * @param reason - Reason for refund ('duplicate', 'fraudulent', 'requested_by_customer')
   * @returns Refund object
   */
  async refundCharge(
    chargeId: string,
    amount?: number,
    reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' = 'requested_by_customer'
  ): Promise<any> {
    try {
      logger.info('Creating refund', {
        chargeId,
        amount,
        reason
      });

      // UNCOMMENT after installing stripe package:
      /*
      const refund = await this.stripe.refunds.create({
        charge: chargeId,
        ...(amount && { amount }),
        reason
      });

      logger.info('Refund created', {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status
      });

      return refund;
      */

      // STUB implementation
      logger.warn('STUB: Refund called', { chargeId, amount, reason });

      return {
        id: `re_stub_${Date.now()}`,
        amount: amount || 0,
        status: 'succeeded',
        stubMode: true
      };

    } catch (error: any) {
      logger.error('Failed to create refund', {
        chargeId,
        error: error.message
      });

      throw new Error(`Refund failed: ${error.message}`);
    }
  }

  /**
   * Check if Stripe is properly configured
   */
  isConfigured(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
  }
}

// Export singleton instance
let stripeServiceInstance: StripeService | null = null;

export function getStripeService(): StripeService {
  if (!stripeServiceInstance) {
    stripeServiceInstance = new StripeService();
  }
  return stripeServiceInstance;
}

export default StripeService;
