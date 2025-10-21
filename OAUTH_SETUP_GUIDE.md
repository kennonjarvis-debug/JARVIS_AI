# 🔐 OAuth Setup Guide for All Jarvis Integrations

Complete step-by-step guide to configure OAuth for each integration.

---

## 1️⃣ Twitter / X OAuth Setup

### Step 1: Create Twitter App
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Click "Create App" (or use existing app)
3. Fill in app details:
   - **App Name**: Jarvis AI
   - **Description**: AI-powered business automation platform
   - **Website URL**: https://jarvis-ai.co
   - **Callback URL**: `https://jarvis-ai.co/api/auth/twitter/callback`

### Step 2: Enable OAuth 2.0
1. Go to "User authentication settings"
2. Click "Set up"
3. Enable "OAuth 2.0"
4. **Type of App**: Web App
5. **Callback URLs**: `https://jarvis-ai.co/api/auth/twitter/callback`
6. **Website URL**: https://jarvis-ai.co

### Step 3: Get Credentials
1. Go to "Keys and tokens"
2. Copy **OAuth 2.0 Client ID** → `TWITTER_OAUTH_CLIENT_ID`
3. Copy **OAuth 2.0 Client Secret** → `TWITTER_OAUTH_CLIENT_SECRET`

### Step 4: Add to Environment
```bash
TWITTER_OAUTH_CLIENT_ID=your_client_id_here
TWITTER_OAUTH_CLIENT_SECRET=your_client_secret_here
```

**Current Status**: ✅ Already configured in netlify.toml

---

## 2️⃣ Google OAuth (Gmail + Calendar)

### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Click "Create Project"
3. Name: "Jarvis AI"
4. Click "Create"

### Step 2: Enable APIs
1. Go to "APIs & Services" → "Library"
2. Search and enable:
   - **Gmail API**
   - **Google Calendar API**

### Step 3: Create OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose **External** (unless you have Google Workspace)
3. Fill in:
   - **App name**: Jarvis AI
   - **User support email**: your-email@gmail.com
   - **Developer contact**: your-email@gmail.com
4. Add scopes:
   - Gmail: `gmail.readonly`, `gmail.send`, `gmail.modify`, `gmail.labels`
   - Calendar: `calendar`, `calendar.events`
5. Add test users (your own Gmail)
6. Click "Save and Continue"

### Step 4: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Choose **Web application**
4. **Name**: Jarvis AI Web Client
5. **Authorized redirect URIs**:
   - `https://jarvis-ai.co/api/integrations/gmail/callback`
   - `https://jarvis-ai.co/api/integrations/calendar/callback`
6. Click "Create"

### Step 5: Get Credentials
1. Copy **Client ID** → `GOOGLE_CLIENT_ID`
2. Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`

### Step 6: Add to Environment
```bash
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://jarvis-ai.co/api/integrations/gmail/callback
```

**Status**: ⚠️ Needs configuration

---

## 3️⃣ Meta (Facebook) OAuth Setup

### Step 1: Create Meta App
1. Go to https://developers.facebook.com/apps
2. Click "Create App"
3. Choose **Business** type
4. Fill in:
   - **App Name**: Jarvis AI
   - **App Contact Email**: your-email@gmail.com
5. Click "Create App"

### Step 2: Add Facebook Login Product
1. In app dashboard, click "Add Product"
2. Find "Facebook Login" → Click "Set Up"
3. Choose **Web**
4. **Site URL**: https://jarvis-ai.co

### Step 3: Configure OAuth Settings
1. Go to "Facebook Login" → "Settings"
2. **Valid OAuth Redirect URIs**:
   - `https://jarvis-ai.co/api/integrations/meta/callback`
3. **Deauthorize Callback URL**: `https://jarvis-ai.co/api/integrations/meta/deauthorize`
4. Save changes

### Step 4: Add Required Permissions
1. Go to "App Review" → "Permissions and Features"
2. Request these permissions:
   - `pages_manage_posts` - Create posts
   - `pages_read_engagement` - Read insights
   - `pages_read_user_content` - Read page content

### Step 5: Get Credentials
1. Go to "Settings" → "Basic"
2. Copy **App ID** → `META_APP_ID`
3. Copy **App Secret** → `META_APP_SECRET`

### Step 6: Add to Environment
```bash
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_REDIRECT_URI=https://jarvis-ai.co/api/integrations/meta/callback
```

**Status**: ⚠️ Needs configuration

---

## 4️⃣ Salesforce OAuth Setup

### Step 1: Create Connected App
1. Log into Salesforce
2. Go to **Setup** (gear icon → Setup)
3. Search for "App Manager" in Quick Find
4. Click "New Connected App"

### Step 2: Configure App
1. **Connected App Name**: Jarvis AI
2. **API Name**: Jarvis_AI
3. **Contact Email**: your-email@salesforce.com
4. Check "Enable OAuth Settings"
5. **Callback URL**: `https://jarvis-ai.co/api/integrations/salesforce/callback`

