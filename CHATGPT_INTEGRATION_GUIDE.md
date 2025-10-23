# ChatGPT Integration Guide for JARVIS Control Plane

Complete guide for integrating ChatGPT with JARVIS Control Plane APIs.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Available Endpoints](#available-endpoints)
4. [Browser Automation Integration](#browser-automation-integration)
5. [Request/Response Examples](#requestresponse-examples)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Testing](#testing)

---

## Quick Start

### Base URL
```
Production: https://your-domain.com
Development: http://localhost:5001
```

### Authentication
All API requests require Bearer token authentication:

```http
Authorization: Bearer <your-auth-token>
```

Default development token: `test-token`

### Basic Health Check
```bash
curl -H "Authorization: Bearer test-token" \
  http://localhost:5001/health
```

---

## Authentication

### Headers Required

Every API request must include:

```http
Authorization: Bearer <token>
Content-Type: application/json
X-Request-ID: <optional-correlation-id>
```

### Getting Your Auth Token

1. **Development Mode**: Use `test-token` (configured in `src/utils/config.ts`)
2. **Production Mode**: Set `JARVIS_AUTH_TOKEN` environment variable

### Rate Limiting

- **Max Failed Attempts**: 5 per minute per IP
- **Window**: 60 seconds
- **Response Code**: `429 Too Many Requests`
- **Retry-After Header**: Included in 429 responses

### Example Authentication Error

```json
{
  "error": "Invalid authentication token",
  "message": "Authentication failed. Please check your credentials.",
  "retryable": false
}
```

---

## Available Endpoints

### 1. Health Check

**Endpoint**: `GET /health`

**Description**: Check if the control plane is running.

**Authentication**: Optional (recommended)

**Response**:
```json
{
  "status": "ok",
  "healthy": true,
  "timestamp": "2025-10-22T21:30:00.000Z"
}
```

---

### 2. Module Router (Recommended for ChatGPT)

**Endpoint**: `POST /api/v1/execute`

**Description**: Universal endpoint for executing any module action. This is the **recommended endpoint for ChatGPT integration** as it provides a consistent interface across all modules.

**Request Body**:
```typescript
{
  module: string;      // Module name (e.g., "browser", "music", "marketing")
  action: string;      // Action name (e.g., "inspect", "automate", "open")
  params: object;      // Module-specific parameters
}
```

**Supported Modules**:
- `browser` - Browser automation with Playwright
- `music` - Music generation and processing
- `marketing` - Marketing automation
- `engagement` - User engagement tracking
- `testing` - Automated testing

---

### 3. Direct Browser Automation Endpoint

**Endpoint**: `POST /api/v1/browser/automate`

**Description**: Direct access to browser automation features.

**When to Use**:
- When you need direct browser control
- For debugging or testing browser automation specifically
- When the module router adds unnecessary overhead

**Request Body**:
```typescript
{
  url: string;                           // Required: URL to navigate to
  actions?: BrowserAction[];             // Optional: Actions to perform
  waitForSelector?: string;              // Optional: Wait for element
  timeout?: number;                      // Optional: Timeout in ms (default: 30000)
  headless?: boolean;                    // Optional: Run in headless mode (default: true)
  captureNetwork?: boolean;              // Optional: Capture network logs (default: false)
  captureConsole?: boolean;              // Optional: Capture console logs (default: false)
  captureScreenshot?: boolean;           // Optional: Capture screenshot (default: false)
  viewport?: { width: number; height: number };  // Optional: Custom viewport
  userAgent?: string;                    // Optional: Custom user agent
}
```

**Response**:
```typescript
{
  success: boolean;
  data: {
    url: string;
    consoleLogs?: ConsoleLog[];
    networkLogs?: NetworkLog[];
    screenshot?: string;                 // Base64 encoded PNG
    metadata: {
      duration: number;
      timestamp: string;
      correlationId?: string;
    }
  }
}
```

---

## Browser Automation Integration

### Use Cases for ChatGPT

1. **Web Page Inspection**
   - Capture console errors/warnings from any URL
   - Monitor network requests
   - Take screenshots of web pages

2. **Automated Testing**
   - Verify user flows (login, checkout, etc.)
   - Check for JavaScript errors
   - Validate API responses

3. **Web Scraping**
   - Extract data from dynamic websites
   - Monitor competitor websites
   - Track price changes

4. **UI/UX Monitoring**
   - Screenshot comparison
   - Performance monitoring
   - Accessibility testing

### Browser Actions

Available action types:

```typescript
{
  type: 'click';
  selector: string;     // CSS selector
}

{
  type: 'type';
  selector: string;     // CSS selector
  value: string;        // Text to type
}

{
  type: 'wait';
  value: number;        // Milliseconds to wait
}

{
  type: 'scroll';
  // Scrolls to bottom of page
}

{
  type: 'evaluate';
  code: string;         // JavaScript code to execute
}
```

---

## Request/Response Examples

### Example 1: Check Website Console Logs

**ChatGPT Prompt**:
> "Check the console logs on https://example.com for any errors"

**API Request**:
```json
POST /api/v1/execute
{
  "module": "browser",
  "action": "inspect",
  "params": {
    "url": "https://example.com",
    "captureConsole": true,
    "captureNetwork": false,
    "headless": true,
    "timeout": 30000
  }
}
```

**API Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "consoleLogs": [
      {
        "type": "warning",
        "text": "Cookie policy not accepted",
        "timestamp": 1698012345678
      },
      {
        "type": "error",
        "text": "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT",
        "timestamp": 1698012345789
      }
    ],
    "metadata": {
      "duration": 2030,
      "timestamp": "2025-10-22T21:30:00.000Z",
      "correlationId": "test-chatgpt-001"
    }
  },
  "timestamp": "2025-10-22T21:30:00.000Z"
}
```

---

### Example 2: Monitor Network Requests

**ChatGPT Prompt**:
> "Monitor all network requests when loading https://example.com"

**API Request**:
```json
POST /api/v1/browser/automate
{
  "url": "https://example.com",
  "captureNetwork": true,
  "captureConsole": false,
  "headless": true,
  "timeout": 30000
}
```

**API Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "networkLogs": [
      {
        "method": "GET",
        "url": "https://example.com/",
        "status": 200,
        "timestamp": 1698012345678,
        "requestHeaders": {
          "User-Agent": "Mozilla/5.0..."
        },
        "responseHeaders": {
          "Content-Type": "text/html",
          "Cache-Control": "max-age=3600"
        }
      },
      {
        "method": "GET",
        "url": "https://example.com/api/data",
        "status": 404,
        "timestamp": 1698012345890
      }
    ],
    "metadata": {
      "duration": 330,
      "timestamp": "2025-10-22T21:30:00.000Z"
    }
  }
}
```

---

### Example 3: Take Screenshot

**ChatGPT Prompt**:
> "Take a screenshot of https://example.com in mobile view"

**API Request**:
```json
POST /api/v1/browser/automate
{
  "url": "https://example.com",
  "captureScreenshot": true,
  "viewport": {
    "width": 375,
    "height": 667
  },
  "headless": true,
  "timeout": 30000
}
```

**API Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "screenshot": "iVBORw0KGgoAAAANSUhEUgA...(base64 encoded PNG)",
    "metadata": {
      "duration": 340,
      "timestamp": "2025-10-22T21:30:00.000Z"
    }
  }
}
```

---

### Example 4: Test Login Flow

**ChatGPT Prompt**:
> "Test the login flow on https://example.com with username 'test@example.com' and password 'test123'"

**API Request**:
```json
POST /api/v1/execute
{
  "module": "browser",
  "action": "automate",
  "params": {
    "url": "https://example.com/login",
    "actions": [
      { "type": "wait", "value": 1000 },
      { "type": "type", "selector": "input[name='email']", "value": "test@example.com" },
      { "type": "type", "selector": "input[name='password']", "value": "test123" },
      { "type": "click", "selector": "button[type='submit']" },
      { "type": "wait", "value": 2000 }
    ],
    "captureConsole": true,
    "captureScreenshot": true,
    "headless": true,
    "timeout": 30000
  }
}
```

**API Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://example.com/login",
    "consoleLogs": [
      {
        "type": "log",
        "text": "Login successful",
        "timestamp": 1698012347890
      }
    ],
    "screenshot": "iVBORw0KGgoAAAANSUhEUg...",
    "metadata": {
      "duration": 2143,
      "timestamp": "2025-10-22T21:30:00.000Z"
    }
  }
}
```

