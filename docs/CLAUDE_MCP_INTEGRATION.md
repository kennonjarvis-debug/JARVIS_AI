# Claude MCP Integration with Smart AI Router

**How to Use Smart AI Router with Existing Claude MCP Server**

---

## Overview

The Jarvis system has two separate Claude integrations:

1. **Claude MCP Server** (`src/integrations/claude/mcp-server.ts`)
   - Exposes Jarvis tools to Claude Desktop
   - Uses standard Claude API for tool responses
   - Intended for Claude Desktop integration

2. **Smart AI Router** (`src/core/smart-ai-router.ts`)
   - Routes AI requests across multiple providers (Gemini, GPT-4o Mini, Claude)
   - Optimizes costs with 70/20/10 distribution
   - Intended for general AI orchestration

---

## No Conflicts - Different Use Cases

**Good news:** These two systems **do not conflict** because they serve different purposes:

### Claude MCP Server
- **Purpose**: Expose Jarvis functionality TO Claude Desktop
- **Direction**: Claude Desktop → Jarvis MCP Server → Module Router → AI DAWG
- **AI Usage**: Claude Desktop uses its own Claude API key
- **Cost**: Charged to Claude Desktop user (not Jarvis)

### Smart AI Router
- **Purpose**: Route Jarvis-initiated AI requests
- **Direction**: Jarvis → Smart AI Router → (Gemini/GPT/Claude)
- **AI Usage**: Jarvis uses configured API keys
- **Cost**: Tracked and optimized by Jarvis cost monitoring

---

## When to Use Each

### Use Claude MCP Server When:
- ✅ Controlling Jarvis from Claude Desktop
- ✅ Claude user asks to generate music, run campaigns, etc.
- ✅ Natural language interface to Jarvis tools

### Use Smart AI Router When:
- ✅ Jarvis needs to generate AI content internally
- ✅ Proactive suggestions from Jarvis
- ✅ Automated AI tasks (testing, analysis, etc.)
- ✅ Cost optimization is important

---

## Integration Example

Here's how they work together:

```typescript
// Example: Claude Desktop user asks Jarvis to generate music
// This uses MCP Server (no conflict with Smart AI Router)

User in Claude Desktop:
  "Generate a chill lofi beat"
    ↓
Claude Desktop (using Claude API)
  "I'll help you generate music using Jarvis"
    ↓
Claude MCP Server
  handleGenerateMusic({ prompt: "chill lofi beat" })
    ↓
Module Router
  execute({ module: "music", action: "generate-music" })
    ↓
AI DAWG Music Module
  Uses Suno AI API (not Smart Router)
```

```typescript
// Example: Jarvis needs to generate marketing copy internally
// This uses Smart AI Router (no conflict with MCP)

Jarvis Automation:
  "Generate email campaign copy"
    ↓
Smart AI Router
  route({ prompt: "Write email...", complexity: "simple" })
    ↓
70% chance → Gemini Flash (free tier)
20% chance → GPT-4o Mini
10% chance → Claude Sonnet 4.5
    ↓
Cost tracked and optimized
```

---

## Configuration

### Enable Both Systems

In `.env`:

```bash
# Claude MCP Server
ENABLE_MCP=true

# Smart AI Router
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

AI_ROUTER_GEMINI_PERCENTAGE=70
AI_ROUTER_GPT_MINI_PERCENTAGE=20
AI_ROUTER_CLAUDE_PERCENTAGE=10
```

### Start Services

```bash
# Start Jarvis (includes both MCP Server and Smart AI Router)
./launch-hybrid-services.sh start
```

The Claude MCP Server will be available at:
- **stdio transport** for Claude Desktop

The Smart AI Router will be available at:
- **Internal API** for Jarvis modules

---

## Using Smart AI Router in Jarvis Modules

If you want Jarvis modules to use the Smart AI Router:

