# JARVIS Browser Automation Integration

**Date**: October 22, 2025
**Status**: Production Ready ✅
**Technology**: Playwright (Chromium)

---

## Overview

The JARVIS Control Plane now includes comprehensive browser automation capabilities, allowing you to:
- Access developer consoles and collect console logs
- Monitor network requests and responses
- Perform automated browser actions (click, type, scroll, etc.)
- Capture screenshots
- Execute custom JavaScript in the browser context
- Extract page content and diagnostic data

This integration uses **Playwright** with Chromium for reliable, production-grade browser automation.

---

## Features

### ✅ Implemented

1. **Console Log Collection** - Capture all console messages (log, error, warn, info, debug)
2. **Network Monitoring** - Track HTTP requests/responses with headers, status codes, and timing
3. **Browser Actions** - Click, type, wait, scroll, screenshot, custom JavaScript
4. **Screenshot Capture** - Full-page screenshots in base64 format
5. **Correlation IDs** - Full request tracing for debugging
6. **Error Handling** - Graceful error handling with detailed error messages
7. **Flexible Configuration** - Headless/headed mode, custom viewport, user agent
8. **Multiple Access Methods** - Direct API endpoint or module router integration

---

## Installation

Playwright is already installed in the control plane. No additional setup required!

```bash
# Playwright is already in package.json
"playwright": "^1.56.1"
```

---

## API Reference

### Method 1: Direct API Endpoint

**Endpoint**: `POST /api/v1/browser/automate`

**Authentication**: Bearer token required

**Request Body**:

```typescript
{
  url: string;                    // Required - URL to navigate to
  actions?: BrowserAction[];      // Optional - Actions to perform
  waitForSelector?: string;       // Optional - Wait for selector before continuing
  timeout?: number;               // Optional - Max timeout in ms (default: 30000)
  headless?: boolean;             // Optional - Run in headless mode (default: true)
  captureNetwork?: boolean;       // Optional - Capture network logs (default: false)
  captureConsole?: boolean;       // Optional - Capture console logs (default: true)
  captureScreenshot?: boolean;    // Optional - Capture screenshot (default: false)
  viewport?: {                    // Optional - Browser viewport size
    width: number;
    height: number;
  };
  userAgent?: string;             // Optional - Custom user agent
}
```

**Browser Actions**:

```typescript
type BrowserAction = {
  type: 'click' | 'type' | 'wait' | 'scroll' | 'screenshot' | 'evaluate';
  selector?: string;    // Required for 'click' and 'type'
  value?: string;       // Required for 'type', optional for 'wait' (ms)
  code?: string;        // Required for 'evaluate'
}
```

**Response**:

```typescript
{
  success: boolean;
  data: {
    success: boolean;
    url: string;
    consoleLogs?: ConsoleLog[];
    networkLogs?: NetworkLog[];
    screenshot?: string;         // Base64 encoded
    pageContent?: string;
    error?: string;
    metadata: {
      duration: number;          // Time taken in ms
      timestamp: string;
      correlationId?: string;
    };
  };
  timestamp: string;
}
```

### Method 2: Module Router

**Endpoint**: `POST /api/v1/execute`

**Request Body**:

```json
{
  "module": "browser",
  "action": "automate",
  "params": {
    "url": "https://example.com",
    "actions": [
      { "type": "click", "selector": "#button" },
      { "type": "type", "selector": "#input", "value": "Hello" }
    ],
    "captureConsole": true,
    "captureNetwork": true
  }
}
```

---

## Usage Examples

### Example 1: Basic Console Log Collection

**Request via ChatGPT Control Plane**:
```
"Jarvis, open https://example.com and collect any console errors."
```

**Request via API**:
```bash
curl -X POST http://localhost:5001/api/v1/browser/automate \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "captureConsole": true,
    "captureNetwork": false
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "url": "https://example.com",
    "consoleLogs": [
      {
        "type": "log",
        "text": "Page loaded successfully",
        "timestamp": 1729615200000
      },
      {
        "type": "error",
        "text": "TypeError: Cannot read property 'x' of undefined",
        "timestamp": 1729615201000
      }
    ],
    "metadata": {
      "duration": 2345,
      "timestamp": "2025-10-22T14:30:00.000Z",
      "correlationId": "abc-123-def"
    }
  }
}
```

