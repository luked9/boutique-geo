import { Request, Response } from 'express';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { squareService } from '../services/square.service';
import { tokenCryptoService } from '../services/tokenCrypto.service';
import { sessionService } from '../services/session.service';
import { auditService } from '../services/audit.service';
import { generateSessionId } from '../utils/ids';
import { config } from '../config';

export class SquareController {
  /**
   * GET /api/v1/square/oauth/start
   * Initiates Square OAuth flow
   */
  async oauthStart(req: Request, res: Response) {
    try {
      const { storePublicId } = req.query;

      if (!storePublicId || typeof storePublicId !== 'string') {
        return res.status(400).json({
          error: 'storePublicId query parameter is required',
        });
      }

      // Verify store exists
      const store = await prisma.store.findUnique({
        where: { publicId: storePublicId },
      });

      if (!store) {
        return res.status(404).json({
          error: 'Store not found',
        });
      }

      // Generate OAuth URL
      const redirectUri = `${config.APP_BASE_URL}/api/v1/square/oauth/callback`;
      const oauthUrl = squareService.getOAuthUrl(storePublicId, redirectUri);

      logger.info({ storePublicId }, 'Redirecting to Square OAuth');

      return res.redirect(oauthUrl);
    } catch (error) {
      logger.error({ error }, 'Failed to start OAuth flow');
      return res.status(500).json({
        error: 'Failed to initiate OAuth',
      });
    }
  }

