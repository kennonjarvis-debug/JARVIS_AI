# AI DAWG Manager - Quick Reference Card

## 🚀 Quick Start

### 1. Run All Tests
```bash
./scripts/test-ai-dawg-manager.sh
```

### 2. Start Autonomous Manager
```bash
tsx src/ai-dawg-manager/cli.ts start
```

### 3. Check Status
```bash
tsx src/ai-dawg-manager/cli.ts status
```

---

## 📋 CLI Commands

| Command | Description | Example |
|---------|-------------|---------|
| `start` | Start autonomous management | `tsx src/ai-dawg-manager/cli.ts start` |
| `stop` | Stop autonomous management | `tsx src/ai-dawg-manager/cli.ts stop` |
| `status` | Show current status | `tsx src/ai-dawg-manager/cli.ts status` |
| `restart <service>` | Restart specific service | `tsx src/ai-dawg-manager/cli.ts restart producer` |
| `recover <service>` | Recover specific service | `tsx src/ai-dawg-manager/cli.ts recover vocal_coach` |
| `help` | Show help message | `tsx src/ai-dawg-manager/cli.ts help` |

---

## 🏥 Service Names

| Service | Port | Name |
|---------|------|------|
| `producer` | 8001 | AI Producer |
| `vocal_coach` | 8000 | Vocal Coach |
| `brain` | 8003 | AI Brain (disabled) |

---

## 🧪 Test Commands

### Run All AI DAWG Manager Tests
```bash
npm test -- tests/unit/ai-dawg-manager
```

### Run Specific Test Files
```bash
# Service Registry
npm test -- tests/unit/ai-dawg-manager/service-registry.test.ts

# Health Monitor
npm test -- tests/unit/ai-dawg-manager/health-monitor.test.ts

# Auto-Recovery
npm test -- tests/unit/ai-dawg-manager/auto-recovery.test.ts

# Integration
npm test -- tests/integration/ai-dawg-manager.integration.test.ts
```

### TypeScript Compilation Check
```bash
npx tsc --noEmit src/ai-dawg-manager/*.ts
```

---

## 📊 Status Indicators

| Icon | Status | Meaning |
|------|--------|---------|
| ✅ | Running | Service is healthy and running |
| 🛑 | Stopped | Service is intentionally stopped |
| ⚠️ | Unhealthy | Service is running but health check fails |
| 🔄 | Starting | Service is starting up |
| ⏹️ | Stopping | Service is shutting down |
| ❓ | Unknown | Service status is unknown |

---

## 🔧 Configuration

### Config File Location
```
/Users/benkennon/Jarvis/config/autonomy.json
```

### Key Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `health_check_interval_seconds` | 30 | Time between health checks |
| `health_check_timeout_seconds` | 5 | Health check timeout |
| `max_restart_attempts` | 3 | Max restart attempts before escalation |
| `restart_cooldown_seconds` | 60 | Cooldown between restarts |
| `max_consecutive_failures_before_escalation` | 5 | Failures before human escalation |
| `emergency_kill_switch` | false | Emergency stop all operations |

### Enable/Disable Services
```json
{
  "ai_dawg": {
    "services": {
      "producer": {
        "enabled": true    // Set to false to disable
      }
    }
  }
}
```

---

## 📁 Important Directories

| Directory | Purpose |
|-----------|---------|
| `/Users/benkennon/Jarvis/data` | Service state, audit logs |
| `/Users/benkennon/ai-dawg-v0.1/logs` | Service output logs |
| `/Users/benkennon/Jarvis/config` | Configuration files |
| `/Users/benkennon/Jarvis/src/ai-dawg-manager` | Source code |
| `/Users/benkennon/Jarvis/tests/unit/ai-dawg-manager` | Unit tests |

---

## 📝 Important Files

| File | Purpose |
|------|---------|
| `/data/service-state.json` | Persistent service state |
| `/data/audit.log` | Operation audit trail |
| `/data/escalations.log` | Escalation events |
| `/config/autonomy.json` | Main configuration |

---

## 🚨 Troubleshooting

### Service Won't Start

**Check port conflicts:**
```bash
lsof -ti:8001  # Check if port 8001 is in use
kill -9 $(lsof -ti:8001)  # Kill process on port
```

**Check service logs:**
```bash
tail -f /Users/benkennon/ai-dawg-v0.1/logs/producer.log
```

**Check Python venv:**
```bash
ls /Users/benkennon/ai-dawg-v0.1/src/ai/producer/venv
```

### Health Check Failures

**Test health endpoint manually:**
```bash
curl http://localhost:8001/health
```

**Check if service is listening:**
```bash
lsof -i:8001
```

### Manager Won't Start

**Check configuration:**
```bash
cat /Users/benkennon/Jarvis/config/autonomy.json | jq .
```

**Check emergency kill switch:**
```bash
jq '.safety.emergency_kill_switch' /Users/benkennon/Jarvis/config/autonomy.json
```

**Verify data directory:**
```bash
ls -la /Users/benkennon/Jarvis/data
```

### Escalation Triggered

**View escalations:**
```bash
cat /Users/benkennon/Jarvis/data/escalations.log
```

**Reset restart counters (manual):**
```bash
# Edit service-state.json
nano /Users/benkennon/Jarvis/data/service-state.json
# Set restart_count to 0
```

---

## 🔍 Monitoring

### View Audit Trail
```bash
tail -f /Users/benkennon/Jarvis/data/audit.log
```

