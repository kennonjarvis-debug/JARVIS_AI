#!/usr/bin/env node

/**
 * Base64 Decoding Helper
 * Decodes Base64 back to text
 *
 * Usage:
 *   node scripts/memory/decode.js <base64_string>
 *   echo "SGVsbG8gV29ybGQ=" | node scripts/memory/decode.js
 */

const readline = require('readline');

/**
 * Decode Base64 to string
 */
function decodeFromBase64(base64String) {
  try {
    return Buffer.from(base64String, 'base64').toString('utf8');
  } catch (error) {
    throw new Error(`Failed to decode Base64: ${error.message}`);
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  // If argument provided, decode it
  if (args.length > 0) {
    try {
      const decoded = decodeFromBase64(args[0]);
      console.log(decoded);
      process.exit(0);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }

  // Otherwise, read from stdin
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  let input = '';

  rl.on('line', (line) => {
    input += line;
  });

  rl.on('close', () => {
    if (input) {
      try {
        const decoded = decodeFromBase64(input.trim());
        console.log(decoded);
        process.exit(0);
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    }
  });

  // Handle error
  rl.on('error', (err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { decodeFromBase64 };
