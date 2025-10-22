# JARVIS Bridge API

Secure local system bridge for JARVIS AI agents. Provides controlled access to execute whitelisted commands and read files on the local system.

## Features

- ✅ **Bearer Token Authentication** - Secure API access
- ✅ **Command Whitelisting** - Only allowed commands can be executed
- ✅ **Path Whitelisting** - Only allowed paths can be read
- ✅ **Input Sanitization** - Protection against injection attacks
- ✅ **Rate Limiting Ready** - Designed for production security
- ✅ **Structured Logging** - JSON logs for monitoring
- ✅ **Graceful Shutdown** - Proper cleanup on termination
- ✅ **TypeScript** - Full type safety

## Quick Start

### 1. Installation

```bash
cd packages/bridge-api
pnpm install
```

### 2. Configuration

```bash
# Copy example environment file
cp .env.example .env

# Generate a secure bearer token
openssl rand -base64 32

# Edit .env and set BRIDGE_BEARER_TOKEN
```

### 3. Run

```bash
# Development mode (hot reload)
pnpm dev

# Production build and run
pnpm build
pnpm start
```

## API Endpoints

### GET /health

Health check endpoint (no authentication required).

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-22T10:00:00.000Z",
  "uptime": 123456,
  "version": "1.0.0"
}
```

### POST /run

Execute a whitelisted command.

**Authentication:** Bearer token required

**Request:**
```json
{
  "cmd": "git status"
}
```

**Response:**
```json
{
  "success": true,
  "output": "On branch main...",
  "code": 0
}
```

**Example:**
```bash
curl -X POST http://localhost:5555/run \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"git status"}'
```

### POST /read

Read a text file from an allowed path.

**Authentication:** Bearer token required

**Request:**
```json
{
  "path": "/tmp/test.txt"
}
```

**Response:**
```json
{
  "success": true,
  "content": "file contents here..."
}
```

**Example:**
```bash
curl -X POST http://localhost:5555/read \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path":"/tmp/test.txt"}'
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BRIDGE_PORT` | No | `5555` | Server port |
| `BRIDGE_BEARER_TOKEN` | **Yes** | - | Bearer token for authentication (min 32 chars) |
| `ALLOWED_COMMANDS` | No | See below | Comma-separated list of allowed commands |
| `ALLOWED_PATHS` | No | `$HOME,/tmp,/var/tmp` | Comma-separated list of allowed paths |
| `MAX_FILE_SIZE` | No | `10485760` | Maximum file size in bytes (10MB) |
| `CORS_ORIGIN` | No | `http://localhost:3000` | CORS origin |
| `NODE_ENV` | No | `development` | Environment (development/production) |

### Default Allowed Commands

```
git status, git diff, git log
ls, pwd, whoami, date, echo
cat, head, tail, grep, find, wc
du, df, ps, top, uname, which
node --version, npm --version, pnpm --version
```

### Security Best Practices

1. **Generate Strong Tokens**
   ```bash
   openssl rand -base64 32
   ```

2. **Limit Allowed Commands**
   ```bash
   ALLOWED_COMMANDS="git status,ls,pwd"
   ```

3. **Restrict File Access**
   ```bash
   ALLOWED_PATHS="/home/user/jarvis,/tmp"
   ```

4. **Use HTTPS in Production**
   - Deploy behind nginx/Apache with SSL
   - Or use a reverse proxy with TLS

5. **Monitor Logs**
   - All requests are logged with IP addresses
   - Failed authentication attempts are logged

## Development

### Project Structure

```
packages/bridge-api/
├── src/
│   ├── index.ts              # Main server
│   ├── middleware/
│   │   └── auth.ts           # Bearer token auth
│   ├── routes/
│   │   ├── health.ts         # Health check
│   │   ├── run.ts            # Command execution
│   │   └── read.ts           # File reading
│   ├── utils/
│   │   ├── config.ts         # Configuration
│   │   └── logger.ts         # Logging
│   └── types/
│       └── index.ts          # TypeScript types
├── package.json
├── tsconfig.json
├── openapi.yaml              # OpenAPI spec
├── .env.example
└── README.md
```

### Scripts

```bash
# Development
pnpm dev          # Start with hot reload

# Production
pnpm build        # Compile TypeScript
pnpm start        # Run compiled code

# Utilities
pnpm lint         # Run ESLint
pnpm test         # Run tests
pnpm clean        # Remove dist/
```

## Security

### Command Execution Safety

1. **Whitelist Only** - Commands must be explicitly allowed
2. **Sanitization** - Dangerous characters (`; && || | > < \` $ ()`) are blocked
3. **Timeout** - Commands timeout after 30 seconds
4. **Buffer Limit** - Output limited to 10MB

### File Reading Safety

1. **Path Whitelisting** - Only allowed paths can be accessed
2. **No Directory Traversal** - Paths are resolved to absolute paths
3. **File Size Limit** - Files larger than MAX_FILE_SIZE are rejected
4. **Text Files Only** - Binary files may cause issues

### Authentication

- Bearer token must be at least 32 characters
- Token is validated on every protected request
- Failed attempts are logged with IP address

## Integration with JARVIS

### Example: ChatGPT Custom Action

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "JARVIS Bridge",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "http://localhost:5555"
    }
  ],
  "paths": {
    "/run": {
      "post": {
        "operationId": "runCommand",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "cmd": { "type": "string" }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### Example: Agent Integration

```typescript
import axios from 'axios';

const bridgeClient = axios.create({
  baseURL: 'http://localhost:5555',
  headers: {
    'Authorization': `Bearer ${process.env.BRIDGE_BEARER_TOKEN}`,
  },
});

// Execute command
const result = await bridgeClient.post('/run', {
  cmd: 'git status',
});

// Read file
const file = await bridgeClient.post('/read', {
  path: '/tmp/config.json',
});
```

## Troubleshooting

### "Configuration validation failed"

Make sure `BRIDGE_BEARER_TOKEN` is set and at least 32 characters long.

### "Command not whitelisted"

Add the command to `ALLOWED_COMMANDS` in `.env`:
```bash
ALLOWED_COMMANDS="git status,ls,pwd,your-command-here"
```

### "Path not allowed"

Add the path to `ALLOWED_PATHS` in `.env`:
```bash
ALLOWED_PATHS="/home/user,/tmp,/your/path/here"
```

### "File too large"

Increase `MAX_FILE_SIZE` or split the file into smaller chunks.

## Contributing

1. Follow TypeScript strict mode
2. Add tests for new features
3. Update OpenAPI spec if adding endpoints
4. Document security implications

## License

MIT License - Part of JARVIS_AI monorepo

## Related

- [JARVIS_AI Main Repository](https://github.com/kennonjarvis-debug/JARVIS_AI)
- [OpenAPI Specification](./openapi.yaml)
- [Environment Configuration](./.env.example)
