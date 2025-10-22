const { spawnSync } = require('child_process');
const path = require('path');
const script = path.resolve(__dirname, '..', '..', 'web', 'jarvis-web', 'scripts', 'shortcuts', 'auto-update-shortcut.js');
const r = spawnSync('node', [script], { stdio: 'inherit' });
process.exit(r.status || 0);

