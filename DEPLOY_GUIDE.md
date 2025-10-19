# 🚀 Jarvis Backend - Quick Deploy Guide

**Time Required**: 15 minutes total

---

## Step 1: Deploy Backend to Railway (5 minutes)

### Option A: Railway Web UI (Easiest - Recommended)

1. **Go to Railway**: https://railway.com/project/67148d10-eedb-4b52-b30b-4e98b8679ca1

2. **Click "New Service" → "GitHub Repo"**

3. **Connect your GitHub repo** (if not connected):
   - Authorize Railway to access your GitHub
   - Select the `jarvis-deploy` repository

4. **Configure the service**:
   - **Root Directory**: `packages/backend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

5. **Add Environment Variables** (click "Variables"):
   ```bash
   NODE_ENV=production
   PORT=3000
   FRONTEND_URL=https://jarvis-ai.co

   # Supabase
   SUPABASE_URL=https://nzmzmsmxbiptilzgdmgt.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bXptc214YmlwdGlsemdkbWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTczODYsImV4cCI6MjA3NjI5MzM4Nn0.kfbv7RDBHRmxjpJZqbvPnFqUDRHwLy9kuGgaSUVW0Oo
   SUPABASE_SERVICE_KEY=your-supabase-service-key

   # Twitter OAuth
   TWITTER_OAUTH_CLIENT_ID=QkUtRkh6akFOeGdjdzJME9FeGQ6MTpjaQ
   TWITTER_OAUTH_CLIENT_SECRET=your-twitter-oauth-client-secret

   # Twitter Legacy API
   TWITTER_API_KEY=i1edmBlxyYs0idXUSs7xUnjtM
   TWITTER_API_SECRET=your-twitter-api-secret
   TWITTER_ACCESS_TOKEN=1978598113255591936-p6y9F1uLQoQM8gE7ru8sDbNEkt6K03
   TWITTER_ACCESS_TOKEN_SECRET=your-twitter-access-token-secret

   # Stripe
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

   # Stripe Price IDs
   STRIPE_STARTER_PRICE_ID=price_1SJyd0EKVYJUPWdjNM1XJwta
   STRIPE_PRO_PRICE_ID=price_1SJyd1EKVYJUPWdjaer6d3yd
   STRIPE_ENTERPRISE_PRICE_ID=price_1SJyd3EKVYJUPWdj0GRgf3VZ
   ```

6. **Click "Deploy"**

7. **Wait 2-3 minutes** for deployment to complete

8. **Copy your deployment URL** (will be something like `https://jarvis-backend-production.up.railway.app`)

9. **Enable Public Networking**:
   - Go to Settings tab
   - Click "Generate Domain"
   - Copy the generated domain (e.g., `jarvis-backend-production.up.railway.app`)

### Option B: Railway CLI (Terminal)

If you prefer CLI, run this in your terminal:

```bash
cd /Users/benkennon/Projects_Archive/jarvis/jarvis-deploy/packages/backend

# Link to your Railway project
railway link --project 67148d10-eedb-4b52-b30b-4e98b8679ca1

# Add environment variables from .env
railway variables set < .env

# Deploy
railway up

# Get the domain
railway domain
```

---

## Step 2: Update Netlify with Backend URL (2 minutes)

After deployment, update your frontend to use the real backend URL:

1. **Edit `netlify.toml`** at the root of your project:
   ```toml
   [context.production.environment]
     VITE_SUPABASE_URL = "https://nzmzmsmxbiptilzgdmgt.supabase.co"
     VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bXptc214YmlwdGlsemdkbWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTczODYsImV4cCI6MjA3NjI5MzM4Nn0.kfbv7RDBHRmxjpJZqbvPnFqUDRHwLy9kuGgaSUVW0Oo"
     VITE_BACKEND_URL = "https://YOUR-RAILWAY-URL.up.railway.app"
   ```

2. **Push to GitHub**:
   ```bash
   git add netlify.toml
   git commit -m "Update backend URL for production"
   git push
   ```

3. **Netlify will automatically redeploy** with the new backend URL

---

## Step 3: Set Twitter Callback URLs (2 minutes)

**MANUAL ONLY** - Twitter doesn't allow API configuration

