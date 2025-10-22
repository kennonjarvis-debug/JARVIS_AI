#!/usr/bin/env node
// Automated tracker updater - parses git logs and updates instance-tracker.json

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JARVIS_ROOT = path.join(__dirname, '..');
const AI_DAWG_ROOT = '/Users/benkennon/ai-dawg-v0.1';
const TRACKER_FILE = path.join(__dirname, 'instance-tracker.json');
const DASHBOARD_FILE = path.join(__dirname, 'DASHBOARD.md');

// Helper to run git commands
function gitCommand(cwd, cmd) {
    try {
        return execSync(cmd, { cwd, encoding: 'utf8' }).trim();
    } catch (e) {
        return '';
    }
}

// Get recent commits for a branch
function getRecentCommits(repo, branch, hours = 6) {
    const since = `${hours} hours ago`;
    const cmd = `git log --since="${since}" --pretty=format:"%H|%ai|%an|%s" ${branch} 2>/dev/null`;
    const output = gitCommand(repo, cmd);

    if (!output) return [];

    return output.split('\n').map(line => {
        const [hash, timestamp, author, message] = line.split('|');
        return { hash: hash.substring(0, 7), timestamp, author, message };
    });
}

// Get all instance branches
function getInstanceBranches(repo) {
    const cmd = `git branch -a | grep -E "instance-[0-9]"`;
    const output = gitCommand(repo, cmd);

    if (!output) return [];

    return output.split('\n')
        .map(b => b.trim().replace('* ', '').replace('remotes/origin/', ''))
        .filter(b => b);
}

// Check service health
async function checkService(url) {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
        return response.ok;
    } catch {
        return false;
    }
}

// Main update function
async function updateTracker() {
    console.log('🔄 Updating instance tracker...');

    // Load current tracker
    let tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));

    // Update metadata
    tracker.metadata.updated = new Date().toISOString();

    // Check Jarvis branches
    const jarvisBranches = getInstanceBranches(JARVIS_ROOT);
    console.log(`Found ${jarvisBranches.length} Jarvis instance branches:`, jarvisBranches);

    // Check AI DAWG branches
    const dawgBranches = fs.existsSync(AI_DAWG_ROOT)
        ? getInstanceBranches(AI_DAWG_ROOT)
        : [];
    console.log(`Found ${dawgBranches.length} AI DAWG instance branches:`, dawgBranches);

    // Update instance-1 (Jarvis Core)
    if (jarvisBranches.includes('main-rearch/instance-1-jarvis-core')) {
        const commits = getRecentCommits(JARVIS_ROOT, 'main-rearch/instance-1-jarvis-core');
        if (commits.length > 0) {
            const latest = commits[0];
            tracker.instances['instance-1'].last_commit = {
                hash: latest.hash,
                message: latest.message,
                timestamp: latest.timestamp
            };
            tracker.instances['instance-1'].status = 'active';
        }
    }

    // Update instance-2 (AI DAWG)
    if (fs.existsSync(AI_DAWG_ROOT)) {
        // Check for instance branches in AI DAWG
        const aiDawgInstanceBranches = dawgBranches.filter(b => b.startsWith('instance/'));

        if (aiDawgInstanceBranches.length > 0) {
            // Get commits from all instance branches or main branch
            let commits = [];
            for (const branch of aiDawgInstanceBranches) {
                const branchCommits = getRecentCommits(AI_DAWG_ROOT, branch, 24);
                commits = commits.concat(branchCommits);
            }

            // Also check main branch
            const mainCommits = getRecentCommits(AI_DAWG_ROOT, 'main', 24);
            commits = commits.concat(mainCommits);

            // Sort by timestamp and get the latest
            if (commits.length > 0) {
                commits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                const latest = commits[0];

                tracker.instances['instance-2'].last_commit = {
                    hash: latest.hash,
                    message: latest.message,
                    timestamp: latest.timestamp
                };
                tracker.instances['instance-2'].status = 'active';

                // Detect which branch is active
                const activeBranch = aiDawgInstanceBranches[0] || 'main';
                tracker.instances['instance-2'].branch = activeBranch;
            }
        }
    }

    // Check service health
    const controlPlaneHealth = await checkService('http://localhost:4000/health');
    const aiDawgHealth = await checkService('http://localhost:3001/api/v1/jarvis/desktop/health');

    console.log(`Control Plane: ${controlPlaneHealth ? '✅' : '❌'}`);
    console.log(`AI DAWG: ${aiDawgHealth ? '✅' : '❌'}`);

    // Update metrics
    const tasks = [
        ...tracker.projects.jarvis.tasks,
        ...tracker.projects['ai-dawg'].tasks
    ];

    const completed = tasks.filter(t => t.status === 'completed');
    const inProgress = tasks.filter(t => t.status === 'in_progress');
    const pending = tasks.filter(t => t.status === 'pending');

    const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
    const totalActual = completed.reduce((sum, t) => sum + (t.actual_hours || 0), 0);

    tracker.metrics = {
        total_estimated_hours: totalEstimated,
        total_actual_hours: totalActual,
        efficiency_ratio: totalActual > 0 ? (totalEstimated / totalActual).toFixed(2) : 0,
        tasks_completed: completed.length,
        tasks_in_progress: inProgress.length,
        tasks_pending: pending.length,
        blockers_count: tracker.blockers.length,
        control_plane_healthy: controlPlaneHealth,
        ai_dawg_healthy: aiDawgHealth
    };

    // Save updated tracker
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));
    console.log('✅ Tracker updated');

    // Regenerate dashboard
    generateDashboard(tracker);

    return tracker;
}

