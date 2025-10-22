# Jarvis Desktop App - Quick Start

## 🚀 Launch All 5 Claude Instances Now

### Instance 1: Backend Core (START FIRST)
**Open Claude Code Terminal 1:**
```bash
cd /Users/benkennon/Jarvis
npm init -y
git init
git checkout -b instance-1-backend
```

**Paste this prompt to Claude:**
```
I'm building Instance 1 of the Jarvis Desktop App. Please:

1. Update package.json with Electron + TypeScript setup:
   - Name: "jarvis-desktop"
   - Scripts: dev, build, start, test
   - Dependencies: electron, axios, dotenv, node-cron
   - DevDependencies: typescript, electron-builder, @types/node

2. Create tsconfig.json for Electron with strict mode

3. Create src/main.ts:
   - Electron BrowserWindow (1200x800)
   - Load renderer from webpack dev server in dev mode
   - Set up IPC handlers for: runJob, getMetrics, updateConfig
   - System tray icon support

4. Create src/jarvis/core/jarvis.interfaces.ts:
   - Export all TypeScript interfaces from config/jarvis.config.json
   - Add API types: ApiResponse<T>, ApiError, JobStatus, MetricData

5. Create src/jarvis/api/jarvis-api.client.ts:
   - Axios instance with base URL: https://kaycee-nonextrinsical-yosef.ngrok-free.dev
   - Add header: X-ChatGPT-App-Key: aigpt_b-Vwg_lDEBh5EX1tHM3frWlFTTdnylYbPImeY0XfI10
   - Methods: executeTask(), getStatus(), streamResponse()
   - Error handling with retries

6. Create src/jarvis/core/jarvis.controller.ts:
   - Main orchestrator class
   - initialize(), start(), stop() methods
   - Module registration system
   - Event emitter for system events

7. Create src/jarvis/core/jarvis.scheduler.ts:
   - Cron job manager using node-cron
   - Load jobs from config
   - Methods: registerJob(), startAll(), stopAll()

8. Create src/jarvis/core/jarvis.monitor.ts:
   - System health monitoring
   - Metrics collection (CPU, memory, API response times)
   - Alert thresholds from config

9. Create .env.example with placeholder secrets

Use strict TypeScript. Export all types from jarvis.interfaces.ts.
```

---

### Instance 2: Frontend UI (START AFTER INSTANCE 1 EXPORTS TYPES)
**Open Claude Code Terminal 2:**
```bash
cd /Users/benkennon/Jarvis
git checkout -b instance-2-frontend
```

**Paste this prompt to Claude:**
```
I'm building Instance 2 of the Jarvis Desktop App (Frontend).

Instance 1 has created:
- src/jarvis/core/jarvis.interfaces.ts (all types)
- src/jarvis/api/jarvis-api.client.ts (API client)
- IPC handlers in src/main.ts

Please:

1. Install React dependencies:
   - react, react-dom, @types/react, @types/react-dom
   - webpack, webpack-cli, webpack-dev-server, html-webpack-plugin
   - tailwindcss, lucide-react, recharts

2. Create webpack.config.js:
   - Entry: src/renderer/index.tsx
   - Output: dist/renderer
   - Hot reload in dev mode
   - TypeScript loader

3. Create tailwind.config.js with dark mode support

4. Create src/renderer/index.tsx:
   - React root render
   - Import App.tsx

5. Create src/renderer/App.tsx:
   - Main layout with sidebar
   - Routes: Dashboard, Jobs, Metrics, Settings
   - Dark mode toggle in header

6. Create src/renderer/components/Dashboard.tsx:
   - System health cards (API status, jobs running, metrics)
   - Real-time activity feed
   - Quick actions: Run job, trigger deployment

7. Create src/renderer/components/JobsPanel.tsx:
   - List all jobs from config
   - Manual trigger buttons
   - Job status indicators (running, completed, failed)
   - Logs viewer

8. Create src/renderer/components/MetricsChart.tsx:
   - Recharts line chart for metrics over time
   - Toggle between CPU, memory, API response times

9. Create src/renderer/components/Settings.tsx:
   - Load config/jarvis.config.json
   - Editable fields for thresholds, schedules
   - Save button (calls IPC to update config)

10. Create src/renderer/hooks/useJarvisIPC.ts:
    - Custom hook for IPC communication
    - Methods: runJob(), getMetrics(), getConfig(), updateConfig()

Use Tailwind for styling, Lucide React for icons, TypeScript throughout.
```

