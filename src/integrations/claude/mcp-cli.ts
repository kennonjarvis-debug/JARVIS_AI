#!/usr/bin/env node
/**
 * Claude MCP Server CLI Entry Point
 *
 * Standalone executable for running JARVIS MCP Server
 * Used by Claude Desktop to communicate with JARVIS
 *
 * Usage in Claude Desktop config:
 * {
 *   "mcpServers": {
 *     "jarvis": {
 *       "command": "node",
 *       "args": ["/path/to/Jarvis/dist/integrations/claude/mcp-cli.js"]
 *     }
 *   }
 * }
 */

import { MCPServer } from './mcp-server.js';

/**
 * Main function
 */
async function main() {
  // Suppress regular console logs (MCP uses stdio for communication)
  // Only errors go to stderr
  console.log = () => {}; // Silent
  console.info = () => {}; // Silent
  console.debug = () => {}; // Silent

  // Create and start MCP server
  const server = new MCPServer();

  try {
    await server.start();

    // Keep process alive
    process.on('SIGINT', async () => {
      console.error('Shutting down MCP server...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Shutting down MCP server...');
      await server.stop();
      process.exit(0);
    });
  } catch (error: any) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
