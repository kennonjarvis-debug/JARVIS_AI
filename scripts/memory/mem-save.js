#!/usr/bin/env node

/**
 * Secure Memory Save Script
 * Accepts Base64-encoded values to avoid shell command injection/chaining issues
 *
 * Usage:
 *   node scripts/memory/mem-save.js <key> <base64_value>
 *   node scripts/memory/mem-save.js cost_audit_complete Q29tcGxldGUgT3BlcmF0aW5nIENvc3QgQXVkaXQ=
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MEMORY_FILE = path.join(__dirname, 'persistent_memory.json');

/**
 * Safely decode Base64 string
 */
function decodeBase64(base64String) {
  try {
    return Buffer.from(base64String, 'base64').toString('utf8');
  } catch (error) {
    throw new Error(`Failed to decode Base64: ${error.message}`);
  }
}

/**
 * Load existing memory or create empty object
 */
function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const content = fs.readFileSync(MEMORY_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Warning: Could not load existing memory: ${error.message}`);
  }
  return {};
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

  if (args.length < 2) {
    console.error('Error: Missing required arguments');
    console.error('Usage: node mem-save.js <key> <base64_value>');
    console.error('Example: node mem-save.js my_key SGVsbG8gV29ybGQ=');
    process.exit(1);
  }

  const [key, base64Value] = args;

  // Validate key
  if (!key || typeof key !== 'string' || key.trim() === '') {
    console.error('Error: Invalid key provided');
    process.exit(1);
  }

  // Validate Base64 value
  if (!base64Value || typeof base64Value !== 'string') {
    console.error('Error: Invalid Base64 value provided');
    process.exit(1);
  }

  try {
    // Decode the value
    const decodedValue = decodeBase64(base64Value);

    // Load existing memory
    const memory = loadMemory();

    // Store the value
    memory[key] = {
      value: decodedValue,
      timestamp: new Date().toISOString(),
      updatedBy: 'mem-save.js'
    };

    // Save to disk
    saveMemory(memory);

    console.log(`✓ Successfully saved: ${key}`);
    console.log(`  Value length: ${decodedValue.length} characters`);
    console.log(`  Timestamp: ${memory[key].timestamp}`);
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

module.exports = { decodeBase64, loadMemory, saveMemory };
