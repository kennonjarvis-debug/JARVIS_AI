/**
 * Stripe Subscription Routes
 * Handles Stripe subscriptions, webhooks, and billing portal
 */

import { Router, type Request, type Response } from 'express';
import Stripe from 'stripe';
import { Logger } from '@jarvis/shared';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const logger = new Logger('StripeRoutes');

// Lazy-loaded Stripe instance
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;

    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2024-12-18.acacia',
    });
  }

  return stripeInstance;
}

// Initialize Supabase lazily to avoid module-load errors
let supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_KEY || '';
    if (!url || !key) {
      throw new Error('Supabase credentials not configured');
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

// Price IDs for subscription tiers
const PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID || '',
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
};

/**
 * POST /api/stripe/create-checkout-session
 * Create a Stripe Checkout session for subscription
 */
router.post('/create-checkout-session', requireAuth, async (req: Request, res: Response) => {
  try {
    const { user_id, price_id, success_url, cancel_url } = req.body;

    if (!user_id || !price_id) {
      return res.status(400).json({
        error: 'Missing required parameters',
      });
    }

    // Get or create Stripe customer
    const { data: userData, error: userError} = await getSupabase()
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', user_id)
      .single();

    if (userError || !userData) {
      throw new Error('User not found');
    }

    let customerId = userData.stripe_customer_id;

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: userData.email,
        metadata: {
          user_id,
        },
      });

      customerId = customer.id;

      // Save customer ID to database
      await getSupabase()
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user_id);

      logger.info('Created Stripe customer', { user_id, customer_id: customerId });
    }

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      success_url: success_url || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?subscription=success`,
      cancel_url: cancel_url || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pricing?subscription=cancelled`,
      metadata: {
        user_id,
      },
    });

    logger.info('Created checkout session', { user_id, session_id: session.id });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error('Failed to create checkout session', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    logger.error('Webhook signature verification failed', err);
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  logger.info('Received Stripe webhook', { type: event.type });

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        logger.info('Unhandled webhook event', { type: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * GET /api/stripe/subscription
 * Get user's current subscription
 */
router.get('/subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        error: 'Missing user_id parameter',
      });
    }

    // Get subscription from database
    const { data: subscriptionData, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single();

    if (subError || !subscriptionData) {
      return res.json({
        subscription: null,
        plan: 'free',
      });
    }

    res.json({
      subscription: subscriptionData,
      plan: subscriptionData.plan,
    });
  } catch (error) {
    logger.error('Failed to get subscription', error);
    res.status(500).json({
      error: 'Failed to get subscription',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/stripe/portal
 * Create a Stripe Customer Portal session
 */
router.post('/portal', requireAuth, async (req: Request, res: Response) => {
  try {
    const { user_id, return_url } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'Missing user_id parameter',
      });
    }

    // Get Stripe customer ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user_id)
      .single();

    if (userError || !userData || !userData.stripe_customer_id) {
      return res.status(404).json({
        error: 'No Stripe customer found for this user',
      });
    }

    // Create portal session
    const session = await getStripe().billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: return_url || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`,
    });

    logger.info('Created portal session', { user_id, session_id: session.id });

    res.json({
      url: session.url,
    });
  } catch (error) {
    logger.error('Failed to create portal session', error);
    res.status(500).json({
      error: 'Failed to create portal session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/stripe/cancel
 * Cancel user's subscription
 */
router.post('/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'Missing user_id parameter',
      });
    }

    // Get subscription
    const { data: subscriptionData, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single();

    if (subError || !subscriptionData) {
      return res.status(404).json({
        error: 'No active subscription found',
      });
    }

    // Cancel at period end
    const subscription = await getStripe().subscriptions.update(
      subscriptionData.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    // Update database
    await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    logger.info('Subscription cancelled', { user_id, subscription_id: subscription.id });

    res.json({
      success: true,
      subscription,
    });
  } catch (error) {
    logger.error('Failed to cancel subscription', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Webhook handler functions

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;

  if (!userId) {
    logger.warn('No user_id in checkout session metadata');
    return;
  }

  logger.info('Checkout completed', { user_id: userId, session_id: session.id });

  // The subscription will be handled by customer.subscription.created event
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Get user from customer ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (userError || !userData) {
    logger.warn('User not found for customer', { customer_id: customerId });
    return;
  }

  const userId = userData.id;

  // Determine plan from price ID
  const priceId = subscription.items.data[0]?.price.id;
  let plan = 'free';

  if (priceId === PRICE_IDS.starter) {
    plan = 'starter';
  } else if (priceId === PRICE_IDS.pro) {
    plan = 'pro';
  } else if (priceId === PRICE_IDS.enterprise) {
    plan = 'enterprise';
  }

  // Upsert subscription in database
  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: subscription.status,
      plan,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_subscription_id',
    });

  if (subError) {
    logger.error('Failed to upsert subscription', subError);
    throw subError;
  }

  logger.info('Subscription updated', { user_id: userId, plan, status: subscription.status });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Update subscription status to cancelled
  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (subError) {
    logger.error('Failed to update subscription status', subError);
    throw subError;
  }

  logger.info('Subscription deleted', { subscription_id: subscription.id });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  logger.info('Payment succeeded', {
    subscription_id: subscriptionId,
    amount: invoice.amount_paid
  });

  // Log payment in database (optional)
  // You can create a payments table to track all payments
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  logger.error('Payment failed', {
    subscription_id: subscriptionId,
    amount: invoice.amount_due
  });

  // Optionally send email notification to user about failed payment
}

export default router;
