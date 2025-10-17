import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

// Stripe Price IDs (you'll get these after creating products in Stripe)
const PRICE_IDS = {
  // Jarvis
  jarvis_starter: process.env.STRIPE_PRICE_JARVIS_STARTER || '',
  jarvis_professional: process.env.STRIPE_PRICE_JARVIS_PROFESSIONAL || '',
  jarvis_enterprise: process.env.STRIPE_PRICE_JARVIS_ENTERPRISE || '',

  // AI DAWG
  aidawg_creator: process.env.STRIPE_PRICE_AIDAWG_CREATOR || '',
  aidawg_pro: process.env.STRIPE_PRICE_AIDAWG_PRO || '',
  aidawg_studio: process.env.STRIPE_PRICE_AIDAWG_STUDIO || '',
};

interface CreateCheckoutRequest {
  planId: string;
  userId?: string;
  email?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CreateCheckoutRequest = await request.json();
    const { planId, userId, email } = body;

    // Validate request
    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Get the Stripe price ID
    const priceId = PRICE_IDS[planId as keyof typeof PRICE_IDS];
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan ID' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/observatory/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      customer_email: email,
      client_reference_id: userId,
      metadata: {
        userId: userId || '',
        planId,
      },
      subscription_data: {
        metadata: {
          userId: userId || '',
          planId,
        },
        // 7-day trial already used, start subscription immediately
        trial_period_days: 0,
      },
      // Collect billing address for tax purposes
      billing_address_collection: 'required',
      // Allow promotional codes
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create checkout session',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
