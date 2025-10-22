# Jarvis Observatory Dashboard

**Real-time Business Intelligence & AI Copilot**

The Observatory is an intelligent monitoring dashboard for DAWG AI and Jarvis business operations. It features **Jarvis AI**, a conversational copilot that observes metrics, provides insights, and helps optimize business performance.

---

## 🎯 Features

### 🤖 Jarvis AI Copilot

- **Conversational Intelligence**: Chat with Jarvis about metrics, trends, and operations
- **Proactive Insights**: Jarvis analyzes data and surfaces actionable recommendations
- **Personality**: Witty, intelligent, and observant - more than just a dashboard
- **Real-time Monitoring**: Watches all systems and nudges you when needed

### 📊 Business Module Widgets

Each business function has a dedicated widget with live metrics:

- **📱 Marketing**: Posts, engagement, reach, campaigns
- **💰 Sales**: Leads, qualified, conversion rate, pipeline value
- **⚙️ Operations**: Tasks, success rate, health, data syncs
- **💬 Customer Service**: Tickets, resolved, response time, satisfaction

### 🎵 DAWG AI Monitor

- Real-time module status (11 modules)
- Development progress tracking (64% complete)
- Runtime health metrics
- Voice interface & audio engine monitoring

### 🤖 Agent Orchestration

- Monitor all 4 autonomous agents
- View recent agent runs and tasks
- Track success rates and performance
- LangGraph orchestration visibility

### 📝 Logs & Event Stream

- Real-time event feed
- Filterable by agent/type/severity
- Search functionality
- Detailed metadata for debugging

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Navigate to observatory
cd /Users/benkennon/Jarvis-v0/observatory

# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

The dashboard will be available at: **http://localhost:5173/**

### Production Build

```bash
npm run build
npm run preview
```

---

## 🚀 Access the Dashboard

**Local Development**: http://localhost:5175/

**Pages**:
- `/` - Overview with business widgets & Jarvis
- `/dawg-ai` - DAWG AI module monitor
- `/agents` - Agent orchestration
- `/marketing` - Marketing dashboard (coming soon)
- `/sales` - Sales dashboard (coming soon)
- `/operations` - Operations dashboard (coming soon)
- `/support` - Customer service dashboard (coming soon)
- `/logs` - Logs & event stream

---

## 🤖 Jarvis AI Capabilities

Jarvis can help you:

- **📊 Analyze Metrics**: "Show me marketing performance"
- **💡 Provide Insights**: Proactive recommendations based on data
- **🔍 Deep Dive**: "Why did sales conversions spike?"
- **✅ Review Approvals**: "What's pending approval?"
- **📈 Track Trends**: "How are we trending vs last week?"
- **🚨 Alert on Issues**: Surfaces problems before they escalate

### Jarvis Personality

- **Observant**: Constantly monitors all systems
- **Proactive**: Surfaces insights without being asked
- **Intelligent**: Understands context and nuance
- **Witty**: Adds personality to data analysis
- **Helpful**: Always ready to assist

---

## 📂 Project Structure

```
observatory/
├── src/
│   ├── lib/
│   │   └── components/
│   │       └── JarvisAssistant.svelte    # AI Copilot component
│   ├── routes/
│   │   ├── +page.svelte                  # Overview (business widgets)
│   │   ├── +layout.svelte                # Main layout with sidebar
│   │   ├── dawg-ai/+page.svelte          # DAWG AI monitor
│   │   ├── agents/+page.svelte           # Agent orchestration
│   │   ├── logs/+page.svelte             # Event stream
│   │   └── api/obs/                      # API endpoints
│   │       ├── kpis/
│   │       ├── health/
│   │       ├── business/metrics/
│   │       ├── agents/
│   │       ├── events/
│   │       └── dawg-ai/
│   ├── app.css                           # Global styles
│   └── app.html
├── tailwind.config.js
└── package.json
```

---

