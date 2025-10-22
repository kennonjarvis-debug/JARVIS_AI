# Claude Desktop MCP Integration - Setup Guide

**Wave 4: Claude MCP Integration**
**Date:** 2025-10-08
**Status:** ✅ Ready for Installation

---

## Overview

This guide explains how to integrate Jarvis + AI Dawg with Claude Desktop using the Model Context Protocol (MCP). Once configured, you'll be able to control your entire AI Dawg system through natural language conversations with Claude.

### What You'll Get

- **22 AI Tools** accessible from Claude Desktop:
  - 🎵 Music generation and analysis (5 tools)
  - 📊 Marketing metrics and campaigns (5 tools)
  - 💬 User engagement and sentiment (4 tools)
  - 🤖 Workflow automation and scaling (4 tools)
  - 🏥 System health and monitoring (3 tools)

- **4 Data Resources** accessible via `jarvis://` protocol:
  - `jarvis://status` - Real-time system status
  - `jarvis://modules` - Module information
  - `jarvis://health` - Health metrics
  - `jarvis://metrics` - Business analytics

---

## Prerequisites

### 1. System Requirements

- **macOS** with Claude Desktop installed
- **Node.js** v18+ with `npx` available
- **Jarvis Control Plane** running at `/Users/benkennon/Jarvis`
- **AI Dawg Backend** running at `http://localhost:3001`

### 2. Verify AI Dawg Backend

Ensure AI Dawg is running and healthy:

```bash
curl http://localhost:3001/api/v1/jarvis/execute \
  -H "Content-Type: application/json" \
  -d '{"module":"test","action":"ping","params":{}}'
```

Expected response:
```json
{"success":true,"data":{"message":"pong"}}
```

### 3. Verify Jarvis Dependencies

```bash
cd /Users/benkennon/Jarvis
npm install
```

Ensure `@modelcontextprotocol/sdk` and `tsx` are installed.

---

## Installation Methods

### Method 1: Automatic Installation (Recommended)

Run the provided installation script:

```bash
cd /Users/benkennon/Jarvis
chmod +x scripts/install-claude-mcp.sh
./scripts/install-claude-mcp.sh
```

This script will:
1. ✅ Verify prerequisites
2. ✅ Locate Claude Desktop config directory
3. ✅ Backup existing config
4. ✅ Install MCP server configuration
5. ✅ Test the connection
6. ✅ Provide next steps

### Method 2: Manual Installation

If you prefer to install manually:

#### Step 1: Locate Claude Desktop Config

Claude Desktop config location varies by system. Common paths:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Alternative**: `~/Library/Preferences/claude_desktop_config.json`

#### Step 2: Backup Existing Config

```bash
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json \
   ~/Library/Application\ Support/Claude/claude_desktop_config.json.backup
```

#### Step 3: Add Jarvis MCP Server

Edit `claude_desktop_config.json` and add the `jarvis-aidawg` server:

```json
{
  "mcpServers": {
    "jarvis-aidawg": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/benkennon/Jarvis/src/integrations/claude/mcp-server.ts"
      ],
      "env": {
        "NODE_ENV": "production",
        "AI_DAWG_BACKEND_URL": "http://localhost:3001"
      }
    }
  }
}
```

**Important Notes:**
- Use absolute path: `/Users/benkennon/Jarvis/src/integrations/claude/mcp-server.ts`
- Ensure AI Dawg backend URL is correct (`http://localhost:3001`)
- If you have other MCP servers, add `jarvis-aidawg` to the existing `mcpServers` object

#### Step 4: Restart Claude Desktop

1. Quit Claude Desktop completely (Cmd+Q)
2. Wait 5 seconds
3. Relaunch Claude Desktop

#### Step 5: Verify Installation

In a new Claude conversation, type:

```
Can you list the available Jarvis tools?
```

Claude should respond with a list of 22 tools. Try a test command:

```
Can you check the Jarvis system health?
```

Expected: Claude calls `get_system_health` and shows status report.

---

## Testing Your Installation

### Quick Tests

Once installed, try these prompts in Claude Desktop:

#### 1. System Status
```
What's the current status of Jarvis?
```
Expected: Claude reads `jarvis://status` resource and displays system info.

#### 2. Generate Music
```
Generate a chill lofi beat for studying, 60 seconds long
```
Expected: Claude calls `generate_music` with appropriate parameters.

#### 3. Marketing Metrics
```
Show me the current marketing metrics
```
Expected: Claude calls `get_marketing_metrics` and formats the data.

#### 4. List Modules
```
What modules are available in the system?
```
Expected: Claude reads `jarvis://modules` or calls `list_modules`.

### Advanced Tests

#### Workflow Execution
```
Run the "daily-analytics" workflow
```

#### Churn Analysis
```
Identify users at risk of churning
```

