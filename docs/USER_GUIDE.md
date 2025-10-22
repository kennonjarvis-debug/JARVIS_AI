# JARVIS User Guide

**Version:** 0.1.0
**Last Updated:** October 15, 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Observatory Dashboard](#observatory-dashboard)
4. [Approval Queue](#approval-queue)
5. [Agent Activities](#agent-activities)
6. [Voice Commands (with DAWG AI)](#voice-commands)
7. [Troubleshooting](#troubleshooting)

---

## Introduction

JARVIS is an autonomous AI agent system that manages business operations for DAWG AI. It operates 24/7, handling marketing, sales, operations, and customer support tasks with minimal human intervention.

### Key Features

- **Autonomous Operation**: Agents work independently with intelligent task routing
- **Risk-Based Approval**: THREE-tier system (LOW/MEDIUM/HIGH) ensures safety
- **Real-time Monitoring**: Observatory dashboard shows all agent activity
- **Integration Ready**: Works seamlessly with DAWG AI music generation

---

## Getting Started

### Accessing JARVIS

1. **Observatory Dashboard**: [http://localhost:5174](http://localhost:5174)
2. **API Documentation**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
3. **Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### First Time Setup

1. Ensure all services are running:
   ```bash
   # Terminal 1: Start JARVIS API
   cd ~/Jarvis-v0
   npm run api

   # Terminal 2: Start JARVIS Orchestrator
   npm run orchestrator

   # Terminal 3: Start Observatory Dashboard
   cd observatory
   npm run dev
   ```

2. Open Observatory Dashboard: [http://localhost:5174](http://localhost:5174)
3. Verify agents are active in the dashboard

---

## Observatory Dashboard

The Observatory is your real-time command center for monitoring all JARVIS activities.

### Dashboard Sections

#### 1. Recent Activities

Shows the latest 50 agent activities with:
- **Agent Type**: Which agent performed the action (Marketing, Sales, Operations, Support)
- **Action**: What was done (e.g., "social_post_created", "lead_qualified")
- **Risk Level**: LOW, MEDIUM, or HIGH
- **Status**: Current state (pending, completed, failed, etc.)
- **Timestamp**: When the activity occurred

**Color Coding:**
- 🟢 **Green (LOW)**: Automatically executed, safe operations
- 🟡 **Yellow (MEDIUM)**: Executed with notification, moderate impact
- 🔴 **Red (HIGH)**: Requires approval, significant impact

#### 2. Agent Metrics

Overview of system performance:
- **Total Activities**: Cumulative actions across all agents
- **Success Rate**: Percentage of successfully completed tasks
- **Risk Breakdown**: Distribution across LOW/MEDIUM/HIGH
- **Per-Agent Stats**: Individual performance metrics

#### 3. Approval Queue

Tasks awaiting your approval:
- **Pending Items**: Count of tasks requiring human review
- **Action Buttons**: Approve or Reject each task
- **Context**: Full details of what the task will do

---

## Approval Queue

### When Tasks Require Approval

Tasks are routed to the approval queue based on:

1. **Financial Impact** (>$100)
2. **Bulk Operations** (>1000 email recipients)
3. **Data Deletion** or irreversible actions
4. **Public Statements** during sensitive times
5. **Security Changes**

### How to Review Tasks

1. Navigate to **Approval Queue** in Observatory
2. Read the task description and estimated impact
3. Review the agent's reasoning
4. Click **Approve** or **Reject**:
   - **Approve**: Task executes immediately
   - **Reject**: Task is canceled, agent is notified

### Example Approval Workflow

```
Task: Send email campaign to 1,500 subscribers
Risk Level: HIGH (exceeds 1,000 recipient threshold)
Estimated Cost: $45
Reasoning: "Announcing new Pro tier to existing user base"

Actions:
[Approve] [Reject]
```

**Best Practices:**
- Review financial impact carefully
- Check recipient counts for bulk operations
- Verify messaging aligns with brand voice
- Reject if unsure, ask agent to revise

---

## Agent Activities

### Marketing Agent

**Automated Actions (LOW Risk):**
- Scheduling pre-approved social media posts
- Analyzing engagement metrics
- Generating blog post ideas
- Creating email templates

**Requires Approval (HIGH Risk):**
- Publishing new blog posts
- Launching email campaigns (>300 recipients)
- Major promotional announcements
- Pricing changes

### Sales Agent

**Automated Actions (LOW Risk):**
- Lead scoring and qualification
- CRM data synchronization
- Personalized outreach sequences
- Meeting reminders

**Requires Approval (HIGH Risk):**
- Custom enterprise deals
- Discount codes >10%
- Large contract negotiations

### Operations Agent

**Automated Actions (LOW Risk):**
- System health monitoring
- Data backups
- Analytics aggregation
- Performance reporting

**Requires Approval (HIGH Risk):**
- Security policy changes
- Infrastructure modifications
- Data retention changes

### Support Agent

**Automated Actions (LOW Risk):**
- Ticket routing and categorization
- Knowledge base article suggestions
- Automated responses to common questions
- Satisfaction surveys

**Requires Approval (HIGH Risk):**
- Refunds >$50
- Account deletions
- Privacy-related requests

---

## Voice Commands (with DAWG AI)

When integrated with DAWG AI, JARVIS enables voice-controlled music production.

### How Voice Commands Work

1. **Speak**: Say your command (e.g., "Create a trap beat at 140 BPM")
2. **Parse**: JARVIS understands your intent using Claude
3. **Generate**: DAWG AI backend generates MIDI
4. **Load**: Music appears in DAW piano roll
5. **Edit**: Refine in the DAWG AI interface

### Example Voice Commands

```
"Generate drums in trap style at 140 BPM"
→ Creates 4-bar drum pattern

"Add a bassline in C minor"
→ Generates funk bassline in C minor

"Create an uplifting melody in C major"
→ Generates 8-bar melodic sequence

"Give me mixing suggestions"
→ Analyzes current project, suggests EQ/compression
```

### Voice Command Tips

- **Be specific**: Include tempo, key, style
- **One command at a time**: Wait for generation to complete
- **Check Observatory**: Voice commands are logged as activities
- **Review quality**: JARVIS learns from your feedback

---

## Troubleshooting

### Services Not Starting

**Problem**: "JARVIS API not running"

**Solution**:
```bash
# Check if port 3000 is in use
lsof -ti:3000 | xargs kill -9

# Restart API
cd ~/Jarvis-v0
npm run api
```

**Problem**: "DAWG AI backend not responding"

**Solution**:
```bash
# Check if port 9000 is in use
lsof -ti:9000 | xargs kill -9

# Restart DAWG AI
cd ~/Development/DAWG_AI
python main.py
```

### Observatory Not Loading

**Problem**: Dashboard shows "Failed to fetch"

**Solution**:
1. Verify JARVIS API is running: http://localhost:3000/api/health
2. Check browser console for CORS errors
3. Restart Observatory:
   ```bash
   cd ~/Jarvis-v0/observatory
   npm run dev
   ```

### Approval Queue Not Updating

**Problem**: Approved tasks still showing in queue

**Solution**:
1. Refresh the page (Observatory polls every 5 seconds)
2. Check browser console for errors
3. Verify API response: http://localhost:3000/api/agents/approval-queue

### Agent Activities Not Appearing

**Problem**: No recent activities in dashboard

**Solution**:
1. Verify Orchestrator is running:
   ```bash
   cd ~/Jarvis-v0
   npm run orchestrator
   ```
2. Check logs for errors
3. Activities may be LOW risk and already completed

---

## Getting Help

### Resources

- **API Documentation**: http://localhost:3000/api-docs
- **GitHub Issues**: https://github.com/your-org/jarvis-v0/issues
- **Developer Guide**: See `docs/DEVELOPER_GUIDE.md`

### Reporting Issues

When reporting issues, include:
1. What you were trying to do
2. What happened instead
3. Browser console errors (if applicable)
4. API server logs
5. Steps to reproduce

---

**Need more help?** Contact the DAWG AI team or check the documentation at https://docs.dawgai.example.com
