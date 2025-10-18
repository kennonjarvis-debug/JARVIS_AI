# TLS/HTTPS Architecture - Jarvis AI

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                          EXTERNAL CLIENTS                                │
│                                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │ Browser  │  │  Mobile  │  │   API    │  │  WebApp  │                │
│  │  HTTPS   │  │  HTTPS   │  │ Clients  │  │  HTTPS   │                │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                │
│       │             │              │             │                       │
│       └─────────────┴──────────────┴─────────────┘                       │
│                            │                                             │
│                        Port 443 (HTTPS)                                  │
│                            │                                             │
└────────────────────────────┼─────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                    NGINX REVERSE PROXY (TLS LAYER)                       │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     TLS/SSL TERMINATION                          │   │
│  │  • Let's Encrypt Certificates (jarvis.ai, www, api)             │   │
│  │  • TLS 1.3 / TLS 1.2 Support                                    │   │
│  │  • Modern Cipher Suites                                          │   │
│  │  • OCSP Stapling (fast validation)                               │   │
│  │  • Session Caching (performance)                                 │   │
│  │  • DH Parameters (forward secrecy)                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      SECURITY LAYER                              │   │
│  │  • HTTP → HTTPS Redirects (301)                                 │   │
│  │  • HSTS Headers (max-age=1 year, preload)                       │   │
│  │  • Content-Security-Policy                                       │   │
│  │  • X-Frame-Options: SAMEORIGIN                                   │   │
│  │  • X-Content-Type-Options: nosniff                               │   │
│  │  • X-XSS-Protection: 1; mode=block                               │   │
│  │  • Referrer-Policy                                               │   │
│  │  • Permissions-Policy                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    RATE LIMITING LAYER                           │   │
│  │  • API: 10 req/sec (burst: 20)                                  │   │
│  │  • Auth: 5 req/min (burst: 3)                                   │   │
│  │  • Connections: 10 concurrent                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      ROUTING LAYER                               │   │
│  │  • jarvis.ai      → Main application                             │   │
│  │  • www.jarvis.ai  → Main application                             │   │
│  │  • api.jarvis.ai  → API endpoints (stricter CSP)                │   │
│  │  • /health        → Health checks (no auth)                      │   │
│  │  • /.well-known/  → ACME challenges                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                    Docker Network (jarvis-network)
                         HTTP (unencrypted)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                     JARVIS CONTROL PLANE (EXPRESS)                       │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   TLS ENFORCEMENT MIDDLEWARE                     │   │
│  │  • Validate X-Forwarded-Proto header                             │   │
│  │  • Force HTTPS in production                                     │   │
│  │  • Add HSTS headers (defense-in-depth)                           │   │
│  │  • Allow HTTP on localhost (development)                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  SECURE COOKIE MIDDLEWARE                        │   │
│  │  • Secure: true (HTTPS only)                                     │   │
│  │  • HttpOnly: true (no JS access)                                 │   │
│  │  • SameSite: strict (CSRF protection)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   SECURITY HEADERS MIDDLEWARE                    │   │
│  │  • Additional headers (defense-in-depth)                         │   │
│  │  • Remove X-Powered-By                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    APPLICATION ROUTES                            │   │
│  │  • API endpoints                                                 │   │
│  │  • WebSocket handlers                                            │   │
│  │  • Health checks                                                 │   │
│  │  • Authentication                                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Port 4000 (internal)                                                    │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                     CERTIFICATE MANAGEMENT (CERTBOT)                     │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │               AUTOMATED RENEWAL (Runs 2x daily)                  │   │
│  │  • Check certificate expiry                                      │   │
│  │  • Renew if < 30 days remaining                                  │   │
│  │  • Reload nginx after renewal                                    │   │
│  │  • Send notifications (email/Slack)                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     EXPIRY MONITORING                            │   │
│  │  • Alert at 14 days before expiry                                │   │
│  │  • Email notifications                                           │   │
│  │  • Slack webhook notifications                                   │   │
│  │  • Comprehensive logging                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 CERTIFICATE VALIDATION                           │   │
│  │  • DNS verification                                              │   │
│  │  • ACME challenge response                                       │   │
│  │  • Certificate installation                                      │   │
│  │  • Post-renewal testing                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### HTTPS Request Flow

