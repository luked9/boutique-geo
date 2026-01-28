import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './lib/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import router from './routes';
import { landingController } from './controllers/landing.controller';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.NODE_ENV === 'production'
    ? [] // Configure allowed origins in production
    : '*',
  credentials: true,
}));

// Body parsing middleware with raw body capture for webhooks
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    // Capture raw body for webhook signature verification
    if (req.originalUrl?.includes('/square/webhook')) {
      req.rawBody = buf.toString('utf8');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Static files (landing page CSS/JS)
app.use('/static', express.static(path.join(__dirname, 'static')));

// Landing page routes (NFC tap and QR code)
app.get('/tap/:storePublicId', (req, res) => landingController.tapLanding(req, res));
app.get('/r/:sessionPublicId', (req, res) => landingController.sessionLanding(req, res));

// Mount API routes
app.use('/api/v1', router);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(config.PORT, () => {
  logger.info({
    port: config.PORT,
    env: config.NODE_ENV,
    squareEnv: config.SQUARE_ENV,
  }, 'Server started');
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal');

  server.close(async () => {
    logger.info('HTTP server closed');

    // Import prisma here to avoid circular dependency
    const prismaModule = await import('./lib/prisma');
    const prisma = prismaModule.prisma;
    await prisma.$disconnect();
    logger.info('Database connections closed');

    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled promise rejection');
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});

export default app;
