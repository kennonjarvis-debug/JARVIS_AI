# Jarvis System Cost Analysis - 2025

**Date:** 2025-10-08
**Version:** 1.0
**Status:** Draft Analysis

---

## Executive Summary

This document provides a comprehensive cost analysis for running the Jarvis + AI DAWG system across three deployment scenarios:
1. **Minimal Local** - Development/testing environment
2. **Enhanced Hybrid** - Production-ready with cloud backups
3. **Full Cloud** - Fully managed cloud infrastructure

---

## 1. System Architecture Overview

### Always-On Components

| Component | Purpose | Current Port | Resource Requirements |
|-----------|---------|--------------|----------------------|
| Jarvis Control Plane | API Gateway & Orchestration | 4000 | 2 vCPU, 4GB RAM |
| AI DAWG Backend | Module Execution Engine | 3001 | 2 vCPU, 4GB RAM |
| PostgreSQL | Persistent Data Store | 5432 | 1 vCPU, 1GB RAM |
| Redis | Caching & Queues | 6379 | 2 vCPU, 0.5GB RAM |
| Dashboard Backend | Monitoring API | 3002 | 1 vCPU, 2GB RAM |
| Web UI (Next.js) | User Interface | - | Vercel Hosting |

### Optional/On-Demand Components

| Component | Purpose | Port | Activation |
|-----------|---------|------|------------|
| Claude MCP Server | Claude Desktop Integration | stdio | ENABLE_MCP=true |
| Proactive Agent | Intelligent Suggestions | - | Optional feature |
| Vocal Coach | Music AI Service | 8000 | On-demand |
| Producer | Music Production | 8001 | On-demand |
| AI Brain | Advanced Processing | 8002 | On-demand |

---

## 2. AI API Pricing Research (2025)

### OpenAI Pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Notes |
|-------|----------------------|------------------------|-------|
| GPT-4o | $3.00 | $15.00 | Primary model, best value |
| GPT-4o Mini | $0.15 | $0.60 | Cost-effective for simple tasks |
| GPT-4 Turbo | $10.00 | $30.00 | Legacy model |
| GPT-4 Original | $10.00 | $30.00 | Legacy model |

### Anthropic Claude Pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Extended Thinking |
|-------|----------------------|------------------------|-------------------|
| Claude Sonnet 4.5 | $3.00 | $15.00 | - |
| Claude Sonnet 4.1 | $5.00 | $25.00 | $10/M |
| Claude Opus 4.1 | $15.00 | $75.00 | $40/M |
| Claude Opus 4 | $15.00 | $75.00 | - |

**Cost-Saving Features:**
- Prompt caching: Up to 90% savings
- Batch processing: 50% savings

### Google Gemini Pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Notes |
|-------|----------------------|------------------------|-------|
| Gemini 1.5 Flash | $0.15 | $0.60 | Best value, free tier available |
| Gemini 1.5 Pro | $1.25 | $5.00 | Mid-tier performance |
| Gemini 2.5 Pro | $4.00 | $20.00 | Latest model |
| Flash-Lite | $0.02 | $0.08 | Ultra-low cost |

**Free Tier:** 1,500 requests/day, 1M tokens/minute

---

## 3. Infrastructure Hosting Costs (2025)

### AWS Compute (EC2)

| Instance Type | vCPU | Memory | Monthly Cost | Use Case |
|---------------|------|--------|--------------|----------|
| t3.small | 2 | 2 GB | $15.18 | Small services |
| t3.medium | 2 | 4 GB | $30.37 | Control plane, backend |
| t3.large | 2 | 8 GB | $60.74 | High-load services |

**CPU Credits:** $0.05 per vCPU-hour for sustained high usage

### AWS Database (RDS PostgreSQL)

| Instance Type | vCPU | Memory | Monthly Cost | Storage |
|---------------|------|--------|--------------|---------|
| db.t3.micro | 2 | 1 GB | $13.14-$21.90 | 20GB included in free tier |
| db.t3.small | 2 | 2 GB | ~$27 | Scales with usage |

**Additional Costs:**
- Storage: ~$0.115/GB-month for GP2
- Backup storage: $0.095/GB-month
- I/O operations: Variable

### AWS Cache (ElastiCache Redis)

