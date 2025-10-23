# Deploy Control Plane to Railway (Web Interface)

The easiest way to deploy the control-plane is through Railway's web interface.

## Quick Steps (5 Minutes)

### 1. Open Your Railway Project

Go to: https://railway.com/project/d3a0b8ca-a68d-445b-a5eb-6b6db890c1af

### 2. Create New Service

1. Click **"+ New"** button (top right)
2. Select **"GitHub Repo"**
3. Connect to your GitHub account if not already connected
4. Select the repository containing JARVIS
5. Select the **`control-plane`** directory

OR if you prefer to deploy from local:

1. Click **"+ New"** button
2. Select **"Empty Service"**
3. Name it: `control-plane`
4. Go to the new service → **"Settings"** → **"Source"**
5. Click **"Connect Repo"** and follow the steps

### 3. Configure Build Settings

In the service settings:

**Build Command**:
```bash
npm install && npm run build
```

**Start Command**:
```bash
npm start
```

**Root Directory**: Leave blank or set to `control-plane` if deploying from monorepo

### 4. Set Environment Variables

Click **"Variables"** tab and add:

```
PORT=5001
JARVIS_AUTH_TOKEN=test-token
NODE_ENV=production
```

Add any other environment variables your control-plane needs.

### 5. Generate Domain

1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Copy the generated URL (e.g., `https://control-plane-production-abc123.up.railway.app`)

### 6. Deploy!

Railway will automatically deploy. Watch the logs in the **"Deployments"** tab.

Once deployed, you'll see: ✅ **"Build Successful"** and the service will be running.

---

## Get the URL

After deployment:

1. Go to **"Settings"** → **"Networking"** → **"Public Networking"**
2. Copy the domain under **"Domains"**
3. Your URL will look like:
   ```
   https://control-plane-production-abc123.up.railway.app
   ```

---

## Test the Deployment

```bash
# Test health endpoint
curl -H "Authorization: Bearer test-token" \
  https://YOUR_RAILWAY_URL/health

# Test browser automation
curl -X POST https://YOUR_RAILWAY_URL/api/v1/execute \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "module": "browser",
    "action": "inspect",
    "params": {
      "url": "https://example.com",
      "captureConsole": true
    }
  }'
```

---

## Update ChatGPT Schema

Once you have the URL, update:

`/Users/benkennon/JARVIS_AI/chatgpt-custom-action-schema.json`

Change line 10:
```json
"url": "https://YOUR_RAILWAY_URL"
```

Then follow the ChatGPT setup in `CHATGPT_SETUP_GUIDE.md`!

---

## Alternative: Deploy via CLI (If You Prefer)

If the web interface isn't your thing, here's the CLI approach:

```bash
cd /Users/benkennon/JARVIS_AI/control-plane

# Push to GitHub first
git add .
git commit -m "Prepare control-plane for Railway deployment"
git push

# Then in Railway dashboard:
# New → GitHub Repo → Select repo → Select control-plane directory
```

---

**That's it! Once deployed, come back with your Railway URL and we'll finish the ChatGPT setup!**
