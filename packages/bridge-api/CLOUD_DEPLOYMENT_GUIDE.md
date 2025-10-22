# Cloud Deployment Guide - Move Everything to Cloud

Complete guide to deploy JARVIS Bridge API + repos to the cloud, making it 100% independent of your Mac.

---

## 🎯 What This Achieves

- ✅ Bridge API runs 24/7 in the cloud
- ✅ JARVIS_AI and DAWG_AI repos cloned to cloud VM
- ✅ ChatGPT can access/modify repos anytime
- ✅ Your Mac can be off completely
- ✅ Permanent URL (no ngrok needed)
- ⚠️ Costs $0-6/month depending on provider

---

## Option A: Railway (Free Tier)

### Pros:
- Free tier: 500 hours/month ($5 credit)
- Easiest setup
- Auto-deploy from GitHub
- Built-in environment variables

### Cons:
- Limited to $5/month free credit
- May need paid plan for 24/7 uptime

### Setup Steps:

#### 1. Prepare Repository

Add Railway configuration to your bridge-api:

**Create `railway.toml`:**
```toml
[build]
builder = "NIXPACKS"
buildCommand = "pnpm install"

[deploy]
startCommand = "pnpm start"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
NODE_ENV = "production"
```

**Create `Procfile`:**
```
web: node dist/index.js
```

**Update package.json scripts:**
```json
{
  "scripts": {
    "dev": "pnpm exec tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "postinstall": "pnpm build"
  }
}
```

#### 2. Deploy to Railway

1. Go to https://railway.app and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `JARVIS_AI` repository
4. Railway detects it as a monorepo - select `packages/bridge-api`
5. Add environment variables:
   - `BRIDGE_BEARER_TOKEN`: Your bearer token
   - `BRIDGE_PORT`: 5555
   - `NODE_ENV`: production
   - `ALLOWED_PATHS`: /app/JARVIS_AI,/app/DAWG_AI,/tmp
   - `ALLOWED_COMMANDS`: Leave empty for defaults

#### 3. Clone Repos on Railway

Add a startup script to clone both repos:

**Create `packages/bridge-api/scripts/setup-repos.sh`:**
```bash
#!/bin/bash

# Clone JARVIS_AI
if [ ! -d "/app/JARVIS_AI" ]; then
  git clone https://github.com/kennonjarvis-debug/JARVIS_AI.git /app/JARVIS_AI
fi

# Clone DAWG_AI
if [ ! -d "/app/DAWG_AI" ]; then
  git clone https://github.com/kennonjarvis-debug/DAWG_AI.git /app/DAWG_AI
fi

# Install dependencies
cd /app/JARVIS_AI && pnpm install
cd /app/DAWG_AI && pnpm install
```

**Update `package.json`:**
```json
{
  "scripts": {
    "prestart": "bash scripts/setup-repos.sh",
    "start": "node dist/index.js"
  }
}
```

#### 4. Update ChatGPT

Replace ngrok URL with Railway URL in OpenAPI spec:
```yaml
servers:
  - url: https://your-project.railway.app
```

---

## Option B: DigitalOcean Droplet (Most Control)

### Pros:
- Full control over VM
- SSH access
- Can run multiple services
- Very reliable

### Cons:
- $6/month cost
- More manual setup

### Setup Steps:

#### 1. Create Droplet

1. Go to https://digitalocean.com
2. Create account (get $200 free credit for 60 days)
3. Create Droplet:
   - Distribution: Ubuntu 22.04 LTS
   - Size: Basic - $6/month (1GB RAM)
   - Datacenter: Choose closest to you
   - Authentication: SSH Key (create if needed)
4. Note the IP address

#### 2. Initial Server Setup

SSH into your droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

Update system:
```bash
apt update && apt upgrade -y
```

Install Node.js and pnpm:
```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install git
apt-get install -y git
```

#### 3. Clone Repositories

```bash
cd /root
git clone https://github.com/kennonjarvis-debug/JARVIS_AI.git
git clone https://github.com/kennonjarvis-debug/DAWG_AI.git

cd JARVIS_AI
pnpm install

cd /root/DAWG_AI
pnpm install
```

#### 4. Setup Bridge API

```bash
cd /root/JARVIS_AI/packages/bridge-api

# Create .env file
cat > .env << EOF
BRIDGE_PORT=5555
NODE_ENV=production
BRIDGE_BEARER_TOKEN=nxoQlsDL6uthmQmHKBZ5vUFNLCB132tV1Dh/qhYF3MU=
ALLOWED_PATHS=/root/JARVIS_AI,/root/DAWG_AI,/tmp
CORS_ORIGIN=*
EOF

# Build
pnpm build
```

