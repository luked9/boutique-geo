import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../lib/logger';
import { config } from '../config';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logger.error({
    error: {
      name: err.name,
      message: err.message,
      stack: config.NODE_ENV === 'development' ? err.stack : undefined,
    },
    method: req.method,
    url: req.url,
  }, 'Unhandled error');

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      res.status(409).json({
        error: 'Resource already exists',
        message: 'A record with this value already exists',
      });
      return;
    }

    // Record not found
    if (err.code === 'P2025') {
      res.status(404).json({
        error: 'Not found',
        message: 'The requested resource was not found',
      });
      return;
    }

    // Foreign key constraint violation
    if (err.code === 'P2003') {
      res.status(400).json({
        error: 'Invalid reference',
        message: 'The referenced resource does not exist',
      });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      error: 'Validation error',
      message: config.NODE_ENV === 'production'
        ? 'Invalid request data'
        : err.message,
    });
    return;
  }

  // Default error response
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    error: 'Internal server error',
    message: config.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  });
}
