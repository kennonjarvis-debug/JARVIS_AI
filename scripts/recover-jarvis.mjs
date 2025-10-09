#!/usr/bin/env node
// Jarvis AI System Recovery Script (ESM)
// Brings Jarvis AI + AI DAWG back online: ngrok, backend, ChatGPT Action, health
// Usage examples:
//   node scripts/recover-jarvis.mjs --once
//   node scripts/recover-jarvis.mjs --loop --interval 300
//   JARVIS_GPT_ID=... OPENAI_API_KEY=... node scripts/recover-jarvis.mjs --update-action

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import https from 'node:https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// ---------------------- Config (adjust if needed) ----------------------
const DEFAULT_BACKEND_PORT = Number(process.env.JARVIS_BACKEND_PORT || 3000);
const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';
const ENV_FILE = path.join(REPO_ROOT, '.env');
const AI_PLUGIN_FILE = path.join(REPO_ROOT, 'ai-plugin.json');

// Optional: common backend entry candidates (first found will be used if pm2/node fallback is required)
const BACKEND_ENTRY = path.join(REPO_ROOT, 'external', 'ai-dawg-v0.1', 'dist', 'backend', 'server.js');
const BACKEND_TS_ENTRY = path.join(REPO_ROOT, 'external', 'ai-dawg-v0.1', 'src', 'backend', 'server.ts');
const BACKEND_DIR = path.join(REPO_ROOT, 'external', 'ai-dawg-v0.1');

const TERMINAL_EXECUTOR_CANDIDATES = [
  path.join(REPO_ROOT, 'terminal-executor.service.js'),
  path.join(REPO_ROOT, 'dist', 'terminal-executor.service.js'),
  path.join(REPO_ROOT, 'external', 'ai-dawg-v0.1', 'dist', 'backend', 'services', 'terminal-executor.service.js'),
];

const HEALTH_ENDPOINTS = [
  '/health',
];

// --------------------------- CLI arguments ----------------------------
const args = new Set(process.argv.slice(2));
// Default to continuous loop unless --once is explicitly provided
const ONCE = args.has('--once');
const LOOP = args.has('--loop') || !ONCE;
const DISABLE_ACTION_UPDATE = args.has('--no-update-action');
const INTERVAL_SEC = Number(getArgValue('--interval') || 300); // default 5 minutes
const GPT_ACTION_ID = process.env.JARVIS_GPT_ID || getArgValue('--gpt-id') || 'jarvis-ai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.JARVIS_OPENAI_API_KEY || getArgValue('--api-key') || 'aigpt_b-Vwg_lDEBh5EX1tHM3frWlFTTdnylYbPImeY0XfI10';

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return '';
}

// ----------------------------- Logging --------------------------------
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function ts() {
  return new Date().toISOString();
}

function logInfo(msg) {
  console.log(`${COLORS.green}[INFO]${COLORS.reset} ${ts()}  ${msg}`);
}

function logWarn(msg) {
  console.warn(`${COLORS.yellow}[WARN]${COLORS.reset} ${ts()}  ${msg}`);
}

function logError(msg) {
  console.error(`${COLORS.red}[ERROR]${COLORS.reset} ${ts()} ${msg}`);
}

function logDebug(msg) {
  if (args.has('--debug')) {
    console.debug(`${COLORS.blue}[DEBUG]${COLORS.reset} ${ts()}  ${msg}`);
  }
}

// ----------------------------- Utilities ------------------------------
async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function backoffDelays(attempts = 5, baseMs = 500) {
  return Array.from({ length: attempts }, (_, i) => baseMs * Math.pow(2, i));
}

