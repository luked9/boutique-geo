import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Log request
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  }, `${req.method} ${req.url}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    }, `${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  });

  next();
}
