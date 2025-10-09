# Troubleshooting Guide

**Jarvis + AI DAWG - Common Issues and Solutions**
**Last Updated:** 2025-10-08

---

## Table of Contents

1. [Connection Issues](#connection-issues)
2. [Module Execution Errors](#module-execution-errors)
3. [Health Check Failures](#health-check-failures)
4. [Performance Issues](#performance-issues)
5. [Database Problems](#database-problems)
6. [Redis Issues](#redis-issues)
7. [MCP Integration Issues](#mcp-integration-issues)
8. [Deployment Problems](#deployment-problems)

---

## Connection Issues

### Problem: Cannot connect to Jarvis (ECONNREFUSED)

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:4000
```

**Solutions:**

1. **Check if Jarvis is running:**
```bash
lsof -i :4000
# Should show node process
```

2. **Start Jarvis:**
```bash
cd /Users/benkennon/Jarvis
npm run dev
```

3. **Check logs:**
```bash
tail -f logs/jarvis.log
```

4. **Verify port not in use:**
```bash
lsof -ti:4000 | xargs kill -9  # Kill existing process
npm run dev
```

---

### Problem: Cannot connect to AI DAWG Backend

**Symptoms:**
```
Error: AI DAWG backend not responding at http://localhost:3001
```

**Solutions:**

1. **Check if backend is running:**
```bash
lsof -i :3001
```

2. **Start backend:**
```bash
cd /Users/benkennon/ai-dawg-v0.1
npm run dev
```

3. **Test health endpoint:**
```bash
curl http://localhost:3001/api/v1/modules
```

4. **Check backend logs:**
```bash
tail -f /Users/benkennon/ai-dawg-v0.1/logs/backend.log
```

---

## Module Execution Errors

### Problem: Module not found

**Symptoms:**
```json
{
  "success": false,
  "error": "Module 'xyz' not found"
}
```

**Solutions:**

1. **List available modules:**
```bash
curl http://localhost:3001/api/v1/modules
```

2. **Check module registration:**
```bash
# Check if module is in module-loader.ts
cat /Users/benkennon/ai-dawg-v0.1/src/modules/module-loader.ts
```

3. **Restart backend after adding module:**
```bash
cd /Users/benkennon/ai-dawg-v0.1
npm run dev
```

---

### Problem: Command not found

**Symptoms:**
```json
{
  "success": false,
  "error": "Command 'do-something' not found in module 'mymodule'"
}
```

**Solutions:**

1. **Check module commands:**
```bash
curl http://localhost:3001/api/v1/modules/mymodule
```

2. **Verify command registration:**
```typescript
// In module initialize()
this.registerCommand({
  name: 'do-something',  // Must match exactly
  handler: this.handleDoSomething.bind(this),
  ...
});
```

3. **Check for typos in action name:**
```bash
# Correct
curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"mymodule","action":"do-something",...}'

# Wrong
curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"mymodule","action":"doSomething",...}'
```

---

### Problem: Missing required parameters

**Symptoms:**
```json
{
  "success": false,
  "error": "Missing required parameter: prompt"
}
```

**Solutions:**

1. **Check required params:**
```bash
curl http://localhost:3001/api/v1/modules/music
# Look at command.params array
```

2. **Include all required params:**
```bash
curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{
    "module":"music",
    "action":"generate-music",
    "params":{"prompt":"lofi beat","duration":60}
  }'
```

---

## Health Check Failures

### Problem: Health check returns "degraded"

**Symptoms:**
```json
{
  "status": "degraded",
  "services": {
    "aidawg_backend": { "status": "down" }
  }
}
```

**Solutions:**

1. **Check individual service:**
```bash
curl http://localhost:3001/api/v1/modules/health/all
```

2. **Check module health:**
```bash
curl http://localhost:3001/api/v1/modules/music/health
```

3. **Review module logs:**
```bash
tail -f logs/backend.log | grep music
```

4. **Check dependencies:**
- PostgreSQL running: `pg_isready`
- Redis running: `redis-cli ping`
- External APIs accessible

---

### Problem: Module health check timeout

**Symptoms:**
```
Health check timeout after 5000ms
```

**Solutions:**

1. **Increase timeout:**
```typescript
// In health-aggregator.ts
const timeout = 10000; // Increase from 5000
```

2. **Optimize health check logic:**
```typescript
// Use shorter timeouts for external checks
async getHealth(): Promise<HealthStatus> {
  try {
    await axios.get('https://api.example.com/health', {
      timeout: 2000  // Short timeout
    });
  } catch {
    // Mark as degraded, not down
    return { status: 'degraded', ... };
  }
}
```

---

## Performance Issues

### Problem: Slow response times

**Symptoms:**
- API requests taking > 5 seconds
- Timeout errors

**Solutions:**

1. **Check database performance:**
```sql
-- PostgreSQL slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

2. **Check Redis memory:**
```bash
redis-cli INFO memory
```

3. **Monitor system resources:**
```bash
# CPU usage
top

# Memory usage
free -h

# Disk I/O
iostat -x 1
```

4. **Enable query logging:**
```typescript
// In Prisma client
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

5. **Add indexes to database:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_jobs_status ON jobs(status);
```

---

### Problem: High memory usage

**Symptoms:**
- Node process using > 1GB RAM
- Out of memory errors

**Solutions:**

1. **Increase Node.js memory limit:**
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

2. **Check for memory leaks:**
```bash
node --inspect dist/main.js
# Open chrome://inspect
# Take heap snapshots
```

3. **Optimize database queries:**
```typescript
// Bad: Loads all records
const users = await prisma.user.findMany();

// Good: Paginate
const users = await prisma.user.findMany({
  take: 100,
  skip: page * 100
});
```

4. **Close database connections:**
```typescript
// In module shutdown()
async shutdown(): Promise<void> {
  await this.db.$disconnect();
}
```

---

## Database Problems

### Problem: Database connection failed

**Symptoms:**
```
Error: Can't reach database server at `localhost:5432`
```

**Solutions:**

1. **Check if PostgreSQL is running:**
```bash
pg_isready -h localhost -p 5432
```

2. **Start PostgreSQL:**
```bash
# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Docker
docker-compose up -d postgres
```

3. **Verify connection string:**
```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test connection
psql postgresql://user:password@localhost:5432/aidawg -c "SELECT 1"
```

4. **Check database exists:**
```bash
psql -U postgres -c "\l" | grep aidawg
```

---

### Problem: Migration failed

**Symptoms:**
```
Error: P1001: Can't reach database server
```

**Solutions:**

1. **Reset migrations:**
```bash
npx prisma migrate reset
```

2. **Run migrations manually:**
```bash
npx prisma migrate deploy
```

3. **Check migration status:**
```bash
npx prisma migrate status
```

4. **Generate Prisma client:**
```bash
npx prisma generate
```

---

## Redis Issues

### Problem: Redis connection refused

**Symptoms:**
```
Error: Redis connection to localhost:6379 failed - connect ECONNREFUSED
```

**Solutions:**

1. **Check if Redis is running:**
```bash
redis-cli ping
# Should return PONG
```

2. **Start Redis:**
```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker-compose up -d redis
```

3. **Verify Redis URL:**
```bash
cat .env | grep REDIS_URL
```

4. **Test connection:**
```bash
redis-cli -u redis://localhost:6379 ping
```

---

### Problem: Redis memory full

**Symptoms:**
```
Error: OOM command not allowed when used memory > 'maxmemory'
```

**Solutions:**

1. **Check memory usage:**
```bash
redis-cli INFO memory | grep used_memory_human
```

2. **Clear cache:**
```bash
redis-cli FLUSHDB
```

3. **Configure eviction policy:**
```bash
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

4. **Increase max memory:**
```bash
redis-cli CONFIG SET maxmemory 2gb
```

---

## MCP Integration Issues

### Problem: Claude Desktop doesn't see tools

**Symptoms:**
- Claude says "I don't have access to those tools"

**Solutions:**

1. **Check MCP config:**
```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

2. **Verify MCP server path:**
```json
{
  "mcpServers": {
    "jarvis-aidawg": {
      "command": "npx",
      "args": ["tsx", "/Users/benkennon/Jarvis/src/integrations/claude/mcp-server.ts"]
    }
  }
}
```

3. **Restart Claude Desktop:**
- Quit completely (Cmd+Q)
- Wait 5 seconds
- Relaunch

4. **Check MCP server logs:**
```bash
tail -f ~/Library/Logs/Claude/mcp-*.log
```

5. **Test MCP server manually:**
```bash
cd /Users/benkennon/Jarvis
npx tsx src/integrations/claude/mcp-server.ts
# Should start without errors
# Ctrl+C to exit
```

---

### Problem: MCP tools fail when called

**Symptoms:**
- Tools appear but execution fails

**Solutions:**

1. **Check backend is running:**
```bash
curl http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"test","action":"ping","params":{}}'
```

2. **Check MCP server logs:**
```bash
tail -f ~/Library/Logs/Claude/mcp-jarvis-aidawg.log
```

3. **Verify environment variables:**
```bash
# In claude_desktop_config.json
"env": {
  "AI_DAWG_BACKEND_URL": "http://localhost:3001"
}
```

---

## Deployment Problems

### Problem: Docker container won't start

**Symptoms:**
```
Error: Container exited with code 1
```

**Solutions:**

1. **Check container logs:**
```bash
docker logs <container-id>
```

2. **Check environment variables:**
```bash
docker inspect <container-id> | grep Env
```

3. **Test image locally:**
```bash
docker run -it --rm jarvis:latest /bin/sh
npm run start
```

4. **Rebuild image:**
```bash
docker build --no-cache -t jarvis:latest .
```

---

### Problem: Kubernetes pod crashlooping

**Symptoms:**
```
NAME                      READY   STATUS             RESTARTS
jarvis-7d9f8c4b5-abcde   0/1     CrashLoopBackOff   5
```

**Solutions:**

1. **Check pod logs:**
```bash
kubectl logs jarvis-7d9f8c4b5-abcde -n jarvis
```

2. **Check pod events:**
```bash
kubectl describe pod jarvis-7d9f8c4b5-abcde -n jarvis
```

3. **Check secrets:**
```bash
kubectl get secrets -n jarvis
kubectl describe secret jarvis-secret -n jarvis
```

4. **Check resource limits:**
```bash
kubectl top pods -n jarvis
```

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Service not running | Start the service |
| `ETIMEDOUT` | Network timeout | Check network/firewall |
| `Module not found` | Module not registered | Check module-loader.ts |
| `Missing required parameter` | Invalid params | Check API documentation |
| `Database connection failed` | PostgreSQL down | Start PostgreSQL |
| `Redis connection failed` | Redis down | Start Redis |
| `Rate limit exceeded` | Too many requests | Wait or increase limit |
| `Authentication failed` | Invalid token | Check JARVIS_AUTH_TOKEN |

---

## Getting Help

If you're still stuck:

1. **Check logs:**
   - Jarvis: `/Users/benkennon/Jarvis/logs/jarvis.log`
   - AI DAWG: `/Users/benkennon/ai-dawg-v0.1/logs/backend.log`
   - MCP: `~/Library/Logs/Claude/mcp-*.log`

2. **Test each component:**
   ```bash
   # Test Jarvis
   curl http://localhost:4000/health

   # Test AI DAWG
   curl http://localhost:3001/api/v1/modules

   # Test database
   psql $DATABASE_URL -c "SELECT 1"

   # Test Redis
   redis-cli ping
   ```

3. **Review documentation:**
   - [Architecture](./ARCHITECTURE.md)
   - [API Documentation](./API_DOCUMENTATION.md)
   - [Deployment Guide](./DEPLOYMENT_GUIDE.md)

4. **Create GitHub issue** with:
   - Error message
   - Relevant logs
   - Steps to reproduce
   - Environment details

