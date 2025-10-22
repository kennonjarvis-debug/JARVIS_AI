-- Migration: Create subscriptions table for Stripe integration
-- Date: 2025-01-20
-- Description: Tracks user subscriptions for additional businesses and other paid features

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE NOT NULL,

  -- Stripe identifiers
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,

  -- Subscription details
  type TEXT NOT NULL, -- 'additional_business', 'premium', 'enterprise', etc.
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'unpaid', 'incomplete'

  -- Billing periods
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_type ON subscriptions(type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_type_status ON subscriptions(type, status);

-- Create composite index for active subscriptions by type
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_type_status
  ON subscriptions(user_id, type, status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at_trigger
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Add RLS policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscriptions
CREATE POLICY subscriptions_select_policy ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Users cannot modify subscriptions directly (only via webhooks)
CREATE POLICY subscriptions_no_direct_modify ON subscriptions
  FOR ALL USING (false);

-- Add comments
COMMENT ON TABLE subscriptions IS 'User subscriptions managed by Stripe';
COMMENT ON COLUMN subscriptions.type IS 'Type of subscription: additional_business, premium, enterprise, etc.';
COMMENT ON COLUMN subscriptions.status IS 'Stripe subscription status: active, canceled, past_due, unpaid, incomplete';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at end of current period';

-- Create view for active subscriptions
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT * FROM subscriptions
WHERE status = 'active' AND (cancel_at_period_end = false OR canceled_at IS NULL);

COMMENT ON VIEW active_subscriptions IS 'Only shows active, non-canceled subscriptions';
