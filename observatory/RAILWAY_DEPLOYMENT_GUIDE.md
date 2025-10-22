# Railway.app Deployment Guide

**Domains Purchased:**
- `dawg-ai.com` - DAWG AI Music Generation API
- `jarvis-ai.co` - Jarvis Observatory Dashboard

**Estimated Cost:** ~$10/month ($5/month per service)

---

## 🚀 Quick Start

### Prerequisites
1. ✅ Domains purchased: dawg-ai.com & jarvis-ai.co
2. Create Railway account: https://railway.app
3. Connect GitHub account to Railway
4. Install Railway CLI (optional): `npm install -g @railway/cli`

---

## 📦 Part 1: Deploy DAWG AI to dawg-ai.com

### Step 1: Push DAWG AI to GitHub

**Create a new repository for DAWG AI:**

```bash
cd ~/Development/DAWG_AI

# Initialize git (if not already)
git init

# Create .gitignore
cat > .gitignore << 'EOF'
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
.env
.DS_Store
*.log
EOF

# Add files
git add .
git commit -m "Initial commit: DAWG AI for Railway deployment"

# Create GitHub repo and push
# Option 1: Use gh CLI
gh repo create dawg-ai --public --source=. --remote=origin --push

# Option 2: Manual
# Create repo on github.com, then:
# git remote add origin https://github.com/YOUR_USERNAME/dawg-ai.git
# git branch -M main
# git push -u origin main
```

### Step 2: Deploy to Railway

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/dashboard
   - Click "New Project"

2. **Deploy from GitHub**
   - Select "Deploy from GitHub repo"
   - Choose `dawg-ai` repository
   - Railway will auto-detect it's a Python app

3. **Configure Environment** (if needed)
   - Click on your service
   - Go to "Variables" tab
   - Add any required environment variables
   - Railway will auto-set `PORT` variable

4. **Wait for Deployment**
   - Railway will:
     - Install Python dependencies from requirements.txt
     - Use the Procfile to start the app
     - Assign a temporary URL like `dawg-ai-production.up.railway.app`

### Step 3: Connect Custom Domain (dawg-ai.com)

1. **In Railway Dashboard**
   - Click on your DAWG AI service
   - Go to "Settings" tab
   - Scroll to "Domains" section
   - Click "Add Domain"

2. **Add Custom Domain**
   - Enter: `dawg-ai.com`
   - Railway will show DNS records to add

3. **Copy DNS Records** (Railway will provide these, example below)
   ```
   Type: CNAME
   Name: @
   Value: dawg-ai-production.up.railway.app (or similar)
   TTL: 3600

   Type: CNAME
   Name: www
   Value: dawg-ai-production.up.railway.app
   TTL: 3600
   ```

### Step 4: Add DNS Records to Your Domain Registrar

**Go to your domain registrar** (where you bought dawg-ai.com - Namecheap, GoDaddy, etc.)

1. Log in to your domain registrar
2. Find DNS Management / DNS Settings for `dawg-ai.com`
3. Add the CNAME records Railway provided:

#### For Root Domain (@)
```
Type: CNAME
Host: @
Value: [Railway will provide, e.g., dawg-ai-production.up.railway.app]
TTL: 3600 (or Auto)
```

#### For WWW Subdomain
```
Type: CNAME
Host: www
Value: [Same as above]
TTL: 3600 (or Auto)
```

**Note:** Some registrars don't allow CNAME for root domain. In that case:
- Use `ALIAS` or `ANAME` record if available
- Or use `A` record with IP Railway provides

4. **Save DNS changes**
   - Changes take 5-60 minutes to propagate
   - Railway will auto-detect when DNS is working

5. **SSL Certificate (Automatic)**
   - Railway automatically provisions SSL certificate
   - Your site will be https://dawg-ai.com within 10-30 minutes

---

## 🎛️ Part 2: Deploy Observatory to jarvis-ai.co

### Step 1: Push Observatory to GitHub

**Important:** Observatory is inside the Jarvis monorepo, so we'll push the whole project:

```bash
cd /Users/benkennon/Jarvis-v0

# Check if git is initialized
git status

# If not initialized:
git init

# Create/update .gitignore
cat >> .gitignore << 'EOF'
node_modules/
.env
.DS_Store
*.log
dist/
build/
.svelte-kit/
vite.config.js.timestamp-*
EOF

# Add files
git add .
git commit -m "Add Observatory for Railway deployment"

# Create GitHub repo and push
# Option 1: Use gh CLI
gh repo create jarvis-observatory --private --source=. --remote=origin --push

# Option 2: Manual
# Create repo on github.com, then:
# git remote add origin https://github.com/YOUR_USERNAME/jarvis-observatory.git
# git branch -M main
# git push -u origin main
```

