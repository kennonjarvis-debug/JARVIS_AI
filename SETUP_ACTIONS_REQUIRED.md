# 🚀 Jarvis Setup - Actions Required

**Date**: October 19, 2025
**Priority**: Complete these in order for production launch

---

## ✅ Step 1: Fix Supabase Site URL (5 minutes) - **DO THIS FIRST!**

### Problem
Google OAuth redirects to DAWG AI instead of Jarvis AI

### Solution
1. **Go to**: https://supabase.com/dashboard/project/nzmzmsmxbiptilzgdmgt/auth/url-configuration

2. **Change Site URL**:
   - FROM: `https://dawg-ai.com` ❌
   - TO: `https://jarvis-ai.co` ✅

3. **Verify Redirect URLs** include:
   - `https://jarvis-ai.co/**`
   - `http://localhost:5173/**`

4. **Click Save**

5. **Test**: Go to https://jarvis-ai.co and sign in with Google OAuth

---

## ✅ Step 2: Complete Twitter OAuth 2.0 Setup (10 minutes) - DONE! ✅

### What I've Built
✅ Created OAuth routes (`/api/auth/twitter`, `/api/auth/twitter/callback`)
✅ Created OAuth callback handler
✅ Updated .env files with OAuth credentials
✅ Updated frontend ConnectPage with OAuth button
✅ Added callback handling in DashboardPage
✅ Ready to connect user Twitter accounts

### What You Need to Do

#### A. Get Your Twitter OAuth Client Secret

1. **Go to**: https://developer.x.com/en/portal/projects/1978599861936070656/apps/31679071/keys

2. **Scroll down** to find "OAuth 2.0 Client Secret"

3. **If not visible**, click "Regenerate Secret"

