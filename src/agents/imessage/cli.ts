#!/usr/bin/env tsx
/**
 * iMessage Agent CLI
 * Command-line interface for managing the iMessage agent
 */

import { IMessageAgent } from './imessage-agent.js';
import { logger } from '../../utils/logger.js';

// Global agent instance
let agent: IMessageAgent | null = null;

async function main() {
  const command = process.argv[2];

  if (!command) {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case 'start':
      await startAgent();
      break;

    case 'stop':
      stopAgent();
      break;

    case 'status':
      getStatus();
      break;

    case 'whitelist':
      await manageWhitelist();
      break;

    case 'test':
      await testResponse();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

async function startAgent() {
  console.log('Starting iMessage agent...\n');

  agent = new IMessageAgent({
    enabled: true,
    pollIntervalMs: 2000,
    rateLimits: {
      maxPerHour: 3,
      maxPerDay: 10,
      minIntervalMinutes: 60,
    },
  });

  // Setup event listeners
  agent.on('started', () => {
    console.log('✅ iMessage agent started successfully\n');
    const status = agent.getStatus();
    console.log(`Monitoring ${status.whitelistedContacts} whitelisted contacts`);
    console.log('\nPress Ctrl+C to stop\n');
  });

  agent.on('response_sent', ({ message, response, confidence }) => {
    console.log(`\n📤 Response sent to ${message.handle}`);
    console.log(`   Received: "${message.text.substring(0, 60)}..."`);
    console.log(`   Replied: "${response.substring(0, 60)}..."`);
    console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%\n`);
  });

  agent.on('message_skipped', ({ message, reason, details }) => {
    console.log(`\n⏭️  Skipped message from ${message.handle}`);
    console.log(`   Reason: ${reason}`);
    if (details) {
      console.log(`   Details: ${details}`);
    }
  });

  agent.on('error', (error) => {
    console.error(`\n❌ Error: ${error.message}\n`);
  });

  await agent.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nStopping iMessage agent...');
    agent?.stop();
    process.exit(0);
  });

  // Keep process running
  await new Promise(() => {});
}

function stopAgent() {
  if (agent) {
    agent.stop();
    console.log('✅ iMessage agent stopped');
  } else {
    console.log('Agent not running');
  }
}

function getStatus() {
  agent = new IMessageAgent({ enabled: false });
  const status = agent.getStatus();
  const contactManager = agent.getContactManager();

  console.log('\n=== iMessage Agent Status ===\n');
  console.log(`Running: ${status.isRunning ? 'Yes' : 'No'}`);
  console.log(`Enabled: ${status.enabled ? 'Yes' : 'No'}`);
  console.log(`Whitelisted Contacts: ${status.whitelistedContacts}`);
  console.log(`Total Contacts: ${status.totalContacts}\n`);

  if (status.whitelistedContacts > 0) {
    console.log('=== Whitelisted Contacts ===\n');
    const contacts = contactManager.getWhitelistedContacts();
    for (const contact of contacts) {
      console.log(`  ${contact.handle}`);
      console.log(`    Type: ${contact.relationshipType}`);
      console.log(`    Responses: ${contact.responseCount}`);
      if (contact.lastResponseTime) {
        console.log(`    Last Response: ${contact.lastResponseTime.toLocaleString()}`);
      }
      console.log('');
    }
  }
}

async function manageWhitelist() {
  const action = process.argv[3];
  const handle = process.argv[4];
  const relationshipType = process.argv[5] as any || 'unknown';

  agent = new IMessageAgent({ enabled: false });
  const contactManager = agent.getContactManager();

  if (!action) {
    console.log('\nUsage: imessage whitelist <add|remove|list> [handle] [relationship-type]\n');
    console.log('Relationship types: dating, friend, family, business, acquaintance, unknown\n');
    return;
  }

  switch (action) {
    case 'add':
      if (!handle) {
        console.error('Error: Phone number/email required');
        return;
      }
      contactManager.addToWhitelist(handle, relationshipType);
      console.log(`✅ Added ${handle} to whitelist as ${relationshipType}`);
      break;

    case 'remove':
      if (!handle) {
        console.error('Error: Phone number/email required');
        return;
      }
      contactManager.removeFromWhitelist(handle);
      console.log(`✅ Removed ${handle} from whitelist`);
      break;

    case 'list':
      const contacts = contactManager.getWhitelistedContacts();
      console.log(`\n=== Whitelisted Contacts (${contacts.length}) ===\n`);
      for (const contact of contacts) {
        console.log(`  ${contact.handle} (${contact.relationshipType})`);
      }
      console.log('');
      break;

    default:
      console.error(`Unknown whitelist action: ${action}`);
  }
}

async function testResponse() {
  const testMessage = process.argv[3] || 'Hey! How are you doing?';

  console.log(`\nTesting AI response for message: "${testMessage}"\n`);

  agent = new IMessageAgent({ enabled: false });

  try {
    const response = await agent.testResponse(testMessage);
    console.log(`Response: "${response}"\n`);
  } catch (error: any) {
    console.error(`Error: ${error.message}\n`);
  }
}

function printHelp() {
  console.log(`
iMessage Agent CLI

Usage: imessage <command> [options]

Commands:
  start                          Start the iMessage auto-responder
  stop                           Stop the agent
  status                         Show agent status
  whitelist <action> [handle]    Manage whitelist
    add <handle> [type]          Add contact to whitelist
    remove <handle>              Remove contact from whitelist
    list                         List whitelisted contacts
  test [message]                 Test AI response generation

Examples:
  imessage start
  imessage whitelist add +15551234567 dating
  imessage whitelist remove +15551234567
  imessage test "Hey! What's up?"
`);
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
