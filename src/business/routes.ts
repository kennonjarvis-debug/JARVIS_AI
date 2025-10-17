/**
 * Business Assistant API Routes
 *
 * RESTful API endpoints for all business modules:
 * - /api/v1/marketing/*
 * - /api/v1/crm/*
 * - /api/v1/support/*
 * - /api/v1/analytics/*
 * - /api/v1/automation/*
 */

import { Router, Request, Response } from 'express';
import { getBusinessAssistant } from './index.js';
import { logger } from '../utils/structured-logger.js';

const router = Router();

/**
 * Middleware to check if Business Assistant is initialized
 */
const requireBusinessAssistant = (req: Request, res: Response, next: any) => {
  try {
    getBusinessAssistant();
    next();
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Business Assistant not initialized'
    });
  }
};

router.use(requireBusinessAssistant);

// =============================================================================
// MARKETING ROUTES
// =============================================================================

/**
 * List all marketing campaigns
 */
router.get('/marketing/campaigns', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const marketing = assistant.getMarketingService();

    if (!marketing) {
      return res.status(404).json({ success: false, error: 'Marketing service not enabled' });
    }

    const { status, platform, type } = req.query;

    const campaigns = await marketing.listCampaigns({
      status: status as any,
      platform: platform as any,
      type: type as any
    });

    res.json({ success: true, data: campaigns });
  } catch (error) {
    logger.error('Failed to list campaigns', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to list campaigns' });
  }
});

/**
 * Create marketing campaign
 */
router.post('/marketing/campaigns', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const marketing = assistant.getMarketingService();

    if (!marketing) {
      return res.status(404).json({ success: false, error: 'Marketing service not enabled' });
    }

    const campaign = await marketing.createCampaign(req.body);

    res.json({ success: true, data: campaign });
  } catch (error) {
    logger.error('Failed to create campaign', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
});

/**
 * Get campaign by ID
 */
router.get('/marketing/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const marketing = assistant.getMarketingService();

    if (!marketing) {
      return res.status(404).json({ success: false, error: 'Marketing service not enabled' });
    }

    const campaign = await marketing.getCampaign(req.params.id);

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    res.json({ success: true, data: campaign });
  } catch (error) {
    logger.error('Failed to get campaign', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to get campaign' });
  }
});

/**
 * Update campaign
 */
router.put('/marketing/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const marketing = assistant.getMarketingService();

    if (!marketing) {
      return res.status(404).json({ success: false, error: 'Marketing service not enabled' });
    }

    const campaign = await marketing.updateCampaign(req.params.id, req.body);

    res.json({ success: true, data: campaign });
  } catch (error) {
    logger.error('Failed to update campaign', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to update campaign' });
  }
});

/**
 * Get campaign insights
 */
router.get('/marketing/insights/:id', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const marketing = assistant.getMarketingService();

    if (!marketing) {
      return res.status(404).json({ success: false, error: 'Marketing service not enabled' });
    }

    const insights = await marketing.getInsights(req.params.id);

    res.json({ success: true, data: insights });
  } catch (error) {
    logger.error('Failed to get insights', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to get insights' });
  }
});

/**
 * Get marketing metrics summary
 */
router.get('/marketing/metrics', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const marketing = assistant.getMarketingService();

    if (!marketing) {
      return res.status(404).json({ success: false, error: 'Marketing service not enabled' });
    }

    const metrics = await marketing.getMetricsSummary();

    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Failed to get metrics', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to get metrics' });
  }
});

// =============================================================================
// CRM ROUTES
// =============================================================================

/**
 * List leads
 */
router.get('/crm/leads', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const crm = assistant.getCRMService();

    if (!crm) {
      return res.status(404).json({ success: false, error: 'CRM service not enabled' });
    }

    const { status, source, minValue } = req.query;

    const leads = await crm.listLeads({
      status: status as any,
      source: source as string,
      minValue: minValue ? parseFloat(minValue as string) : undefined
    });

    res.json({ success: true, data: leads });
  } catch (error) {
    logger.error('Failed to list leads', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to list leads' });
  }
});

/**
 * Create lead
 */
router.post('/crm/leads', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const crm = assistant.getCRMService();

    if (!crm) {
      return res.status(404).json({ success: false, error: 'CRM service not enabled' });
    }

    const lead = await crm.createLead(req.body);

    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error('Failed to create lead', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to create lead' });
  }
});

