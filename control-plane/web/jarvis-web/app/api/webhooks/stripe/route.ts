import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover',
});

const prisma = new PrismaClient();

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Disable body parsing - Stripe needs raw body for signature verification
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('Received Stripe event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  const planId = subscription.metadata.planId;
  const businessId = subscription.metadata.businessId;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  // Handle business subscription
  if (businessId) {
    const planTier = subscription.metadata.planTier?.toUpperCase() || 'STARTER';

    await prisma.business.update({
      where: { id: businessId },
      data: {
        planTier,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id,
        subscriptionStatus: subscription.status,
        trialEndsAt: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
      },
    });

    console.log(`Business subscription created: ${businessId} - ${planTier}`);
    return;
  }

  // Handle user subscription (legacy)
  console.log(`User subscription created for user ${userId}: ${planId}`);
  console.log(`Subscription details:`, {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    priceId: subscription.items.data[0]?.price.id,
    status: subscription.status,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripeSubscriptionId = subscription.id;
  const businessId = subscription.metadata.businessId;

  // Handle business subscription update
  if (businessId) {
    const planTier = subscription.metadata.planTier?.toUpperCase() || 'STARTER';

    await prisma.business.update({
      where: { id: businessId },
      data: {
        planTier,
        subscriptionStatus: subscription.status,
        trialEndsAt: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
      },
    });

    console.log(`Business subscription updated: ${businessId} - Status: ${subscription.status}`);
    return;
  }

  // Handle user subscription update (legacy)
  console.log(`User subscription updated: ${stripeSubscriptionId}`);
  console.log(`Updated status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeSubscriptionId = subscription.id;
  const businessId = subscription.metadata.businessId;

  // Handle business subscription cancellation
  if (businessId) {
    await prisma.business.update({
      where: { id: businessId },
      data: {
        subscriptionStatus: 'canceled',
        planTier: 'FREE',
      },
    });

    console.log(`Business subscription canceled: ${businessId}`);
    return;
  }

  // Handle user subscription cancellation (legacy)
  console.log(`User subscription canceled: ${stripeSubscriptionId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscription = (invoice as any).subscription;
  const stripeSubscriptionId = typeof subscription === 'string' ? subscription : subscription?.id;

  if (!stripeSubscriptionId) return;

  // TODO: Add Subscription model to Prisma schema and implement subscription management
  console.log(`Payment succeeded for subscription: ${stripeSubscriptionId} (not persisted - Subscription model not yet implemented)`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscription = (invoice as any).subscription;
  const stripeSubscriptionId = typeof subscription === 'string' ? subscription : subscription?.id;

  if (!stripeSubscriptionId) return;

  // TODO: Add Subscription model to Prisma schema and implement subscription management
  console.log(`Payment failed for subscription: ${stripeSubscriptionId} (not persisted - Subscription model not yet implemented)`);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.userId;

  if (!userId) {
    console.error('Missing userId in checkout session');
    return;
  }

  // The subscription.created event will handle the actual subscription setup
  console.log(`Checkout completed for user: ${userId}`);
}

// Helper function to get plan limits
function getPlanLimits(product: 'JARVIS' | 'AIDAWG', tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE') {
  const limits: Record<string, any> = {
    JARVIS: {
      STARTER: {
        aiRequestsPerDay: 50,
        observatoriesLimit: 3,
      },
      PROFESSIONAL: {
        aiRequestsPerDay: 200,
        observatoriesLimit: 999,
      },
      ENTERPRISE: {
        aiRequestsPerDay: 99999,
        observatoriesLimit: 999,
      },
    },
    AIDAWG: {
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

  return limits[product][tier];
}
