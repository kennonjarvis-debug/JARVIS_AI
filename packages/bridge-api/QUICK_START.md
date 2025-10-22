# JARVIS Bridge API - Quick Start Guide

## 1. Generate Bearer Token

```bash
openssl rand -base64 32
```

Example output: `y9mK8vXtQ2pL4nR7wC6uE1aH3jS5dF0gZ8bN9xV2mT4=`

## 2. Create .env File

```bash
cd packages/bridge-api
cp .env.example .env
```

Edit `.env`:
```bash
BRIDGE_PORT=5555
BRIDGE_BEARER_TOKEN=y9mK8vXtQ2pL4nR7wC6uE1aH3jS5dF0gZ8bN9xV2mT4=
NODE_ENV=development
```

## 3. Start the Server

```bash
# From JARVIS_AI root
cd packages/bridge-api
pnpm install
pnpm dev
```

You should see:
```json
{"level":"info","timestamp":"2025-10-22T...",
"message":"JARVIS Bridge API started","port":5555,...}
```

## 4. Test with curl

### Health Check (No Auth)

```bash
curl http://localhost:5555/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-22T10:00:00.000Z",
  "uptime": 12345,
  "version": "1.0.0"
}
```

### Run Command (Requires Auth)

```bash
curl -X POST http://localhost:5555/run \
  -H "Authorization: Bearer y9mK8vXtQ2pL4nR7wC6uE1aH3jS5dF0gZ8bN9xV2mT4=" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"git status"}'
```

Expected response:
```json
{
  "success": true,
  "output": "On branch main\nYour branch is up to date...",
  "code": 0
}
```

### Read File (Requires Auth)

```bash
# Create a test file
echo "Hello from JARVIS Bridge" > /tmp/test.txt

# Read it via API
curl -X POST http://localhost:5555/read \
  -H "Authorization: Bearer y9mK8vXtQ2pL4nR7wC6uE1aH3jS5dF0gZ8bN9xV2mT4=" \
  -H "Content-Type: application/json" \
  -d '{"path":"/tmp/test.txt"}'
```

Expected response:
```json
{
  "success": true,
  "content": "Hello from JARVIS Bridge\n"
}
```

## 5. Test Error Cases

### Unauthorized (No Token)

```bash
curl -X POST http://localhost:5555/run \
  -H "Content-Type: application/json" \
  -d '{"cmd":"ls"}'
```

Expected: `401 Unauthorized`

### Command Not Whitelisted

```bash
curl -X POST http://localhost:5555/run \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"rm -rf /"}'
```

Expected: `403 Forbidden - Command not whitelisted`

### Path Not Allowed

```bash
curl -X POST http://localhost:5555/read \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path":"/etc/passwd"}'
```

Expected: `403 Forbidden - Path not allowed`

## 6. Integration Examples

### Node.js / TypeScript

```typescript
import axios from 'axios';

const bridgeClient = axios.create({
  baseURL: 'http://localhost:5555',
  headers: {
    'Authorization': `Bearer ${process.env.BRIDGE_BEARER_TOKEN}`,
  },
});

// Execute command
async function runCommand(cmd: string) {
  const { data } = await bridgeClient.post('/run', { cmd });
  if (data.success) {
    console.log(data.output);
  } else {
    console.error(data.error);
  }
}

// Read file
async function readFile(path: string) {
  const { data } = await bridgeClient.post('/read', { path });
  if (data.success) {
    return data.content;
  } else {
    throw new Error(data.error);
  }
}

// Usage
await runCommand('git status');
const config = await readFile('/tmp/config.json');
```

### Python

```python
import requests
import os

BRIDGE_URL = "http://localhost:5555"
BEARER_TOKEN = os.getenv("BRIDGE_BEARER_TOKEN")

headers = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "Content-Type": "application/json"
}

# Execute command
response = requests.post(
    f"{BRIDGE_URL}/run",
    headers=headers,
    json={"cmd": "git status"}
)
print(response.json())

# Read file
response = requests.post(
    f"{BRIDGE_URL}/read",
    headers=headers,
    json={"path": "/tmp/test.txt"}
)
print(response.json())
```

## 7. ChatGPT Custom Action Setup

1. Go to ChatGPT Settings → Actions
2. Create New Action
3. Import OpenAPI schema from `openapi.yaml`
4. Set Authentication:
   - Type: Bearer
   - Token: Your `BRIDGE_BEARER_TOKEN`
5. Test the action

## 8. Production Deployment

### Using systemd (Linux)

Create `/etc/systemd/system/jarvis-bridge.service`:

```ini
[Unit]
Description=JARVIS Bridge API
After=network.target

[Service]
Type=simple
User=jarvis
WorkingDirectory=/home/jarvis/JARVIS_AI/packages/bridge-api
Environment=NODE_ENV=production
EnvironmentFile=/home/jarvis/JARVIS_AI/packages/bridge-api/.env
ExecStart=/usr/bin/pnpm start
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable jarvis-bridge
sudo systemctl start jarvis-bridge
sudo systemctl status jarvis-bridge
```

### Using PM2

```bash
cd packages/bridge-api
pnpm build

pm2 start dist/index.js --name jarvis-bridge
pm2 save
pm2 startup
```

### Behind nginx (Recommended for Production)

```nginx
server {
    listen 80;
    server_name bridge.jarvis.local;

    location / {
        proxy_pass http://localhost:5555;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### "Configuration validation failed"
- Check `.env` file exists
- Verify `BRIDGE_BEARER_TOKEN` is set and >= 32 chars

### "EACCES: permission denied"
- Check file permissions
- Add path to `ALLOWED_PATHS` in `.env`

### "Command not whitelisted"
- Add command to `ALLOWED_COMMANDS` in `.env`
- Restart server after changes

### Dependencies not installing
- Run `pnpm install` from JARVIS_AI root
- Check Node.js version (18+ required)

## Next Steps

1. **Customize whitelists** - Edit `ALLOWED_COMMANDS` and `ALLOWED_PATHS`
2. **Add rate limiting** - Use express-rate-limit
3. **Set up HTTPS** - Use nginx or Caddy
4. **Monitor logs** - Pipe to logging service
5. **Add tests** - Create test suite with vitest

## Support

- [Full Documentation](./README.md)
- [OpenAPI Spec](./openapi.yaml)
- [JARVIS_AI Repository](https://github.com/kennonjarvis-debug/JARVIS_AI)
