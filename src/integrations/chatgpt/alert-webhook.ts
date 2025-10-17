/**
 * ChatGPT Alert Webhook Handler
 * Receives and processes system alerts for ChatGPT Custom Actions
 */

import express, { Request, Response } from 'express';
import { ServiceAlert } from '../../core/business-operator.js';

const router = express.Router();

/**
 * POST /api/chatgpt/alerts
 * Receive system alerts from Jarvis
 */
router.post('/alerts', async (req: Request, res: Response) => {
  try {
    const { type, alert } = req.body;

    if (!alert || !alert.service) {
      return res.status(400).json({
        success: false,
        error: 'Invalid alert payload'
      });
    }

    const typedAlert = alert as ServiceAlert;

    // Log alert
    console.log('[ChatGPT Webhook] Received alert:', {
      service: typedAlert.service,
      severity: typedAlert.severity,
      message: typedAlert.message
    });

    // Store alert in memory for ChatGPT to query
    alertStorage.push({
      ...typedAlert,
      receivedAt: new Date().toISOString()
    });

    // Keep only last 100 alerts
    if (alertStorage.length > 100) {
      alertStorage = alertStorage.slice(-100);
    }

    // Return formatted response for ChatGPT
    res.json({
      success: true,
      message: formatAlertForChatGPT(typedAlert),
      alert: typedAlert
    });

  } catch (error) {
    console.error('[ChatGPT Webhook] Error processing alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process alert'
    });
  }
});

/**
 * GET /api/chatgpt/alerts
 * Query recent alerts
 */
router.get('/alerts', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const severity = req.query.severity as string;

  let alerts = alertStorage;

  // Filter by severity if specified
  if (severity && ['info', 'warning', 'critical'].includes(severity)) {
    alerts = alerts.filter(a => a.severity === severity);
  }

  res.json({
    success: true,
    data: alerts.slice(-limit),
    count: alerts.length
  });
});

/**
 * GET /api/chatgpt/alerts/status
 * Get current system status
 */
router.get('/alerts/status', (req: Request, res: Response) => {
  const now = Date.now();
  const lastHour = alertStorage.filter(a =>
    new Date(a.timestamp).getTime() > now - 3600000
  );

  const criticalCount = lastHour.filter(a => a.severity === 'critical').length;
  const warningCount = lastHour.filter(a => a.severity === 'warning').length;

  const status = criticalCount > 0 ? 'critical' :
                 warningCount > 5 ? 'degraded' : 'healthy';

  res.json({
    success: true,
    data: {
      status,
      alertsLastHour: lastHour.length,
      criticalAlerts: criticalCount,
      warningAlerts: warningCount,
      lastAlert: alertStorage.length > 0 ? alertStorage[alertStorage.length - 1] : null
    }
  });
});

/**
 * Format alert for ChatGPT consumption
 */
function formatAlertForChatGPT(alert: ServiceAlert): string {
  const emoji = alert.severity === 'critical' ? '🚨' :
                alert.severity === 'warning' ? '⚠️' : 'ℹ️';

  return `${emoji} Jarvis Alert: ${alert.service}\n` +
         `Severity: ${alert.severity.toUpperCase()}\n` +
         `Message: ${alert.message}\n` +
         `Action: ${alert.action}\n` +
         `Time: ${new Date(alert.timestamp).toLocaleString()}`;
}

// In-memory alert storage (use Redis/database in production)
let alertStorage: Array<ServiceAlert & { receivedAt: string }> = [];

export default router;