### Example 2: Network Monitoring

**Request**:
```bash
curl -X POST http://localhost:5001/api/v1/browser/automate \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "captureNetwork": true,
    "captureConsole": false
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "url": "https://example.com",
    "networkLogs": [
      {
        "method": "GET",
        "url": "https://example.com/api/data",
        "status": 200,
        "timing": 156,
        "timestamp": 1729615200000
      },
      {
        "method": "POST",
        "url": "https://example.com/api/submit",
        "status": 500,
        "timing": 234,
        "timestamp": 1729615201000
      }
    ]
  }
}
```

### Example 3: Automated Actions with Screenshot

**Request**:
```bash
curl -X POST http://localhost:5001/api/v1/browser/automate \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/login",
    "actions": [
      { "type": "type", "selector": "#username", "value": "testuser" },
      { "type": "type", "selector": "#password", "value": "testpass" },
      { "type": "click", "selector": "#login-button" },
      { "type": "wait", "value": 2000 }
    ],
    "captureScreenshot": true,
    "waitForSelector": ".dashboard"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "url": "https://example.com/login",
    "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...(base64)",
    "consoleLogs": [...],
    "metadata": {
      "duration": 3456,
      "timestamp": "2025-10-22T14:30:00.000Z"
    }
  }
}
```

### Example 4: Custom JavaScript Execution

**Request**:
```bash
curl -X POST http://localhost:5001/api/v1/browser/automate \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "actions": [
      {
        "type": "evaluate",
        "code": "document.querySelectorAll(\"a\").length"
      }
    ]
  }'
```

### Example 5: Non-Headless Mode for Visual Debugging

**Request**:
```bash
curl -X POST http://localhost:5001/api/v1/browser/automate \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "headless": false,
    "captureConsole": true
  }'
```

This will open a visible browser window for debugging purposes.

---

## ChatGPT Integration Examples

### Example 1: Simple Console Check

**User**: "Jarvis, check https://my-app.com for any console errors"

**Jarvis** (internally calls):
```bash
POST /api/v1/execute
{
  "module": "browser",
  "action": "inspect",
  "params": {
    "url": "https://my-app.com",
    "captureConsole": true
  }
}
```

**Jarvis Response**: "I found 3 console errors on https://my-app.com:
1. TypeError: Cannot read property 'data' of undefined (line 42)
2. ReferenceError: userProfile is not defined (line 156)
3. Uncaught Error: API request failed (line 203)"

### Example 2: Network Debugging

**User**: "Jarvis, check why the login API is failing on https://my-app.com/login"

**Jarvis** (internally calls):
```bash
POST /api/v1/execute
{
  "module": "browser",
  "action": "automate",
  "params": {
    "url": "https://my-app.com/login",
    "captureNetwork": true,
    "captureConsole": true
  }
}
```

**Jarvis Response**: "I analyzed the network traffic. The issue is:
- POST /api/auth/login returned HTTP 500
- Response time: 2.3 seconds
- Console shows: 'AuthenticationError: Invalid credentials format'
- Recommendation: Check your API server logs for detailed error stack trace"

### Example 3: Automated Testing

**User**: "Jarvis, test the login flow on https://staging-app.com with test credentials"

**Jarvis** (internally calls):
```bash
POST /api/v1/execute
{
  "module": "browser",
  "action": "automate",
  "params": {
    "url": "https://staging-app.com/login",
    "actions": [
      { "type": "type", "selector": "#email", "value": "test@example.com" },
      { "type": "type", "selector": "#password", "value": "test123" },
      { "type": "click", "selector": "button[type='submit']" },
      { "type": "wait", "value": 3000 }
    ],
    "waitForSelector": ".dashboard",
    "captureScreenshot": true,
    "captureConsole": true
  }
}
```

**Jarvis Response**: "Login test completed successfully!
- Logged in as test@example.com
- Dashboard loaded in 2.1 seconds
- No console errors detected
- Screenshot captured (attached)"

---

## Advanced Features

### 1. Custom Viewport Sizes

Test responsive designs:

