# ChatGPT Custom Actions Setup Guide for JARVIS

Step-by-step guide to connect ChatGPT with your JARVIS Control Plane.

---

## Prerequisites

- ✅ JARVIS Control Plane running on port 5001
- ✅ ChatGPT Plus or Team subscription (required for Custom Actions)
- ✅ Your auth token (default: `test-token`)

---

## Step 1: Install ngrok (Expose Localhost to Internet)

ChatGPT needs to access your local server via the internet. We'll use ngrok to create a secure tunnel.

### Option A: Install via Homebrew (Recommended for Mac)

```bash
brew install ngrok/ngrok/ngrok
```

### Option B: Download from ngrok.com

1. Go to https://ngrok.com/download
2. Create a free account
3. Download and install ngrok for your OS
4. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken

### Configure ngrok authtoken (if using ngrok account)

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

---

## Step 2: Start JARVIS Control Plane

Make sure JARVIS is running:

```bash
cd /Users/benkennon/JARVIS_AI/control-plane
npm run dev
```

You should see:
```
🚀 Jarvis Control Plane started on port 5001
```

---

## Step 3: Start ngrok Tunnel

In a **new terminal window**, start ngrok:

```bash
ngrok http 5001
```

You'll see output like this:

```
ngrok

Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:5001

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Important**: Copy your ngrok URL! It looks like: `https://abc123.ngrok-free.app`

Keep this terminal window open - closing it will kill the tunnel.

---

## Step 4: Update OpenAPI Schema with Your ngrok URL

Open the file:
```
/Users/benkennon/JARVIS_AI/chatgpt-custom-action-schema.json
```

Find this line:
```json
"url": "YOUR_NGROK_URL_HERE"
```

Replace it with your ngrok URL:
```json
"url": "https://abc123.ngrok-free.app"
```

Save the file.

---

## Step 5: Add Custom Action to ChatGPT

### 5.1 Open ChatGPT and Access Custom GPTs

1. Go to https://chat.openai.com
2. Click your profile picture (bottom left)
3. Click **"My GPTs"**
4. Click **"Create a GPT"** (top right)

### 5.2 Configure the GPT

In the **Configure** tab:

**Name**:
```
JARVIS Control Plane
```

**Description**:
```
AI-powered control plane for browser automation, web scraping, console inspection, and more. Can navigate websites, capture console logs, take screenshots, and execute browser actions.
```

**Instructions**:
```
You are JARVIS, an AI assistant with browser automation capabilities. You can:

1. Navigate to any website and inspect it
2. Capture JavaScript console logs and errors
3. Monitor network requests (API calls, resources)
4. Take screenshots of web pages
5. Perform browser actions (click, type, scroll)
6. Execute custom JavaScript code on pages

When a user asks you to:
- "Check" or "inspect" a website → Use the executeModule action with module="browser" and action="inspect"
- "Take a screenshot" → Set captureScreenshot=true
- "Monitor network requests" or "check API calls" → Set captureNetwork=true
- "Check for errors" or "see console logs" → Set captureConsole=true (default)
- "Test" or "automate" a flow → Use actions array with click, type, wait commands

Always:
- Set headless=true for faster execution
- Use timeout=30000 (30 seconds) by default
- Summarize findings in a clear, actionable way
- Report console errors/warnings prominently
- Mention if any network requests failed (4xx, 5xx status codes)

Be proactive and helpful. If you see errors, suggest potential fixes.
```

**Conversation starters** (optional):
```
Check https://example.com for JavaScript errors
Take a screenshot of https://google.com in mobile view
Monitor network requests on https://example.com
Test the login flow on my website
```

### 5.3 Add the Custom Action

1. Scroll down to **"Actions"** section
2. Click **"Create new action"**
3. Click **"Import from URL"** (or paste JSON directly)

#### Option A: Import from URL (Easier)

If you've uploaded the schema file somewhere, paste the URL.

#### Option B: Paste JSON Directly