```typescript
import { smartAIRouter } from '../../core/smart-ai-router.js';

// Example: Marketing module needs AI-generated copy
async function generateCampaignCopy(topic: string) {
  const response = await smartAIRouter.route({
    prompt: `Write a compelling email campaign about ${topic}`,
    complexity: 'moderate',
    maxTokens: 500,
  });

  return response.response;
}
```

This request will:
1. Be routed through the Smart AI Router
2. Use the 70/20/10 distribution
3. Be cost-tracked
4. Not interfere with Claude MCP Server

---

## Cost Implications

### Scenario 1: Claude Desktop User Only
**Cost to you:** $0
- Claude Desktop users use their own API keys
- MCP Server just routes commands
- No AI API costs for Jarvis operator

### Scenario 2: Jarvis Uses Smart Router
**Cost to you:** ~$35-50/month (optimized)
- Smart Router distributes across providers
- 70% free tier (Gemini)
- Cost tracked and budgeted

### Scenario 3: Both Active
**Cost to you:** ~$35-50/month
- Claude MCP: $0 (users pay)
- Smart Router: $35-50 (your API usage)
- No overlap or conflicts

---

## Best Practices

### 1. Keep MCP Server for Claude Desktop Integration
```typescript
// src/integrations/claude/mcp-server.ts
// Leave as-is - no changes needed
```

### 2. Use Smart Router for Internal AI Tasks
```typescript
// src/core/proactive/suggestions.ts
import { smartAIRouter } from '../smart-ai-router.js';

async function generateSuggestions() {
  const response = await smartAIRouter.route({
    prompt: "Generate proactive suggestions...",
    complexity: 'simple', // Use Gemini free tier
  });
  // ...
}
```

### 3. Mark Complex Tasks for Claude
```typescript
// Force use of Claude for complex analysis
const response = await smartAIRouter.route({
  prompt: "Perform deep analysis of quarterly revenue trends...",
  complexity: 'complex', // Routes to Claude regardless of percentage
});
```

### 4. Monitor Costs
```typescript
// Check current usage
const stats = smartAIRouter.getUsageStats();
console.log(`Gemini free tier remaining: ${stats.geminiFreeTierRemaining}`);

// Get monthly projection
const projection = await smartAIRouter.getMonthlyProjection();
console.log(`Projected cost: $${projection.estimatedMonthlyCost}`);
```

---

## Troubleshooting

### Issue: Claude Desktop can't connect to MCP Server

**Solution:** Check MCP Server is running
```bash
# Check Jarvis logs
tail -f ~/Jarvis/logs/hybrid/jarvis.log | grep MCP
```

**Expected output:**
```
✅ Jarvis MCP Server started successfully
Connected via stdio transport
Tools available: 29
```

### Issue: Smart Router costs are high

**Solution:** Adjust routing strategy
```bash
# Increase Gemini percentage (more free tier)
curl -X POST http://localhost:4000/api/v1/costs/update-strategy \
  -H "Content-Type: application/json" \
  -d '{"geminiPercentage": 85, "gptMiniPercentage": 10, "claudePercentage": 5}'
```

### Issue: Gemini free tier exhausted

**Expected behavior:** Router automatically falls back to GPT-4o Mini
```
INFO: Gemini free tier exhausted, using GPT-4o Mini
```

This is normal and cost-optimized.

---

## Summary

✅ **Claude MCP Server** and **Smart AI Router** are complementary, not conflicting

✅ **Claude MCP Server**: Exposes Jarvis to Claude Desktop (users pay for Claude API)

✅ **Smart AI Router**: Routes Jarvis-initiated AI requests (you pay, but optimized 70/20/10)

✅ **Both can run simultaneously** without conflicts

✅ **Cost monitoring** tracks only Smart Router usage (not MCP Server usage)

---

## Next Steps

1. ✅ Keep Claude MCP Server for Claude Desktop integration
2. ✅ Use Smart AI Router for internal Jarvis AI tasks
3. ✅ Monitor costs with dashboard at `http://localhost:4000/cost-dashboard.html`
4. ✅ Adjust routing strategy based on actual usage

**No changes needed to existing Claude MCP Server!** 🎉
