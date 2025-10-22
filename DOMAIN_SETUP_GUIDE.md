# Custom Domain Setup Guide for DAWG AI

**Status:** ✅ Jarvis API tunnel closed (proprietary)
**Public URL:** Only DAWG AI is accessible

---

## 🌐 Current Setup

### DAWG AI (Music Generation API)
**Temporary URL:** https://old-cooks-jam.loca.lt
**Status:** ✅ PUBLIC (Music generation only)
**Endpoints:**
- `GET /health` - Health check
- `POST /generate` - Generate MIDI
- `POST /generate-bassline` - Generate bassline
- `POST /generate-melody` - Generate melody

### Jarvis (Business Orchestration)
**Status:** 🔒 PRIVATE (Not exposed)
**Access:** Local only (http://localhost:3000)
**Reason:** Proprietary business logic and agent orchestration

---

## 💰 Buying a Custom Domain

### Option 1: Domain Registrars (Recommended)
**Popular Registrars:**

| Registrar | Cost/Year | Features | Best For |
|-----------|-----------|----------|----------|
| **Namecheap** | $8-15 | Free WHOIS privacy, easy DNS | Best overall value |
| **Google Domains** | $12-20 | Google integration, simple UI | Easy setup |
| **GoDaddy** | $10-20 | Popular, many TLDs | Large selection |
| **Cloudflare** | $8-10 | At-cost pricing, free SSL | Tech-savvy users |
| **Porkbun** | $6-12 | Cheap, good UI | Budget option |

**How to Buy:**
1. Go to registrar website (e.g., namecheap.com)
2. Search for your desired domain (e.g., "dawgai.com")
3. Add to cart and checkout ($10-15/year average)
4. You'll receive login credentials and DNS management access

**Domain Suggestions for DAWG AI:**
- `dawgai.com` or `dawgai.io`
- `dawg-music.com`
- `dawgaudio.com`
- `beatsby dawg.com`
- `dawgstudio.com`

### Option 2: Free Subdomains (For Testing)
- **Freenom** - Free .tk, .ml, .ga domains
- **Afraid.org** - Free subdomains
- ⚠️ **Not recommended for production** (unreliable, poor reputation)

---

## 🛠️ What I Can Help You Set Up (From My End)

### ✅ Yes, I Can Configure:

1. **SSL/TLS Certificates**
   - Set up Let's Encrypt (free SSL)
   - Configure automatic renewal
   - Force HTTPS redirect

2. **Nginx Reverse Proxy**
   ```bash
   # I can write and configure nginx.conf
   server {
       listen 80;
       server_name dawgai.com;
       location / {
           proxy_pass http://localhost:9000;
       }
   }
   ```

3. **Docker Deployment**
   - Create production Dockerfile for DAWG AI
   - Set up docker-compose with domain
   - Configure environment variables

4. **Domain DNS Configuration Files**
   - Write DNS records you need to add
   - Create zone file examples
   - Provide exact A/CNAME records

5. **PM2 Process Manager**
   - Keep DAWG AI running 24/7
   - Auto-restart on crashes
   - Log management

6. **API Rate Limiting & Security**
   - Configure rate limits
   - Add API key authentication
   - Set up CORS properly

### ❌ No, You Need to Do:

1. **Actually Purchase the Domain**
   - I can't buy it for you
   - You need a credit card and registrar account

2. **Update DNS Records**
   - I'll tell you WHAT to add
   - You need to log into your registrar and add them

3. **Deploy to Cloud Server**
   - I can't provision AWS/Digital Ocean servers
   - You need to create and provide server access

---

## 📋 Full Setup Process (What You Do vs What I Do)

### Phase 1: Domain Purchase (You)
1. ✅ **YOU:** Buy domain at Namecheap/Google Domains
2. ✅ **YOU:** Get domain login credentials
3. ✅ **YOU:** Access DNS management panel

### Phase 2: Server Setup (You + Me)
1. ✅ **YOU:** Choose hosting provider:
   - **Vercel** ($0-20/month) - Easiest, serverless
   - **Digital Ocean** ($6-12/month) - VPS, full control
   - **AWS** ($10-30/month) - Scalable, complex
   - **Railway** ($5/month) - Simple, good for APIs
   - **Fly.io** ($0-10/month) - Good free tier

2. ✅ **ME:** Configure application for production
3. ✅ **ME:** Set up SSL certificates
4. ✅ **ME:** Write deployment scripts

### Phase 3: DNS Configuration (You)
1. ✅ **ME:** Provide DNS records to add
2. ✅ **YOU:** Add records to domain registrar
3. ✅ **ME:** Verify DNS propagation

### Phase 4: Deployment (Me)
1. ✅ **ME:** Deploy DAWG AI to server
2. ✅ **ME:** Configure reverse proxy
3. ✅ **ME:** Test with custom domain
4. ✅ **ME:** Monitor and optimize

---

## 🚀 Recommended Deployment Flow

### Option A: Vercel (Easiest - Recommended for You)
**Cost:** Free tier available, $20/month for production
**Time:** 10 minutes
**Setup:**
```bash
# I can run these commands
npm install -g vercel
vercel login
vercel --prod
```

**What YOU do:**
1. Buy domain (dawgai.com)
2. Connect domain in Vercel dashboard
3. Click "Add Domain" and follow prompts

**What I do:**
- Configure vercel.json
- Set environment variables
- Deploy application
- Set up SSL (automatic on Vercel)

### Option B: Digital Ocean (More Control)
**Cost:** $6/month for basic droplet
**Time:** 30 minutes
**Setup:**

**What YOU do:**
1. Create Digital Ocean account
2. Create a droplet (Ubuntu server)
3. Buy domain
4. Add A record pointing to droplet IP

**What I do:**
- Install Node.js, Python, nginx
- Configure reverse proxy
- Set up SSL with Let's Encrypt
- Deploy DAWG AI with PM2
- Configure firewall

### Option C: Railway (Good Middle Ground)
**Cost:** $5/month
**Time:** 15 minutes
**Setup:**

**What YOU do:**
1. Create Railway account
2. Buy domain
3. Connect GitHub repo

**What I do:**
- Configure railway.json
- Set up environment variables
- Deploy with one command
- Connect custom domain

---

## 📝 Exact DNS Records You'll Need

Once you buy a domain, add these records in your registrar:

### If using Vercel:
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 3600
```

### If using Digital Ocean/VPS:
```
Type: A
Name: @
Value: [YOUR_SERVER_IP]
TTL: 3600

Type: A
Name: www
Value: [YOUR_SERVER_IP]
TTL: 3600
```

### If using Railway:
```
Type: CNAME
Name: @
Value: [PROVIDED_BY_RAILWAY]
TTL: 3600
```

---

## 💡 My Recommendation for You

### Best Option: Railway.app
**Why:**
- ✅ Easy deployment (I can set it up in 15 min)
- ✅ Custom domain support built-in
- ✅ SSL certificates automatic
- ✅ Git-based deployment
- ✅ Good free tier, $5/month after
- ✅ Good for Python/FastAPI (DAWG AI)

**Steps:**
1. **YOU:** Buy domain at Namecheap ($10/year)
   - Search "dawgai.com" or similar
   - Add to cart, checkout
   - You'll get DNS management access

2. **YOU:** Create Railway account (free)
   - Go to railway.app
   - Sign up with GitHub

3. **ME:** Deploy DAWG AI to Railway
   - Configure deployment
   - Set environment variables
   - Connect your domain

4. **YOU:** Add DNS record Railway provides
   - Railway will give you a CNAME
   - Add it to Namecheap DNS

5. **DONE:** Access at https://dawgai.com

---

## 🔐 Security Considerations

### What I'll Set Up:
- ✅ **HTTPS/SSL** - All traffic encrypted
- ✅ **Rate Limiting** - Prevent abuse (100 req/min)
- ✅ **API Keys** - Optional authentication
- ✅ **CORS** - Control which sites can access
- ✅ **DDoS Protection** - Basic firewall rules

### What to Keep Private:
- 🔒 Jarvis orchestration logic (already private)
- 🔒 Database credentials
- 🔒 API keys in .env
- 🔒 Business logic and agent code

### What's Safe to Expose:
- ✅ DAWG AI music generation endpoints
- ✅ Health check endpoint
- ✅ Public API documentation
- ✅ Frontend/UI for music generation

---

## 💸 Total Cost Breakdown

### Minimum Setup (Recommended):
- **Domain:** $10/year (Namecheap)
- **Hosting:** $5/month (Railway.app)
- **SSL:** $0 (included/automatic)
- **Total:** $10 + $60/year = **$70/year**

### Professional Setup:
- **Domain:** $15/year (Google Domains)
- **Hosting:** $12/month (Digital Ocean)
- **SSL:** $0 (Let's Encrypt)
- **CDN:** $0 (Cloudflare free tier)
- **Total:** $15 + $144/year = **$159/year**

### Enterprise Setup:
- **Domain:** $20/year
- **Hosting:** $50/month (AWS)
- **SSL:** $0 (AWS Certificate Manager)
- **CDN:** $10/month (Cloudflare Pro)
- **Total:** $20 + $600 + $120 = **$740/year**

---

## 🎯 Next Steps

### Step 1: Choose Your Plan
Which setup do you want?
- [ ] **Minimum** ($70/year) - Railway + Namecheap
- [ ] **Professional** ($159/year) - Digital Ocean + custom config
- [ ] **Enterprise** ($740/year) - AWS + full infrastructure

### Step 2: Buy Domain
1. Go to namecheap.com (or your chosen registrar)
2. Search for your domain (e.g., "dawgai.com")
3. Purchase ($10-15)
4. Get login credentials

### Step 3: Tell Me Your Choice
Once you:
- ✅ Pick a hosting option (Railway recommended)
- ✅ Buy a domain
- ✅ Have login access to domain DNS

Then I can:
- ✅ Deploy DAWG AI to production
- ✅ Configure SSL/security
- ✅ Set up custom domain
- ✅ Provide DNS records to add
- ✅ Test and verify everything works

---

## 🆘 Quick Answers

**Q: Can you buy the domain for me?**
A: No, you need a credit card and account. Takes 5 minutes at namecheap.com.

**Q: Can you click buttons in my domain registrar?**
A: No, but I'll tell you EXACTLY what to click and what values to enter.

**Q: Can you set up the server?**
A: Yes! Once you have a server (Railway/Vercel/DO), I can configure everything.

**Q: Will my API be secure?**
A: Yes, I'll set up HTTPS, rate limiting, and optional API keys.

**Q: How long does deployment take?**
A: 15-30 minutes after you buy domain and create hosting account.

**Q: What if something breaks?**
A: I can help fix it! Plus we'll set up monitoring and auto-restart.

---

## 📞 Ready to Deploy?

**Tell me:**
1. What domain you want (I'll check if it's available)
2. Your budget ($70, $159, or $740/year)
3. If you want to buy now or need more info

**Then I'll:**
1. Guide you through domain purchase
2. Set up hosting (I'll do the technical work)
3. Deploy DAWG AI to your custom domain
4. Secure everything with SSL
5. Give you your live URL (e.g., https://dawgai.com)

---

**Current Status:**
- ✅ DAWG AI running locally (port 9000)
- ✅ Temporary URL: https://old-cooks-jam.loca.lt
- ✅ Jarvis kept private (secure)
- ⏳ Waiting for custom domain setup

**Ready when you are!** 🚀
