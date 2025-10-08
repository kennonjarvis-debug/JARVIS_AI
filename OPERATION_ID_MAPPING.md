# ChatGPT Action Operation ID Reference

## What ChatGPT Sees

When you import your OpenAPI spec into a GPT Action, ChatGPT creates namespaced operation IDs:

```
{domain_with_underscores}__{operationId}
```

For your domain `kaycee-nonextrinsical-yosef.ngrok-free.dev`, this becomes:

```
kaycee_nonextrinsical_yosef_ngrok_free_dev__{operationId}
```

---

## Available Operations

| What You Call | Actual Operation ID | ChatGPT Sees As |
|---------------|---------------------|-----------------|
| Get system status | `getStatus` | `kaycee_nonextrinsical_yosef_ngrok_free_dev__getStatus` |
| Get logs | `getLogs` | `kaycee_nonextrinsical_yosef_ngrok_free_dev__getLogs` |
| Run tests | `runTests` | `kaycee_nonextrinsical_yosef_ngrok_free_dev__runTests` |
| **Execute terminal command** | `executeTerminalCommand` | `kaycee_nonextrinsical_yosef_ngrok_free_dev__executeTerminalCommand` |
| Validate command | `validateTerminalCommand` | `kaycee_nonextrinsical_yosef_ngrok_free_dev__validateTerminalCommand` |
| Analyze pitch | `analyzePitch` | `kaycee_nonextrinsical_yosef_ngrok_free_dev__analyzePitch` |
| Producer generate | `producerGenerate` | `kaycee_nonextrinsical_yosef_ngrok_free_dev__producerGenerate` |
| Get Jarvis health | `getJarvisHealth` | `kaycee_nonextrinsical_yosef_ngrok_free_dev__getJarvisHealth` |
| Get Jarvis modules | `getJarvisModules` | `kaycee_nonextrinsical_yosef_ngrok_free_dev__getJarvisModules` |
| **Execute Jarvis command** | `executeJarvisCommand` | `kaycee_nonextrinsical_yosef_ngrok_free_dev__executeJarvisCommand` |
| Get Jarvis alerts | `getJarvisAlerts` | `kaycee_nonextrinsical_yosef_ngrok_free_dev__getJarvisAlerts` |
| Get scheduler status | `getJarvisScheduler` | `kaycee_nonextrinsical_yosef_ngrok_free_dev__getJarvisScheduler` |

---

## ❌ What's Missing

Your error shows:
```
kaycee_nonextrinsical_yosef_ngrok_free_dev__jit_plugin
```

This means ChatGPT is looking for `operationId: jit_plugin`, but **it doesn't exist** in your spec.

---

## 🔄 Migration Guide

If you previously had `jit_plugin` and need to migrate:

### Old (Doesn't Exist):
```yaml
operationId: jit_plugin
```

### New (Pick One):

**For CLI/Terminal operations:**
```yaml
operationId: executeTerminalCommand
path: /api/v1/app/terminal/execute
method: POST
```

**For Jarvis module operations:**
```yaml
operationId: executeJarvisCommand
path: /api/v1/app/jarvis/command
method: POST
```

---

## Usage Examples

### executeTerminalCommand

**GPT Prompt:** "Run git status in the ai-dawg directory"

**API Call:**
```json
POST /api/v1/app/terminal/execute
{
  "command": "git status",
  "workingDir": "/Users/benkennon/ai-dawg-v0.1",
  "timeout": 30000
}
```

**Response:**
```json
{
  "command": "git status",
  "output": "On branch main\nnothing to commit, working tree clean",
  "exitCode": 0,
  "executionTime": 234,
  "riskLevel": "low"
}
```

---

### executeJarvisCommand

**GPT Prompt:** "Get the list of Jarvis music models"

**API Call:**
```json
POST /api/v1/app/jarvis/command
{
  "module": "music",
  "action": "get-models",
  "parameters": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "vocal-coach-v1",
        "name": "Vocal Coach",
        "status": "active"
      }
    ]
  },
  "metadata": {
    "executionTime": 45,
    "module": "music"
  }
}
```

---

## Quick Diagnostic

Run this in your GPT to see what it's trying to call:

**GPT Prompt:**
```
What actions do you have available for the Jarvis plugin?
```

**Expected Response:**
Should list 12 operations (getStatus, getLogs, runTests, etc.)

**If you see:**
- Empty list → Action not imported
- "jit_plugin" → Stale cache, re-import needed
- 404 errors → Backend server down

---

## Adding a New JIT Operation (Optional)

If you **actually want** a `jit_plugin` operation, add this to your OpenAPI spec:

```yaml
paths:
  /app/jit/plugin:
    post:
      summary: JIT Plugin Execution
      description: Execute just-in-time plugin commands
      operationId: jit_plugin
      tags:
        - JIT
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - action
              properties:
                action:
                  type: string
                  description: Action to perform
                parameters:
                  type: object
                  description: Action parameters
      responses:
        '200':
          description: JIT execution result
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  result:
                    type: object
```

Then implement the endpoint in your backend:

```javascript
app.post('/api/v1/app/jit/plugin', chatGPTAuth, async (req, res) => {
  const { action, parameters } = req.body;

  // Your JIT plugin logic here
  const result = await executeJITAction(action, parameters);

  res.json({
    success: true,
    result
  });
});
```

---

**Quick Fix:** If you don't need `jit_plugin`, just re-import your Action in the GPT and use `executeTerminalCommand` or `executeJarvisCommand` instead.
