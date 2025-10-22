# Jarvis Desktop App - Build Guide

## Multi-Instance Development Strategy

This guide shows how to use 5 parallel Claude instances to build Jarvis AI Desktop App efficiently.

---

## Prerequisites

```bash
node --version  # v18+ required
npm --version   # v9+ required
```

---

## Instance 1: Project Foundation & Backend Core

### Terminal 1 Commands

```bash
cd /Users/benkennon/Jarvis

# Initialize project
npm init -y
npm install --save-dev electron electron-builder typescript @types/node
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install axios dotenv node-cron

# TypeScript setup
npx tsc --init
```

### Tasks for Claude Instance 1

1. **Create `package.json` with Electron scripts**
2. **Configure `tsconfig.json` for Electron**
3. **Build `src/main.ts` - Electron main process**
4. **Create `src/jarvis/core/jarvis.controller.ts`**
5. **Create `src/jarvis/core/jarvis.scheduler.ts`**
6. **Create `src/jarvis/core/jarvis.monitor.ts`**
7. **Create `src/jarvis/api/jarvis-api.client.ts` with:**
   - Base URL: `https://kaycee-nonextrinsical-yosef.ngrok-free.dev`
   - API Key header: `X-ChatGPT-App-Key: aigpt_b-Vwg_lDEBh5EX1tHM3frWlFTTdnylYbPImeY0XfI10`
8. **Create `.env` file for secrets**

**Prompt for Instance 1:**
```
I'm building Instance 1 of the Jarvis Desktop App. Please:

1. Initialize an Electron + TypeScript project
2. Create package.json with these scripts:
   - dev: Run Electron in dev mode with hot reload
   - build: Build for production (macOS)
   - start: Run the built app
3. Create tsconfig.json optimized for Electron
4. Create src/main.ts that:
   - Creates a BrowserWindow
   - Loads the renderer process
   - Sets up IPC handlers
5. Create src/jarvis/api/jarvis-api.client.ts with:
   - Axios client configured for: https://kaycee-nonextrinsical-yosef.ngrok-free.dev
   - API key in header: X-ChatGPT-App-Key: aigpt_b-Vwg_lDEBh5EX1tHM3frWlFTTdnylYbPImeY0XfI10
   - TypeScript interfaces for API responses
   - Error handling and retry logic
6. Create src/jarvis/core/jarvis.controller.ts - main orchestrator
7. Create .env.example file

Use strict TypeScript types throughout.
```

---

## Instance 2: Frontend/UI Layer

### Terminal 2 Commands

```bash
cd /Users/benkennon/Jarvis

# Install React & UI dependencies
npm install react react-dom
npm install --save-dev @types/react @types/react-dom
npm install --save-dev webpack webpack-cli webpack-dev-server
npm install --save-dev html-webpack-plugin ts-loader css-loader style-loader
npm install recharts lucide-react clsx tailwindcss
```

### Tasks for Claude Instance 2

1. **Configure Webpack for Electron renderer**
2. **Set up Tailwind CSS**
3. **Create `src/renderer/index.tsx` - React entry**
4. **Create `src/renderer/App.tsx` - main app component**
5. **Build Dashboard UI:**
   - System health metrics
   - Real-time activity feed
   - Quick action buttons
6. **Create Settings panel**
7. **System tray menu integration**
8. **Dark/light theme toggle**

**Prompt for Instance 2:**
```
I'm building Instance 2 of the Jarvis Desktop App (UI Layer). The backend (Instance 1) is handling Electron main process and API.

Please create:

1. Webpack config for Electron renderer process with hot reload
2. Tailwind CSS setup
3. src/renderer/index.tsx - React entry point
4. src/renderer/App.tsx with:
   - Dashboard layout
   - Sidebar navigation
   - Real-time metrics display
5. src/renderer/components/Dashboard.tsx:
   - System health cards (CPU, Memory, API status)
   - Activity timeline
   - Quick actions (Start/Stop jobs, Run tasks)
6. src/renderer/components/Settings.tsx:
   - Config editor for jarvis.config.json
   - API key management
   - Job schedule configuration
7. src/renderer/hooks/useJarvisAPI.ts - React hook for IPC communication
8. Dark mode using Tailwind

Use TypeScript, functional components, and hooks throughout.
```

---

## Instance 3: Jarvis Modules - Music & Marketing

### Terminal 3 Commands

```bash
cd /Users/benkennon/Jarvis
mkdir -p src/jarvis/modules/{music,marketing}

# Install module-specific deps
npm install openai @anthropic-ai/sdk  # For AI integrations
npm install stripe                     # For payment tracking
npm install @sendgrid/mail            # For email campaigns
```

### Tasks for Claude Instance 3