#### 5. Setup PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start bridge API
pm2 start dist/index.js --name bridge-api

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### 6. Setup Nginx Reverse Proxy

```bash
# Install Nginx
apt-get install -y nginx

# Configure Nginx
cat > /etc/nginx/sites-available/bridge-api << 'EOF'
server {
    listen 80;
    server_name YOUR_DROPLET_IP;

    location / {
        proxy_pass http://localhost:5555;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/bridge-api /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx
```

#### 7. Setup SSL (Optional but Recommended)

```bash
# Install Certbot
apt-get install -y certbot python3-certbot-nginx

# Get free SSL certificate (requires domain name)
# If you have a domain pointing to your droplet:
certbot --nginx -d yourdomain.com

# Or use ngrok for HTTPS without domain
```

#### 8. Update ChatGPT

Replace ngrok URL with your droplet IP/domain in OpenAPI spec:
```yaml
servers:
  - url: http://YOUR_DROPLET_IP
  # OR with SSL:
  - url: https://yourdomain.com
```

#### 9. Update ALLOWED_PATHS

Update your Custom GPT instructions with new paths:
```
ALLOWED PATHS:
- /root/JARVIS_AI (for JARVIS files)
- /root/DAWG_AI (for DAWG files)
- /tmp (for temporary files)
```

---

## Option C: Render (Easy Alternative)

### Pros:
- Free tier (750 hours/month)
- Easy GitHub integration
- Automatic HTTPS

### Cons:
- Free tier sleeps after 15 min inactivity
- Need paid plan ($7/month) for 24/7

### Setup:

1. Go to https://render.com
2. Sign in with GitHub
3. New → Web Service
4. Connect `JARVIS_AI` repository
5. Select `packages/bridge-api`
6. Build Command: `pnpm install && pnpm build`
7. Start Command: `pnpm start`
8. Add environment variables (same as Railway)
9. Deploy!

---

## 🔄 Keeping Repos Updated

Add these commands to your allowed commands so ChatGPT can pull updates:

**Update `.env`:**
```bash
ALLOWED_COMMANDS=git,npm,pnpm,ls,pwd,cat,echo,date,cd,git pull,git fetch,git log,git status
```

Then ChatGPT can run:
- `cd /root/JARVIS_AI && git pull` to update JARVIS
- `cd /root/DAWG_AI && git pull` to update DAWG

---

## 📊 Cost Comparison

| Provider | Free Tier | Paid | Best For |
|----------|-----------|------|----------|
| Railway | 500 hrs/month | $5-20/month | Easiest setup |
| Render | 750 hrs/month (sleeps) | $7/month | Simple projects |
| DigitalOcean | $200 credit (60 days) | $6/month | Full control |
| Fly.io | 3 VMs free | $5-10/month | Multiple services |

---

## ⚠️ Important Security Notes

1. **Keep Bearer Token Secret**: Never commit to git
2. **Use SSH Keys**: For DigitalOcean access
3. **Enable Firewall**: Only allow ports 22, 80, 443
4. **Regular Updates**: Keep system and packages updated
5. **Backup Regularly**: Use DigitalOcean snapshots

---

## 🚀 Which Should You Choose?

**Choose Railway if:**
- You want easiest setup
- Free tier is enough (500 hours/month)
- Don't need full control

**Choose DigitalOcean if:**
- You want 24/7 guaranteed uptime
- Need SSH access for debugging
- Want to run other services too
- $6/month is acceptable

**Choose Render if:**
- Infrequent usage is fine (sleeps after 15 min)
- Want automatic HTTPS
- Budget is tight

---

## 📝 Post-Deployment Checklist

After deploying to cloud:

- [ ] Bridge API accessible at permanent URL
- [ ] All 4 endpoints working (/health, /run, /read, /write)
- [ ] JARVIS_AI repo cloned and accessible
- [ ] DAWG_AI repo cloned and accessible
- [ ] ChatGPT OpenAPI spec updated with new URL
- [ ] ChatGPT instructions updated with new paths
- [ ] Test from ChatGPT: check health
- [ ] Test from ChatGPT: run git status
- [ ] Test from ChatGPT: read a file
- [ ] Test from ChatGPT: write a file
- [ ] Stop local server and ngrok (no longer needed!)

**You're now 100% cloud-based! 🎉**
