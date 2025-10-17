# 🚀 Quick Start: Autonomous Jarvis for AI DAWG

**Status**: ✅ Phase 1 Complete & Ready
**Last Updated**: October 9, 2025

---

## ⚡ Start Autonomous Management in 30 Seconds

### Step 1: Navigate to Jarvis
```bash
cd /Users/benkennon/Jarvis
```

### Step 2: Start Autonomous Manager
```bash
npx tsx src/ai-dawg-manager/cli.ts start
```

**That's it!** Jarvis will now:
- ✅ Start AI Producer (port 8001)
- ✅ Start Vocal Coach (port 8000)
- ✅ Check health every 30 seconds
- ✅ Auto-restart failed services (max 3 attempts)
- ✅ Run indefinitely until you stop it

---

## 📋 Common Commands

### Check Status
```bash
npx tsx src/ai-dawg-manager/cli.ts status
```

**Shows**:
- Number of running/stopped/unhealthy services
- Uptime for each service
- Restart counts
- Health status

### Stop Autonomous Management
```bash
# Press Ctrl+C in the terminal where it's running
```

Or from another terminal:
```bash
npx tsx src/ai-dawg-manager/cli.ts stop
```

### Restart a Specific Service
```bash
npx tsx src/ai-dawg-manager/cli.ts restart producer
# or
npx tsx src/ai-dawg-manager/cli.ts restart vocal_coach
```

### Attempt Recovery
```bash
npx tsx src/ai-dawg-manager/cli.ts recover producer
```

---

## 🧪 Test the System

### Test 1: Start and Verify
```bash
# Start autonomous management
npx tsx src/ai-dawg-manager/cli.ts start

# In another terminal, check status after 10 seconds
npx tsx src/ai-dawg-manager/cli.ts status
```

**Expected**: Both services running

### Test 2: Test Auto-Recovery
```bash
# Kill AI Producer manually
lsof -ti:8001 | xargs kill -9

# Wait 30 seconds (next health check)
# Check logs - should see auto-recovery attempt
```

**Expected**: Jarvis detects failure and auto-restarts service

### Test 3: Check Audit Trail
```bash
tail -20 /Users/benkennon/Jarvis/data/audit.log
```

**Expected**: See all operations logged

---

## 📂 Important Files

| File | Purpose |
|------|---------|
| `config/autonomy.json` | Configuration (intervals, limits, services) |
| `data/service-state.json` | Current service state |
| `data/audit.log` | All operations log |
| `data/escalations.log` | Critical issues needing human |

---

## ⚙️ Configuration

**File**: `/Users/benkennon/Jarvis/config/autonomy.json`

### Change Health Check Interval
```json
"monitoring": {
  "health_check_interval_seconds": 30  // Change to 60 for every minute
}
```

### Change Max Restart Attempts
```json
"monitoring": {
  "max_restart_attempts": 3  // Change to 5 for more attempts
}
```

### Disable a Service
```json
"ai_dawg": {
  "services": {
    "brain": {
      "enabled": false  // Set to false to skip this service
    }
  }
}
```

### Emergency Stop All Autonomous Operations
```json
"safety": {
  "emergency_kill_switch": true  // Set to true to disable autonomy
}
```

---

## 🛡️ Safety Features

### Max Restart Attempts
- Default: 3 attempts
- After 3 failed restarts, Jarvis stops trying and escalates to human
- Check `data/escalations.log` for details

### Cooldown Period
- Default: 60 seconds between restart attempts
- Prevents restart loops
- Configurable in `autonomy.json`

### Escalation
After 5 consecutive failures:
```
🚨 ========================== ESCALATION REQUIRED ==========================
Service: producer
Status: CRITICAL - Repeated failures detected
Consecutive Failures: 5
==========================================================================
```

Logged to: `/Users/benkennon/Jarvis/data/escalations.log`

---

## 🔍 Monitoring

### Real-Time Status
```bash
# Run this in a loop to watch status
watch -n 5 "npx tsx src/ai-dawg-manager/cli.ts status"
```

### View Audit Log (Live)
```bash
tail -f /Users/benkennon/Jarvis/data/audit.log
```