---

### Instance 3: Music + Marketing Modules (START IN PARALLEL)
**Open Claude Code Terminal 3:**
```bash
cd /Users/benkennon/Jarvis
git checkout -b instance-3-modules-music-marketing
mkdir -p src/jarvis/modules/{music,marketing}
```

**Paste this prompt to Claude:**
```
I'm building Instance 3 of Jarvis (Music + Marketing Modules).

Import from Instance 1:
- src/jarvis/core/jarvis.interfaces.ts (types)
- src/jarvis/api/jarvis-api.client.ts (API client)

Please create:

1. src/jarvis/modules/music/generator.service.ts:
   - Class: MusicGeneratorService
   - orchestrateGeneration(prompt: string, style: MusicStyle): Promise<GenerationResult>
   - queueGeneration(job: GenerationJob): string (returns jobId)
   - getQueueStatus(): GenerationQueue
   - Use JarvisApiClient to call music generation API

2. src/jarvis/modules/music/model-manager.ts:
   - Class: ModelManager
   - loadModel(modelName: string): Promise<MusicModel>
   - selectOptimalModel(criteria: { quality: number, speed: number }): MusicModel
   - updateModels(): Promise<void>
   - Cache loaded models in memory

3. src/jarvis/modules/marketing/marketing-automation.ts:
   - Class: MarketingAutomationService
   - scheduleSocialPost(content: string, platforms: SocialPlatform[], scheduledTime: Date): Promise<void>
   - runSEOAnalysis(url: string): Promise<SEOReport>
   - optimizeCampaign(campaignId: string): Promise<OptimizationResult>
   - generateMarketingContent(topic: string): Promise<string>

4. src/jarvis/modules/marketing/metrics-tracker.ts:
   - Class: MetricsTracker
   - trackRevenue(source: string, amount: number, metadata: any): void
   - getConversionRate(startDate: Date, endDate: Date): number
   - getChurnMetrics(): ChurnMetrics
   - calculateCAC(): number (Customer Acquisition Cost)
   - calculateLTV(): number (Lifetime Value)

5. src/jarvis/modules/marketing/feedback-loop.ts:
   - Class: FeedbackLoop
   - analyzeABTest(testId: string): ABTestResult
   - learnFromCampaign(campaignId: string, outcome: CampaignOutcome): void
   - recommendOptimizations(): MarketingRecommendation[]
   - updateMLModel(feedback: FeedbackData): Promise<void>

Add comprehensive JSDoc comments. Use async/await and proper error handling.
```

---

### Instance 4: Engagement + Workflow + Intelligence (START IN PARALLEL)
**Open Claude Code Terminal 4:**
```bash
cd /Users/benkennon/Jarvis
git checkout -b instance-4-modules-engagement-intelligence
mkdir -p src/jarvis/modules/{engagement,workflow,intelligence}
```