1. Open `/Users/benkennon/JARVIS_AI/chatgpt-custom-action-schema.json`
2. Copy the entire contents
3. Paste into the Schema field

### 5.4 Configure Authentication

1. After importing the schema, scroll down to **"Authentication"**
2. Select **"Bearer"** from the dropdown
3. In the **"Bearer Token"** field, enter:
   ```
   test-token
   ```
   (Or your custom token if you changed it)

### 5.5 Privacy Policy (Optional)

If asked for a privacy policy URL, you can use:
```
https://example.com/privacy
```

Or leave blank for personal use.

### 5.6 Test the Action

Click **"Test"** button next to the action.

Try this test request:
```json
{
  "module": "browser",
  "action": "inspect",
  "params": {
    "url": "https://example.com",
    "captureConsole": true,
    "headless": true
  }
}
```

You should see a success response with console logs!

### 5.7 Save Your GPT

1. Click **"Update"** (top right)
2. Choose **"Only me"** for privacy (or share if you want)
3. Click **"Confirm"**

---

## Step 6: Test JARVIS with ChatGPT!

Now you can chat with your JARVIS GPT! Try these prompts:

### Example 1: Check for JavaScript Errors

**You**: "Check https://example.com for any JavaScript errors or warnings"

**JARVIS**: Will call the API and report any console errors found.

---

### Example 2: Take a Screenshot

**You**: "Take a screenshot of https://google.com"

**JARVIS**: Will capture a screenshot and can describe what it sees (if vision is enabled).

---

### Example 3: Monitor Network Requests

**You**: "Monitor all network requests when loading https://example.com and tell me if any fail"

**JARVIS**: Will capture all HTTP requests and report failed ones (4xx, 5xx).

---

### Example 4: Test a Login Flow

**You**: "Go to https://example.com/login and try to log in with email test@example.com and password test123. Tell me what happens."

**JARVIS**: Will execute the browser actions and report the results.

---

### Example 5: Custom JavaScript Execution

**You**: "Go to https://example.com and tell me the page title and meta description"

**JARVIS**: Will navigate and execute JavaScript to extract the information.

---

## Troubleshooting

### Issue: "Action failed to execute"

**Cause**: ngrok tunnel is down or JARVIS isn't running

**Solution**:
1. Check ngrok is running: Look for "Forwarding https://..." in ngrok terminal
2. Check JARVIS is running: `lsof -i :5001` should show node process
3. Test manually: `curl https://YOUR_NGROK_URL/health`

---

### Issue: "403 Forbidden" or "Invalid authentication token"

**Cause**: Wrong bearer token

**Solution**:
1. Go to your GPT settings → Actions → Authentication
2. Verify Bearer Token is `test-token`
3. Or check your `JARVIS_AUTH_TOKEN` environment variable

---

### Issue: "Timeout" errors

**Cause**: Website is slow or timeout is too short

**Solution**:
1. Tell ChatGPT to increase the timeout: "Try again with a 60 second timeout"
2. Or the website might be blocking automated browsers

---

### Issue: ngrok "Too many connections" or rate limiting

**Cause**: Free ngrok has request limits

**Solution**:
1. Sign up for ngrok account (free) to get higher limits
2. Or use ngrok paid plan
3. Or deploy JARVIS to a cloud server with a public IP

---

### Issue: "Element not found" errors

**Cause**: CSS selector is wrong or page hasn't loaded

**Solution**:
1. Add a wait action before clicking/typing: `{"type": "wait", "value": 2000}`
2. Use `waitForSelector` parameter
3. Check the selector is correct by inspecting the page

---

## Advanced: Deploy to Production

For production use, instead of ngrok, deploy JARVIS to:

1. **Railway**: https://railway.app (easiest)
2. **Heroku**: https://heroku.com
3. **AWS EC2**: With Load Balancer
4. **DigitalOcean Droplet**: With nginx reverse proxy
5. **Vercel/Netlify**: For serverless deployment

Then update the OpenAPI schema `url` to your production domain.