// Generate markdown dashboard
function generateDashboard(tracker) {
    const metrics = tracker.metrics;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const efficiencyStatus = metrics.efficiency_ratio > 1.5 ? '🟢' :
                            metrics.efficiency_ratio > 1.0 ? '🟡' : '🔴';

    const dashboard = `# 🎯 Jarvis & AI DAWG Build - Instance Monitoring Dashboard

**Last Updated:** ${now} UTC
**Monitoring Instance:** Instance-0
**Status:** 🟢 Active

---

## 📊 Quick Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Estimated Total** | ${metrics.total_estimated_hours.toFixed(1)} hrs | - | - |
| **Actual Total** | ${metrics.total_actual_hours.toFixed(1)} hrs | ${metrics.total_estimated_hours.toFixed(1)} hrs | ${efficiencyStatus} ${((1 - metrics.total_actual_hours / metrics.total_estimated_hours) * 100).toFixed(0)}% faster |
| **Efficiency** | ${metrics.efficiency_ratio}x | 1.0x | ${efficiencyStatus} ${(metrics.efficiency_ratio * 100).toFixed(0)}% |
| **Tasks Complete** | ${metrics.tasks_completed} | ${metrics.tasks_completed + metrics.tasks_in_progress + metrics.tasks_pending} | ${metrics.tasks_completed >= 3 ? '🟢' : '🟡'} ${((metrics.tasks_completed / (metrics.tasks_completed + metrics.tasks_in_progress + metrics.tasks_pending)) * 100).toFixed(0)}% |
| **Active Blockers** | ${metrics.blockers_count} | 0 | ${metrics.blockers_count === 0 ? '🟢' : '🔴'} ${metrics.blockers_count > 0 ? 'Critical' : 'Clear'} |
| **Control Plane** | ${metrics.control_plane_healthy ? '🟢 Online' : '🔴 Offline'} | 🟢 Online | ${metrics.control_plane_healthy ? '✅' : '❌'} |
| **AI DAWG** | ${metrics.ai_dawg_healthy ? '🟢 Online' : '🔴 Offline'} | 🟢 Online | ${metrics.ai_dawg_healthy ? '✅' : '❌'} |

---

## 🤖 Instance Status

${Object.entries(tracker.instances).map(([id, inst]) => `
### ${id} ${inst.role ? `(${inst.role})` : ''}
- **Status:** ${inst.status === 'active' ? '🟢' : '⚪'} ${inst.status}
- **Current Task:** ${inst.current_task}
- **Branch:** \`${inst.branch}\`
${inst.last_commit ? `- **Last Commit:** \`${inst.last_commit.hash}\` - ${inst.last_commit.message}
- **Commit Time:** ${inst.last_commit.timestamp}` : ''}
`).join('\n')}

---

## 🚨 Active Blockers

${tracker.blockers.length === 0 ? '✅ No active blockers' : tracker.blockers.map(b => `
### ${b.severity === 'high' ? '🔴' : b.severity === 'medium' ? '🟡' : '🟢'} ${b.id.toUpperCase()}: ${b.description.split(':')[0]}
- **Severity:** ${b.severity.toUpperCase()}
- **Description:** ${b.description}
- **Affected Tasks:** ${b.affected_tasks.join(', ')}
- **Detected:** ${b.detected}
- **Resolution ETA:** ${b.resolution_eta}
`).join('\n')}

---

## 🔄 Auto-Refresh

This dashboard updates automatically. To manually refresh:
\`\`\`bash
node .monitoring/update-tracker.mjs
\`\`\`

To view real-time monitoring:
\`\`\`bash
bash .monitoring/monitor.sh loop
\`\`\`
`;

    fs.writeFileSync(DASHBOARD_FILE, dashboard);
    console.log('✅ Dashboard regenerated');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const loopMode = args.includes('--loop') || args.includes('-l');
    const interval = args.includes('--interval')
        ? parseInt(args[args.indexOf('--interval') + 1])
        : 30000; // 30 seconds default

    if (loopMode) {
        console.log(`🔄 Starting auto-refresh mode (interval: ${interval}ms)`);
        console.log('Press Ctrl+C to stop');

        // Run immediately
        updateTracker().catch(console.error);

        // Then run on interval
        setInterval(() => {
            updateTracker().catch(console.error);
        }, interval);
    } else {
        updateTracker().catch(console.error);
    }
}

export { updateTracker, generateDashboard };
