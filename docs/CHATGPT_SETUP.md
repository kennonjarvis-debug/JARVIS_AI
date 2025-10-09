# ChatGPT Custom GPT Setup Guide

Complete guide to setting up Jarvis AI as a ChatGPT Custom GPT with Actions.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Creating the Custom GPT](#creating-the-custom-gpt)
3. [Configuring Actions](#configuring-actions)
4. [Authentication Setup](#authentication-setup)
5. [Testing the Integration](#testing-the-integration)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Prerequisites

Before setting up the ChatGPT integration, ensure you have:

- ✅ Jarvis Control Plane running on port 4000
- ✅ AI Dawg Backend running on port 3001
- ✅ A ChatGPT Plus or Enterprise account
- ✅ Access to ChatGPT Custom GPT creation
- ✅ Public URL for your Jarvis instance (or ngrok for testing)
- ✅ API key configured in Jarvis (Bearer token)

---

## Creating the Custom GPT

### Step 1: Access GPT Builder

1. Go to [chat.openai.com](https://chat.openai.com)
2. Click on your profile → "My GPTs"
3. Click "Create a GPT" in the top right

### Step 2: Configure Basic Settings

In the **Configure** tab, set:

#### Name
```
Jarvis AI Assistant
```

#### Description
```
Your AI-powered assistant for music production, marketing analytics, user engagement, workflow automation, and system testing.
```

#### Instructions
```
You are Jarvis, an advanced AI assistant that helps users with:

1. **Music Production**
   - Generate original music from text descriptions
   - Analyze existing tracks (tempo, key, genre, mood)
   - Validate audio quality for production standards

2. **Marketing Analytics**
   - Retrieve performance metrics (impressions, clicks, conversions, ROI)
   - Manage marketing campaigns
   - Analyze growth trends and opportunities

3. **User Engagement**
   - Analyze sentiment from feedback and reviews
   - Detect users at risk of churning
   - Create re-engagement campaigns

4. **Workflow Automation**
   - Create and manage automated workflows
   - Generate predictive forecasts
   - Auto-scale resources intelligently

5. **System Testing**
   - Run comprehensive health checks
   - Validate system integrity and data

## Conversation Style

- Be conversational and friendly
- Provide clear, actionable responses
- Explain what actions you're taking and why
- Offer recommendations based on user patterns
- Ask clarifying questions when needed
- Summarize results in an easy-to-understand format

## When to Use Actions

Use actions for ANY request that involves:
- Generating content (music, forecasts)
- Analyzing data (sentiment, audio, metrics)
- Managing campaigns or workflows
- Checking system health or status
- Retrieving real-time data

## Job Management

Some operations (like music generation or forecasting) are asynchronous:
1. Tell the user the job has started
2. Provide the job ID
3. Explain how to check progress
4. Offer to check status automatically

## Error Handling

If an action fails:
1. Explain what went wrong in simple terms
2. Suggest alternatives or fixes
3. Offer to try again
4. Log the issue for follow-up

## Rate Limits

Be aware of rate limits:
- Music generation: 10/hour (resource intensive)
- Analysis actions: 100/hour
- Query actions: 200/hour
- Job status: 1000/hour

Inform users if they're approaching limits.

## Personalization

- Remember user preferences across the conversation
- Suggest actions based on their usage patterns
- Adapt response detail level to user preference

## Privacy & Security

- Never log sensitive information
- Don't expose API keys or tokens
- Respect user data privacy
```

#### Conversation Starters

Add these starter prompts:

```
🎵 Generate a chill lo-fi hip hop beat
📊 Show me my marketing metrics for this month
💬 Analyze sentiment from our recent user feedback
🤖 Create a workflow to scale resources automatically
🔍 Run a health check on all services
```

### Step 3: Upload Profile Picture

Use a professional logo or avatar for Jarvis (optional but recommended).

---

## Configuring Actions

### Step 1: Import OpenAPI Schema

1. In the **Configure** tab, scroll to **Actions**
2. Click "Create new action"
3. Click "Import from URL" or "Paste OpenAPI Schema"

#### Option A: Import from URL (Recommended)

If your Jarvis instance is publicly accessible:

```
https://your-jarvis-domain.com/openapi.chatgpt-v31.yaml
```

#### Option B: Paste Schema Directly

1. On your server, get the OpenAPI schema:
```bash
cat /Users/benkennon/Jarvis/src/integrations/chatgpt/openapi-schema.yaml
```

2. Copy the entire YAML content
3. Paste it into the ChatGPT schema editor

### Step 2: Verify Action Import

After import, you should see 15 actions:

**Music Actions:**
- `generateMusic`
- `analyzeMusic`
- `validateMusic`

**Marketing Actions:**
- `getMarketingMetrics`
- `manageCampaigns`
- `analyzeGrowth`

**Engagement Actions:**
- `analyzeSentiment`
- `detectChurn`
- `createReEngagement`

**Automation Actions:**
- `manageWorkflows`
- `generateForecast`
- `manageScaling`

**Testing Actions:**
- `runHealthChecks`
- `runValidation`

**Job Management:**
- `getJobStatus`

### Step 3: Update Server URLs

In the schema editor, update the server URL:

```yaml
servers:
  - url: https://your-jarvis-domain.com/integrations/chatgpt
    description: Production server
```

For local testing with ngrok:
```yaml
servers:
  - url: https://your-ngrok-id.ngrok-free.app/integrations/chatgpt
    description: Local development (ngrok)
```

---

## Authentication Setup

### Option 1: API Key Authentication (Recommended for Testing)

1. In the **Actions** section, scroll to **Authentication**
2. Select **API Key**
3. Configure:
   - **Auth Type**: API Key
   - **Header Name**: `Authorization`
   - **Value**: `Bearer YOUR_API_TOKEN`
   - **Auth Method**: Bearer

4. Get your API token from Jarvis:
```bash
# Check your .env file
cat /Users/benkennon/Jarvis/.env | grep JARVIS_AUTH_TOKEN
```

5. Enter the token in ChatGPT (with "Bearer " prefix)

### Option 2: OAuth (Recommended for Production)

For production deployments:

1. Set up OAuth provider (e.g., Auth0, Okta)
2. Configure OAuth in Actions:
   - **Auth Type**: OAuth
   - **Client ID**: Your OAuth client ID
   - **Client Secret**: Your OAuth client secret
   - **Authorization URL**: Your OAuth authorization endpoint
   - **Token URL**: Your OAuth token endpoint
   - **Scope**: `jarvis:read jarvis:write`

3. Implement OAuth flow in Jarvis (see `/integrations/chatgpt/middleware/auth.ts`)

---

## Testing the Integration

### Step 1: Test in GPT Builder

Before publishing, test each action:

1. Click "Test" in the GPT Builder
2. Try these commands:

```
Generate a happy upbeat pop song

Show my marketing metrics for this week

Analyze sentiment from social media

Run a health check
```

3. Verify:
   - Actions are called correctly
   - Results are formatted well
   - Error messages are clear
   - Job IDs work for async operations

### Step 2: Test Authentication

1. Remove authentication temporarily
2. Try an action - should get 401 Unauthorized
3. Re-add authentication
4. Try again - should work

### Step 3: Test Rate Limiting

1. Try music generation 11 times in quick succession
2. Should get rate limit error on 11th attempt
3. Verify retry-after message is clear

### Step 4: Monitor Logs

On your Jarvis server:

```bash
# Watch logs in real-time
tail -f /Users/benkennon/Jarvis/logs/jarvis.log

# Check for ChatGPT requests
grep "ChatGPT" /Users/benkennon/Jarvis/logs/jarvis.log
```

---

## Publishing the GPT

### Option 1: Only Me (Private Testing)
1. Click "Save" in top right
2. Select "Only me"
3. Test privately

### Option 2: Anyone with Link (Team Sharing)
1. Click "Save"
2. Select "Anyone with a link"
3. Share link with team

### Option 3: Public (After Testing)
1. Click "Save"
2. Select "Public"
3. Add to GPT Store (optional)

---

## Troubleshooting

### Actions Not Working

**Problem**: Actions fail with 401 Unauthorized

**Solution**:
```bash
# Verify Jarvis is running
curl http://localhost:4000/health

# Test ChatGPT endpoint directly
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/integrations/chatgpt/
```

**Problem**: Actions fail with CORS errors

**Solution**:
```bash
# Update CORS_ORIGIN in .env
echo "CORS_ORIGIN=*" >> /Users/benkennon/Jarvis/.env

# Restart Jarvis
cd /Users/benkennon/Jarvis && npm run dev
```

### Schema Import Fails

**Problem**: "Invalid OpenAPI schema" error

**Solution**:
```bash
# Validate schema
npx @apidevtools/swagger-cli validate \
  /Users/benkennon/Jarvis/src/integrations/chatgpt/openapi-schema.yaml

# Check OpenAPI version (must be 3.1.0)
head -n 5 /Users/benkennon/Jarvis/src/integrations/chatgpt/openapi-schema.yaml
```

### Rate Limits Too Strict

**Problem**: Users hitting rate limits frequently

**Solution**:

Edit `/Users/benkennon/Jarvis/src/integrations/chatgpt/middleware/rate-limit.ts`:

```typescript
// Increase limits
const RATE_LIMITS = {
  'music.generate': 20,  // Was 10
  'music.analyze': 200,  // Was 100
  // ...
};
```

### Job Status Not Updating

**Problem**: Async jobs stuck in "running" state

**Solution**:
```bash
# Check job manager
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/integrations/chatgpt/jobs-stats

# Check AI Dawg backend health
curl http://localhost:3001/health
```

---

## Best Practices

### For Users

1. **Be Specific**: Provide detailed prompts for music generation
   ```
   ❌ "make music"
   ✅ "Generate a 60-second upbeat electronic dance track with synthesizers, 120 BPM"
   ```

2. **Check Job Status**: For long operations, use the job ID to check progress
   ```
   Check the status of job job_music_gen_abc123
   ```

3. **Monitor Rate Limits**: Watch the X-RateLimit headers in responses

4. **Use Context**: Reference previous actions in conversation
   ```
   "Analyze the music I just generated"
   "Create a campaign for that segment we identified"
   ```

### For Administrators

1. **Monitor Logs**: Regularly check for errors and unusual patterns
   ```bash
   tail -f /Users/benkennon/Jarvis/logs/jarvis.log | grep ERROR
   ```

2. **Track Usage**: Monitor rate limit statistics
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:4000/integrations/chatgpt/jobs-stats
   ```

3. **Rotate API Keys**: Change keys regularly for security
   ```bash
   # Generate new token
   openssl rand -base64 32

   # Update .env
   nano /Users/benkennon/Jarvis/.env
   ```

4. **Backup Contexts**: Export user context data periodically (when implemented)

5. **Update Schema**: When adding new actions, update the OpenAPI schema and re-import in ChatGPT

---

## Advanced Configuration

### Custom Instructions Per Module

You can add module-specific instructions in the GPT configuration:

```
## Music Module Best Practices
- Always ask about tempo and genre preferences
- Suggest validating generated tracks
- Offer to analyze uploaded tracks

## Marketing Module Best Practices
- Start with time range for metrics
- Recommend growth analysis after viewing metrics
- Suggest A/B testing for campaigns

## Engagement Module Best Practices
- Ask about sentiment source (reviews vs social)
- Recommend re-engagement after churn detection
- Suggest monitoring sentiment trends

## Automation Module Best Practices
- Explain workflow triggers clearly
- Provide confidence intervals for forecasts
- Warn before auto-scaling production resources

## Testing Module Best Practices
- Run health checks proactively
- Validate before major deployments
- Schedule regular validation runs
```

### Webhook Callbacks (Future)

For real-time notifications:

```typescript
// In webhook-handler.ts
router.post('/callbacks/job-complete', (req, res) => {
  // Notify user via ChatGPT when job completes
  // Implementation depends on ChatGPT callback support
});
```

---

## Support

### Getting Help

- **Documentation**: `/Users/benkennon/Jarvis/docs/`
- **API Reference**: `http://localhost:4000/openapi.chatgpt-v31.yaml`
- **Logs**: `/Users/benkennon/Jarvis/logs/jarvis.log`
- **Issues**: GitHub Issues (if using repository)

### Common Questions

**Q: Can I use this with ChatGPT Teams?**
A: Yes! Share the GPT with your workspace.

**Q: How do I add more actions?**
A: Add endpoints to action handlers, update OpenAPI schema, re-import in ChatGPT.

**Q: Can I customize rate limits per user?**
A: Yes! Modify `rate-limit.ts` to check user tiers from database.

**Q: Is context preserved across sessions?**
A: Context persists for 24 hours. Extend TTL in `context-manager.ts` if needed.

**Q: Can I integrate with Slack/Discord?**
A: Not directly, but you can use ChatGPT API to build bridge bots.

---

## Next Steps

After successful setup:

1. ✅ Test all 15 actions thoroughly
2. ✅ Share with team for feedback
3. ✅ Monitor usage and performance
4. ✅ Add custom actions for your specific needs
5. ✅ Implement OAuth for production
6. ✅ Set up monitoring and alerting
7. ✅ Create user onboarding documentation

---

## Example Conversations

### Music Production Flow

```
User: Generate a chill lo-fi hip hop beat for studying

Jarvis: I'll create a chill lo-fi hip hop beat perfect for studying!

[Calls: generateMusic with prompt="Chill lo-fi hip hop beat..."]

Great! I've started generating your track.
Job ID: job_music_gen_7af2c1b9
Estimated time: 45 seconds

I'll check the status for you...

[After job completes]

✅ Your track is ready! It features:
- Smooth jazz piano chords
- Laid-back drum loop at 80 BPM
- Warm bass line
- Subtle vinyl crackle for that lo-fi aesthetic

Would you like me to:
1. Analyze the track's characteristics?
2. Validate it for streaming quality?
3. Generate a variation?
```

### Marketing Analytics Flow

```
User: Show me how my campaigns performed this month

Jarvis: I'll pull up your marketing metrics for this month!

[Calls: getMarketingMetrics with timeRange="month"]

Here's your month-to-date performance:

📊 **Overall Metrics**
- Impressions: 125,000 (+15% vs last month)
- Clicks: 3,200 (2.56% CTR)
- Conversions: 145
- ROI: 3.2x (very healthy!)
- Cost per acquisition: $12.50

🎯 **Top Campaigns**
1. Summer Sale: $4,200 revenue, 2.1x ROI
2. Email Newsletter: $3,800 revenue, 4.5x ROI (🌟 star performer!)
3. Social Ads: $2,100 revenue, 1.8x ROI

Would you like me to:
1. Run a growth analysis to forecast next quarter?
2. Suggest optimizations for underperforming campaigns?
3. Compare to competitor benchmarks?
```

---

**Last Updated**: 2025-10-08
**Version**: 2.0.0
**Jarvis Control Plane Port**: 4000
