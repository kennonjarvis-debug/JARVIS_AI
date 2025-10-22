# Quick Start: Test Twitter Integration

## Status
✅ Backend API running on port 3100
✅ Twitter credentials configured
✅ Supabase credentials configured
⏭️ **Next**: Run database migration and test Twitter posting

---

## Step 1: Run Supabase Migration (REQUIRED - Do this first!)

### Option A: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/nvyebkzrrvmepbdejspr/sql/new

2. Copy the entire contents of `supabase-migration.sql` file

3. Paste into the SQL editor

4. Click "Run" button

5. You should see: **Success. No rows returned**

6. Verify tables created:
   - Go to Table Editor: https://supabase.com/dashboard/project/nvyebkzrrvmepbdejspr/editor
   - You should see 9 new tables: `observatories`, `integrations`, `activity_logs`, etc.

### Option B: Via Command Line (Alternative)

```bash
# If you have Supabase CLI installed
cd /Users/benkennon/Projects_Archive/jarvis/jarvis-deploy
supabase db push
```

---

## Step 2: Get Your Observatory ID

After running the migration, the script automatically creates a default observatory called "DAWG AI" for your email (kennonjarvis@gmail.com).

### Get the Observatory ID:

**Option A: Via Supabase Dashboard**
1. Go to Table Editor: https://supabase.com/dashboard/project/nvyebkzrrvmepbdejspr/editor/public/observatories
2. Find the row with name "DAWG AI"
3. Copy the `id` column value (UUID format)

**Option B: Via SQL Query**
```sql
SELECT id, name FROM observatories WHERE name = 'DAWG AI';
```

**Option C: Via curl**
```bash
curl "https://nvyebkzrrvmepbdejspr.supabase.co/rest/v1/observatories?select=id,name&name=eq.DAWG%20AI" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52eWVia3pycnZtZXBiZGVqc3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg1OTI4NzEsImV4cCI6MjA0NDE2ODg3MX0.yp3wQSBRZfZoWNgTm7JYlZh-LSVD4k1OZaQxZA2Qb6g" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52eWVia3pycnZtZXBiZGVqc3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg1OTI4NzEsImV4cCI6MjA0NDE2ODg3MX0.yp3wQSBRZfZoWNgTm7JYlZh-LSVD4k1OZaQxZA2Qb6g"
```

Save this ID - you'll need it for all API calls. Example: `550e8400-e29b-41d4-a716-446655440000`

---

## Step 3: Connect Your Twitter Account

Replace `YOUR_OBSERVATORY_ID` with the ID from Step 2:

```bash
curl -X POST http://localhost:3100/api/integrations/twitter/connect \
  -H "Content-Type: application/json" \
  -d '{
    "observatory_id": "YOUR_OBSERVATORY_ID",
    "api_key": "i1edmBlxyYs0idXUSs7xUnjtM",
    "api_secret": "your-twitter-api-secret",
    "access_token": "1978598113255591936-p6y9F1uLQoQM8gE7ru8sDbNEkt6K03",
    "access_token_secret": "your-twitter-access-token-secret",
    "account_name": "@JarvisAiCo"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "integration": {
    "id": "integration-uuid-here",
    "platform": "twitter",
    "username": "JarvisAiCo",
    "name": "Jarvis AI Co",
    "status": "connected"
  }
}
```

If you get an error:
- Check that the backend server is running: `curl http://localhost:3100/health`
- Verify the observatory_id is correct
- Check the backend logs in the terminal

---

## Step 4: Post a Test Tweet

```bash
curl -X POST http://localhost:3100/api/integrations/twitter/tweet \
  -H "Content-Type: application/json" \
  -d '{
    "observatory_id": "YOUR_OBSERVATORY_ID",
    "text": "🤖 Testing JARVIS autonomous posting from the new integration framework! #AI #Automation #BuildInPublic"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "tweet": {
    "tweetId": "1234567890123456789",
    "url": "https://twitter.com/JarvisAiCo/status/1234567890123456789",
    "username": "JarvisAiCo"
  }
}
```

🎉 **Success!** Check Twitter to see your tweet: https://twitter.com/JarvisAiCo

---

## Step 5: Get Twitter Mentions

```bash
curl "http://localhost:3100/api/integrations/twitter/mentions?observatory_id=YOUR_OBSERVATORY_ID&max_results=5"
```

