# Quick Superadmin Setup Guide

**Your Email**: kennonjarvis@gmail.com
**Your Name**: Ben

---

## Option A: Use Supabase (Recommended - 5 minutes)

Supabase is cloud PostgreSQL - no local setup needed!

### 1. Create Supabase Project
1. Go to: https://supabase.com/dashboard
2. Click "New Project"
3. Name: `jarvis-production`
4. Database Password: (save this!)
5. Region: Choose closest to you
6. Click "Create new project" (takes ~2 minutes)

### 2. Get Database URL
Once project is ready:
1. Go to Project Settings → Database
2. Find "Connection string" section
3. Copy the **URI** (starts with `postgresql://`)
4. Replace `[YOUR-PASSWORD]` with your database password

### 3. Update Jarvis .env
```bash
cd ~/Jarvis
echo "DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres" >> .env
```

### 4. Push Database Schema
```bash
cd ~/Jarvis
npx prisma db push
```

### 5. Create Superadmin
```bash
npx tsx scripts/init-superadmin.ts
```

**✅ Done!** Save your API key when it prints.

---

## Option B: Fix Local PostgreSQL (10-15 minutes)

### 1. Enable TCP Connections
```bash
# Edit PostgreSQL config
nano /opt/homebrew/var/postgresql@15/postgresql.conf

# Find and change these lines:
listen_addresses = 'localhost'     # was '*' or commented out
port = 5432

# Save and exit (Ctrl+X, Y, Enter)
```

### 2. Restart PostgreSQL
```bash
brew services restart postgresql@15
sleep 5
```

### 3. Create Database
```bash
createdb jarvis
```

### 4. Update .env
```bash
cd ~/Jarvis
# Make sure DATABASE_URL is:
# DATABASE_URL=postgresql://benkennon@localhost:5432/jarvis
```

### 5. Push Schema & Create Superadmin
```bash
cd ~/Jarvis
npx prisma db push
npx tsx scripts/init-superadmin.ts
```

---

## Option C: Skip Database for Now (Use In-Memory)

If you want to test Stripe integration first without database:

### 1. Use Mock Superadmin
Create this file: `~/Jarvis/SUPERADMIN_KEY.txt`
```
jarvis_mock_12345_kennonjarvis_gmail_com
```

### 2. Test API
```bash
curl -H "Authorization: Bearer jarvis_mock_12345_kennonjarvis_gmail_com" \
  http://localhost:4000/health
```

### 3. Set Up Database Later
When ready, come back and do Option A (Supabase) or Option B (Local PostgreSQL)

---

## After Superadmin is Created

You'll see output like this:
```
✅ API key created:

   jarvis_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

⚠️  SAVE THIS API KEY - it will not be shown again!
```

**SAVE IT** somewhere safe (password manager, secure note).

---

## Test Your Superadmin Access

```bash
# Replace <YOUR_API_KEY> with the key from setup
curl -H "Authorization: Bearer <YOUR_API_KEY>" \
  http://localhost:4000/api/v1/status
```

If it works, you're ready to set up Stripe!

---

## Next: Stripe Setup

While I help you with Stripe, which option did you choose above?
- Option A: Supabase ✅ (recommended)
- Option B: Local PostgreSQL
- Option C: Skip for now

Let me know and I'll help you complete it!