| Instance Type | vCPU | Memory | Monthly Cost | Use Case |
|---------------|------|--------|--------------|----------|
| cache.t3.micro | 2 | 0.5 GB | $12.41 | Development/testing |
| cache.t3.small | 2 | 1.5 GB | $24.82 | Production cache |

### Vercel Hosting (Web UI)

| Plan | Monthly Cost | Bandwidth | Build Minutes |
|------|--------------|-----------|---------------|
| Hobby | $0 | 100 GB | 6,000 min |
| Pro | $20/seat | 1 TB | Unlimited |

**Overage:** $0.15/GB for bandwidth

---

## 4. Token Usage Pattern Analysis

### Estimated Monthly Interaction Volume

**Assumptions:**
- Active development/testing phase: 50 interactions/day
- Production usage (light): 20-30 interactions/day
- Production usage (moderate): 100 interactions/day
- Proactive system (if enabled): 10-20 automated checks/day

### Token Usage Breakdown by Interaction Type

| Interaction Type | Input Tokens | Output Tokens | Frequency/Day |
|------------------|--------------|---------------|---------------|
| ChatGPT Command | 500 | 200 | 10-20 |
| Claude MCP Tool Call | 300 | 150 | 5-10 |
| Web UI Chat | 400 | 250 | 10-15 |
| Music Generation | 200 | 50 | 2-5 |
| Marketing Analysis | 1000 | 500 | 3-5 |
| Proactive Suggestion | 500 | 100 | 5-10 (if enabled) |
| System Health Check | 100 | 50 | 24 (hourly) |

### Monthly Token Estimates

**Light Usage (30 interactions/day):**
- Input tokens: ~450,000/month (15k/day)
- Output tokens: ~180,000/month (6k/day)

**Moderate Usage (100 interactions/day):**
- Input tokens: ~1,500,000/month (50k/day)
- Output tokens: ~600,000/month (20k/day)

**Heavy Usage (300 interactions/day + proactive):**
- Input tokens: ~5,000,000/month (165k/day)
- Output tokens: ~2,000,000/month (66k/day)

---

## 5. Cost Models by Scenario

### Scenario 1: Minimal Local Development

**Description:** Running on local MacBook for development and testing

**Infrastructure:**
- All services running locally on MacBook
- No cloud hosting costs
- Development database (local PostgreSQL)
- Development cache (local Redis)

**Costs:**

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| Infrastructure | $0 | Local development |
| Database | $0 | Local PostgreSQL |
| Cache | $0 | Local Redis |
| AI API (Light) | $2-5 | GPT-4o Mini or Gemini Flash free tier |
| Web UI | $0 | Local Next.js dev server |
| **TOTAL** | **$0-5/month** | Development only |

**Pros:**
- Zero infrastructure costs
- Full control and flexibility
- Good for development and testing

**Cons:**
- Limited availability (only when MacBook is on)
- Not suitable for production
- No redundancy or backups
- Higher electricity costs (negligible)

---

### Scenario 2: Enhanced Hybrid (Recommended)

**Description:** Local services with cloud backups and web hosting

**Infrastructure:**
- Core services on local hardware (always-on Mac Mini or spare hardware)
- Cloud-hosted web UI (Vercel)
- Cloud database backups
- Optional cloud failover

**Costs:**

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| **Infrastructure** | | |
| Local Hardware | $0 | Using existing Mac Mini |
| Electricity | ~$10 | 24/7 operation, ~50W average |
| Domain Name | $1-2 | .com domain |
| **Cloud Services** | | |
| Vercel Pro | $20 | Web UI hosting |
| AWS RDS (backup) | $0 | Free tier (first year) or $13-22 |
| AWS ElastiCache (optional) | $0-12 | Optional Redis backup |
| **AI API (Moderate)** | | |
| GPT-4o (primary) | $4.50-27 | 1.5M input, 600K output |
| Gemini Flash (backup) | $0.23-0.59 | Using free tier + overage |
| **Monitoring** | | |
| Uptime monitoring | $0-10 | UptimeRobot or similar |
| **TOTAL** | **$35-85/month** | Production-ready, cost-effective |