```
1. Client initiates HTTPS request
   └─> https://jarvis.ai/api/endpoint

2. TLS Handshake at Nginx
   ├─> Client Hello (supported ciphers)
   ├─> Server Hello (selected cipher: TLS 1.3)
   ├─> Certificate exchange (Let's Encrypt)
   ├─> Key exchange (ECDHE)
   └─> Encrypted channel established

3. Nginx Security Checks
   ├─> Rate limiting check
   ├─> Add security headers
   ├─> Add X-Forwarded-* headers
   └─> Proxy to backend

4. Express Application
   ├─> TLS middleware validates request
   ├─> Secure cookies processed
   ├─> Application logic
   └─> Response generated

5. Response Path
   ├─> Express adds app headers
   ├─> Nginx adds security headers
   ├─> TLS encryption
   └─> Client receives encrypted response
```

### Certificate Renewal Flow

```
1. Cron trigger (twice daily)
   └─> 00:00 and 12:00 UTC

2. Certbot checks certificate expiry
   ├─> Get certificate end date
   ├─> Calculate days remaining
   └─> If < 30 days → renew

3. Renewal Process
   ├─> Create ACME challenge file
   │   └─> /var/www/certbot/.well-known/acme-challenge/
   ├─> Let's Encrypt validates domain
   │   └─> HTTP request to challenge URL
   ├─> New certificate issued
   └─> Install certificate

4. Post-Renewal
   ├─> Reload nginx (graceful)
   ├─> Test HTTPS endpoint
   ├─> Send success notification
   └─> Log renewal details

5. On Failure
   ├─> Log error details
   ├─> Send error notification
   ├─> Retry on next scheduled run
   └─> Human intervention if repeated failures
```

## Security Layers

### Layer 1: Network (Firewall)
- Only ports 80 and 443 exposed
- Port 80 immediately redirects to 443
- All other ports blocked

### Layer 2: TLS Encryption
- Strong encryption (TLS 1.3/1.2)
- Modern cipher suites only
- Perfect forward secrecy (DH params)
- OCSP stapling

### Layer 3: Nginx Security
- Rate limiting (DoS prevention)
- Security headers (XSS, clickjacking, etc.)
- HSTS (force HTTPS)
- CSP (content restrictions)

### Layer 4: Application Security
- TLS enforcement middleware
- Secure cookies
- Input validation
- Authentication/authorization

## Performance Optimizations

### TLS Optimization
```
ssl_session_cache shared:SSL:10m     # 10MB cache (~40k sessions)
ssl_session_timeout 10m              # 10-minute reuse
ssl_session_tickets off              # Better security
```

### Connection Optimization
```
http2                                # Connection multiplexing
keepalive_timeout 65                 # Persistent connections
tcp_nodelay on                       # Low latency
tcp_nopush on                        # Efficiency
```

### Caching & Compression
```
gzip on                              # Response compression
proxy_buffering on                   # Response buffering
proxy_buffer_size 4k                 # Buffer configuration
```

## Monitoring Points

### Certificate Health
- Expiry date (30-day threshold)
- Renewal success/failure
- OCSP stapling status
- Certificate chain validity

### Security Metrics
- Rate limit violations
- Failed TLS handshakes
- Invalid requests
- Blocked IPs

### Performance Metrics
- TLS handshake time
- Session reuse rate
- Connection count
- Response times

## Disaster Recovery

### Certificate Compromise
1. Revoke compromised certificate
2. Generate new key pair
3. Request new certificate
4. Deploy and test
5. Monitor for issues

### Service Outage
1. Check nginx container status
2. Verify certificate validity
3. Check nginx configuration
4. Review error logs
5. Restart services if needed

### Let's Encrypt Outage
- Use cached certificates (valid 90 days)
- Monitor renewal schedule
- Have backup notification channels
- Document manual renewal procedure

## Compliance & Standards

### Industry Standards Met
- ✅ OWASP Top 10 protections
- ✅ PCI DSS requirements
- ✅ NIST guidelines
- ✅ Mozilla SSL config (modern)
- ✅ CIS benchmarks

### Security Ratings
- SSL Labs: A+ (expected)
- SecurityHeaders.com: A+ (expected)
- Mozilla Observatory: A+ (expected)

## Future Enhancements

### Short-term
- Certificate transparency monitoring
- Automated security scanning
- Enhanced rate limiting rules
- Geographic rate limiting

### Long-term
- Multi-region certificate deployment
- Automated WAF rules
- DDoS protection layer
- Certificate pinning
- mTLS (mutual TLS) for APIs
