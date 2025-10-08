# Jarvis Desktop App

> **AI DAWG Controller** - Native desktop application for Jarvis AI system

A cross-platform desktop application built with Electron, React, and TypeScript that provides a powerful interface for managing and monitoring the Jarvis AI system.

---

## 🎯 Overview

Jarvis Desktop App is an autonomous AI operator that handles:
- 🎵 **Music Generation** - AI-powered music synthesis and model management
- 📈 **Marketing Automation** - Social media, SEO, and campaign optimization
- 💬 **User Engagement** - Chatbot, sentiment analysis, and proactive retention
- 🔄 **Workflow Automation** - CI/CD, testing, deployment, and scaling
- 🧠 **Business Intelligence** - Data aggregation, insights, and predictive planning

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ ([Download](https://nodejs.org/))
- npm v9+
- Git

### Installation

```bash
# Clone or navigate to this directory
cd /Users/benkennon/Jarvis

# Run initialization script
./init-project.sh

# This creates the directory structure and git branches
```

---

## 🏗️ Multi-Instance Build Strategy

This project is designed to be built by **5 parallel Claude Code instances** for maximum efficiency.

### 📖 Read These First

1. **[QUICK_START.md](./QUICK_START.md)** - Copy-paste prompts for each instance
2. **[BUILD_GUIDE.md](./BUILD_GUIDE.md)** - Detailed build instructions
3. **[INTEGRATION.md](./INTEGRATION.md)** - Track progress across instances

### Instance Breakdown

| Instance | Focus | Branch | Est. Time |
|----------|-------|--------|-----------|
| **1** | Backend Core & API | `instance-1-backend` | 1-2h |
| **2** | Frontend UI | `instance-2-frontend` | 2-3h |
| **3** | Music + Marketing Modules | `instance-3-modules-music-marketing` | 2-3h |
| **4** | Engagement + Intelligence | `instance-4-modules-engagement-intelligence` | 2-3h |
| **5** | Jobs, Tests, Docs | `instance-5-jobs-tests` | 1-2h |

**Total parallel time:** ~5 hours (vs 20+ sequential)

---

## 🛠️ Tech Stack

### Core
- **Electron** - Cross-platform desktop framework
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Webpack** - Module bundler

### Styling
- **Tailwind CSS** - Utility-first CSS
- **Lucide React** - Icon library
- **Recharts** - Data visualization

### Backend Services
- **Axios** - HTTP client
- **node-cron** - Job scheduling
- **Bull** - Job queue (Redis-based)

### AI/NLP
- **OpenAI SDK** - GPT integration
- **Anthropic SDK** - Claude integration
- **Natural** - NLP library
- **Sentiment** - Sentiment analysis

### Testing
- **Jest** - Unit testing
- **Playwright** - E2E testing
- **ts-jest** - TypeScript Jest support

---

## 📂 Project Structure

```
Jarvis/
├── config/
│   └── jarvis.config.json         # System configuration
│
├── src/
│   ├── main.ts                    # Electron main process
│   │
│   ├── jarvis/
│   │   ├── core/                  # Core orchestration
│   │   │   ├── jarvis.controller.ts
│   │   │   ├── jarvis.scheduler.ts
│   │   │   ├── jarvis.monitor.ts
│   │   │   └── jarvis.interfaces.ts
│   │   │
│   │   ├── api/                   # API integration
│   │   │   └── jarvis-api.client.ts
│   │   │
│   │   ├── modules/               # Feature modules
│   │   │   ├── music/
│   │   │   ├── marketing/
│   │   │   ├── engagement/
│   │   │   ├── workflow/
│   │   │   └── intelligence/
│   │   │
│   │   └── jobs/                  # Scheduled tasks
│   │       ├── daily-metrics.job.ts
│   │       ├── feedback-sync.job.ts
│   │       └── health-tracking.job.ts
│   │
│   └── renderer/                  # React frontend
│       ├── index.tsx
│       ├── App.tsx
│       ├── components/
│       ├── hooks/
│       └── pages/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   ├── DEVELOPMENT.md
│   └── DEPLOYMENT.md
│
└── dist/                          # Build output
```

---

## 🔧 Development

### Instance 1: Backend Core
```bash
git checkout instance-1-backend
npm install
# Follow QUICK_START.md Instance 1 prompt
```

### Instance 2: Frontend
```bash
git checkout instance-2-frontend
# Follow QUICK_START.md Instance 2 prompt
```

### Instances 3, 4, 5
See [QUICK_START.md](./QUICK_START.md) for detailed instructions.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

## 📦 Building

```bash
# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Build for macOS
npm run build:mac

# Build for Windows
npm run build:win

# Build for Linux
npm run build:linux
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Jarvis API
JARVIS_API_URL=https://kaycee-nonextrinsical-yosef.ngrok-free.dev
JARVIS_API_KEY=aigpt_b-Vwg_lDEBh5EX1tHM3frWlFTTdnylYbPImeY0XfI10

# Optional services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
SENDGRID_API_KEY=SG...
```

---

## 📊 Features

### Core Capabilities
- ✅ System health monitoring
- ✅ Real-time metrics dashboard
- ✅ Scheduled job management
- ✅ AI model orchestration
- ✅ Automated deployments
- ✅ Anomaly detection
- ✅ Adaptive learning

### Module Features

#### 🎵 Music
- AI music generation
- Dynamic model selection
- Generation queue management

#### 📈 Marketing
- Social media automation
- SEO analysis
- Campaign optimization
- A/B testing
- Revenue tracking

#### 💬 Engagement
- AI chatbot
- Sentiment analysis
- Proactive user retention
- Churn prediction

#### 🔄 Workflow
- Automated testing
- CI/CD orchestration
- Auto-scaling
- Self-healing systems

#### 🧠 Intelligence
- Business intelligence
- Predictive analytics
- Resource optimization
- Performance reporting

---

## 🔐 Security

- ✅ API key encryption
- ✅ Role-based access control
- ✅ Audit logging
- ✅ Rate limiting
- ✅ Secure IPC communication

---

## 📈 Monitoring

### Built-in Metrics
- CPU usage
- Memory usage
- API response times
- Job success rates
- Error rates
- User engagement
- Revenue tracking

### Alerts
- Threshold breaches
- Anomaly detection
- Deployment status
- System health issues

---

## 🤝 Contributing

### Adding a New Module

1. Create module directory:
   ```bash
   mkdir -p src/jarvis/modules/your-module
   ```

2. Implement service class:
   ```typescript
   // src/jarvis/modules/your-module/your-service.ts
   export class YourService {
     async doSomething(): Promise<Result> {
       // Implementation
     }
   }
   ```

3. Register in controller:
   ```typescript
   // src/jarvis/core/jarvis.controller.ts
   import { YourService } from '../modules/your-module/your-service';
   ```

4. Add tests:
   ```typescript
   // tests/unit/modules/your-module/your-service.spec.ts
   ```

See [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for detailed guidelines.

---

## 📚 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

---

## 🐛 Troubleshooting

### Common Issues

**App won't start**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**API calls failing**
- Check `.env` file has correct API key
- Verify API endpoint is accessible
- Check network/firewall settings

**Jobs not running**
- Check cron syntax in config
- Verify scheduler is initialized
- Check logs: `tail -f logs/jarvis.log`

**Build errors**
- Ensure Node.js v18+
- Clear dist folder: `rm -rf dist`
- Run `npm run build` again

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) file for details

---

## 🎉 Getting Help

1. Check [QUICK_START.md](./QUICK_START.md)
2. Read [BUILD_GUIDE.md](./BUILD_GUIDE.md)
3. Review [INTEGRATION.md](./INTEGRATION.md)
4. Search existing issues
5. Create new issue with details

---

## 🚀 Deployment

### Production Build

```bash
# Build for your platform
npm run build

# Output will be in dist/
# - dist/mac/Jarvis.dmg (macOS)
# - dist/win/Jarvis.exe (Windows)
# - dist/linux/Jarvis.AppImage (Linux)
```

### Auto-Updates

Configure in `electron-builder.yml`:
```yaml
publish:
  provider: github
  repo: jarvis-desktop
  owner: your-username
```

---

**Built with ❤️ for autonomous AI operations**

**Version:** 2.0
**Status:** In Development
**API:** [Jarvis AI DAWG Controller](https://kaycee-nonextrinsical-yosef.ngrok-free.dev)
