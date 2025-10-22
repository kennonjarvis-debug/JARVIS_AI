# Railway GitHub Actions Deployment Setup

**Status:** Ready to deploy via GitHub Actions
**Method:** Automated deployment on every push

---

## ✅ What's Already Done

1. ✅ Railway CLI installed (`@railway/cli`)
2. ✅ GitHub repositories created (both private)
   - `dawg-ai` - https://github.com/trevortelenick-lang/dawg-ai
   - `jarvis-observatory` - https://github.com/trevortelenick-lang/jarvis-observatory
3. ✅ GitHub Actions workflows added to both repos
4. ✅ Railway configuration files (`railway.json`, `Procfile`)

---

## 🔑 Step 1: Get Railway API Token (YOU DO THIS)

### A. Login to Railway Dashboard
Go to: https://railway.app/dashboard

### B. Create API Token
1. Click your **profile picture** (top right)
2. Go to **"Account Settings"**
3. In the left sidebar under **"PERSONAL"**, click **"Tokens"**
4. Click **"Create Token"** button
5. **Name it:** "GitHub Actions Deployment"
6. **Copy the token** (starts with something like `railway_...`)
7. **SAVE IT** - you can't see it again!

---

## 🔒 Step 2: Add Token to GitHub Secrets (YOU DO THIS)

### For DAWG AI Repository

1. Go to: https://github.com/trevortelenick-lang/dawg-ai/settings/secrets/actions

2. Click **"New repository secret"**

3. **Name:** `RAILWAY_TOKEN`

4. **Value:** Paste your Railway token

5. Click **"Add secret"**

### For Observatory Repository

1. Go to: https://github.com/trevortelenick-lang/jarvis-observatory/settings/secrets/actions

2. Click **"New repository secret"**

3. **Name:** `RAILWAY_TOKEN`

4. **Value:** Paste the SAME Railway token

5. Click **"Add secret"**

---

## 🚀 Step 3: Create Railway Projects (YOU DO THIS)

Since GitHub Actions needs existing projects to deploy to:

### Create DAWG AI Project

1. Go to: https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Empty Project"**
4. Name it: **"dawg-ai"**
5. Click "Create"
6. **Copy the Project ID** (from URL or settings)

### Create Observatory Project

1. Click **"New Project"** again
2. Select **"Empty Project"**
3. Name it: **"observatory"**
4. Click "Create"
5. **Copy the Project ID**

---

## 🎯 Step 4: Update GitHub Actions Workflows (I'LL DO THIS)

Once you have the Project IDs, I'll update the workflows to include them.

**For now, the workflows are set to deploy to services named:**
- `dawg-ai` (for DAWG AI)
- `observatory` (for Observatory)

---

## ⚡ Step 5: Trigger Deployment

### Option A: Manual Trigger in GitHub

1. Go to **Actions** tab in each repository
2. Click on **"Deploy to Railway"** workflow
3. Click **"Run workflow"** dropdown (right side)
4. Select branch: **"master"**
5. Click green **"Run workflow"** button

### Option B: Automatic Trigger (Push Code)

The workflows automatically run on every push to `master` or `main` branch.

To trigger now, just push any change:
```bash
cd ~/Development/DAWG_AI
git commit --allow-empty -m "Trigger Railway deployment"
git push
```

---

## 📋 Step 6: Configure Domains in Railway

After successful deployment (5-10 minutes):

### For DAWG AI (dawg-ai.com)

1. Go to Railway Dashboard → Your DAWG AI project
2. Click on the service
3. Go to **"Settings"** tab
4. Scroll to **"Domains"** section
5. Click **"Add Domain"**
6. Enter: `dawg-ai.com`
7. Railway will show a **CNAME value** (like `dawg-ai-production.up.railway.app`)
8. **Copy this CNAME value**

### For Observatory (jarvis-ai.co)

1. Go to Railway Dashboard → Your Observatory project
2. Click on the service
3. Go to **"Settings"** → **"Domains"**
4. Click **"Add Domain"**
5. Enter: `jarvis-ai.co`
6. **Copy the CNAME value**

---

## 🌐 Step 7: Configure DNS Records (YOU DO THIS)

