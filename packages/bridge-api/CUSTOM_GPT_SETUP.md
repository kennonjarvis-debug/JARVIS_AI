# Custom ChatGPT Integration with JARVIS Bridge API

Complete guide to integrate your JARVIS Bridge API with Custom ChatGPT, enabling ChatGPT to control your local JARVIS AI and DAWG AI systems.

## 🎯 What You'll Achieve

- **ChatGPT can execute commands** on your local machine (whitelisted only)
- **ChatGPT can read files** from allowed paths
- **Secure** bearer token authentication
- **Complete control** over JARVIS AI and DAWG AI operations

---

## 📋 Prerequisites

Before starting, ensure you have:

1. ✅ JARVIS Bridge API running locally (`packages/bridge-api`)
2. ✅ Bearer token generated and configured in `.env`
3. ✅ Server accessible on `http://localhost:5555` (or custom port)
4. ✅ ChatGPT Plus subscription (required for Custom GPTs)

---

## 🚀 Part 1: Start Your JARVIS Bridge API

### Step 1: Generate Bearer Token

```bash
cd packages/bridge-api

# Generate secure token (32+ characters)
openssl rand -base64 32
```

Example output: `Kp8mW5nQ2tR7vC4uE1aH3jS9dF0gZ6bN3xV8mT4yL1=`

### Step 2: Configure Environment

```bash
# Copy example env file
cp .env.example .env
```

Edit `.env` and set your token:
```bash
BRIDGE_PORT=5555
BRIDGE_BEARER_TOKEN=Kp8mW5nQ2tR7vC4uE1aH3jS9dF0gZ6bN3xV8mT4yL1=
NODE_ENV=development

# Add paths for JARVIS and DAWG
ALLOWED_PATHS=/Users/benkennon/JARVIS_AI,/Users/benkennon/DAWG_AI,/tmp
```

### Step 3: Start the Server

```bash
# Install dependencies
pnpm install

# Start in development mode
pnpm dev
```

You should see:
```json
{"level":"info","message":"JARVIS Bridge API started","port":5555}
```

### Step 4: Test Locally

```bash
# Test health endpoint
curl http://localhost:5555/health

# Test with bearer token
curl -X POST http://localhost:5555/run \
  -H "Authorization: Bearer Kp8mW5nQ2tR7vC4uE1aH3jS9dF0gZ6bN3xV8mT4yL1=" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"pwd"}'
```

Expected response:
```json
{
  "stdout": "/Users/benkennon/JARVIS_AI\n",
  "stderr": "",
  "code": 0
}
```

---

## 🌐 Part 2: Expose Local Server (Required for ChatGPT)

ChatGPT cannot access `localhost` directly. You need to expose your local server using one of these methods:

### Option A: ngrok (Recommended for Development)

```bash
# Install ngrok
brew install ngrok

# Create free account at https://ngrok.com and get auth token
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Expose port 5555
ngrok http 5555
```

You'll get a public URL like: `https://abc123.ngrok-free.app`

**IMPORTANT:** Keep this terminal running! Note the HTTPS URL.

### Option B: Cloudflare Tunnel (Free, Permanent)

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create jarvis-bridge

# Run tunnel
cloudflared tunnel --url http://localhost:5555
```

### Option C: Deploy to a Server

Deploy your bridge API to:
- Railway.app
- Fly.io
- DigitalOcean
- AWS EC2

---

## 🤖 Part 3: Create Custom GPT in ChatGPT

### Step 1: Access GPT Builder

1. Go to https://chat.openai.com
2. Click **"Explore GPTs"** (left sidebar)
3. Click **"Create a GPT"** (top right)
4. Click **"Configure"** tab

### Step 2: Basic Configuration

**Name:** JARVIS Control Panel

**Description:**
```
Controls JARVIS AI and DAWG AI systems via secure local bridge.
Can execute whitelisted commands and read files from allowed paths.
```

**Instructions:**
```
You are the JARVIS Control Panel, an AI assistant that can control
local JARVIS AI and DAWG AI systems through a secure bridge API.

CAPABILITIES:
- Execute whitelisted commands (git, npm, pnpm, ls, cat, etc.)
- Read files from allowed paths
- Monitor system health
- Run audits and builds

WORKFLOW:
1. Always check /health before other operations
2. Explain what command you're about to run
3. Show output clearly formatted
4. Suggest next steps based on results