function spawnCmd(cmd, args = [], options = {}) {
  return new Promise((resolve) => {
    logDebug(`Spawn: ${cmd} ${args.join(' ')}`);
    const child = spawn(cmd, args, { stdio: 'pipe', ...options });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => {
      resolve({ code: -1, stdout, stderr: String(err) });
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function commandExists(cmd) {
  const which = process.platform === 'win32' ? 'where' : 'which';
  const res = await spawnCmd(which, [cmd]);
  return res.code === 0;
}

async function httpFetch(url, opts = {}) {
  // Prefer global fetch if available (Node 18+)
  if (typeof fetch === 'function') {
    return fetch(url, opts);
  }
  // Minimal fallback for GET/HEAD
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(
        u,
        { method: (opts.method || 'GET'), headers: opts.headers || {} },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              text: async () => body,
              json: async () => JSON.parse(body || '{}'),
              headers: res.headers,
            });
          });
        }
      );
      req.on('error', reject);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// --------------------------- Ngrok Helpers ----------------------------
async function getActiveNgrokUrl() {
  try {
    const res = await httpFetch(NGROK_API, { headers: { 'ngrok-skip-browser-warning': 'true' } });
    if (!res || (res.status && res.status >= 400)) return '';
    const data = await res.json();
    const tunnels = data.tunnels || [];
    const https = tunnels.find(t => (t.public_url || '').startsWith('https://')) || tunnels[0];
    return https ? https.public_url : '';
  } catch {
    return '';
  }
}

async function restartNgrok(port = DEFAULT_BACKEND_PORT) {
  logInfo(`Checking ngrok tunnel for port ${port}...`);
  let url = await getActiveNgrokUrl();
  if (url) {
    logInfo(`ngrok already active: ${url}`);
    return url;
  }

  const hasPm2 = await commandExists('pm2');
  const hasNgrok = await commandExists('ngrok');

  if (!hasNgrok) {
    logWarn('ngrok CLI not found in PATH. Please install: npm i -g ngrok');
  }

  if (hasPm2 && hasNgrok) {
    logInfo('Starting ngrok via pm2 (name: ngrok)...');
    // pm2 start ngrok --name ngrok -- http 3000
    await spawnCmd('pm2', ['delete', 'ngrok']).catch(() => {});
    await spawnCmd('pm2', ['start', 'ngrok', '--name', 'ngrok', '--', 'http', String(port)]);
  } else if (hasNgrok) {
    logInfo('Starting ngrok directly (background)...');
    // Best-effort background start using shell
    const logDir = path.join(REPO_ROOT, 'logs');
    if (!(await fileExists(logDir))) await fs.mkdir(logDir, { recursive: true });
    // macOS/Linux background
    spawn('bash', ['-lc', `nohup ngrok http ${port} > ${path.join(logDir, 'ngrok.log')} 2>&1 &`], { detached: true });
  } else {
    logError('Cannot start ngrok: pm2/ngrok not available.');
    return '';
  }

  // Wait for ngrok API to come up and report a URL
  for (const ms of backoffDelays(6, 750)) {
    await delay(ms);
    url = await getActiveNgrokUrl();
    if (url) {
      logInfo(`ngrok tunnel established: ${url}`);
      return url;
    }
    logDebug('Waiting for ngrok public URL...');
  }
  logError('ngrok did not expose a public URL in time.');
  return '';
}

// ------------------------- Backend Management -------------------------
async function findFirstExisting(paths) {
  for (const p of paths) {
    if (await fileExists(p)) return p;
  }
  return '';
}

async function isPortListening(port) {
  // Try a few common endpoints; consider 200 or 401 as listening
  const candidates = ['/health', '/status', '/api/v1/app/status', '/api/v1/jarvis/status'];
  for (const ep of candidates) {
    try {
      const res = await httpFetch(`http://127.0.0.1:${port}${ep}`, { method: 'GET' });
      if (!res) continue;
      if (res.status === 200 || res.status === 401) return true;
    } catch {}
  }
  return false;
}

async function pm2EnsureOnline(name) {
  const hasPm2 = await commandExists('pm2');
  if (!hasPm2) return false;
  const list = await spawnCmd('pm2', ['jlist']);
  if (list.code !== 0) return false;
  try {
    const arr = JSON.parse(list.stdout || '[]');
    const proc = arr.find(p => (p.name === name) || (p.pm2_env && p.pm2_env.name === name));
    return !!(proc && proc.pm2_env && proc.pm2_env.status === 'online');
  } catch {
    return false;
  }
}

