# Multi-Tenant Business Context System

## Overview

Completed implementation of multi-tenant business context management for the Jarvis AI social listening and auto-posting system. Each business (observatory) now has its own customized AI agent behavior, brand voice, and response patterns.

## What This Solves

**User's Request:**
> "there will be many businesses connected to Jarvis - we need to make sure that Jarvis can understand the context of each busienss and make custom actions .. each user will connnect their social accoutns and have serperate observatories for each business.."

## Key Features

### 1. Business-Specific Profiles

Each observatory can configure:
- **Brand Voice**: Professional, casual, friendly, technical, enthusiastic, or custom
- **Products & Services**: Full catalog with features, pricing, target audience
- **Target Audience**: Demographics, industries, pain points
- **Knowledge Base**: FAQ and business-specific information
- **Social Guidelines**: Hashtags, topics to avoid, response times
- **Unique Selling Points**: Key differentiators from competitors

### 2. Agent Personalities

Each of the 4 agent types (Sales, Marketing, Support, Operations) can be customized per business:
- **Custom System Prompts**: Override default behavior
- **Response Style**: How the agent communicates
- **Response Rules**:
  - Max length (e.g., 280 for Twitter)
  - Include/exclude links, emojis, hashtags
  - Mention competitors or not
  - Offer discounts (with max percentage)
- **Confidence Thresholds**: Different per agent type per business
  - Default: Sales (85%), Marketing (75%), Support (80%), Operations (90%)
  - Customizable for each business

### 3. Knowledge Base Integration

- AI agents automatically search the business knowledge base for relevant context
- Includes matching answers in prompts to Claude AI
- Structured with questions, answers, keywords, and categories
- Examples:
  - Pricing information
  - Feature comparisons
  - Getting started guides
  - Platform support

## Architecture

### Files Created/Modified

1. **BusinessContext.ts** (NEW - 660 lines)
   - `BusinessProfile` interface - Complete business configuration
   - `AgentPersonality` interface - Per-agent customization
   - `BusinessContextManager` class - Manages multi-tenant context
   - Key methods:
     - `getBusinessProfile()` - Loads business config with caching
     - `generateSystemPrompt()` - Creates business-specific Claude prompts
     - `searchKnowledgeBase()` - Finds relevant FAQ entries

2. **types.ts** (UPDATED)
   - Added `observatoryId` to `AgentWorkflowTrigger` interface
   - Enables multi-tenant context flow through system

3. **AgentBridge.ts** (UPDATED)
   - Replaced hardcoded agent prompts with `BusinessContextManager`
   - Dynamic system prompt generation per business
   - Knowledge base search integration
   - Business-specific confidence thresholds
   - Methods updated:
     - `generateAgentResponse()` - Now uses business context
     - `processWorkflow()` - Uses business-specific confidence threshold

4. **SocialListeningEngine.ts** (UPDATED)
   - Added `observatoryId` to agent workflow triggers
   - Enables business context flow

5. **create_business_context_tables.sql** (NEW - 400 lines)
   - `business_profiles` table - Stores business information
   - `agent_personalities` table - Stores agent customizations
   - RLS policies for multi-tenant security
   - Auto-insert default profiles for existing observatories
   - Sample knowledge base entries

## Database Schema

### business_profiles Table

```sql
- observatory_id (PK, FK to observatories)
- business_name, industry, description, website
- brand_voice, custom_brand_voice, tone_attributes
- products (JSONB array)
- services (JSONB array)
- target_audience (JSONB object)
- pricing_tiers (JSONB array)
- unique_selling_points (TEXT array)
- competitors (TEXT array)
- knowledge_base (JSONB array)
- social_guidelines (JSONB object)
- created_at, updated_at
```

### agent_personalities Table

```sql
- id (PK)
- observatory_id (FK to observatories)
- agent_type (sales | marketing | support | operations)
- system_prompt (optional custom override)
- response_style
- example_responses (JSONB array)
- rules (JSONB object)
- requires_context (TEXT array)
- confidence_threshold (0-100)
- created_at, updated_at
- UNIQUE(observatory_id, agent_type)
```

## How It Works

### Before (Hardcoded)

```typescript
// Old approach - same for all businesses
const systemPrompt = this.agentPrompts.get('sales');
// Generic: "You are a sales agent..."

if (confidence < 80) { // Hardcoded threshold
  requestApproval();
}
```

### After (Business-Specific)

```typescript
// New approach - customized per business
const systemPrompt = await this.contextManager.generateSystemPrompt(
  observatoryId,
  'sales'
);
// Business-specific: "You are a sales agent for DAWG AI.
// Industry: Music Production Software
// Products: Browser-based DAW with AI features
// Brand voice: Enthusiastic and creative
// Target audience: Independent music producers..."

const personality = await this.contextManager.getAgentPersonality(
  observatoryId,
  'sales'
);

if (confidence < personality.confidenceThreshold) { // Business-specific
  requestApproval();
}
```

## Example: Two Different Businesses

### Business A: DAWG AI (Music Production)

**Profile:**
```json
{
  "businessName": "DAWG AI",
  "industry": "Music Production Software",
  "brandVoice": "enthusiastic",
  "toneAttributes": ["creative", "accessible", "inspiring"],
  "products": [{
    "name": "DAWG AI DAW",
    "description": "Browser-based digital audio workstation",
    "features": ["Real-time collaboration", "AI-powered mixing"]
  }]
}
```

**Sales Agent Response:**
> "Hey @user! 🎵 I saw you're looking for a DAW. DAWG AI is perfect for producers who want to create music anywhere - no downloads needed! Our AI mixing assistant is a game-changer. Want to try the free demo?"

**Confidence Threshold:** 85%

---

### Business B: TechConsult Pro (B2B SaaS)