### Step 3: Select OAuth Scopes
Add these scopes:
- Full access (full)
- Perform requests at any time (refresh_token, offline_access)
- Access and manage your data (api)

### Step 4: Get Credentials
1. After saving, click "Manage Consumer Details"
2. Verify your identity
3. Copy **Consumer Key** → `SALESFORCE_CLIENT_ID`
4. Copy **Consumer Secret** → `SALESFORCE_CLIENT_SECRET`

### Step 5: Add to Environment
```bash
SALESFORCE_CLIENT_ID=your_consumer_key
SALESFORCE_CLIENT_SECRET=your_consumer_secret
SALESFORCE_REDIRECT_URI=https://jarvis-ai.co/api/integrations/salesforce/callback
```

**Status**: ⚠️ Needs configuration

---

## 5️⃣ HubSpot OAuth Setup

### Step 1: Create HubSpot App
1. Go to https://developers.hubspot.com/
2. Click "Create app" (or use existing)
3. **App name**: Jarvis AI
4. **Description**: AI-powered business automation

### Step 2: Configure Auth
1. Go to "Auth" tab
2. **Redirect URL**: `https://jarvis-ai.co/api/integrations/hubspot/callback`
3. Select required scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.companies.read`
   - `crm.objects.companies.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
   - `timeline`

### Step 3: Get Credentials
1. Go to "Auth" tab
2. Copy **Client ID** → `HUBSPOT_CLIENT_ID`
3. Copy **Client Secret** → `HUBSPOT_CLIENT_SECRET`

### Step 4: Add to Environment
```bash
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
HUBSPOT_REDIRECT_URI=https://jarvis-ai.co/api/integrations/hubspot/callback
```

**Status**: ⚠️ Needs configuration

---

## 6️⃣ Local Integrations (macOS Only)

These integrations work locally and don't require OAuth:

### iMessage
- ✅ Reads from `~/Library/Messages/chat.db`
- ✅ Sends via AppleScript
- **No configuration needed**

### Notes
- ✅ Creates notes via AppleScript
- ✅ Searches notes
- **No configuration needed**

### Voice Memos
- ✅ Reads from `~/Library/Application Support/com.apple.voicememos/Recordings`
- **No configuration needed**

**Requirements**:
- macOS 10.15 or later
- Grant "Full Disk Access" to Terminal/Node in System Preferences

---

## 📋 Quick Setup Checklist

### Priority 1 (Core Features)
- [x] Twitter OAuth - Already configured
- [ ] Google OAuth (Gmail + Calendar)
- [ ] Stripe - Already configured

### Priority 2 (CRM)
- [ ] Salesforce OAuth
- [ ] HubSpot OAuth

### Priority 3 (Social)
- [ ] Meta OAuth

### Priority 4 (Local - macOS only)
- [ ] Grant Full Disk Access for iMessage/Notes/Voice Memos

---

## 🚀 Quick Deploy Commands

After configuring OAuth credentials:

### Update Netlify Environment Variables
```bash
# Add Google OAuth
netlify env:set GOOGLE_CLIENT_ID "your_client_id"
netlify env:set GOOGLE_CLIENT_SECRET "your_secret"

# Add Meta OAuth
netlify env:set META_APP_ID "your_app_id"
netlify env:set META_APP_SECRET "your_secret"

# Add Salesforce OAuth
netlify env:set SALESFORCE_CLIENT_ID "your_key"
netlify env:set SALESFORCE_CLIENT_SECRET "your_secret"

# Add HubSpot OAuth
netlify env:set HUBSPOT_CLIENT_ID "your_id"
netlify env:set HUBSPOT_CLIENT_SECRET "your_secret"
```

### Redeploy
```bash
git add -A
git commit -m "Configure OAuth for all integrations"
git push origin main
```

Netlify will automatically redeploy with new environment variables.

---

## 🧪 Testing OAuth Flows

1. Go to https://jarvis-ai.co/dashboard
2. Click "Connect More Accounts"
3. Choose an integration
4. Click "Connect [Platform]"
5. Authorize in OAuth popup
6. Should redirect back to dashboard with connected status

---

## 🆘 Troubleshooting

### "redirect_uri_mismatch" Error
- Verify callback URL exactly matches in platform settings
- Make sure it's `https://jarvis-ai.co` not `http://` or `www.`

### "invalid_client" Error
- Check Client ID and Secret are correct
- Ensure no extra spaces when copying

### "access_denied" Error
- User cancelled authorization
- Try again with correct permissions

### Can't Connect Local Integrations
- Check macOS version (requires 10.15+)
- Grant Full Disk Access in System Preferences → Security & Privacy

---

## 📞 Need Help?

Each platform has detailed docs:
- Twitter: https://developer.twitter.com/en/docs/authentication
- Google: https://developers.google.com/identity/protocols/oauth2
- Meta: https://developers.facebook.com/docs/facebook-login
- Salesforce: https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm
- HubSpot: https://developers.hubspot.com/docs/api/oauth-quickstart-guide
