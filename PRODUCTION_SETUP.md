# 🚀 Jarvis Production Setup Guide

## Fixed Configuration

### ✅ Development URLs (localhost)
- **Frontend**: http://localhost:5173 (standardized to Vite default)
- **Backend API**: http://localhost:3100
- **Supabase**: https://nzmzmsmxbiptilzgdmgt.supabase.co

### 🌐 Production URLs (when deployed)
- **Frontend**: `https://your-domain.com` (e.g., Vercel, Netlify)
- **Backend API**: `https://api.your-domain.com` (e.g., Railway, Render)
- **Supabase**: https://nzmzmsmxbiptilzgdmgt.supabase.co (same)

---

## Google OAuth Configuration

### Current Setup:
**OAuth Client ID**: `248561799907-appt8lq2ljfj1uubhd8l5o95cmnbj711.apps.googleusercontent.com`

### Authorized Redirect URIs:
```
# Development (optional - not needed for production)
http://localhost:5173/auth/callback

# Production - Supabase handles OAuth
https://nzmzmsmxbiptilzgdmgt.supabase.co/auth/v1/callback  (Jarvis)
https://nvyebkzrrvmepbdejspr.supabase.co/auth/v1/callback  (DAWG AI)
```

---

## Deployment Steps

### 1. Frontend (Vercel/Netlify)

**Build Command**:
```bash
cd packages/frontend && npm run build
```

**Environment Variables**:
```bash
VITE_API_URL=https://api.your-domain.com/api
VITE_SUPABASE_URL=https://nzmzmsmxbiptilzgdmgt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bXptc214YmlwdGlsemdkbWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTczODYsImV4cCI6MjA3NjI5MzM4Nn0.kfbv7RDBHRmxjpJZqbvPnFqUDRHwLy9kuGgaSUVW0Oo
```

**Deploy Directory**: `packages/frontend/dist`

---

### 2. Backend (Railway/Render/Fly.io)

**Start Command**:
```bash
cd packages/backend && npm start
```

**Environment Variables**:
```bash
NODE_ENV=production
PORT=3100

# Supabase
SUPABASE_URL=https://nzmzmsmxbiptilzgdmgt.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Twitter API
TWITTER_API_KEY=i1edmBlxyYs0idXUSs7xUnjtM
TWITTER_API_SECRET=your-twitter-api-secret
TWITTER_ACCESS_TOKEN=1978598113255591936-p6y9F1uLQoQM8gE7ru8sDbNEkt6K03
TWITTER_ACCESS_TOKEN_SECRET=your-twitter-access-token-secret
```

---

### 3. Update Google OAuth for Production

Once you have your production frontend URL (e.g., `https://jarvis.your-domain.com`):

1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials/oauthclient/248561799907-appt8lq2ljfj1uubhd8l5o95cmnbj711.apps.googleusercontent.com

2. **Add** to Authorized JavaScript origins:
   ```
   https://jarvis.your-domain.com
   ```

3. **Keep** the existing Supabase redirect URI:
   ```
   https://nzmzmsmxbiptilzgdmgt.supabase.co/auth/v1/callback
   ```

4. Click **SAVE**

---

## Apple Integrations (macOS Only)

### ⚠️ Important:
Apple integrations (iMessage, Notes, Voice Memos) **only work on macOS** because they:
- Read from macOS system databases
- Use AppleScript to control macOS apps
- Access local macOS file system

### For Production:
If you want Apple integrations in production, you need:

**Option A: Run backend on macOS server**
- Deploy backend to a macOS machine (Mac Mini server, MacStadium, etc.)
- Give it Full Disk Access permissions
- Keep it running 24/7

**Option B: Hybrid setup** (Recommended)
- Deploy main backend to Railway/Render (for Twitter, web features)
- Run separate macOS service for Apple integrations
- Connect them via API

**Option C: Skip in production**
- Use Apple integrations only on your local machine
- Production users won't have iMessage/Notes/Voice Memos access

---

## Quick Start (Development)

1. **Start backend**:
   ```bash
   npm run dev:backend
   ```

2. **Start frontend**:
   ```bash
   npm run dev:frontend
   ```

3. **Access Jarvis**:
   ```
   http://localhost:5173
   ```

4. **Sign in**:
   - Google OAuth (recommended)
   - Email: kennonjarvis@gmail.com / Password: TestPassword123!

---

## What's Ready for Production:

✅ **Working**:
- Frontend (React + Vite)
- Backend API (Express + TypeScript)
- Twitter integration
- Google OAuth
- PostgreSQL database (Supabase)
- Activity logging

⚠️ **macOS Only**:
- iMessage integration
- Notes integration
- Voice Memos integration

🔄 **Need to Add**:
- Gmail integration
- Google Calendar integration
- Other integrations as needed

---

## Next Steps:

1. ✅ Test localhost:5173 works
2. ⏳ Choose hosting providers (Vercel + Railway recommended)
3. ⏳ Deploy frontend and backend
4. ⏳ Update Google OAuth with production URLs
5. ⏳ Test production deployment

---

**Port is now fixed to 5173!** 🎉