4. **Copy the secret** (you'll only see it once!)

#### B. Set Twitter Callback URLs

1. **In same Twitter Developer Portal page**, find "App Settings" or "Edit App"

2. **Add Callback URLs**:
   ```
   http://localhost:3001/api/auth/twitter/callback
   https://jarvis-ai.co/api/auth/twitter/callback
   ```

3. **Set Website URL**: `https://jarvis-ai.co`

4. **Set App Type**: `Web App, Automated App or Bot`

5. **Save changes**

#### C. Update Your .env File

Open `/packages/backend/.env` and replace:

```bash
TWITTER_OAUTH_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

With your actual secret:

```bash
TWITTER_OAUTH_CLIENT_SECRET=paste_your_secret_here
```

### How Users Will Connect (After Setup)

1. User clicks "Connect Twitter" button on https://jarvis-ai.co
2. Redirected to Twitter to authorize
3. User clicks "Authorize App"
4. Redirected back to Jarvis with account connected ✅
5. Jarvis can now post to THEIR Twitter account

**No more manual API keys!** 🎉

---

## ✅ Step 3: Set Up Stripe Subscriptions (20 minutes) - BACKEND COMPLETE! ✅

### What I've Built
✅ Installed Stripe SDK in backend
✅ Created complete Stripe backend routes:
  - `POST /api/stripe/create-checkout-session` - Create subscription payment
  - `POST /api/stripe/webhook` - Handle Stripe webhook events
  - `GET /api/stripe/subscription` - Get user's current subscription
  - `POST /api/stripe/portal` - Create customer portal session
  - `POST /api/stripe/cancel` - Cancel subscription
✅ Added Stripe methods to frontend API client
✅ Updated .env files with Stripe placeholders
✅ Configured webhook signature verification (raw body middleware)
✅ Ready for Pro Plan ($49/month), Free Plan, and Business Plan ($149/month)

### What You Need to Do

#### A. Get Stripe API Keys

1. **Go to**: https://dashboard.stripe.com/apikeys

2. **Copy your keys**:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

3. **Add to `.env`**:
   ```bash
   STRIPE_SECRET_KEY=sk_test_your_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

#### B. Create Stripe Products & Prices

**Option 1: Use Stripe CLI (Recommended)**

I'll create a script that does this automatically.

**Option 2: Manual Setup**

1. Go to: https://dashboard.stripe.com/products
2. Click "Add Product"
3. Create these products:

**Free Plan**:
- Name: "Jarvis AI - Free"
- Price: $0/month

**Pro Plan**:
- Name: "Jarvis AI - Pro"
- Price: $49/month
- Recurring billing

4. Copy the Price IDs (will be like `price_xxx`)

#### C. Set Up Stripe Webhook

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. Set endpoint URL: `https://jarvis-ai.co/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret (starts with `whsec_`)
6. Add to `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

---

## 📊 Step 4: Define Subscription Tiers

### Recommended Pricing Structure

```
┌─────────────────────────────────────────────┐
│ FREE TIER                                   │
│ • 1 Twitter account                         │
│ • 50 AI actions/month                       │
│ • Basic automation                          │
│ • Good for testing                          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ PRO - $49/month ⭐                           │
│ • Unlimited Twitter accounts                │
│ • Unlimited AI actions                      │
│ • All integrations (Twitter, iMessage,      │
│   Notes, Voice Memos, Gmail, Calendar)      │
│ • Advanced automation                       │
│ • Priority support                          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ BUSINESS - $149/month                       │
│ • Everything in Pro                         │
│ • 5 team members                            │
│ • Custom workflows                          │
│ • API access                                │
│ • Dedicated support                         │
└─────────────────────────────────────────────┘
```

### Features Matrix

| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| Twitter Accounts | 1 | Unlimited | Unlimited |
| AI Actions/Month | 50 | Unlimited | Unlimited |
| iMessage Integration | ❌ | ✅ | ✅ |
| Notes Integration | ❌ | ✅ | ✅ |
| Voice Memos | ❌ | ✅ | ✅ |
| Gmail (Coming Soon) | ❌ | ✅ | ✅ |
| Calendar (Coming Soon) | ❌ | ✅ | ✅ |
| Team Members | 1 | 1 | 5 |
| Support | Email | Priority | Dedicated |

---

## 🔧 What I'm Implementing Next

### 1. Stripe Integration Code (30 mins)

**Backend Routes** (`/packages/backend/src/routes/stripe.ts`):
- `POST /api/stripe/create-checkout-session` - Create payment
- `POST /api/stripe/webhook` - Handle events
- `GET /api/stripe/subscription` - Get user subscription
- `POST /api/stripe/cancel` - Cancel subscription
- `POST /api/stripe/update` - Update subscription

**Frontend Components**:
- Pricing page with plans
- "Upgrade to Pro" button
- Subscription management page
- Payment success/failure pages

**Database Tables**:
- `subscriptions` - Track user subscriptions
- `usage_logs` - Track AI action usage
- `billing_events` - Stripe event history

### 2. Twitter Automation Features (1 hour)

**Auto-Replies**:
- Monitor mentions
- AI-generated responses
- Confidence scoring before posting
- User approval workflow

**Tweet Scheduling**:
- Queue tweets for optimal times
- Draft management
- Analytics on best posting times

**Social Listening**:
- Track keywords/hashtags
- Competitor monitoring
- Trend alerts
- Engagement opportunities

---

## 📋 Complete Checklist

### Immediate (Today)
- [ ] Fix Supabase Site URL
- [ ] Get Twitter OAuth Client Secret
- [ ] Set Twitter callback URLs
- [ ] Update `.env` with Twitter secret
- [ ] Test Twitter OAuth flow

### This Week
- [ ] Get Stripe API keys
- [ ] Create Stripe products (Free, Pro, Business)
- [ ] Set up Stripe webhook
- [ ] Test subscription flow
- [ ] Deploy to production

### This Month
- [ ] Improve Twitter automation (auto-replies)
- [ ] Add tweet scheduling
- [ ] Social listening features
- [ ] Analytics dashboard

### Next 2-3 Months
- [ ] LinkedIn integration
- [ ] Gmail integration
- [ ] Calendar integration
- [ ] Meta (Facebook/Instagram/Threads)

---

## 🚨 Critical Notes

### Security
- ✅ Never commit `.env` files to git
- ✅ Use environment variables in Netlify for production
- ✅ Stripe webhook secret is essential for security
- ✅ Always use HTTPS in production

### Testing
1. Test OAuth flow in development first (localhost)
2. Then test in production (jarvis-ai.co)
3. Test subscription flow with Stripe test mode
4. Switch to live mode only after thorough testing

### Cost Tracking
- Twitter API: $100-$5000/month depending on usage
- Stripe fees: 2.9% + 30¢ per transaction
- Server hosting: ~$50/month
- **Break-even**: 5 Pro subscribers ($245/month revenue)

---

## 💰 Revenue Projections

### Year 1
- **Goal**: 50 Pro subscribers
- **MRR**: $2,450/month
- **Annual**: $29,400
- **Costs**: ~$500/month
- **Net Profit**: $23,400/year

### Year 2
- **Goal**: 500 Pro subscribers
- **MRR**: $24,500/month
- **Annual**: $294,000
- **Costs**: ~$5,500/month
- **Net Profit**: $228,000/year

---

## 📞 Need Help?

**Twitter OAuth Issues**:
- Check callback URLs match exactly
- Verify Client ID and Secret are correct
- Check browser console for errors

**Stripe Issues**:
- Use test mode first (keys start with `sk_test_`)
- Check webhook endpoint is accessible
- Verify webhook secret matches

**General Questions**:
- Check JARVIS_STATUS.md for current setup
- Check JARVIS_AUTOMATION_STRATEGY.md for features
- Ask me for help! I'll guide you through it.

---

**Last Updated**: October 19, 2025
**Status**: Ready for Step 2 (Twitter OAuth completion)