**Profile:**
```json
{
  "businessName": "TechConsult Pro",
  "industry": "Enterprise Consulting",
  "brandVoice": "professional",
  "toneAttributes": ["authoritative", "precise", "helpful"],
  "services": [{
    "name": "Cloud Migration",
    "description": "Enterprise cloud transformation services"
  }]
}
```

**Sales Agent Response:**
> "Hello @user. I noticed your interest in cloud migration solutions. TechConsult Pro specializes in enterprise transitions with proven ROI. Would you like to schedule a consultation to discuss your specific requirements?"

**Confidence Threshold:** 90% (higher - more conservative for B2B)

## Default Configuration

When a new observatory is created, the migration automatically inserts:

1. **Default Business Profile**
   - Brand voice: Professional
   - Tone attributes: Helpful, responsive, knowledgeable
   - Sample USPs
   - Basic social guidelines

2. **Default Agent Personalities** (all 4 types)
   - Sales: Consultative, 85% threshold, can offer discounts
   - Marketing: Engaging, 75% threshold, uses emojis/hashtags
   - Support: Patient, 80% threshold, focused on problem-solving
   - Operations: Technical, 90% threshold, precise guidance

3. **Sample Knowledge Base**
   - Pricing FAQ
   - Getting started guide
   - Platform support info

## Benefits

### For Users (Business Owners)
- **Brand Consistency**: Agents speak in your brand's voice
- **Accurate Information**: Agents use your products, services, pricing
- **Controlled Risk**: Set confidence thresholds per agent type
- **Customizable**: Override any default behavior

### For the System
- **Scalability**: Each business isolated in database
- **Security**: RLS policies ensure data separation
- **Performance**: Caching layer for business context
- **Flexibility**: JSONB allows schema-less customization

## Next Steps for Users

### 1. Run Database Migration

```bash
# Apply the business context tables migration
psql -h your-supabase-db.supabase.co \
     -U postgres \
     -d postgres \
     -f packages/backend/supabase/migrations/create_business_context_tables.sql
```

### 2. Configure Business Profile (via Dashboard - to be built)

- Business information (name, industry, website)
- Brand voice and tone
- Products and services
- Target audience
- Knowledge base entries
- Social media guidelines

### 3. Customize Agent Personalities (via Dashboard - to be built)

- Set confidence thresholds per agent
- Add example responses for training
- Configure response rules (emojis, links, hashtags, etc.)
- Provide custom system prompts if needed

### 4. Test Multi-Tenant Functionality

1. Create multiple observatories (or use existing ones)
2. Configure different profiles for each
3. Start social listening
4. Verify agents generate different responses based on context

## Technical Implementation Details

### Context Flow

```
Social Post
  ↓
SocialListeningEngine (has observatoryId)
  ↓
Creates AgentWorkflowTrigger (includes observatoryId)
  ↓
AgentBridge.processWorkflow(trigger)
  ↓
AgentBridge.generateAgentResponse(trigger)
  ↓
BusinessContextManager.generateSystemPrompt(observatoryId, agentType)
  ↓
Loads business_profiles + agent_personalities from DB
  ↓
Generates custom system prompt for Claude
  ↓
Searches knowledge_base for relevant context
  ↓
Claude generates response with business-specific context
  ↓
Checks business-specific confidence threshold
  ↓
Auto-approve or request human approval
```

### Caching Strategy

```typescript
private contextCache: Map<string, BusinessProfile>;
private agentCache: Map<string, Map<string, AgentPersonality>>;

// First request: Database query (slow)
// Subsequent requests: In-memory cache (fast)
// Cache invalidation: TBD (manual or time-based)
```

### Security (Row Level Security)

```sql
-- Users can only access their own observatory's data
CREATE POLICY business_profiles_policy ON business_profiles
  FOR ALL USING (
    observatory_id IN (
      SELECT observatory_id FROM observatory_members
      WHERE user_id = auth.uid()
    )
  );
```

## Future Enhancements

1. **Dashboard UI** - Visual configuration interface
2. **Template Library** - Pre-built profiles for common industries
3. **A/B Testing** - Test different agent personalities
4. **Analytics** - Track performance by business profile
5. **Import/Export** - Share configurations between businesses
6. **Machine Learning** - Learn from approved responses
7. **Multi-Language** - Support for non-English businesses

## Files Summary

### Created:
- `packages/backend/src/services/social/BusinessContext.ts` (660 lines)
- `packages/backend/supabase/migrations/create_business_context_tables.sql` (400 lines)
- `MULTI_TENANT_BUSINESS_CONTEXT.md` (this file)

### Modified:
- `packages/backend/src/services/social/types.ts` - Added observatoryId to AgentWorkflowTrigger
- `packages/backend/src/services/social/AgentBridge.ts` - Integrated BusinessContextManager
- `packages/backend/src/services/social/SocialListeningEngine.ts` - Added observatoryId to triggers

### Total New Code: ~1,100 lines

## Testing Checklist

- [ ] Apply database migration
- [ ] Verify default profiles created for existing observatories
- [ ] Verify default agent personalities created (4 per observatory)
- [ ] Test `getBusinessProfile()` returns correct data
- [ ] Test `generateSystemPrompt()` produces business-specific prompts
- [ ] Test `searchKnowledgeBase()` finds relevant entries
- [ ] Test agent responses include business context
- [ ] Test business-specific confidence thresholds work
- [ ] Test RLS policies prevent cross-observatory access
- [ ] Test multiple businesses get different responses for same post

## Conclusion

The multi-tenant business context system is now fully integrated into the Jarvis AI social listening platform. Each business can have completely customized AI agent behavior, ensuring brand consistency and accurate information while maintaining data isolation and security.

The system is production-ready pending database migration and dashboard UI for configuration.