**Detailed AI API Calculation (Moderate Usage):**
```
Input: 1.5M tokens/month
Output: 600K tokens/month

GPT-4o: ($3/M * 1.5) + ($15/M * 0.6) = $4.50 + $9.00 = $13.50/month
Claude Sonnet 4.5: ($3/M * 1.5) + ($15/M * 0.6) = $4.50 + $9.00 = $13.50/month
Gemini 1.5 Pro: ($1.25/M * 1.5) + ($5/M * 0.6) = $1.88 + $3.00 = $4.88/month
Gemini 1.5 Flash: ($0.15/M * 1.5) + ($0.60/M * 0.6) = $0.23 + $0.36 = $0.59/month
```

**Recommended AI Model Mix:**
- 60% Gemini Flash (free tier): $0
- 30% GPT-4o: ~$4.05
- 10% Claude Sonnet (complex tasks): ~$1.35
- **Total AI API: ~$5.40/month for moderate usage**

**Pros:**
- Very cost-effective ($35-50/month realistic)
- Production-ready with cloud UI
- Can handle moderate traffic
- Easy to scale up if needed

**Cons:**
- Depends on local hardware reliability
- Need stable internet connection
- Manual backup management
- Limited to single geographic location

---

### Scenario 3: Full Cloud Deployment

**Description:** All services running on AWS cloud infrastructure

**Infrastructure:**
- Containerized services on AWS
- Managed database (RDS)
- Managed cache (ElastiCache)
- Load balancer for high availability
- Multi-region backups

**Costs:**

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| **Compute** | | |
| EC2 t3.medium (Control Plane) | $30.37 | Jarvis gateway |
| EC2 t3.medium (AI DAWG Backend) | $30.37 | Module execution |
| EC2 t3.small (Dashboard) | $15.18 | Monitoring |
| **Database & Cache** | | |
| RDS PostgreSQL db.t3.small | $27.00 | Production database |
| ElastiCache Redis cache.t3.small | $24.82 | Production cache |
| Database storage (50GB) | $5.75 | GP2 SSD |
| Backup storage (50GB) | $4.75 | Automated backups |
| **Networking** | | |
| Application Load Balancer | $16.20 | High availability |
| Data transfer (100GB/month) | $9.00 | Outbound traffic |
| Elastic IP | $3.65 | Static IP address |
| **Web Hosting** | | |
| Vercel Pro | $20.00 | Next.js frontend |
| **AI API (Moderate)** | | |
| Multi-model strategy | $5-15 | GPT-4o + Gemini + Claude |
| **Monitoring & Logs** | | |
| CloudWatch | $10-20 | Logs, metrics, alarms |
| **TOTAL** | **$200-225/month** | Fully managed, scalable |

**Heavy Usage Scenario (300 interactions/day):**

AI API costs would increase:
```
Input: 5M tokens/month
Output: 2M tokens/month

GPT-4o: ($3/M * 5) + ($15/M * 2) = $15 + $30 = $45/month
Claude Sonnet: ($3/M * 5) + ($15/M * 2) = $15 + $30 = $45/month
Gemini Pro: ($1.25/M * 5) + ($5/M * 2) = $6.25 + $10 = $16.25/month
```

**Total with heavy API usage: $260-320/month**

**Pros:**
- Fully managed and highly available
- Easy to scale horizontally
- Professional production environment
- Multi-region redundancy possible
- 24/7 reliability

**Cons:**
- Significantly higher costs
- More complex to manage
- Overkill for low-moderate usage
- Vendor lock-in considerations

---

## 6. Key Cost Drivers

### 1. AI API Token Usage (Highest Impact)
- **Impact:** Can range from $0-100+/month depending on usage
- **Optimization Strategies:**
  - Use Gemini Flash free tier (1,500 req/day) for simple queries
  - Implement response caching (90% savings with Claude)
  - Use GPT-4o Mini ($0.15/M input) for non-critical tasks
  - Batch API requests where possible (50% savings)
  - Implement rate limiting and request deduplication

### 2. Always-On Infrastructure
- **Impact:** $0 (local) to $150+/month (full cloud)
- **Optimization Strategies:**
  - Use auto-scaling to reduce idle instance costs
  - Schedule non-critical services (dev/test environments)
  - Use spot instances for non-critical workloads (70% savings)
  - Consider serverless for low-traffic endpoints

### 3. Database and Storage
- **Impact:** $0 (local) to $40/month (cloud with backups)
- **Optimization Strategies:**
  - Use RDS free tier (first 12 months)
  - Implement data lifecycle policies
  - Compress backups and use S3 Glacier for long-term storage
  - Clean up old logs and temporary data

