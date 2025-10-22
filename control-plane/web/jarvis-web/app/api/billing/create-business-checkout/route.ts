import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover',
});

// Stripe Price IDs for additional businesses
const BUSINESS_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_BUSINESS_STARTER || '',
  professional: process.env.STRIPE_PRICE_BUSINESS_PROFESSIONAL || '',
  enterprise: process.env.STRIPE_PRICE_BUSINESS_ENTERPRISE || '',
};

interface CreateBusinessCheckoutRequest {
  businessId: string;
  planTier: 'starter' | 'professional' | 'enterprise';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreateBusinessCheckoutRequest = await request.json();
    const { businessId, planTier } = body;

    // Validate request
    if (!businessId || !planTier) {
      return NextResponse.json(
        { success: false, error: 'Business ID and plan tier are required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get business and verify ownership
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        ownerId: user.id,
      },
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found or you are not the owner' },
        { status: 404 }
      );
    }

    // Get the Stripe price ID
    const priceId = BUSINESS_PRICE_IDS[planTier];
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan tier' },
        { status: 400 }
      );
    }

    // Create or get Stripe customer for this business
    let stripeCustomerId = business.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: business.name,
        metadata: {
          businessId: business.id,
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Update business with Stripe customer ID
      await prisma.business.update({
        where: { id: businessId },
        data: { stripeCustomerId },
      });
    }

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/observatory/${business.slug}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/observatory/${business.slug}/billing?canceled=true`,
      metadata: {
        businessId: business.id,
        userId: user.id,
        planTier,
      },
      subscription_data: {
        metadata: {
          businessId: business.id,
          userId: user.id,
          planTier,
        },
      },
      // Collect billing address for tax purposes
      billing_address_collection: 'required',
      // Allow promotional codes
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });

  } catch (error) {
    console.error('Stripe business checkout error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
