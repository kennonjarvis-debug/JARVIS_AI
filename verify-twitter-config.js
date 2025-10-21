#!/usr/bin/env node

/**
 * Twitter OAuth Configuration Diagnostics
 * Verifies that all Twitter OAuth settings are correct
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'packages/backend/.env') });

console.log('\n=== Twitter OAuth Configuration Check ===\n');

// Check environment variables
const clientId = process.env.TWITTER_OAUTH_CLIENT_ID;
const clientSecret = process.env.TWITTER_OAUTH_CLIENT_SECRET;

console.log('1. Environment Variables:');
console.log('   TWITTER_OAUTH_CLIENT_ID:', clientId ? `✓ Set (${clientId.substring(0, 20)}...)` : '✗ MISSING');
console.log('   TWITTER_OAUTH_CLIENT_SECRET:', clientSecret ? '✓ Set (hidden for security)' : '✗ MISSING');

console.log('\n2. Expected Callback URL:');
console.log('   Production: https://jarvis-ai.co/api/auth/twitter/callback');
console.log('   Development: http://localhost:3001/api/auth/twitter/callback');

console.log('\n3. Required URLs in Twitter Developer Portal:');
console.log('   Privacy Policy: https://jarvis-ai.co/privacy');
console.log('   Terms of Service: https://jarvis-ai.co/terms');
console.log('   Website: https://jarvis-ai.co');

console.log('\n4. OAuth 2.0 Settings Checklist:');
console.log('   [ ] App Type: "Web App"');
console.log('   [ ] OAuth 2.0: Enabled');
console.log('   [ ] App permissions: "Read and write" (NOT "Read and write and Direct message")');
console.log('   [ ] Callback URL: https://jarvis-ai.co/api/auth/twitter/callback (exact match)');
console.log('   [ ] Website URL: https://jarvis-ai.co');
console.log('   [ ] Privacy Policy URL: https://jarvis-ai.co/privacy');
console.log('   [ ] Terms of Service URL: https://jarvis-ai.co/terms');

console.log('\n5. Client ID from URL:');
console.log('   The Client ID in your OAuth URL is: QkUtRkh6akFOeGdjdzJME9FeGQ6MTpjaQ');
console.log('   This should EXACTLY match the Client ID in Twitter Developer Portal > Keys and tokens > OAuth 2.0 Client ID');

if (clientId && clientId !== 'QkUtRkh6akFOeGdjdzJME9FeGQ6MTpjaQ') {
  console.log('\n   ⚠️  WARNING: Client ID mismatch detected!');
  console.log('   Environment variable:', clientId);
  console.log('   Expected from URL: QkUtRkh6akFOeGdjdzJME9FeGQ6MTpjaQ');
  console.log('\n   ACTION REQUIRED: Update TWITTER_OAUTH_CLIENT_ID in Netlify environment variables');
}

console.log('\n6. Common Issues:');
console.log('   • Twitter takes 2-5 minutes to propagate configuration changes');
console.log('   • Client ID/Secret must be from OAuth 2.0 section (NOT OAuth 1.0a)');
console.log('   • Callback URL must be EXACT match (no trailing slash, correct protocol)');
console.log('   • App must be in "Production" environment in Twitter Developer Portal');

console.log('\n7. Next Steps:');
console.log('   1. Wait 5 minutes after saving Twitter settings');
console.log('   2. Verify Client ID in Twitter Portal matches the one above');
console.log('   3. Check that OAuth 2.0 is enabled (not just OAuth 1.0a)');
console.log('   4. Ensure app is NOT in restricted/suspended state');
console.log('   5. Try OAuth flow again');

console.log('\n8. If still failing, check:');
console.log('   • Twitter Developer Portal > App Settings > User authentication settings');
console.log('   • Verify "OAuth 2.0" toggle is ON');
console.log('   • Check app status (should be "Active")');
console.log('   • Try regenerating Client Secret if issue persists');

console.log('\n');
