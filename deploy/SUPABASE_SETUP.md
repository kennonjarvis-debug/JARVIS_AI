# Supabase Google OAuth Setup for JARVIS

This guide will help you configure Google OAuth authentication for https://jarvis-ai.co/

## Prerequisites

- Supabase project URL: `https://nvyebkzrrvmepbdejspr.supabase.co`
- Access to Supabase dashboard
- Google Cloud Console access

## Step 1: Configure Google OAuth Provider in Supabase

1. **Go to Supabase Dashboard**:
   - Navigate to: https://supabase.com/dashboard/project/nvyebkzrrvmepbdejspr
   - Click on **Authentication** → **Providers**

2. **Enable Google Provider**:
   - Find **Google** in the list
   - Toggle it **ON**

3. **Get Redirect URL from Supabase**:
   - Copy the redirect URL shown (should be something like):
   ```
   https://nvyebkzrrvmepbdejspr.supabase.co/auth/v1/callback
   ```

## Step 2: Configure Google Cloud Console

1. **Go to Google Cloud Console**:
   - Visit: https://console.cloud.google.com/
   - Select your project (or create a new one)

2. **Enable Google+ API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click **Enable**

3. **Create OAuth 2.0 Credentials**:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `JARVIS AI`

4. **Configure Authorized URLs**:
   - **Authorized JavaScript origins**:
     ```
     https://jarvis-ai.co
     https://nvyebkzrrvmepbdejspr.supabase.co
     ```

   - **Authorized redirect URIs**:
     ```
     https://nvyebkzrrvmepbdejspr.supabase.co/auth/v1/callback
     https://jarvis-ai.co/auth/callback
     ```

5. **Save and Copy Credentials**:
   - Click **Create**
   - Copy the **Client ID** (looks like: `123456789-abc.apps.googleusercontent.com`)
   - Copy the **Client Secret**

## Step 3: Add Credentials to Supabase

1. **Return to Supabase Dashboard**:
   - Go back to **Authentication** → **Providers** → **Google**

2. **Enter Google Credentials**:
   - Paste **Client ID** from Google Console
   - Paste **Client Secret** from Google Console
   - Click **Save**

## Step 4: Configure Site URL in Supabase

1. **Go to Authentication Settings**:
   - Click **Authentication** → **URL Configuration**

2. **Set Site URL**:
   ```
   https://jarvis-ai.co
   ```

3. **Add Redirect URLs** (one per line):
   ```
   https://jarvis-ai.co/auth/callback
   https://jarvis-ai.co/**
   ```

4. **Click Save**

## Step 5: Test the Setup

1. **Deploy the updated code** to Netlify (see deployment steps below)

2. **Try signing in**:
   - Go to https://jarvis-ai.co/login
   - Click "Sign in with Google"
   - Authorize with kennonjarvis@gmail.com
   - Should redirect to Observatory (https://dawg-ai.com/)

## Troubleshooting

### Error: "Try signing in with a different account"

**Cause**: Google OAuth not properly configured in Supabase or redirect URLs not whitelisted

**Solution**:
1. Verify redirect URLs in both Supabase and Google Console match exactly
2. Make sure Google provider is enabled in Supabase
3. Check that Client ID and Secret are correct

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI in the request doesn't match what's configured in Google Console

**Solution**:
1. Check Google Console → Credentials → Your OAuth Client
2. Make sure this URI is listed:
   ```
   https://nvyebkzrrvmepbdejspr.supabase.co/auth/v1/callback
   ```

### User can't access dashboard

**Cause**: User needs to be added to database or needs superadmin role

**Solution**:
Run this SQL in Supabase SQL Editor:
```sql
-- Check if user exists
SELECT * FROM auth.users WHERE email = 'kennonjarvis@gmail.com';

-- If you want to create a profiles table for roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy to allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Set superadmin role
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'superadmin'
FROM auth.users
WHERE email = 'kennonjarvis@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'superadmin';
```

## Quick Command Reference

```bash
# Deploy to Netlify
cd ~/Projects_Archive/jarvis/jarvis-deploy
npm run build
netlify deploy --prod

# Check Netlify site
netlify status
```

## Security Notes

- Never commit OAuth secrets to git
- Keep Supabase keys secure
- Use environment variables for sensitive data
- Regularly rotate OAuth credentials