SECURITY:
- Only whitelisted commands can run
- Only allowed paths can be read
- All actions are logged
- Always inform user before executing commands

When user asks you to:
- "Check JARVIS status" → call /health
- "Run a command" → call /run with the command
- "Read a file" → call /read with the path
- "Audit dependencies" → call /run with "pnpm audit"
```

### Step 3: Add Actions (API Integration)

1. Scroll down to **"Actions"** section
2. Click **"Create new action"**
3. Click **"Import from URL"** or paste OpenAPI spec

**OpenAPI Schema:**

```yaml
openapi: 3.0.0
info:
  title: JARVIS Bridge API
  version: 1.0.0
  description: API for interacting with JARVIS AI and DAWG AI systems
servers:
  - url: https://YOUR_NGROK_URL_HERE
    description: JARVIS Bridge API
paths:
  /health:
    get:
      operationId: healthCheck
      summary: Check if the JARVIS Bridge is running
      responses:
        '200':
          description: Bridge is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  timestamp:
                    type: string
                  uptime:
                    type: number
                  version:
                    type: string
  /run:
    post:
      operationId: runCommand
      summary: Run a command on JARVIS AI or DAWG AI
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - cmd
              properties:
                cmd:
                  type: string
                  description: The command to run
                  example: "git status"
      responses:
        '200':
          description: Command executed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  stdout:
                    type: string
                  stderr:
                    type: string
                  code:
                    type: integer
  /read:
    post:
      operationId: readFile
      summary: Read a file from the local filesystem
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - path
              properties:
                path:
                  type: string
                  description: Path of the file to read
                  example: "/Users/benkennon/JARVIS_AI/README.md"
      responses:
        '200':
          description: File content
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: string
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
```

**IMPORTANT:** Replace `YOUR_NGROK_URL_HERE` with your ngrok URL (e.g., `https://abc123.ngrok-free.app`)

### Step 4: Configure Authentication

1. In the Actions panel, look for **"Authentication"**
2. Select **"API Key"** authentication type
3. Choose **"Bearer"** as Auth Type
4. Enter your `BRIDGE_BEARER_TOKEN` value (from `.env`)

Example:
```
Auth Type: Bearer
Token: Kp8mW5nQ2tR7vC4uE1aH3jS9dF0gZ6bN3xV8mT4yL1=
```

### Step 5: Test the Integration

1. Click **"Test"** next to each action
2. Test `/health` - should return status
3. Test `/run` with `{"cmd": "pwd"}` - should return current directory
4. If tests pass, click **"Save"**

### Step 6: Final Configuration

1. Upload a profile picture (optional)
2. Click **"Create"** or **"Update"** to save
3. Your Custom GPT is ready!

---

## 🧪 Part 4: Test Your Custom GPT

### Test 1: Health Check

In ChatGPT, say:
> "Check JARVIS Bridge status"

Expected response:
```
I've checked the JARVIS Bridge and it's healthy!

Status: ok
Uptime: 12345 ms
Version: 1.0.0
```

### Test 2: Execute Command

> "Show me the current directory"

Expected: GPT calls `/run` with `pwd` and shows output

### Test 3: Read File

> "Read the README file from JARVIS_AI"

Expected: GPT calls `/read` with the path and displays content

### Test 4: Complex Task

> "Run a dependency audit on JARVIS AI and summarize the results"

Expected: GPT runs `cd /Users/benkennon/JARVIS_AI && pnpm audit`, analyzes output, and provides summary

---

## 💡 Part 5: Usage Examples

### Monitor System Health

```
You: Check JARVIS and DAWG health
GPT: [Calls /health] Everything is running smoothly...
```

### Run Audits

```
You: Audit JARVIS AI dependencies
GPT: [Calls /run with "cd /Users/benkennon/JARVIS_AI && pnpm audit"]
     Found 3 vulnerabilities...
```

### Check Git Status

```
You: What's the git status of JARVIS AI?
GPT: [Calls /run with "cd /Users/benkennon/JARVIS_AI && git status"]
     On branch main, 2 files changed...
```

### Read Configuration

```
You: Show me the JARVIS package.json
GPT: [Calls /read with "/Users/benkennon/JARVIS_AI/package.json"]
     Here's the configuration...
```

### Multi-Step Operations

```
You: Build and test DAWG AI
GPT: [Calls /run with "cd /Users/benkennon/DAWG_AI && pnpm build"]
     [Calls /run with "cd /Users/benkennon/DAWG_AI && pnpm test"]
     Build successful! All tests passed.
```

