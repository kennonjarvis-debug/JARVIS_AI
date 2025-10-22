# Deployment Guide - Jarvis Dashboard

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Code linted and formatted
- [ ] Security vulnerabilities checked (`npm audit`)
- [ ] Dependencies updated to latest stable versions

### Configuration
- [ ] Environment variables configured (`.env`)
- [ ] API endpoints point to production services
- [ ] CORS origins set correctly
- [ ] Rate limiting enabled and configured
- [ ] Cache TTLs reviewed for production load
- [ ] Logging level set appropriately

### Security
- [ ] SSL/TLS certificates obtained and configured
- [ ] Secrets stored securely (not in code)
- [ ] API keys rotated and secured
- [ ] HTTPS enforced for all connections
- [ ] CSP headers configured
- [ ] Input validation implemented
- [ ] XSS protection enabled

### Performance
- [ ] Bundle size optimized (< 500KB initial load)
- [ ] Images optimized and compressed
- [ ] CDN configured for static assets
- [ ] Gzip/Brotli compression enabled
- [ ] Caching headers set correctly
- [ ] Database queries optimized
- [ ] Connection pooling configured

### Monitoring
- [ ] Health check endpoints tested
- [ ] Error tracking configured (Sentry/Rollbar)
- [ ] Performance monitoring setup (DataDog/New Relic)
- [ ] Log aggregation configured
- [ ] Alerting rules defined
- [ ] Uptime monitoring configured

### Data & Backup
- [ ] Database backup strategy implemented
- [ ] Conversation history backup plan
- [ ] Disaster recovery plan documented
- [ ] Data retention policy defined
- [ ] GDPR/privacy compliance reviewed

## Deployment Options

### Option 1: Vercel + Railway (Recommended)

#### Frontend (Vercel)
```bash
cd frontend
npm install vercel -g
vercel login
vercel --prod
```

Configuration:
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`
- Environment Variables: `NEXT_PUBLIC_API_URL`

#### Backend (Railway)
```bash
cd backend
npm install -g @railway/cli
railway login
railway init
railway up
```

Configuration:
- Start Command: `npm start`
- Environment Variables: See `.env.example`
- Health Check: `/health`

### Option 2: Docker Deployment

#### Build Images
```bash
# Backend
cd backend
docker build -t jarvis-dashboard-api:latest .

# Frontend
cd ../frontend
docker build -t jarvis-dashboard-ui:latest .
```

#### Run with Docker Compose
```bash
cd /Users/benkennon/Jarvis/dashboard
docker-compose up -d
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
      - DASHBOARD_PORT=5001
      - JARVIS_API_URL=${JARVIS_API_URL}
      - AI_DAWG_API_URL=${AI_DAWG_API_URL}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "3003:3003"
    environment:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    depends_on:
      - backend
    restart: unless-stopped
```

### Option 3: PM2 (VPS/EC2)

#### Install PM2
```bash
npm install -g pm2
```

#### Start Services
```bash
# Backend
cd backend
pm2 start npm --name "jarvis-api" -- start

# Frontend
cd ../frontend
npm run build
pm2 start npm --name "jarvis-dashboard" -- start

# Save configuration
pm2 save
pm2 startup
```

#### ecosystem.config.js
```javascript
module.exports = {
  apps: [
    {
      name: 'jarvis-api',
      cwd: './backend',
      script: 'npm',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        DASHBOARD_PORT: 5001
      }
    },
    {
      name: 'jarvis-dashboard',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      }
    }
  ]
};
```

Start with:
```bash
pm2 start ecosystem.config.js
```

## Environment Variables

### Required Variables

```env
# Backend (.env)
NODE_ENV=production
DASHBOARD_PORT=5001
JARVIS_API_URL=https://jarvis.your-domain.com
AI_DAWG_API_URL=https://ai-dawg.your-domain.com
CORS_ORIGINS=https://dashboard.your-domain.com
RATE_LIMIT_ENABLED=true

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

### Optional Variables

```env
# Caching
CACHE_TTL_INSTANCE_ACTIVITY=2000
CACHE_TTL_SYSTEM_HEALTH=3000
CACHE_TTL_BUSINESS_METRICS=5000

# API Settings
API_TIMEOUT=3000
API_RETRY_ATTEMPTS=2
API_RETRY_BASE_DELAY=200

# Monitoring
DEBUG=false
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MINUTES=15
```

