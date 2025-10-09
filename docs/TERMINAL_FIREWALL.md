# Terminal Firewall Documentation

**CLAUDE A: Terminal Security & Command Firewall**
**Status:** ✅ Production Ready
**Version:** 1.0.0
**Date:** 2025-10-08

---

## Overview

The Terminal Firewall is a comprehensive security layer that enables safe, whitelisted command execution with approval workflows, audit logging, and threat detection. It prevents unauthorized or dangerous system operations while allowing legitimate automation.

### Key Features

- **Whitelist-based Security** - Only pre-approved commands can execute
- **Pattern-based Validation** - Regex-based argument filtering
- **Injection Prevention** - Detects and blocks shell injection attempts
- **Approval Workflow** - High-risk operations require manual approval
- **Comprehensive Audit Logging** - All executions logged with full details
- **Timeout Protection** - Commands automatically terminated after timeout
- **Real-time Statistics** - Monitor firewall activity and blocked attempts

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│             Terminal Firewall Stack                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  API Gateway (gateway.ts)                           │
│    │                                                 │
│    ├── POST /api/v1/terminal/execute                │
│    ├── GET  /api/v1/terminal/audit                  │
│    ├── GET  /api/v1/terminal/stats                  │
│    └── GET  /api/v1/terminal/whitelist              │
│                                                      │
│  Terminal Firewall (terminal-firewall.ts)           │
│    ├── Whitelist Manager                            │
│    ├── Command Executor                             │
│    ├── Approval Manager                             │
│    └── Statistics Tracker                           │
│                                                      │
│  Command Validator (command-validator.ts)           │
│    ├── Dangerous Pattern Detector                   │
│    ├── Injection Detector                           │
│    ├── Path Validator                               │
│    └── Argument Sanitizer                           │
│                                                      │
│  Audit Logger (audit-logger.ts)                     │
│    ├── JSON Log Writer                              │
│    ├── Log Query Engine                             │
│    ├── Retention Manager                            │
│    └── Export Tools                                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Whitelisted Commands

### Default Whitelist (13 Commands)

| Command | Auto-Approve | Clearance Level | Max Timeout | Description |
|---------|-------------|-----------------|-------------|-------------|
| `git` | ✅ Yes | 1 | 60s | Version control operations |
| `npm` | ✅ Yes | 1 | 300s | Package management |
| `node` | ✅ Yes | 1 | 120s | Node.js execution |
| `docker` | ✅ Yes | 2 | 300s | Container operations |
| `docker-compose` | ✅ Yes | 2 | 300s | Multi-container orchestration |
| `kubectl` | ❌ No | 3 | 300s | Kubernetes operations |
| `terraform` | ❌ No | 3 | 600s | Infrastructure as Code |
| `pm2` | ✅ Yes | 2 | 60s | Process management |
| `aws` | ❌ No | 3 | 300s | AWS CLI operations |
| `curl` | ✅ Yes | 0 | 30s | HTTP client |
| `ps` | ✅ Yes | 0 | 5s | Process status |
| `df` | ✅ Yes | 0 | 5s | Disk usage |
| `free` | ✅ Yes | 0 | 5s | Memory usage |

### Clearance Levels

- **Level 0 (READ_ONLY)**: Read-only operations, no modifications
- **Level 1 (SUGGEST)**: Safe modifications, code changes
- **Level 2 (MODIFY_SAFE)**: Service operations, non-production changes
- **Level 3 (MODIFY_PRODUCTION)**: Production deployments, infrastructure
- **Level 4 (MODIFY_CRITICAL)**: Critical systems, data operations

---

## Usage

### Execute Command

```typescript
import { terminalFirewall } from './core/security/terminal-firewall.js';

// Execute safe command
const result = await terminalFirewall.execute('df', ['-h'], {
  cwd: '/app',
  user: 'john-doe',
  timeout: 10000
});

console.log(result.stdout);
// Filesystem      Size  Used Avail Use% Mounted on
// ...
```

### Via API

```bash
# Execute whitelisted command
curl -X POST http://localhost:4000/api/v1/terminal/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "git",
    "args": ["status"],
    "cwd": "/app/repo"
  }'

# Response
{
  "success": true,
  "stdout": "On branch main\nYour branch is up to date...",
  "stderr": "",
  "exitCode": 0
}
```

### Get Audit Logs