/**
 * Get lead by ID
 */
router.get('/crm/leads/:id', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const crm = assistant.getCRMService();

    if (!crm) {
      return res.status(404).json({ success: false, error: 'CRM service not enabled' });
    }

    const lead = await crm.getLead(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error('Failed to get lead', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to get lead' });
  }
});

/**
 * Update lead
 */
router.put('/crm/leads/:id', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const crm = assistant.getCRMService();

    if (!crm) {
      return res.status(404).json({ success: false, error: 'CRM service not enabled' });
    }

    const lead = await crm.updateLead(req.params.id, req.body);

    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error('Failed to update lead', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to update lead' });
  }
});

/**
 * Enrich lead with AI
 */
router.post('/crm/leads/:id/enrich', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const crm = assistant.getCRMService();

    if (!crm) {
      return res.status(404).json({ success: false, error: 'CRM service not enabled' });
    }

    const lead = await crm.enrichLead(req.params.id);

    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error('Failed to enrich lead', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to enrich lead' });
  }
});

/**
 * Get CRM statistics
 */
router.get('/crm/stats', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const crm = assistant.getCRMService();

    if (!crm) {
      return res.status(404).json({ success: false, error: 'CRM service not enabled' });
    }

    const stats = await crm.getStats();

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to get CRM stats', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to get CRM stats' });
  }
});

// =============================================================================
// SUPPORT ROUTES
// =============================================================================

/**
 * List support tickets
 */
router.get('/support/tickets', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const support = assistant.getSupportService();

    if (!support) {
      return res.status(404).json({ success: false, error: 'Support service not enabled' });
    }

    const { status, priority, customerId } = req.query;

    const tickets = await support.listTickets({
      status: status as any,
      priority: priority as any,
      customerId: customerId as string
    });

    res.json({ success: true, data: tickets });
  } catch (error) {
    logger.error('Failed to list tickets', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to list tickets' });
  }
});

/**
 * Create support ticket
 */
router.post('/support/tickets', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const support = assistant.getSupportService();

    if (!support) {
      return res.status(404).json({ success: false, error: 'Support service not enabled' });
    }

    const ticket = await support.createTicket(req.body);

    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error('Failed to create ticket', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to create ticket' });
  }
});

/**
 * Get ticket by ID
 */
router.get('/support/tickets/:id', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const support = assistant.getSupportService();

    if (!support) {
      return res.status(404).json({ success: false, error: 'Support service not enabled' });
    }

    const ticket = await support.getTicket(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error('Failed to get ticket', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to get ticket' });
  }
});

/**
 * Update ticket
 */
router.put('/support/tickets/:id', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const support = assistant.getSupportService();

    if (!support) {
      return res.status(404).json({ success: false, error: 'Support service not enabled' });
    }

    const ticket = await support.updateTicket(req.params.id, req.body);

    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error('Failed to update ticket', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to update ticket' });
  }
});

/**
 * Analyze ticket sentiment
 */
router.post('/support/tickets/:id/analyze', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const support = assistant.getSupportService();

    if (!support) {
      return res.status(404).json({ success: false, error: 'Support service not enabled' });
    }

    const ticket = await support.analyzeSentiment(req.params.id);

    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error('Failed to analyze sentiment', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to analyze sentiment' });
  }
});

/**
 * Get AI-suggested response
 */
router.post('/support/tickets/:id/suggest', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const support = assistant.getSupportService();

    if (!support) {
      return res.status(404).json({ success: false, error: 'Support service not enabled' });
    }

    const ticket = await support.suggestResponse(req.params.id);

    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error('Failed to suggest response', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to suggest response' });
  }
});

/**
 * Get support insights
 */
router.get('/support/insights', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const support = assistant.getSupportService();

    if (!support) {
      return res.status(404).json({ success: false, error: 'Support service not enabled' });
    }

    const insights = await support.getInsights();

    res.json({ success: true, data: insights });
  } catch (error) {
    logger.error('Failed to get support insights', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to get support insights' });
  }
});

// =============================================================================
// ANALYTICS ROUTES
// =============================================================================

/**
 * Get business overview
 */
