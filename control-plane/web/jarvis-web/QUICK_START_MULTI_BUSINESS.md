# Quick Start: Multi-Business Feature

## Get Started in 5 Minutes

### Step 1: Run Database Migration

```bash
cd ~/Jarvis/web/jarvis-web

# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_business_models

# This will:
# - Add Business model
# - Add BusinessMember model
# - Update User model with new relations
```

### Step 2: Configure Stripe Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)

2. Create three products:

   **Product 1: Business Starter**
   - Name: "Business Starter"
   - Price: $49 USD / month
   - Copy the Price ID (starts with `price_...`)

   **Product 2: Business Professional**
   - Name: "Business Professional"
   - Price: $149 USD / month
   - Copy the Price ID

   **Product 3: Business Enterprise**
   - Name: "Business Enterprise"
   - Price: $499 USD / month
   - Copy the Price ID

3. Add to `.env.local`:

```bash
STRIPE_PRICE_BUSINESS_STARTER=price_1234567890abcdef
STRIPE_PRICE_BUSINESS_PROFESSIONAL=price_abcdef1234567890
STRIPE_PRICE_BUSINESS_ENTERPRISE=price_fedcba0987654321
```

### Step 3: Test Business Creation

1. Start your dev server:
```bash
npm run dev
```

2. Navigate to: `http://localhost:3000/onboarding/business`

3. Create a test business:
   - Name: "Test Business"
   - Description: "My test business"
   - Click "Create Business & Start Trial"

4. You should be redirected to `/observatory/test-business`

### Step 4: Test Business Switcher

1. Add the `BusinessSwitcher` component to your navigation:

```tsx
// app/layout.tsx or your nav component
import BusinessSwitcher from '@/components/BusinessSwitcher';

// In your component:
<nav>
  <BusinessSwitcher currentBusinessSlug={businessSlug} />
</nav>
```

2. Create another business
3. Click the BusinessSwitcher dropdown
4. Switch between businesses

### Step 5: Test Checkout Flow

1. Navigate to: `http://localhost:3000/observatory/test-business/billing`

2. Click "Subscribe" on any plan

3. You'll be redirected to Stripe Checkout (test mode)

4. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

5. Complete checkout

6. Stripe webhook will update your business subscription

### Step 6: Test Webhook (Optional)

1. Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Copy the webhook signing secret and add to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

5. Test a webhook event:
```bash
stripe trigger customer.subscription.created
```

## Common Use Cases

### Use Case 1: User Creates First Business

```
User signs up → Onboarding flow → Create business → 7-day trial starts → Access dashboard
```

### Use Case 2: User Creates Additional Business

```
Existing user → Click "Create New Business" → Onboarding → New business created → Switch to it
```

### Use Case 3: User Upgrades Business

```
Free trial ending → Go to Billing → Choose plan → Stripe Checkout → Webhook updates subscription
```

### Use Case 4: User Switches Between Businesses

```
Click BusinessSwitcher → See all businesses → Click one → Navigate to that business dashboard
```

## API Testing with cURL

### List Businesses
```bash
curl -X GET http://localhost:3000/api/businesses \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Create Business
```bash
curl -X POST http://localhost:3000/api/businesses \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "name": "My New Business",
    "description": "A test business"
  }'
```

### Get Business Details
```bash
curl -X GET http://localhost:3000/api/businesses/BUSINESS_ID \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Update Business
```bash
curl -X PATCH http://localhost:3000/api/businesses/BUSINESS_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "name": "Updated Business Name"
  }'
```

### Create Checkout Session
```bash
curl -X POST http://localhost:3000/api/billing/create-business-checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "businessId": "BUSINESS_ID",
    "planTier": "professional"
  }'
```

## Troubleshooting

### Issue: "Business not found"
- **Solution**: Make sure you're logged in and the business belongs to your user

### Issue: Stripe checkout fails
- **Solution**: Check that Stripe price IDs are correctly set in `.env.local`

### Issue: Webhook not working
- **Solution**:
  1. Verify `STRIPE_WEBHOOK_SECRET` is set
  2. Use Stripe CLI for local testing
  3. Check webhook logs in Stripe Dashboard

### Issue: Business switcher is empty
- **Solution**: Create at least one business first via `/onboarding/business`

### Issue: Migration fails
- **Solution**:
  1. Make sure PostgreSQL is running
  2. Check `DATABASE_URL` in `.env.local`
  3. Try: `npx prisma migrate reset` (WARNING: This deletes all data)

## Next Steps

1. **Add Team Management**
   - Invite members by email
   - Manage member roles
   - Track team activity

2. **Customize Business Settings**
   - Upload custom logos
   - Set business branding
   - Configure integrations per business

3. **Add Business Analytics**
   - Track usage per business
   - Monitor AI request counts
   - Generate business reports

4. **Implement Business Isolation**
   - Separate data by business
   - Business-specific API keys
   - Per-business rate limits

## Support

Need help? Check:
- Full implementation guide: `MULTI_BUSINESS_IMPLEMENTATION.md`
- Prisma schema: `prisma/schema.prisma`
- API routes: `app/api/businesses/`
- Components: `components/Business*.tsx`

## Testing Checklist

- [ ] Can create a business
- [ ] Can list all businesses
- [ ] Can update business details
- [ ] Can delete a business
- [ ] BusinessSwitcher shows all businesses
- [ ] Can switch between businesses
- [ ] Can start Stripe checkout
- [ ] Webhook updates subscription status
- [ ] Trial period is tracked correctly
- [ ] Only owners can delete businesses

Happy building! 🚀
