# DNS Records - Quick Reference

**Print this or keep it handy when configuring your domains!**

---

## 📋 dawg-ai.com DNS Records

**After deploying to Railway, Railway will provide the exact CNAME value.**
**The example below shows the format - use the actual value Railway gives you.**

### Add these records in your domain registrar's DNS management:

```
┌────────┬──────┬──────────────────────────────────────────┬──────┐
│ Type   │ Host │ Value                                    │ TTL  │
├────────┼──────┼──────────────────────────────────────────┼──────┤
│ CNAME  │ @    │ dawg-ai-production.up.railway.app       │ 3600 │
│ CNAME  │ www  │ dawg-ai-production.up.railway.app       │ 3600 │
└────────┴──────┴──────────────────────────────────────────┴──────┘
```

**Notes:**
- Replace `dawg-ai-production.up.railway.app` with actual value from Railway
- Some registrars use "Name" instead of "Host"
- Some registrars use "Points to" or "Target" instead of "Value"
- If CNAME not allowed for @, use ALIAS or ANAME record

---

## 📋 jarvis-ai.co DNS Records

**After deploying Observatory to Railway, Railway will provide the exact CNAME value.**

### Add these records in your domain registrar's DNS management:

```
┌────────┬──────┬──────────────────────────────────────────┬──────┐
│ Type   │ Host │ Value                                    │ TTL  │
├────────┼──────┼──────────────────────────────────────────┼──────┤
│ CNAME  │ @    │ observatory-production.up.railway.app   │ 3600 │
│ CNAME  │ www  │ observatory-production.up.railway.app   │ 3600 │
└────────┴──────┴──────────────────────────────────────────┴──────┘
```

**Notes:**
- Replace `observatory-production.up.railway.app` with actual value from Railway
- Login: admin / jarvis2025 (change this in production!)

---

## 🔍 How to Find Railway CNAME Value

1. **Deploy your service to Railway first**
   - Follow RAILWAY_DEPLOYMENT_GUIDE.md

2. **In Railway Dashboard:**
   - Click on your deployed service
   - Go to "Settings" tab
   - Scroll to "Domains" section
   - Click "Add Domain"
   - Enter your custom domain
   - **Railway will show the exact CNAME value to use**

3. **Copy that value** and paste it in your domain registrar's DNS settings

---

## ⏱️ DNS Propagation Time

- **Minimum:** 5-15 minutes
- **Average:** 30-60 minutes
- **Maximum:** 24-48 hours (rare)

**Check propagation status:**
```bash
# Check dawg-ai.com
dig dawg-ai.com
nslookup dawg-ai.com

# Check jarvis-ai.co
dig jarvis-ai.co
nslookup jarvis-ai.co
```

---

## 🔐 SSL Certificates (Automatic)

Railway automatically provisions SSL certificates via Let's Encrypt:
- ✅ No configuration needed
- ✅ Auto-renewal every 90 days
- ✅ Works once DNS propagates
- ⏱️ Takes 10-30 minutes after DNS is active

**Your URLs will be:**
- https://dawg-ai.com (secure)
- https://jarvis-ai.co (secure)

---

## 📝 Common Registrar Locations

### Namecheap
1. Login to namecheap.com
2. Dashboard → Domain List
3. Click "Manage" next to your domain
4. Click "Advanced DNS" tab
5. Click "Add New Record"

### GoDaddy
1. Login to godaddy.com
2. My Products → Domains
3. Click on your domain
4. Scroll to "DNS Management"
5. Click "Add" under "Records"

### Google Domains
1. Login to domains.google.com
2. Click on your domain
3. Click "DNS" in left sidebar
4. Scroll to "Custom records"
5. Click "Manage custom records"

### Cloudflare
1. Login to cloudflare.com
2. Select your domain
3. Click "DNS" tab
4. Click "Add record"

---

## ✅ Verification Checklist

After adding DNS records:

**dawg-ai.com:**
- [ ] CNAME for @ pointing to Railway
- [ ] CNAME for www pointing to Railway
- [ ] Wait 15-60 minutes
- [ ] Test: `curl https://dawg-ai.com/health`
- [ ] Should return: `{"status":"healthy"}`

**jarvis-ai.co:**
- [ ] CNAME for @ pointing to Railway
- [ ] CNAME for www pointing to Railway
- [ ] Wait 15-60 minutes
- [ ] Test: `open https://jarvis-ai.co`
- [ ] Should show login page

---

## 🆘 Troubleshooting

**Problem:** "CNAME not allowed for root domain"
**Solution:** Use ALIAS or ANAME record instead (same value)

**Problem:** "DNS not propagating after 2 hours"
**Solution:**
- Check for typos in CNAME value
- Remove any existing A records for @ and www
- Clear DNS cache: `sudo dscacheutil -flushcache`

**Problem:** "SSL certificate not working"
**Solution:**
- Wait 30 minutes after DNS propagates
- Check Railway dashboard for SSL status
- Force refresh browser (Cmd+Shift+R)

---

**Need Help?** See full guide: `RAILWAY_DEPLOYMENT_GUIDE.md`
