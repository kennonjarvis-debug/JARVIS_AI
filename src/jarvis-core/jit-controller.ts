#!/usr/bin/env tsx
/**
 * Jarvis JIT (Just-In-Time) Terminal Controller
 *
 * Allows Jarvis AI (GPT-5) to securely execute local CLI commands
 * through an authenticated bridge with permission controls.
 */

import express, { Request, Response, NextFunction } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.JIT_PORT || 4000;

// Configuration (loaded on startup)
let config: any = {
  permissions: {
    allow_local_exec: false,
    allow_git_ops: false,
    allow_build: false
  }
};

// Load configuration function
async function loadConfig() {
  try {
    const configPath = path.join(process.env.HOME || '', '.jarvis', 'config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    config = JSON.parse(configData);
    console.log('✅ Loaded Jarvis configuration');
  } catch (error) {
    console.error('⚠️  Warning: Could not load ~/.jarvis/config.json');
  }
}

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-ChatGPT-App-Key');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Authentication middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = config.auth?.header || 'X-ChatGPT-App-Key';
  const expectedKey = config.auth?.key;
  const providedKey = req.headers[authHeader.toLowerCase()];

  if (!expectedKey) {
    return next(); // No auth configured, allow through
  }

  if (providedKey !== expectedKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication key'
    });
  }

  next();
};

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'jarvis-jit-controller',
    timestamp: new Date().toISOString(),
    permissions: config.permissions || {},
    version: '2.0.0'
  });
});

// Status endpoint
app.get('/status', authenticate, (req, res) => {
  res.json({
    status: 'active',
    controller: 'running',
    port: PORT,
    config: {
      app_name: config.app_name,
      environment: config.environment,
      permissions: config.permissions
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Execute command endpoint
app.post('/execute', authenticate, async (req, res) => {
  const { command, cwd, timeout = 30000 } = req.body;

  if (!command) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Command is required'
    });
  }

  // Check permissions
  if (!config.permissions?.allow_local_exec) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Local command execution not permitted. Set allow_local_exec: true in config.'
    });
  }

  // Validate command permissions
  const isGitCommand = command.trim().startsWith('git ');
  const isBuildCommand = command.includes('npm run build') ||
                         command.includes('xcodebuild') ||
                         command.includes('make ');

  if (isGitCommand && !config.permissions?.allow_git_ops) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Git operations not permitted. Set allow_git_ops: true in config.'
    });
  }

  if (isBuildCommand && !config.permissions?.allow_build) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Build operations not permitted. Set allow_build: true in config.'
    });
  }

  console.log(`🔨 Executing command: ${command}`);
  if (cwd) {
    console.log(`📁 Working directory: ${cwd}`);
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      timeout,
      maxBuffer: 1024 * 1024 * 10 // 10MB
    });

    res.json({
      success: true,
      command,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Command completed successfully`);
  } catch (error: any) {
    console.error(`❌ Command failed:`, error.message);

    res.status(500).json({
      success: false,
      error: 'Execution failed',
      message: error.message,
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || '',
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
});

// Register endpoint (for backend registration)
app.post('/api/v1/jarvis/jit/register', authenticate, (req, res) => {
  const { status, url } = req.body;

  console.log(`📡 JIT Controller registration:`);
  console.log(`   Status: ${status}`);
  console.log(`   URL: ${url}`);

  res.json({
    status: 'registered',
    bridge: 'active',
    controller_port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Build project endpoint
app.post('/build', authenticate, async (req, res) => {
  const { project = 'jarvis-desktop', configuration = 'Release' } = req.body;

  if (!config.permissions?.allow_build) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Build operations not permitted'
    });
  }

  console.log(`🏗️  Starting build for ${project}...`);

  try {
    let command: string;
    let cwd: string;

    if (project === 'jarvis-desktop') {
      cwd = path.join(process.env.HOME || '', 'JarvisDesktop');
      command = `xcodebuild -project JarvisDesktop.xcodeproj -scheme JarvisDesktop -configuration ${configuration}`;
    } else {
      cwd = process.cwd();
      command = 'npm run build';
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 300000, // 5 minutes
      maxBuffer: 1024 * 1024 * 50 // 50MB
    });

    res.json({
      success: true,
      project,
      configuration,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Build completed successfully`);
  } catch (error: any) {
    console.error(`❌ Build failed:`, error.message);

    res.status(500).json({
      success: false,
      error: 'Build failed',
      message: error.message,
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || '',
      timestamp: new Date().toISOString()
    });
  }
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
async function startServer() {
  await loadConfig();

  app.listen(PORT, () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 Jarvis JIT Terminal Controller');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n✅ Status: ACTIVE`);
    console.log(`📡 Listening on: http://localhost:${PORT}`);
    console.log(`🌐 Backend URL: ${config.backend_url || 'Not configured'}`);
    console.log(`🔐 Authentication: ${config.auth?.key ? 'Enabled' : 'Disabled'}`);
    console.log('\n📋 Permissions:');
    console.log(`   • Local Exec: ${config.permissions?.allow_local_exec ? '✅' : '❌'}`);
    console.log(`   • Git Ops: ${config.permissions?.allow_git_ops ? '✅' : '❌'}`);
    console.log(`   • Build: ${config.permissions?.allow_build ? '✅' : '❌'}`);
    console.log('\n🔌 Available Endpoints:');
    console.log('   GET  /health          - Health check');
    console.log('   GET  /status          - Detailed status');
    console.log('   POST /execute         - Execute command');
    console.log('   POST /build           - Build project');
    console.log('   POST /api/v1/jarvis/jit/register - Register controller');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down JIT Controller gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down JIT Controller gracefully...');
  process.exit(0);
});