1. **`src/jarvis/modules/music/generator.service.ts`**
   - AI music generation orchestration
   - Model selection logic
   - Queue management
2. **`src/jarvis/modules/music/model-manager.ts`**
   - Dynamic model loading
   - Version control for models
3. **`src/jarvis/modules/marketing/marketing-automation.ts`**
   - Social media posting
   - Email campaigns
   - SEO optimization tasks
4. **`src/jarvis/modules/marketing/metrics-tracker.ts`**
   - Revenue tracking
   - Conversion rate monitoring
   - User acquisition metrics
5. **`src/jarvis/modules/marketing/feedback-loop.ts`**
   - A/B test analysis
   - Campaign performance learning

**Prompt for Instance 3:**
```
I'm building Instance 3 of Jarvis Desktop App (Music + Marketing Modules).

Context:
- API endpoint: https://kaycee-nonextrinsical-yosef.ngrok-free.dev
- API client is available at src/jarvis/api/jarvis-api.client.ts
- Config is in src/jarvis/core/jarvis.interfaces.ts

Please create:

1. src/jarvis/modules/music/generator.service.ts:
   - orchestrateGeneration(prompt: string, style: string): Promise<AudioFile>
   - queueGeneration(job: GenerationJob): void
   - getQueueStatus(): QueueStatus

2. src/jarvis/modules/music/model-manager.ts:
   - loadModel(modelName: string): Promise<Model>
   - selectOptimalModel(criteria: ModelCriteria): Model
   - updateModels(): Promise<void>

3. src/jarvis/modules/marketing/marketing-automation.ts:
   - scheduleSocialPost(content: string, platforms: string[]): Promise<void>
   - runSEOAnalysis(url: string): Promise<SEOReport>
   - optimizeCampaign(campaignId: string): Promise<OptimizationResult>

4. src/jarvis/modules/marketing/metrics-tracker.ts:
   - trackRevenue(source: string, amount: number): void
   - getConversionRate(period: DateRange): number
   - getChurnMetrics(): ChurnMetrics

5. src/jarvis/modules/marketing/feedback-loop.ts:
   - analyzeABTest(testId: string): ABTestResult
   - learnFromCampaign(campaignId: string): void
   - recommendOptimizations(): Recommendation[]

Use async/await, proper error handling, and comprehensive TypeScript interfaces.
```

---

## Instance 4: Jarvis Modules - Engagement, Workflow & Intelligence

### Terminal 4 Commands

```bash
cd /Users/benkennon/Jarvis
mkdir -p src/jarvis/modules/{engagement,workflow,intelligence}

# Install AI/NLP dependencies
npm install natural sentiment compromise
npm install bull                    # Job queue
npm install @octokit/rest          # GitHub integration
```

### Tasks for Claude Instance 4

1. **`src/jarvis/modules/engagement/chatbot.service.ts`**
2. **`src/jarvis/modules/engagement/sentiment-analyzer.ts`**
3. **`src/jarvis/modules/engagement/proactive-engager.ts`**
4. **`src/jarvis/modules/workflow/automation-pipeline.ts`**
5. **`src/jarvis/modules/workflow/scaling-orchestrator.ts`**
6. **`src/jarvis/modules/intelligence/bi-engine.ts`**
7. **`src/jarvis/modules/intelligence/dashboard-reporter.ts`**
8. **`src/jarvis/modules/intelligence/planning-agent.ts`**

**Prompt for Instance 4:**
```
I'm building Instance 4 of Jarvis Desktop App (Engagement, Workflow & Intelligence Modules).

Context:
- API client available at src/jarvis/api/jarvis-api.client.ts
- Core controller at src/jarvis/core/jarvis.controller.ts
- Use Jarvis API for AI operations

Please create:

1. src/jarvis/modules/engagement/chatbot.service.ts:
   - handleUserMessage(message: string, context: UserContext): Promise<BotResponse>
   - onboardNewUser(userId: string): Promise<void>
   - escalateToHuman(conversationId: string): void

2. src/jarvis/modules/engagement/sentiment-analyzer.ts:
   - analyzeSentiment(text: string): SentimentScore
   - trackUserSentiment(userId: string, interactions: Interaction[]): SentimentTrend
   - detectFrustration(conversation: Message[]): boolean

3. src/jarvis/modules/engagement/proactive-engager.ts:
   - identifyAtRiskUsers(): Promise<User[]>
   - sendReEngagementMessage(userId: string): Promise<void>
   - scheduleFollowUp(userId: string, delay: number): void

4. src/jarvis/modules/workflow/automation-pipeline.ts:
   - runTests(): Promise<TestResults>
   - triggerDeployment(environment: string): Promise<DeploymentStatus>
   - autoRemediate(issue: Issue): Promise<void>

5. src/jarvis/modules/workflow/scaling-orchestrator.ts:
   - analyzeResourceUsage(): ResourceMetrics
   - recommendScaling(): ScalingRecommendation
   - autoScale(trigger: ScalingTrigger): Promise<void>

6. src/jarvis/modules/intelligence/bi-engine.ts:
   - aggregateData(sources: DataSource[]): AggregatedData
   - generateInsights(data: AggregatedData): Insight[]
   - predictTrends(historicalData: TimeSeries): Prediction[]

7. src/jarvis/modules/intelligence/dashboard-reporter.ts:
   - generateDailyReport(): Promise<Report>
   - exportVisualization(chartType: string, data: any): Buffer
   - sendReportEmail(recipients: string[]): Promise<void>

8. src/jarvis/modules/intelligence/planning-agent.ts:
   - analyzePastPerformance(): PerformanceAnalysis
   - generateActionPlan(goal: Goal): ActionPlan
   - optimizeResourceAllocation(budget: Budget): AllocationPlan

Use NLP libraries (natural, sentiment) for text analysis and proper TypeScript typing.
```