  /**
   * GET /api/v1/square/oauth/callback
   * Handles Square OAuth callback
   */
  async oauthCallback(req: Request, res: Response) {
    try {
      const { code, state } = req.query;

      if (!code || typeof code !== 'string') {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>OAuth Error</title>
              <style>
                body { font-family: sans-serif; text-align: center; padding: 50px; }
                .error { color: red; }
              </style>
            </head>
            <body>
              <h1 class="error">OAuth Error</h1>
              <p>Authorization code is missing.</p>
            </body>
          </html>
        `);
      }

      if (!state || typeof state !== 'string') {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>OAuth Error</title>
              <style>
                body { font-family: sans-serif; text-align: center; padding: 50px; }
                .error { color: red; }
              </style>
            </head>
            <body>
              <h1 class="error">OAuth Error</h1>
              <p>State parameter is missing.</p>
            </body>
          </html>
        `);
      }

      // Decode state
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      const { storePublicId } = stateData;

      // Find store
      const store = await prisma.store.findUnique({
        where: { publicId: storePublicId },
      });

      if (!store) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>OAuth Error</title>
              <style>
                body { font-family: sans-serif; text-align: center; padding: 50px; }
                .error { color: red; }
              </style>
            </head>
            <body>
              <h1 class="error">OAuth Error</h1>
              <p>Store not found.</p>
            </body>
          </html>
        `);
      }

      // Exchange code for tokens
      const tokenResponse = await squareService.exchangeCodeForTokens(code);

      // Get merchant profile
      const merchantProfile = await squareService.getMerchantProfile(
        tokenResponse.accessToken
      );

      // Encrypt tokens
      const accessTokenEnc = tokenCryptoService.encrypt(tokenResponse.accessToken);
      const refreshTokenEnc = tokenCryptoService.encrypt(tokenResponse.refreshToken);

      // Update store
      await prisma.store.update({
        where: { id: store.id },
        data: {
          squareMerchantId: merchantProfile.merchantId,
          accessTokenEnc,
          refreshTokenEnc,
          tokenExpiresAt: tokenResponse.expiresAt,
        },
      });

      logger.info(
        { storeId: store.id, merchantId: merchantProfile.merchantId },
        'Square OAuth completed successfully'
      );

      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connected to Square</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 50px; }
              .success { color: green; }
              h1 { margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <h1 class="success">✓ Connected to Square</h1>
            <p>Your store has been successfully connected to Square.</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error) {
      logger.error({ error }, 'OAuth callback failed');
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>OAuth Error</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 50px; }
              .error { color: red; }
            </style>
          </head>
          <body>
            <h1 class="error">OAuth Error</h1>
            <p>Failed to complete authorization.</p>
            <p>Please try again.</p>
          </body>
        </html>
      `);
    }
  }

  /**
   * POST /api/v1/square/webhook
   * Handles Square webhook events
   */
  async webhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-square-hmacsha256-signature'] as string;
      const webhookUrl = `${config.APP_BASE_URL}/api/v1/square/webhook`;

      if (!signature) {
        logger.warn('Webhook signature missing');
        return res.status(401).json({
          error: 'Signature missing',
        });
      }

      // Verify webhook signature using raw body
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const isValid = this.verifyWebhookSignature(rawBody, signature, webhookUrl);

      if (!isValid) {
        logger.warn('Webhook signature verification failed');
        return res.status(401).json({
          error: 'Invalid signature',
        });
      }

      const event = req.body;
      const eventType = event.type;

      logger.info({ eventType }, 'Received Square webhook');

      // Handle payment events
      if (eventType === 'payment.updated' || eventType === 'payment.created' || eventType === 'payment.completed') {
        await this.handlePaymentEvent(event);
      }

      return res.json({ ok: true });
    } catch (error) {
      logger.error({ error }, 'Webhook processing failed');
      return res.status(500).json({
        error: 'Webhook processing failed',
      });
    }
  }

  /**
   * Verify Square webhook signature
   */
  private verifyWebhookSignature(
    body: string,
    signature: string,
    url: string
  ): boolean {
    try {
      const payload = url + body;
      const hmac = crypto.createHmac('sha256', config.SQUARE_WEBHOOK_SIGNATURE_KEY);
      hmac.update(payload);
      const expectedSignature = hmac.digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error({ error }, 'Signature verification error');
      return false;
    }
  }

  /**
   * Handle payment webhook events (created, updated, completed)
   */
  private async handlePaymentEvent(event: any) {
    try {
      const payment = event.data?.object?.payment;

      if (!payment) {
        logger.warn('Payment data missing from webhook');
        return;
      }

      const { order_id: orderId, location_id: locationId, status } = payment;

      if (status !== 'COMPLETED') {
        logger.debug({ status }, 'Payment not completed, skipping');
        return;
      }

      // Find store by location ID
      const store = await prisma.store.findFirst({
        where: { squareLocationId: locationId },
      });

      if (!store) {
        logger.warn({ locationId }, 'Store not found for location');
        return;
      }

      // Check if order already exists
      const existingOrder = await prisma.order.findUnique({
        where: { squareOrderId: orderId },
      });

      if (existingOrder) {
        logger.debug({ orderId }, 'Order already processed');
        return;
      }

      // Fetch order details from Square
      if (!store.accessTokenEnc) {
        logger.error({ storeId: store.id }, 'Store has no access token');
        return;
      }

      const accessToken = tokenCryptoService.decrypt(store.accessTokenEnc);
      const orderDetails = await squareService.getOrder(accessToken, orderId);

      // Create order in database
      const order = await prisma.order.create({
        data: {
          storeId: store.id,
          squareOrderId: orderDetails.id,
          totalAmount: orderDetails.totalAmount,
          currency: orderDetails.currency,
          lineItemsJson: orderDetails.lineItems as unknown as Prisma.InputJsonValue,
        },
      });

      // Create pending review session
      const publicId = generateSessionId();
      const session = await prisma.reviewSession.create({
        data: {
          publicId,
          storeId: store.id,
          orderId: order.id,
          status: 'PENDING',
        },
      });

      // Log audit event
      await auditService.logEvent(
        store.id,
        'SESSION_CREATED',
        { orderId: order.id },
        session.id
      );

      logger.info(
        {
          storeId: store.id,
          orderId: order.id,
          sessionId: session.id,
          sessionPublicId: publicId,
        },
        'Created order and pending review session from webhook'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to handle payment event');
    }
  }
}

export const squareController = new SquareController();
