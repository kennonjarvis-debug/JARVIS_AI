# MULTI-INSTANCE COORDINATION PLAN
## Parallel Dashboard Live Data Implementation

**Problem:** Dashboard frontend not displaying live data despite backend APIs working
**Root Cause:** Frontend components not properly connected to live data endpoints
**Solution:** Divide work across multiple Claude instances working in parallel

---

## Instance Allocation & Responsibilities

### **INSTANCE 1: AI DAWG Backend Repair** 🔧
**Priority:** CRITICAL - Must complete first
**Location:** `/Users/benkennon/ai-dawg-v0.1`

**Tasks:**
1. Fix Prisma database connection error
   - Issue: `User 'user' was denied access on database 'jarvis.public'`
   - Check: `.env` file for `DATABASE_URL`
   - Fix: Update connection string or create proper PostgreSQL user
   - Test: `npm run dev:server` should start on port 3001

2. Verify AI DAWG endpoints return live data
   - `/health` - Should return uptime
   - `/api/v1/modules` - Should list 5 modules
   - `/api/v1/modules/music` - Should return real status + uptime

3. Add instrumentation for real metrics
   - Track music generations in real-time
   - Track user engagement metrics
   - Store in Redis/memory for dashboard access

**Deliverables:**
- ✅ AI DAWG running on port 3001
- ✅ All module endpoints returning live data
- ✅ Database connection working
- ✅ Test script: `curl http://localhost:3001/api/v1/modules`

**Estimated Time:** 1-2 hours

---

### **INSTANCE 2: Frontend Component Overhaul** 🎨
**Priority:** HIGH
**Location:** `/Users/benkennon/Jarvis/dashboard/frontend`

**Tasks:**
1. **Business Performance Component** (`app/components/BusinessPerformance.tsx` or similar)
   - Connect to `/api/dashboard/business` endpoint
   - Remove all hardcoded values
   - Add real-time polling (every 30s)
   - Display live module health, uptime, metrics

2. **Instance Activity Component**
   - Connect to `/api/dashboard/instances` endpoint
   - Display real active instance count (3)
   - Show real task metrics (16 completed, 3 in progress)
   - Update efficiency ratio (1.54x)

3. **Financial Summary Component**
   - Connect to `/api/dashboard/financial` endpoint
   - Display real MRR/ARR (currently $0 - correct)
   - Show burn rate ($8,500/mo)
   - Display runway (26 months)

4. **Development Progress Component**
   - Connect to `/api/dashboard/waves` endpoint
   - Display wave completion percentages
   - Show remaining time estimates

**Key Changes Needed:**
```typescript
// BEFORE (Hardcoded)
const metrics = {
  music: { generations: 47, health: 'healthy' }
}

// AFTER (Live Data)
const [metrics, setMetrics] = useState(null);
useEffect(() => {
  const fetchMetrics = async () => {
    const res = await fetch('/api/dashboard/business');
    const data = await res.json();
    setMetrics(data.data);
  };
  fetchMetrics();
  const interval = setInterval(fetchMetrics, 30000);
  return () => clearInterval(interval);
}, []);
```

**Deliverables:**
- ✅ All components fetch from live APIs
- ✅ No hardcoded values remain
- ✅ Real-time updates every 30s
- ✅ Error handling for failed fetches
- ✅ Loading states during data fetch

**Estimated Time:** 2-3 hours

---

### **INSTANCE 3: Backend API Optimization** ⚡
**Priority:** MEDIUM
**Location:** `/Users/benkennon/Jarvis/dashboard/backend`

**Tasks:**
1. **Improve Cache Strategy** (`dashboard-api.ts`)
   - Current: 5s TTL for all endpoints
   - Optimize: Different TTLs per endpoint type
     - Instance metrics: 5s (fast-changing)
     - Business metrics: 10s (moderate)
     - Financial: 30s (slow-changing)

2. **Add WebSocket Support** (Real-time push instead of polling)
   - Implement Socket.IO server
   - Push updates when data changes
   - Frontend subscribes to live updates

3. **Error Recovery**
   - Graceful fallback when AI DAWG unavailable
   - Return last known good data + timestamp
   - Add retry logic with exponential backoff

4. **Add Logging & Monitoring**
   - Log all API calls with timing
   - Track cache hit/miss rates
   - Monitor AI DAWG connection health

**Deliverables:**
- ✅ Optimized caching per endpoint
- ✅ WebSocket support for real-time push
- ✅ Robust error handling
- ✅ Comprehensive logging