---

### Example 5: Execute Custom JavaScript

**ChatGPT Prompt**:
> "Get the page title and meta description from https://example.com"

**API Request**:
```json
POST /api/v1/browser/automate
{
  "url": "https://example.com",
  "actions": [
    {
      "type": "evaluate",
      "code": "() => ({ title: document.title, description: document.querySelector('meta[name=\"description\"]')?.content })"
    }
  ],
  "captureConsole": true,
  "headless": true,
  "timeout": 30000
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "data": {
    "url": "https://example.com",
    "error": "Detailed error information",
    "metadata": {
      "duration": 1234,
      "timestamp": "2025-10-22T21:30:00.000Z"
    }
  }
}
```

### Common Errors

#### 1. Authentication Failed (403)
```json
{
  "error": "Invalid authentication token",
  "message": "Authentication failed. Please check your credentials."
}
```

**Solution**: Verify your Bearer token is correct.

---

#### 2. Rate Limit Exceeded (429)
```json
{
  "error": "Too many authentication failures",
  "retryAfter": 45
}
```

**Solution**: Wait `retryAfter` seconds before retrying.

---

#### 3. Browser Automation Timeout
```json
{
  "success": false,
  "error": "Navigation timeout",
  "message": "Page failed to load within timeout period",
  "data": {
    "url": "https://slow-website.com",
    "metadata": {
      "duration": 30000
    }
  }
}
```

