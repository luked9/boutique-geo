import { Request, Response } from 'express';
import { logger } from '../lib/logger';

export class HealthController {
  /**
   * GET /api/v1/health
   * Returns health status and version
   */
  async check(req: Request, res: Response) {
    try {
      const healthStatus = {
        ok: true,
        version: '1.0.0',
        time: new Date().toISOString(),
      };

      logger.debug('Health check performed');
      return res.json(healthStatus);
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      return res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
}

export const healthController = new HealthController();