### Step 2: Deploy Observatory to Railway

1. **Go to Railway Dashboard**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `jarvis-observatory` repository

2. **Configure Root Directory**
   - Railway will detect it's a monorepo
   - Click "Configure"
   - Set "Root Directory" to: `observatory`
   - This tells Railway to build only the observatory folder

3. **Add Environment Variables**
   - Click on service → "Variables" tab
   - Add these variables:

   ```
   PUBLIC_DAWG_AI_URL=https://dawg-ai.com
   PUBLIC_JARVIS_API_URL=http://localhost:3000
   OBSERVATORY_USERNAME=admin
   OBSERVATORY_PASSWORD=jarvis2025
   NODE_ENV=production
   ```

   **Note:** Jarvis API stays localhost because Observatory is just the frontend dashboard.

4. **Wait for Deployment**
   - Railway will:
     - Install npm dependencies
     - Run `npm run build`
     - Start with `node build/index.js`
     - Assign temporary URL like `observatory-production.up.railway.app`

### Step 3: Connect Custom Domain (jarvis-ai.co)

1. **In Railway Dashboard**
   - Click on Observatory service
   - Go to "Settings" → "Domains"
   - Click "Add Domain"
   - Enter: `jarvis-ai.co`

2. **Copy DNS Records** (Railway will provide, example):
   ```
   Type: CNAME
   Name: @
   Value: observatory-production.up.railway.app
   TTL: 3600

   Type: CNAME
   Name: www
   Value: observatory-production.up.railway.app
   TTL: 3600
   ```

### Step 4: Add DNS Records for jarvis-ai.co

**Go to your domain registrar** (where you bought jarvis-ai.co)

1. Log in and find DNS Management for `jarvis-ai.co`
2. Add CNAME records:

#### For Root Domain (@)
```
Type: CNAME (or ALIAS/ANAME)
Host: @
Value: [Railway provides, e.g., observatory-production.up.railway.app]
TTL: 3600
```

#### For WWW
```
Type: CNAME
Host: www
Value: [Same as above]
TTL: 3600
```

3. **Save and Wait**
   - DNS propagation: 5-60 minutes
   - SSL certificate: Auto-provisioned by Railway

---

## ✅ DNS Configuration Summary

### For dawg-ai.com (Your Domain Registrar)

Add these records in your DNS management panel:

```
Type    Host    Value                                    TTL
CNAME   @       dawg-ai-production.up.railway.app       3600
CNAME   www     dawg-ai-production.up.railway.app       3600
```

**Replace `dawg-ai-production.up.railway.app` with the actual value Railway provides in Step 3 above.**

### For jarvis-ai.co (Your Domain Registrar)

```
Type    Host    Value                                         TTL
CNAME   @       observatory-production.up.railway.app        3600
CNAME   www     observatory-production.up.railway.app        3600
```

**Replace `observatory-production.up.railway.app` with the actual value Railway provides.**

---

## 🔐 Security Configuration

### DAWG AI (dawg-ai.com)
- ✅ Public API - Safe to expose
- ✅ SSL/HTTPS automatic
- ✅ Only music generation endpoints
- ❌ No sensitive business logic

### Observatory (jarvis-ai.co)
- ✅ Login required: admin / jarvis2025
- ✅ SSL/HTTPS automatic
- ✅ Session-based authentication
- ⚠️ Consider adding IP whitelist for extra security

---

## 🔍 Verification Steps

### After DNS Propagation (15-60 minutes)

**Test DAWG AI:**
```bash
# Health check
curl https://dawg-ai.com/health
# Should return: {"status":"healthy"}

# Test music generation
curl -X POST https://dawg-ai.com/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "upbeat melody", "duration": 30}'
```

**Test Observatory:**
```bash
# Open in browser
open https://jarvis-ai.co

# Should show login page
# Login with: admin / jarvis2025
```

---

## 📊 Railway Monitoring

### View Logs
1. Railway Dashboard → Your Service
2. Click "Logs" tab
3. Real-time logs will stream

### Metrics
1. Click "Metrics" tab
2. View CPU, Memory, Network usage
3. Set up alerts if needed

### Deployment History
1. Click "Deployments" tab
2. View all past deployments
3. Rollback if needed