async function startBackend() {
  const port = DEFAULT_BACKEND_PORT;
  if (await isPortListening(port)) {
    logInfo(`Backend appears reachable on port ${port}`);
    return true;
  }

  // Ensure entry exists
  const entry = BACKEND_ENTRY;
  const tsEntry = BACKEND_TS_ENTRY;
  if (!(await fileExists(entry))) {
    logWarn(`Backend entry not found at ${path.relative(REPO_ROOT, entry)}. Attempting TypeScript fallback via tsx...`);
    const localTsx = path.join(BACKEND_DIR, 'node_modules', '.bin', 'tsx');
    const hasLocalTsx = await fileExists(localTsx);
    const hasGlobalTsx = await commandExists('tsx');
    if ((hasLocalTsx || hasGlobalTsx) && await fileExists(tsEntry)) {
      if (await commandExists('pm2')) {
        if (!(await pm2EnsureOnline('dawg-backend'))) {
          const tsxCmd = hasLocalTsx ? localTsx : 'tsx';
          logInfo(`Starting backend (TS) with pm2 using tsx: ${path.relative(REPO_ROOT, tsEntry)}`);
          const res = await spawnCmd('pm2', ['start', tsxCmd, '--name', 'dawg-backend', '--', tsEntry], { cwd: BACKEND_DIR });
          if (res.code !== 0) logWarn(`pm2 tsx start failed: ${res.stderr || res.stdout}`);
        } else {
          logInfo('pm2 process dawg-backend already online.');
        }
      } else {
        logInfo(`Starting backend (TS) directly with tsx: ${path.relative(REPO_ROOT, tsEntry)}`);
        const logDir = path.join(REPO_ROOT, 'logs');
        if (!(await fileExists(logDir))) await fs.mkdir(logDir, { recursive: true });
        const tsxCmd = hasLocalTsx ? `"${localTsx}"` : 'tsx';
        spawn('bash', ['-lc', `cd "${BACKEND_DIR}" && nohup ${tsxCmd} "${tsEntry}" > ${path.join(REPO_ROOT, 'logs', 'backend.log')} 2>&1 &`], { detached: true });
      }
      // Wait for port to listen
      for (const ms of backoffDelays(8, 500)) {
        await delay(ms);
        if (await isPortListening(port)) return true;
      }
    } else {
      logWarn('tsx not found or TS entry missing; cannot start TypeScript fallback.');
    }
  } else {
    // Try pm2 first
    if (await commandExists('pm2')) {
      if (!(await pm2EnsureOnline('dawg-backend'))) {
        logInfo(`Starting backend with pm2: ${path.relative(REPO_ROOT, entry)}`);
        await spawnCmd('pm2', ['delete', 'dawg-backend']).catch(() => {});
        const res = await spawnCmd('pm2', ['start', entry, '--name', 'dawg-backend']);
        if (res.code !== 0) logWarn(`pm2 start failed: ${res.stderr || res.stdout}`);
      } else {
        logInfo('pm2 process dawg-backend already online.');
      }
    } else {
      // Fallback: start directly via node in background
      logInfo(`Starting backend directly: node ${path.relative(REPO_ROOT, entry)}`);
      const logDir = path.join(REPO_ROOT, 'logs');
      if (!(await fileExists(logDir))) await fs.mkdir(logDir, { recursive: true });
      spawn('bash', ['-lc', `nohup node "${entry}" > ${path.join(REPO_ROOT, 'logs', 'backend.log')} 2>&1 &`], { detached: true });
    }

    // Wait for port to listen
    for (const ms of backoffDelays(8, 500)) {
      await delay(ms);
      if (await isPortListening(port)) return true;
    }
    // Fallback to tsx if entry failed to come online
    const localTsx = path.join(BACKEND_DIR, 'node_modules', '.bin', 'tsx');
    const hasLocalTsx = await fileExists(localTsx);
    const hasGlobalTsx = await commandExists('tsx');
    if ((hasLocalTsx || hasGlobalTsx) && await fileExists(tsEntry)) {
      if (await commandExists('pm2')) {
        await spawnCmd('pm2', ['delete', 'dawg-backend']).catch(() => {});
        const tsxCmd = hasLocalTsx ? localTsx : 'tsx';
        logInfo(`Backend dist failed. Falling back to tsx via pm2: ${path.relative(REPO_ROOT, tsEntry)}`);
        const res = await spawnCmd('pm2', ['start', tsxCmd, '--name', 'dawg-backend', '--', tsEntry], { cwd: BACKEND_DIR });
        if (res.code !== 0) logWarn(`pm2 tsx start failed: ${res.stderr || res.stdout}`);
      } else {
        logInfo(`Backend dist failed. Falling back to tsx directly: ${path.relative(REPO_ROOT, tsEntry)}`);
        const logDir = path.join(REPO_ROOT, 'logs');
        if (!(await fileExists(logDir))) await fs.mkdir(logDir, { recursive: true });
        const tsxCmd = hasLocalTsx ? `"${localTsx}"` : 'tsx';
        spawn('bash', ['-lc', `cd "${BACKEND_DIR}" && nohup ${tsxCmd} "${tsEntry}" > ${path.join(REPO_ROOT, 'logs', 'backend.log')} 2>&1 &`], { detached: true });
      }
      for (const ms of backoffDelays(8, 500)) {
        await delay(ms);
        if (await isPortListening(port)) return true;
      }
    }
  }

  // Terminal executor (best effort)
  const termEntry = await findFirstExisting(TERMINAL_EXECUTOR_CANDIDATES);
  if (termEntry && await commandExists('pm2')) {
    const online = await pm2EnsureOnline('terminal-executor');
    if (!online) {
      logInfo('Starting terminal-executor with pm2...');
      await spawnCmd('pm2', ['start', termEntry, '--name', 'terminal-executor']);
    }
  }

  logError('Backend not confirmed online after attempts.');
  return false;
}

