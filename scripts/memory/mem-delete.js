#!/usr/bin/env node

/**
 * Secure Memory Delete Script
 * Removes entries from persistent memory
 *
 * Usage:
 *   node scripts/memory/mem-delete.js <key>         # Delete specific key
 *   node scripts/memory/mem-delete.js --clear       # Clear all memory
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MEMORY_FILE = path.join(__dirname, 'persistent_memory.json');

/**
 * Load memory from disk
 */
function loadMemory() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) {
      return {};
    }
    const content = fs.readFileSync(MEMORY_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load memory: ${error.message}`);
  }
}

/**
 * Save memory to disk
 */
function saveMemory(memory) {
  try {
    const content = JSON.stringify(memory, null, 2);
    fs.writeFileSync(MEMORY_FILE, content, 'utf8');
    return true;
  } catch (error) {
    throw new Error(`Failed to save memory: ${error.message}`);
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: Missing argument');
    console.error('Usage:');
    console.error('  node mem-delete.js <key>     # Delete specific key');
    console.error('  node mem-delete.js --clear   # Clear all memory');
    process.exit(1);
  }

  const command = args[0];

  try {
    // Handle --clear flag
    if (command === '--clear') {
      saveMemory({});
      console.log('✓ Memory cleared successfully');
      process.exit(0);
    }

    // Handle specific key deletion
    const key = command;
    const memory = loadMemory();

    if (!memory[key]) {
      console.error(`Error: Key '${key}' not found in memory`);
      process.exit(1);
    }

    delete memory[key];
    saveMemory(memory);

    console.log(`✓ Successfully deleted: ${key}`);
    process.exit(0);

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { loadMemory, saveMemory };