#### System Health
```
Give me a complete health report for all modules
```

---

## Troubleshooting

### Issue: Claude doesn't see Jarvis tools

**Symptoms**: Claude responds "I don't have access to those tools"

**Solutions**:
1. Verify Claude Desktop config file location:
   ```bash
   ls -la ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. Check config file syntax (must be valid JSON):
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
   ```

3. Restart Claude Desktop completely (Cmd+Q, then relaunch)

4. Check Claude Desktop logs for errors:
   ```bash
   tail -f ~/Library/Logs/Claude/mcp-*.log
   ```

### Issue: Tools appear but fail when called

**Symptoms**: Claude sees tools but execution fails

**Solutions**:
1. Verify AI Dawg backend is running:
   ```bash
   curl http://localhost:3001/api/v1/jarvis/execute \
     -H "Content-Type: application/json" \
     -d '{"module":"test","action":"ping","params":{}}'
   ```

2. Check Jarvis dependencies:
   ```bash
   cd /Users/benkennon/Jarvis
   npm list @modelcontextprotocol/sdk tsx
   ```

3. Test MCP server directly:
   ```bash
   cd /Users/benkennon/Jarvis
   npx tsx src/integrations/claude/mcp-server.ts
   ```
   (Type Ctrl+C to exit after verifying it starts)

4. Check environment variables in config match your setup

### Issue: "Cannot find module" errors

**Symptoms**: MCP server fails to start with import errors

**Solutions**:
1. Reinstall dependencies:
   ```bash
   cd /Users/benkennon/Jarvis
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Verify Node.js version:
   ```bash
   node --version  # Should be v18 or higher
   ```

3. Ensure tsx is installed:
   ```bash
   npm install -g tsx
   ```

### Issue: Slow response times

**Symptoms**: Tools work but take 10+ seconds to respond

**Solutions**:
1. Check AI Dawg backend health:
   ```bash
   curl http://localhost:3001/api/v1/modules/health/all
   ```

2. Verify network latency:
   ```bash
   time curl http://localhost:3001/api/v1/jarvis/execute \
     -H "Content-Type: application/json" \
     -d '{"module":"test","action":"ping","params":{}}'
   ```

3. Check if backend is under load or needs restart

---

## Uninstallation

To remove Jarvis MCP integration:

1. **Edit Claude Desktop config**:
   ```bash
   nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Remove the `jarvis-aidawg` entry** from `mcpServers` object

3. **Restart Claude Desktop**

4. **Restore from backup** (if needed):
   ```bash
   cp ~/Library/Application\ Support/Claude/claude_desktop_config.json.backup \
      ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

---

## Architecture

### How It Works

```
┌─────────────────┐
│ Claude Desktop  │
│                 │
│ User: "Generate │
│  a lofi beat"   │
└────────┬────────┘
         │ MCP Protocol
         │ (stdio)
         ▼
┌─────────────────┐
│ Jarvis MCP      │
│ Server          │
│                 │
│ - 22 Tools      │
│ - 4 Resources   │
└────────┬────────┘
         │ HTTP POST
         │ /api/v1/jarvis/execute
         ▼
┌─────────────────┐
│ AI Dawg Backend │
│ (Instance 2)    │
│                 │
│ Module SDK:     │
│ - Music         │
│ - Marketing     │
│ - Engagement    │
│ - Automation    │
│ - Testing       │
└─────────────────┘
```

### Component Responsibilities

- **Claude Desktop**: User interface, natural language understanding
- **Jarvis MCP Server**: Tool definitions, request routing, response formatting
- **ModuleRouter**: Retry logic, error handling, request forwarding
- **AI Dawg Backend**: Execution engine, module orchestration, business logic

### MCP Resources

Resources provide read-only data access through URI protocol:

| Resource | URI | Purpose |
|----------|-----|---------|
| System Status | `jarvis://status` | Real-time system health |
| Module List | `jarvis://modules` | All registered modules |
| Health Report | `jarvis://health` | Aggregated health metrics |
| Business Metrics | `jarvis://metrics` | Revenue, users, growth |

---

## Available Tools

### 🎵 Music Tools (5)

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `generate_music` | Create music from text | "Generate a chill lofi beat" |
| `analyze_vocal` | Analyze vocal quality | "Analyze the vocals in track X" |
| `validate_music_quality` | Check audio quality | "Validate the quality of track Y" |
| `get_music_usage_stats` | Usage statistics | "Show music generation stats" |
| `get_music_model_health` | Model health check | "Check music model status" |

### 📊 Marketing Tools (5)

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `get_marketing_metrics` | Current metrics | "Show marketing metrics" |
| `get_revenue_breakdown` | Revenue analysis | "Break down revenue by source" |
| `run_marketing_campaign` | Launch campaign | "Start email campaign X" |
| `analyze_user_growth` | Growth analysis | "Analyze user growth trends" |
| `forecast_revenue` | Revenue forecast | "Forecast revenue for Q4" |