```bash
# Get recent command executions
curl http://localhost:4000/api/v1/terminal/audit?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by command
curl http://localhost:4000/api/v1/terminal/audit?command=git&limit=50 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter blocked commands
curl http://localhost:4000/api/v1/terminal/audit?blocked=true&limit=100 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Statistics

```bash
curl http://localhost:4000/api/v1/terminal/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response
{
  "success": true,
  "stats": {
    "totalExecutions": 156,
    "blockedCommands": 3,
    "approvedCommands": 153,
    "failedCommands": 2,
    "averageExecutionTime": 234.5,
    "commandBreakdown": {
      "git": 89,
      "npm": 42,
      "docker": 15,
      "df": 10
    },
    "blockReasons": {
      "Command not whitelisted": 2,
      "Dangerous command pattern detected": 1
    }
  }
}
```

---

## Security Features

### 1. Dangerous Pattern Detection

Automatically blocks dangerous operations:

```typescript
// ❌ BLOCKED
rm -rf /
rm -rf /*
dd if=/dev/zero of=/dev/sda
mkfs /dev/sda
format c:
shutdown -h now
chmod 777 /etc
```

### 2. Shell Injection Prevention

Detects and blocks injection attempts:

```typescript
// ❌ BLOCKED
command; rm -rf /
command | malicious
command && dangerous
$(malicious command)
`malicious command`
```

### 3. Path Traversal Protection

Prevents directory traversal:

```typescript
// ❌ BLOCKED
../../../etc/passwd
../../.ssh/id_rsa
/etc/shadow
/root/.ssh/authorized_keys
```

### 4. Critical File Protection

Blocks modifications to system files:

```typescript
// ❌ BLOCKED
/etc/passwd
/etc/shadow
/etc/sudoers
/boot/grub/grub.cfg
```

### 5. Environment Variable Validation

Prevents dangerous environment manipulations:

```typescript
// ❌ BLOCKED
LD_PRELOAD=/malicious/lib.so
LD_LIBRARY_PATH=/malicious/path
```

---

## Approval Workflow

High-risk commands require manual approval:

### 1. Command Triggers Approval Request

```bash
curl -X POST http://localhost:4000/api/v1/terminal/execute \
  -d '{"command":"kubectl","args":["apply","-f","deployment.yaml"]}'

# Response
{
  "success": false,
  "error": "Command requires approval. Request ID: approval_abc123"
}
```

### 2. Check Pending Approvals

```bash
curl http://localhost:4000/api/v1/terminal/approvals

# Response
{
  "success": true,
  "approvals": [
    {
      "id": "approval_abc123",
      "command": "kubectl",
      "args": ["apply", "-f", "deployment.yaml"],
      "user": "john-doe",
      "status": "pending",
      "requestedAt": "2025-10-08T20:00:00Z",
      "expiresAt": "2025-10-08T20:05:00Z"
    }
  ]
}
```

### 3. Approve Command

```bash
curl -X POST http://localhost:4000/api/v1/terminal/approvals/approval_abc123/approve \
  -H "X-User-ID: admin"

# Response
{
  "success": true,
  "message": "Command approved"
}
```

### 4. Execute Approved Command

```bash
# Now the command will execute
curl -X POST http://localhost:4000/api/v1/terminal/execute \
  -d '{"command":"kubectl","args":["apply","-f","deployment.yaml"],"requireApproval":true}'
```

---

## Audit Logging

### Log Format

All command executions are logged in JSON format:

```json
{
  "id": "cmd_abc123",
  "command": "git",
  "args": ["status"],
  "user": "john-doe",
  "approved": true,
  "requiresApproval": false,
  "blocked": false,
  "startTime": "2025-10-08T20:00:00Z",
  "endTime": "2025-10-08T20:00:01Z",
  "duration": 234,
  "exitCode": 0,
  "stdout": "On branch main...",
  "stderr": "",
  "cwd": "/app/repo"
}
```

### Log Locations

- **Command Logs**: `./logs/audit/terminal-commands.log`
- **Auth Events**: `./logs/audit/auth-events.log`
- **Approval Decisions**: `./logs/audit/approval-decisions.log`

### Log Retention

- Default retention: **90 days**
- Automatic cleanup daily
- Configurable via `TERMINAL_AUDIT_RETENTION_DAYS`

---

## Configuration

### Environment Variables

```bash
# Terminal Firewall
TERMINAL_FIREWALL_ENABLED=true
TERMINAL_FIREWALL_LOG_LEVEL=info
TERMINAL_FIREWALL_MAX_EXECUTION_TIME=300000  # 5 minutes

# Auto-approval settings
TERMINAL_AUTO_APPROVE_GIT=true
TERMINAL_AUTO_APPROVE_NPM=true
TERMINAL_AUTO_APPROVE_DOCKER=true
TERMINAL_AUTO_APPROVE_KUBECTL=false  # Requires approval
TERMINAL_AUTO_APPROVE_TERRAFORM=false
TERMINAL_AUTO_APPROVE_AWS=false

# Audit logging
TERMINAL_AUDIT_LOG_PATH=./logs/audit
TERMINAL_AUDIT_RETENTION_DAYS=90

# Security
TERMINAL_FIREWALL_CLEARANCE_LEVEL=2  # 0-4
```

---

## Adding New Commands

### Programmatically

```typescript
import { terminalFirewall } from './core/security/terminal-firewall.js';

terminalFirewall.addRule({
  command: 'python3',
  allowedArgs: [/\.py$/, /^-[cm]$/],
  blockedArgs: [/--unsafe/],
  requiresApproval: false,
  maxTimeout: 120000, // 2 minutes
  description: 'Python script execution',
  clearanceLevel: 1
});
```

### Via Configuration

Add to `terminal-firewall.ts` initialization:

```typescript
this.addRule({
  command: 'newcommand',
  // ... rules ...
});
```

---

## Testing

### Run Tests

```bash
npm run test -- tests/v2/terminal-firewall.test.ts
```

### Manual Testing

```bash
# Test safe command
curl -X POST http://localhost:4000/api/v1/terminal/execute \
  -H "Authorization: Bearer test-token" \
  -d '{"command":"ps","args":["aux"]}'

# Test dangerous command (should be blocked)
curl -X POST http://localhost:4000/api/v1/terminal/execute \
  -H "Authorization: Bearer test-token" \
  -d '{"command":"rm","args":["-rf","/"]}'

# Test injection attempt (should be blocked)
curl -X POST http://localhost:4000/api/v1/terminal/execute \
  -H "Authorization: Bearer test-token" \
  -d '{"command":"ls","args":["; rm -rf /"]}'
```

---

## Monitoring

### Real-Time Statistics

```bash
# Get firewall stats
curl http://localhost:4000/api/v1/terminal/stats

# Watch for blocked attempts
tail -f ./logs/audit/terminal-commands.log | grep '"blocked":true'

# Monitor execution times
tail -f ./logs/audit/terminal-commands.log | jq '.duration'
```

### Alerts

Monitor these metrics for security incidents:

- **Blocked commands spike** - Potential attack
- **Failed executions** - System issues
- **Long execution times** - Performance problems
- **Multiple approval requests** - Unusual activity

---

## Best Practices

### Security

1. **Use least privilege** - Set appropriate clearance levels
2. **Require approval for production** - Always approve kubectl/terraform/aws
3. **Review audit logs regularly** - Check for suspicious activity
4. **Rotate audit logs** - Keep disk usage under control
5. **Monitor blocked attempts** - Investigate patterns

### Performance

1. **Set appropriate timeouts** - Don't block legitimate long operations
2. **Clean up old logs** - Run periodic maintenance
3. **Use async execution** - Don't block the API server
4. **Cache whitelist rules** - Avoid repeated lookups

### Operations

1. **Document custom commands** - Maintain whitelist documentation
2. **Test in staging first** - Validate new commands
3. **Set up monitoring** - Alert on security events
4. **Regular security reviews** - Audit whitelist and logs

---

## Troubleshooting

### Command Blocked Unexpectedly

```bash
# Check if command is whitelisted
curl http://localhost:4000/api/v1/terminal/whitelist | jq '.whitelist[] | select(.command=="yourcommand")'

# Check audit logs for block reason
curl http://localhost:4000/api/v1/terminal/audit?blocked=true&limit=10
```

### Approval Not Working

```bash
# Check pending approvals
curl http://localhost:4000/api/v1/terminal/approvals

# Verify approval expiration (5 minutes default)
# Requests expire if not approved within timeout
```

### Audit Logs Not Writing

```bash
# Check log directory permissions
ls -la ./logs/audit

# Create directory if missing
mkdir -p ./logs/audit

# Check disk space
df -h
```

---

## API Reference

### Execute Command
- **Endpoint**: `POST /api/v1/terminal/execute`
- **Auth**: Required
- **Body**: `{ command, args, cwd?, timeout? }`
- **Response**: `{ success, stdout, stderr, exitCode }`

### Get Audit Logs
- **Endpoint**: `GET /api/v1/terminal/audit`
- **Auth**: Required
- **Query**: `command?, user?, approved?, blocked?, limit?`
- **Response**: `{ success, logs[], count }`

### Get Statistics
- **Endpoint**: `GET /api/v1/terminal/stats`
- **Auth**: Required
- **Response**: `{ success, stats }`

### Get Whitelist
- **Endpoint**: `GET /api/v1/terminal/whitelist`
- **Auth**: Required
- **Response**: `{ success, whitelist[], count }`

### Get Pending Approvals
- **Endpoint**: `GET /api/v1/terminal/approvals`
- **Auth**: Required
- **Response**: `{ success, approvals[], count }`

### Approve Command
- **Endpoint**: `POST /api/v1/terminal/approvals/:id/approve`
- **Auth**: Required
- **Headers**: `X-User-ID: approver-id`
- **Response**: `{ success, message }`

---

## Implementation Status

✅ **Completed Features**
- [x] Command whitelist with 13 default commands
- [x] Dangerous pattern detection
- [x] Shell injection prevention
- [x] Path traversal protection
- [x] Approval workflow for high-risk commands
- [x] Comprehensive audit logging
- [x] Real-time statistics
- [x] API integration with gateway
- [x] Environment configuration
- [x] Comprehensive test suite
- [x] Full documentation

---

**Built by Claude Code (Sonnet 4.5)**
**CLAUDE A: Terminal Firewall & Security Infrastructure**
**Ready for Production** 🚀🔒