```json
{
  "url": "https://example.com",
  "viewport": {
    "width": 375,
    "height": 667
  },
  "captureScreenshot": true
}
```

### 2. Custom User Agents

Test different browser/device types:

```json
{
  "url": "https://example.com",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
}
```

### 3. Scroll Actions

Trigger lazy-loading:

```json
{
  "url": "https://example.com/infinite-scroll",
  "actions": [
    { "type": "scroll" },
    { "type": "wait", "value": 1000 },
    { "type": "scroll" },
    { "type": "wait", "value": 1000 }
  ]
}
```

### 4. Error Filtering

Get only console errors:

```javascript
// After receiving response
const errors = response.data.consoleLogs.filter(log => log.type === 'error');
```

### 5. Failed Request Analysis

Find all failed network requests:

```javascript
// After receiving response
const failedRequests = response.data.networkLogs.filter(log => log.status >= 400);
```

---

## Error Handling

### Common Errors

#### 1. Timeout Error

```json
{
  "success": false,
  "error": "Navigation timeout of 30000ms exceeded",
  "metadata": {
    "duration": 30000,
    "timestamp": "2025-10-22T14:30:00.000Z"
  }
}
```

**Solution**: Increase timeout or check network connectivity

#### 2. Selector Not Found

```json
{
  "success": false,
  "error": "Selector #non-existent not found",
  "metadata": {
    "duration": 5000,
    "timestamp": "2025-10-22T14:30:00.000Z"
  }
}
```

**Solution**: Verify selector exists or use `waitForSelector`

#### 3. Page Crash

```json
{
  "success": false,
  "error": "Page crashed during navigation",
  "metadata": {
    "duration": 2000,
    "timestamp": "2025-10-22T14:30:00.000Z"
  }
}
```

**Solution**: Check page resources and JavaScript errors

---

## Performance Considerations

### Headless vs Non-Headless

- **Headless mode** (default): Faster, lower resource usage
- **Non-headless mode**: Better for debugging, see visual feedback

### Timeouts

Default timeout is **30 seconds**. Adjust based on page complexity:

```json
{
  "url": "https://slow-page.com",
  "timeout": 60000  // 60 seconds
}
```

### Resource Usage

- Each automation session uses **~200-300MB RAM**
- Browser instances are automatically cleaned up after completion
- Concurrent sessions are supported but monitor system resources

---

## Security

### Authentication

All endpoints require Bearer token authentication:

```bash
Authorization: Bearer your-token-here
```

### Rate Limiting

Browser automation endpoints respect the same rate limits as other API endpoints:
- 5000 requests per 15 minutes per IP
- Lower for non-localhost IPs

### Sandboxing

Browser runs with these security flags:
- `--no-sandbox`
- `--disable-setuid-sandbox`
- `--disable-dev-shm-usage`
- `--disable-gpu`

---

## Debugging

### Enable Debug Logging

Set log level to debug:

```bash
LOG_LEVEL=debug npm run dev
```

### View Correlation IDs

All requests include correlation IDs for tracing:

```
[2025-10-22 14:30:00] info: [abc-123-def] [BrowserAutomation] Starting automation for https://example.com
[2025-10-22 14:30:02] info: [abc-123-def] [BrowserAutomation] Browser launched successfully
[2025-10-22 14:30:03] info: [abc-123-def] [BrowserAutomation] Page loaded successfully
```

### Capture Screenshots for Debugging

Always capture screenshots when debugging:

```json
{
  "url": "https://example.com",
  "captureScreenshot": true,
  "headless": false  // See browser in action
}
```

---

## Integration with Jarvis Workflows

### Workflow 1: Automated Health Monitoring

**Schedule**: Every 30 minutes

```javascript
// Pseudo-code
setInterval(async () => {
  const result = await jarvis.execute({
    module: 'browser',
    action: 'inspect',
    params: {
      url: 'https://production-app.com',
      captureConsole: true,
      captureNetwork: true
    }
  });

  const errors = result.data.consoleLogs.filter(log => log.type === 'error');
  const failedRequests = result.data.networkLogs.filter(log => log.status >= 400);

  if (errors.length > 0 || failedRequests.length > 0) {
    // Alert developer via Slack/email
    await jarvis.alert('Production console errors detected!', errors);
  }
}, 1800000); // 30 minutes
```

