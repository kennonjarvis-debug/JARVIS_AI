# 🤖 JARVIS AI - AI Agent Quick Reference

**For**: Claude Code, ChatGPT Custom GPTs, AI Assistants
**Last Updated**: October 23, 2025

---

## 🎯 What is JARVIS AI?

Autonomous business automation platform with three interconnected systems that manage businesses via OAuth integrations, browser automation, and system commands.

**Primary Client**: DAWG AI (AI-powered music production DAW)

---

## 🏗️ Three-System Architecture

### 1. SaaS Platform (User Interface)
- **Location**: `~/Projects/JarvisAI/backend/`
- **Frontend**: http://localhost:5173 (Svelte + Vite)
- **Backend**: http://localhost:3001 (Express + TypeScript)
- **Database**: Supabase (https://nzmzmsmxbiptilzgdmgt.supabase.co)
- **Status**: ✅ Running locally
- **Purpose**: Business owners connect OAuth accounts, JARVIS manages autonomously

### 2. Bridge API (System Commands)
- **Location**: `/Users/benkennon/JARVIS_AI/packages/bridge-api/`
- **Prod URL**: https://jarvis-bridge-api-production.up.railway.app
- **Status**: ✅ Deployed to Railway
- **Purpose**: Secure command execution (git, npm, ls, cat, pwd)
- **Auth**: `Bearer test-token`

### 3. Control Plane (Browser Automation)
- **Location**: `/Users/benkennon/JARVIS_AI/control-plane/`
- **Port**: 5001
- **Status**: ⏳ Ready for Railway deployment
- **Purpose**: ChatGPT integration + Playwright automation
- **Features**: Screenshots, console logs, network monitoring

---

## 🔌 Active Integrations (SaaS)

✅ Twitter | ✅ Gmail | ✅ Google Calendar | ✅ Salesforce | ✅ HubSpot
✅ iMessage | ✅ Notes | ✅ Voice Memos

---

## 📡 API Endpoints Reference

### SaaS Backend (Port 3001)
```
GET  /health                    - Health check
GET  /api/version               - Version info
POST /api/auth/*                - Authentication
GET  /api/integrations/*        - Integration management
POST /api/businesses/*          - Business operations
GET  /api/social-listening/*    - Social monitoring
```

### Bridge API (Railway)
```
GET  /health                    - Health check (no auth)
POST /run                       - Execute command
POST /read                      - Read file
POST /write                     - Write file
```

### Control Plane (Port 5001)
```
GET  /health                    - Health check
POST /api/v1/execute            - Module router
POST /api/v1/browser/automate   - Direct browser automation
```

---

## 🔐 Authentication

**SaaS**: Google OAuth via Supabase
- Super Admin: kennonjarvis@gmail.com

**Bridge API & Control Plane**: Bearer token
```bash
Authorization: Bearer test-token
```

---

## 🚀 Quick Commands

### Start SaaS Platform
```bash
cd ~/Projects/JarvisAI/backend && npm run dev
```

### Start Control Plane
```bash
cd /Users/benkennon/JARVIS_AI/control-plane && npm run dev
```

### Start Bridge API
```bash
cd /Users/benkennon/JARVIS_AI/packages/bridge-api && pnpm dev
```

### Test Endpoints
```bash
# SaaS health
curl http://localhost:3001/health

# Bridge API (production)
curl -H "Authorization: Bearer test-token" \
  https://jarvis-bridge-api-production.up.railway.app/health

# Control Plane
curl -H "Authorization: Bearer test-token" \
  http://localhost:5001/health
```

---

## 🎯 Common Tasks for AI Agents

### Check DAWG AI Health
```json
POST https://jarvis-bridge-api-production.up.railway.app/run
Authorization: Bearer test-token

{
  "command": "ls",
  "args": ["-la", "/Users/benkennon/DAWG_AI"]
}
```

### Inspect Website for Errors
```json
POST http://localhost:5001/api/v1/execute
Authorization: Bearer test-token

{
  "module": "browser",
  "action": "inspect",
  "params": {
    "url": "https://dawg-ai.com",
    "captureConsole": true,
    "monitorNetwork": true
  }
}
```

### Read Project File
```json
POST https://jarvis-bridge-api-production.up.railway.app/read
Authorization: Bearer test-token

{
  "path": "/Users/benkennon/DAWG_AI/package.json"
}
```

---

## 🛠️ Troubleshooting

**Port Conflicts**: Bridge API and Control Plane both use 5001
- Run only one at a time locally
- Use Railway URL for Bridge API in production

**Authentication Errors**: Verify Bearer token is exactly `test-token`

**Command Not Whitelisted**: Bridge API only allows: git, npm, pnpm, ls, cat, pwd

**Path Restrictions**: Can only access:
- `/Users/benkennon/JARVIS_AI`
- `/Users/benkennon/DAWG_AI`
- `/tmp`

---

## 📊 Current Status

| Component | Status | URL |
|-----------|--------|-----|
| SaaS Frontend | ✅ Running | http://localhost:5173 |
| SaaS Backend | ✅ Running | http://localhost:3001 |
| Bridge API | ✅ Deployed | https://jarvis-bridge-api-production.up.railway.app |
| Control Plane | ⏳ Ready | Pending deployment |
| ChatGPT GPT | ⏳ Ready | Pending Control Plane deploy |

---

## 🎯 Next Actions

1. **Deploy Control Plane** to Railway
2. **Import ChatGPT schema** from `chatgpt-custom-action-schema.json`
3. **Test full workflow**: ChatGPT → Control Plane → Bridge API → System

---

## 📝 Key Files

- `/Users/benkennon/JARVIS_AI/MASTER_CONTEXT.md` - Complete documentation
- `/Users/benkennon/JARVIS_AI/chatgpt-custom-action-schema.json` - OpenAPI schema
- `/Users/benkennon/JARVIS_AI/.env` - Local configuration
- `~/Projects/JarvisAI/backend/packages/backend/.env` - SaaS backend config

---

## 💡 Example ChatGPT Prompts (After Deployment)

> "Check if DAWG AI backend is running"

> "Take a screenshot of https://dawg-ai.com"

> "Look for JavaScript errors on the DAWG AI website"

> "Show me the latest git commits in DAWG AI"

> "Monitor network requests on example.com and report any failures"

---

**Quick Reference for AI Agents - Optimized for fast context loading**
