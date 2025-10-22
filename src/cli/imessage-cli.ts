#!/usr/bin/env node

/**
 * CLI for managing Jarvis iMessage integration
 *
 * Usage:
 *   npm run imessage start       - Start monitoring iMessages
 *   npm run imessage stop        - Stop monitoring
 *   npm run imessage status      - Check status
 *   npm run imessage send <to> <message> - Send a message
 *   npm run imessage recent      - Show recent messages
 *   npm run imessage allow <handle> - Add allowed contact
 *   npm run imessage block <handle> - Block contact
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { IMessageAgent } from '../agents/imessage-agent';
import { Logger } from '../utils/logger';

const logger = new Logger('IMessageCLI');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    showHelp();
    process.exit(1);
  }

  const agent = new IMessageAgent();

  try {
    switch (command.toLowerCase()) {
      case 'start':
        await handleStart(agent);
        break;

      case 'stop':
        await handleStop(agent);
        break;

      case 'status':
        await handleStatus(agent);
        break;

      case 'send':
        await handleSend(agent, args[1], args.slice(2).join(' '));
        break;

      case 'recent':
        await handleRecent(agent, parseInt(args[1]) || 20);
        break;

      case 'conversation':
        await handleConversation(agent, args[1], parseInt(args[2]) || 20);
        break;

      case 'allow':
        await handleAllow(agent, args[1]);
        break;

      case 'block':
        await handleBlock(agent, args[1]);
        break;

      case 'test':
        await handleTest(agent);
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    logger.error('Command failed', error);
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function handleStart(agent: IMessageAgent): Promise<void> {
  console.log('🚀 Starting Jarvis iMessage agent...\n');

  await agent.start();

  console.log('✅ iMessage agent is now running');
  console.log('📱 Monitoring incoming messages...');
  console.log('\n💡 Press Ctrl+C to stop\n');

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping iMessage agent...');
    agent.stop();
    console.log('✅ Stopped');
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}

async function handleStop(agent: IMessageAgent): Promise<void> {
  console.log('🛑 Stopping iMessage agent...');
  agent.stop();
  console.log('✅ Stopped');
}

async function handleStatus(agent: IMessageAgent): Promise<void> {
  console.log('📊 iMessage Agent Status\n');

  const status = agent.getStatus();

  console.log(`Running: ${status.isRunning ? '✅ Yes' : '❌ No'}`);
  console.log(`Messages Processed: ${status.messagesProcessed}`);
  console.log(`Last Activity: ${status.lastActivity || 'N/A'}`);
}

async function handleSend(agent: IMessageAgent, to: string, message: string): Promise<void> {
  if (!to || !message) {
    console.error('❌ Usage: imessage send <phone|email> <message>');
    process.exit(1);
  }

  console.log(`📤 Sending message to ${to}...\n`);
  console.log(`Message: "${message}"\n`);

  await agent.sendMessage(to, message);

  console.log('✅ Message sent successfully');
}

async function handleRecent(agent: IMessageAgent, limit: number): Promise<void> {
  console.log(`📱 Recent Messages (last ${limit})\n`);

  const messages = agent.getRecentMessages(limit);

  if (messages.length === 0) {
    console.log('No messages found');
    return;
  }

  for (const msg of messages) {
    const direction = msg.isFromMe ? '→' : '←';
    const time = msg.date.toLocaleString();
    console.log(`${direction} ${msg.handleName} [${time}]`);
    console.log(`   ${msg.text.substring(0, 100)}${msg.text.length > 100 ? '...' : ''}`);
    console.log('');
  }
}

async function handleConversation(agent: IMessageAgent, handle: string, limit: number): Promise<void> {
  if (!handle) {
    console.error('❌ Usage: imessage conversation <phone|email> [limit]');
    process.exit(1);
  }

  console.log(`💬 Conversation with ${handle} (last ${limit})\n`);

  const messages = agent.getConversation(handle, limit);

  if (messages.length === 0) {
    console.log('No messages found with this contact');
    return;
  }

  for (const msg of messages) {
    const sender = msg.isFromMe ? 'Me' : handle;
    const time = msg.date.toLocaleTimeString();
    console.log(`[${time}] ${sender}:`);
    console.log(`  ${msg.text}`);
    console.log('');
  }
}

async function handleAllow(agent: IMessageAgent, handle: string): Promise<void> {
  if (!handle) {
    console.error('❌ Usage: imessage allow <phone|email>');
    process.exit(1);
  }

  agent.addAllowedContact(handle);
  console.log(`✅ Added ${handle} to allowed contacts for auto-responses`);
}

async function handleBlock(agent: IMessageAgent, handle: string): Promise<void> {
  if (!handle) {
    console.error('❌ Usage: imessage block <phone|email>');
    process.exit(1);
  }

  agent.blockContact(handle);
  console.log(`🚫 Blocked ${handle}`);
}

async function handleTest(agent: IMessageAgent): Promise<void> {
  console.log('🧪 Running iMessage Integration Tests\n');

  console.log('1. Testing iMessage database access...');
  try {
    const recent = agent.getRecentMessages(5);
    console.log(`   ✅ Successfully read ${recent.length} recent messages\n`);
  } catch (error) {
    console.log('   ❌ Failed to read messages');
    throw error;
  }

  console.log('2. Testing redaction system...');
  const { MessageRedactor } = await import('../integrations/imessage/redact');
  const redactor = new MessageRedactor();
  const testMessage = 'My card is 4532-1234-5678-9010 and SSN is 123-45-6789';
  const result = redactor.redact(testMessage);
  if (result.wasRedacted && result.redactionsApplied === 2) {
    console.log('   ✅ Redaction working correctly\n');
  } else {
    console.log('   ❌ Redaction failed');
    throw new Error('Redaction test failed');
  }

  console.log('3. Testing routing system...');
  const { MessageRouter } = await import('../integrations/imessage/router');
  const router = new MessageRouter();
  const testRouting = router.route({
    id: 1,
    guid: 'test',
    text: 'Help! My account is broken',
    handle: 'test@test.com',
    handleName: 'Test User',
    isFromMe: false,
    date: new Date(),
    chatId: 'test',
    attachments: []
  });
  if (testRouting.intent === 'support' || testRouting.intent === 'urgent') {
    console.log('   ✅ Routing working correctly\n');
  } else {
    console.log('   ❌ Routing failed');
    throw new Error('Routing test failed');
  }

  console.log('✅ All tests passed!');
}

function showHelp(): void {
  console.log(`
📱 Jarvis iMessage CLI

USAGE:
  npm run imessage <command> [options]

COMMANDS:
  start                    Start monitoring iMessages
  stop                     Stop monitoring
  status                   Show agent status
  send <to> <message>      Send a message
  recent [limit]           Show recent messages (default: 20)
  conversation <handle>    Show conversation with a contact
  allow <handle>           Add contact to auto-response whitelist
  block <handle>           Block a contact
  test                     Run integration tests
  help                     Show this help message

EXAMPLES:
  npm run imessage start
  npm run imessage send "+1234567890" "Hello from Jarvis!"
  npm run imessage recent 50
  npm run imessage conversation "+1234567890"
  npm run imessage allow "user@example.com"

NOTES:
  - Requires Full Disk Access permission for Terminal/iTerm
  - Messages.app must be signed in
  - Auto-responses require contacts to be in allowed list
  - High-risk messages require approval via Jarvis approval queue

For more information, see: docs/imessage-integration.md
  `);
}

// Run CLI if executed directly (ES module pattern)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