### 4. Network Data Transfer
- **Impact:** $0 (local) to $20+/month (high traffic)
- **Optimization Strategies:**
  - Use CloudFront CDN for static assets
  - Implement compression (gzip/brotli)
  - Optimize API response sizes
  - Use same-region services to minimize inter-region transfer

---

## 7. Cost Optimization Opportunities

### Immediate (0-30 days)
1. **Implement AI Model Router**
   - Route simple queries to Gemini Flash (free tier)
   - Use GPT-4o for complex queries
   - Reserve Claude Opus for mission-critical tasks
   - **Estimated savings: 60-80% on AI API costs**

2. **Enable Response Caching**
   - Cache common queries in Redis
   - Use Claude's prompt caching (90% savings)
   - Implement TTL-based cache invalidation
   - **Estimated savings: 40-60% on repeated queries**

3. **Optimize Token Usage**
   - Reduce system prompts
   - Use function calling instead of text parsing
   - Implement streaming for better UX with same costs
   - **Estimated savings: 20-30% on token consumption**

### Medium-term (1-3 months)
1. **Implement Request Batching**
   - Batch non-urgent API requests
   - Use Claude/OpenAI batch APIs (50% discount)
   - Schedule background jobs during off-peak hours
   - **Estimated savings: 30-50% on batch-eligible requests**

2. **Add Usage Monitoring Dashboard**
   - Track token usage per user/feature
   - Set up cost alerts and budgets
   - Identify and optimize high-cost features
   - **Estimated savings: 15-25% through visibility**

3. **Optimize Database Queries**
   - Add indexes for common queries
   - Implement query result caching
   - Use read replicas for analytics
   - **Estimated savings: 10-20% on database costs**

### Long-term (3-6 months)
1. **Multi-Region Caching Strategy**
   - Deploy CDN for static content
   - Use regional API gateways
   - Implement edge caching
   - **Estimated savings: 20-40% on network costs**

2. **Serverless Architecture Migration**
   - Move low-traffic endpoints to Lambda
   - Use API Gateway for request routing
   - Pay only for actual usage
   - **Estimated savings: 30-50% on compute for low-traffic services**

3. **AI Model Fine-tuning**
   - Fine-tune smaller models for specific tasks
   - Reduce token counts through optimization
   - Use embeddings for similarity search
   - **Estimated savings: 40-70% on specific use cases**

---

## 8. Recommendations

### For Current Development Phase
**Recommended: Scenario 1 (Minimal Local)**
- Cost: $0-5/month
- Use Gemini Flash free tier for development
- Run all services locally
- No infrastructure costs

### For Production Launch (Low Traffic)
**Recommended: Scenario 2 (Enhanced Hybrid)**
- Cost: $35-50/month
- Local hardware for core services
- Vercel for web UI
- Smart AI model routing:
  - 70% Gemini Flash (free tier)
  - 20% GPT-4o Mini
  - 10% Claude Sonnet (complex tasks)
- Expected cost: ~$40/month all-in

### For Production at Scale (High Traffic)
**Recommended: Modified Scenario 3**
- Cost: $150-200/month (with optimizations)
- Use AWS with auto-scaling
- Implement all optimization strategies
- Multi-model AI routing with caching
- Expected cost with optimizations: ~$150/month

---

## 9. Cost Projections by Usage Level

### Monthly Cost Estimates

| Usage Level | Interactions/Day | Infrastructure | AI API | Total (Hybrid) | Total (Cloud) |
|-------------|------------------|----------------|--------|----------------|---------------|
| Development | 10-20 | $0 | $0-2 | $0-5 | N/A |
| Light | 20-30 | $31-35 | $3-8 | $35-45 | $205-215 |
| Moderate | 50-100 | $31-35 | $5-15 | $40-55 | $210-230 |
| Heavy | 200-300 | $31-35 | $20-50 | $55-90 | $240-280 |
| Enterprise | 500+ | Cloud required | $80-200 | N/A | $300-450 |

### Annual Cost Projections

| Scenario | Year 1 (w/ free tier) | Year 2+ (steady state) |
|----------|----------------------|------------------------|
| Minimal Local | $0-60 | $60-120 |
| Enhanced Hybrid | $420-600 | $480-720 |
| Full Cloud | $2,400-3,000 | $2,600-3,600 |

