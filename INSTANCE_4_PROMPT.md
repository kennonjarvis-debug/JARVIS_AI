# Instance 4: HubSpot CRM Integration (Prompt 7)

**Assigned Component:** HubSpot CRM Integration
**Estimated Time:** 4 hours
**Dependencies:** ✅ Logger (P2), ✅ Error Handler (P3), ✅ Types (P5)
**Priority:** HIGH - Required for Sales Agent

---

## Your Task

Build the HubSpot CRM adapter for lead and customer management. This integration allows Jarvis to manage contacts, deals, and activity logging.

---

## Context

**Prompt 7: HubSpot Integration** - CRM operations for Sales Agent

**Already complete:** Logger, Error handler, Types, Supabase

**You're building:** HubSpot API client for contact/deal/activity management

---

## API Contract

See `JARVIS_DESIGN_AND_PROMPTS.md` section **"13. Integrations: HubSpot CRM Adapter"**

```typescript
export interface HubSpotConfig {
  accessToken: string;
  portalId: string;
}

export interface Contact {
  id?: string;
  email: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  phone?: string;
  lifecyclestage?: 'lead' | 'opportunity' | 'customer';
  properties?: Record<string, any>;
}

export interface Deal {
  id?: string;
  dealname: string;
  amount: number;
  dealstage: string;
  closedate?: Date;
  contactId?: string;
}

export class HubSpotAdapter {
  constructor(config: HubSpotConfig);
  async upsertContact(contact: Contact): Promise<string>;
  async getContactByEmail(email: string): Promise<Contact | null>;
  async createDeal(deal: Deal): Promise<string>;
  async updateDealStage(dealId: string, stage: string): Promise<void>;
  async logActivity(contactId: string, activity: {
    type: 'email' | 'call' | 'meeting' | 'note';
    subject: string;
    body: string;
    timestamp?: Date;
  }): Promise<string>;
  async getContactActivities(contactId: string): Promise<any[]>;
  async searchContacts(filters: any): Promise<Contact[]>;
}
```

---

## Implementation

### 1. Create `src/integrations/hubspot.ts`

**Key features:**
- Contact CRUD operations
- Deal management
- Activity logging
- Search functionality
- Rate limiting (100 calls/10 seconds)

**HubSpot API v3 endpoints:**
```
POST /crm/v3/objects/contacts - Create contact
PATCH /crm/v3/objects/contacts/:id - Update contact
POST /crm/v3/objects/contacts/search - Search contacts
POST /crm/v3/objects/deals - Create deal
POST /crm/v3/engagements - Log activity
GET /crm/v3/objects/contacts/:id/associations - Get associations
```