**Paste this prompt to Claude:**
```
I'm building Instance 4 of Jarvis (Engagement, Workflow & Intelligence Modules).

Import from Instance 1:
- src/jarvis/core/jarvis.interfaces.ts
- src/jarvis/api/jarvis-api.client.ts

Please create:

1. src/jarvis/modules/engagement/chatbot.service.ts:
   - Class: ChatbotService
   - handleUserMessage(message: string, context: UserContext): Promise<ChatResponse>
   - onboardNewUser(userId: string): Promise<OnboardingFlow>
   - escalateToHuman(conversationId: string, reason: string): void
   - Use JarvisApiClient for AI responses

2. src/jarvis/modules/engagement/sentiment-analyzer.ts:
   - Class: SentimentAnalyzer
   - analyzeSentiment(text: string): SentimentScore
   - trackUserSentiment(userId: string, interactions: Interaction[]): SentimentTrend
   - detectFrustration(messages: Message[]): boolean
   - Use 'sentiment' npm package

3. src/jarvis/modules/engagement/proactive-engager.ts:
   - Class: ProactiveEngager
   - identifyAtRiskUsers(): Promise<User[]>
   - sendReEngagementMessage(userId: string, template: string): Promise<void>
   - scheduleFollowUp(userId: string, delayHours: number): void

4. src/jarvis/modules/workflow/automation-pipeline.ts:
   - Class: AutomationPipeline
   - runTests(): Promise<TestResults>
   - triggerDeployment(environment: 'staging' | 'production'): Promise<DeploymentStatus>
   - autoRemediate(issue: SystemIssue): Promise<RemediationResult>
   - rollback(deploymentId: string): Promise<void>

5. src/jarvis/modules/workflow/scaling-orchestrator.ts:
   - Class: ScalingOrchestrator
   - analyzeResourceUsage(): ResourceMetrics
   - recommendScaling(): ScalingRecommendation
   - autoScale(trigger: ScalingTrigger): Promise<ScalingResult>
   - predictResourceNeeds(timeframe: number): ResourcePrediction

6. src/jarvis/modules/intelligence/bi-engine.ts:
   - Class: BIEngine
   - aggregateData(sources: DataSource[]): Promise<AggregatedData>
   - generateInsights(data: AggregatedData): Insight[]
   - predictTrends(historicalData: TimeSeriesData): TrendPrediction[]
   - detectAnomalies(metrics: Metric[]): Anomaly[]

7. src/jarvis/modules/intelligence/dashboard-reporter.ts:
   - Class: DashboardReporter
   - generateDailyReport(date: Date): Promise<DailyReport>
   - exportVisualization(chartConfig: ChartConfig): Buffer
   - sendReportEmail(recipients: string[], report: Report): Promise<void>

8. src/jarvis/modules/intelligence/planning-agent.ts:
   - Class: PlanningAgent
   - analyzePastPerformance(period: DateRange): PerformanceAnalysis
   - generateActionPlan(goal: BusinessGoal): ActionPlan
   - optimizeResourceAllocation(budget: Budget): AllocationPlan
   - simulateScenario(scenario: Scenario): SimulationResult

Use TypeScript classes with dependency injection. Add JSDoc.
```

---

### Instance 5: Jobs + Tests + Docs (START LAST, AFTER MODULES ARE 50% DONE)
**Open Claude Code Terminal 5:**
```bash
cd /Users/benkennon/Jarvis
git checkout -b instance-5-jobs-tests
mkdir -p src/jarvis/jobs tests/{unit,integration,e2e} docs
```

