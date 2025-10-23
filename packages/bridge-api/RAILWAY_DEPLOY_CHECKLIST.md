# Railway Deployment Checklist

## ✅ Pre-Deployment
- [x] Code committed to GitHub
- [x] Railway configuration files created
- [x] Environment variables ready

## 📋 Environment Variables to Set

Copy these exactly into Railway:

```
BRIDGE_PORT=5555
NODE_ENV=production
BRIDGE_BEARER_TOKEN=nxoQlsDL6uthmQmHKBZ5vUFNLCB132tV1Dh/qhYF3MU=
ALLOWED_PATHS=/app/repos/JARVIS_AI,/app/repos/DAWG_AI,/tmp
CORS_ORIGIN=*
```

## 🚀 Deployment Steps

### Step 1: Create Project
- [ ] Login to Railway with GitHub
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Choose `JARVIS_AI` repository

### Step 2: Configure Service
- [ ] Set root directory to `packages/bridge-api`
- [ ] Add all environment variables above
- [ ] Click "Deploy"

### Step 3: Get Domain
- [ ] Go to Settings → Domains
- [ ] Click "Generate Domain"
- [ ] Copy the URL (ends with `.up.railway.app`)

### Step 4: Test Deployment
```bash
# Test health endpoint
curl https://YOUR-URL.up.railway.app/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":123,"version":"1.0.0"}
```

### Step 5: Update ChatGPT
- [ ] Edit Custom GPT
- [ ] Update OpenAPI spec server URL
- [ ] Update instructions with cloud paths:
  - /app/repos/JARVIS_AI
  - /app/repos/DAWG_AI
  - /tmp
- [ ] Test from ChatGPT

## 🎯 Your Railway URL
Write it here once generated:
```
https://_________________________________.up.railway.app
```

## ✅ Success Indicators

**Deployment Logs Should Show:**
```
🚀 Setting up cloud repositories...
📁 Setting up JARVIS_AI...
  Cloning repository...
  Installing dependencies...
  ✅ JARVIS_AI ready!
📁 Setting up DAWG_AI...
  Cloning repository...
  Installing dependencies...
  ✅ DAWG_AI ready!
✨ All repositories are ready!

{"level":"info","message":"Configuration validated successfully"}
{"level":"info","message":"JARVIS Bridge API started","port":5555}
```

## 🆘 Troubleshooting

### Build Failed?
- Check environment variables are set exactly as shown
- Check root directory is `packages/bridge-api`
- Check GitHub repo has latest commit

### Can't Access URL?
- Wait 1-2 minutes after deployment
- Check deployment logs for errors
- Verify health endpoint returns 200 OK

### Repos Not Cloning?
- Check Railway has network access
- Check GitHub repos are public
- Check deployment logs for git errors

## 📞 Next Steps After Deployment

1. **Stop local server** - You no longer need it!
2. **Stop ngrok** - Not needed anymore!
3. **Update ChatGPT** - Use your Railway URL
4. **Test everything** - Try all 4 endpoints
5. **Turn off your Mac** - Everything runs in cloud now!

---

**You're deploying to make your setup 100% cloud-based and 24/7 available!** 🎉
