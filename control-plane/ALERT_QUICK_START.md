# 📱 Jarvis Alert System - Quick Start

Get iPhone and macOS alerts for Jarvis/AI DAWG downtime in **5 minutes**.

## Option A: Pushover (Recommended - $4.99 one-time)

### 1. Install & Setup (2 minutes)
```bash
# Install Pushover app on iPhone from App Store
# Cost: $4.99 one-time (most reliable option)

# Sign up at https://pushover.net/
# Get your User Key from dashboard
# Create app → Name: "Jarvis" → Get API Token
```

### 2. Configure (1 minute)
Edit `.env`:
```bash
PUSHOVER_USER_KEY=your-user-key-here
PUSHOVER_API_TOKEN=your-app-token-here
```

### 3. Test (30 seconds)
```bash
npm run test:alerts
```

Check your iPhone - you should see 3 test alerts!

---

## Option B: Ntfy (Free & Open Source)

### 1. Install & Setup (2 minutes)
```bash
# Install Ntfy app on iPhone from App Store
# Completely FREE

# Pick a unique topic (hard to guess):
# Example: jarvis-alerts-x7k9m2p5
```

### 2. Subscribe in App (30 seconds)
- Open Ntfy app
- Tap "+"
- Enter your topic name
- Subscribe

### 3. Configure (1 minute)
Edit `.env`:
```bash
NTFY_TOPIC=jarvis-alerts-x7k9m2p5
NTFY_SERVER=https://ntfy.sh
```

### 4. Test (30 seconds)
```bash
npm run test:alerts
```

Check your iPhone - you should see 3 test alerts!

---

## ✅ That's It!

You'll now receive alerts when:
- **Services go down** (critical)
- **Auto-restarts occur** (warning)
- **Services recover** (info)

### Verify It's Working

1. **Stop a service to test**:
   ```bash
   docker stop ai-dawg-backend
   ```

2. **Within 30 seconds**, you should get:
   - 📱 iPhone alert
   - 💻 macOS notification
   - 📊 Dashboard alert

3. **Start it back**:
   ```bash
   docker start ai-dawg-backend
   ```

### What Gets Monitored?

- ✅ AI DAWG Backend (port 3001)
- ✅ Jarvis Control Plane (port 4000)
- ✅ Vocal Coach Service
- ✅ Producer Service
- ✅ AI Brain Service
- ✅ PostgreSQL Database
- ✅ Redis Cache

### Alert Examples

**Critical Alert (🚨):**
```
Jarvis: postgres
Database connection failed after 3 restart attempts
Action: Manual intervention required
```

**Warning Alert (⚠️):**
```
Jarvis: ai-dawg-backend
Service unhealthy - attempting restart
Action: Auto-restarting (attempt 1/3)
```

**Info Alert (ℹ️):**
```
Jarvis: vocal-coach
Service restarted successfully
Action: Monitoring recovery
```

---

## 🔧 Advanced Setup (Optional)

### Add Slack Notifications
```bash
# Get webhook from https://api.slack.com/messaging/webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Add ChatGPT Integration
```bash
# Requires ngrok or public endpoint
CHATGPT_WEBHOOK_URL=https://your-endpoint.com/api/chatgpt/alerts
```

---

## 📊 Check Alert Stats

```bash
# View recent alerts
curl http://localhost:4000/api/v1/business/alerts

# View alert stats
curl http://localhost:4000/api/v1/business/metrics
```

---

## 🆘 Troubleshooting

### iPhone not receiving alerts?

**Pushover:**
```bash
curl -s \
  --form-string "token=YOUR_API_TOKEN" \
  --form-string "user=YOUR_USER_KEY" \
  --form-string "message=Test" \
  https://api.pushover.net/1/messages.json
```

**Ntfy:**
```bash
curl -d "Test" https://ntfy.sh/your-topic
```

### macOS notifications not showing?

Check: System Settings → Notifications → Make sure Node/Script Editor is allowed

---

## 🎯 Next Steps

1. ✅ Set up iPhone alerts (you just did this!)
2. 📊 Check the dashboard at http://localhost:5001
3. 📖 Read full setup guide: `ALERT_SYSTEM_SETUP.md`
4. 🔔 Customize alert thresholds in `.env`

---

**You're all set!** Jarvis will now alert you 24/7 about any issues. 🎉