// -------------------------- Config Updaters ---------------------------
async function updateEnvBaseUrl(publicUrl) {
  try {
    let content = '';
    if (await fileExists(ENV_FILE)) {
      content = await fs.readFile(ENV_FILE, 'utf8');
    }
    const lines = content.split(/\r?\n/);
    let found = false;
    const out = lines.map((line) => {
      if (/^\s*JARVIS_API_BASE_URL\s*=/.test(line)) {
        found = true;
        return `JARVIS_API_BASE_URL=${publicUrl}`;
      }
      return line;
    });
    if (!found) out.push(`JARVIS_API_BASE_URL=${publicUrl}`);
    await fs.writeFile(ENV_FILE, out.join(os.EOL), 'utf8');
    logInfo(`Updated .env -> JARVIS_API_BASE_URL=${publicUrl}`);
    return true;
  } catch (e) {
    logWarn(`Failed to update .env: ${e.message}`);
    return false;
  }
}

function withNewBase(oldUrl, newBase) {
  try {
    const u = new URL(oldUrl);
    const base = new URL(newBase);
    return `${base.origin}${u.pathname}`;
  } catch {
    return `${newBase}`;
  }
}

async function updateAiPlugin(publicUrl) {
  try {
    if (!(await fileExists(AI_PLUGIN_FILE))) return false;
    const raw = await fs.readFile(AI_PLUGIN_FILE, 'utf8');
    const json = JSON.parse(raw);
    if (json.api && json.api.url) {
      json.api.url = withNewBase(json.api.url, publicUrl);
    }
    if (json.logo_url) json.logo_url = withNewBase(json.logo_url, publicUrl);
    if (json.legal_info_url) json.legal_info_url = withNewBase(json.legal_info_url, publicUrl);
    await fs.writeFile(AI_PLUGIN_FILE, JSON.stringify(json, null, 2) + '\n', 'utf8');
    logInfo(`Updated ai-plugin.json URLs to ${publicUrl}`);
    return true;
  } catch (e) {
    logWarn(`Failed to update ai-plugin.json: ${e.message}`);
    return false;
  }
}

