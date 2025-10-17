import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
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

  if (!userId || !planId) {
    console.error('Missing userId or planId in subscription metadata');
    return;
  }

  // Parse plan tier and product from planId (e.g., "jarvis_starter")
  const [product, tier] = planId.split('_');
  const planTier = tier.toUpperCase() as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  const productName = product.toUpperCase() as 'JARVIS' | 'AIDAWG';

  // Get plan limits
  const limits = getPlanLimits(productName, planTier);

  // Update user subscription in database
  await prisma.subscription.update({
    where: { userId },
    data: {
      status: 'ACTIVE',
      planTier,
      product: productName,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      ...limits,
    },
  });

  console.log(`Subscription created for user ${userId}: ${planId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripeSubscriptionId = subscription.id;

  // Find subscription in database
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });

  if (!dbSubscription) {
    console.error(`Subscription not found: ${stripeSubscriptionId}`);
    return;
  }

  // Update subscription details
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: subscription.status === 'active' ? 'ACTIVE' :
              subscription.status === 'past_due' ? 'PAST_DUE' :
              subscription.status === 'canceled' ? 'CANCELED' :
              subscription.status === 'paused' ? 'PAUSED' : 'EXPIRED',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(`Subscription updated: ${stripeSubscriptionId}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeSubscriptionId = subscription.id;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
    },
  });

  console.log(`Subscription canceled: ${stripeSubscriptionId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = invoice.subscription as string;

  if (!stripeSubscriptionId) return;

  // Update subscription status to active
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId },
    data: { status: 'ACTIVE' },
  });

  console.log(`Payment succeeded for subscription: ${stripeSubscriptionId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = invoice.subscription as string;

  if (!stripeSubscriptionId) return;

  // Update subscription status to past due
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId },
    data: { status: 'PAST_DUE' },
  });

  console.log(`Payment failed for subscription: ${stripeSubscriptionId}`);
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