### 💬 Engagement Tools (4)

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `analyze_user_sentiment` | Sentiment analysis | "Analyze user sentiment" |
| `check_churn_risk` | Churn prediction | "Who's at risk of churning?" |
| `get_churned_users` | Churned user list | "Show recently churned users" |
| `send_engagement_message` | Send message | "Send re-engagement email to user X" |

### 🤖 Automation Tools (4)

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `aggregate_system_metrics` | System metrics | "Aggregate all system metrics" |
| `execute_workflow` | Run workflow | "Execute daily-analytics workflow" |
| `scale_resources` | Auto-scaling | "Scale up music generation resources" |
| `get_automation_stats` | Automation stats | "Show automation statistics" |

### 🏥 System Tools (3)

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `get_system_health` | System health | "Check system health" |
| `get_module_status` | Module info | "Get marketing module status" |
| `list_modules` | List all modules | "What modules are available?" |

---

## Security Considerations

### Network Security

- MCP server communicates with AI Dawg backend via localhost only
- No external network access required
- All data stays on your machine

### Authentication

- Current implementation assumes localhost trust
- For production: Add API key authentication to AI Dawg backend
- Configure in `env` section of Claude Desktop config:
  ```json
  "env": {
    "NODE_ENV": "production",
    "AI_DAWG_BACKEND_URL": "http://localhost:3001",
    "AI_DAWG_API_KEY": "your-api-key-here"
  }
  ```

### Data Privacy

- All conversations with Claude stay local (unless using Claude web)
- Tool execution logs stored in Jarvis logs directory
- No data sent to external services except Claude AI itself

---

## Performance Tuning

### Response Time Optimization

Current performance targets:
- Tool listing: < 50ms
- Simple commands (ping, status): < 100ms
- Music generation: < 500ms (async, returns job ID)
- Marketing metrics: < 200ms

To improve performance:

1. **Enable Caching** (add to MCP server):
   ```typescript
   // TODO: Add Redis caching for frequently accessed resources
   ```

2. **Increase Timeout** (if needed):
   ```json
   "env": {
     "AI_DAWG_REQUEST_TIMEOUT": "60000"
   }
   ```

3. **Optimize Backend**: See Wave 2 documentation for AI Dawg optimization

---

## Development

### Testing Changes

After modifying the MCP server:

1. **Restart Claude Desktop** to reload the server
2. **Check logs** for errors
3. **Test with simple prompt** first
4. **Use Developer Console** (if available in Claude Desktop)

### Adding New Tools

To add a new tool to the MCP server:

1. **Define tool** in `getAllTools()` method
2. **Implement handler** method
3. **Add case** to CallToolRequestSchema handler
4. **Update documentation** (this file)
5. **Restart Claude Desktop**

Example:
```typescript
// In getAllTools()
{
  name: 'my_new_tool',
  description: 'Does something awesome',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: '...' }
    },
    required: ['param1']
  }
}

// New handler method
private async handleMyNewTool(args: any) {
  const result = await this.moduleRouter.execute({
    module: 'mymodule',
    action: 'my-action',
    params: args,
  });

  return {
    content: [{
      type: 'text',
      text: `Result: ${JSON.stringify(result.data)}`
    }]
  };
}
```

### Debugging

Enable debug logging:

```json
"env": {
  "NODE_ENV": "development",
  "DEBUG": "jarvis:*",
  "LOG_LEVEL": "debug"
}
```

View logs:
```bash
tail -f /Users/benkennon/Jarvis/logs/jarvis.log
```

---

## Next Steps

1. ✅ Complete installation using automatic script
2. ✅ Verify tools are accessible in Claude Desktop
3. ✅ Test basic commands (system health, list modules)
4. ✅ Test music generation workflow
5. ✅ Test marketing metrics retrieval
6. ✅ Explore advanced workflows
7. 📚 Read integration tests in `/tests/integration/claude-mcp.test.ts`
8. 📖 Review Wave 4 completion report in `/docs/WAVE4_COMPLETION.md`

---

## Support

### Documentation

- **Module API**: `/docs/MODULE_API.md`
- **Wave 2 Completion**: `/docs/WAVE2_COMPLETION.md`
- **Wave 4 Completion**: `/docs/WAVE4_COMPLETION.md` (after Phase 7)

### Logs

- **Jarvis Logs**: `/Users/benkennon/Jarvis/logs/jarvis.log`
- **AI Dawg Logs**: `/Users/benkennon/ai-dawg-v0.1/logs/backend.log`
- **Claude Desktop Logs**: `~/Library/Logs/Claude/mcp-*.log`

### Common Issues

See Troubleshooting section above for solutions to common problems.

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-08
**Maintained By:** Wave 4 Implementation Team
