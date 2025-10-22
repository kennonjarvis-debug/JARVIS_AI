const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const outFile = path.join(projectRoot, 'public', 'Jarvis.shortcut');
const logDir = path.resolve(projectRoot, '..', '..', '..', 'logs');
const logFile = path.join(logDir, 'shortcut_update.log');

try { fs.mkdirSync(logDir, { recursive: true }); } catch (_) {}

function log(line) {
  const stamp = new Date().toISOString();
  try { fs.appendFileSync(logFile, `[${stamp}] ${line}\n`); } catch (_) {}
  console.log(line);
}

const env = { ...process.env };
if (!env.NEXT_PUBLIC_JARVIS_API_URL) {
  env.NEXT_PUBLIC_JARVIS_API_URL = 'https://jarvis-ai-backend.onrender.com/api/ask';
}

const r = spawnSync('node', [
  path.join(projectRoot, 'scripts', 'build-jarvis-shortcut.js'),
  // default input inside build script
  outFile,
], { env, stdio: 'pipe' });

if (r.status === 0) {
  log('✅ Shortcut regenerated successfully.');
} else {
  log(`❌ Shortcut regeneration failed: ${r.error || r.stderr?.toString()}`);
}

