# Enhanced Hybrid Deployment Setup Guide

**Jarvis + AI DAWG - Production-Ready Hybrid Configuration**
**Cost-Optimized AI Routing: 70% Gemini / 20% GPT-4o Mini / 10% Claude**
**Target Monthly Cost: $35-50 | Saves ~$165/month vs Full Cloud**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Installation Steps](#installation-steps)
5. [Configuration](#configuration)
6. [Running Services](#running-services)
7. [Cost Monitoring](#cost-monitoring)
8. [Deployment to Vercel](#deployment-to-vercel)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

---

## Overview

The Enhanced Hybrid deployment provides a production-ready setup that:

- ✅ Runs core services locally (Jarvis Control Plane, AI DAWG Backend)
- ✅ Hosts web UI on Vercel (free tier)
- ✅ Implements smart AI routing to minimize costs
- ✅ Tracks usage and provides cost alerts
- ✅ Auto-restarts services on failure
- ✅ Saves ~$165/month compared to full cloud deployment

### Cost Breakdown

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| **Infrastructure** | | |
| Local Hardware | $0 | Using existing Mac/PC |
| Electricity (24/7) | ~$10 | 50W average consumption |
| Domain Name | $1-2 | Optional (can use ngrok free) |
| **Cloud Services** | | |
| Vercel Hosting | $0 | Free tier (hobby plan) |
| **AI API (Smart Routing)** | | |
| Gemini Flash | $0 | Free tier: 1,500 req/day |
| GPT-4o Mini | $3-8 | 20% of requests |
| Claude Sonnet 4.5 | $2-5 | 10% of requests (complex tasks) |
| **Total** | **$35-50/month** | Production-ready, cost-effective |

**Savings:** ~$165/month vs Full Cloud ($200-225/month)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENHANCED HYBRID ARCHITECTURE             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Vercel Cloud   │  ← Web UI (Next.js) - Free Tier
└────────┬─────────┘
         │
         │ HTTPS
         ▼
┌──────────────────┐
│  ngrok Tunnel    │  ← Exposes local services to internet
└────────┬─────────┘
         │
┌────────┴─────────────────────────────────────────────────────┐
│                    LOCAL INFRASTRUCTURE                       │
│  (Mac Mini / Always-On PC / Raspberry Pi)                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Jarvis Control Plane (Port 4000)                   │    │
│  │  - API Gateway                                       │    │
│  │  - Smart AI Router (70/20/10)                       │    │
│  │  - Cost Tracking                                     │    │
│  │  - Claude MCP Server                                 │    │
│  └───────────┬─────────────────────────────────────────┘    │
│              │                                                │
│              ▼                                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  AI DAWG Backend (Port 3001)                        │    │
│  │  - Module SDK                                        │    │
│  │  - Music, Marketing, Engagement Modules             │    │
│  └───────────┬─────────────────────────────────────────┘    │
│              │                                                │
│  ┌───────────┴──────────┬──────────────┐                    │
│  │                      │              │                     │
│  ▼                      ▼              ▼                     │
│ PostgreSQL            Redis        Dashboard                │
│ (Port 5432)          (6379)       (Port 3002)               │
└───────────────────────────────────────────────────────────────┘
         │                │              │
         │                │              │
         ▼                ▼              ▼
┌────────────────────────────────────────────────────────────┐
│                    AI PROVIDERS (Cloud)                     │
│  70% → Gemini Flash (Free Tier)                            │
│  20% → GPT-4o Mini ($0.15/M)                               │
│  10% → Claude Sonnet 4.5 ($3/M)                            │
└────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Software

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 15+ ([Download](https://www.postgresql.org/download/))
- **Redis** 7+ ([Download](https://redis.io/download))
- **Git** ([Download](https://git-scm.com/downloads))

### Hardware Requirements

- **Minimum:** 4GB RAM, 2 vCPU, 10GB storage
- **Recommended:** 8GB RAM, 4 vCPU, 20GB storage
- **Always-on device** (Mac Mini, old laptop, or Raspberry Pi 4)

### API Keys (Required for Smart Routing)

1. **Gemini API Key** (Free tier: 1,500 req/day)
   - Sign up: https://makersuite.google.com/app/apikey
   - Cost: $0 (free tier) / $0.15 per 1M tokens after

2. **OpenAI API Key** (GPT-4o Mini)
   - Sign up: https://platform.openai.com/api-keys
   - Cost: $0.15 per 1M input, $0.60 per 1M output

3. **Anthropic API Key** (Claude Sonnet 4.5)
   - Sign up: https://console.anthropic.com/settings/keys
   - Cost: $3 per 1M input, $15 per 1M output

---

## Installation Steps

### 1. Clone Repositories

```bash
# Clone Jarvis Control Plane
cd ~
git clone <jarvis-repo-url> Jarvis
cd Jarvis
npm install

# Clone AI DAWG Backend
cd ~
git clone <aidawg-repo-url> ai-dawg-v0.1
cd ai-dawg-v0.1
npm install
```

### 2. Install Dependencies

#### macOS (Homebrew)

```bash
# Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Install Redis
brew install redis
brew services start redis

# Verify installations
psql --version
redis-cli --version
```

#### Linux (Ubuntu/Debian)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Install Redis
sudo apt install redis-server
sudo systemctl start redis

# Verify installations
psql --version
redis-cli --version
```

### 3. Configure Environment

```bash
cd ~/Jarvis

# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Update the following variables in `.env`:

```bash
# AI API Keys
GEMINI_API_KEY=your-actual-gemini-key-here
OPENAI_API_KEY=your-actual-openai-key-here
ANTHROPIC_API_KEY=your-actual-anthropic-key-here

# Smart AI Router Configuration
AI_ROUTER_GEMINI_PERCENTAGE=70
AI_ROUTER_GPT_MINI_PERCENTAGE=20
AI_ROUTER_CLAUDE_PERCENTAGE=10
AI_ROUTER_MONTHLY_BUDGET=50

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jarvis

# Redis
REDIS_URL=redis://localhost:6379
```

### 4. Setup Database

```bash
cd ~/ai-dawg-v0.1

# Run migrations
npx prisma migrate deploy

# Optional: Seed database
npm run seed
```

---

## Configuration

### Smart AI Routing

The router automatically distributes requests:

- **70% Gemini Flash**: Uses free tier (1,500 req/day)
- **20% GPT-4o Mini**: Low-cost fallback
- **10% Claude Sonnet 4.5**: Complex tasks only

You can adjust these percentages in `.env`:

```bash
AI_ROUTER_GEMINI_PERCENTAGE=70
AI_ROUTER_GPT_MINI_PERCENTAGE=20
AI_ROUTER_CLAUDE_PERCENTAGE=10
```

Or dynamically via API:

```bash
curl -X POST http://localhost:4000/api/v1/costs/update-strategy \
  -H "Content-Type: application/json" \
  -d '{
    "geminiPercentage": 80,
    "gptMiniPercentage": 15,
    "claudePercentage": 5
  }'
```

### Cost Monitoring

Set your monthly budget and alert threshold:

```bash
AI_ROUTER_MONTHLY_BUDGET=50
AI_ROUTER_ALERT_THRESHOLD=80  # Alert at 80% of budget
```

---

## Running Services

### Option 1: Automated Launcher (Recommended)

```bash
cd ~/Jarvis

# Start all services with auto-restart
./launch-hybrid-services.sh start

# Check status
./launch-hybrid-services.sh status

# Stop all services
./launch-hybrid-services.sh stop

# Restart all services
./launch-hybrid-services.sh restart
```

### Option 2: Manual Start

```bash
# Terminal 1: Start AI DAWG Backend
cd ~/ai-dawg-v0.1
npm run dev

# Terminal 2: Start Jarvis Control Plane
cd ~/Jarvis
npm run dev

# Terminal 3: Start Dashboard (optional)
cd ~/Jarvis/dashboard
./launch-dashboard.sh
```

### Verify Services

```bash
# Check Jarvis
curl http://localhost:4000/health

# Check AI DAWG
curl http://localhost:3001/api/v1/health

# Check cost monitoring
curl http://localhost:4000/api/v1/costs/summary
```

---

## Cost Monitoring

### Access Dashboard

Open in browser:
```
http://localhost:4000/cost-dashboard.html
```

The dashboard shows:
- Current usage and costs
- Monthly projection
- Budget progress bar
- Cost breakdown by provider
- Alerts if approaching budget

### API Endpoints

```bash
# Get current usage
GET http://localhost:4000/api/v1/costs/current

# Get monthly projection
GET http://localhost:4000/api/v1/costs/projection

# Get cost alerts
GET http://localhost:4000/api/v1/costs/alerts

# Get comprehensive summary
GET http://localhost:4000/api/v1/costs/summary
```

---

## Deployment to Vercel

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy Web UI

```bash
cd ~/Jarvis/web/jarvis-web

# Login to Vercel
vercel login

# Deploy to production
npm run deploy:vercel
```

### 3. Set Environment Variables

In Vercel dashboard, add:

```
NEXT_PUBLIC_JARVIS_API=https://your-ngrok-url.ngrok-free.app
```

### 4. Expose Local Services (ngrok)

```bash
# Install ngrok
brew install ngrok

# Authenticate
ngrok authtoken <your-auth-token>

# Expose Jarvis Control Plane
ngrok http 4000
```

Copy the ngrok URL and update Vercel environment variable.

---

## Troubleshooting

### Services Won't Start

**Check if ports are in use:**
```bash
lsof -i :4000  # Jarvis
lsof -i :3001  # AI DAWG
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
```

**Kill conflicting processes:**
```bash
kill -9 <PID>
```

### Database Connection Errors

**Check PostgreSQL status:**
```bash
brew services list | grep postgresql
```

**Restart PostgreSQL:**
```bash
brew services restart postgresql@15
```

### High Costs

**Check usage:**
```bash
curl http://localhost:4000/api/v1/costs/alerts
```

**Adjust routing strategy:**
- Increase Gemini percentage (more free tier usage)
- Decrease Claude percentage (most expensive)

### Gemini Free Tier Exhausted

The router automatically falls back to GPT-4o Mini when Gemini's free tier (1,500 req/day) is exhausted.

---

## Maintenance

### Daily Tasks

- **Check Dashboard**: Monitor costs and usage
- **Review Logs**: `tail -f ~/Jarvis/logs/hybrid/*.log`

### Weekly Tasks

- **Review Cost Trends**: Adjust routing strategy if needed
- **Check Service Health**: `./launch-hybrid-services.sh status`
- **Update Dependencies**: `npm update`

### Monthly Tasks

- **Review Total Costs**: Compare actual vs projected
- **Optimize Strategy**: Adjust percentages based on usage patterns
- **Update Software**: Pull latest changes from git

### Auto-Start on Boot (macOS)

Create a LaunchAgent:

```bash
# Create plist file
cat > ~/Library/LaunchAgents/com.jarvis.hybrid.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.jarvis.hybrid</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/YOUR_USERNAME/Jarvis/launch-hybrid-services.sh</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Load the agent
launchctl load ~/Library/LaunchAgents/com.jarvis.hybrid.plist
```

---

## Cost Optimization Tips

### 1. Maximize Free Tier Usage

- Set Gemini percentage to 80-90% for simple tasks
- Reserve Claude for complex tasks only

### 2. Cache Responses

- Enable response caching in Redis
- Avoid redundant AI calls

### 3. Optimize Prompts

- Use shorter prompts when possible
- Reduce context size

### 4. Monitor and Adjust

- Review cost dashboard weekly
- Adjust routing strategy based on actual costs

### 5. Use Batch Processing

- Batch non-urgent requests
- Process during off-peak hours

---

## FAQ

**Q: Can I run this on a Raspberry Pi?**
A: Yes! A Raspberry Pi 4 with 4GB+ RAM works great for light-moderate usage.

**Q: What if I exceed my monthly budget?**
A: The system will alert you at 80% of budget. You can:
- Increase Gemini percentage
- Reduce overall API usage
- Increase budget limit

**Q: Do I need all three AI providers?**
A: For best cost optimization, yes. But you can start with Gemini only and add others later.

**Q: How do I backup my data?**
A: Use the provided backup scripts:
```bash
./scripts/backup-database.sh
```

**Q: Can I switch to full cloud later?**
A: Yes! The system is designed to migrate easily. See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---

## Support

- **Documentation**: `/docs` folder
- **Issues**: File issues on GitHub
- **Logs**: `~/Jarvis/logs/hybrid/`
- **Health Check**: `http://localhost:4000/health`

---

## Next Steps

1. ✅ Services running locally
2. ✅ Cost monitoring active
3. ✅ Vercel deployment complete
4. ⏭️ Configure Claude MCP for desktop integration
5. ⏭️ Set up ChatGPT webhook integration
6. ⏭️ Configure alerts and notifications

---

**Congratulations! Your Enhanced Hybrid deployment is ready! 🎉**

**Projected Monthly Cost:** $35-50
**Savings vs Full Cloud:** ~$165/month (73% reduction)
**Production-Ready:** ✅
**Cost-Optimized:** ✅
