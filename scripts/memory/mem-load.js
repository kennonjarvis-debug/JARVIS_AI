#!/usr/bin/env node

/**
 * Secure Memory Load Script
 * Retrieves values from persistent memory
 *
 * Usage:
 *   node scripts/memory/mem-load.js <key>           # Get specific key
 *   node scripts/memory/mem-load.js --all           # Get all keys
 *   node scripts/memory/mem-load.js --list          # List all keys only
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
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: Missing argument');
    console.error('Usage:');
    console.error('  node mem-load.js <key>      # Get specific key');
    console.error('  node mem-load.js --all      # Get all entries');
    console.error('  node mem-load.js --list     # List all keys');
    process.exit(1);
  }

  const command = args[0];

  try {
    const memory = loadMemory();

    // Handle --list flag
    if (command === '--list') {
      const keys = Object.keys(memory);
      if (keys.length === 0) {
        console.log('No entries in memory');
      } else {
        console.log(`Memory contains ${keys.length} key(s):`);
        keys.forEach(key => {
          const entry = memory[key];
          console.log(`  - ${key} (${entry.timestamp || 'no timestamp'})`);
        });
      }
      process.exit(0);
    }

    // Handle --all flag
    if (command === '--all') {
      console.log(JSON.stringify(memory, null, 2));
      process.exit(0);
    }

    // Handle specific key lookup
    const key = command;
    if (!memory[key]) {
      console.error(`Error: Key '${key}' not found in memory`);
      process.exit(1);
    }

    const entry = memory[key];
    console.log(JSON.stringify(entry, null, 2));
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

module.exports = { loadMemory };
