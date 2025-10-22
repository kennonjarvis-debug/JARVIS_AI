# Multi-Business Feature Implementation

## Overview

This document outlines the complete implementation of the multi-business/workspace feature for Jarvis AI, similar to how Slack handles multiple workspaces. Users can now create and manage multiple businesses, each with its own subscription, team members, and settings.

## What Was Implemented

### 1. Database Schema (`prisma/schema.prisma`)

#### New Models Added:

**Business Model:**
- `id`: Unique identifier
- `name`: Business name
- `slug`: URL-friendly identifier for routing
- `description`: Optional business description
- `logo`: Optional business logo URL
- `ownerId`: Reference to the user who created the business
- `planTier`: Subscription tier (FREE, STARTER, PROFESSIONAL, ENTERPRISE)
- `stripeCustomerId`: Stripe customer ID for billing
- `stripeSubscriptionId`: Stripe subscription ID
- `subscriptionStatus`: Current subscription status (active, canceled, past_due, trialing)
- `trialEndsAt`: Trial end date
- `createdAt`, `updatedAt`: Timestamps

**BusinessMember Model:**
- `id`: Unique identifier
- `businessId`: Reference to the business
- `userId`: Reference to the user
- `role`: User role (OWNER, ADMIN, MEMBER)
- `invitedBy`: ID of user who sent the invitation
- `invitedAt`, `joinedAt`: Timestamps
- `status`: Membership status (ACTIVE, INACTIVE, PENDING)
- `createdAt`, `updatedAt`: Timestamps

**Relationships:**
- User has many BusinessMember records
- User has many owned Businesses
- Business has many BusinessMember records
- Business belongs to one owner (User)

### 2. Backend API Routes

#### `/api/businesses` (GET, POST)

**GET** - List all businesses for the current user
- Returns all businesses where the user is a member or owner
- Includes owner info, member list, and member count
- Sorted by creation date (newest first)

**POST** - Create a new business
- Required: `name`
- Optional: `description`, `planTier`
- Automatically creates a slug from the name
- Adds the creator as OWNER member
- Sets up 7-day free trial
- Returns the created business with full details

#### `/api/businesses/[id]` (GET, PATCH, DELETE)

**GET** - Get a specific business
- Requires user to be a member or owner
- Returns full business details including members

**PATCH** - Update a business
- Requires OWNER or ADMIN role
- Can update: `name`, `description`, `logo`
- Returns updated business

**DELETE** - Delete a business
- Requires OWNER role only
- Cascades to delete all members
- Cancels Stripe subscription if exists

#### `/api/billing/create-business-checkout` (POST)

**POST** - Create Stripe checkout session for a business subscription
- Required: `businessId`, `planTier` (starter, professional, enterprise)
- Creates or retrieves Stripe customer for the business
- Creates checkout session with:
  - Success/cancel URLs specific to the business
  - Metadata for webhook processing
  - Billing address collection
  - Promo code support
- Returns `checkoutUrl` for redirect

### 3. Frontend Components

#### `app/onboarding/business/page.tsx`

Complete onboarding flow for creating a new business:
- Clean, modern UI matching Jarvis design system
- Form validation
- Error handling
- Displays key features and benefits
- Auto-redirects to business dashboard on success
- Shows 7-day trial information

**Features:**
- Business name input (required)
- Description input (optional)
- Feature highlights
- Loading states
- Error messages
- Terms of Service and Privacy Policy links

#### `components/BusinessSwitcher.tsx`

Slack-style business switcher component:
- Dropdown showing all user's businesses
- Current business indicator
- Business logos or initials
- Member count per business
- "Create New Business" button
- Click outside to close
- Smooth animations
- Responsive design

**Usage:**
```tsx
import BusinessSwitcher from '@/components/BusinessSwitcher';

<BusinessSwitcher currentBusinessSlug="acme-corp" />
```

#### `components/BusinessCheckout.tsx`

Pricing and checkout component for business subscriptions:
- Three-tier pricing display (Starter, Professional, Enterprise)
- Feature comparison
- Current plan indicator
- Stripe checkout integration
- FAQ section
- Loading states
- Error handling
- Responsive card layout

**Usage:**
```tsx
import BusinessCheckout from '@/components/BusinessCheckout';

<BusinessCheckout
  businessId="business_123"
  businessName="Acme Corporation"
  currentPlanTier="FREE"
/>
```

**Plans:**
- **Starter ($49/month)**: Up to 5 members, basic automations, 50 AI requests/day
- **Professional ($149/month)**: Unlimited members, advanced automations, 500 AI requests/day, analytics
- **Enterprise ($499/month)**: Everything + dedicated support, unlimited requests, SLA guarantee

### 4. Stripe Webhook Updates

Updated `app/api/webhooks/stripe/route.ts` to handle business subscriptions:

**subscription.created:**
- Checks for `businessId` in metadata
- Updates Business record with:
  - Stripe subscription ID
  - Stripe customer ID
  - Plan tier
  - Subscription status
  - Trial end date

**subscription.updated:**
- Updates Business subscription status
- Updates plan tier if changed
- Updates trial end date

**subscription.deleted:**
- Marks Business subscription as canceled
- Downgrades to FREE tier

## Migration Steps

### 1. Update Database Schema

```bash
cd ~/Jarvis/web/jarvis-web

# Generate Prisma client with new models
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_business_models
```

### 2. Configure Stripe Products

Create three products in Stripe Dashboard for business subscriptions:

1. **Business Starter** ($49/month)
   - Set price ID in env: `STRIPE_PRICE_BUSINESS_STARTER`

2. **Business Professional** ($149/month)
   - Set price ID in env: `STRIPE_PRICE_BUSINESS_PROFESSIONAL`

