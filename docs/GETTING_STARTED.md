# Getting Started

**Jarvis + AI DAWG - Developer Quick Start Guide**
**Last Updated:** 2025-10-08

---

## Welcome!

This guide will get you up and running with Jarvis + AI DAWG in less than 30 minutes.

---

## Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** 15 or higher
- **Redis** 7 or higher
- **Git**
- **Code Editor** (VS Code recommended)
- **Basic knowledge** of TypeScript and REST APIs

---

## Quick Setup (Local Development)

### 1. Clone Repositories

```bash
# Create workspace
mkdir ~/jarvis-workspace
cd ~/jarvis-workspace

# Clone Jarvis Control Plane
git clone <jarvis-repo-url> Jarvis
cd Jarvis
npm install

# Clone AI DAWG Backend
cd ~/jarvis-workspace
git clone <aidawg-repo-url> ai-dawg-v0.1
cd ai-dawg-v0.1
npm install
```

### 2. Setup PostgreSQL

```bash
# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb aidawg

# Set up user (if needed)
psql postgres -c "CREATE USER aidawg_user WITH PASSWORD 'password';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE aidawg TO aidawg_user;"
```

### 3. Setup Redis

```bash
# Start Redis
brew services start redis

# Test connection
redis-cli ping
# Should return PONG
```

### 4. Configure Environment

**Jarvis (.env):**
```bash
cd ~/jarvis-workspace/Jarvis
cp .env.example .env

# Edit .env
cat > .env << 'EOF'
JARVIS_PORT=4000
AI_DAWG_BACKEND_URL=http://localhost:3001
JARVIS_AUTH_TOKEN=dev-token-12345
NODE_ENV=development
LOG_LEVEL=debug
EOF
```

**AI DAWG (.env):**
```bash
cd ~/jarvis-workspace/ai-dawg-v0.1
cp .env.example .env

# Edit .env
cat > .env << 'EOF'
PORT=3001
DATABASE_URL=postgresql://aidawg_user:password@localhost:5432/aidawg
REDIS_URL=redis://localhost:6379
NODE_ENV=development
LOG_LEVEL=debug
EOF
```

### 5. Initialize Database

```bash
cd ~/jarvis-workspace/ai-dawg-v0.1

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# (Optional) Seed database
npm run seed
```

### 6. Start Services

Open 3 terminal windows:

**Terminal 1: AI DAWG Backend**
```bash
cd ~/jarvis-workspace/ai-dawg-v0.1
npm run dev
```

**Terminal 2: Jarvis Control Plane**
```bash
cd ~/jarvis-workspace/Jarvis
npm run dev
```

**Terminal 3: Test Commands**
```bash
# Test health
curl http://localhost:4000/health

# Test module execution
curl -X POST http://localhost:4000/api/v1/execute \
  -H "Authorization: Bearer dev-token-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "module": "test",
    "action": "ping",
    "params": {}
  }'
```

---

## Project Structure

```
jarvis-workspace/
├── Jarvis/                       # Control Plane
│   ├── src/
│   │   ├── core/                 # Core components
│   │   │   ├── gateway.ts        # API Gateway
│   │   │   ├── module-router.ts  # Command routing
│   │   │   └── health-aggregator.ts
│   │   ├── integrations/
│   │   │   └── claude/
│   │   │       └── mcp-server.ts # MCP integration
│   │   └── utils/
│   │       └── logger.ts
│   ├── docs/                     # Documentation
│   ├── tests/                    # Tests
│   └── package.json
│
└── ai-dawg-v0.1/                 # Backend
    ├── src/
    │   ├── module-sdk/           # Module SDK
    │   │   ├── base-module.ts
    │   │   └── module-registry.ts
    │   ├── modules/              # Modules
    │   │   ├── music/
    │   │   ├── marketing/
    │   │   ├── engagement/
    │   │   ├── automation/
    │   │   └── testing/
    │   └── backend/              # Backend API
    │       └── routes/
    ├── prisma/                   # Database schema
    ├── docs/                     # Documentation
    └── tests/                    # Tests
```

