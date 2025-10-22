# Stripe Setup Guide - Ben's Jarvis & AI DAWG

**Your Email**: kennonjarvis@gmail.com
**Your Name**: Ben

---

## ✅ What I Just Created For You

While you set up Stripe, I created:

1. **Stripe Checkout API** - `web/jarvis-web/app/api/billing/create-checkout/route.ts`
   - Handles subscription creation
   - Redirects users to Stripe payment page

2. **Stripe Webhook Handler** - `web/jarvis-web/app/api/webhooks/stripe/route.ts`
   - Listens for payment events
   - Updates database when users subscribe/cancel
   - Handles payment failures

3. **Superadmin Setup Options** - `QUICK_SUPERADMIN_SETUP.md`
   - 3 options to create your superadmin account
   - Recommendation: Use Supabase (easiest)

---

## 🏃 Quick Start: While Setting Up Stripe

### Step 1: Create Stripe Products & Prices

Once you're logged into Stripe Dashboard (https://dashboard.stripe.com), run these commands in your terminal:

```bash
# Make sure Stripe CLI is installed
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login
```

Then create your products and prices:

#### **Jarvis Plans**

```bash
# Starter - $29/month
PRODUCT_ID=$(stripe products create \
  --name="Jarvis Starter" \
  --description="Perfect for solo entrepreneurs - 50 AI requests/day, 3 Observatories" \
  | grep "^id" | awk '{print $2}')

PRICE_JARVIS_STARTER=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=2900 \
  --currency=usd \
  --recurring interval=month \
  | grep "^id" | awk '{print $2}')

echo "STRIPE_PRICE_JARVIS_STARTER=$PRICE_JARVIS_STARTER"

# Professional - $99/month
PRODUCT_ID=$(stripe products create \
  --name="Jarvis Professional" \
  --description="For small teams - 200 AI requests/day, Unlimited Observatories" \
  | grep "^id" | awk '{print $2}')

PRICE_JARVIS_PRO=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=9900 \
  --currency=usd \
  --recurring interval=month \
  | grep "^id" | awk '{print $2}')

echo "STRIPE_PRICE_JARVIS_PROFESSIONAL=$PRICE_JARVIS_PRO"

# Enterprise - $299/month
PRODUCT_ID=$(stripe products create \
  --name="Jarvis Enterprise" \
  --description="For large teams - Unlimited AI requests, white-label options" \
  | grep "^id" | awk '{print $2}')

PRICE_JARVIS_ENT=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=29900 \
  --currency=usd \
  --recurring interval=month \
  | grep "^id" | awk '{print $2}')

echo "STRIPE_PRICE_JARVIS_ENTERPRISE=$PRICE_JARVIS_ENT"
```

#### **AI DAWG Plans**

```bash
# Creator - $19/month
PRODUCT_ID=$(stripe products create \
  --name="AI DAWG Creator" \
  --description="For hobbyist musicians - 10 songs/month, 5GB storage" \
  | grep "^id" | awk '{print $2}')

PRICE_AIDAWG_CREATOR=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=1900 \
  --currency=usd \
  --recurring interval=month \
  | grep "^id" | awk '{print $2}')

echo "STRIPE_PRICE_AIDAWG_CREATOR=$PRICE_AIDAWG_CREATOR"

# Pro - $49/month
PRODUCT_ID=$(stripe products create \
  --name="AI DAWG Pro" \
  --description="For semi-pro musicians - 30 songs/month, 50GB storage, voice cloning" \
  | grep "^id" | awk '{print $2}')

PRICE_AIDAWG_PRO=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=4900 \
  --currency=usd \
  --recurring interval=month \
  | grep "^id" | awk '{print $2}')

echo "STRIPE_PRICE_AIDAWG_PRO=$PRICE_AIDAWG_PRO"

# Studio - $149/month
PRODUCT_ID=$(stripe products create \
  --name="AI DAWG Studio" \
  --description="For professional studios - Unlimited songs, 500GB storage, collaboration" \
  | grep "^id" | awk '{print $2}')

PRICE_AIDAWG_STUDIO=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=14900 \
  --currency=usd \
  --recurring interval=month \
  | grep "^id" | awk '{print $2}')

echo "STRIPE_PRICE_AIDAWG_STUDIO=$PRICE_AIDAWG_STUDIO"
```

