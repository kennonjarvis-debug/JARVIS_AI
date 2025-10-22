# Jarvis AI - Deployment Complete ✅

## New Separate Netlify Site

Jarvis AI is now deployed on its **own dedicated Netlify site**, completely separate from DAWG AI.

### Site Details

- **Site Name**: jarvis-ai-platform
- **Live URL**: https://jarvis-ai-platform.netlify.app
- **Admin Dashboard**: https://app.netlify.com/projects/jarvis-ai-platform
- **GitHub Repository**: https://github.com/kennonjarvis-debug/jarvis-deploy

---

## Project Structure

```
jarvis-deploy/
├── packages/
│   ├── shared/          # Shared TypeScript types and utilities
│   ├── backend/         # Express API routes
│   └── frontend/        # React + Vite UI
├── netlify/
│   └── functions/
│       └── api.ts       # Serverless function wrapper
├── netlify.toml         # Netlify configuration
└── package.json         # Monorepo workspace config
```

---

## Configuration

### Build Settings

From `netlify.toml`:
```toml
[build]
  command = "npm run build:shared && npm run build:frontend"
  publish = "packages/frontend/dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"

[functions]
  node_bundler = "esbuild"
  included_files = ["packages/shared/dist/**"]
```

### Environment Variables

All credentials are configured in `netlify.toml` under `[context.production.environment]`:

- **Supabase** (Authentication & Database)
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_KEY

- **Twitter OAuth 2.0**
  - TWITTER_OAUTH_CLIENT_ID
  - TWITTER_OAUTH_CLIENT_SECRET
  - TWITTER_API_KEY
  - TWITTER_API_SECRET
  - TWITTER_ACCESS_TOKEN
  - TWITTER_ACCESS_TOKEN_SECRET

- **Stripe Payments**
  - STRIPE_SECRET_KEY
  - STRIPE_WEBHOOK_SECRET
  - STRIPE_STARTER_PRICE_ID ($9.99/month)
  - STRIPE_PRO_PRICE_ID ($29.99/month)
  - STRIPE_ENTERPRISE_PRICE_ID ($99.99/month)

---

## API Endpoints

Base URL: `https://jarvis-ai-platform.netlify.app/api`

### Health Check
```bash
GET /api/health
```

### Authentication
```bash
POST /api/auth/google/callback
POST /api/auth/logout
```

### Integrations
```bash
GET  /api/integrations/twitter/auth
GET  /api/integrations/twitter/callback
POST /api/integrations/twitter/disconnect
GET  /api/integrations/twitter/status
```

### Stripe Subscriptions
```bash
POST /api/stripe/create-checkout
POST /api/stripe/webhook
POST /api/stripe/create-customer-portal
```

---

## How It Works

1. **Frontend**: React app served from `/packages/frontend/dist`
2. **Backend**: Netlify Function at `/.netlify/functions/api` proxies all `/api/*` requests
3. **Routing**: `netlify.toml` redirects `/api/*` → `/.netlify/functions/api/:splat`
4. **Functions**: Express app wrapped with `serverless-http` in `netlify/functions/api.ts`

---

## Deployment

### Automatic Deployments

Every `git push` to the `main` branch automatically triggers a deployment:

```bash
git add .
git commit -m "Your changes"
git push
```

Netlify will:
1. Run `npm run build:shared` (compile TypeScript in packages/shared)
2. Run `npm run build:frontend` (build React app with Vite)
3. Bundle functions with esbuild
4. Deploy to production

### Manual Deploy

```bash
cd /Users/benkennon/Projects_Archive/jarvis/jarvis-deploy
netlify deploy --prod --build
```

---

## Testing

### Local Development

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

### Production Testing

1. **Test Health Endpoint**:
   ```bash
   curl https://jarvis-ai-platform.netlify.app/api/health
   ```

2. **Test Google Sign-In**:
   - Visit: https://jarvis-ai-platform.netlify.app
   - Click "Sign in with Google"
   - Should redirect to Google OAuth

3. **Test Twitter Integration**:
   - After signing in, click "Connect Twitter"
   - Should redirect to Twitter authorization

4. **Test Stripe Checkout**:
   - Click on any subscription plan
   - Should redirect to Stripe checkout page

---

## Troubleshooting

### Build Failures

Check the build logs:
https://app.netlify.com/projects/jarvis-ai-platform/deploys

Common issues:
- `@jarvis/shared` not found → Ensure `npm run build:shared` runs first
- Missing environment variables → Check `netlify.toml` has all required vars

### Function Errors

Check function logs:
https://app.netlify.com/projects/jarvis-ai-platform/logs/functions

Common issues:
- CORS errors → Check FRONTEND_URL environment variable
- Database errors → Verify Supabase credentials
- Twitter API errors → Check Twitter OAuth tokens

---

## Next Steps

1. **Configure Custom Domain** (optional):
   - Go to: https://app.netlify.com/projects/jarvis-ai-platform/settings/domain
   - Add custom domain: `jarvis-ai.co`

2. **Set up DNS** (if using custom domain):
   - Point DNS A record to Netlify's load balancer
   - Or use Netlify DNS

3. **Update Supabase Site URL**:
   - If using custom domain, update in Supabase dashboard
   - Authentication → URL Configuration → Site URL

4. **Update Twitter Callback URL**:
   - If using custom domain, update in Twitter Developer Portal
   - https://developer.twitter.com/apps
   - Add: `https://your-domain.com/api/integrations/twitter/callback`

---

## Repository Structure

This is completely separate from DAWG AI:
- **DAWG AI**: Different codebase, different Netlify site, different domain
- **Jarvis AI**: This project, dedicated Netlify site (jarvis-ai-platform)

No shared infrastructure or deployments!