---

## Development Workflow

### 1. Make Changes

Edit code in your preferred editor:
```bash
code ~/jarvis-workspace/Jarvis
code ~/jarvis-workspace/ai-dawg-v0.1
```

### 2. Test Changes

```bash
# Run tests
npm test

# Run specific test
npm test -- path/to/test.ts

# Run with coverage
npm test -- --coverage
```

### 3. Check Types

```bash
# Type check without building
npm run type-check
```

### 4. Format Code

```bash
# Auto-format (if configured)
npm run format
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

---

## Common Tasks

### Add New Module

1. **Create module file:**
```typescript
// ai-dawg-v0.1/src/modules/mymodule/index.ts
import { BaseModule } from '../../module-sdk';

export class MyModule extends BaseModule {
  name = 'mymodule';
  version = '1.0.0';
  description = 'My custom module';

  async initialize(): Promise<void> {
    this.registerCommand({
      name: 'do-something',
      description: 'Does something',
      handler: this.handleDoSomething.bind(this),
      params: []
    });
  }

  private async handleDoSomething(params: any) {
    return { message: 'Hello from mymodule!' };
  }

  async getHealth() {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  }

  async shutdown() {}
}
```

2. **Register module:**
```typescript
// ai-dawg-v0.1/src/modules/module-loader.ts
import { MyModule } from './mymodule';

const modules = [
  // ... existing modules
  new MyModule(),
];
```

3. **Test module:**
```bash
npm run dev

curl -X POST http://localhost:3001/api/v1/jarvis/execute \
  -d '{"module":"mymodule","action":"do-something","params":{}}'
```

### Add New Endpoint to Jarvis

1. **Add route:**
```typescript
// Jarvis/src/core/gateway.ts
app.get('/api/v1/my-endpoint', async (req, res) => {
  // Your logic
  res.json({ result: 'success' });
});
```

2. **Test endpoint:**
```bash
curl http://localhost:4000/api/v1/my-endpoint
```

### Debug Issues

```bash
# View logs in real-time
tail -f ~/jarvis-workspace/Jarvis/logs/jarvis.log
tail -f ~/jarvis-workspace/ai-dawg-v0.1/logs/backend.log

# Check database
psql aidawg -c "SELECT * FROM users LIMIT 5"

# Check Redis
redis-cli KEYS '*'
redis-cli GET some-key
```

---

## IDE Setup (VS Code)

### Recommended Extensions

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Prisma** - Database schema
- **REST Client** - API testing
- **GitLens** - Git integration

### Workspace Settings

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  }
}
```

### Debug Configuration

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Jarvis",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/Jarvis",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug AI DAWG",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/ai-dawg-v0.1",
      "console": "integratedTerminal"
    }
  ]
}
```

---

## Testing

### Run All Tests

```bash
# Jarvis
cd ~/jarvis-workspace/Jarvis
npm test

# AI DAWG
cd ~/jarvis-workspace/ai-dawg-v0.1
npm test
```

### Run Specific Tests

```bash
# Run one test file
npm test -- tests/integration/claude-mcp.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="Health"
```

### Write Tests

```typescript
// tests/my-feature.test.ts
describe('My Feature', () => {
  it('should do something', async () => {
    const result = await myFunction();
    expect(result).toBe('expected');
  });
});
```

---

## Documentation

- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Reference:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Module SDK:** [../ai-dawg-v0.1/docs/MODULE_SDK_GUIDE.md](../ai-dawg-v0.1/docs/MODULE_SDK_GUIDE.md)
- **Deployment:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Next Steps

1. ✅ Complete local setup
2. 📖 Read [Architecture Documentation](./ARCHITECTURE.md)
3. 🧪 Run integration tests
4. 🔧 Create your first module
5. 🚀 Deploy to staging
6. 📚 Read [Contributing Guide](./CONTRIBUTING.md)

---

## Need Help?

- **Documentation Issues:** Create GitHub issue
- **Questions:** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Bugs:** Create GitHub issue with reproduction steps

Welcome to the team! 🎉

