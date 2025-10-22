# JARVIS + DAWG AI - Public Access URLs

**Generated:** October 15, 2025, 3:06 PM PST
**Status:** ✅ LIVE AND OPERATIONAL

---

## 🌐 Public URLs (Free Tunnels)

### JARVIS API (via ngrok)
**Base URL:** https://kaycee-nonextrinsical-yosef.ngrok-free.dev

**Endpoints:**
- Health Check: https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api/health
- API Documentation: https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api-docs
- Agent Metrics: https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api/agents/metrics
- Recent Activities: https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api/agents/activities
- Approval Queue: https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api/agents/approval-queue

### DAWG AI Backend (via localtunnel)
**Base URL:** https://old-cooks-jam.loca.lt

**Endpoints:**
- Health Check: https://old-cooks-jam.loca.lt/health
- Generate MIDI: https://old-cooks-jam.loca.lt/generate
- Generate Bassline: https://old-cooks-jam.loca.lt/generate-bassline
- Generate Melody: https://old-cooks-jam.loca.lt/generate-melody

---

## 🚀 Quick Test Commands

### Test JARVIS API
```bash
# Health check
curl https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api/health

# Get agent metrics
curl https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api/agents/metrics

# Get recent activities
curl https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api/agents/activities
```

### Test DAWG AI Backend
```bash
# Health check
curl https://old-cooks-jam.loca.lt/health

# Generate MIDI (example)
curl -X POST https://old-cooks-jam.loca.lt/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "upbeat electronic dance music"}'
```

---

## 📱 Interactive Access

### JARVIS API Documentation (Swagger UI)
**URL:** https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api-docs

**Features:**
- Interactive API documentation
- Try all endpoints directly in browser
- View request/response schemas
- Complete OpenAPI 3.0 specification

**Note:** First visit to ngrok URL may show a warning page. Click "Visit Site" to proceed.

---

## 🔐 Notes & Limitations

### ngrok (JARVIS API)
- **Free Tier:** 1 tunnel at a time
- **Domain:** Random subdomain (changes on restart)
- **Security:** HTTPS enabled by default
- **First Visit:** Shows ngrok warning page (click "Visit Site")
- **Rate Limits:** 40 requests/minute (ngrok free tier)
- **Session:** Tunnel stays active as long as process runs

### localtunnel (DAWG AI)
- **Free Tier:** Unlimited tunnels
- **Domain:** Random subdomain (changes on restart)
- **Security:** HTTPS enabled by default
- **First Visit:** May show IP confirmation page
- **Rate Limits:** No hard limits on free tier
- **Session:** Tunnel stays active as long as process runs

### Important Warnings
⚠️ **These are temporary URLs** - They will change if the tunnel processes restart
⚠️ **Not for production** - Use for testing and development only
⚠️ **No authentication** - APIs are publicly accessible (add auth for production)
⚠️ **Rate limits apply** - Free tier has usage restrictions

---

## 🔄 Restart Tunnels

If tunnels go down, restart them with:

```bash
# JARVIS API (ngrok)
ngrok http 3000

# DAWG AI (localtunnel)
lt --port 9000
```

---

## 📊 Service Status

| Service | Local Port | Public URL | Status |
|---------|-----------|------------|--------|
| JARVIS API | 3000 | https://kaycee-nonextrinsical-yosef.ngrok-free.dev | ✅ LIVE |
| DAWG AI Backend | 9000 | https://old-cooks-jam.loca.lt | ✅ LIVE |
| Observatory | 5174 | localhost only | ✅ RUNNING |

---

## 🎯 Example Use Cases

### 1. Test JARVIS Health from Anywhere
```bash
curl https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api/health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-10-15T22:06:35.381Z"
}
```

### 2. View API Documentation
**URL:** https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api-docs

**Features:**
- Interactive Swagger UI
- Test all endpoints
- View request/response schemas

### 3. Check Agent Metrics
```bash
curl https://kaycee-nonextrinsical-yosef.ngrok-free.dev/api/agents/metrics
```

### 4. Test DAWG AI Music Generation
```bash
curl https://old-cooks-jam.loca.lt/health
```

**Response:**
```json
{
  "status": "healthy"
}
```

---

## 🛠️ For Developers

### Integration with Frontend
Update your frontend `.env` to use public URLs:

```env
VITE_JARVIS_API_URL=https://kaycee-nonextrinsical-yosef.ngrok-free.dev
VITE_DAWG_AI_URL=https://old-cooks-jam.loca.lt
```

### Mobile App Testing
Use these URLs in your mobile app to test against live backends without deploying.

### Share with Team
Share these URLs with team members for testing and collaboration.

---

## 📞 Support

**Local URLs (still accessible on your machine):**
- JARVIS API: http://localhost:3000
- DAWG AI: http://localhost:9000
- Observatory: http://localhost:5174

**Tunnels Active:**
- ngrok dashboard: http://localhost:4040
- localtunnel: No dashboard (CLI only)

---

## ⚡ Performance

**Response Times (Public URLs):**
- JARVIS API Health: ~50-100ms (includes tunnel latency)
- DAWG AI Health: ~50-100ms (includes tunnel latency)
- Local Response Times: <2ms

**Note:** Public URLs add ~50ms latency due to tunnel routing.

---

**🎉 Your APIs are now accessible from anywhere in the world!**

**Share these URLs with:**
- Team members for testing
- Mobile devices for testing
- External systems for integration testing
- Clients for demos

**Remember:** These are temporary URLs for testing only. For production, deploy to a proper hosting service with custom domain and authentication.