## SSL/TLS Configuration

### Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d dashboard.your-domain.com

# Auto-renewal cron job
sudo certbot renew --dry-run
```

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/jarvis-dashboard

# Backend API
server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Frontend
server {
    listen 443 ssl http2;
    server_name dashboard.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/dashboard.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.your-domain.com dashboard.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/jarvis-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Monitoring Setup

### Health Checks

Add to your monitoring service (UptimeRobot, Pingdom, etc.):
- Endpoint: `https://api.your-domain.com/health`
- Interval: 60 seconds
- Timeout: 30 seconds
- Alert on: HTTP status != 200

### Error Tracking (Sentry)

```bash
npm install @sentry/node @sentry/integrations
```

```typescript
// backend/dashboard-api.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Logging (Winston)

```bash
npm install winston winston-daily-rotate-file
```

```typescript
// backend/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      filename: 'logs/dashboard-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d'
    })
  ]
});

export default logger;
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (AWS ALB, Nginx, Cloudflare)
- Run multiple backend instances with PM2 cluster mode
- Use Redis for session storage (replace in-memory Map)
- Implement sticky sessions for WebSocket connections

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Optimize database queries and indexes
- Implement connection pooling
- Use CDN for static assets

### Caching Strategy
- Consider Redis for distributed caching
- Implement cache warming for frequently accessed data
- Use CDN for API responses where appropriate
- Set appropriate cache headers

## Rollback Plan

### Quick Rollback
```bash
# PM2
pm2 stop all
git checkout previous-tag
npm install
pm2 start ecosystem.config.js

# Docker
docker-compose down
git checkout previous-tag
docker-compose up -d
```

### Database Rollback
```bash
# If using migrations
npm run db:rollback

# Restore from backup
mongorestore --uri="mongodb://..." --db=jarvis-dashboard backup/
```

## Post-Deployment Verification

### Smoke Tests
```bash
# Backend health
curl https://api.your-domain.com/health

# Dashboard loading
curl -I https://dashboard.your-domain.com

# Chat endpoint
curl -X POST https://api.your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# Cache stats
curl https://api.your-domain.com/api/cache/stats
```

### Performance Tests
```bash
# Load testing with Artillery
npm install -g artillery
artillery quick --count 100 --num 10 https://api.your-domain.com/health
```

### Monitoring Checks
- [ ] Error rate < 0.1%
- [ ] Response time < 500ms (p95)
- [ ] CPU usage < 70%
- [ ] Memory usage < 80%
- [ ] Disk usage < 80%
- [ ] Cache hit ratio > 80%

## Troubleshooting Production Issues

### High CPU Usage
```bash
# Check processes
top
htop

# PM2 monitoring
pm2 monit

# Node.js profiling
node --prof backend/dashboard-api.ts
```

### Memory Leaks
```bash
# Monitor memory over time
pm2 monit

# Heap snapshot
node --inspect backend/dashboard-api.ts
# Open chrome://inspect
```

### Slow Responses
```bash
# Check logs for slow queries
tail -f logs/dashboard-*.log | grep slow

# Monitor cache hit rate
curl https://api.your-domain.com/api/cache/stats

# Database query analysis
# Check database slow query log
```

## Maintenance Windows

### Recommended Schedule
- Weekly: Security updates (automated)
- Monthly: Dependency updates
- Quarterly: Major version upgrades
- As needed: Performance optimization

### Maintenance Checklist
- [ ] Notify users 24 hours in advance
- [ ] Backup all data
- [ ] Test updates in staging
- [ ] Schedule during low-traffic hours
- [ ] Monitor closely post-maintenance
- [ ] Have rollback plan ready

## Support Contacts

### Emergency Contacts
- DevOps: your-email@domain.com
- Backend: backend-team@domain.com
- Frontend: frontend-team@domain.com
- On-call: +1-XXX-XXX-XXXX

### Escalation Path
1. Check logs and monitoring
2. Attempt automated recovery
3. Contact on-call engineer
4. Escalate to team lead if not resolved in 30min
5. Executive notification if P0 incident > 2 hours

---

**Document Version**: 1.0
**Last Updated**: 2025-10-08
**Next Review**: 2025-11-08