---

## Instance 5: Jobs, Tests & Documentation

### Terminal 5 Commands

```bash
cd /Users/benkennon/Jarvis
mkdir -p src/jarvis/jobs tests/{unit,integration,e2e} docs

# Install testing dependencies
npm install --save-dev jest ts-jest @types/jest
npm install --save-dev playwright @playwright/test
npm install --save-dev eslint prettier
```

### Tasks for Claude Instance 5

1. **`src/jarvis/jobs/daily-metrics.job.ts`**
2. **`src/jarvis/jobs/feedback-sync.job.ts`**
3. **`src/jarvis/jobs/health-tracking.job.ts`**
4. **Jest configuration**
5. **Unit tests for all modules**
6. **Integration tests for API**
7. **E2E tests with Playwright**
8. **Comprehensive documentation**

**Prompt for Instance 5:**
```
I'm building Instance 5 of Jarvis Desktop App (Jobs, Testing & Documentation).

Context:
- All modules are in src/jarvis/modules/
- Core services in src/jarvis/core/
- Config at config/jarvis.config.json

Please create:

1. src/jarvis/jobs/daily-metrics.job.ts:
   - Runs at 6 AM (cron: '0 6 * * *')
   - Collects system metrics, health status, performance baselines
   - Calls jarvis.monitor.ts for data aggregation

2. src/jarvis/jobs/feedback-sync.job.ts:
   - Runs at 8 AM (cron: '0 8 * * *')
   - Syncs marketing feedback with engagement data
   - Updates ML models with new learnings

3. src/jarvis/jobs/health-tracking.job.ts:
   - Runs at 10 AM (cron: '0 10 * * *')
   - Checks all services, APIs, dependencies
   - Sends alerts if issues detected

4. Jest configuration (jest.config.js)
   - TypeScript support via ts-jest
   - Coverage thresholds: 80%

5. Unit tests:
   - tests/unit/core/jarvis.controller.spec.ts
   - tests/unit/modules/music/generator.service.spec.ts
   - tests/unit/modules/marketing/metrics-tracker.spec.ts
   - tests/unit/api/jarvis-api.client.spec.ts

6. Integration tests:
   - tests/integration/api-integration.spec.ts (test real API calls)
   - tests/integration/jobs-integration.spec.ts (test cron jobs)

7. E2E tests with Playwright:
   - tests/e2e/app.spec.ts (test full app workflow)
   - tests/e2e/dashboard.spec.ts (test UI interactions)

8. Documentation:
   - docs/ARCHITECTURE.md
   - docs/API_REFERENCE.md
   - docs/DEPLOYMENT.md
   - docs/DEVELOPMENT.md
   - README.md (comprehensive setup guide)

Use proper mocking, test fixtures, and detailed assertions.
```

---

## Integration Phase: Bringing It All Together

### Once all instances complete their work:

```bash
# Terminal 1 (Main)
cd /Users/benkennon/Jarvis

# Install all dependencies
npm install

# Run linting
npm run lint

# Run all tests
npm test

# Build the app
npm run build

# Run in development
npm run dev
```

---

## File Structure After All Instances Complete

