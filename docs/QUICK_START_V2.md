# Jarvis v2 Quick Start Guide

**5-Minute Implementation Overview**

---

## 🎯 What You Have vs What You're Building

### ✅ **Already Built (Production Ready)**
```
Jarvis Control Plane (Port 4000)
├── Autonomous Orchestrator (Claude C)
├── 3 Domain Agents
│   ├── Code Optimization
│   ├── Cost Optimization
│   └── System Health
├── Smart AI Router (Gemini/GPT/Claude)
├── Clearance-based Safety (5 levels)
└── API Integration (/api/v1/autonomous/)
```

### 🚀 **Adding in v2**
```
v2 Expansion
├── Terminal Firewall (secure commands)
├── 6 New Agents
│   ├── Creative Director (Suno/Udio)
│   ├── DevOps Engineer (kubectl/terraform)
│   ├── QA Engineer (testing)
│   ├── Data Scientist (ML/analytics)
│   ├── Marketing Strategist (campaigns)
│   └── Mixing Engineer (audio)
├── Memory Layer (Vector + Graph)
└── 4 New AI Models (Mistral, Suno, Udio)
```

---

## 👥 Agent Assignments (Copy-Paste to Each Claude)

### **CLAUDE A: Security** (Start First)
```bash
# Read this
cat /Users/benkennon/Jarvis/docs/CLAUDE_AGENT_PROMPTS.md | grep -A 200 "CLAUDE A:"

# Build this
- src/core/security/terminal-firewall.ts
- src/core/security/command-validator.ts
- src/core/security/audit-logger.ts

# Time: 8-12 hours
```

### **CLAUDE B: Agents** (After A, C, E)
```bash
# Read this
cat /Users/benkennon/Jarvis/docs/CLAUDE_AGENT_PROMPTS.md | grep -A 300 "CLAUDE B:"

# Build this
- src/autonomous/domains/creative-director-domain.ts
- src/autonomous/domains/devops-engineer-domain.ts
- src/autonomous/domains/qa-engineer-domain.ts

# Time: 10-14 hours
```

### **CLAUDE C: Memory** (Start First)
```bash
# Read this
cat /Users/benkennon/Jarvis/docs/CLAUDE_AGENT_PROMPTS.md | grep -A 400 "CLAUDE C:"

# Build this
- src/core/memory/vector-store.ts
- src/core/memory/graph-store.ts
- src/core/memory/embedding-service.ts
- src/core/memory/memory-manager.ts

# Time: 12-16 hours
```

### **CLAUDE D: Analytics** (After C)
```bash
# Read this
cat /Users/benkennon/Jarvis/docs/CLAUDE_AGENT_PROMPTS.md | grep -A 200 "CLAUDE D:"

# Build this
- src/autonomous/domains/data-scientist-domain.ts
- src/autonomous/domains/marketing-strategist-domain.ts

# Time: 8-10 hours
```

### **CLAUDE E: AI Models** (Start First)
```bash
# Read this
cat /Users/benkennon/Jarvis/docs/CLAUDE_AGENT_PROMPTS.md | grep -A 300 "CLAUDE E:"

# Build this
- src/integrations/ai-providers/mistral-client.ts
- src/integrations/ai-providers/suno-client.ts
- src/integrations/ai-providers/udio-client.ts
- src/core/smart-ai-router-v2.ts

# Time: 10-12 hours
```

---

## 🔧 One-Time Setup (Before Starting)

### Install Dependencies
```bash
# Redis Stack (for vector store)
brew install redis-stack

# Node packages
cd /Users/benkennon/Jarvis
npm install redis @mistralai/mistralai
```

### Configure Environment
```bash
# Edit .env
cat >> .env << 'EOF'
# v2 Features
ENABLE_AUTONOMOUS=true
ENABLE_MEMORY_LAYER=true
TERMINAL_FIREWALL_ENABLED=true
AUTONOMOUS_CLEARANCE=2

# New AI APIs
MISTRAL_API_KEY=your-key-here
SUNO_API_KEY=your-key-here
UDIO_API_KEY=your-key-here

# Memory
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your-openai-key
EOF
```

### Start Services
```bash
# Terminal 1: Redis
redis-stack-server

# Terminal 2: Jarvis
cd /Users/benkennon/Jarvis && npm run dev

# Terminal 3: AI DAWG
cd /Users/benkennon/ai-dawg-v0.1 && npm run dev:server
```

---

## ✅ Testing Each Component

### Terminal Firewall (CLAUDE A)
```bash
# Should BLOCK dangerous command
curl -X POST http://localhost:4000/api/v1/terminal/execute \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"command":"rm","args":["-rf","/"]}'
# Expected: {"success":false}

# Should ALLOW safe command
curl -X POST http://localhost:4000/api/v1/terminal/execute \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"command":"git","args":["status"]}'
# Expected: {"success":true}
```

