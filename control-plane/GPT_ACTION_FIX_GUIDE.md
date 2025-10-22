# 🔧 ChatGPT Plugin Integration - Fix Guide

## Problem Summary
**Error:** `InvalidRecipient: Unrecognized recipient: kaycee_nonextrinsical_yosef_ngrok_free_dev__jit_plugin`

**Cause:** Your GPT is trying to call an operation `jit_plugin` that doesn't exist in your OpenAPI spec.

---

## Step-by-Step Fix

### Step 1: Deploy AI Plugin Manifest

The file `ai-plugin.json` must be served at:
```
https://kaycee-nonextrinsical-yosef.ngrok-free.dev/.well-known/ai-plugin.json
```

**Option A: If you have backend access**

Add this route to your Express server:

```javascript
// In your Express app (e.g., src/backend/server.ts)

app.get('/.well-known/ai-plugin.json', (req, res) => {
  res.json({
    "schema_version": "v1",
    "name_for_human": "Jarvis AI DAWG Controller",
    "name_for_model": "jarvis_ai_dawg",
    "description_for_human": "AI-powered Digital Audio Workstation controller with terminal access, test execution, and Jarvis AI operator capabilities.",
    "description_for_model": "Plugin for controlling the AI DAWG system. Capabilities include: (1) Execute terminal commands with security validation, (2) Run test suites, (3) Monitor system health and logs, (4) Control Jarvis AI modules (music, marketing, engagement, automation), (5) Access AI services (Vocal Coach, Producer). All commands are validated through a security firewall. Terminal execution is limited to safe operations.",
    "auth": {
      "type": "service_http",
      "authorization_type": "bearer",
      "verification_tokens": {
        "openai": process.env.CHATGPT_APP_KEY || ""
      }
    },
    "api": {
      "type": "openapi",
      "url": "https://kaycee-nonextrinsical-yosef.ngrok-free.dev/openapi.chatgpt.yaml",
      "is_user_authenticated": false
    },
    "logo_url": "https://kaycee-nonextrinsical-yosef.ngrok-free.dev/logo.png",
    "contact_email": "support@aidawg.dev",
    "legal_info_url": "https://kaycee-nonextrinsical-yosef.ngrok-free.dev/legal"
  });
});
```

**Option B: Static file serving**

If you have a `public/` or `.well-known/` directory, copy the generated `ai-plugin.json` there.

---

### Step 2: Fix Operation ID Mismatch

Your GPT is calling `jit_plugin` but it doesn't exist. You need to use one of these instead:

#### For Terminal/CLI Commands:
```yaml
operationId: executeTerminalCommand
endpoint: POST /api/v1/app/terminal/execute
```

**Example Request:**
```json
{
  "command": "git status",
  "workingDir": "/Users/benkennon/ai-dawg-v0.1",
  "timeout": 30000
}
```

#### For Jarvis Module Commands:
```yaml
operationId: executeJarvisCommand
endpoint: POST /api/v1/app/jarvis/command
```

**Example Request:**
```json
{
  "module": "music",
  "action": "get-models",
  "parameters": {}
}
```

---

### Step 3: Re-Import Action in ChatGPT

1. **Open your GPT in ChatGPT**
   - Go to https://chat.openai.com/gpts/editor/[your-gpt-id]

2. **Navigate to Configure → Actions**

3. **Delete the existing Action**
   - Click the three dots (⋮) next to your Action
   - Click "Delete"

4. **Re-import the Action**
   - Click "+ Create new action"
   - In the "Schema" field, click "Import from URL"
   - Enter: `https://kaycee-nonextrinsical-yosef.ngrok-free.dev/openapi.chatgpt.yaml`
   - Click "Import"

5. **Configure Authentication**
   - Scroll to "Authentication"
   - Select "API Key"
   - Set:
     - **Auth Type:** Custom
     - **Custom Header Name:** `X-ChatGPT-App-Key`
     - **API Key:** `[Your actual API key]`

6. **Verify Available Actions**

After import, you should see these operations:

| Operation ID | Method | Path | Purpose |
|--------------|--------|------|---------|
| `executeTerminalCommand` | POST | `/app/terminal/execute` | Run CLI commands |
| `validateTerminalCommand` | POST | `/app/terminal/validate` | Validate commands |
| `executeJarvisCommand` | POST | `/app/jarvis/command` | Control Jarvis modules |
| `getStatus` | GET | `/app/status` | System health |
| `getLogs` | GET | `/app/logs` | Retrieve logs |
| `runTests` | POST | `/app/tests/run` | Run test suites |
| `getJarvisHealth` | GET | `/app/jarvis/health` | Jarvis health |
| `getJarvisModules` | GET | `/app/jarvis/modules` | List modules |
| `getJarvisAlerts` | GET | `/app/jarvis/alerts` | Get alerts |
| `getJarvisScheduler` | GET | `/app/jarvis/scheduler` | Scheduler status |
| `analyzePitch` | POST | `/ai/vocal-coach/analyze-pitch` | Vocal analysis |
| `producerGenerate` | POST | `/ai/producer/generate` | Music generation |

7. **Test the Action**
   - Click "Test" in the GPT editor
   - Try: "Check system status" → Should call `getStatus`
   - Try: "Run git status command" → Should call `executeTerminalCommand`