```
Jarvis/
├── config/
│   └── jarvis.config.json
├── src/
│   ├── main.ts                          # Instance 1
│   ├── jarvis/
│   │   ├── core/                        # Instance 1
│   │   │   ├── jarvis.controller.ts
│   │   │   ├── jarvis.scheduler.ts
│   │   │   ├── jarvis.monitor.ts
│   │   │   └── jarvis.interfaces.ts
│   │   ├── api/                         # Instance 1
│   │   │   └── jarvis-api.client.ts
│   │   ├── modules/
│   │   │   ├── music/                   # Instance 3
│   │   │   ├── marketing/               # Instance 3
│   │   │   ├── engagement/              # Instance 4
│   │   │   ├── workflow/                # Instance 4
│   │   │   └── intelligence/            # Instance 4
│   │   └── jobs/                        # Instance 5
│   │       ├── daily-metrics.job.ts
│   │       ├── feedback-sync.job.ts
│   │       └── health-tracking.job.ts
│   └── renderer/                        # Instance 2
│       ├── index.tsx
│       ├── App.tsx
│       ├── components/
│       └── hooks/
├── tests/                               # Instance 5
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                                # Instance 5
├── package.json
├── tsconfig.json
├── webpack.config.js
├── jest.config.js
└── README.md
```

---

## Timeline Estimate

- **Phase 1 (Parallel):** ~2-3 hours
  - All 5 instances working simultaneously

- **Phase 2 (Integration):** ~1 hour
  - Merge all work
  - Fix any conflicts
  - Run tests

- **Phase 3 (Testing):** ~1 hour
  - Full E2E testing
  - Bug fixes

- **Phase 4 (Documentation & Polish):** ~30 mins

**Total: ~5 hours** (vs ~20+ hours sequential)

---

## Communication Between Instances

Create a shared `INTEGRATION.md` file that each instance updates:

```markdown
# Integration Checklist

## Instance 1: Backend Core ✅
- [ ] API client working
- [ ] IPC handlers registered
- [ ] Core controller initialized
- Exports: `JarvisApiClient`, `JarvisController`, `JarvisScheduler`

## Instance 2: Frontend ⏳
- [ ] Webpack building successfully
- [ ] React app rendering
- [ ] IPC communication working
- Imports needed: `JarvisApiClient` from Instance 1

## Instance 3: Music + Marketing ⏳
- [ ] All services implemented
- [ ] Tests passing
- Imports needed: `JarvisController`, `JarvisApiClient`

## Instance 4: Engagement + Intelligence ⏳
- [ ] All services implemented
- [ ] NLP models loaded
- Imports needed: `JarvisController`, `JarvisApiClient`

## Instance 5: Jobs + Tests ⏳
- [ ] All cron jobs working
- [ ] Unit tests at 80%+ coverage
- [ ] E2E tests passing
- Imports needed: All modules
```

---

## Quick Start Commands

### Start Instance 1
```bash
cd /Users/benkennon/Jarvis && npm init -y && echo "Instance 1 ready"
```

### Start Instance 2
```bash
cd /Users/benkennon/Jarvis && mkdir -p src/renderer && echo "Instance 2 ready"
```

### Start Instance 3
```bash
cd /Users/benkennon/Jarvis && mkdir -p src/jarvis/modules/{music,marketing} && echo "Instance 3 ready"
```

### Start Instance 4
```bash
cd /Users/benkennon/Jarvis && mkdir -p src/jarvis/modules/{engagement,workflow,intelligence} && echo "Instance 4 ready"
```

### Start Instance 5
```bash
cd /Users/benkennon/Jarvis && mkdir -p tests/{unit,integration,e2e} docs && echo "Instance 5 ready"
```

---

## Pro Tips

1. **Use Git branches** for each instance:
   ```bash
   git checkout -b instance-1-backend
   git checkout -b instance-2-frontend
   # etc.
   ```

2. **Share type definitions early** - Instance 1 should export all TypeScript interfaces first

3. **Mock dependencies** - Each instance can work independently by mocking imports

4. **Use feature flags** - Enable/disable modules during development

5. **Real-time sync** - Use a shared doc or GitHub issues to track progress

---

## Dependencies Summary

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "dotenv": "^16.3.1",
    "node-cron": "^3.0.3",
    "recharts": "^2.10.0",
    "openai": "^4.20.0",
    "@anthropic-ai/sdk": "^0.9.0",
    "natural": "^6.9.0",
    "sentiment": "^5.0.2",
    "bull": "^4.11.5"
  },
  "devDependencies": {
    "electron": "^27.0.0",
    "electron-builder": "^24.6.4",
    "typescript": "^5.2.2",
    "webpack": "^5.89.0",
    "jest": "^29.7.0",
    "playwright": "^1.40.0",
    "tailwindcss": "^3.3.5",
    "@types/node": "^20.9.0",
    "@types/react": "^18.2.37"
  }
}
```

---

## Next Steps

1. **Start with Instance 1** - Foundation is critical
2. **Launch Instances 2-4 in parallel** once Instance 1 exports types
3. **Instance 5 starts last** after modules are ready
4. **Integration meeting** when all instances hit 80% complete
5. **Final polish** and deployment

---

**Questions?** Check docs/ or open an issue in each instance branch.
