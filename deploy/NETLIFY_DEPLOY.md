# 🚀 Deploy Jarvis to Netlify - 5 Minutes!

Your code is ready! Just follow these 3 simple steps:

---

## Step 1: Create GitHub Repository (2 minutes)

1. **Go to GitHub**: https://github.com/new

2. **Create repo**:
   - Name: `jarvis-deploy`
   - Private or Public (your choice)
   - DON'T initialize with README (we already have code)
   - Click "Create repository"

3. **Push your code** (copy these commands):
   ```bash
   cd /Users/benkennon/Projects_Archive/jarvis/jarvis-deploy

   git remote add origin https://github.com/YOUR-USERNAME/jarvis-deploy.git
   git push -u origin main
   ```

---

## Step 2: Connect to Your Existing Netlify Site (2 minutes)

1. **Go to your Netlify dashboard**:
   https://app.netlify.com/sites/jarvis-ai-co/settings

2. **Click "Build & deploy" → "Link repository"**

3. **Select GitHub** and choose your `jarvis-deploy` repository

4. **Netlify will auto-detect** the settings from `netlify.toml`

5. **Click "Deploy site"**

---

## Step 3: Set Up Final Configurations (3 minutes)

### A. Fix Supabase Site URL (CRITICAL!)

1. Go to: https://supabase.com/dashboard/project/nzmzmsmxbiptilzgdmgt/auth/url-configuration

2. Change Site URL:
   - FROM: `https://dawg-ai.com`
   - TO: `https://jarvis-ai.co`

3. Click "Save"

### B. Set Twitter Callback URLs

1. Go to: https://developer.x.com/en/portal/projects/1978599861936070656/apps/31679071/settings

2. Click "Edit" under "User authentication settings"

3. Add callback URLs:
   ```
   http://localhost:3001/api/auth/twitter/callback
   https://jarvis-ai.co/api/auth/twitter/callback
   ```

4. Set Website URL: `https://jarvis-ai.co`

5. Click "Save"

### C. Stripe Webhook (ALREADY CONFIGURED ✅)

**Good news!** The Stripe webhook has already been created programmatically:

- **URL**: `https://jarvis-ai.co/api/stripe/webhook`
- **Events**: checkout.session.completed, customer.subscription.*, invoice.payment.*
- **Status**: Enabled
- **Secret**: Already added to netlify.toml

You can verify it at: https://dashboard.stripe.com/test/webhooks

**No action required** - this step is complete!

---

## ✅ Verification

After deployment completes (2-3 minutes):

1. **Test Health Check**:
   ```bash
   curl https://jarvis-ai.co/api/health
   ```
   Should return: `{"status":"healthy",...}`

2. **Test Twitter OAuth**:
   - Go to: https://jarvis-ai.co
   - Sign in with Google
   - Click "Connect Twitter"
   - Should redirect to Twitter authorization

3. **Test Subscription**:
   - Frontend can call `api.createCheckoutSession()`
   - Should redirect to Stripe checkout

---

## 🎉 You're Live!

Your backend is now running as **Netlify Functions** at:
- Backend API: `https://jarvis-ai.co/api/*`
- Frontend: `https://jarvis-ai.co`

All in one deployment!

---

## 🔧 Making Updates

When you make changes:

```bash
git add .
git commit -m "Your update description"
git push
```

Netlify will automatically redeploy!

---

## 🆘 Troubleshooting

### "Function not found"
- Check Netlify deploy logs
- Verify `netlify/functions/api.ts` exists
- Check build logs for TypeScript errors

### "Environment variable not set"
- Go to Netlify Dashboard → Environment variables
- Make sure all vars from `netlify.toml` are set
- Redeploy

### Twitter OAuth fails
- Verify callback URLs match exactly
- Check browser console for errors
- Make sure `TWITTER_OAUTH_CLIENT_SECRET` is set

### Stripe webhook not working
- Test in Stripe Dashboard
- Check Netlify function logs
- Verify secret matches

---

**Total Time**: 7 minutes (Stripe webhook already configured)
**Cost**: $0 (Netlify Free tier includes 125k function invocations/month)

Good luck with your launch! 🚀