router.get('/analytics/overview', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const analytics = assistant.getAnalyticsService();

    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Analytics service not enabled' });
    }

    const { start, end } = req.query;

    const timeframe = {
      start: start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end as string) : new Date()
    };

    const overview = await analytics.getOverview(timeframe);

    res.json({ success: true, data: overview });
  } catch (error) {
    logger.error('Failed to get analytics overview', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to get analytics overview' });
  }
});

/**
 * Analyze trend for specific metric
 */
router.get('/analytics/trends/:metric', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const analytics = assistant.getAnalyticsService();

    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Analytics service not enabled' });
    }

    const { metric } = req.params;

    // Current period: last 30 days
    const currentEnd = new Date();
    const currentStart = new Date(currentEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Previous period: 30 days before that
    const previousEnd = currentStart;
    const previousStart = new Date(previousEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

    const trend = await analytics.analyzeTrend(
      metric,
      { start: currentStart, end: currentEnd },
      { start: previousStart, end: previousEnd }
    );

    res.json({ success: true, data: trend });
  } catch (error) {
    logger.error('Failed to analyze trend', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to analyze trend' });
  }
});

/**
 * Get historical snapshots
 */
router.get('/analytics/snapshots', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const analytics = assistant.getAnalyticsService();

    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Analytics service not enabled' });
    }

    const { limit } = req.query;

    const snapshots = await analytics.getSnapshots(limit ? parseInt(limit as string) : 10);

    res.json({ success: true, data: snapshots });
  } catch (error) {
    logger.error('Failed to get snapshots', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to get snapshots' });
  }
});

/**
 * Detect metric anomalies
 */
router.get('/analytics/anomalies', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const analytics = assistant.getAnalyticsService();

    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Analytics service not enabled' });
    }

    const anomalies = await analytics.detectAnomalies();

    res.json({ success: true, data: anomalies });
  } catch (error) {
    logger.error('Failed to detect anomalies', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to detect anomalies' });
  }
});

// =============================================================================
// AUTOMATION ROUTES
// =============================================================================

/**
 * List automations
 */
router.get('/automation/list', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const automation = assistant.getAutomationEngine();

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automation engine not enabled' });
    }

    const { enabled } = req.query;

    const automations = await automation.listAutomations({
      enabled: enabled !== undefined ? enabled === 'true' : undefined
    });

    res.json({ success: true, data: automations });
  } catch (error) {
    logger.error('Failed to list automations', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to list automations' });
  }
});

/**
 * Create automation
 */
router.post('/automation/create', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const automation = assistant.getAutomationEngine();

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automation engine not enabled' });
    }

    const created = await automation.createAutomation(req.body);

    res.json({ success: true, data: created });
  } catch (error) {
    logger.error('Failed to create automation', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to create automation' });
  }
});

/**
 * Get automation by ID
 */
router.get('/automation/:id', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const automation = assistant.getAutomationEngine();

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automation engine not enabled' });
    }

    const result = await automation.getAutomation(req.params.id);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Automation not found' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to get automation', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to get automation' });
  }
});

/**
 * Update automation
 */
router.put('/automation/:id', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const automation = assistant.getAutomationEngine();

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automation engine not enabled' });
    }

    const updated = await automation.updateAutomation(req.params.id, req.body);

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Failed to update automation', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to update automation' });
  }
});

/**
 * Manually trigger automation
 */
router.post('/automation/:id/run', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const automation = assistant.getAutomationEngine();

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automation engine not enabled' });
    }

    const result = await automation.runAutomation(req.params.id, req.body.context || {});

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to run automation', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to run automation' });
  }
});

/**
 * Get automation execution logs
 */
router.get('/automation/:id/logs', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const automation = assistant.getAutomationEngine();

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automation engine not enabled' });
    }

    const { limit } = req.query;

    const logs = await automation.getExecutionLogs(
      req.params.id,
      limit ? parseInt(limit as string) : 50
    );

    res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('Failed to get automation logs', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to get automation logs' });
  }
});

// =============================================================================
// HEALTH & STATUS
// =============================================================================

/**
 * Get Business Assistant health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const assistant = getBusinessAssistant();
    const health = await assistant.getHealth();

    res.json({ success: true, data: health });
  } catch (error) {
    logger.error('Failed to get health status', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({ success: false, error: 'Failed to get health status' });
  }
});

export default router;
