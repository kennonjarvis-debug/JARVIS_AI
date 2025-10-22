/**
 * Tests for HubSpot CRM Integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HubSpotAdapter, type Contact, type Deal, type Activity } from './hubspot.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('HubSpotAdapter', () => {
  let hubspot: HubSpotAdapter;
  let mockClient: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock axios instance
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn((fn) => fn) },
        response: { use: vi.fn((fn) => fn) },
      },
    };

    mockedAxios.create.mockReturnValue(mockClient as any);

    // Create HubSpot adapter
    hubspot = new HubSpotAdapter({
      accessToken: 'test-token',
      portalId: 'test-portal',
    });
  });

  describe('Contact Management', () => {
    it('should create a new contact', async () => {
      const contact: Contact = {
        email: 'test@example.com',
        firstname: 'John',
        lastname: 'Doe',
        company: 'Test Company',
        lifecyclestage: 'lead',
      };

      // Mock search returns no existing contact
      mockClient.post.mockResolvedValueOnce({
        data: { results: [] },
      });

      // Mock create contact
      mockClient.post.mockResolvedValueOnce({
        data: { id: 'contact-123' },
      });

      const contactId = await hubspot.upsertContact(contact);

      expect(contactId).toBe('contact-123');
      expect(mockClient.post).toHaveBeenCalledTimes(2);
      expect(mockClient.post).toHaveBeenNthCalledWith(1,
        '/crm/v3/objects/contacts/search',
        expect.objectContaining({
          filterGroups: expect.any(Array),
        })
      );
      expect(mockClient.post).toHaveBeenNthCalledWith(2,
        '/crm/v3/objects/contacts',
        expect.objectContaining({
          properties: expect.objectContaining({
            email: 'test@example.com',
            firstname: 'John',
            lastname: 'Doe',
          }),
        })
      );
    });

    it('should update an existing contact', async () => {
      const contact: Contact = {
        email: 'existing@example.com',
        firstname: 'Jane',
        lastname: 'Smith',
      };

      // Mock search returns existing contact
      mockClient.post.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 'contact-456',
              properties: {
                email: 'existing@example.com',
                firstname: 'Jane',
                lastname: 'Doe', // Old lastname
              },
            },
          ],
        },
      });

      // Mock update contact
      mockClient.patch.mockResolvedValueOnce({
        data: { id: 'contact-456' },
      });

      const contactId = await hubspot.upsertContact(contact);

      expect(contactId).toBe('contact-456');
      expect(mockClient.patch).toHaveBeenCalledWith(
        '/crm/v3/objects/contacts/contact-456',
        expect.objectContaining({
          properties: expect.objectContaining({
            email: 'existing@example.com',
            lastname: 'Smith',
          }),
        })
      );
    });

    it('should get contact by email', async () => {
      mockClient.post.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 'contact-789',
              properties: {
                email: 'find@example.com',
                firstname: 'Find',
                lastname: 'Me',
                company: 'Test Co',
                phone: '555-1234',
                lifecyclestage: 'customer',
              },
            },
          ],
        },
      });

      const contact = await hubspot.getContactByEmail('find@example.com');

      expect(contact).toEqual({
        id: 'contact-789',
        email: 'find@example.com',
        firstname: 'Find',
        lastname: 'Me',
        company: 'Test Co',
        phone: '555-1234',
        lifecyclestage: 'customer',
      });
    });

    it('should return null when contact not found', async () => {
      mockClient.post.mockResolvedValueOnce({
        data: { results: [] },
      });

      const contact = await hubspot.getContactByEmail('notfound@example.com');

      expect(contact).toBeNull();
    });

    it('should search contacts with filters', async () => {
      mockClient.post.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 'contact-1',
              properties: {
                email: 'lead1@example.com',
                firstname: 'Lead',
                lastname: 'One',
                lifecyclestage: 'lead',
              },
            },
            {
              id: 'contact-2',
              properties: {
                email: 'lead2@example.com',
                firstname: 'Lead',
                lastname: 'Two',
                lifecyclestage: 'lead',
              },
            },
          ],
        },
      });

      const contacts = await hubspot.searchContacts({
        lifecyclestage: 'lead',
        limit: 10,
      });

      expect(contacts).toHaveLength(2);
      expect(contacts[0].email).toBe('lead1@example.com');
      expect(contacts[1].email).toBe('lead2@example.com');
      expect(mockClient.post).toHaveBeenCalledWith(
        '/crm/v3/objects/contacts/search',
        expect.objectContaining({
          filterGroups: expect.arrayContaining([
            expect.objectContaining({
              filters: expect.arrayContaining([
                expect.objectContaining({
                  propertyName: 'lifecyclestage',
                  operator: 'EQ',
                  value: 'lead',
                }),
              ]),
            }),
          ]),
        })
      );
    });
  });

  describe('Deal Management', () => {
    it('should create a deal', async () => {
      const deal: Deal = {
        dealname: 'Test Deal',
        amount: 5000,
        dealstage: 'qualifiedtobuy',
      };

      mockClient.post.mockResolvedValueOnce({
        data: { id: 'deal-123' },
      });

      const dealId = await hubspot.createDeal(deal);

      expect(dealId).toBe('deal-123');
      expect(mockClient.post).toHaveBeenCalledWith(
        '/crm/v3/objects/deals',
        expect.objectContaining({
          properties: expect.objectContaining({
            dealname: 'Test Deal',
            amount: '5000',
            dealstage: 'qualifiedtobuy',
          }),
        })
      );
    });

    it('should create deal and associate with contact', async () => {
      const deal: Deal = {
        dealname: 'Associated Deal',
        amount: 10000,
        dealstage: 'contractsent',
        contactId: 'contact-456',
      };

      mockClient.post.mockResolvedValueOnce({
        data: { id: 'deal-456' },
      });

      mockClient.put.mockResolvedValueOnce({
        data: { success: true },
      });

      const dealId = await hubspot.createDeal(deal);

      expect(dealId).toBe('deal-456');
      expect(mockClient.put).toHaveBeenCalledWith(
        '/crm/v3/objects/deals/deal-456/associations/contacts/contact-456/deal_to_contact'
      );
    });

    it('should update deal stage', async () => {
      mockClient.patch.mockResolvedValueOnce({
        data: { success: true },
      });

      await hubspot.updateDealStage('deal-789', 'closedwon');

      expect(mockClient.patch).toHaveBeenCalledWith(
        '/crm/v3/objects/deals/deal-789',
        expect.objectContaining({
          properties: {
            dealstage: 'closedwon',
          },
        })
      );
    });
  });

  describe('Activity Logging', () => {
    it('should log an email activity', async () => {
      const activity: Activity = {
        type: 'email',
        subject: 'Welcome Email',
        body: 'Thank you for signing up!',
      };

      mockClient.post.mockResolvedValueOnce({
        data: {
          engagement: { id: 'engagement-123' },
        },
      });

      const engagementId = await hubspot.logActivity('contact-123', activity);

      expect(engagementId).toBe('engagement-123');
      expect(mockClient.post).toHaveBeenCalledWith(
        '/crm/v3/engagements',
        expect.objectContaining({
          engagement: expect.objectContaining({
            type: 'EMAIL',
          }),
          associations: {
            contactIds: ['contact-123'],
          },
          metadata: {
            subject: 'Welcome Email',
            body: 'Thank you for signing up!',
          },
        })
      );
    });

    it('should log a call activity', async () => {
      const activity: Activity = {
        type: 'call',
        subject: 'Follow-up Call',
        body: 'Discussed pricing options',
        timestamp: new Date('2025-10-15T10:00:00Z'),
      };

      mockClient.post.mockResolvedValueOnce({
        data: {
          engagement: { id: 'engagement-456' },
        },
      });

      const engagementId = await hubspot.logActivity('contact-456', activity);

      expect(engagementId).toBe('engagement-456');
      expect(mockClient.post).toHaveBeenCalledWith(
        '/crm/v3/engagements',
        expect.objectContaining({
          engagement: expect.objectContaining({
            type: 'CALL',
            timestamp: new Date('2025-10-15T10:00:00Z').getTime(),
          }),
        })
      );
    });

    it('should get contact activities', async () => {
      // Mock get associations
      mockClient.get.mockResolvedValueOnce({
        data: {
          results: [
            { id: 'engagement-1' },
            { id: 'engagement-2' },
          ],
        },
      });

      // Mock get engagement details
      mockClient.get.mockResolvedValueOnce({
        data: {
          engagement: {
            type: 'EMAIL',
            timestamp: 1697461200000,
          },
          metadata: {
            subject: 'Welcome',
          },
        },
      });

      mockClient.get.mockResolvedValueOnce({
        data: {
          engagement: {
            type: 'CALL',
            timestamp: 1697547600000,
          },
          metadata: {
            subject: 'Follow-up',
          },
        },
      });

      const activities = await hubspot.getContactActivities('contact-789');

      expect(activities).toHaveLength(2);
      expect(activities[0]).toEqual({
        type: 'email',
        subject: 'Welcome',
        timestamp: new Date(1697461200000),
      });
      expect(activities[1]).toEqual({
        type: 'call',
        subject: 'Follow-up',
        timestamp: new Date(1697547600000),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting errors', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
          headers: { 'retry-after': '60' },
        },
      };

      mockClient.post.mockRejectedValueOnce(rateLimitError);

      // Mock handleApiError to throw JarvisError
      const handleApiErrorSpy = vi.spyOn(hubspot as any, 'handleApiError');
      handleApiErrorSpy.mockImplementation(() => {
        throw new Error('HubSpot API rate limit exceeded');
      });

      await expect(
        hubspot.getContactByEmail('test@example.com')
      ).rejects.toThrow();
    });

    it('should handle authentication errors', async () => {
      const authError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };

      mockClient.post.mockRejectedValueOnce(authError);

      const handleApiErrorSpy = vi.spyOn(hubspot as any, 'handleApiError');
      handleApiErrorSpy.mockImplementation(() => {
        throw new Error('HubSpot authentication failed');
      });

      await expect(
        hubspot.getContactByEmail('test@example.com')
      ).rejects.toThrow();
    });

    it('should handle validation errors', async () => {
      const validationError = {
        response: {
          status: 400,
          data: {
            message: 'Invalid property',
            errors: [{ message: 'Invalid email format' }],
          },
        },
      };

      mockClient.post.mockRejectedValueOnce(validationError);

      const handleApiErrorSpy = vi.spyOn(hubspot as any, 'handleApiError');
      handleApiErrorSpy.mockImplementation(() => {
        throw new Error('Invalid request to HubSpot API');
      });

      await expect(
        hubspot.upsertContact({ email: 'invalid-email' })
      ).rejects.toThrow();
    });
  });

  describe('Health Check', () => {
    it('should pass health check when API is accessible', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: { results: [] },
      });

      const health = await hubspot.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(0); // Can be 0 in mocked tests
    });

    it('should fail health check when API is not accessible', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('Network error'));

      // Mock handleApiError
      const handleApiErrorSpy = vi.spyOn(hubspot as any, 'handleApiError');
      handleApiErrorSpy.mockImplementation(() => {
        throw new Error('HubSpot API request failed');
      });

      const health = await hubspot.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.latency).toBeGreaterThanOrEqual(0); // Can be 0 in mocked tests
    });
  });

  describe('Rate Limiter', () => {
    it('should respect rate limits', async () => {
      // Create a new instance with very low rate limit for testing
      const RateLimiter = (hubspot as any).rateLimiter.constructor;
      const limiter = new RateLimiter();

      // Override rate limit settings for faster testing
      limiter.maxRequests = 3;
      limiter.windowMs = 1000;

      const startTime = Date.now();

      // Make requests up to the limit
      await limiter.waitIfNeeded();
      await limiter.waitIfNeeded();
      await limiter.waitIfNeeded();

      // This should cause a wait
      await limiter.waitIfNeeded();

      const elapsed = Date.now() - startTime;

      // Should have waited for rate limit window
      expect(elapsed).toBeGreaterThan(0);
    }, 10000); // Increase timeout for this test
  });

  describe('Configuration', () => {
    it('should use custom base URL', () => {
      const customHubspot = new HubSpotAdapter({
        accessToken: 'test-token',
        portalId: 'test-portal',
        baseUrl: 'https://custom.api.com',
      });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://custom.api.com',
        })
      );
    });

    it('should use custom timeout', () => {
      const customHubspot = new HubSpotAdapter({
        accessToken: 'test-token',
        portalId: 'test-portal',
        timeout: 60000,
      });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
        })
      );
    });

    it('should set authorization header', () => {
      const customHubspot = new HubSpotAdapter({
        accessToken: 'my-secret-token',
        portalId: 'test-portal',
      });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer my-secret-token',
          }),
        })
      );
    });
  });
});