### 3-Year Total Cost of Ownership

| Scenario | Infrastructure | AI API | Total 3-Year |
|----------|----------------|--------|--------------|
| Enhanced Hybrid | $1,500-1,800 | $600-1,200 | $2,100-3,000 |
| Full Cloud | $7,200-9,000 | $1,800-3,600 | $9,000-12,600 |

**Savings with Hybrid: $6,900-9,600 over 3 years (73-76% reduction)**

---

## 10. Risk Analysis

### Scenario 1 (Minimal Local)
- **Risk:** Not production-ready, single point of failure
- **Mitigation:** Use only for development; transition to Hybrid for production

### Scenario 2 (Enhanced Hybrid)
- **Risk:** Dependent on local hardware uptime
- **Mitigation:**
  - Use UPS for power stability
  - Implement health checks and auto-restart
  - Maintain cloud backup/failover option
  - Document recovery procedures

### Scenario 3 (Full Cloud)
- **Risk:** Higher costs may not justify benefits for current scale
- **Mitigation:**
  - Start with Hybrid, migrate to Cloud only when needed
  - Implement auto-scaling to reduce idle costs
  - Use reserved instances for predictable workloads (40-60% savings)

---

## 11. Decision Matrix

### Choose Minimal Local If:
- ✅ Development and testing only
- ✅ Single developer environment
- ✅ No budget for hosting
- ✅ Learning and experimentation

### Choose Enhanced Hybrid If:
- ✅ Production-ready system needed
- ✅ Budget under $100/month
- ✅ Moderate traffic (< 100 interactions/day)
- ✅ Have reliable local hardware
- ✅ Can manage local infrastructure
- ✅ Want to minimize ongoing costs

### Choose Full Cloud If:
- ✅ High availability required (99.9%+)
- ✅ Heavy traffic (> 300 interactions/day)
- ✅ Multi-region deployment needed
- ✅ Enterprise SLAs required
- ✅ Budget > $200/month available
- ✅ Want fully managed services

---

## 12. Implementation Roadmap

### Phase 1: Foundation (Current)
- [x] Map architecture and components
- [x] Research pricing
- [ ] Implement AI model router
- [ ] Add usage tracking
- **Target: Scenario 1 (Minimal Local)**

### Phase 2: Production Preparation (Weeks 1-2)
- [ ] Set up Vercel hosting
- [ ] Configure local services for 24/7 operation
- [ ] Implement caching layer
- [ ] Add monitoring and alerts
- **Target: Scenario 2 (Enhanced Hybrid)**

### Phase 3: Optimization (Weeks 3-4)
- [ ] Implement intelligent model routing
- [ ] Enable batch processing
- [ ] Add cost tracking dashboard
- [ ] Optimize token usage
- **Target: $35-45/month**

### Phase 4: Scale (When needed)
- [ ] Migration plan to cloud
- [ ] Auto-scaling configuration
- [ ] Load balancing setup
- [ ] Multi-region strategy
- **Target: Scenario 3 (Full Cloud) - only if needed**

---

## 13. Monitoring and Alerts

### Critical Cost Metrics to Track

1. **AI API Usage**
   - Daily token consumption
   - Cost per interaction
   - Model usage distribution
   - Alert threshold: > $2/day ($60/month)

2. **Infrastructure Costs**
   - CPU utilization
   - Memory usage
   - Network traffic
   - Alert threshold: Sustained > 80% utilization

3. **Response Times**
   - API latency
   - Database query times
   - Cache hit rates
   - Alert threshold: > 2 seconds p95

### Recommended Monitoring Tools

| Tool | Purpose | Cost |
|------|---------|------|
| CloudWatch (AWS) | Infrastructure monitoring | $10-20/month |
| UptimeRobot | Uptime monitoring | Free tier available |
| Sentry | Error tracking | Free tier (5k events/month) |
| Custom Dashboard | Cost tracking | $0 (build in-house) |

---

## 14. Conclusion

### Recommended Strategy

**For Immediate Production Launch:**
1. **Deploy Scenario 2 (Enhanced Hybrid)** - $35-50/month
2. Implement AI model routing to maximize free tier usage
3. Use local infrastructure with cloud web hosting
4. Monitor costs weekly and optimize monthly