**Implementation pattern:**
```typescript
import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger';
import { JarvisError, ErrorCode } from '../utils/error-handler';

export class HubSpotAdapter {
  private client: AxiosInstance;
  private logger: Logger;

  constructor(config: HubSpotConfig) {
    this.logger = new Logger('HubSpotAdapter');

    this.client = axios.create({
      baseURL: 'https://api.hubapi.com',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
  }

  public async upsertContact(contact: Contact): Promise<string> {
    try {
      // Try to find existing contact by email
      const existing = await this.getContactByEmail(contact.email);

      if (existing) {
        // Update existing
        await this.client.patch(
          `/crm/v3/objects/contacts/${existing.id}`,
          { properties: this.mapContactToProperties(contact) }
        );
        return existing.id!;
      } else {
        // Create new
        const response = await this.client.post(
          '/crm/v3/objects/contacts',
          { properties: this.mapContactToProperties(contact) }
        );
        return response.data.id;
      }
    } catch (error: any) {
      this.handleError('upsert contact', error);
    }
  }

  public async getContactByEmail(email: string): Promise<Contact | null> {
    try {
      const response = await this.client.post(
        '/crm/v3/objects/contacts/search',
        {
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: email
            }]
          }]
        }
      );

      if (response.data.results.length === 0) {
        return null;
      }

      return this.mapPropertiesToContact(response.data.results[0]);
    } catch (error: any) {
      this.handleError('get contact by email', error);
    }
  }

  public async createDeal(deal: Deal): Promise<string> {
    try {
      const response = await this.client.post(
        '/crm/v3/objects/deals',
        {
          properties: {
            dealname: deal.dealname,
            amount: deal.amount,
            dealstage: deal.dealstage,
            closedate: deal.closedate?.getTime()
          }
        }
      );

      // Associate with contact if provided
      if (deal.contactId) {
        await this.client.put(
          `/crm/v3/objects/deals/${response.data.id}/associations/contacts/${deal.contactId}/deal_to_contact`
        );
      }

      return response.data.id;
    } catch (error: any) {
      this.handleError('create deal', error);
    }
  }

  public async logActivity(contactId: string, activity: any): Promise<string> {
    try {
      const engagementType = this.mapActivityType(activity.type);

      const response = await this.client.post('/crm/v3/engagements', {
        engagement: {
          type: engagementType,
          timestamp: activity.timestamp?.getTime() || Date.now()
        },
        metadata: {
          subject: activity.subject,
          body: activity.body
        },
        associations: {
          contactIds: [parseInt(contactId)]
        }
      });

      return response.data.engagement.id;
    } catch (error: any) {
      this.handleError('log activity', error);
    }
  }

  private mapActivityType(type: string): string {
    const mapping: Record<string, string> = {
      'email': 'EMAIL',
      'call': 'CALL',
      'meeting': 'MEETING',
      'note': 'NOTE'
    };
    return mapping[type] || 'NOTE';
  }

  private handleError(operation: string, error: any): never {
    this.logger.error(`HubSpot operation failed: ${operation}`, error);

    if (error.response?.status === 429) {
      throw new JarvisError(
        ErrorCode.RATE_LIMIT_ERROR,
        'HubSpot API rate limit exceeded',
        { operation, retryAfter: error.response.headers['retry-after'] },
        true
      );
    }

    if (error.response?.status === 401) {
      throw new JarvisError(
        ErrorCode.AUTHENTICATION_ERROR,
        'HubSpot authentication failed',
        { operation },
        false
      );
    }

    throw new JarvisError(
      ErrorCode.INTEGRATION_ERROR,
      `HubSpot operation failed: ${operation}`,
      { error: error.message },
      true
    );
  }

  // Implement other methods...
}
```

### 2. Create `src/integrations/hubspot.test.ts`

**Test cases (minimum 18):**
- [ ] Create new contact
- [ ] Update existing contact (upsert)
- [ ] Get contact by email (found)
- [ ] Get contact by email (not found)
- [ ] Search contacts with filters
- [ ] Create deal
- [ ] Associate deal with contact
- [ ] Update deal stage
- [ ] Log email activity
- [ ] Log call activity
- [ ] Log meeting activity
- [ ] Get contact activities
- [ ] Handle rate limiting
- [ ] Handle authentication errors
- [ ] Handle not found errors
- [ ] Handle invalid data
- [ ] Retry transient failures
- [ ] Proper error wrapping

### 3. Create `docs/hubspot-setup.md`

**Guide sections:**
- HubSpot account creation (free tier)
- API key generation
- Portal ID location
- Custom properties setup
- Deal pipeline configuration
- Activity types
- Rate limits (100/10s)
- Best practices

---

## Acceptance Criteria

- [ ] Contact CRUD working
- [ ] Deal management working
- [ ] Activity logging functional
- [ ] Search implementation
- [ ] Rate limiting handled
- [ ] Authentication errors caught
- [ ] Error handling with JarvisError
- [ ] Test coverage >85% (18+ tests)
- [ ] Documentation complete
- [ ] Free tier compatible

---

## Environment Variables

```bash
HUBSPOT_ACCESS_TOKEN=your_token_here
HUBSPOT_PORTAL_ID=your_portal_id
```

---

## Integration Points

Used by:
- **Sales Agent (P14)** - Lead management, CRM operations
- **Marketing Agent (P13)** - Contact enrichment

---

## Resources

- HubSpot API v3: https://developers.hubspot.com/docs/api/overview
- CRM Objects: https://developers.hubspot.com/docs/api/crm/crm-custom-objects
- Free Tier: 1M contacts, unlimited users

---

## Completion

Create `PROMPT_7_COMPLETION.md` documenting completion.

---

**BUILD IT!** 🚀 Sales Agent is waiting for you!
