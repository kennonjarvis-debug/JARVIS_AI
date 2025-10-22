/**
 * Quick Gmail Integration Test
 */

import { GmailIntegration } from '../src/integrations/gmail/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testGmail() {
  console.log('📧 Testing Gmail Integration\n');

  const gmail = new GmailIntegration();

  try {
    // Initialize Gmail
    await gmail.initialize();
    console.log('✅ Gmail initialized successfully\n');

    // Get inbox emails
    console.log('📥 Fetching recent inbox emails...');
    const emails = await gmail.getInboxEmails(5);

    console.log(`\n✅ Found ${emails.length} emails in inbox\n`);

    // Display email summaries
    emails.forEach((email, index) => {
      console.log(`Email ${index + 1}:`);
      console.log(`  From: ${email.from}`);
      console.log(`  Subject: ${email.subject}`);
      console.log(`  Date: ${email.date.toLocaleString()}`);
      console.log(`  Unread: ${email.isUnread ? 'Yes' : 'No'}`);
      console.log(`  Snippet: ${email.snippet.substring(0, 80)}...`);
      console.log('');
    });

    console.log('✅ Gmail integration is working perfectly!\n');
  } catch (error) {
    console.error('❌ Gmail test failed:', error);
    process.exit(1);
  }
}

testGmail().catch(console.error);