### At Your Domain Registrar (where you bought the domains)

**For dawg-ai.com:**

Add these DNS records:
```
Type: CNAME
Host: @
Value: [paste what Railway gave you]
TTL: 3600

Type: CNAME
Host: www
Value: [same value as above]
TTL: 3600
```

**For jarvis-ai.co:**

Add these DNS records:
```
Type: CNAME
Host: @
Value: [paste what Railway gave you]
TTL: 3600

Type: CNAME
Host: www
Value: [same value as above]
TTL: 3600
```

### DNS Propagation

- Wait **30-60 minutes** for DNS to propagate
- SSL certificates auto-provision (another 10-30 min)
- Check status: `dig dawg-ai.com` and `dig jarvis-ai.co`

---

## ✅ Verification

### Check Deployment Status

**In Railway Dashboard:**
- Check deployment logs
- Look for "Deployment successful"
- Service should show as "Active"

**In GitHub:**
- Go to Actions tab
- Workflow should show green checkmark ✅

### Test Your Domains

```bash
# Test DAWG AI
curl https://dawg-ai.com/health
# Should return: {"status":"healthy"}

# Test Observatory
open https://jarvis-ai.co
# Should show login page
```

---

## 🔄 Environment Variables (If Needed)

### For Observatory

Add these in Railway Dashboard → Observatory Project → Variables:

```
PUBLIC_DAWG_AI_URL=https://dawg-ai.com
OBSERVATORY_USERNAME=admin
OBSERVATORY_PASSWORD=jarvis2025
NODE_ENV=production
```

---

## 📝 Workflow Files Created

### DAWG AI Workflow
Location: `~/Development/DAWG_AI/.github/workflows/railway-deploy.yml`

```yaml
name: Deploy DAWG AI to Railway
on:
  push:
    branches: [master, main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: bervProject/railway-deploy@0.1.2-beta
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: dawg-ai
```

### Observatory Workflow
Location: `/Users/benkennon/Jarvis-v0/.github/workflows/railway-deploy.yml`

```yaml
name: Deploy Observatory to Railway
on:
  push:
    branches: [master, main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: bervProject/railway-deploy@0.1.2-beta
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: observatory
```

---

## 🆘 Troubleshooting

### Workflow Fails with "Service not found"

**Solution:** Make sure you created the Railway projects and named them exactly:
- `dawg-ai`
- `observatory`

### Workflow Fails with "Authentication failed"

**Solution:** Check that `RAILWAY_TOKEN` secret is correctly added to GitHub repo secrets.

### Deployment Succeeds but Site Not Working

**Solution:**
1. Check Railway logs for errors
2. Verify environment variables are set
3. Check build logs for any errors

### DNS Not Working After 2 Hours

**Solution:**
1. Verify CNAME records are correct in registrar
2. Remove any conflicting A records
3. Check with: `dig dawg-ai.com` and `nslookup dawg-ai.com`

---

## 🎉 Quick Start Checklist

Do these in order:

- [ ] 1. Get Railway API Token (Account Settings → Tokens)
- [ ] 2. Add `RAILWAY_TOKEN` to dawg-ai GitHub secrets
- [ ] 3. Add `RAILWAY_TOKEN` to jarvis-observatory GitHub secrets
- [ ] 4. Create "dawg-ai" project in Railway (empty project)
- [ ] 5. Create "observatory" project in Railway (empty project)
- [ ] 6. Go to GitHub Actions and manually trigger deployments
- [ ] 7. Wait for deployments to complete (5-10 min)
- [ ] 8. Add domains in Railway (dawg-ai.com, jarvis-ai.co)
- [ ] 9. Copy CNAME values from Railway
- [ ] 10. Add CNAME records to domain registrar
- [ ] 11. Wait for DNS propagation (30-60 min)
- [ ] 12. Test: `curl https://dawg-ai.com/health`
- [ ] 13. Test: `open https://jarvis-ai.co`

---

## 📞 Need Help?

- Railway Docs: https://docs.railway.com
- GitHub Actions Docs: https://docs.github.com/actions
- Railway Discord: https://discord.gg/railway

---

**Status:** Ready to deploy! Start with Step 1 above. 🚀