### Memory Layer (CLAUDE C)
```bash
# Store memory
curl -X POST http://localhost:4000/api/v1/memory/remember \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test memory","metadata":{"type":"knowledge"}}'

# Recall memory
curl -X POST http://localhost:4000/api/v1/memory/recall \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"query":"Test memory","limit":5}'
# Expected: Results with "Test memory"
```

### Agents (CLAUDE B, D)
```bash
# Check agent count
curl http://localhost:4000/api/v1/autonomous/status | jq '.agents'
# Expected: 6 (after CLAUDE B) or 8 (after CLAUDE D)

# List agent domains
curl http://localhost:4000/api/v1/autonomous/status | jq '.agentDomains'
# Expected: ["code-optimization", "cost-optimization", "system-health", "creative-director", ...]
```

### AI Models (CLAUDE E)
```bash
# Test Mistral
curl -X POST http://localhost:4000/api/v1/ai/chat \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"model":"mistral-large","messages":[{"role":"user","content":"Hi"}]}'

# Test Suno
curl -X POST http://localhost:4000/api/v1/creative/generate-suno \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"upbeat track","duration":30}'
```

---

## 📊 Progress Tracking

### Week 1: Foundation (Parallel)
```
[ ] CLAUDE A: Terminal Firewall
[ ] CLAUDE C: Memory Layer
[ ] CLAUDE E: AI Models

Status: 0/3 complete
```

### Week 2: Agents (Sequential)
```
[ ] CLAUDE B: Creative, DevOps, QA Agents
[ ] CLAUDE D: Data Science, Marketing Agents

Status: 0/2 complete
```

### Week 3: Integration
```
[ ] All agents talking to each other
[ ] End-to-end workflows working
[ ] Security validated
[ ] Performance benchmarks met
[ ] Documentation complete

Status: 0/5 complete
```

---

## 🆘 Quick Troubleshooting

### "Agents not running"
```bash
# Check if enabled
echo $ENABLE_AUTONOMOUS
# Should be: true

# Check orchestrator
curl http://localhost:4000/api/v1/autonomous/status

# Check logs
tail -f logs/hybrid/jarvis.log | grep Autonomous
```

### "Memory not working"
```bash
# Check Redis
redis-cli ping
# Should return: PONG

# Check stats
curl http://localhost:4000/api/v1/memory/stats

# Restart Redis
pkill redis-stack-server && redis-stack-server
```

### "Terminal firewall blocking everything"
```bash
# Check audit logs
curl http://localhost:4000/api/v1/terminal/audit | jq '.logs[-5:]'

# Adjust auto-approval in .env
TERMINAL_AUTO_APPROVE_GIT=true
TERMINAL_AUTO_APPROVE_NPM=true
```

### "Build failing"
```bash
# Clean rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

## 📈 Success Criteria

### You're done when:
- ✅ All 8 agents running (6 new + 3 original + 2 analytical)
- ✅ Terminal firewall blocks `rm -rf /` but allows `git status`
- ✅ Memory layer stores and retrieves semantic data
- ✅ Mistral/Suno/Udio clients working
- ✅ Autonomous tasks completing with >90% success rate
- ✅ Zero security incidents in testing
- ✅ All tests passing
- ✅ Documentation complete

### Key Metrics:
```bash
# Should return healthy system
curl http://localhost:4000/api/v1/autonomous/status | jq '{
  running,
  agents,
  completedTasks,
  activeTasks
}'

# Expected output:
{
  "running": true,
  "agents": 8,
  "completedTasks": 10,
  "activeTasks": 1
}
```

---

## 📚 Full Documentation

- **Blueprint:** `/Users/benkennon/Jarvis/docs/JARVIS_AI_V2_EXPANSION_BLUEPRINT.md`
- **Agent Prompts:** `/Users/benkennon/Jarvis/docs/CLAUDE_AGENT_PROMPTS.md`
- **Execution Plan:** `/Users/benkennon/Jarvis/docs/V2_EXECUTION_PLAN.md`
- **This File:** `/Users/benkennon/Jarvis/docs/QUICK_START_V2.md`

---

## 🚀 Ready to Start?

### Step 1: Read the blueprint
```bash
cat /Users/benkennon/Jarvis/docs/JARVIS_AI_V2_EXPANSION_BLUEPRINT.md
```

### Step 2: Assign agents
- Give each Claude engineer their section from `CLAUDE_AGENT_PROMPTS.md`

### Step 3: Start parallel work
- CLAUDE A, C, E start simultaneously (Week 1)
- CLAUDE B, D start after dependencies ready (Week 2)

### Step 4: Integrate & test
- Week 3: Full system integration

### Step 5: Ship it! 🎉

---

**Total Time:** 48-64 hours (6-8 work days)
**Team Size:** 5 Claude agents working in parallel
**Risk Level:** Low (building on solid foundation)

**Let's build the future of autonomous AI! 🤖**