**Solution**: Increase `timeout` parameter or check if the URL is accessible.

---

#### 4. Invalid URL
```json
{
  "success": false,
  "error": "Invalid URL",
  "message": "The provided URL could not be accessed"
}
```

**Solution**: Verify the URL is valid and accessible.

---

#### 5. Selector Not Found
```json
{
  "success": false,
  "error": "Element not found",
  "message": "Could not find element with selector: input[name='email']"
}
```

**Solution**: Verify the CSS selector is correct or add a `wait` action before trying to interact with the element.

---

## Best Practices

### 1. Use Correlation IDs

Always send a unique `X-Request-ID` header for request tracing:

```http
X-Request-ID: chatgpt-session-123-request-456
```

**Benefits**:
- End-to-end request tracing
- Easier debugging
- Better observability

---

### 2. Set Appropriate Timeouts

**Recommended timeouts**:
- Simple page loads: 15-30 seconds
- Complex interactions: 30-60 seconds
- Heavy JavaScript apps: 60-90 seconds

```json
{
  "timeout": 30000
}
```

---

### 3. Use Headless Mode in Production

```json
{
  "headless": true
}
```

**Benefits**:
- Better performance
- Lower resource usage
- No GUI dependencies

---

### 4. Capture Only What You Need

Enable only the features you need to reduce response size:

```json
{
  "captureConsole": true,    // Only if you need console logs
  "captureNetwork": false,   // Only if you need network logs
  "captureScreenshot": false // Only if you need screenshots
}
```

---

### 5. Handle Errors Gracefully

Always check the `success` field before processing `data`:

```javascript
const response = await fetch('/api/v1/browser/automate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(request)
});

const result = await response.json();

if (result.success) {
  // Process result.data
  console.log('Console logs:', result.data.consoleLogs);
} else {
  // Handle error
  console.error('Error:', result.error);
}
```

---

### 6. Optimize for Performance

**Tips**:
- Use `waitForSelector` instead of fixed `wait` actions
- Batch multiple actions in a single request
- Cache responses when appropriate
- Use mobile viewport for smaller screenshots

```json
{
  "viewport": { "width": 375, "height": 667 }
}
```

---

## Testing

### Running the Test Suite

```bash
cd /Users/benkennon/JARVIS_AI/control-plane
npx tsx test-chatgpt-endpoints.ts
```

### Test Coverage

The test suite includes:

1. ✅ Health Check (No Auth)
2. ✅ Health Check (With Auth)
3. ✅ Browser Module - Console Collection
4. ✅ Browser Module - Network Monitoring
5. ✅ Direct Browser Endpoint - Screenshot
6. ✅ Browser Actions (Type & Click)
7. ✅ Authentication Failure Test
8. ✅ Correlation ID Tracking

**All tests pass with 100% success rate**

---

## Quick Reference

### Endpoint Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/health` | GET | Health check | Optional |
| `/api/v1/execute` | POST | Module router (recommended) | ✅ Required |
| `/api/v1/browser/automate` | POST | Direct browser automation | ✅ Required |

### Common Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | - | **Required**: URL to navigate to |
| `timeout` | number | 30000 | Timeout in milliseconds |
| `headless` | boolean | true | Run browser in headless mode |
| `captureConsole` | boolean | false | Capture console logs |
| `captureNetwork` | boolean | false | Capture network requests |
| `captureScreenshot` | boolean | false | Take screenshot |
| `viewport` | object | 1920x1080 | Custom viewport size |
| `actions` | array | [] | Browser actions to perform |

---

## Support

For issues or questions:

1. Check the test suite: `test-chatgpt-endpoints.ts`
2. Review the browser automation guide: `BROWSER_AUTOMATION_INTEGRATION.md`
3. Check the deployment guide: `DEPLOYMENT_AND_SCALING_GUIDE.md`
4. Review the operations manual: `BROWSER_AUTOMATION_OPERATIONS_MANUAL.md`

---

## Version Information

- **API Version**: v1
- **Control Plane Version**: 2.0
- **Browser Engine**: Chromium (via Playwright)
- **Last Updated**: 2025-10-22

---

## Example ChatGPT Custom Action Configuration

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "JARVIS Control Plane API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "http://localhost:5001"
    }
  ],
  "paths": {
    "/api/v1/execute": {
      "post": {
        "operationId": "executeModule",
        "summary": "Execute a module action",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "module": {
                    "type": "string",
                    "description": "Module name (e.g., browser, music)"
                  },
                  "action": {
                    "type": "string",
                    "description": "Action to perform (e.g., inspect, automate)"
                  },
                  "params": {
                    "type": "object",
                    "description": "Module-specific parameters"
                  }
                },
                "required": ["module", "action", "params"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          }
        },
        "security": [
          {
            "BearerAuth": []
          }
        ]
      }
    }
  },
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer"
      }
    }
  }
}
```

---

**🎉 You're now ready to integrate ChatGPT with JARVIS Control Plane!**