**Estimated Time:** 2-3 hours

---

### **INSTANCE 4: E2E Integration Testing** 🧪
**Priority:** HIGH (Run after Instance 1 & 2 complete)
**Location:** `/Users/benkennon/Jarvis/tests`

**Tasks:**
1. **Frontend E2E Tests** (Playwright)
   - Navigate to `http://localhost:3003`
   - Verify UI displays correct values
   - Test: Instance count shows 3
   - Test: Business metrics display module health
   - Test: Financial summary shows $0 MRR/ARR
   - Test: Data updates after 30 seconds

2. **Visual Regression Tests**
   - Capture baseline screenshots
   - Compare before/after screenshots
   - Ensure no UI breakage

3. **Load Testing**
   - Simulate 10 concurrent dashboard users
   - Verify backend handles load
   - Check cache effectiveness
   - Monitor API response times

4. **Data Flow Validation**
   - Change data at source (instance-tracker.json)
   - Verify dashboard reflects change within 30s
   - Trace data: Source → Backend → Frontend

**Deliverables:**
- ✅ Playwright E2E test suite
- ✅ Visual regression tests
- ✅ Load testing results
- ✅ Data flow validation report

**Estimated Time:** 1-2 hours

---

## Coordination Protocol

### Phase 1: Foundation (Sequential)
**Instance 1 MUST complete first** - No other work can proceed without working AI DAWG backend

```
Instance 1: Fix AI DAWG Backend
    ↓
✅ Checkpoint: Verify AI DAWG running on port 3001
    ↓
Proceed to Phase 2
```

### Phase 2: Parallel Development
Once AI DAWG is running, work in parallel:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  INSTANCE 2     │     │  INSTANCE 3     │     │  INSTANCE 4     │
│  Frontend       │     │  Backend        │     │  Testing        │
│  Components     │     │  Optimization   │     │  (Prep Only)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                ↓
                    ✅ Checkpoint: Integration
```

### Phase 3: Integration & Testing (Sequential)
After Instance 2 & 3 complete:

```
Instance 4: Run E2E Tests
    ↓
✅ Checkpoint: All tests pass
    ↓
Final Verification
```

---

## Communication Between Instances

### Shared State Files

**1. Status Tracker** (`/Users/benkennon/Jarvis/.coordination/status.json`)
```json
{
  "instance-1": {
    "task": "AI DAWG Backend Repair",
    "status": "in_progress",
    "checkpoint": "fixing_database_connection",
    "blocker": null,
    "completed_at": null
  },
  "instance-2": {
    "task": "Frontend Component Overhaul",
    "status": "waiting",
    "depends_on": "instance-1",
    "checkpoint": null,
    "blocker": "waiting_for_ai_dawg",
    "completed_at": null
  }
}
```

**2. Integration Points** (`/Users/benkennon/Jarvis/.coordination/integration.json`)
```json
{
  "ai_dawg_port": 3001,
  "dashboard_backend_port": 5001,
  "dashboard_frontend_port": 3003,
  "api_endpoints": {
    "business": "/api/dashboard/business",
    "instances": "/api/dashboard/instances",
    "financial": "/api/dashboard/financial"
  },
  "data_freshness": {
    "max_staleness": "5s",
    "polling_interval": "30s"
  }
}
```

**3. Blockers Log** (`/Users/benkennon/Jarvis/.coordination/blockers.md`)
```markdown
## Active Blockers

### Instance 1
- [ ] Database permission error - investigating `.env` file
- [ ] Prisma client needs regeneration

### Instance 2
- [BLOCKED] Waiting for Instance 1 to complete
- Frontend components ready but need live endpoints

### Instance 3
- [INDEPENDENT] Can proceed - optimizing existing backend
```

---

## Checkpoint Validation

### Checkpoint 1: AI DAWG Running ✅
**Validator:** Instance 4 (Testing)
```bash
# Must pass:
curl http://localhost:3001/health | jq '.status' | grep "healthy"
curl http://localhost:3001/api/v1/modules | jq '.data.modules | length' | grep "5"
```

### Checkpoint 2: Frontend Connected ✅
**Validator:** Instance 4 (Testing)
```bash
# Navigate to dashboard
open http://localhost:3003

# Check network tab - should see:
# GET /api/dashboard/business -> 200 OK
# GET /api/dashboard/instances -> 200 OK
# GET /api/dashboard/financial -> 200 OK

