import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mock subscription handler
// In production, this would integrate with Stripe, Paddle, or another payment processor

interface SubscribeRequest {
  planId: string;
  email: string;
}

interface SubscriptionResponse {
  success: boolean;
  message: string;
  subscriptionId?: string;
  checkoutUrl?: string;
}

const PLAN_PRICES = {
  starter: 29,
  professional: 99,
  enterprise: 299,
};

const PLAN_NAMES = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

export async function POST(request: NextRequest): Promise<NextResponse<SubscriptionResponse>> {
  try {
    const body: SubscribeRequest = await request.json();
    const { planId, email } = body;

    // Validate request
    if (!planId || !email) {
      return NextResponse.json(
        {
          success: false,
          message: 'Plan ID and email are required',
        },
        { status: 400 }
      );
    }

    // Validate plan exists
    if (!PLAN_PRICES[planId as keyof typeof PLAN_PRICES]) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid plan ID',
        },
        { status: 400 }
      );
    }

    // Mock subscription creation
    // In production, this would:
    // 1. Create/update customer in payment processor
    // 2. Create subscription
    // 3. Generate checkout URL
    // 4. Store subscription details in database
    // 5. Return checkout URL or confirmation

    const mockSubscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const planName = PLAN_NAMES[planId as keyof typeof PLAN_NAMES];
    const price = PLAN_PRICES[planId as keyof typeof PLAN_PRICES];

    console.log('Mock subscription created:', {
      subscriptionId: mockSubscriptionId,
      email,
      planId,
      planName,
      price,
      timestamp: new Date().toISOString(),
    });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // In production, return a checkout URL
    // For now, we'll just return success
    return NextResponse.json({
      success: true,
      message: `Successfully initiated subscription to ${planName} plan`,
      subscriptionId: mockSubscriptionId,
      // In production, this would be a Stripe/Paddle checkout URL
      checkoutUrl: `/observatory/billing?plan=${planId}&subscription=${mockSubscriptionId}`,
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process subscription',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve subscription status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email is required',
        },
        { status: 400 }
      );
    }

    // Mock subscription retrieval
    // In production, this would fetch from database/payment processor
    const mockSubscription = {
      id: 'sub_mock_123456',
      email,
      plan: 'starter',
      status: 'active',
      observatoriesUsed: 1,
      observatoriesLimit: 1,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
    };

    return NextResponse.json({
      success: true,
      subscription: mockSubscription,
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch subscription',
      },
      { status: 500 }
    );
  }
}
