# Jarvis Alert System Setup Guide

This guide will help you set up comprehensive alerting for Jarvis and AI DAWG components. You'll receive alerts on your iPhone and macOS whenever services go down or encounter issues.

## 📱 Alert Channels

The alert system supports multiple channels:
1. **iPhone Push Notifications** (via Pushover or Ntfy)
2. **macOS Native Notifications**
3. **Dashboard Real-time WebSocket**
4. **Slack**
5. **ChatGPT Custom Actions**

## 🚀 Quick Start

### Option 1: Pushover (Recommended - Simple & Reliable)

**Best for: Quick setup, most reliable**

1. **Install Pushover on iPhone**
   - Download from App Store: https://apps.apple.com/us/app/pushover-notifications/id506088175
   - One-time purchase: $4.99 (worth it for reliability)

2. **Create Pushover Account**
   - Go to https://pushover.net/
   - Sign up and log in
   - Copy your **User Key** from the dashboard

3. **Create Application**
   - Click "Create an Application/API Token"
   - Name: "Jarvis Alerts"
   - Click "Create Application"
   - Copy your **API Token**

4. **Update .env file**
   ```bash
   PUSHOVER_USER_KEY=your-user-key-from-step-2
   PUSHOVER_API_TOKEN=your-api-token-from-step-3
   ```

5. **Test it**
   ```bash
   npm run test:alerts
   ```

### Option 2: Ntfy (Free & Open Source)

**Best for: Free solution, privacy-focused**

1. **Install Ntfy on iPhone**
   - Download from App Store: https://apps.apple.com/app/ntfy/id1625396347
   - Completely free and open source

2. **Choose a Unique Topic**
   - Pick a random, hard-to-guess topic name
   - Example: `jarvis-alerts-x7h9k2m5`
   - Important: Must be unique to prevent others from seeing your alerts

3. **Subscribe in App**
   - Open Ntfy app
   - Tap "+"
   - Enter your topic name
   - Subscribe

4. **Update .env file**
   ```bash
   NTFY_TOPIC=jarvis-alerts-x7h9k2m5
   NTFY_SERVER=https://ntfy.sh
   ```

5. **Test it**
   ```bash
   npm run test:alerts
   ```

## 💻 macOS Notifications

macOS notifications are enabled by default. No setup required!

To disable:
```bash
MACOS_NOTIFICATIONS_ENABLED=false
```

## 📊 Dashboard WebSocket Alerts

Enabled automatically. Real-time alerts appear in the dashboard at http://localhost:5001

## 💬 Slack Integration (Optional)

