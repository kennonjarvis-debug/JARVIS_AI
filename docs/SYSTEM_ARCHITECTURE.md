# System Architecture Documentation

**Jarvis + AI DAWG - Complete System Architecture**
**Version:** 2.0.0
**Last Updated:** 2025-10-08

---

## Executive Summary

The Jarvis + AI DAWG system is a distributed, microservices-based platform providing AI-powered digital audio workstation capabilities with natural language control through Claude Desktop, ChatGPT, and other AI assistants.

### Key Architectural Principles

1. **Separation of Concerns** - Control plane (Jarvis) separate from execution engine (AI DAWG)
2. **Module SDK Architecture** - Pluggable module system for extensibility
3. **API-First Design** - All functionality exposed through REST APIs  
4. **Integration-Ready** - MCP, webhooks, and SDK support
5. **Health-First Monitoring** - Comprehensive health checks at every level

### System Components

| Component | Purpose | Port | Status |
|-----------|---------|------|--------|
| Jarvis Control Plane | API Gateway & Orchestration | 4000 | ✅ Production |
| AI DAWG Backend | Module Execution Engine | 3001 | ✅ Production |
| Claude MCP Server | Claude Desktop Integration | stdio | ✅ Production |
| Dashboard | Web UI for Monitoring | 3002 | ✅ Production |
| PostgreSQL | Persistent Data Store | 5432 | ✅ Production |
| Redis | Caching & Queues | 6379 | ✅ Production |

---

## High-Level Architecture

See complete diagrams in `/docs/ARCHITECTURE.md`

---

## Component Details

### Jarvis Control Plane

- **Location:** `/Users/benkennon/Jarvis`
- **Port:** 4000
- **Purpose:** Central API gateway and orchestration

**Key Files:**
- `src/core/gateway.ts` - Express API server
- `src/core/module-router.ts` - Command routing with retry logic
- `src/core/health-aggregator.ts` - Service health monitoring
- `src/integrations/claude/mcp-server.ts` - Claude MCP integration

### AI DAWG Backend

- **Location:** `/Users/benkennon/ai-dawg-v0.1`
- **Port:** 3001
- **Purpose:** Module execution engine

**Key Files:**
- `src/module-sdk/` - Module SDK framework
- `src/modules/` - Pluggable modules (music, marketing, engagement, automation, testing)
- `src/backend/routes/jarvis-execute.routes.ts` - Jarvis compatibility endpoint

---

## Data Flow Examples

### Command Execution
1. User → Claude Desktop → MCP Server
2. MCP Server → Module Router → AI DAWG Backend
3. Backend → Module SDK → Specific Module
4. Module → Database/External APIs
5. Response flows back through the chain

### Health Check
1. Client → Jarvis Health Aggregator
2. Aggregator → AI DAWG Backend → Module Registry
3. Registry → All Modules (parallel health checks)
4. Aggregated response returned

---

## Security

- Bearer token authentication
- Rate limiting (100 req/15min)
- CORS configuration
- Helmet security headers
- Environment-based secrets

---

## Scalability

- Stateless design enables horizontal scaling
- Connection pooling for databases
- Redis for distributed caching
- Load balancer ready

---

## References

- [Detailed Architecture](./ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Module SDK Guide](./MODULE_SDK_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