### Step 2: Add Stripe Keys to Environment

After running the commands above, add all the price IDs to your `.env` file:

```bash
cd ~/Jarvis

# Add to .env (replace with your actual keys from Stripe Dashboard)
cat >> .env << 'EOF'

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Get from https://dashboard.stripe.com/test/apikeys
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET= # Will get this in Step 3

# Stripe Price IDs (from commands above)
STRIPE_PRICE_JARVIS_STARTER=price_...
STRIPE_PRICE_JARVIS_PROFESSIONAL=price_...
STRIPE_PRICE_JARVIS_ENTERPRISE=price_...
STRIPE_PRICE_AIDAWG_CREATOR=price_...
STRIPE_PRICE_AIDAWG_PRO=price_...
STRIPE_PRICE_AIDAWG_STUDIO=price_...

# App URL
NEXT_PUBLIC_APP_URL=https://jarvis-ai.co
EOF
```

### Step 3: Set Up Stripe Webhooks

```bash
# Forward webhooks to your local dev server
stripe listen --forward-to http://localhost:4000/api/webhooks/stripe

# This will print a webhook signing secret like:
# whsec_...
# Add it to your .env as STRIPE_WEBHOOK_SECRET
```

**For production**, add webhook in Stripe Dashboard:
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. Endpoint URL: `https://jarvis-ai.co/api/webhooks/stripe`
4. Events to send:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
5. Copy the "Signing secret" and add to `.env`

---

## 🗄️ Database Setup (Choose One)

Before you can create your superadmin account, you need a database. **I recommend Option A (Supabase)** - it's fastest:

### Option A: Supabase (Recommended - 5 min)

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `jarvis-production`
4. Password: (save this securely!)
5. Region: US East (or closest to you)
6. Wait ~2 minutes for project creation
7. Go to Project Settings → Database
8. Copy the "Connection string" (URI)
9. Add to `~/Jarvis/.env`:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
10. Run:
    ```bash
    cd ~/Jarvis
    npx prisma db push
    SUPERADMIN_EMAIL=kennonjarvis@gmail.com SUPERADMIN_NAME=Ben npx tsx scripts/init-superadmin.ts
    ```

### Option B: Local PostgreSQL (if you prefer)

See `QUICK_SUPERADMIN_SETUP.md` for detailed steps.

---

## 📊 After Setup is Complete

You'll have:
- ✅ Stripe account with 6 products created
- ✅ Webhook listening for subscription events
- ✅ Database with user management
- ✅ Superadmin account (kennonjarvis@gmail.com)
- ✅ API key for full system access

---

## 🧪 Testing the Complete Flow

### 1. Test Checkout Creation
```bash
curl -X POST http://localhost:4000/api/billing/create-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "jarvis_starter",
    "email": "test@example.com",
    "userId": "test-user-123"
  }'
```

Should return: `{ "success": true, "checkoutUrl": "https://checkout.stripe.com/..." }`

### 2. Test Webhook (in separate terminal)
```bash
stripe trigger customer.subscription.created
```

Check your logs - you should see "Subscription created for user..."

### 3. Test Superadmin Access
```bash
curl -H "Authorization: Bearer <YOUR_API_KEY>" \
  http://localhost:4000/health
```

---

## 🎬 Next Steps After Stripe is Done

1. **Record Demo Videos** (see `SUBSCRIPTION_DEPLOYMENT_GUIDE.md` Phase 4)
   - Jarvis: 3 videos
   - AI DAWG: 3 videos

2. **Update Website**
   - Add pricing page
   - Embed demo videos
   - Add "Start Free Trial" buttons

3. **Launch!**
   - Enable signups
   - Monitor first users
   - Iterate based on feedback

---

## 🆘 Need Help?

**Database issues?** → Check `QUICK_SUPERADMIN_SETUP.md`
**Stripe questions?** → Check `SUBSCRIPTION_DEPLOYMENT_GUIDE.md`
**General monetization?** → Check `MONETIZATION_SYSTEM_COMPLETE.md`

---

**Current Status**: Setting up Stripe ✅
**Next**: Create database & superadmin account
**Then**: Record demo videos 🎬

Let me know when you're ready for the next step!