---

## Step 6: View Activity Logs

### Via Supabase Dashboard:
https://supabase.com/dashboard/project/nvyebkzrrvmepbdejspr/editor/public/activity_logs

### Via SQL:
```sql
SELECT
  created_at,
  activity_type,
  action,
  title,
  description,
  status,
  metadata
FROM activity_logs
WHERE observatory_id = 'YOUR_OBSERVATORY_ID'
ORDER BY created_at DESC
LIMIT 10;
```

### Via API:
```bash
# TODO: Add activity logs endpoint
```

---

## Troubleshooting

### Backend Not Running
```bash
# Check if it's running
curl http://localhost:3100/health

# Restart if needed
cd /Users/benkennon/Projects_Archive/jarvis/jarvis-deploy
npm run dev:backend
```

### Twitter Connection Fails
- Verify Twitter credentials are correct
- Check if tokens are still valid (they may have expired)
- Check backend logs for detailed error messages

### Database Tables Don't Exist
- Make sure you ran the migration (Step 1)
- Check Table Editor in Supabase dashboard
- Verify RLS policies are enabled

### Observatory Not Found
- Run the query in Step 2 to get the ID
- Make sure the migration created the default observatory
- You can manually create one if needed:
  ```sql
  INSERT INTO observatories (name, settings)
  VALUES ('DAWG AI', '{}');
  ```

---

## What's Logged

Every tweet you post creates TWO database records:

1. **activity_logs** table:
   - Records the action (created, failed, etc.)
   - Includes metadata (tweet ID, URL, text preview)
   - Links to integration and observatory

2. **social_posts** table:
   - Stores the full tweet content
   - External ID (Twitter's tweet ID)
   - Published timestamp
   - Engagement metrics (likes, retweets, etc.)

---

## Next Steps After Successful Test

1. **Add More Twitter Accounts**
   - Connect @DAWGAI account
   - Use same `connect` endpoint with different credentials

2. **Test with Media**
   ```bash
   # Save an image first
   curl -o /tmp/test-image.jpg https://example.com/image.jpg

   # Post with media
   curl -X POST http://localhost:3100/api/integrations/twitter/tweet \
     -H "Content-Type: application/json" \
     -d '{
       "observatory_id": "YOUR_OBSERVATORY_ID",
       "text": "Testing image posting! 📸",
       "media_path": "/tmp/test-image.jpg",
       "media_type": "image"
     }'
   ```

3. **Update Frontend**
   - Connect frontend to backend API
   - Replace mock data with real API calls
   - Build integration connection UI

4. **Port Gmail Integration**
   - Next priority integration
   - OAuth 2.0 flow
   - Email sending/reading

---

## API Endpoints Reference

```
Health Check
GET /health

List Available Integrations
GET /api/integrations

Get Connected Integrations
GET /api/integrations/connected?observatory_id=YOUR_ID

Connect Twitter
POST /api/integrations/twitter/connect

Post Tweet
POST /api/integrations/twitter/tweet

Get Mentions
GET /api/integrations/twitter/mentions?observatory_id=YOUR_ID

Disconnect Integration
DELETE /api/integrations/:id

Get Statistics
GET /api/integrations/stats
```

---

## Files Reference

- **Migration**: `/Users/benkennon/Projects_Archive/jarvis/jarvis-deploy/supabase-migration.sql`
- **Backend Env**: `/Users/benkennon/Projects_Archive/jarvis/jarvis-deploy/packages/backend/.env`
- **Twitter Integration**: `/Users/benkennon/Projects_Archive/jarvis/jarvis-deploy/packages/backend/src/integrations/twitter/TwitterIntegration.ts`
- **API Routes**: `/Users/benkennon/Projects_Archive/jarvis/jarvis-deploy/packages/backend/src/routes/integrations.ts`
- **Phase 2 Docs**: `/Users/benkennon/Projects_Archive/jarvis/jarvis-deploy/PHASE2_INTEGRATION_FRAMEWORK_COMPLETE.md`
- **Phase 3 Docs**: `/Users/benkennon/Projects_Archive/jarvis/jarvis-deploy/PHASE3_TWITTER_INTEGRATION_COMPLETE.md`

---

**Ready to test!** Start with Step 1 (run migration) then follow the steps above. 🚀
