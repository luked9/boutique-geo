import { Request, Response } from 'express';
import { POSProvider } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { providerRegistry, OAuthState } from '../providers';
import { posConnectionService } from '../services/posConnection.service';
import { webhookService } from '../services/webhook.service';
import { config } from '../config';

/**
 * Get webhook secret for a provider from config
 */
function getWebhookSecret(provider: POSProvider): string {
  switch (provider) {
    case 'SQUARE':
      return config.SQUARE_WEBHOOK_SIGNATURE_KEY || '';
    case 'SHOPIFY':
      // Will be added when Shopify is configured
      return (config as any).SHOPIFY_WEBHOOK_SECRET || '';
    case 'LIGHTSPEED':
      return (config as any).LIGHTSPEED_WEBHOOK_SECRET || '';
    case 'TOAST':
      return (config as any).TOAST_WEBHOOK_SECRET || '';
    default:
      throw new Error(`No webhook secret configured for provider: ${provider}`);
  }
}

/**
 * Unified POS Controller for multi-provider support
 */
export class POSController {
  /**
   * GET /api/v1/pos/oauth/:provider/start
   * Initiates OAuth flow for any supported provider
   */
  async oauthStart(req: Request, res: Response) {
    try {
      const provider = req.params.provider?.toUpperCase();
      const { storePublicId, shop } = req.query;

      // Validate provider
      if (!provider || !providerRegistry.isSupported(provider)) {
        return res.status(400).json({
          error: `Unsupported provider: ${provider}`,
          supportedProviders: providerRegistry.getSupportedTypes(),
        });
      }

      if (!storePublicId || typeof storePublicId !== 'string') {
        return res.status(400).json({
          error: 'storePublicId query parameter is required',
        });
      }

      // Shopify requires the shop domain
      if (provider === 'SHOPIFY' && (!shop || typeof shop !== 'string')) {
        return res.status(400).json({
          error: 'shop query parameter is required for Shopify (e.g., shop=mystore.myshopify.com)',
        });
      }

      // Verify store exists
      const store = await prisma.store.findUnique({
        where: { publicId: storePublicId },
      });

      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      const providerImpl = providerRegistry.get(provider as POSProvider);
      const redirectUri = `${config.APP_BASE_URL}/api/v1/pos/oauth/${provider}/callback`;

      // For Shopify, include shop in the state so we can use it in the callback
      const shopDomain = shop as string | undefined;

      // Pass shop domain for Shopify
      const oauthUrl = providerImpl.getOAuthUrl(storePublicId, redirectUri, { shop: shopDomain });

      logger.info({ storePublicId, provider, shop: shopDomain }, 'Redirecting to provider OAuth');

      return res.redirect(oauthUrl);
    } catch (error) {
      logger.error({ error }, 'Failed to start OAuth flow');
      return res.status(500).json({ error: 'Failed to initiate OAuth' });
    }
  }