---

## 💰 Cost Breakdown

### Railway.app Pricing
- **Hobby Plan:** $5/month per service
- **DAWG AI:** $5/month
- **Observatory:** $5/month
- **Total:** $10/month

### Domains (Annual)
- **dawg-ai.com:** ~$10-15/year
- **jarvis-ai.co:** ~$10-15/year
- **Total:** ~$20-30/year

### Grand Total
- **Monthly:** $10
- **Annual:** $120 + $25 (domains) = **$145/year**

### Included Features
- ✅ Automatic SSL certificates
- ✅ Automatic deployments from GitHub
- ✅ 500GB bandwidth/month
- ✅ 8GB RAM per service
- ✅ Unlimited collaborators

---

## 🔄 CI/CD (Automatic Deployments)

Railway automatically redeploys when you push to GitHub:

```bash
# Make changes to DAWG AI
cd ~/Development/DAWG_AI
# ... edit files ...
git add .
git commit -m "Update music generation algorithm"
git push

# Railway automatically:
# 1. Detects the push
# 2. Builds the new version
# 3. Runs tests (if configured)
# 4. Deploys to production
# 5. Zero downtime switchover
```

Same process for Observatory changes!

---

## 🆘 Troubleshooting

### Issue: "Domain not working after 1 hour"

**Check DNS propagation:**
```bash
# Check if DNS has propagated
dig dawg-ai.com
nslookup dawg-ai.com

# Should show CNAME pointing to Railway
```

**Common fixes:**
- Verify CNAME records are correct
- Remove any conflicting A records
- Clear browser cache
- Try incognito mode

### Issue: "SSL certificate not provisioned"

**Railway automatically provisions SSL, but may take 30 minutes:**
- Check Railway dashboard for SSL status
- Ensure DNS is fully propagated first
- Contact Railway support if >2 hours

### Issue: "Build failing on Railway"

**Check build logs:**
1. Railway Dashboard → Service → Deployments
2. Click failed deployment
3. View logs

**Common fixes:**
- Ensure `railway.json` is in root directory
- Verify all dependencies are in `requirements.txt` (DAWG AI) or `package.json` (Observatory)
- Check for TypeScript errors (Observatory)

### Issue: "Observatory can't connect to DAWG AI"

**Check environment variable:**
```bash
# In Railway Dashboard → Observatory → Variables
# Ensure PUBLIC_DAWG_AI_URL is set to:
PUBLIC_DAWG_AI_URL=https://dawg-ai.com
```

---

## 🎉 Next Steps After Deployment

1. **Test Everything**
   - Test all DAWG AI endpoints
   - Login to Observatory
   - Verify monitoring dashboards work

2. **Update Local Environment**
   ```bash
   # Update Observatory .env to use production URL
   cd /Users/benkennon/Jarvis-v0/observatory
   echo "PUBLIC_DAWG_AI_URL=https://dawg-ai.com" >> .env
   ```

3. **Share Your API**
   - Share `https://dawg-ai.com` with users/testers
   - Create API documentation
   - Add usage examples

4. **Monitor Performance**
   - Check Railway metrics daily
   - Set up uptime monitoring (e.g., UptimeRobot)
   - Configure alerts for downtime

5. **Scale if Needed**
   - Railway automatically scales
   - Upgrade to Pro plan if hitting limits
   - Add database if needed (Railway Postgres)

---

## 📞 Support

### Railway Support
- Documentation: https://docs.railway.app
- Discord: https://discord.gg/railway
- Email: team@railway.app

### GitHub Issues
- Create issues in your repositories for bug tracking

---

**Ready to Deploy?** Follow the steps above sequentially. Each deployment takes ~10-15 minutes. DNS propagation adds another 15-60 minutes.

**Total Time:** ~1-2 hours for complete deployment of both services with custom domains and SSL.

---

## Files Created for Deployment

✅ **DAWG AI:**
- `~/Development/DAWG_AI/railway.json` - Railway configuration
- `~/Development/DAWG_AI/Procfile` - Process startup command
- `~/Development/DAWG_AI/requirements.txt` - Python dependencies (already existed)

✅ **Observatory:**
- `/Users/benkennon/Jarvis-v0/observatory/railway.json` - Railway configuration
- `/Users/benkennon/Jarvis-v0/observatory/svelte.config.js` - Updated to use adapter-node
- `/Users/benkennon/Jarvis-v0/observatory/package.json` - Added "start" script

All ready for Railway deployment! 🚀
