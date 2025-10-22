/**
 * SalesAgent Tests
 *
 * Comprehensive test suite for the SalesAgent.
 * Tests lead qualification, outreach generation, deal management, and HubSpot integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SalesAgent } from './sales-agent.js';
import { JarvisError, ErrorCode } from '../utils/error-handler.js';
import type { TaskRequest, TaskType } from '../types/tasks.js';

describe('SalesAgent', () => {
  let agent: SalesAgent;
  let mockHubSpot: any;
  let mockEmail: any;
  let mockDecisionEngine: any;
  let mockMemory: any;
  let mockApprovalQueue: any;

  beforeEach(() => {
    // Mock HubSpot adapter
    mockHubSpot = {
      getContactByEmail: vi.fn().mockResolvedValue({
        id: 'contact-123',
        email: 'test@example.com',
        firstname: 'John',
        lastname: 'Doe',
        company: 'Acme Corp',
        jobtitle: 'CEO',
        lifecyclestage: 'lead',
      }),
      upsertContact: vi.fn().mockResolvedValue({ id: 'contact-123' }),
      createDeal: vi.fn().mockResolvedValue('deal-123'),
      updateDealStage: vi.fn().mockResolvedValue(undefined),
      logActivity: vi.fn().mockResolvedValue(undefined),
    };

    // Mock Email adapter
    mockEmail = {
      sendEmail: vi.fn().mockResolvedValue({
        messageId: 'msg-123',
        success: true,
      }),
    };

    // Mock Decision Engine
    mockDecisionEngine = {
      evaluate: vi.fn().mockResolvedValue({
        action: 'execute',
        confidence: 0.9,
        reasoning: 'Safe to execute',
        riskLevel: 'low',
        requiresApproval: false,
      }),
    };

    // Mock Memory System
    mockMemory = {
      getRelevantContext: vi.fn().mockResolvedValue([]),
      storeEntry: vi.fn().mockResolvedValue(undefined),
    };

    // Mock Approval Queue
    mockApprovalQueue = {
      requestApproval: vi.fn().mockResolvedValue('req-123'),
    };

    agent = new SalesAgent({
      id: 'sales-agent',
      name: 'Sales Agent',
      capabilities: [
        { name: 'lead_qualification', description: 'Lead scoring and qualification', enabled: true },
        { name: 'outreach', description: 'Personalized sales outreach', enabled: true },
        { name: 'deal_management', description: 'CRM deal management', enabled: true },
      ],
      integrations: {
        hubspot: mockHubSpot,
        email: mockEmail,
      },
      decisionEngine: mockDecisionEngine,
      memory: mockMemory,
      approvalQueue: mockApprovalQueue,
    });

    // Mock Claude API calls to avoid actual API requests
    vi.spyOn(agent as any, 'generateContent').mockResolvedValue('Mocked reasoning for lead qualification');
    vi.spyOn(agent as any, 'generateJSON').mockResolvedValue({
      subject: 'Test Subject',
      body: '<p>Test email body</p>',
    });
  });

  describe('getSupportedTaskTypes', () => {
    it('should support sales task types', () => {
      const types = agent.getSupportedTaskTypes();

      expect(types).toContain('sales.lead.qualify');
      expect(types).toContain('sales.outreach.send');
      expect(types).toContain('sales.deal.create');
      expect(types).toContain('sales.deal.update');
      expect(types).toHaveLength(4);
    });
  });

  describe('canHandle', () => {
    it('should handle supported sales tasks', () => {
      const qualifyTask: TaskRequest = {
        id: 'task-1',
        type: 'sales.lead.qualify' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test',
        timestamp: new Date(),
      };

      expect(agent.canHandle(qualifyTask)).toBe(true);
    });

    it('should reject unsupported task types', () => {
      const unsupportedTask: TaskRequest = {
        id: 'task-1',
        type: 'marketing.social.post' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test',
        timestamp: new Date(),
      };

      expect(agent.canHandle(unsupportedTask)).toBe(false);
    });
  });

  describe('qualifyLead', () => {
    it('should score hot lead correctly (>75 points)', async () => {
      const leadData = {
        id: 'lead-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@bigcorp.com',
        company: {
          name: 'BigCorp',
          size: 1500, // Enterprise: 20 points
        },
        jobTitle: 'CEO', // Executive: 25 points
        engagement: {
          emailOpens: 5, // 10 points
          emailClicks: 2, // 10 points
          websiteVisits: 3, // 10 points
        },
        intentSignals: ['pricing', 'demo', 'enterprise'], // 24 points (3 * 8)
      };

      const qualification = await agent.qualifyLead(leadData);

      expect(qualification.score).toBeGreaterThanOrEqual(75);
      expect(qualification.category).toBe('hot');
      expect(qualification.recommendedAction).toBe('immediate_outreach');
      expect(qualification.signals.jobTitleMatch).toBe(true);
      expect(qualification.signals.engagementLevel).toBe('high');
    });

    it('should score warm lead correctly (50-74 points)', async () => {
      const leadData = {
        id: 'lead-456',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@midsize.com',
        company: {
          name: 'MidSize Inc',
          size: 250, // Mid-market: 15 points
        },
        jobTitle: 'Director of Engineering', // Director: 20 points
        engagement: {
          emailOpens: 4, // 10 points (need >3)
          emailClicks: 0,
          websiteVisits: 1,
        }, // 10 points total
        intentSignals: ['contact', 'trial'], // 16 points (2 * 8)
      };

      const qualification = await agent.qualifyLead(leadData);

      expect(qualification.score).toBeGreaterThanOrEqual(50);
      expect(qualification.score).toBeLessThan(75);
      expect(qualification.category).toBe('warm');
      expect(qualification.recommendedAction).toBe('nurture');
    });

    it('should score cold lead correctly (<50 points)', async () => {
      const leadData = {
        id: 'lead-789',
        firstName: 'Alex',
        lastName: 'Brown',
        email: 'alex@startup.com',
        company: {
          name: 'Startup LLC',
          size: 8, // Micro: 5 points
        },
        jobTitle: 'Developer', // IC: 5 points
        engagement: {
          emailOpens: 1,
          emailClicks: 0,
          websiteVisits: 0,
        }, // 0 points
        intentSignals: [], // 0 points
      };

      const qualification = await agent.qualifyLead(leadData);

      expect(qualification.score).toBeLessThan(50);
      expect(qualification.category).toBe('cold');
      expect(qualification.recommendedAction).toBe('low_priority');
      expect(qualification.signals.jobTitleMatch).toBe(false);
      expect(qualification.signals.engagementLevel).toBe('low');
    });

    it('should handle missing company size gracefully', async () => {
      const leadData = {
        id: 'lead-999',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        company: { name: 'Unknown Corp' }, // No size
        jobTitle: 'Manager',
        engagement: {
          emailOpens: 2,
          emailClicks: 1,
          websiteVisits: 1,
        },
        intentSignals: [],
      };

      const qualification = await agent.qualifyLead(leadData);

      expect(qualification.score).toBeGreaterThanOrEqual(0);
      expect(qualification.signals.companySize).toBe(0);
    });
  });

  describe('sendOutreach', () => {
    it('should send personalized outreach email to hot lead', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'sales.outreach.send' as TaskType,
        priority: 1,
        data: {
          leadId: 'test@example.com',
          channel: 'email',
          personalizationData: {
            recentActivity: 'Viewed pricing page',
          },
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.data).toHaveProperty('leadId', 'test@example.com');
      expect(result.data).toHaveProperty('channel', 'email');
      expect(result.data).toHaveProperty('subject');

      // Verify email was sent
      expect(mockEmail.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.any(String),
          html: expect.any(String),
        })
      );

      // Verify activity logged in HubSpot
      expect(mockHubSpot.logActivity).toHaveBeenCalled();

      // Verify follow-up scheduled in memory
      expect(mockMemory.storeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'scheduled_task',
          content: expect.objectContaining({
            taskType: 'sales.followup.send',
          }),
        })
      );
    });

    it('should throw error when contact not found', async () => {
      mockHubSpot.getContactByEmail.mockResolvedValue(null);

      const task: TaskRequest = {
        id: 'task-1',
        type: 'sales.outreach.send' as TaskType,
        priority: 1,
        data: {
          leadId: 'notfound@example.com',
          channel: 'email',
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      await expect(agent.executeTask(task)).rejects.toThrow(JarvisError);
      await expect(agent.executeTask(task)).rejects.toThrow('Contact not found');
    });
  });

  describe('createDeal', () => {
    it('should create deal in HubSpot', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'sales.deal.create' as TaskType,
        priority: 1,
        data: {
          name: 'Enterprise Deal - Acme Corp',
          amount: 50000,
          stage: 'qualification',
          closeDate: new Date('2025-03-01'),
          contactId: 'contact-123',
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.data).toHaveProperty('dealId', 'deal-123');

      expect(mockHubSpot.createDeal).toHaveBeenCalledWith(
        expect.objectContaining({
          dealname: 'Enterprise Deal - Acme Corp',
          amount: 50000,
          dealstage: 'qualification',
          contactId: 'contact-123',
        })
      );
    });

    it('should use default stage when not provided', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'sales.deal.create' as TaskType,
        priority: 1,
        data: {
          name: 'New Deal',
          contactId: 'contact-123',
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      await agent.executeTask(task);

      expect(mockHubSpot.createDeal).toHaveBeenCalledWith(
        expect.objectContaining({
          dealstage: 'qualification',
        })
      );
    });
  });

  describe('updateDeal', () => {
    it('should update deal stage in HubSpot', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'sales.deal.update' as TaskType,
        priority: 1,
        data: {
          dealId: 'deal-123',
          stage: 'negotiation',
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');

      expect(mockHubSpot.updateDealStage).toHaveBeenCalledWith('deal-123', 'negotiation');
    });

    it('should log activity notes when provided', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'sales.deal.update' as TaskType,
        priority: 1,
        data: {
          dealId: 'deal-123',
          stage: 'closed_won',
          notes: 'Deal closed! Customer signed contract.',
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      await agent.executeTask(task);

      expect(mockHubSpot.logActivity).toHaveBeenCalledWith(
        'deal-123',
        expect.objectContaining({
          type: 'note',
          subject: 'Deal Update',
          body: 'Deal closed! Customer signed contract.',
        })
      );
    });
  });

  describe('lead scoring - company size', () => {
    it('should score enterprise companies (1000+) at 20 points', () => {
      const score = (agent as any).scoreCompanySize(1500);
      expect(score).toBe(20);
    });

    it('should score mid-market companies (100-999) at 15 points', () => {
      const score = (agent as any).scoreCompanySize(250);
      expect(score).toBe(15);
    });

    it('should score SMB companies (10-99) at 10 points', () => {
      const score = (agent as any).scoreCompanySize(50);
      expect(score).toBe(10);
    });

    it('should score micro companies (<10) at 5 points', () => {
      const score = (agent as any).scoreCompanySize(5);
      expect(score).toBe(5);
    });

    it('should return 0 for undefined company size', () => {
      const score = (agent as any).scoreCompanySize(undefined);
      expect(score).toBe(0);
    });
  });

  describe('lead scoring - job title', () => {
    it('should score C-level executives at 25 points', () => {
      expect((agent as any).scoreJobTitle('CEO')).toBe(25);
      expect((agent as any).scoreJobTitle('CTO')).toBe(25);
      expect((agent as any).scoreJobTitle('CFO')).toBe(25);
      expect((agent as any).scoreJobTitle('Co-Founder')).toBe(25);
      expect((agent as any).scoreJobTitle('President')).toBe(25);
    });

    it('should score directors and VPs at 20 points', () => {
      expect((agent as any).scoreJobTitle('Director of Engineering')).toBe(20);
      expect((agent as any).scoreJobTitle('VP of Sales')).toBe(20);
      expect((agent as any).scoreJobTitle('Vice President Marketing')).toBe(20);
      expect((agent as any).scoreJobTitle('Head of Product')).toBe(20);
    });

    it('should score managers at 15 points', () => {
      expect((agent as any).scoreJobTitle('Engineering Manager')).toBe(15);
      expect((agent as any).scoreJobTitle('Team Lead')).toBe(15);
      expect((agent as any).scoreJobTitle('Project Supervisor')).toBe(15);
    });

    it('should score individual contributors at 5 points', () => {
      expect((agent as any).scoreJobTitle('Software Engineer')).toBe(5);
      expect((agent as any).scoreJobTitle('Product Designer')).toBe(5);
      expect((agent as any).scoreJobTitle('Data Analyst')).toBe(5);
    });

    it('should be case-insensitive', () => {
      expect((agent as any).scoreJobTitle('ceo')).toBe(25);
      expect((agent as any).scoreJobTitle('DIRECTOR')).toBe(20);
      expect((agent as any).scoreJobTitle('Manager')).toBe(15);
    });

    it('should return 0 for undefined title', () => {
      expect((agent as any).scoreJobTitle(undefined)).toBe(0);
    });
  });

  describe('lead scoring - engagement', () => {
    it('should score high engagement (email opens >= 3, clicks >= 1, visits >= 2) at 30 points', () => {
      const score = (agent as any).scoreEngagement({
        emailOpens: 5,
        emailClicks: 2,
        websiteVisits: 3,
      });
      expect(score).toBe(30);
    });

    it('should score partial engagement', () => {
      const score = (agent as any).scoreEngagement({
        emailOpens: 4, // 10 points
        emailClicks: 0, // 0 points
        websiteVisits: 1, // 0 points
      });
      expect(score).toBe(10);
    });

    it('should cap score at 30 points', () => {
      const score = (agent as any).scoreEngagement({
        emailOpens: 100,
        emailClicks: 50,
        websiteVisits: 25,
      });
      expect(score).toBe(30);
    });

    it('should return 0 for no engagement', () => {
      const score = (agent as any).scoreEngagement({
        emailOpens: 0,
        emailClicks: 0,
        websiteVisits: 0,
      });
      expect(score).toBe(0);
    });

    it('should return 0 for undefined engagement', () => {
      const score = (agent as any).scoreEngagement(undefined);
      expect(score).toBe(0);
    });
  });

  describe('lead scoring - intent signals', () => {
    it('should score high-intent keywords at 8 points each', () => {
      const score = (agent as any).scoreIntent(['pricing', 'demo']);
      expect(score).toBe(16); // 2 * 8
    });

    it('should cap score at 25 points', () => {
      const score = (agent as any).scoreIntent(['pricing', 'demo', 'trial', 'quote', 'buy']);
      expect(score).toBe(25); // Cap at 25, not 40
    });

    it('should be case-insensitive for intent keywords', () => {
      const score = (agent as any).scoreIntent(['PRICING', 'Demo', 'TRIAL']);
      expect(score).toBe(24); // 3 * 8
    });

    it('should match partial keywords', () => {
      const score = (agent as any).scoreIntent(['looking at pricing options', 'schedule a demo']);
      expect(score).toBe(16); // Both match
    });

    it('should return 0 for no intent signals', () => {
      const score = (agent as any).scoreIntent([]);
      expect(score).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should throw error for unsupported task type', async () => {
      const task: TaskRequest = {
        id: 'task-1',
        type: 'sales.unsupported' as TaskType,
        priority: 1,
        data: {},
        requestedBy: 'test',
        timestamp: new Date(),
      };

      await expect(agent.executeTask(task)).rejects.toThrow(JarvisError);
      await expect(agent.executeTask(task)).rejects.toThrow('Unsupported task type');
    });

    it('should throw error when HubSpot integration not configured', () => {
      expect(() => {
        new SalesAgent({
          id: 'sales-agent',
          name: 'Sales Agent',
          capabilities: [],
          integrations: {}, // No HubSpot
          decisionEngine: mockDecisionEngine,
          memory: mockMemory,
          approvalQueue: mockApprovalQueue,
        });
      }).toThrow(JarvisError);

      expect(() => {
        new SalesAgent({
          id: 'sales-agent',
          name: 'Sales Agent',
          capabilities: [],
          integrations: {},
          decisionEngine: mockDecisionEngine,
          memory: mockMemory,
          approvalQueue: mockApprovalQueue,
        });
      }).toThrow('HubSpot integration required');
    });
  });

  describe('integration scenarios', () => {
    it('should handle full lead qualification workflow', async () => {
      const leadData = {
        id: 'lead-full-123',
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah@skynet.com',
        company: {
          name: 'Skynet Corp',
          size: 2000,
        },
        jobTitle: 'CTO',
        engagement: {
          emailOpens: 10,
          emailClicks: 5,
          websiteVisits: 8,
        },
        intentSignals: ['pricing', 'demo', 'enterprise', 'trial'],
      };

      const qualification = await agent.qualifyLead(leadData);

      // Should be hot lead with high score
      expect(qualification.category).toBe('hot');
      expect(qualification.score).toBeGreaterThan(85);
      expect(qualification.recommendedAction).toBe('immediate_outreach');

      // Should have proper breakdown
      expect(qualification.signals.companySize).toBe(2000);
      expect(qualification.signals.jobTitleMatch).toBe(true);
      expect(qualification.signals.engagementLevel).toBe('high');
      expect(qualification.signals.intentSignals).toHaveLength(4);
    });

    it('should handle outreach -> deal creation pipeline', async () => {
      // 1. Send outreach
      const outreachTask: TaskRequest = {
        id: 'task-outreach',
        type: 'sales.outreach.send' as TaskType,
        priority: 1,
        data: {
          leadId: 'test@example.com',
          channel: 'email',
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const outreachResult = await agent.executeTask(outreachTask);
      expect(outreachResult.success).toBe(true);

      // 2. Create deal
      const dealTask: TaskRequest = {
        id: 'task-deal',
        type: 'sales.deal.create' as TaskType,
        priority: 1,
        data: {
          name: 'Acme Corp Deal',
          amount: 75000,
          stage: 'qualification',
          contactId: 'contact-123',
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const dealResult = await agent.executeTask(dealTask);
      expect(dealResult.success).toBe(true);
      expect(dealResult.data.dealId).toBe('deal-123');

      // 3. Update deal to negotiation
      const updateTask: TaskRequest = {
        id: 'task-update',
        type: 'sales.deal.update' as TaskType,
        priority: 1,
        data: {
          dealId: 'deal-123',
          stage: 'negotiation',
          notes: 'Customer interested, negotiating pricing',
        },
        requestedBy: 'test',
        timestamp: new Date(),
      };

      const updateResult = await agent.executeTask(updateTask);
      expect(updateResult.success).toBe(true);

      // Verify all integrations called
      expect(mockEmail.sendEmail).toHaveBeenCalled();
      expect(mockHubSpot.createDeal).toHaveBeenCalled();
      expect(mockHubSpot.updateDealStage).toHaveBeenCalled();
      expect(mockHubSpot.logActivity).toHaveBeenCalled();
    });
  });
});
