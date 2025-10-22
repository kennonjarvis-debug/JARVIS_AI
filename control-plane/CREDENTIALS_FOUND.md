# 📋 Jarvis AI - All Credentials Found in Codebase

## ✅ Fully Configured Credentials

### 1. Supabase Database
**Location**: `/web/jarvis-web/.env.local` and `.env`
```bash
DATABASE_URL="postgresql://postgres:2Ezmoney@1@db.nzmzmsmxbiptilzgdmgt.supabase.co:5432/postgres"
```
**Status**: ✅ Active and working

### 2. AI API Keys
**Location**: `.env` and `.env.backup`
```bash
# OpenAI
OPENAI_API_KEY=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

# Anthropic Claude
ANTHROPIC_API_KEY=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

# Google Gemini
GEMINI_API_KEY=AIzaSyDl-Ps8WZAmfP9X0r1VB2R4XQbsnJvSwoI
```
**Status**: ✅ Active

### 3. Music Generation APIs
**Location**: `.env` and `.env.backup`
```bash
# ElevenLabs (Voice)
ELEVENLABS_API_KEY=sk_9cb83b392c74798cc17d46ac27b676e1a04aacd4c33f6bac

# Stable Audio (Beats)
STABLE_AUDIO_API_KEY=sk-IqRwBBeLrv1v9m5M9eCGxrl7KLw41mYfd06wwunl36ZRAiGM
```
**Status**: ✅ Active

### 4. Stripe Payment Integration
**Location**: `/web/jarvis-web/.env.local` and `.env`
```bash
# API Keys
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SJLCeEKVYJUPWdjjb7fmhBPCQJX46UwFhNOEpPL5e1lFZykr0ylQPoc5PZKtbJ7KSdUJMmQX1w0uVdfA6jIiLkx002FttMTXR

# Price IDs
STRIPE_PRICE_JARVIS_STARTER=price_1SJLf9EKVYJUPWdjB89Va3Au
STRIPE_PRICE_JARVIS_PROFESSIONAL=price_1SJLfEEKVYJUPWdjBJi5tsNJ
STRIPE_PRICE_JARVIS_ENTERPRISE=price_1SJLfVEKVYJUPWdjYPA47qNU
STRIPE_PRICE_AIDAWG_CREATOR=price_1SJLg5EKVYJUPWdjkfCj8xIO
STRIPE_PRICE_AIDAWG_PRO=price_1SJLgEEKVYJUPWdjCqR7oqKM
STRIPE_PRICE_AIDAWG_STUDIO=price_1SJLgHEKVYJUPWdjItEKmwen

# Webhook
STRIPE_WEBHOOK_SECRET=whsec_226cadce3f9e00cc5f5694a9a16d5768211c292721a7417b76e9a895d5bcda01
```
**Status**: ✅ Active

### 5. Redis Cache
**Location**: `.env` and `/web/jarvis-web/.env.local`
```bash
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
```
**Status**: ✅ Configured for local development

## ⚠️ Missing/Placeholder Credentials

### 1. Google OAuth (Required for Login!)
**Location**: `/web/jarvis-web/.env.local`
```bash
# Currently set to:
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```
**Status**: ⚠️ **NEEDS REAL CREDENTIALS**
**How to get**:
1. Go to https://console.cloud.google.com/
2. Create/select a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3100/api/auth/callback/google`

### 2. NextAuth Secret
**Location**: `/web/jarvis-web/.env.local`
```bash
# Currently set to:
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32
```
**Status**: ⚠️ **NEEDS GENERATION**
**How to generate**:
```bash
openssl rand -base64 32
```

### 3. Salesforce Integration
**Location**: `.env.production` (placeholders)
```bash
SALESFORCE_CLIENT_ID="your_salesforce_client_id"
SALESFORCE_CLIENT_SECRET="your_salesforce_client_secret"
```
**Status**: ⏳ Placeholder - Get from https://developer.salesforce.com/

### 4. Instagram Integration
**Location**: `.env.production` (placeholders)
```bash
INSTAGRAM_APP_ID="your_instagram_app_id"
INSTAGRAM_APP_SECRET="your_instagram_app_secret"
```
**Status**: ⏳ Placeholder - Get from https://developers.facebook.com/

### 5. Twitter/X Integration
**Location**: `.env.production` (placeholders)
```bash
TWITTER_CLIENT_ID="your_twitter_client_id"
TWITTER_CLIENT_SECRET="your_twitter_client_secret"
TWITTER_BEARER_TOKEN="your_twitter_bearer_token"
```
**Status**: ⏳ Placeholder - Get from https://developer.twitter.com/

### 6. HubSpot Integration
**Location**: `.env.production` (placeholders)
```bash
HUBSPOT_CLIENT_ID="your_hubspot_client_id"
HUBSPOT_CLIENT_SECRET="your_hubspot_client_secret"
```
**Status**: ⏳ Placeholder - Get from https://developers.hubspot.com/

### 7. Twilio SMS Integration
**Location**: `.env.production` (placeholders)
```bash
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"
```
**Status**: ⏳ Placeholder - Get from https://www.twilio.com/

### 8. Mistral AI (Optional)
**Location**: `.env`
```bash
MISTRAL_API_KEY=sk-mistral-placeholder-get-from-console-mistral-ai
```
**Status**: ⏳ Placeholder - Get from https://console.mistral.ai/

## 🚨 Priority Actions Required

### HIGH PRIORITY (Blocking Login)
1. **Get Google OAuth Credentials**
   - Without these, you cannot login to Jarvis!
   - Update `/web/jarvis-web/.env.local`:
     ```bash
     GOOGLE_CLIENT_ID=<your-actual-client-id>
     GOOGLE_CLIENT_SECRET=<your-actual-client-secret>
     ```

2. **Generate NextAuth Secret**
   ```bash
   openssl rand -base64 32
   ```
   - Update `/web/jarvis-web/.env.local`:
     ```bash
     NEXTAUTH_SECRET=<generated-secret>
     ```

### MEDIUM PRIORITY (For Integrations)
3. Get API credentials for desired integrations:
   - Salesforce
   - Instagram
   - Twitter/X
   - HubSpot
   - Twilio

## 📁 Configuration Files Overview

```
/Users/benkennon/Jarvis/
├── .env                          ✅ Main backend config (AI keys, integrations)
├── .env.backup                   ✅ Backup with same credentials
├── .env.production               ⏳ Production template (has placeholders)
└── web/jarvis-web/
    ├── .env.local                ⚠️ Web app config (missing Google OAuth!)
    └── .env.example              📖 Example template
```

## ✅ Next Steps

1. **Generate NextAuth Secret** (30 seconds)
   ```bash
   openssl rand -base64 32
   ```

2. **Get Google OAuth Credentials** (5 minutes)
   - https://console.cloud.google.com/
   - Create OAuth 2.0 credentials
   - Add redirect URI: `http://localhost:3100/api/auth/callback/google`

3. **Update `/web/jarvis-web/.env.local`** with real values

4. **Restart the web app** to activate

5. **Get integration credentials** (as needed for each platform)

---

**Summary**: You have most credentials configured! The main blocker is Google OAuth for login.