### View Service Logs
```bash
# AI Producer
tail -f /Users/benkennon/ai-dawg-v0.1/logs/producer.log

# Vocal Coach
tail -f /Users/benkennon/ai-dawg-v0.1/logs/vocal_coach.log
```

---

## 🐛 Troubleshooting

### Services Won't Start

**Check 1**: Are ports already in use?
```bash
lsof -i :8000 :8001
```

**Fix**: Kill existing processes
```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:8001 | xargs kill -9
```

**Check 2**: Do Python venvs exist?
```bash
ls /Users/benkennon/ai-dawg-v0.1/src/ai/producer/venv
ls /Users/benkennon/ai-dawg-v0.1/src/ai/vocal_coach/venv
```

**Fix**: Create venvs if missing (see AI DAWG docs)

### Health Checks Failing

**Check**: Is service actually running?
```bash
ps aux | grep "python.*server.py"
```

**Check**: Does health endpoint respond?
```bash
curl http://localhost:8001/health
curl http://localhost:8000/health
```

### Auto-Recovery Not Working

**Check**: Has max restart limit been hit?
```bash
npx tsx src/ai-dawg-manager/cli.ts status
# Look for "Restarts: 3" - means limit reached
```

**Fix**: Wait for cooldown period (60s) or restart manager

---

## 📊 What's Happening Under the Hood

### Every 30 Seconds
1. Check `/health` endpoint for each service
2. If healthy: Update "last health check" timestamp
3. If unhealthy: Trigger auto-recovery

### Auto-Recovery Process
1. Check if within max restart attempts (3)
2. Check if within cooldown period (60s)
3. If yes to both: Attempt restart
4. If no: Escalate to human

### Audit Trail
Every operation logged:
```
2025-10-09T12:00:00.000Z | producer | start | SUCCESS | 2345ms
2025-10-09T12:05:00.000Z | producer | health_check | SUCCESS | 45ms
2025-10-09T12:10:00.000Z | vocal_coach | restart | SUCCESS | 3210ms
```

---

## 🎯 Success Indicators

After starting autonomous management, you should see:

**✅ In Terminal**:
```
✅ AI Producer started successfully (PID: 12345)
✅ Vocal Coach started successfully (PID: 12346)
💓 Starting health monitoring (interval: 30s)
✅ Autonomous management started successfully
```

**✅ In Status Check**:
```
📊 Total Services: 2
✅ Running: 2
⚠️  Unhealthy: 0
```

**✅ In Browser**:
- http://localhost:8001/health → {"status": "healthy"}
- http://localhost:8000/health → {"status": "healthy"}

---

## 📚 Next Steps

**After confirming Phase 1 works**:

1. Let it run for a few hours
2. Test auto-recovery by killing services
3. Review audit logs
4. Move to Phase 2: Intelligent Testing Engine

---

## 💡 Pro Tips

### Run in Background
```bash
# Use nohup to run in background
nohup npx tsx src/ai-dawg-manager/cli.ts start > jarvis.log 2>&1 &

# Check if running
ps aux | grep tsx

# Stop
pkill -f "tsx.*cli.ts"
```

### Create Alias
Add to `~/.zshrc` or `~/.bashrc`:
```bash
alias jarvis-start='cd /Users/benkennon/Jarvis && npx tsx src/ai-dawg-manager/cli.ts start'
alias jarvis-status='cd /Users/benkennon/Jarvis && npx tsx src/ai-dawg-manager/cli.ts status'
alias jarvis-stop='cd /Users/benkennon/Jarvis && npx tsx src/ai-dawg-manager/cli.ts stop'
```

Then:
```bash
jarvis-start   # Start autonomous management
jarvis-status  # Check status
jarvis-stop    # Stop
```

---

## 🎉 You're Ready!

**Jarvis is now autonomously running AI DAWG** with:
- ✅ Zero-touch operation
- ✅ Self-healing
- ✅ Full observability
- ✅ Safety mechanisms

**Enjoy your fully autonomous AI DAWG platform!** 🚀

---

**Need help?** Check:
- `README_AI_DAWG_MANAGER.md` - Full documentation
- `PHASE_1_COMPLETE.md` - Technical details
- `config/autonomy.json` - All settings
