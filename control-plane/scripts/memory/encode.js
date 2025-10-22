#!/usr/bin/env node

/**
 * Base64 Encoding Helper
 * Encodes text to Base64 for use with mem-save.js
 *
 * Usage:
 *   node scripts/memory/encode.js "Your text here"
 *   echo "Your text" | node scripts/memory/encode.js
 */

const readline = require('readline');

/**
 * Encode string to Base64
 */
function encodeToBase64(text) {
  return Buffer.from(text).toString('base64');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  // If argument provided, encode it
  if (args.length > 0) {
    const text = args.join(' ');
    const encoded = encodeToBase64(text);
    console.log(encoded);
    process.exit(0);
  }

  // Otherwise, read from stdin
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  let input = '';

  rl.on('line', (line) => {
    input += line + '\n';
  });

  rl.on('close', () => {
    if (input) {
      // Remove trailing newline
      input = input.replace(/\n$/, '');
      const encoded = encodeToBase64(input);
      console.log(encoded);
    }
    process.exit(0);
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

module.exports = { encodeToBase64 };
