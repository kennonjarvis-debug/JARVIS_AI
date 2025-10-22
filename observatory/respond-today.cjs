#!/usr/bin/env node
/**
 * Respond to all unanswered messages from today
 */

require('dotenv').config();
const sqlite3 = require('sqlite3');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk').default;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Get iMessage database connection
function getDb() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(os.homedir(), 'Library', 'Messages', 'chat.db');
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

// Parse macOS date format
function parseMacDate(macDate) {
  const macEpoch = 978307200;
  const timestamp = macDate / 1000000000 + macEpoch;
  return new Date(timestamp * 1000);
}

// Get today's start timestamp in macOS format
function getTodayStartMacTimestamp() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const unixTimestamp = today.getTime() / 1000;
  const macEpoch = 978307200;
  const macTimestamp = (unixTimestamp - macEpoch) * 1000000000;
  return macTimestamp;
}

// Get unanswered messages from today
async function getUnansweredMessages() {
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

    db.all(query, [todayStart], (err, rows) => {
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
async function hasResponse(chatId, messageId) {
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

    db.get(query, [chatId, messageId], (err, row) => {
      db.close();
      if (err) reject(err);
      else resolve(row.count > 0);
    });
  });
}

// Generate response using Claude
async function generateResponse(message) {
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
async function sendMessage(handle, text) {
  const escapedText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const script = `tell application "Messages" to send "${escapedText}" to buddy "${handle}"`;
  
  try {
    execSync(`osascript -e '${script}'`, { encoding: 'utf-8' });
  } catch (error) {
    console.error('   Error sending:', error.message);
    throw error;
  }
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

    const preview = msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : '');
    console.log(`\n📨 Processing message from ${msg.handle}:`);
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
      console.error(`   ❌ Failed: ${error.message}`);
    }
  }

  console.log(`\n✅ Done! Responded to ${responded}/${messages.length} messages`);
}

main().catch(console.error);