**Paste this prompt to Claude:**
```
I'm building Instance 5 of Jarvis (Jobs, Testing & Documentation).

All modules are being built by Instances 3 & 4. Import them for testing.

Please create:

1. src/jarvis/jobs/daily-metrics.job.ts:
   - Function: runDailyMetricsJob()
   - Cron schedule: '0 6 * * *'
   - Tasks: Collect system metrics, health checks, performance baselines
   - Call jarvis.monitor.ts methods

2. src/jarvis/jobs/feedback-sync.job.ts:
   - Function: runFeedbackSyncJob()
   - Cron schedule: '0 8 * * *'
   - Sync marketing feedback with user engagement data
   - Update ML models

3. src/jarvis/jobs/health-tracking.job.ts:
   - Function: runHealthTrackingJob()
   - Cron schedule: '0 10 * * *'
   - Check all services, APIs, dependencies
   - Send alerts if issues found

4. jest.config.js:
   - TypeScript support via ts-jest
   - Coverage threshold: 80%
   - Test environment: node

5. tests/unit/core/jarvis.controller.spec.ts:
   - Test JarvisController initialization, start, stop
   - Mock dependencies

6. tests/unit/api/jarvis-api.client.spec.ts:
   - Test API client methods with mocked axios
   - Test retry logic on failures

7. tests/unit/modules/music/generator.service.spec.ts:
   - Test music generation queue
   - Mock API responses

8. tests/unit/modules/marketing/metrics-tracker.spec.ts:
   - Test revenue tracking, conversion rate calculations
   - Use test fixtures

9. tests/integration/api-integration.spec.ts:
   - Real API call tests (use staging API if available)
   - Test full request/response cycle

10. tests/e2e/app.spec.ts (Playwright):
    - Launch app
    - Test dashboard loads
    - Click "Run Job" button
    - Verify job starts
    - Check metrics update

11. docs/ARCHITECTURE.md:
    - Explain system architecture
    - Module breakdown
    - Data flow diagrams (in markdown)

12. docs/API_REFERENCE.md:
    - Document all public APIs
    - Request/response examples

13. docs/DEVELOPMENT.md:
    - Setup instructions
    - How to add new modules
    - Testing guidelines

14. README.md:
    - Project overview
    - Installation steps
    - Usage examples
    - Screenshots (placeholders)

Use Jest for unit tests, Playwright for E2E. Aim for 80%+ coverage.
```

---

## 📋 Coordination Checklist

### Before Starting
- [ ] Read BUILD_GUIDE.md
- [ ] Ensure Node.js v18+ installed
- [ ] Create GitHub repo (optional but recommended)
- [ ] Open 5 separate Claude Code terminals

### During Development
- [ ] Instance 1 completes types first (export from jarvis.interfaces.ts)
- [ ] Instances 2, 3, 4 import types from Instance 1
- [ ] Each instance commits to their own branch
- [ ] Use shared INTEGRATION.md to track progress

### Integration Phase
- [ ] Merge all branches to main
- [ ] Run `npm install`
- [ ] Run `npm run lint`
- [ ] Run `npm test`
- [ ] Fix any conflicts or type errors
- [ ] Run `npm run dev` - app should launch

### Testing Phase
- [ ] Manual testing of all features
- [ ] E2E tests pass
- [ ] Performance check
- [ ] Build for production: `npm run build`

---

## 🎯 Success Criteria

✅ App launches without errors
✅ Dashboard displays real-time metrics
✅ Jobs can be triggered manually
✅ Scheduled jobs run on time
✅ API integration works (calls Jarvis API successfully)
✅ All tests pass
✅ Can build for macOS distribution

---

## 🆘 Troubleshooting

### Instance can't import from another instance
**Solution:** Instance 1 must finish exporting types first. Copy `src/jarvis/core/jarvis.interfaces.ts` to a shared location temporarily.

### Webpack build errors in Instance 2
**Solution:** Ensure webpack config has correct paths. Check if typescript loader is installed.

### API calls failing
**Solution:** Verify API endpoint is accessible. Check if API key is correct. Test with curl first.

### Cron jobs not running
**Solution:** Check cron syntax. Ensure jarvis.scheduler.ts is calling `startAll()` on app initialization.

---

## 📞 Next Steps After Build

1. **Package the app:**
   ```bash
   npm run build
   ```

2. **Create installer (macOS):**
   ```bash
   npx electron-builder --mac
   ```

3. **Test distribution:**
   - Install .dmg file
   - Verify app runs standalone
   - Check auto-updater works

4. **Deploy:**
   - Upload to GitHub releases
   - Create download page
   - Set up analytics

---

**Ready to start?** Open 5 terminals and paste the prompts above! 🚀