async function findChatGPTConfigFiles() {
  // Search repo for files named chatgpt-config.json
  const results = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.git')) continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // limit depth somewhat to avoid huge traversals
        await walk(p);
      } else if (entry.isFile() && entry.name === 'chatgpt-config.json') {
        results.push(p);
      }
    }
  }
  await walk(REPO_ROOT);
  return results;
}

async function updateChatGPTConfigs(publicUrl) {
  const files = await findChatGPTConfigFiles();
  if (!files.length) {
    logWarn('No chatgpt-config.json file found to update (skipping).');
    return [];
  }
  const updated = [];
  for (const file of files) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      const json = JSON.parse(raw);
      if (Array.isArray(json.actions)) {
        for (const a of json.actions) {
          if (a && typeof a === 'object' && a.spec_url) {
            a.spec_url = `${publicUrl}/openapi.chatgpt.yaml`;
          }
        }
      } else if (json.spec_url) {
        json.spec_url = `${publicUrl}/openapi.chatgpt.yaml`;
      }
      await fs.writeFile(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
      updated.push(file);
      logInfo(`Updated ${path.relative(REPO_ROOT, file)} spec_url -> ${publicUrl}/openapi.chatgpt.yaml`);
    } catch (e) {
      logWarn(`Failed to update ${file}: ${e.message}`);
    }
  }
  return updated;
}

// -------------------- ChatGPT Action Re-registration ------------------
async function updateChatGPTAction(publicUrl) {
  if (DISABLE_ACTION_UPDATE) {
    logInfo('ChatGPT Action update disabled via --no-update-action.');
    return false;
  }
  if (!GPT_ACTION_ID) {
    logWarn('JARVIS_GPT_ID not provided. Set env or --gpt-id to update the Action.');
    return false;
  }
  if (!OPENAI_API_KEY) {
    logWarn('OPENAI_API_KEY not provided. Set env or --api-key to update the Action.');
    return false;
  }

  const url = `https://api.openai.com/v1/gpts/${encodeURIComponent(GPT_ACTION_ID)}/actions`;
  const payload = {
    actions: [
      {
        name: 'Jarvis AI',
        description: 'AI DAWG Controller backend API',
        spec_url: `${publicUrl}/openapi.chatgpt.yaml`,
      },
    ],
  };
  logInfo(`PATCH ChatGPT Action for GPT ${GPT_ACTION_ID} -> ${payload.actions[0].spec_url}`);

  try {
    const res = await httpFetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const ok = res && (res.status >= 200 && res.status < 300);
    const text = res ? await res.text() : '';
    if (!ok) {
      logWarn(`ChatGPT Action update response (${res?.status || 'n/a'}): ${text.slice(0, 500)}`);
      return false;
    }
    logInfo('ChatGPT Action updated successfully.');
    return true;
  } catch (e) {
    logWarn(`Failed to update ChatGPT Action: ${e.message}`);
    return false;
  }
}

// --------------------------- Health Checks ----------------------------
async function checkEndpoint(baseUrl, endpoint) {
  const url = `${baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  try {
    const res = await httpFetch(url, { method: 'GET', headers: { 'ngrok-skip-browser-warning': 'true' } });
    if (!res) return { status: 'down', code: 0 };
    if (res.status >= 200 && res.status < 300) return { status: 'healthy', code: res.status };
    // Treat method/ratelimit responses as degraded if reachable
    if ([401, 403, 405, 429].includes(res.status)) return { status: 'degraded', code: res.status };
    if (res.status >= 500) return { status: 'degraded', code: res.status };
    return { status: 'down', code: res.status };
  } catch {
    return { status: 'down', code: 0 };
  }
}

async function verifyHealth(publicUrl, localPort = DEFAULT_BACKEND_PORT) {
  const localBase = `http://127.0.0.1:${localPort}`;
  const targets = [
    { label: 'public', base: publicUrl },
    { label: 'local', base: localBase },
  ].filter(t => t.base);

  const results = [];
  for (const t of targets) {
    for (const ep of HEALTH_ENDPOINTS) {
      const r = await checkEndpoint(t.base, ep);
      results.push({ scope: t.label, endpoint: ep, ...r });
    }
  }
  return results;
}

