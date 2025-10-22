# Gmail Integration Setup Guide

## Overview
This guide will help you set up Gmail access for Jarvis. Once configured, Jarvis can:
- Read your emails (inbox, unread, by label)
- Send emails and reply to threads
- Search emails
- Manage labels and mark emails as read/unread

## Prerequisites
- Google account with Gmail
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Jarvis Gmail Integration" → Click "Create"
4. Wait for the project to be created

## Step 2: Enable Gmail API

1. In the Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on "Gmail API" → Click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: "Jarvis"
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Click "Add or Remove Scopes", then add:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
   - Click "Save and Continue"
   - Test users: Add your email address
   - Click "Save and Continue"

4. Back in Credentials, click "Create Credentials" → "OAuth client ID"
   - Application type: "Desktop app"
   - Name: "Jarvis Gmail Client"
   - Click "Create"

5. Download the credentials JSON file or copy:
   - Client ID
   - Client Secret

## Step 4: Configure Environment Variables

Add these to your `.env` file:

```bash
# Gmail Integration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback
```

## Step 5: Authorize Jarvis

Run the authorization script:

```bash
npm run gmail:auth
```

This will:
1. Open a browser window for you to log in to Google
2. Ask you to grant Jarvis access to your Gmail
3. Redirect back with an authorization code
4. Save the access token to `~/.jarvis/gmail-token.json`

## Step 6: Test the Integration

```bash
npm run test:gmail
```

This will verify that Jarvis can:
- Read your inbox
- Get unread emails
- Search emails
- (Optional) Send a test email

## Usage

Once configured, Jarvis can automatically:
- Read and respond to important emails
- Notify you about urgent messages
- Draft email responses for your approval
- Search for specific emails on command

## Troubleshooting

### "Token has been expired or revoked"
- Re-run `npm run gmail:auth` to get a new token

### "Access blocked: This app's request is invalid"
- Make sure you added your email as a test user in the OAuth consent screen
- Verify all required scopes are enabled

### "The OAuth client was not found"
- Double-check your CLIENT_ID and CLIENT_SECRET in `.env`
- Make sure you downloaded credentials from the correct project

## Security Notes

- The Gmail token is stored locally at `~/.jarvis/gmail-token.json`
- Never commit this file to version control
- Keep your CLIENT_SECRET private
- Jarvis only requests the minimum permissions needed (read, send, modify)
- You can revoke access anytime at https://myaccount.google.com/permissions

## Next Steps

Once Gmail is set up, you can:
1. Configure email auto-responses in Jarvis
2. Set up email forwarding rules
3. Enable email notifications via iMessage
4. Integrate with other Jarvis agents