3. **Business Enterprise** ($499/month)
   - Set price ID in env: `STRIPE_PRICE_BUSINESS_ENTERPRISE`

### 3. Environment Variables

Add to `.env.local`:

```bash
# Existing Stripe variables
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# New Business Plan Price IDs
STRIPE_PRICE_BUSINESS_STARTER=price_...
STRIPE_PRICE_BUSINESS_PROFESSIONAL=price_...
STRIPE_PRICE_BUSINESS_ENTERPRISE=price_...
```

### 4. Update Existing Pages

Add BusinessSwitcher to your layout or navigation:

```tsx
// app/observatory/layout.tsx or similar
import BusinessSwitcher from '@/components/BusinessSwitcher';

export default function ObservatoryLayout({ children, params }) {
  return (
    <div>
      <nav>
        <BusinessSwitcher currentBusinessSlug={params.businessSlug} />
        {/* other nav items */}
      </nav>
      {children}
    </div>
  );
}
```

### 5. Create Business-Specific Pages

Update your routing to support business slugs:

```
app/
  observatory/
    [businessSlug]/
      page.tsx              # Business dashboard
      billing/
        page.tsx            # Use BusinessCheckout component
      settings/
        page.tsx            # Business settings
      members/
        page.tsx            # Team management
```

Example billing page:

```tsx
// app/observatory/[businessSlug]/billing/page.tsx
import BusinessCheckout from '@/components/BusinessCheckout';

export default async function BillingPage({
  params
}: {
  params: { businessSlug: string }
}) {
  // Fetch business details
  const response = await fetch(`/api/businesses/${params.businessSlug}`);
  const { business } = await response.json();

  return (
    <BusinessCheckout
      businessId={business.id}
      businessName={business.name}
      currentPlanTier={business.planTier}
    />
  );
}
```

## User Flow

### Creating a Business

1. User clicks "Create New Business" in BusinessSwitcher
2. Redirects to `/onboarding/business`
3. User enters business name and optional description
4. Clicks "Create Business & Start Trial"
5. API creates Business record with:
   - 7-day free trial
   - User as OWNER member
   - Status: trialing
6. Redirects to `/observatory/{slug}`

### Upgrading a Business

1. User navigates to `/observatory/{slug}/billing`
2. Sees BusinessCheckout component with three plans
3. Clicks "Subscribe" on desired plan
4. Redirects to Stripe Checkout
5. Completes payment
6. Stripe webhook updates Business record
7. Redirects back to billing page with success message

### Switching Between Businesses

1. User clicks BusinessSwitcher dropdown
2. Sees list of all their businesses
3. Clicks on a business
4. Redirects to `/observatory/{new-slug}`
5. UI updates to show new business context

## API Response Examples

### GET /api/businesses

```json
{
  "success": true,
  "businesses": [
    {
      "id": "cuid_123",
      "name": "Acme Corporation",
      "slug": "acme-corp",
      "description": "Our main business",
      "logo": null,
      "planTier": "PROFESSIONAL",
      "subscriptionStatus": "active",
      "trialEndsAt": null,
      "owner": {
        "id": "user_123",
        "name": "John Doe",
        "email": "john@acme.com",
        "image": null
      },
      "members": [
        {
          "id": "member_123",
          "role": "OWNER",
          "status": "ACTIVE",
          "user": {
            "id": "user_123",
            "name": "John Doe",
            "email": "john@acme.com"
          }
        }
      ],
      "_count": {
        "members": 5
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### POST /api/businesses

```json
// Request
{
  "name": "My New Business",
  "description": "A description of my business"
}

// Response
{
  "success": true,
  "business": {
    "id": "cuid_456",
    "name": "My New Business",
    "slug": "my-new-business",
    "description": "A description of my business",
    "planTier": "FREE",
    "subscriptionStatus": "trialing",
    "trialEndsAt": "2025-01-22T10:00:00Z",
    "owner": { /* user object */ },
    "members": [ /* members array */ ]
  }
}
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Can create a new business via API
- [ ] Can list all businesses for a user
- [ ] Can update business details
- [ ] Can delete a business (owner only)
- [ ] BusinessSwitcher displays all user's businesses
- [ ] BusinessSwitcher navigates to correct business
- [ ] Business onboarding form validates input
- [ ] Business onboarding creates business and redirects
- [ ] BusinessCheckout displays pricing correctly
- [ ] Can initiate Stripe checkout for a business
- [ ] Stripe webhook updates business subscription
- [ ] Trial period is correctly set and tracked
- [ ] Business roles (OWNER, ADMIN, MEMBER) are enforced
- [ ] Only owners can delete businesses
- [ ] Only owners/admins can update businesses

## Future Enhancements

### Phase 2: Team Management
- Invite team members via email
- Accept/decline invitations
- Manage member roles
- Remove members

### Phase 3: Business Settings
- Custom branding (logo, colors)
- Business profile settings
- API keys per business
- Webhook configuration

### Phase 4: Business Analytics
- Usage metrics per business
- Cost tracking
- Team activity logs
- AI usage breakdown

### Phase 5: Advanced Billing
- Team seats pricing
- Usage-based billing
- Annual billing discounts
- Multiple payment methods

## Support

For issues or questions about this implementation:
1. Check the Prisma schema for data model questions
2. Review API route files for endpoint behavior
3. Inspect component files for UI/UX details
4. Test webhook handlers with Stripe CLI

## Notes

- All monetary amounts are in USD
- Subscription billing is monthly by default
- Trials are 7 days for all new businesses
- FREE tier has limited features
- Business slugs are unique across the platform
- Business deletion is irreversible
- Stripe customer IDs are business-specific, not user-specific