function summarizeHealth(results) {
  const emoji = (s) => (s === 'healthy' ? '🟢' : s === 'degraded' ? '🟡' : '🔴');
  const lines = [];
  lines.push('');
  lines.push('Jarvis AI + AI DAWG Health Summary:');
  for (const r of results) {
    lines.push(`  ${emoji(r.status)}  [${r.scope}] ${r.endpoint} -> ${r.status.toUpperCase()} (HTTP ${r.code || 'N/A'})`);
  }
  lines.push('');
  return lines.join('\n');
}

// ------------------------ Optional Notifications ----------------------
async function slackNotify(text) {
  const webhook = process.env.SLACK_WEBHOOK_URL || '';
  if (!webhook) return false;
  try {
    const res = await httpFetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return res && res.status >= 200 && res.status < 300;
  } catch {
    return false;
  }
}

async function desktopNotify(title, message) {
  // macOS: try osascript; Linux: try notify-send
  if (process.platform === 'darwin') {
    const script = `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`;
    await spawnCmd('osascript', ['-e', script]);
    return true;
  }
  if (await commandExists('notify-send')) {
    await spawnCmd('notify-send', [title, message]);
    return true;
  }
  return false;
}

// ----------------------------- Main Flow ------------------------------
async function recoverOnce() {
  logInfo('=== Jarvis AI System Recovery: START ===');

  // 1) Ensure ngrok tunnel (get/establish public URL)
  let publicUrl = await getActiveNgrokUrl();
  if (!publicUrl) publicUrl = await restartNgrok(DEFAULT_BACKEND_PORT);
  if (!publicUrl) {
    logWarn('Proceeding without public URL (ngrok unavailable). Some steps will be skipped.');
  }

  // 2) Ensure backend services are running
  const backendOk = await startBackend();
  if (!backendOk) {
    logWarn('Backend not confirmed online. Health checks may fail.');
  }

  // 3) Update configuration files with new public URL
  if (publicUrl) {
    await updateEnvBaseUrl(publicUrl);
    await updateAiPlugin(publicUrl); // also update plugin manifest URLs if present
    await updateChatGPTConfigs(publicUrl);
  }

  // 4) Health verification
  const results = await verifyHealth(publicUrl || '', DEFAULT_BACKEND_PORT);
  const summary = summarizeHealth(results);
  console.log(summary);

  // Determine overall recovered state: accept 200 or 401 as OK
  const isOkCode = (code) => code === 200 || code === 401;
  const allOk = results.length > 0 && results.every(r => isOkCode(r.code));

  // 5) Re-register ChatGPT Action endpoint (auto if public URL available)
  if (publicUrl) {
    await updateChatGPTAction(publicUrl);
  }

  // 6) Notification and final log
  if (allOk) {
    logInfo('🟢 Backend online and responding.');
    const mode = LOOP ? 'Continuous Recovery (Loop Enabled)' : 'One-Shot Recovery';
    await slackNotify(`✅ Jarvis AI and DAWG backend are fully online.\nURL: ${publicUrl || '(no public URL)'}\nMode: ${mode}`);
  } else {
    const success = results.some(r => r.status === 'healthy');
    const overall = success ? 'Recovered (Partial)' : 'Attention Required';
    const note = `Jarvis recovery: ${overall}\n${summary}`;
    await slackNotify(note);
  }
  await desktopNotify('Jarvis Recovery', allOk ? 'Recovered' : 'Attention Required');

  logInfo('=== Jarvis AI System Recovery: END ===');
}

async function main() {
  if (ONCE) {
    await recoverOnce();
    return;
  }
  // Loop mode
  logInfo(`Entering loop mode. Interval: ${INTERVAL_SEC}s`);
  // Immediate run, then interval
  await recoverOnce();
  setInterval(() => {
    recoverOnce().catch(e => logError(`Recovery loop error: ${e.message}`));
  }, Math.max(60, INTERVAL_SEC) * 1000);
}

main().catch((e) => {
  logError(e.stack || e.message);
  process.exitCode = 1;
});
