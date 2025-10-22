#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up cloud repositories...');

const REPOS = [
  {
    name: 'JARVIS_AI',
    url: 'https://github.com/kennonjarvis-debug/JARVIS_AI.git',
    path: '/app/repos/JARVIS_AI',
  },
  {
    name: 'DAWG_AI',
    url: 'https://github.com/kennonjarvis-debug/DAWG_AI.git',
    path: '/app/repos/DAWG_AI',
  },
];

function execCommand(cmd, cwd = process.cwd()) {
  try {
    console.log(`  Running: ${cmd}`);
    execSync(cmd, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`  ❌ Failed: ${error.message}`);
    return false;
  }
}

function setupRepo(repo) {
  console.log(`\n📁 Setting up ${repo.name}...`);

  // Create repos directory if it doesn't exist
  const reposDir = path.dirname(repo.path);
  if (!fs.existsSync(reposDir)) {
    fs.mkdirSync(reposDir, { recursive: true });
    console.log(`  Created directory: ${reposDir}`);
  }

  // Clone or pull repository
  if (fs.existsSync(repo.path)) {
    console.log(`  Repository exists, pulling latest changes...`);
    execCommand('git fetch origin', repo.path);
    execCommand('git reset --hard origin/main', repo.path);
  } else {
    console.log(`  Cloning repository...`);
    execCommand(`git clone ${repo.url} ${repo.path}`);
  }

  // Install dependencies
  if (fs.existsSync(path.join(repo.path, 'package.json'))) {
    console.log(`  Installing dependencies...`);
    execCommand('pnpm install --frozen-lockfile', repo.path);
  }

  console.log(`  ✅ ${repo.name} ready!`);
}

// Setup all repositories
console.log('Starting repository setup...\n');

for (const repo of REPOS) {
  setupRepo(repo);
}

console.log('\n✨ All repositories are ready!');
console.log('\nRepository paths:');
REPOS.forEach(repo => {
  console.log(`  - ${repo.name}: ${repo.path}`);
});
