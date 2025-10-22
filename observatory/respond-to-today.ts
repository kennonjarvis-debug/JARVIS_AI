#!/usr/bin/env tsx
/**
 * Respond to all unanswered messages from today
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as os from 'os';
import sqlite3 from 'sqlite3';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface Message {
  id: number;
  guid: string;
  text: string;
  handle: string;
  date: string;
  isFromMe: boolean;
  chatId: number;
}

// Get iMessage database connection
function getDb(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(os.homedir(), 'Library', 'Messages', 'chat.db');
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

// Parse macOS date format
function parseMacDate(macDate: number): Date {
  const macEpoch = 978307200;
  const timestamp = macDate / 1000000000 + macEpoch;
  return new Date(timestamp * 1000);
}

// Get today's start timestamp in macOS format
function getTodayStartMacTimestamp(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const unixTimestamp = today.getTime() / 1000;
  const macEpoch = 978307200;
  const macTimestamp = (unixTimestamp - macEpoch) * 1000000000;
  return macTimestamp;
}

// Get unanswered messages from today
async function getUnansweredMessages(): Promise<Message[]> {
  const db = await getDb();
  const todayStart = getTodayStartMacTimestamp();

  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        m.ROWID as id,
        m.guid,
        m.text,
        m.is_from_me as isFromMe,
        m.date,
        h.id as handle,
        c.ROWID as chatId
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      LEFT JOIN chat c ON cmj.chat_id = c.ROWID
      WHERE m.date >= ?
        AND m.text IS NOT NULL
        AND m.is_from_me = 0
      ORDER BY m.date ASC
    `;

    db.all(query, [todayStart], (err, rows: any[]) => {
      db.close();
      if (err) reject(err);
      else {
        const messages = rows.map(row => ({
          id: row.id,
          guid: row.guid,
          text: row.text,
          handle: row.handle || 'Unknown',
          date: parseMacDate(row.date).toISOString(),
          isFromMe: row.isFromMe === 1,
          chatId: row.chatId,
        }));
        resolve(messages);
      }
    });
  });
}

// Check if a message has been responded to
async function hasResponse(chatId: number, messageId: number): Promise<boolean> {
  const db = await getDb();

  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(*) as count
      FROM message m
      LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      WHERE cmj.chat_id = ?
        AND m.ROWID > ?
        AND m.is_from_me = 1
      LIMIT 1
    `;

    db.get(query, [chatId, messageId], (err, row: any) => {
      db.close();
      if (err) reject(err);
      else resolve(row.count > 0);
    });
  });
}

// Generate response using Claude
async function generateResponse(message: Message): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are responding to an iMessage. Be natural, friendly, and brief (1-3 sentences).

From: ${message.handle}
Message: "${message.text}"

Generate an appropriate response based on the context. Match the tone - casual for casual messages, more formal for formal messages.`
    }]
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  throw new Error('Unexpected response format');
}

// Send message via AppleScript
async function sendMessage(handle: string, text: string): Promise<void> {
  const { execSync } = await import('child_process');

  // Escape text for AppleScript
  const escapedText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const escapedHandle = handle.replace(/"/g, '\\"');

  const script = `tell application "Messages"
    set targetService to 1st account whose service type = iMessage
    set targetBuddy to participant "${escapedHandle}" of targetService
    send "${escapedText}" to targetBuddy
  end tell`;

  execSync(`osascript -e '${script.replace(/'/g, "'\\''")}' 2>&1`, { encoding: 'utf-8' });
}

// Main execution
async function main() {
  console.log('🔍 Finding unanswered messages from today...\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set in .env file');
    process.exit(1);
  }

  const messages = await getUnansweredMessages();
  console.log(`📬 Found ${messages.length} messages from today\n`);

  let responded = 0;

  for (const msg of messages) {
    // Check if already responded
    const hasResp = await hasResponse(msg.chatId, msg.id);

    if (hasResp) {
      console.log(`⏭️  Skipping ${msg.handle} - already responded`);
      continue;
    }

    console.log(`\n📨 Processing message from ${msg.handle}:`);
    const preview = msg.text.length > 50 ? msg.text.substring(0, 50) + '...' : msg.text;
    console.log(`   "${preview}"`);

    try {
      // Generate response
      const response = await generateResponse(msg);
      console.log(`   🤖 Response: "${response}"`);

      // Send via iMessage
      await sendMessage(msg.handle, response);
      console.log(`   ✅ Sent!`);

      responded++;

      // Rate limit: wait 2 seconds between messages
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`   ❌ Failed: ${error}`);
    }
  }

  console.log(`\n✅ Done! Responded to ${responded}/${messages.length} messages`);
}

main().catch(console.error);
