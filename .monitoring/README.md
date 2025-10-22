# 🎯 Instance Monitoring System

Multi-instance Claude monitoring and tracking system for Jarvis & AI DAWG development.

## Quick Start

### View Dashboard
```bash
cat .monitoring/DASHBOARD.md
```

### Run Real-Time Monitor
```bash
bash .monitoring/monitor.sh loop
```

### Update Tracker (Manual)
```bash
node .monitoring/update-tracker.mjs
```

### Single Snapshot
```bash
bash .monitoring/monitor.sh once
```

## Commands

### Monitor Script (`monitor.sh`)

| Command | Description |
|---------|-------------|
| `loop` | Continuous monitoring (refreshes every 30s) |
| `once` | Single snapshot of current status |
| `dashboard` | Display the markdown dashboard |
| `git` | Check git activity only |
| `health` | Check service health only |

### Examples

```bash
# Start monitoring loop
bash .monitoring/monitor.sh loop

# Quick health check
bash .monitoring/monitor.sh health

# Check recent git activity
bash .monitoring/monitor.sh git

# One-time status snapshot
bash .monitoring/monitor.sh once
```

## Files

- **instance-tracker.json** - Machine-readable tracking data
- **DASHBOARD.md** - Human-readable dashboard
- **monitor.sh** - Real-time monitoring script
- **update-tracker.mjs** - Auto-update tracker data
- **monitor.log** - Monitor activity log

## Metrics Tracked

### Time Tracking
- Estimated hours per task
- Actual hours spent
- Efficiency ratio (estimated/actual)
- Time saved percentage

### Task Progress
- Tasks completed
- Tasks in progress
- Tasks pending
- Blockers count

### Instance Activity
- Current branches
- Recent commits
- Active status
- Current tasks

### Service Health
- Jarvis Control Plane (port 4000)
- AI DAWG Backend (port 3001)

## Auto-Update Setup

### Option 1: Cron Job
```bash
# Add to crontab (updates every 5 minutes)
*/5 * * * * cd /Users/benkennon/Jarvis && node .monitoring/update-tracker.mjs >> .monitoring/monitor.log 2>&1
```

### Option 2: Watch Script
```bash
# Run in background terminal
while true; do
  node .monitoring/update-tracker.mjs
  sleep 300  # 5 minutes
done
```

### Option 3: PM2
```bash
# Add to ecosystem.config.js
{
  name: "monitor",
  script: ".monitoring/update-tracker.mjs",
  cron_restart: "*/5 * * * *"
}
```

## Dashboard Interpretation

### Status Icons
- 🟢 Green: Good/Active/Online
- 🟡 Yellow: Warning/In Progress
- 🔴 Red: Critical/Error/Offline
- ⚪ White: Unknown/Inactive

### Efficiency Ratio
- **> 1.5x**: Significantly faster than estimated (🟢)
- **1.0-1.5x**: On track or slightly faster (🟡)
- **< 1.0x**: Slower than estimated (🔴)

### Blocker Severity
- **HIGH**: Blocks multiple tasks, immediate attention needed
- **MEDIUM**: Blocks one task, should be resolved soon
- **LOW**: Minor issue, can be deferred

## Tips

1. **Keep Dashboard Open**: Use a dedicated terminal to monitor progress
2. **Check Blockers**: Review blockers section regularly
3. **Track Efficiency**: Use metrics to improve estimates
4. **Monitor Services**: Ensure health checks pass before testing

## Troubleshooting

### No instance branches found
- Instances may not have created their branches yet
- Check if work is on existing branches

### Services offline
- Start Jarvis Control Plane: `npm run start:control-plane`
- Start AI DAWG: `cd /Users/benkennon/ai-dawg-v0.1 && npm start`

### Tracker not updating
- Ensure scripts are executable: `chmod +x .monitoring/*.sh .monitoring/*.mjs`
- Check monitor.log for errors
