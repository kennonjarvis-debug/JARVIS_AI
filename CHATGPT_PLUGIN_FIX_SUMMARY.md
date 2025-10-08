# 🔧 ChatGPT Plugin Fix - Executive Summary

**Error:** `InvalidRecipient: Unrecognized recipient: kaycee_nonextrinsical_yosef_ngrok_free_dev__jit_plugin`

**Root Cause:** Your GPT is trying to call an operation `jit_plugin` that **doesn't exist** in your OpenAPI spec.

---

## 🚨 What the Diagnostic Found

| Test | Status | Issue |
|------|--------|-------|
| AI Plugin Manifest | ❌ 404 | Missing `/.well-known/ai-plugin.json` |
| OpenAPI Spec | ✅ 200 | Accessible |
| `jit_plugin` operation | ❌ Not Found | **This is the main problem** |
| Available operations | ✅ 12 found | All working |
| Authentication | ✅ Working | 401 required correctly |

---

## ✅ Available Operations (Use These Instead)

Your spec has these operations - **NOT `jit_plugin`:**

1. `executeTerminalCommand` ← **Use this for CLI commands**
2. `executeJarvisCommand` ← **Use this for Jarvis modules**
3. `getStatus`
4. `getLogs`
5. `runTests`
6. `validateTerminalCommand`
7. `analyzePitch`
8. `producerGenerate`
9. `getJarvisHealth`
10. `getJarvisModules`
11. `getJarvisAlerts`
12. `getJarvisScheduler`

---

## 🔥 Immediate Fix (2 Minutes)

### Step 1: Re-import Action in ChatGPT

1. Go to your GPT settings: https://chat.openai.com/gpts/editor/[your-gpt-id]
2. Click **Configure → Actions**
3. **Delete** the existing broken Action
4. Click **"+ Create new action"**
5. Click **"Import from URL"**
6. Enter: `https://kaycee-nonextrinsical-yosef.ngrok-free.dev/openapi.chatgpt.yaml`
7. Click **Import**

### Step 2: Configure Authentication

In the Action settings:

- **Authentication Type:** API Key
- **Auth Type:** Custom
- **Header Name:** `X-ChatGPT-App-Key`
- **API Key:** `[Your actual key]`

### Step 3: Update GPT Instructions (If Needed)

Change any references from:
```
Use the jit_plugin action
```

To:
```
Use the executeTerminalCommand action for CLI commands
Use the executeJarvisCommand action for Jarvis modules
```

### Step 4: Test

In your GPT, type:
```
Check system status
```

Should call `getStatus` and return system health.

---

## 🎯 What Each Operation Does

### `executeTerminalCommand` (POST /api/v1/app/terminal/execute)

**Use for:** Running CLI commands (git, ls, npm, etc.)

**Example:**
```json
{
  "command": "git status",
  "workingDir": "/Users/benkennon/ai-dawg-v0.1",
  "timeout": 30000
}
```

---

### `executeJarvisCommand` (POST /api/v1/app/jarvis/command)

**Use for:** Controlling Jarvis AI modules

**Example:**
```json
{
  "module": "music",
  "action": "get-models",
  "parameters": {}
}
```

**Available Modules:**
- `music` - Music generation and models
- `marketing` - Marketing automation
- `engagement` - User engagement
- `automation` - Workflow automation

---

## 📝 Optional: Add Missing AI Plugin Manifest

To enable better plugin discovery, add this endpoint to your backend:

```javascript
// In your Express server
app.get('/.well-known/ai-plugin.json', (req, res) => {
  res.json({
    "schema_version": "v1",
    "name_for_human": "Jarvis AI DAWG Controller",
    "name_for_model": "jarvis_ai_dawg",
    "description_for_human": "AI-powered Digital Audio Workstation controller with terminal access, test execution, and Jarvis AI operator capabilities.",
    "description_for_model": "Plugin for controlling the AI DAWG system. Execute terminal commands, run tests, monitor health, control Jarvis modules.",
    "auth": {
      "type": "service_http",
      "authorization_type": "bearer"
    },
    "api": {
      "type": "openapi",
      "url": "https://kaycee-nonextrinsical-yosef.ngrok-free.dev/openapi.chatgpt.yaml"
    },
    "logo_url": "https://kaycee-nonextrinsical-yosef.ngrok-free.dev/logo.png",
    "contact_email": "support@aidawg.dev",
    "legal_info_url": "https://kaycee-nonextrinsical-yosef.ngrok-free.dev/legal"
  });
});
```

This is **optional** but recommended for better ChatGPT integration.

---

## 🧪 Verify the Fix

### Test 1: System Status
```
GPT Prompt: "Check system status"
Should call: getStatus
```

### Test 2: Terminal Command
```
GPT Prompt: "Run git status in the ai-dawg directory"
Should call: executeTerminalCommand
```

### Test 3: Jarvis Health
```
GPT Prompt: "What's the Jarvis system health?"
Should call: getJarvisHealth
```

If all three work → **You're fixed!** ✅

---

## 🔍 Why Did This Happen?

Most likely scenarios:

1. **Stale Cache**
   - You previously had a `jit_plugin` operation
   - You removed it from your OpenAPI spec
   - ChatGPT cached the old schema
   - **Fix:** Re-import forces refresh

2. **Manual Configuration**
   - You manually added operations in GPT editor
   - They don't match your actual spec
   - **Fix:** Always use "Import from URL"

3. **Old Action Reference**
   - Your GPT instructions reference `jit_plugin`
   - But it was never in your spec
   - **Fix:** Update instructions to use correct operations

---

## 📚 Full Documentation

For detailed information, see:

- **GPT_ACTION_FIX_GUIDE.md** - Complete step-by-step guide
- **OPERATION_ID_MAPPING.md** - All operation mappings
- **ai-plugin.json** - Plugin manifest template
- **scripts/test-chatgpt-plugin.sh** - Diagnostic script

---

## 🆘 Still Having Issues?

### Run the Diagnostic Again

```bash
bash /Users/benkennon/Jarvis/scripts/test-chatgpt-plugin.sh
```

### Check Backend Logs

Look for errors related to:
- API key validation
- CORS headers
- Route registration

### Test Direct API Call

```bash
curl -X POST https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api/v1/app/terminal/validate \
  -H "X-ChatGPT-App-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"command":"git status"}'
```

Should return 200 with validation result.

---

## ✅ Checklist

Before marking this as fixed:

- [ ] Re-imported Action in GPT (deleted old, imported fresh)
- [ ] Configured `X-ChatGPT-App-Key` authentication
- [ ] Updated GPT instructions (removed `jit_plugin` references)
- [ ] Tested "Check system status" → Works
- [ ] Tested "Run git status" → Works
- [ ] No more `InvalidRecipient` errors

---

**Created:** 2025-10-07
**Last Tested:** 2025-10-07 18:15 MST
**Status:** Diagnostic complete, fix instructions provided
