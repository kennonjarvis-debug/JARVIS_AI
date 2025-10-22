import { Request, Response } from 'express';
import { HealthCheckResponse } from '../types';
import { Logger } from '../utils/logger';

const startTime = Date.now();
const version = '1.0.0';

export async function healthCheck(req: Request, res: Response): Promise<void> {
  try {
    const response: HealthCheckResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version,
    };

    Logger.debug('Health check requested', {
      ip: req.ip,
      uptime: response.uptime,
    });

    res.status(200).json(response);
  } catch (error) {
    Logger.error('Health check failed', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version,
    });
  }
}