### Check Service State
```bash
cat /Users/benkennon/Jarvis/data/service-state.json | jq .
```

### Monitor Service Logs
```bash
# Producer
tail -f /Users/benkennon/ai-dawg-v0.1/logs/producer.log

# Vocal Coach
tail -f /Users/benkennon/ai-dawg-v0.1/logs/vocal_coach.log
```

### Real-time Status
```bash
watch -n 5 'tsx src/ai-dawg-manager/cli.ts status'
```

---

## ⚡ Quick Fixes

### Reset Everything
```bash
# Stop manager
tsx src/ai-dawg-manager/cli.ts stop

# Kill all services
kill -9 $(lsof -ti:8000,8001,8003) 2>/dev/null || true

# Clear state
rm /Users/benkennon/Jarvis/data/service-state.json

# Restart
tsx src/ai-dawg-manager/cli.ts start
```

### Force Restart Service
```bash
# Kill service
kill -9 $(lsof -ti:8001)

# Restart via manager
tsx src/ai-dawg-manager/cli.ts restart producer
```

### Clear Audit Logs
```bash
# Backup first
cp /Users/benkennon/Jarvis/data/audit.log /Users/benkennon/Jarvis/data/audit.log.backup

# Clear
> /Users/benkennon/Jarvis/data/audit.log
```

---

## 🧪 Test Scenarios

### 1. Normal Startup
```bash
tsx src/ai-dawg-manager/cli.ts start
# Wait 10 seconds
tsx src/ai-dawg-manager/cli.ts status
# Expect: All services running
```

### 2. Service Crash Recovery
```bash
# Start manager
tsx src/ai-dawg-manager/cli.ts start

# Crash a service
kill -9 $(lsof -ti:8001)

# Wait 30-60 seconds for auto-recovery
tsx src/ai-dawg-manager/cli.ts status
# Expect: Service restarted automatically
```

### 3. Manual Recovery
```bash
# Check status
tsx src/ai-dawg-manager/cli.ts status

# Recover unhealthy service
tsx src/ai-dawg-manager/cli.ts recover producer

# Verify
tsx src/ai-dawg-manager/cli.ts status
```

### 4. Port Conflict
```bash
# Start something on port 8001
python -m http.server 8001 &

# Start manager (should kill conflict)
tsx src/ai-dawg-manager/cli.ts start

# Verify producer running
curl http://localhost:8001/health
```

---

## 📈 Success Metrics

### Healthy System
- ✅ All services status: `running`
- ✅ Health checks: Passing (< 100ms response)
- ✅ Restart count: 0
- ✅ Consecutive failures: 0
- ✅ No escalations in last 24h

### Check Health Metrics
```bash
tsx src/ai-dawg-manager/cli.ts status | grep -E "running|unhealthy"
```

### Check Restart Activity
```bash
grep "restart" /Users/benkennon/Jarvis/data/audit.log | tail -10
```

### Check Escalations
```bash
wc -l /Users/benkennon/Jarvis/data/escalations.log
# Should be 0 or very low
```

---

## 🎯 Common Tasks

### Add New Service
1. Edit `/config/autonomy.json`
2. Add service config under `ai_dawg.services`
3. Ensure health endpoint exists
4. Restart manager

### Change Health Check Interval
1. Edit `/config/autonomy.json`
2. Change `monitoring.health_check_interval_seconds`
3. Restart manager

### Disable Auto-Recovery
1. Edit `/config/autonomy.json`
2. Set `enabled: false`
3. Or set `emergency_kill_switch: true`

### Enable Notifications
1. Edit `/config/autonomy.json`
2. Set `notifications.enabled: true`
3. Add email/Slack config
4. Implement notification handlers (TODO)

---

## 🔗 Related Documentation

- **Full Validation Report:** `/AI_DAWG_MANAGER_VALIDATION_REPORT.md`
- **Source Code:** `/src/ai-dawg-manager/`
- **Unit Tests:** `/tests/unit/ai-dawg-manager/`
- **Integration Tests:** `/tests/integration/ai-dawg-manager.integration.test.ts`
- **Configuration:** `/config/autonomy.json`

---

## 💡 Tips

1. **Always check status before manual intervention**
   ```bash
   tsx src/ai-dawg-manager/cli.ts status
   ```

2. **Monitor audit logs during testing**
   ```bash
   tail -f /Users/benkennon/Jarvis/data/audit.log
   ```

3. **Use graceful shutdown**
   ```bash
   # Press Ctrl+C when running in foreground
   # Or use stop command
   tsx src/ai-dawg-manager/cli.ts stop
   ```

4. **Back up state before major changes**
   ```bash
   cp /Users/benkennon/Jarvis/data/service-state.json \
      /Users/benkennon/Jarvis/data/service-state.json.backup
   ```

5. **Test configuration changes in dev first**
   ```bash
   # Create test config
   cp config/autonomy.json config/autonomy-test.json
   # Modify test config
   # Test with: tsx src/ai-dawg-manager/cli.ts start (after updating path in code)
   ```

---

## 📞 Support

For issues or questions:
1. Check `/AI_DAWG_MANAGER_VALIDATION_REPORT.md`
2. Review audit logs: `/data/audit.log`
3. Check escalation logs: `/data/escalations.log`
4. Review test results: `npm test -- tests/unit/ai-dawg-manager`

---

**Last Updated:** October 9, 2025
**Version:** 1.0.0
**Status:** ✅ Validated and Ready for Testing