1. **Create Incoming Webhook**
   - Go to https://api.slack.com/messaging/webhooks
   - Click "Create your Slack app"
   - Choose workspace
   - Enable "Incoming Webhooks"
   - Click "Add New Webhook to Workspace"
   - Select channel (create #jarvis-alerts)
   - Copy webhook URL

2. **Update .env file**
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

## 🤖 ChatGPT Integration (Optional)

You can receive alerts in ChatGPT via Custom GPTs or Actions.

### Setup ChatGPT Custom Action

1. **Create or Edit a Custom GPT**
   - Go to https://chat.openai.com/gpts/editor
   - Click "Configure" → "Actions" → "Create new action"

2. **Add Schema**
   ```json
   {
     "openapi": "3.1.0",
     "info": {
       "title": "Jarvis Alerts",
       "version": "1.0.0"
     },
     "servers": [
       {
         "url": "YOUR_NGROK_OR_PUBLIC_URL"
       }
     ],
     "paths": {
       "/alerts": {
         "post": {
           "operationId": "receiveAlert",
           "summary": "Receive system alerts from Jarvis",
           "requestBody": {
             "required": true,
             "content": {
               "application/json": {
                 "schema": {
                   "type": "object",
                   "properties": {
                     "type": {"type": "string"},
                     "alert": {
                       "type": "object",
                       "properties": {
                         "service": {"type": "string"},
                         "severity": {"type": "string"},
                         "message": {"type": "string"},
                         "action": {"type": "string"},
                         "timestamp": {"type": "string"}
                       }
                     }
                   }
                 }
               }
             }
           },
           "responses": {
             "200": {
               "description": "Alert received"
             }
           }
         }
       }
     }
   }
   ```

3. **Expose Webhook Endpoint**

   If testing locally:
   ```bash
   # Install ngrok
   brew install ngrok

   # Start ngrok tunnel
   ngrok http 5001
   ```

   Copy the https URL (e.g., `https://abc123.ngrok.io`)

4. **Update .env file**
   ```bash
   CHATGPT_WEBHOOK_URL=https://your-url.ngrok.io/api/chatgpt/alerts
   ```

## 🧪 Testing Your Setup

### Test All Channels
```bash
npm run test:alerts
```

### Test Specific Channel
```bash
# Test iPhone push (Pushover)
npm run test:alerts:pushover

# Test iPhone push (Ntfy)
npm run test:alerts:ntfy

# Test macOS notifications
npm run test:alerts:macos

# Test Slack
npm run test:alerts:slack
```

### Simulate Service Down Alert
```bash
npm run test:alerts:critical
```

## 📋 What Gets Alerted?

The system monitors and alerts for:

### Critical Alerts (🚨 Urgent)
- Service completely down after max restart attempts
- Database connection failures
- Redis connection failures
- Critical API errors

### Warning Alerts (⚠️ Important)
- Service unhealthy (auto-restart triggered)
- High error rates
- Degraded performance
- Resource limits approaching

### Info Alerts (ℹ️ FYI)
- Service restarted successfully
- Health check recovery
- Configuration changes

## 🎯 Alert Frequency

- **Health Checks**: Every 30 seconds
- **Critical Alerts**: Immediate (all channels)
- **Warning Alerts**: Immediate (iPhone, macOS, Dashboard, Slack)
- **Info Alerts**: Immediate (Dashboard, Slack only)

## 🔕 Managing Alert Fatigue

### Disable Specific Channels Temporarily
```typescript
// In your code or via API
alertDispatcher.setChannelEnabled('pushover', false);
alertDispatcher.setChannelEnabled('macos', false);
```

### Adjust Alert Thresholds
Edit `.env`:
```bash
# Increase before alerting
MAX_RESTART_ATTEMPTS=5

# Increase check interval (less frequent)
HEALTH_CHECK_INTERVAL=60
```

## 📱 Recommended iPhone Setup

### For Pushover:
1. **Notification Settings**
   - Open iPhone Settings → Pushover
   - Enable "Allow Notifications"
   - Set "Alert Style" to "Banners" or "Alerts"
   - Enable "Sounds"
   - Enable "Badges"

2. **Priority Sounds** (in Pushover app)
   - Critical: Siren
   - Warning: Pushover Default
   - Info: None

### For Ntfy:
1. **Notification Settings**
   - Open iPhone Settings → Ntfy
   - Enable "Allow Notifications"
   - Set "Alert Style" to "Banners"
   - Enable "Sounds"

2. **Topic Settings** (in Ntfy app)
   - Tap your topic → Settings
   - Enable "Min Priority" = Default
   - This filters out low-priority notifications

## 🆘 Troubleshooting

### iPhone Not Receiving Alerts

**Pushover:**
```bash
# Test with curl
curl -s \
  --form-string "token=YOUR_API_TOKEN" \
  --form-string "user=YOUR_USER_KEY" \
  --form-string "message=Test from Jarvis" \
  https://api.pushover.net/1/messages.json
```

**Ntfy:**
```bash
# Test with curl
curl -d "Test from Jarvis" https://ntfy.sh/your-topic
```

### macOS Notifications Not Showing

1. Check System Settings → Notifications → Script Editor (or Node)
2. Ensure "Allow Notifications" is enabled
3. Check "Do Not Disturb" is off

### Check Alert Dispatcher Status

```bash
curl http://localhost:4000/api/v1/alerts/status
```

### View Recent Alerts

```bash
curl http://localhost:4000/api/v1/alerts?limit=10
```

## 🔐 Security Best Practices

1. **Keep credentials secret**
   - Never commit `.env` file
   - Use `.env.example` as template

2. **Use unique Ntfy topics**
   - Don't use common words
   - Use random strings

3. **Rotate tokens periodically**
   - Update Pushover API tokens every 6 months
   - Update Slack webhooks if compromised

4. **Limit webhook exposure**
   - Use authentication for ChatGPT webhooks
   - Rate limit webhook endpoints

## 📞 Support

If you encounter issues:
1. Check logs: `docker-compose logs -f jarvis-control-plane`
2. Verify .env configuration
3. Test with curl commands above
4. Check the alert dispatcher status endpoint

## 🎉 Success!

Once configured, you'll receive alerts whenever:
- Services go down
- Auto-restarts occur
- Critical errors happen
- System health degrades

You can now confidently monitor Jarvis 24/7 from your iPhone!