---

## 🔒 Security Best Practices

### 1. Use Strong Bearer Tokens

```bash
# Generate 64-character token
openssl rand -base64 48
```

### 2. Restrict Allowed Commands

Edit `.env`:
```bash
ALLOWED_COMMANDS="git status,git log,ls,pwd,pnpm audit,pnpm build,pnpm test"
```

### 3. Limit File Access

```bash
ALLOWED_PATHS="/Users/benkennon/JARVIS_AI,/Users/benkennon/DAWG_AI"
```

### 4. Use HTTPS Only

- ngrok provides HTTPS by default
- Never expose HTTP endpoints publicly

### 5. Monitor Logs

```bash
# Watch logs in real-time
tail -f logs/bridge.log
```

### 6. Rotate Tokens Regularly

Update bearer token monthly:
```bash
openssl rand -base64 32
# Update .env
# Update Custom GPT authentication
# Restart server
```

---

## 🐛 Troubleshooting

### "Cannot connect to server"

1. Check if bridge API is running: `curl http://localhost:5555/health`
2. Check if ngrok is running: Look for `Forwarding` URL
3. Verify ngrok URL in OpenAPI spec matches current tunnel

### "401 Unauthorized"

1. Verify bearer token in `.env` matches Custom GPT authentication
2. Check token has no extra spaces or newlines
3. Restart bridge API after changing token

### "403 Command not whitelisted"

1. Add command to `ALLOWED_COMMANDS` in `.env`
2. Restart bridge API
3. Retry in Custom GPT

### "403 Path not allowed"

1. Add path to `ALLOWED_PATHS` in `.env`
2. Use absolute paths (not relative)
3. Restart bridge API

### ngrok "Session Expired"

Free ngrok sessions expire after 2 hours. Solutions:
1. Restart ngrok (URL will change, update Custom GPT)
2. Upgrade to ngrok paid plan for permanent URLs
3. Use Cloudflare Tunnel instead

---

## 📊 Advanced Configuration

### Custom Prompts

Enhance your Custom GPT's instructions:

```
SPECIALIZED COMMANDS:

For JARVIS AI:
- "Audit JARVIS" → pnpm audit in JARVIS_AI directory
- "Build JARVIS" → pnpm build in JARVIS_AI directory
- "Check JARVIS logs" → read log files

For DAWG AI:
- "Audit DAWG" → pnpm audit in DAWG_AI directory
- "Build DAWG" → pnpm build in DAWG_AI directory
- "Check DAWG config" → read configuration files

System Monitoring:
- "Disk usage" → du -sh on both repos
- "Recent commits" → git log --oneline -10
- "Branch status" → git branch -vv
```

### Add More Endpoints

Extend the bridge API with custom endpoints:

```typescript
// In src/index.ts
app.post('/build', authenticate, async (req, res) => {
  const { project } = req.body; // "jarvis" or "dawg"
  const cwd = project === 'jarvis'
    ? '/Users/benkennon/JARVIS_AI'
    : '/Users/benkennon/DAWG_AI';

  const result = await exec('pnpm build', { cwd });
  res.json(result);
});
```

Update OpenAPI spec and refresh Custom GPT.

---

## 📚 Next Steps

1. **Test thoroughly** - Try all operations in Custom GPT
2. **Monitor logs** - Watch for security issues
3. **Expand whitelist** - Add commands as needed
4. **Create shortcuts** - Add common tasks to Custom GPT instructions
5. **Share feedback** - Improve the integration based on usage

---

## 🆘 Support

- **Documentation:** [README.md](./README.md)
- **OpenAPI Spec:** [openapi.yaml](./openapi.yaml)
- **Quick Start:** [QUICK_START.md](./QUICK_START.md)
- **GitHub:** https://github.com/kennonjarvis-debug/JARVIS_AI

---

## ✅ Checklist

Before marking this complete, ensure:

- [ ] Bridge API running and accessible
- [ ] Bearer token configured
- [ ] ngrok or tunnel running (URL noted)
- [ ] Custom GPT created in ChatGPT
- [ ] OpenAPI spec imported with correct URL
- [ ] Authentication configured with bearer token
- [ ] All 3 endpoints tested (/health, /run, /read)
- [ ] Security settings reviewed
- [ ] Allowed commands and paths configured

**You're all set! Your Custom ChatGPT can now control JARVIS AI and DAWG AI** 🎉
