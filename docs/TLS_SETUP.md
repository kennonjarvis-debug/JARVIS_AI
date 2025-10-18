# TLS/HTTPS Setup Guide for Jarvis AI

Complete guide for deploying production-grade TLS/HTTPS infrastructure for Jarvis AI.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Certificate Management](#certificate-management)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Overview

This setup provides:

- **TLS 1.3/1.2** encryption with modern cipher suites
- **Automated certificate management** via Let's Encrypt
- **HSTS preloading** for maximum security
- **Rate limiting** to prevent abuse
- **OCSP stapling** for fast certificate validation
- **Secure cookie handling** with HttpOnly, Secure, SameSite flags
- **Security headers** (CSP, X-Frame-Options, etc.)
- **Multi-domain support** (jarvis.ai, www.jarvis.ai, api.jarvis.ai)

### Security Headers Configured

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | Force HTTPS for 1 year |
| Content-Security-Policy | (see nginx.conf) | Prevent XSS attacks |
| X-Frame-Options | SAMEORIGIN | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-XSS-Protection | 1; mode=block | Enable browser XSS protection |
| Referrer-Policy | strict-origin-when-cross-origin | Control referer information |

## Architecture

```
Internet (HTTPS)
       ↓
    Port 443
       ↓
┌──────────────────┐
│  Nginx (Alpine)  │  ← TLS Termination
│  - SSL/TLS       │  ← Security Headers
│  - Rate Limiting │  ← HTTP → HTTPS Redirect
└──────────────────┘
       ↓
  Docker Network
       ↓
┌──────────────────┐
│  Jarvis (Node)   │  ← Express API
│  - Port 4000     │  ← TLS Middleware
└──────────────────┘

Certificate Management:
┌──────────────────┐
│  Certbot         │  ← Auto-renewal (2x daily)
│  - Let's Encrypt │  ← Email alerts
└──────────────────┘
```

## Prerequisites

### 1. Domain Configuration

Ensure your domains point to your server:

```bash
# Verify DNS records
dig +short jarvis.ai
dig +short www.jarvis.ai
dig +short api.jarvis.ai
```

All should return your server's IP address.

### 2. Firewall Configuration

Open required ports:

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp    # HTTP (for ACME challenge)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw reload

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 3. Email for Certificate Notifications

Have a valid email address for Let's Encrypt expiry notifications:

```bash
export LETSENCRYPT_EMAIL="admin@jarvis.ai"
```

## Initial Setup

### Step 1: Configure Environment Variables

Add these to your `.env` file:

```bash
# TLS/HTTPS Configuration
DOMAINS=jarvis.ai,www.jarvis.ai,api.jarvis.ai
LETSENCRYPT_EMAIL=admin@jarvis.ai
LETSENCRYPT_STAGING=0  # Set to 1 for testing

# Use 1 for staging (test mode, higher rate limits)
# Use 0 for production (real certificates)

# Notification settings
ENABLE_EMAIL_NOTIFICATIONS=false
NOTIFICATION_EMAIL=alerts@jarvis.ai
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK

# Trust proxy headers (required for nginx)
TRUST_PROXY=true
BEHIND_PROXY=true
```

### Step 2: Test with Let's Encrypt Staging

**IMPORTANT:** Always test with staging first to avoid rate limits!

```bash
# Set staging mode
export LETSENCRYPT_STAGING=1

# Start services
cd /Users/benkennon/Jarvis/infra/docker
docker-compose up -d

# Check logs
docker-compose logs -f certbot
docker-compose logs -f nginx
```

### Step 3: Initialize Certificates

```bash
# Generate DH parameters (one-time, takes 5-10 minutes)
docker exec jarvis-certbot sh -c "openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048"

# Generate default self-signed certificate (for unknown domains)
docker exec jarvis-certbot sh -c "openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/default-key.pem \
  -out /etc/nginx/ssl/default-cert.pem \
  -subj '/C=US/ST=State/L=City/O=Organization/CN=localhost'"

# Request staging certificates
docker exec jarvis-certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  --staging \
  -d jarvis.ai \
  -d www.jarvis.ai \
  -d api.jarvis.ai

# Verify certificates were created
docker exec jarvis-certbot ls -la /etc/letsencrypt/live/
```

### Step 4: Test HTTPS

```bash
# Reload nginx to pick up certificates
docker exec jarvis-nginx nginx -s reload

# Test HTTPS (should work with staging cert warning)
curl -k https://jarvis.ai/health
```

### Step 5: Switch to Production

Once testing is successful:

```bash
# Update .env
export LETSENCRYPT_STAGING=0

# Remove staging certificates
docker exec jarvis-certbot rm -rf /etc/letsencrypt/live/*
docker exec jarvis-certbot rm -rf /etc/letsencrypt/archive/*
docker exec jarvis-certbot rm -rf /etc/letsencrypt/renewal/*

# Request production certificates
docker exec jarvis-certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d jarvis.ai \
  -d www.jarvis.ai \
  -d api.jarvis.ai

# Reload nginx
docker exec jarvis-nginx nginx -s reload
```

## Certificate Management

### Automatic Renewal

Certbot automatically attempts renewal twice daily. Certificates are renewed when they have 30 days or less remaining.

Check renewal status:

```bash
# Check certificate expiry
docker exec jarvis-certbot certbot certificates

# Test renewal (dry run)
docker exec jarvis-certbot certbot renew --dry-run

# Force renewal
docker exec jarvis-certbot certbot renew --force-renewal
```

### Manual Renewal

If automatic renewal fails:

```bash
# Use the renewal script
docker exec jarvis-certbot /usr/local/bin/renew-cert.sh force

# Or manually
docker exec jarvis-certbot certbot renew --webroot --webroot-path=/var/www/certbot
docker exec jarvis-nginx nginx -s reload
```

### Certificate Expiry Monitoring

The renewal script sends notifications when certificates are expiring:

- **14 days before expiry**: Warning notification
- **Renewal failure**: Error notification
- **Successful renewal**: Info notification

Configure notifications in `.env`:

```bash
# Enable email notifications
ENABLE_EMAIL_NOTIFICATIONS=true
NOTIFICATION_EMAIL=alerts@jarvis.ai

# Enable Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK

# Days before expiry to alert
DAYS_BEFORE_EXPIRY_ALERT=14
```

## Configuration

### Nginx Configuration

Main config file: `/Users/benkennon/Jarvis/infra/docker/nginx/nginx.conf`

Key settings:

```nginx
# TLS Protocol Support
ssl_protocols TLSv1.2 TLSv1.3;

# Modern Cipher Suite
ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:...';

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Rate Limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
```

### Express Middleware

Add to your Express app:

```typescript
import { tlsSecurityStack, logTLSConfig } from './middleware/tls-enforcement';

// Log TLS configuration on startup
logTLSConfig();

// Apply TLS security middleware
app.use(tlsSecurityStack());

// Or apply individually:
import { tlsEnforcement, secureCookies, securityHeaders } from './middleware/tls-enforcement';

app.use(tlsEnforcement({
  enforceHTTPS: process.env.NODE_ENV === 'production',
  excludePaths: ['/health', '/.well-known/'],
}));
app.use(secureCookies());
app.use(securityHeaders());
```

### Development Mode

For local development, HTTP is allowed on localhost:

```bash
# .env for development
NODE_ENV=development
TRUST_PROXY=false

# Start without nginx
cd /Users/benkennon/Jarvis
npm run dev
```

The middleware automatically:
- Allows HTTP on localhost/127.0.0.1
- Disables HSTS in development
- Disables secure cookie flags in development

## Deployment

### Production Deployment Checklist

- [ ] DNS records configured and propagated
- [ ] Firewall rules allow ports 80/443
- [ ] Environment variables set in `.env`
- [ ] Tested with Let's Encrypt staging
- [ ] Generated DH parameters
- [ ] Generated default certificate
- [ ] Obtained production certificates
- [ ] Verified HTTPS works on all domains
- [ ] Tested HTTP to HTTPS redirect
- [ ] Configured certificate renewal notifications
- [ ] Set up monitoring alerts
- [ ] Submitted domains to HSTS preload list

### Deploy with Docker Compose

```bash
cd /Users/benkennon/Jarvis/infra/docker

# Production deployment
docker-compose up -d

# Check all services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### Health Checks

```bash
# Check nginx
curl -I https://jarvis.ai/health

# Check API endpoint
curl https://api.jarvis.ai/api/health

# Verify redirect
curl -I http://jarvis.ai  # Should redirect to https://
```

### SSL/TLS Testing

Use online tools to verify configuration:

1. **SSL Labs**: https://www.ssllabs.com/ssltest/
   - Should achieve A+ rating

2. **SecurityHeaders.com**: https://securityheaders.com/
   - Should achieve A+ rating

3. **HSTS Preload**: https://hstspreload.org/
   - Submit for preload list

## Monitoring & Maintenance

### Certificate Expiry Monitoring

Set up monitoring for certificate expiry:

```bash
# Check certificate expiry dates
docker exec jarvis-certbot certbot certificates

# Add to cron (daily check)
0 9 * * * docker exec jarvis-certbot certbot certificates | mail -s "Certificate Status" admin@jarvis.ai
```

### Log Monitoring

Monitor nginx access and error logs:

```bash
# Access logs
docker exec jarvis-nginx tail -f /var/log/nginx/access.log

# Error logs
docker exec jarvis-nginx tail -f /var/log/nginx/error.log

# Security logs (main domain)
docker exec jarvis-nginx tail -f /var/log/nginx/jarvis.ai.access.log

# API logs
docker exec jarvis-nginx tail -f /var/log/nginx/api.jarvis.ai.access.log
```

### Performance Monitoring

Monitor TLS handshake performance:

```bash
# Check SSL session cache stats
docker exec jarvis-nginx nginx -T | grep ssl_session

# Monitor connection rates
docker exec jarvis-nginx tail -f /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn
```

### Backup Certificates

Backup certificates regularly:

```bash
# Create backup
docker run --rm \
  -v jarvis_letsencrypt_certs:/certs \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/certs-$(date +%Y%m%d).tar.gz /certs

# Restore backup
docker run --rm \
  -v jarvis_letsencrypt_certs:/certs \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/certs-20251017.tar.gz -C /
```

## Troubleshooting

### Certificate Request Fails

**Problem**: Cannot obtain certificate

**Solutions**:

```bash
# 1. Check DNS propagation
dig +short jarvis.ai
nslookup jarvis.ai

# 2. Verify port 80 is accessible
curl http://jarvis.ai/.well-known/acme-challenge/test

# 3. Check certbot logs
docker-compose logs certbot

# 4. Test with staging first
export LETSENCRYPT_STAGING=1
docker-compose restart certbot

# 5. Check rate limits
# Let's Encrypt has rate limits:
# - 50 certificates per registered domain per week
# - 5 duplicate certificates per week
# Use staging to avoid hitting limits
```

### Nginx Won't Start

**Problem**: Nginx fails to start

**Solutions**:

```bash
# 1. Test nginx configuration
docker exec jarvis-nginx nginx -t

# 2. Check certificate paths
docker exec jarvis-nginx ls -la /etc/letsencrypt/live/

# 3. Generate missing certificates
docker exec jarvis-certbot /usr/local/bin/renew-cert.sh init

# 4. Check logs
docker-compose logs nginx
```

### HTTPS Not Working

**Problem**: Can access via HTTP but not HTTPS

**Solutions**:

```bash
# 1. Check nginx is listening on port 443
docker exec jarvis-nginx netstat -tlnp | grep 443

# 2. Verify firewall allows port 443
sudo ufw status
sudo netstat -tlnp | grep 443

# 3. Test SSL handshake
openssl s_client -connect jarvis.ai:443 -servername jarvis.ai

# 4. Check certificate validity
docker exec jarvis-certbot certbot certificates
```

### Redirect Loop

**Problem**: Browser shows "too many redirects"

**Solutions**:

```bash
# 1. Check X-Forwarded-Proto header is set
docker exec jarvis-nginx nginx -T | grep X-Forwarded-Proto

# 2. Verify TRUST_PROXY is enabled in app
grep TRUST_PROXY .env

# 3. Check Express trust proxy setting
# In your app:
app.set('trust proxy', true);

# 4. Disable HTTPS enforcement in app (nginx handles it)
```

### Certificate Renewal Fails

**Problem**: Automatic renewal is failing

**Solutions**:

```bash
# 1. Check renewal logs
docker exec jarvis-certbot cat /var/log/certbot/renewal.log

# 2. Test renewal
docker exec jarvis-certbot certbot renew --dry-run

# 3. Verify webroot is accessible
docker exec jarvis-nginx ls -la /var/www/certbot/.well-known/

# 4. Force renewal
docker exec jarvis-certbot /usr/local/bin/renew-cert.sh force

# 5. Check Let's Encrypt rate limits
# https://letsencrypt.org/docs/rate-limits/
```

### Mixed Content Warnings

**Problem**: Browser shows mixed content warnings

**Solutions**:

```bash
# 1. Check Content-Security-Policy header
curl -I https://jarvis.ai | grep Content-Security-Policy

# 2. Ensure all assets use HTTPS
# Check your HTML/JS for http:// URLs

# 3. Use CSP report mode first
# Content-Security-Policy-Report-Only: ...

# 4. Update asset URLs
# Use protocol-relative URLs: //example.com/asset.js
# Or better: https://example.com/asset.js
```

## Security Best Practices

### 1. Keep Certificates Updated

- Monitor expiry dates (30-day threshold)
- Test renewal process regularly
- Have backup notification channels
- Keep contact email current

### 2. Strong Cipher Configuration

```nginx
# Prioritize TLS 1.3
ssl_protocols TLSv1.2 TLSv1.3;

# Disable weak ciphers
ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:...';

# Prefer server ciphers
ssl_prefer_server_ciphers on;
```

### 3. Enable HSTS Preloading

After testing for 30 days, submit to HSTS preload:

1. Visit https://hstspreload.org/
2. Enter your domain
3. Follow submission instructions
4. Monitor for inclusion in browser preload lists

### 4. Regular Security Audits

```bash
# Monthly SSL Labs scan
# https://www.ssllabs.com/ssltest/analyze.html?d=jarvis.ai

# Check security headers
curl -I https://jarvis.ai | grep -E "(Strict-Transport-Security|Content-Security-Policy|X-Frame-Options)"

# Verify cipher suite
nmap --script ssl-enum-ciphers -p 443 jarvis.ai
```

### 5. Rate Limiting

Protect against abuse:

```nginx
# API rate limiting (10 req/sec)
limit_req zone=api_limit burst=20 nodelay;

# Auth rate limiting (5 req/min)
limit_req zone=auth_limit burst=3 nodelay;

# Connection limiting
limit_conn conn_limit 10;
```

### 6. Log Monitoring

Set up alerts for:

- Certificate expiry (< 14 days)
- Renewal failures
- Suspicious traffic patterns
- High error rates
- Rate limit violations

### 7. Backup Strategy

```bash
# Weekly certificate backup
0 0 * * 0 docker run --rm -v jarvis_letsencrypt_certs:/certs -v /backups:/backup alpine tar czf /backup/certs-$(date +\%Y\%m\%d).tar.gz /certs

# Keep 4 weeks of backups
find /backups -name "certs-*.tar.gz" -mtime +28 -delete
```

### 8. Incident Response

Have a plan for:

- Certificate compromise (revoke & reissue)
- Private key leak (immediate revocation)
- Configuration errors (rollback procedure)
- Service disruption (failover strategy)

## HSTS Preload Submission

After running with HSTS for at least 30 days:

1. **Verify Configuration**:
   ```bash
   curl -I https://jarvis.ai | grep Strict-Transport-Security
   # Should show: max-age=31536000; includeSubDomains; preload
   ```

2. **Test All Subdomains**:
   - Ensure all subdomains support HTTPS
   - Test redirects from HTTP to HTTPS
   - Verify HSTS headers on all subdomains

3. **Submit to Preload List**:
   - Visit: https://hstspreload.org/
   - Enter your domain
   - Follow instructions
   - Wait for approval (can take weeks/months)

4. **Monitor Inclusion**:
   - Check Chromium source
   - Test in different browsers
   - Monitor for issues

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP TLS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
- [SSL Labs Best Practices](https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices)

## Support

For issues or questions:

- Check troubleshooting section above
- Review nginx error logs: `docker-compose logs nginx`
- Review certbot logs: `docker-compose logs certbot`
- Test with SSL Labs: https://www.ssllabs.com/ssltest/
- Contact: admin@jarvis.ai
