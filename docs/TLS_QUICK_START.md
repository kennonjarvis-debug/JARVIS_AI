# TLS/HTTPS Quick Start Guide

**5-minute setup for Jarvis AI production TLS/HTTPS**

## Prerequisites

- Domain configured (DNS A records pointing to server)
- Ports 80/443 open in firewall
- Docker & docker-compose installed

## Quick Setup

### 1. Configure Environment

```bash
cd /Users/benkennon/Jarvis

# Copy and edit .env
cp .env.example .env

# Update these values:
# DOMAINS=jarvis.ai,www.jarvis.ai,api.jarvis.ai
# LETSENCRYPT_EMAIL=admin@jarvis.ai
# LETSENCRYPT_STAGING=1  # Start with staging
# TRUST_PROXY=true
# BEHIND_PROXY=true
```

### 2. Run Setup Script

```bash
cd infra/docker

# Initialize Let's Encrypt (with staging certificates)
./certbot/init-letsencrypt.sh
```

This will:
- Create necessary directories
- Generate DH parameters
- Request staging certificates
- Start nginx with TLS

### 3. Test

```bash
# Test HTTPS (ignore certificate warning - it's staging)
curl -k https://jarvis.ai/health

# Check certificate
docker-compose exec certbot certbot certificates

# Test SSL Labs (will show warning for staging cert)
# https://www.ssllabs.com/ssltest/analyze.html?d=jarvis.ai
```

### 4. Switch to Production

Once staging works:

```bash
# Update .env
export LETSENCRYPT_STAGING=0

# Re-run setup script
./certbot/init-letsencrypt.sh
```

### 5. Add Middleware to Express

Edit `/Users/benkennon/Jarvis/src/main.ts`:

```typescript
import { tlsSecurityStack, logTLSConfig } from './middleware/tls-enforcement';

// Log TLS config on startup
logTLSConfig();

// Add TLS middleware before routes
app.use(tlsSecurityStack());
```

## Common Commands

```bash
# Check certificate status
docker-compose exec certbot certbot certificates

# Test renewal (dry run)
docker-compose exec certbot certbot renew --dry-run

# Force renewal
docker-compose exec certbot certbot renew --force-renewal

# View nginx logs
docker-compose logs -f nginx

# View certbot logs
docker-compose logs -f certbot

# Reload nginx (after config changes)
docker-compose exec nginx nginx -s reload

# Restart all services
docker-compose restart
```

## Testing Checklist

- [ ] HTTPS works: `curl https://jarvis.ai/health`
- [ ] HTTP redirects to HTTPS: `curl -I http://jarvis.ai`
- [ ] All subdomains work (www, api)
- [ ] HSTS header present: `curl -I https://jarvis.ai | grep Strict-Transport-Security`
- [ ] SSL Labs grade: A+ (https://www.ssllabs.com/ssltest/)
- [ ] Security headers: A+ (https://securityheaders.com/)

## Troubleshooting

### Certificate request fails

```bash
# Check DNS
dig +short jarvis.ai

# Check port 80 accessible
curl http://jarvis.ai/.well-known/acme-challenge/test

# Check logs
docker-compose logs certbot
```

### Nginx won't start

```bash
# Test config
docker-compose exec nginx nginx -t

# Check certificate paths
docker-compose exec nginx ls -la /etc/letsencrypt/live/
```

### Redirect loop

```bash
# Verify TRUST_PROXY is true in .env
grep TRUST_PROXY .env

# Check X-Forwarded-Proto header
docker-compose exec nginx nginx -T | grep X-Forwarded-Proto
```

## Production Checklist

Before going live:

- [ ] DNS configured for all domains
- [ ] Ports 80/443 open in firewall
- [ ] Tested with staging certificates
- [ ] Switched to production certificates
- [ ] All domains accessible via HTTPS
- [ ] HTTP redirects working
- [ ] SSL Labs test passes (A+)
- [ ] Security headers configured
- [ ] Certificate renewal tested
- [ ] Monitoring alerts configured
- [ ] Backup procedure documented

## Next Steps

After deployment:

1. Monitor certificate expiry (30-day threshold)
2. Test renewal: `docker-compose exec certbot certbot renew --dry-run`
3. Set up alerts for certificate expiry
4. Run weekly SSL Labs scans
5. After 30 days, submit to HSTS preload list

## Need Help?

Full documentation: `/Users/benkennon/Jarvis/docs/TLS_SETUP.md`

Common issues:
- DNS not propagated (wait 24-48 hours)
- Port 80 blocked (check firewall)
- Rate limit exceeded (use staging first)
- Nginx config error (check logs)
