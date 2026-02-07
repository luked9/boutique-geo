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

// Initialize Firebase Admin at startup (if configured)
import { getFirebaseAdmin } from './lib/firebase';
getFirebaseAdmin();

const app = express();

// Security middleware - configure for Shopify embedded apps + Firebase Auth
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.shopify.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.shopify.com", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://*.myshopify.com"],
      frameAncestors: ["'self'", "https://*.myshopify.com", "https://admin.shopify.com"],
    },
  },
}));

// CORS configuration
const allowedOrigins: string[] = [];
if (config.NODE_ENV === 'production') {
  allowedOrigins.push(config.APP_BASE_URL);
} else {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
}
app.use(cors({
  origin: config.NODE_ENV === 'production' ? allowedOrigins : '*',
  credentials: true,
}));

// Body parsing middleware with raw body capture for webhooks
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    // Capture raw body for webhook signature verification
    if (req.originalUrl?.includes('/webhook')) {
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

// Shopify app home page (for embedded app view)
app.get('/', async (req, res) => {
  const { shop } = req.query;

  // If this is a Shopify embedded request, serve the Shopify page
  if (shop && typeof shop === 'string') {
    const escapedShop = shop.replace(/[<>]/g, '');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Boutique GEO - Shopify App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
          h1 { color: #333; }
          p { color: #666; line-height: 1.6; }
          .success { color: #008060; font-weight: bold; }
          .card { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>Boutique GEO Installed</h1>
        <p class="success">App installed on ${escapedShop}</p>
        <div class="card">
          <h3>Next Steps</h3>
          <p>To complete the setup and connect your store to Boutique GEO's review system:</p>
          <ol>
            <li>Create a store in our system with your Shopify shop domain</li>
            <li>Configure webhooks in Shopify to send order events to our endpoint</li>
          </ol>
        </div>
        <p><small>Boutique GEO helps you collect more reviews by prompting customers after their purchase.</small></p>
      </body>
      </html>
    `);
    return;
  }

  // In production, serve the React frontend
  const frontendPath = path.join(__dirname, 'frontend', 'index.html');
  res.sendFile(frontendPath, (err) => {
    if (err && !res.headersSent) {
      // Frontend not built or not found — serve API info
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Boutique GEO API</title></head>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1>Boutique GEO API</h1>
          <p>API is running. Use /api/v1 for API endpoints.</p>
        </body>
        </html>
      `);
    }
  });
});

// Mount API routes
app.use('/api/v1', router);

// Serve React frontend static assets (production)
const frontendDir = path.join(__dirname, 'frontend');
app.use(express.static(frontendDir));

// SPA fallback: serve index.html for any unmatched route (React Router handles it)
app.use((req, res, next) => {
  // Don't intercept API routes, landing pages, or static assets
  if (
    req.path.startsWith('/api/') ||
    req.path.startsWith('/tap/') ||
    req.path.startsWith('/r/') ||
    req.path.startsWith('/static/')
  ) {
    return next();
  }

  const indexPath = path.join(frontendDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err && !res.headersSent) {
      // Frontend not available, fall through to 404
      next();
    }
  });
});

// 404 handler (for API routes that don't match)
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
