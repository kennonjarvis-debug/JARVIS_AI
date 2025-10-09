# Quick Reference

**Jarvis + AI DAWG - Command Quick Reference**
**Last Updated:** 2025-10-08

---

## Table of Contents

- [Common Commands](#common-commands)
- [API Endpoints](#api-endpoints)
- [Module Commands](#module-commands)
- [Environment Variables](#environment-variables)
- [Useful Scripts](#useful-scripts)
- [Troubleshooting Commands](#troubleshooting-commands)

---

## Common Commands

### Start Services

```bash
# AI DAWG Backend
cd /Users/benkennon/ai-dawg-v0.1 && npm run dev

# Jarvis Control Plane
npm run dev

# Dashboard
cd /Users/benkennon/Jarvis/dashboard && ./launch-dashboard.sh
```

### Health Checks

```bash
# Jarvis basic health
curl http://localhost:4000/health

# Jarvis detailed health
curl http://localhost:4000/health/detailed

# AI DAWG modules
curl http://localhost:3001/api/v1/modules

# AI DAWG health
curl http://localhost:3001/api/v1/modules/health/all
```

### Database

```bash
# Connect to database
psql aidawg

# Run migrations
cd /Users/benkennon/ai-dawg-v0.1 && npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Reset database
npx prisma migrate reset
```

### Redis

```bash
# Check Redis
redis-cli ping

# View all keys
redis-cli KEYS '*'

# Get value
redis-cli GET key-name

# Clear all data
redis-cli FLUSHDB
```

---

## API Endpoints

### Jarvis Control Plane (Port 4000)

```bash
# Health check
GET http://localhost:4000/health

# Detailed health
GET http://localhost:4000/health/detailed

# Execute command
POST http://localhost:4000/api/v1/execute
Headers:
  Authorization: Bearer your-token
  Content-Type: application/json
Body:
  {
    "module": "music",
    "action": "generate-music",
    "params": {"prompt": "lofi beat"}
  }
```

### AI DAWG Backend (Port 3001)

```bash
# List modules
GET http://localhost:3001/api/v1/modules

# Get module info
GET http://localhost:3001/api/v1/modules/music

# Module health
GET http://localhost:3001/api/v1/modules/music/health

# All module health
GET http://localhost:3001/api/v1/modules/health/all

# Execute command
POST http://localhost:3001/api/v1/jarvis/execute
Headers:
  Content-Type: application/json
Body:
  {
    "module": "music",
    "action": "generate-music",
    "params": {...}
  }
```

---

## Module Commands

### Music Module

```bash
# Generate music
curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"music","action":"generate-music","params":{"prompt":"lofi beat","duration":60}}'

# Analyze vocal
curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"music","action":"analyze-vocal","params":{"audioUrl":"https://..."}}'

# Get usage stats
curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"music","action":"get-usage-stats","params":{}}'
```

### Marketing Module

```bash
# Get metrics
curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"marketing","action":"get-metrics","params":{}}'

# Run campaign
curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"marketing","action":"run-campaign","params":{"campaignType":"email"}}'

# Forecast revenue
curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"marketing","action":"forecast-revenue","params":{"months":6}}'
```

### Engagement Module

```bash
# Analyze sentiment
curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"engagement","action":"analyze-sentiment","params":{"days":7}}'

# Check churn risk
curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"engagement","action":"check-churn-risk","params":{"userId":"user123"}}'
```

### Automation Module

```bash
# Aggregate metrics
curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"automation","action":"aggregate-metrics","params":{}}'

# Execute workflow
curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"automation","action":"execute-workflow","params":{"workflowId":"daily-report"}}'
```

---

## Environment Variables

### Jarvis

```bash
JARVIS_PORT=4000
AI_DAWG_BACKEND_URL=http://localhost:3001
JARVIS_AUTH_TOKEN=your-secret-token
NODE_ENV=development
LOG_LEVEL=info
```

### AI DAWG

```bash
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/aidawg
REDIS_URL=redis://localhost:6379
NODE_ENV=development
S3_BUCKET=aidawg-storage
SUNO_API_KEY=your-suno-key
```

---

## Useful Scripts

### Development

```bash
# Start with hot reload
npm run dev

# Build for production
npm run build

# Start production
npm start

# Run tests
npm test

# Type check
npm run type-check

# Lint code
npm run lint
```

### Docker

```bash
# Build image
docker build -t jarvis:latest .

# Run container
docker run -p 4000:4000 -e JARVIS_AUTH_TOKEN=token jarvis:latest

# Docker Compose
docker-compose up -d
docker-compose logs -f
docker-compose down
```

### Database

```bash
# Create migration
npx prisma migrate dev --name add_users_table

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

---

## Troubleshooting Commands

### Check Services

```bash
# Check if services are running
lsof -i :4000  # Jarvis
lsof -i :3001  # AI DAWG
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Check processes
ps aux | grep node
ps aux | grep postgres
ps aux | grep redis
```

### View Logs

```bash
# Jarvis logs
tail -f /Users/benkennon/Jarvis/logs/jarvis.log

# AI DAWG logs
tail -f /Users/benkennon/ai-dawg-v0.1/logs/backend.log

# MCP logs (Claude Desktop)
tail -f ~/Library/Logs/Claude/mcp-*.log

# Filter for errors
tail -f logs/jarvis.log | grep ERROR
```

### Kill Processes

```bash
# Kill by port
lsof -ti:4000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Kill by name
pkill -f "node.*jarvis"
pkill -f "node.*ai-dawg"
```

### Database Queries

```bash
# Connect to database
psql aidawg

# List tables
\dt

# Describe table
\d users

# Run query
SELECT * FROM users LIMIT 5;

# Exit
\q
```

### Redis Commands

```bash
# List all keys
redis-cli KEYS '*'

# Get key value
redis-cli GET mykey

# Delete key
redis-cli DEL mykey

# Clear all
redis-cli FLUSHDB

# Get info
redis-cli INFO
```

---

## Network Debugging

```bash
# Test connection
curl -v http://localhost:4000/health

# Test with timeout
curl --max-time 5 http://localhost:4000/health

# Follow redirects
curl -L http://localhost:4000

# Show headers only
curl -I http://localhost:4000/health

# Test POST
curl -X POST http://localhost:4000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"module":"test","action":"ping","params":{}}'
```

---

## Git Commands

```bash
# Create feature branch
git checkout -b feature/my-feature

# Stage changes
git add .

# Commit
git commit -m "feat: add new feature"

# Push
git push origin feature/my-feature

# Pull latest
git pull origin main

# View status
git status

# View changes
git diff
```

---

## Useful Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Jarvis aliases
alias jstart='cd /Users/benkennon/Jarvis && npm run dev'
alias jlogs='tail -f /Users/benkennon/Jarvis/logs/jarvis.log'
alias jhealth='curl http://localhost:4000/health | jq'

# AI DAWG aliases
alias astart='cd /Users/benkennon/ai-dawg-v0.1 && npm run dev'
alias alogs='tail -f /Users/benkennon/ai-dawg-v0.1/logs/backend.log'
alias ahealth='curl http://localhost:3001/api/v1/modules/health/all | jq'

# Database aliases
alias dbconnect='psql aidawg'
alias dbmigrate='cd /Users/benkennon/ai-dawg-v0.1 && npx prisma migrate deploy'

# Service management
alias services-start='brew services start postgresql@15 && brew services start redis'
alias services-stop='brew services stop postgresql@15 && brew services stop redis'
```

---

## Claude Desktop MCP

```bash
# Install MCP server
cd /Users/benkennon/Jarvis
./scripts/install-claude-mcp.sh

# Test MCP server
npx tsx src/integrations/claude/mcp-server.ts

# View MCP logs
tail -f ~/Library/Logs/Claude/mcp-*.log

# View MCP config
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

---

## Performance Monitoring

```bash
# Check CPU and memory
top

# Check specific process
top -pid $(lsof -ti:4000)

# Memory usage
ps aux | grep node | awk '{print $6}'

# Disk usage
df -h

# Network connections
netstat -an | grep LISTEN
```

---

## Quick Tests

```bash
# Test Jarvis health
curl http://localhost:4000/health && echo "✅ Jarvis healthy" || echo "❌ Jarvis down"

# Test AI DAWG health
curl http://localhost:3001/api/v1/modules && echo "✅ AI DAWG healthy" || echo "❌ AI DAWG down"

# Test database
psql aidawg -c "SELECT 1" && echo "✅ Database healthy" || echo "❌ Database down"

# Test Redis
redis-cli ping && echo "✅ Redis healthy" || echo "❌ Redis down"

# Full system check
./scripts/system-check.sh  # (if exists)
```

---

## Documentation Links

- [Architecture](./ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Getting Started](./GETTING_STARTED.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Contributing](./CONTRIBUTING.md)
- [Module SDK Guide](../ai-dawg-v0.1/docs/MODULE_SDK_GUIDE.md)
- [Claude MCP Setup](./CLAUDE_DESKTOP_SETUP.md)
- [Wave 4 Completion](./WAVE4_COMPLETION.md)

---

**Last Updated:** 2025-10-08