  /**
   * GET /api/v1/pos/oauth/:provider/callback
   * Handles OAuth callback for any supported provider
   */
  async oauthCallback(req: Request, res: Response) {
    try {
      const provider = req.params.provider?.toUpperCase();
      const { code, state, error: oauthError, error_description } = req.query;

      if (!provider) {
        return this.renderError(res, 'Provider is required');
      }

      // Check for OAuth error response
      if (oauthError) {
        logger.warn({ provider, oauthError, error_description }, 'OAuth error from provider');
        return this.renderError(res, `Authorization failed: ${error_description || oauthError}`);
      }

      if (!code || typeof code !== 'string') {
        return this.renderError(res, 'Authorization code is missing');
      }

      if (!state || typeof state !== 'string') {
        return this.renderError(res, 'State parameter is missing');
      }

      // Decode state
      let stateData: OAuthState & { shopDomain?: string; frontendRedirectUrl?: string };
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      } catch {
        return this.renderError(res, 'Invalid state parameter');
      }

      const { storePublicId, shopDomain } = stateData;

      // Verify provider matches
      if (stateData.provider !== provider) {
        return this.renderError(res, 'Provider mismatch in state');
      }

      // Find store
      const store = await prisma.store.findUnique({
        where: { publicId: storePublicId },
      });

      if (!store) {
        return this.renderError(res, 'Store not found');
      }

      const providerImpl = providerRegistry.get(provider as POSProvider);
      const redirectUri = `${config.APP_BASE_URL}/api/v1/pos/oauth/${provider}/callback`;

      // For Shopify, also get shop from query params (Shopify sends it in callback)
      const shopFromQuery = req.query.shop as string | undefined;
      const shop = shopDomain || shopFromQuery;

      // Exchange code for tokens (pass shop for Shopify)
      const tokens = await providerImpl.exchangeCodeForTokens(code, redirectUri, { shop });

      // Get shop domain from tokens additionalData if available (Shopify returns it)
      const additionalData = tokens.additionalData as { shopDomain?: string } | undefined;
      const shopForMerchantInfo = additionalData?.shopDomain || shop;

      // Get merchant info (pass shop for Shopify)
      const merchantInfo = await providerImpl.getMerchantInfo(tokens.accessToken, { shop: shopForMerchantInfo });

      // Create/update POS connection
      const connection = await posConnectionService.upsertConnection(
        store.id,
        provider as POSProvider,
        {
          merchantId: merchantInfo.merchantId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          providerMetadata: {
            businessName: merchantInfo.businessName,
            locations: merchantInfo.locations,
          },
        }
      );

      // Also update legacy Square fields for backwards compatibility
      if (provider === 'SQUARE') {
        await prisma.store.update({
          where: { id: store.id },
          data: {
            squareMerchantId: merchantInfo.merchantId,
          },
        });
      }

      // Register webhooks for Shopify
      if (provider === 'SHOPIFY' && shopForMerchantInfo) {
        const webhookUrl = `${config.APP_BASE_URL}/api/v1/pos/webhook/SHOPIFY`;
        const { shopifyProvider } = await import('../providers/shopify/shopify.provider');
        await shopifyProvider.registerWebhooks(tokens.accessToken, shopForMerchantInfo, webhookUrl);
      }

      logger.info(
        { storeId: store.id, provider, merchantId: merchantInfo.merchantId, connectionId: connection.id },
        'POS OAuth completed successfully'
      );

      // If the OAuth was initiated from the frontend, redirect back
      if (stateData.frontendRedirectUrl) {
        const redirectUrl = new URL(stateData.frontendRedirectUrl);
        redirectUrl.searchParams.set('status', 'success');
        redirectUrl.searchParams.set('provider', provider);
        return res.redirect(redirectUrl.toString());
      }

      return this.renderSuccess(res, provider, merchantInfo.businessName);
    } catch (error) {
      logger.error({ error }, 'OAuth callback failed');

      // Try to redirect errors back to frontend if state contains frontendRedirectUrl
      try {
        const rawState = req.query.state;
        if (rawState && typeof rawState === 'string') {
          const stateObj = JSON.parse(Buffer.from(rawState, 'base64').toString('utf-8'));
          if (stateObj.frontendRedirectUrl) {
            const redirectUrl = new URL(stateObj.frontendRedirectUrl);
            redirectUrl.searchParams.set('status', 'error');
            redirectUrl.searchParams.set('message', 'Failed to complete authorization. Please try again.');
            return res.redirect(redirectUrl.toString());
          }
        }
      } catch {
        // State parsing failed, fall through to HTML error
      }

      return this.renderError(res, 'Failed to complete authorization. Please try again.');
    }
  }

  /**
   * POST /api/v1/pos/webhook/:provider
   * Handles webhooks from any supported provider
   */
  async webhook(req: Request, res: Response) {
    try {
      const provider = req.params.provider?.toUpperCase();

      if (!provider || !providerRegistry.isSupported(provider)) {
        return res.status(400).json({ error: 'Unsupported provider' });
      }

      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const webhookSecret = getWebhookSecret(provider as POSProvider);

      if (!webhookSecret) {
        logger.error({ provider }, 'No webhook secret configured for provider');
        return res.status(500).json({ error: 'Provider not configured' });
      }

      // Build headers object with lowercase keys
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') {
          headers[key.toLowerCase()] = value;
        }
      }

      // Add notification URL for Square compatibility
      headers['x-notification-url'] = `${config.APP_BASE_URL}${req.originalUrl}`;

      const result = await webhookService.processWebhook(
        provider as POSProvider,
        rawBody,
        headers,
        webhookSecret
      );

      return res.json({ ok: result.success, eventId: result.eventId, message: result.message });
    } catch (error) {
      logger.error({ error }, 'Webhook processing failed');
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * GET /api/v1/pos/connections/:storePublicId
   * Lists all active POS connections for a store
   */
  async listConnections(req: Request, res: Response) {
    try {
      const { storePublicId } = req.params;

      const store = await prisma.store.findUnique({
        where: { publicId: storePublicId },
      });

      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      const connections = await posConnectionService.listForStore(store.id);

      // Don't expose encrypted tokens
      const sanitized = connections.map((conn) => ({
        id: conn.id,
        provider: conn.provider,
        merchantId: conn.merchantId,
        locationId: conn.locationId,
        isActive: conn.isActive,
        hasAccessToken: !!conn.accessTokenEnc,
        tokenExpiresAt: conn.tokenExpiresAt,
        providerMetadata: conn.providerMetadata,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      }));

      return res.json({ connections: sanitized });
    } catch (error) {
      logger.error({ error }, 'Failed to list connections');
      return res.status(500).json({ error: 'Failed to list connections' });
    }
  }

  /**
   * DELETE /api/v1/pos/connections/:storePublicId/:provider
   * Disconnects a provider from a store
   */
  async disconnect(req: Request, res: Response) {
    try {
      const { storePublicId } = req.params;
      const provider = req.params.provider?.toUpperCase();

      if (!provider || !providerRegistry.isSupported(provider)) {
        return res.status(400).json({ error: 'Unsupported provider' });
      }

      const store = await prisma.store.findUnique({
        where: { publicId: storePublicId },
      });

      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      await posConnectionService.disconnect(store.id, provider as POSProvider);

      logger.info({ storePublicId, provider }, 'Disconnected POS provider');

      return res.json({ ok: true, message: `Disconnected from ${provider}` });
    } catch (error) {
      logger.error({ error }, 'Failed to disconnect provider');
      return res.status(500).json({ error: 'Failed to disconnect' });
    }
  }

  /**
   * PATCH /api/v1/pos/connections/:storePublicId/:provider/location
   * Updates the location ID for a connection
   */
  async setLocation(req: Request, res: Response) {
    try {
      const { storePublicId } = req.params;
      const provider = req.params.provider?.toUpperCase();
      const { locationId } = req.body;

      if (!locationId || typeof locationId !== 'string') {
        return res.status(400).json({ error: 'locationId is required' });
      }

      if (!provider || !providerRegistry.isSupported(provider)) {
        return res.status(400).json({ error: 'Unsupported provider' });
      }

      const store = await prisma.store.findUnique({
        where: { publicId: storePublicId },
      });

      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      const connection = await posConnectionService.getForStore(store.id, provider as POSProvider);

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      await posConnectionService.setLocationId(connection.id, locationId);

      // Also update legacy Square field for backwards compatibility
      if (provider === 'SQUARE') {
        await prisma.store.update({
          where: { id: store.id },
          data: { squareLocationId: locationId },
        });
      }

      logger.info({ storePublicId, provider, locationId }, 'Updated location ID');

      return res.json({ ok: true, message: 'Location updated' });
    } catch (error) {
      logger.error({ error }, 'Failed to update location');
      return res.status(500).json({ error: 'Failed to update location' });
    }
  }

  /**
   * Render success HTML page
   */
  private renderSuccess(res: Response, provider: string, businessName?: string): void {
    const providerName = provider.charAt(0) + provider.slice(1).toLowerCase();
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connected to ${providerName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
            .success { color: #22c55e; font-size: 48px; margin-bottom: 16px; }
            h1 { margin: 0 0 12px; color: #1f2937; }
            p { color: #6b7280; margin: 8px 0; }
            .business { font-weight: 600; color: #374151; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="success">✓</div>
            <h1>Connected to ${providerName}</h1>
            ${businessName ? `<p class="business">${businessName}</p>` : ''}
            <p>Your store has been successfully connected.</p>
            <p>You can close this window.</p>
          </div>
        </body>
      </html>
    `);
  }

  /**
   * Render error HTML page
   */
  private renderError(res: Response, message: string): void {
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
            .error { color: #ef4444; font-size: 48px; margin-bottom: 16px; }
            h1 { margin: 0 0 12px; color: #1f2937; }
            p { color: #6b7280; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="error">✕</div>
            <h1>Connection Error</h1>
            <p>${message}</p>
            <p>Please try again or contact support.</p>
          </div>
        </body>
      </html>
    `);
  }
}

export const posController = new POSController();