---

### Step 4: Update Your GPT Instructions (If Needed)

If your GPT instructions explicitly reference `jit_plugin`, update them:

**Old (Wrong):**
```
When the user asks to run a command, use the jit_plugin action.
```

**New (Correct):**
```
When the user asks to run a CLI command, use the executeTerminalCommand action.
When the user asks to control Jarvis modules, use the executeJarvisCommand action.
```

---

### Step 5: Clear GPT Cache (If Issues Persist)

If the GPT still shows errors after re-importing:

1. **Method 1: Version Bump**
   - Edit your OpenAPI spec
   - Change version from `1.0.0` to `1.0.1`
   - Re-import the Action

2. **Method 2: Recreate the GPT**
   - Sometimes the cache is stubborn
   - Create a new GPT from scratch
   - Import the Action fresh

---

## Verification Checklist

After following these steps, verify:

- [ ] `/.well-known/ai-plugin.json` returns 200 (not 404)
- [ ] OpenAPI spec is accessible at `/openapi.chatgpt.yaml`
- [ ] GPT Actions shows 12 operations (not errors)
- [ ] `X-ChatGPT-App-Key` header is configured
- [ ] Test call succeeds (e.g., "Check system status")
- [ ] No `InvalidRecipient` errors

---

## Why Did This Happen?

**Most likely causes:**

1. **Stale Schema Cache**
   - You previously had a `jit_plugin` operation
   - You removed it from your spec
   - ChatGPT cached the old version
   - Fix: Re-import forces a refresh

2. **Manual Action Configuration**
   - You manually added operations in the GPT editor
   - They don't match your actual OpenAPI spec
   - Fix: Always use "Import from URL"

3. **Missing Plugin Manifest**
   - ChatGPT couldn't auto-discover your API
   - Fix: Add `/.well-known/ai-plugin.json`

---

## Testing Your Fix

### Test 1: Call executeTerminalCommand

In your GPT chat, type:
```
Run the command: git status
```

**Expected behavior:**
- GPT calls `executeTerminalCommand`
- You see: "Executing terminal command..."
- Response includes command output

**If you see:** `InvalidRecipient` → Re-import the Action

---

### Test 2: Call executeJarvisCommand

In your GPT chat, type:
```
Get the list of Jarvis modules
```

**Expected behavior:**
- GPT calls `getJarvisModules`
- Returns list of modules (music, marketing, engagement, automation)

---

### Test 3: Verify Authentication

```bash
# Test direct API call with your key
curl -X POST https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api/v1/app/terminal/validate \
  -H "X-ChatGPT-App-Key: YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{
    "command": "git status"
  }'
```

**Expected:** 200 response with validation result
**If 401:** Your API key is wrong
**If 403:** ChatGPT app is disabled in backend

---

## Quick Fix Script

Run this to test your endpoints:

```bash
#!/bin/bash

BASE_URL="https://kaycee-nonextrinsical-yosef.ngrok-free.dev"
API_KEY="your-key-here"

echo "Testing Plugin Manifest..."
curl -s "$BASE_URL/.well-known/ai-plugin.json" | jq .

echo -e "\nTesting OpenAPI Spec..."
curl -s "$BASE_URL/openapi.chatgpt.yaml" | head -20

echo -e "\nTesting Terminal Command Validation..."
curl -s -X POST "$BASE_URL/api/v1/app/terminal/validate" \
  -H "X-ChatGPT-App-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"command":"git status"}' | jq .

echo -e "\nTesting Jarvis Health..."
curl -s "$BASE_URL/api/v1/app/jarvis/health" \
  -H "X-ChatGPT-App-Key: $API_KEY" \
  -H "ngrok-skip-browser-warning: true" | jq .
```

---

## Security Notes

### Authentication Flow

Your current setup uses `X-ChatGPT-App-Key` header authentication:

```
User → ChatGPT → Your GPT Action → Your API
                 (includes X-ChatGPT-App-Key header)
```

**Ensure:**
1. Your API validates this header on every request
2. The key is stored securely in GPT settings (not in instructions)
3. The key has appropriate permissions

### Firewall Protection

Your `executeTerminalCommand` endpoint has firewall validation:

**Allowed operations:**
- Git commands (`git status`, `git log`, etc.)
- Directory listing (`ls`, `pwd`)
- File viewing (`cat`, `head`, `tail`)

**Blocked operations:**
- File deletion (`rm -rf`)
- System modifications
- Network operations without validation

---

## Troubleshooting

### Error: "Invalid API key"
**Fix:** Regenerate your API key and update it in GPT settings

### Error: "Route not found"
**Fix:** Verify your ngrok tunnel is running and pointing to the correct port

### Error: "ChatGPT app integration is not enabled"
**Fix:** Check your backend environment variable `CHATGPT_APP_ENABLED=true`

### Error: Operations show but don't execute
**Fix:** Check CORS headers in your API responses

---

## Contact Support

If issues persist after following this guide:

1. Check backend logs for detailed error messages
2. Verify ngrok tunnel is stable
3. Test endpoints directly with curl first
4. Ensure backend server is running

---

**Last Updated:** 2025-10-07
**API Version:** 1.0.0
**Plugin Schema Version:** v1