### Workflow 2: Pre-Deployment Testing

**Trigger**: Before production deployment

```javascript
// Test critical user flows
const tests = [
  { name: 'Login', url: 'https://staging.com/login', actions: [...] },
  { name: 'Checkout', url: 'https://staging.com/checkout', actions: [...] },
  { name: 'Dashboard', url: 'https://staging.com/dashboard', actions: [...] }
];

for (const test of tests) {
  const result = await jarvis.execute({
    module: 'browser',
    action: 'automate',
    params: test
  });

  if (!result.success || result.data.consoleLogs.some(log => log.type === 'error')) {
    throw new Error(`Test ${test.name} failed - blocking deployment`);
  }
}

console.log('All tests passed - proceeding with deployment');
```

---

## Roadmap

### Future Enhancements

- [ ] Multi-browser support (Firefox, Safari)
- [ ] Session recording (video)
- [ ] Performance metrics (Lighthouse integration)
- [ ] Visual regression testing
- [ ] Parallel browser execution
- [ ] Cookie/localStorage management
- [ ] File upload/download support
- [ ] Mobile device emulation presets

---

## Files Created

1. **`control-plane/src/services/browser-automation.service.ts`** - Core browser automation service (335 lines)
2. **`control-plane/src/core/gateway.ts`** - Added `/api/v1/browser/automate` endpoint
3. **`control-plane/src/core/module-router.ts`** - Added `browser` module integration

---

## Testing

### Manual Test

```bash
# 1. Start control plane
cd control-plane
npm run dev

# 2. Test basic console collection
curl -X POST http://localhost:5001/api/v1/browser/automate \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "captureConsole": true
  }'

# 3. Test via module router
curl -X POST http://localhost:5001/api/v1/execute \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "module": "browser",
    "action": "automate",
    "params": {
      "url": "https://example.com",
      "captureConsole": true
    }
  }'
```

### Expected Output

```json
{
  "success": true,
  "data": {
    "success": true,
    "url": "https://example.com",
    "consoleLogs": [],
    "metadata": {
      "duration": 1234,
      "timestamp": "2025-10-22T14:30:00.000Z",
      "correlationId": "abc-123-def"
    }
  }
}
```

---

## Support

### Common Issues

1. **Playwright not found**: Run `npm install` in control-plane directory
2. **Browser launch failed**: Check system resources and Chrome/Chromium installation
3. **Timeout errors**: Increase `timeout` parameter or check network connectivity

### Logs

Check logs at:
- `control-plane/logs/combined.log` - All logs
- `control-plane/logs/error.log` - Errors only

### Contact

For issues or questions:
- GitHub Issues: https://github.com/kennonjarvis-debug/JARVIS_AI/issues
- Control Plane Logs: Check correlation IDs for request tracing

---

**Author**: Claude Code
**Date**: October 22, 2025
**Version**: 1.0.0

---

## Quick Reference

### API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/browser/automate` | POST | Yes | Direct browser automation |
| `/api/v1/execute` | POST | Yes | Via module router (module: "browser") |

### Supported Actions

| Action Type | Required Fields | Purpose |
|-------------|----------------|---------|
| `click` | `selector` | Click an element |
| `type` | `selector`, `value` | Type text into input |
| `wait` | `value` (ms) | Wait for specified time |
| `scroll` | None | Scroll to bottom |
| `screenshot` | None | Capture screenshot |
| `evaluate` | `code` | Execute JavaScript |

### Response Fields

| Field | Type | Always Present | Description |
|-------|------|----------------|-------------|
| `success` | boolean | Yes | Whether automation succeeded |
| `url` | string | Yes | URL that was automated |
| `consoleLogs` | array | If `captureConsole=true` | Console messages |
| `networkLogs` | array | If `captureNetwork=true` | Network requests |
| `screenshot` | string | If `captureScreenshot=true` | Base64 screenshot |
| `pageContent` | string | Yes | HTML content |
| `error` | string | If failed | Error message |
| `metadata` | object | Yes | Duration, timestamp, correlation ID |