1. **Go to**: https://developer.x.com/en/portal/projects/1978599861936070656/apps/31679071/settings

2. **Click "Edit" under "User authentication settings"**

3. **Under "Callback URI / Redirect URL", add**:
   ```
   http://localhost:3001/api/auth/twitter/callback
   https://YOUR-RAILWAY-URL.up.railway.app/api/auth/twitter/callback
   ```

4. **Under "Website URL", set**:
   ```
   https://jarvis-ai.co
   ```

5. **Click "Save"**

---

## Step 4: Set Up Stripe Webhook (3 minutes)

### Option A: Stripe Dashboard (Easiest)

1. **Go to**: https://dashboard.stripe.com/test/webhooks

2. **Click "+ Add endpoint"**

3. **Enter your endpoint URL**:
   ```
   https://YOUR-RAILWAY-URL.up.railway.app/api/stripe/webhook
   ```

4. **Select events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. **Click "Add endpoint"**

6. **Click "Reveal" under "Signing secret"**

7. **Copy the secret** (starts with `whsec_`)

8. **Update Railway environment variable**:
   - Go to your Railway project
   - Click "Variables"
   - Update `STRIPE_WEBHOOK_SECRET` with the new secret
   - Click "Redeploy"

### Option B: Using curl (API)

Run this command (replace `YOUR-RAILWAY-URL` with your actual URL):

```bash
curl https://api.stripe.com/v1/webhook_endpoints \
  -u your-stripe-secret-key: \
  -d url="https://YOUR-RAILWAY-URL.up.railway.app/api/stripe/webhook" \
  -d "enabled_events[]"="checkout.session.completed" \
  -d "enabled_events[]"="customer.subscription.created" \
  -d "enabled_events[]"="customer.subscription.updated" \
  -d "enabled_events[]"="customer.subscription.deleted" \
  -d "enabled_events[]"="invoice.payment_succeeded" \
  -d "enabled_events[]"="invoice.payment_failed" \
  -d description="Jarvis AI Production Webhook"
```

The response will include your webhook secret - copy the `secret` field and update Railway.

---

## Step 5: Fix Supabase Site URL (2 minutes)

**CRITICAL** - Do this or Google OAuth won't work!

1. **Go to**: https://supabase.com/dashboard/project/nzmzmsmxbiptilzgdmgt/auth/url-configuration

2. **Change Site URL**:
   - FROM: `https://dawg-ai.com` ❌
   - TO: `https://jarvis-ai.co` ✅

3. **Verify Redirect URLs include**:
   - `https://jarvis-ai.co/**`
   - `http://localhost:5173/**`

4. **Click "Save"**

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Backend is deployed and accessible (visit `https://YOUR-RAILWAY-URL/health`)
- [ ] Twitter OAuth callback URLs are set
- [ ] Stripe webhook is created and secret is in Railway
- [ ] Supabase Site URL is set to `jarvis-ai.co`
- [ ] Frontend is redeployed with backend URL
- [ ] Test Twitter connection on `https://jarvis-ai.co`
- [ ] Test subscription flow (create test checkout session)

---

## 🎉 You're Live!

Once all steps are complete:

1. **Go to**: https://jarvis-ai.co
2. **Sign in with Google**
3. **Click "Connect Twitter"**
4. **Authorize your Twitter account**
5. **Start automating!**

Your backend is now running at: `https://YOUR-RAILWAY-URL.up.railway.app`

---

## 🆘 Troubleshooting

### Backend won't deploy
- Check Railway logs for errors
- Verify all environment variables are set
- Make sure `packages/backend` has `package.json` and `tsconfig.json`

### Twitter OAuth fails
- Verify callback URLs match exactly
- Check browser console for errors
- Verify `TWITTER_OAUTH_CLIENT_SECRET` is set in Railway

### Stripe webhook not working
- Test webhook in Stripe Dashboard ("Send test webhook")
- Check Railway logs for webhook requests
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard

### Frontend can't reach backend
- Check `VITE_BACKEND_URL` in Netlify
- Verify CORS is configured correctly (`FRONTEND_URL` in Railway)
- Check Railway logs for incoming requests

---

**Estimated Total Time**: 15 minutes
**Difficulty**: Easy (mostly just copying/pasting)

Good luck with your launch! 🚀
