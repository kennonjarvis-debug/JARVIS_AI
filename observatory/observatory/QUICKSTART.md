# Observatory Quick Start - 3 Minutes to Live Data

The Observatory is **already running** with mock data at http://localhost:5175

To connect **live data from Supabase**, you need to do 3 things:

---

## ✅ What's Already Done

- ✅ SvelteKit app running on port 5175
- ✅ `.env` file created with placeholders
- ✅ All setup scripts ready
- ✅ Database schema prepared (`supabase-schema.sql`)
- ✅ Mock data flowing (so you can see it working)

---

## 🚀 What YOU Need to Do (3 Minutes)

### Step 1: Create Supabase Project (60 seconds)

1. Open https://supabase.com in your browser
2. Click "Start your project" (sign in with GitHub if needed)
3. Click "New Project"
   - Name: `jarvis-observatory`
   - Database Password: (generate a strong one)
   - Region: (closest to you)
4. Wait 2 minutes for setup

### Step 2: Run SQL Schema (30 seconds)

1. In Supabase dashboard → **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `/Users/benkennon/Jarvis-v0/observatory/supabase-schema.sql`
4. Copy ALL contents
5. Paste into SQL Editor
6. Click **Run** (or Cmd/Ctrl + Enter)
7. Should see: "Success. No rows returned"

### Step 3: Get Your API Keys (30 seconds)

1. In Supabase dashboard → **Settings** → **API**
2. Copy these 3 values:

   ```
   Project URL: https://xxxxx.supabase.co
   anon public key: eyJ...
   service_role key: eyJ...
   ```

3. Edit `/Users/benkennon/Jarvis-v0/observatory/.env` and replace:

   ```bash
   PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co  # ← Your Project URL
   PUBLIC_SUPABASE_ANON_KEY=eyJ...                # ← Your anon key
   SUPABASE_SERVICE_ROLE_KEY=eyJ...               # ← Your service_role key
   ```

4. Save the file

---

## 🎯 That's It!

The dev server will auto-reload and connect to live data.

### Optional: Seed Sample Data

If you want some initial data to test with:

```bash
cd /Users/benkennon/Jarvis-v0/observatory
npm run db:setup
```

This will populate the database with sample business metrics, events, and agent runs.

---

## 🔍 Verify It's Working

1. Visit http://localhost:5175
2. Open browser console (F12)
3. Should see NO "Supabase not configured" warnings
4. Data should be loading from Supabase (or fallback to mock if DB is empty)

---

## 🆘 Troubleshooting

**Still seeing mock data?**
- Check `.env` has real values (not placeholders)
- Restart dev server: Kill it and run `npm run dev -- --port 5175 --host`
- Check browser console for errors

**"Failed to fetch" errors?**
- Verify Supabase project is running (not paused)
- Check API keys are correct
- Check SQL schema was run successfully

---

## 📚 Need More Details?

See `SETUP_GUIDE.md` for comprehensive setup instructions and troubleshooting.

---

**Current Status:**
- Observatory: ✅ Running at http://localhost:5175
- Supabase: ⏳ Waiting for your credentials
- Mock Data: ✅ Working (as fallback)
