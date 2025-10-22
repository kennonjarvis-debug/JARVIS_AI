#!/usr/bin/env node
/**
 * Gmail Authorization CLI
 *
 * Handles OAuth 2.0 authorization flow for Gmail integration
 */

import { GmailIntegration } from '../integrations/gmail/index';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

async function authorizeGmail() {
  console.log('🔐 Gmail Authorization for Jarvis\n');

  const gmail = new GmailIntegration();

  // Step 1: Generate authorization URL
  console.log('Step 1: Visit this URL to authorize Jarvis to access your Gmail:\n');
  const authUrl = gmail.getAuthUrl();
  console.log(authUrl);
  console.log('\n');

  // Step 2: Get authorization code from user
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise<string>((resolve) => {
    rl.question('Step 2: Paste the authorization code here: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  // Step 3: Exchange code for tokens
  try {
    console.log('\n✨ Exchanging authorization code for access token...');
    await gmail.authorize(code);
    console.log('✅ Authorization successful!');
    console.log('\n📧 Gmail integration is now ready to use.');
    console.log('\nYou can now:');
    console.log('  - Read emails: npm run test:gmail');
    console.log('  - Use Gmail in Jarvis agents');
    console.log('\nToken saved to: ~/.jarvis/gmail-token.json\n');
  } catch (error) {
    console.error('❌ Authorization failed:', error);
    console.error('\nPlease check:');
    console.error('  1. GOOGLE_CLIENT_ID is set in .env');
    console.error('  2. GOOGLE_CLIENT_SECRET is set in .env');
    console.error('  3. You copied the authorization code correctly');
    process.exit(1);
  }
}

authorizeGmail().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