See `DEPLOYMENT_AND_SCALING_GUIDE.md` for detailed deployment instructions.

---

## Security Notes

### For Local Development

- ✅ ngrok is secure (HTTPS encryption)
- ✅ Bearer token authentication protects your API
- ✅ Rate limiting prevents abuse (5 attempts/min)
- ⚠️  Never commit your bearer token to git
- ⚠️  Don't share your ngrok URL publicly

### For Production

- ✅ Use a strong bearer token (32+ random characters)
- ✅ Store token in environment variables
- ✅ Enable HTTPS (Let's Encrypt)
- ✅ Add IP whitelisting if possible
- ✅ Monitor logs for suspicious activity
- ✅ Implement request rate limiting
- ✅ Use CORS restrictions

Generate a strong token:
```bash
openssl rand -hex 32
```

---

## Monitoring Your JARVIS

### View ngrok Requests

Open http://127.0.0.1:4040 in your browser to see:
- All incoming requests from ChatGPT
- Request/response details
- Performance metrics

### View JARVIS Logs

JARVIS logs all requests with correlation IDs:
```bash
tail -f /Users/benkennon/JARVIS_AI/control-plane/logs/combined.log
```

---

## Example Advanced Use Cases

### 1. E-commerce Price Monitoring

**You**: "Check the price of [product] on Amazon and Walmart and compare them"

JARVIS will:
1. Navigate to both sites
2. Extract prices using custom JavaScript
3. Compare and report back

---

### 2. Website Uptime Monitoring

**You**: "Check if https://mywebsite.com is online and loading without errors"

JARVIS will:
1. Navigate to the site
2. Check for console errors
3. Verify network requests succeed
4. Report any issues

---

### 3. Automated Testing

**You**: "Test the checkout flow on my website: add a product, go to cart, and proceed to checkout"

JARVIS will:
1. Execute the click/type actions
2. Capture any errors
3. Take screenshots at each step
4. Report if the flow works

---

### 4. Competitor Analysis

**You**: "Check competitor.com and tell me what features they have on their landing page"

JARVIS will:
1. Take a screenshot
2. Extract text content
3. List features found
4. Compare with your site (if you ask)

---

### 5. Accessibility Testing

**You**: "Check https://mywebsite.com for accessibility issues"

JARVIS can execute custom JavaScript to check:
- Missing alt text on images
- Form labels
- ARIA attributes
- Color contrast (with custom code)

---

## What's Next?

Once JARVIS is connected to ChatGPT, you can:

1. **Create Scheduled Checks**: Ask ChatGPT to remind you to check sites daily
2. **Build Workflows**: Chain multiple browser actions together
3. **Integrate with Other Tools**: Combine with ChatGPT's other actions
4. **Extend JARVIS**: Add more modules (music, marketing, etc.)

---

## Quick Reference Card

### JARVIS Commands

| What You Want | Example Prompt |
|---------------|----------------|
| Check for errors | "Check https://example.com for JavaScript errors" |
| Take screenshot | "Screenshot https://example.com" |
| Monitor network | "Check API calls on https://example.com" |
| Test login | "Test login on https://mysite.com with email user@test.com" |
| Custom JS | "Get all H1 headings from https://example.com" |
| Mobile view | "Screenshot https://example.com in iPhone view" |

### JARVIS Parameters

| Parameter | Default | Purpose |
|-----------|---------|---------|
| timeout | 30000 | Max time (ms) |
| headless | true | Run in background |
| captureConsole | true | Get console logs |
| captureNetwork | false | Get HTTP requests |
| captureScreenshot | false | Take screenshot |

---

## Support

If you run into issues:

1. Check JARVIS logs: `tail -f logs/combined.log`
2. Check ngrok dashboard: http://127.0.0.1:4040
3. Test manually: `npx tsx test-chatgpt-endpoints.ts`
4. Review docs: `CHATGPT_INTEGRATION_GUIDE.md`

---

**🎉 You're all set! Start chatting with JARVIS in ChatGPT!**
