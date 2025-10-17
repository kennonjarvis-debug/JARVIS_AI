/**
 * Migration Script: JSON Files → PostgreSQL
 *
 * Migrates all conversations from file-based JSON storage to PostgreSQL database
 *
 * Usage:
 *   tsx scripts/migrate-to-postgres.ts [--dry-run] [--backup]
 *
 * Options:
 *   --dry-run: Show what would be migrated without actually migrating
 *   --backup: Create backup of JSON files before migration
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { conversationStorePG } from '../src/core/conversation-store-pg.js';
import { pool, testConnection, initializeSchema } from '../src/db/pool.js';
import { logger } from '../src/utils/logger.js';

const DATA_DIR = './.data/conversations';
const BACKUP_DIR = './.data/conversations-backup';

interface MigrationStats {
  conversationsFound: number;
  conversationsMigrated: number;
  messagesMigrated: number;
  participantsMigrated: number;
  errors: Array<{ file: string; error: string }>;
}

/**
 * Main migration function
 */
async function migrate(options: { dryRun: boolean; backup: boolean }) {
  console.log('🚀 Starting migration from JSON to PostgreSQL...\n');

  const stats: MigrationStats = {
    conversationsFound: 0,
    conversationsMigrated: 0,
    messagesMigrated: 0,
    participantsMigrated: 0,
    errors: [],
  };

  try {
    // Step 1: Test database connection
    console.log('1️⃣  Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to PostgreSQL database');
    }
    console.log('   ✅ Database connection successful\n');

    // Step 2: Initialize schema
    console.log('2️⃣  Initializing database schema...');
    await initializeSchema();
    console.log('   ✅ Database schema ready\n');

    // Step 3: Initialize conversation store
    console.log('3️⃣  Initializing conversation store...');
    await conversationStorePG.initialize();
    console.log('   ✅ Conversation store initialized\n');

    // Step 4: Read JSON files
    console.log('4️⃣  Reading conversation files...');
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    stats.conversationsFound = jsonFiles.length;
    console.log(`   📁 Found ${jsonFiles.length} conversation files\n`);

    if (jsonFiles.length === 0) {
      console.log('   ℹ️  No conversations to migrate');
      return stats;
    }

    // Step 5: Backup if requested
    if (options.backup && !options.dryRun) {
      console.log('5️⃣  Creating backup...');
      await fs.mkdir(BACKUP_DIR, { recursive: true });

      for (const file of jsonFiles) {
        const sourcePath = path.join(DATA_DIR, file);
        const backupPath = path.join(BACKUP_DIR, file);
        await fs.copyFile(sourcePath, backupPath);
      }

      console.log(`   ✅ Backup created at ${BACKUP_DIR}\n`);
    }

    // Step 6: Migrate conversations
    console.log(`${options.backup ? '6️⃣' : '5️⃣'}  Migrating conversations...`);

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(DATA_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);

        // Parse conversation data
        const conversation = {
          ...data,
          created: new Date(data.created),
          updated: new Date(data.updated),
          messages: data.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        };

        if (options.dryRun) {
          console.log(`   [DRY RUN] Would migrate: ${conversation.id}`);
          console.log(`             Messages: ${conversation.messages.length}`);
          console.log(`             Participants: ${Object.keys(conversation.participants).length}`);

          stats.conversationsMigrated++;
          stats.messagesMigrated += conversation.messages.length;
          stats.participantsMigrated += Object.keys(conversation.participants).length;
          continue;
        }

        // Create conversation in database
        await conversationStorePG.getOrCreateConversation(conversation.id);

        // Migrate messages
        for (const message of conversation.messages) {
          await conversationStorePG.addMessage(message);
          stats.messagesMigrated++;
        }

        // Migrate participants
        for (const [source, participant] of Object.entries(conversation.participants)) {
          if (source === 'chatgpt') continue; // Skip chatgpt (different structure)

          const participantData = participant as any;
          await conversationStorePG.updateParticipantStatus(
            conversation.id,
            source as 'desktop' | 'web' | 'iphone',
            participantData.connected || false
          );

          stats.participantsMigrated++;
        }

        stats.conversationsMigrated++;
        console.log(`   ✅ Migrated: ${conversation.id} (${conversation.messages.length} messages)`);
      } catch (error: any) {
        console.error(`   ❌ Failed to migrate ${file}: ${error.message}`);
        stats.errors.push({ file, error: error.message });
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Conversations found: ${stats.conversationsFound}`);
    console.log(`   Conversations migrated: ${stats.conversationsMigrated}`);
    console.log(`   Messages migrated: ${stats.messagesMigrated}`);
    console.log(`   Participants migrated: ${stats.participantsMigrated}`);

    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors (${stats.errors.length}):`);
      stats.errors.forEach((err) => {
        console.log(`   - ${err.file}: ${err.error}`);
      });
    }

    // Step 7: Verify migration
    if (!options.dryRun) {
      console.log('\n7️⃣  Verifying migration...');
      const dbStats = await conversationStorePG.getStats();
      console.log(`   Database conversations: ${dbStats.totalConversations}`);
      console.log(`   Database messages: ${dbStats.totalMessages}`);

      if (dbStats.totalConversations === stats.conversationsMigrated) {
        console.log('   ✅ Migration verified successfully');
      } else {
        console.log('   ⚠️  Conversation count mismatch - please review');
      }
    }

    console.log('\n✅ Migration complete!');

    if (options.dryRun) {
      console.log('\n💡 This was a dry run. No changes were made.');
      console.log('   Run without --dry-run to perform actual migration.');
    } else {
      console.log('\n💡 Next steps:');
      console.log('   1. Verify data in PostgreSQL database');
      console.log('   2. Update main.ts to use conversationStorePG instead of conversationStore');
      console.log('   3. Test the application thoroughly');
      console.log(`   4. Remove old JSON files from ${DATA_DIR} (backup exists at ${BACKUP_DIR})`);
    }

    return stats;
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    // Close database connection
    await pool.end();
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): { dryRun: boolean; backup: boolean } {
  const args = process.argv.slice(2);

  return {
    dryRun: args.includes('--dry-run'),
    backup: args.includes('--backup'),
  };
}

/**
 * Entry point
 */
async function main() {
  const options = parseArgs();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  JARVIS Conversation Migration: JSON → PostgreSQL');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (options.dryRun) {
    console.log('🏃 Mode: DRY RUN (no changes will be made)\n');
  }

  if (options.backup) {
    console.log('💾 Backup: Enabled\n');
  }

  try {
    await migrate(options);
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

main();