# Verify values in UI match API responses
```

### Checkpoint 3: Live Data Flowing ✅
**Validator:** Instance 4 (Testing)
```bash
# Modify source data
echo '{"metrics":{"tasks_completed":20}}' > .monitoring/instance-tracker.json

# Wait 5 seconds
sleep 5

# Check dashboard shows "20 tasks completed"
# Take screenshot for proof
```

---

## Success Criteria

### Instance 1: AI DAWG Backend
- [ ] Server starts without errors
- [ ] Port 3001 listening
- [ ] All module endpoints return 200 OK
- [ ] Uptime increments every second
- [ ] Database queries successful

### Instance 2: Frontend Components
- [ ] All hardcoded values removed
- [ ] Components fetch from `/api/dashboard/*` endpoints
- [ ] UI updates every 30 seconds
- [ ] Loading states display during fetch
- [ ] Error states handle failed fetches
- [ ] Values match backend API responses exactly

### Instance 3: Backend Optimization
- [ ] Caching optimized per endpoint
- [ ] WebSocket support added (optional)
- [ ] Error recovery implemented
- [ ] Logging added for debugging

### Instance 4: E2E Testing
- [ ] All Playwright tests pass
- [ ] Visual regression tests pass
- [ ] Load tests show acceptable performance
- [ ] Data flow traced from source to UI

---

## Final Verification

**Run this command to verify everything works:**
```bash
./tests/e2e/comprehensive-live-data-test.sh && \
npx playwright test tests/e2e/frontend-live-data.spec.ts && \
echo "✅ DASHBOARD DISPLAYS LIVE DATA - VERIFIED"
```

**Manual Verification:**
1. Open `http://localhost:3003` in browser
2. Open browser DevTools → Network tab
3. Verify API calls to `/api/dashboard/*` every 30s
4. Check values displayed match API responses
5. Wait 30s and verify values update
6. Modify `.monitoring/instance-tracker.json`
7. Verify dashboard reflects changes within 5s

---

## Rollout Plan

1. **Create Coordination Directory**
   ```bash
   mkdir -p /Users/benkennon/Jarvis/.coordination
   touch /Users/benkennon/Jarvis/.coordination/{status.json,integration.json,blockers.md}
   ```

2. **Assign Instances**
   - Instance 1 (You): AI DAWG Backend Repair
   - Instance 2 (New): Frontend Component Overhaul
   - Instance 3 (New): Backend Optimization
   - Instance 4 (New): E2E Integration Testing

3. **Start Phase 1**
   - Instance 1 begins AI DAWG repair
   - Other instances wait at checkpoint

4. **Parallel Phase 2**
   - Instance 1 completes → triggers Phase 2
   - Instances 2 & 3 work in parallel
   - Instance 4 prepares test scripts

5. **Sequential Phase 3**
   - Instance 2 & 3 complete → triggers Phase 3
   - Instance 4 runs full E2E suite
   - All instances review results

6. **Final Sign-Off**
   - All instances confirm success criteria met
   - Dashboard verified displaying live data
   - User approves and closes task

---

## Risk Mitigation

| Risk | Mitigation | Owner |
|------|------------|-------|
| **AI DAWG database unfixable** | Use mock server as fallback, document limitation | Instance 1 |
| **Frontend changes break UI** | Visual regression tests catch breakage | Instance 4 |
| **Backend optimization introduces bugs** | Comprehensive API tests validate responses | Instance 3 |
| **Instances work on conflicting files** | Clear file ownership, use git branches | All |
| **Timeline exceeds estimate** | Prioritize critical path (Instance 1 & 2) | Coordinator |

---

## File Ownership Matrix

| File/Directory | Owner | Purpose |
|----------------|-------|---------|
| `/Users/benkennon/ai-dawg-v0.1/**` | Instance 1 | AI DAWG backend repair |
| `/Users/benkennon/Jarvis/dashboard/frontend/**` | Instance 2 | Frontend components |
| `/Users/benkennon/Jarvis/dashboard/backend/**` | Instance 3 | Backend API optimization |
| `/Users/benkennon/Jarvis/tests/**` | Instance 4 | E2E testing |
| `/Users/benkennon/Jarvis/.coordination/**` | All | Shared coordination state |

---

**CRITICAL:** Instance 1 MUST complete AI DAWG backend repair before other instances can proceed with integration work. Mock server is NOT acceptable for production dashboard.