**Expected First Year Costs:**
- Months 1-3 (setup): $40-60/month
- Months 4-12 (optimized): $35-45/month
- **Total Year 1: $420-600**

**Key Success Factors:**
1. ✅ Maximize Gemini Flash free tier (1,500 req/day)
2. ✅ Implement response caching (90% savings on repeated queries)
3. ✅ Use GPT-4o Mini for simple tasks
4. ✅ Monitor and optimize continuously
5. ✅ Only scale to cloud when traffic justifies it

**Break-even Analysis:**
- Hybrid saves ~$165/month vs. Full Cloud
- Break-even point: When availability/SLA requirements justify the cost
- Estimated break-even: > 500 interactions/day or mission-critical uptime needs

---

## 15. Next Steps

1. ✅ Complete this cost analysis
2. [ ] Implement AI model router (Week 1)
3. [ ] Set up usage tracking (Week 1)
4. [ ] Deploy web UI to Vercel (Week 2)
5. [ ] Configure local 24/7 services (Week 2)
6. [ ] Create cost monitoring dashboard (Week 3)
7. [ ] Optimize and review monthly costs (Ongoing)

---

## Appendix A: Detailed API Pricing Tables

### OpenAI Complete Pricing Matrix

| Model | Input | Output | Context Window | Best For |
|-------|-------|--------|----------------|----------|
| GPT-4o | $3.00/M | $15.00/M | 128K | General purpose, best value |
| GPT-4o Mini | $0.15/M | $0.60/M | 128K | Simple tasks, high volume |
| GPT-4 Turbo | $10.00/M | $30.00/M | 128K | Legacy, complex reasoning |
| GPT-3.5 Turbo | $0.50/M | $1.50/M | 16K | Simple, high-volume tasks |

### Anthropic Complete Pricing Matrix

| Model | Input | Output | Extended Thinking | Context | Best For |
|-------|-------|--------|------------------|---------|----------|
| Sonnet 4.5 | $3.00/M | $15.00/M | - | 200K | Balanced performance |
| Sonnet 4.1 | $5.00/M | $25.00/M | $10.00/M | 200K | Advanced reasoning |
| Opus 4.1 | $15.00/M | $75.00/M | $40.00/M | 200K | Mission-critical |
| Haiku 3.5 | $0.25/M | $1.25/M | - | 200K | Fast, simple tasks |

### Google Gemini Complete Pricing Matrix

| Model | Input | Output | Context | Free Tier | Best For |
|-------|-------|--------|---------|-----------|----------|
| Flash | $0.15/M | $0.60/M | 1M | 1,500 req/day | High volume, low cost |
| Flash-Lite | $0.02/M | $0.08/M | 1M | Available | Ultra-low cost |
| Pro 1.5 | $1.25/M | $5.00/M | 2M | Limited | Balanced tasks |
| Pro 2.5 | $4.00/M | $20.00/M | 2M | No | Advanced features |

---

## Appendix B: Infrastructure Sizing Guide

### Traffic-Based Sizing Recommendations

| Daily Interactions | EC2 Instance | RDS Instance | Cache Instance | Est. Monthly Infra Cost |
|-------------------|--------------|--------------|----------------|------------------------|
| < 50 | t3.small | db.t3.micro | cache.t3.micro | $41 |
| 50-200 | t3.medium | db.t3.small | cache.t3.small | $82 |
| 200-500 | t3.large | db.t3.medium | cache.t3.medium | $165 |
| 500-1000 | t3.xlarge | db.t3.large | cache.t3.large | $330 |

### Memory and CPU Guidelines

**Per Service:**
- Jarvis Control Plane: 2 vCPU, 4 GB RAM minimum
- AI DAWG Backend: 2 vCPU, 4 GB RAM minimum
- PostgreSQL: 1 vCPU, 1-2 GB RAM + connection pooling
- Redis: 2 vCPU, 0.5-1.5 GB RAM based on cache size

**Scaling Indicators:**
- CPU > 70% sustained: Scale up
- Memory > 80% sustained: Scale up
- Response time > 2s p95: Scale up or optimize

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-08 | Claude (AI Assistant) | Initial comprehensive analysis |

---

**END OF COST ANALYSIS**