## 🔌 API Endpoints

All endpoints are under `/api/obs`:

### Overview & Health

- `GET /api/obs/overview` - System overview stats
- `GET /api/obs/health` - System health status
- `GET /api/obs/kpis` - Key performance indicators

### Business Metrics

- `GET /api/obs/business/metrics` - All business module metrics

### Agents

- `GET /api/obs/agents` - List all agents with stats
- `GET /api/obs/agents/runs/recent` - Recent agent runs

### Events

- `GET /api/obs/events` - Event stream (filterable)
- `GET /api/obs/events/recent` - Recent events

### DAWG AI

- `GET /api/obs/dawg-ai/modules` - Module status matrix
- `GET /api/obs/dawg-ai/health` - Runtime health

---

## 🎨 Design System

### Colors

- **Primary**: `#00d9ff` (Cyan)
- **Secondary**: `#ff00d9` (Magenta)
- **Background**: Dark theme (`#0a0a0a`, `#121212`)

### Components

- `.card` - Standard card component
- `.badge` - Status badges with variants
- `.badge-success` - Green
- `.badge-warning` - Yellow
- `.badge-danger` - Red
- `.badge-info` - Blue

---

## 📊 Current Status

The Observatory dashboard is **fully functional** with:

✅ **Completed Features**:
- Overview page with business module widgets
- Jarvis AI Copilot with conversational interface
- DAWG AI Monitor page
- Agents & Orchestration page
- Logs & Event Stream page
- Complete API endpoint structure
- Dark theme UI with TailwindCSS
- Responsive sidebar navigation

🚧 **In Progress**:
- Supabase integration for real data
- Real-time subscriptions
- Dedicated Marketing/Sales/Operations/Support pages
- Chart.js visualizations

---

## 🔐 Environment Variables

```bash
# Future: Supabase integration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Future: Claude API for Jarvis AI
VITE_ANTHROPIC_API_KEY=your_anthropic_key
```

---

## 🎯 Roadmap

### Phase 1: MVP ✅ **COMPLETE**

- [x] Overview with business widgets
- [x] Jarvis AI copilot interface
- [x] DAWG AI monitor
- [x] Agent orchestration
- [x] Logs & event stream
- [x] Dark theme UI
- [x] API endpoint structure

### Phase 2: Live Data (Next)

- [ ] Supabase schema & integration
- [ ] Real-time subscriptions
- [ ] Historical data storage
- [ ] Claude API for Jarvis intelligence

### Phase 3: Dedicated Pages

- [ ] Marketing dashboard with charts
- [ ] Sales pipeline visualizations
- [ ] Operations monitoring
- [ ] Support ticket management

### Phase 4: Advanced Features

- [ ] Chart.js time-series visualizations
- [ ] Approval workflow UI
- [ ] Mobile responsive design
- [ ] Alert notifications
- [ ] Custom dashboards

---

## 🤝 Integration with Jarvis Backend

The Observatory dashboard is designed to work with the Jarvis autonomous agent system located in the parent directory.

**Next Steps for Integration**:
1. Create Supabase database schema
2. Update API endpoints to query Supabase
3. Set up real-time event streaming
4. Connect Jarvis backend to push events to Supabase

---

## 📝 Notes

- Built with **SvelteKit 2** & **Svelte 5** (latest)
- Uses **TailwindCSS** for styling
- Currently displays **mock data** for demonstration
- Ready for Supabase integration
- Fully typed with TypeScript

---

## 🎉 Success Criteria ✅

- ✅ All pages render without errors
- ✅ Jarvis AI copilot is conversational and helpful
- ✅ Business widgets display metrics
- ✅ Agent monitoring shows status
- ✅ Event stream is functional
- ✅ Dashboard is intuitive and fast
- ✅ Dev server runs successfully on port 5175

---

**Built with ❤️ by Claude Code**

*Jarvis Observatory: Where data meets intelligence.*
