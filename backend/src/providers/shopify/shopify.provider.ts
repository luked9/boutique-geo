import crypto from 'crypto';
import { POSProvider } from '@prisma/client';
import { BasePOSProvider } from '../base.provider';
import {
  OAuthTokens,
  MerchantInfo,
  NormalizedOrder,
  NormalizedTransaction,
  WebhookValidationResult,
} from '../types';
import { shopifyConfig } from './shopify.config';

/**
 * Shopify POS provider implementation
 *
 * Shopify OAuth flow:
 * 1. Redirect to https://{shop}.myshopify.com/admin/oauth/authorize
 * 2. User authorizes, redirected back with code
 * 3. Exchange code for permanent access token
 *
 * Note: Shopify access tokens don't expire (permanent tokens)
 */
export class ShopifyProvider extends BasePOSProvider {
  readonly providerType = POSProvider.SHOPIFY;

  constructor() {
    super();
    this.logInfo('ShopifyProvider initialized');
  }

  /**
   * Generates Shopify OAuth URL
   * Shopify requires the shop domain to construct the correct OAuth URL
   */
  getOAuthUrl(storePublicId: string, redirectUri: string, options?: { shop?: string }): string {
    const shop = options?.shop;
    if (!shop) {
      throw new Error('Shop domain is required for Shopify OAuth');
    }

    // Normalize shop domain (remove protocol if present, ensure .myshopify.com)
    let shopDomain = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!shopDomain.includes('.myshopify.com')) {
      shopDomain = `${shopDomain}.myshopify.com`;
    }

    // State contains our store reference AND shop domain for the callback
    const state = Buffer.from(
      JSON.stringify({
        storePublicId,
        provider: this.providerType,
        timestamp: Date.now(),
        shopDomain, // Include shop domain so we can use it in the callback
      })
    ).toString('base64');

    const params = new URLSearchParams({
      client_id: shopifyConfig.clientId,
      scope: shopifyConfig.scopes,
      redirect_uri: redirectUri,
      state,
    });

    // Use the shop-specific OAuth URL
    const url = `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;

    this.logDebug('Generated OAuth URL', { storePublicId, shopDomain, redirectUri });
    return url;
  }

  /**
   * Exchanges OAuth code for access token
   * Shopify tokens are permanent (no refresh token)
   */
  async exchangeCodeForTokens(code: string, _redirectUri: string, options?: { shop?: string }): Promise<OAuthTokens> {
    try {
      // Get shop domain from options (passed from state or query params)
      let shopDomain = options?.shop;

      if (!shopDomain) {
        throw new Error('Shop domain is required for Shopify OAuth');
      }

      // Normalize shop domain
      shopDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (!shopDomain.includes('.myshopify.com')) {
        shopDomain = `${shopDomain}.myshopify.com`;
      }

      const response = await fetch(
        `https://${shopDomain}/admin/oauth/access_token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: shopifyConfig.clientId,
            client_secret: shopifyConfig.clientSecret,
            code,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify OAuth error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as { access_token?: string; scope?: string };

      if (!data.access_token) {
        throw new Error('Missing access token in Shopify OAuth response');
      }

      this.logInfo('Successfully exchanged OAuth code for tokens', { shopDomain });

      // Shopify tokens don't expire
      return {
        accessToken: data.access_token,
        // No refresh token for Shopify
        additionalData: {
          scope: data.scope || '',
          shopDomain,
        },
      };
    } catch (error) {
      this.logError('Failed to exchange OAuth code', error);
      throw new Error('Failed to exchange OAuth code for tokens');
    }
  }

  /**
   * Shopify tokens don't expire, so this throws
   */
  async refreshTokens(_refreshToken: string): Promise<OAuthTokens> {
    throw new Error('Shopify access tokens are permanent and do not require refresh');
  }

  /**
   * Shopify tokens never need refresh
   */
  override needsTokenRefresh(_expiresAt: Date | null): boolean {
    return false;
  }

  /**
   * Fetches shop information from Shopify
   */
  async getMerchantInfo(accessToken: string, options?: { shop?: string }): Promise<MerchantInfo> {
    try {
      // Get shop domain from options
      let shopDomain = options?.shop;
      if (!shopDomain) {
        throw new Error('Shop domain is required for Shopify API calls');
      }
      // Normalize shop domain
      shopDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (!shopDomain.includes('.myshopify.com')) {
        shopDomain = `${shopDomain}.myshopify.com`;
      }

      const response = await fetch(
        `https://${shopDomain}/admin/api/${shopifyConfig.apiVersion}/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      interface ShopifyShop {
        id: number;
        name?: string;
        domain?: string;
      }

      const data = (await response.json()) as { shop: ShopifyShop };
      const shop = data.shop;

      this.logInfo('Retrieved shop info', { shopId: shop.id, shopDomain });

      return {
        merchantId: String(shop.id),
        businessName: shop.name || shop.domain || 'Unknown',
        locations: [
          {
            id: String(shop.id), // Shopify uses shop ID as default location for online
            name: shop.name || 'Online Store',
          },
        ],
      };
    } catch (error) {
      this.logError('Failed to fetch shop info', error);
      throw new Error('Failed to fetch merchant profile');
    }
  }

  /**
   * Fetches order details from Shopify
   */
  async getOrder(accessToken: string, orderId: string): Promise<NormalizedOrder> {
    try {
      const shopDomain = this.extractShopFromToken(accessToken);

      const response = await fetch(
        `https://${shopDomain}/admin/api/${shopifyConfig.apiVersion}/orders/${orderId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      interface ShopifyLineItem {
        title?: string;
        name?: string;
        quantity?: number;
        price?: string;
      }

      interface ShopifyOrder {
        id: number;
        total_price?: string;
        currency?: string;
        created_at?: string;
        line_items?: ShopifyLineItem[];
      }

      const data = (await response.json()) as { order: ShopifyOrder };
      const order = data.order;

      const lineItems = (order.line_items || []).map((item: any) => ({
        name: item.title || item.name || 'Unknown Item',
        quantity: item.quantity || 1,
        amount: Math.round(parseFloat(item.price || '0') * 100), // Convert to cents
      }));

      // Shopify amounts are in decimal format
      const totalAmount = Math.round(parseFloat(order.total_price || '0') * 100);
      const currency = order.currency || 'USD';

      this.logInfo('Retrieved order details', { orderId, totalAmount });

      return {
        externalOrderId: String(order.id),
        totalAmount,
        currency,
        lineItems,
        createdAt: order.created_at ? new Date(order.created_at) : new Date(),
        rawPayload: order,
      };
    } catch (error) {
      this.logError('Failed to fetch order', error, { orderId });
      throw new Error('Failed to fetch order details');
    }
  }

  /**
   * Validates Shopify webhook signature
   * Shopify uses HMAC-SHA256 with base64 encoding
   */
  validateWebhook(
    rawBody: string,
    headers: Record<string, string>,
    webhookSecret: string
  ): WebhookValidationResult {
    const signature = headers['x-shopify-hmac-sha256'];

    if (!signature) {
      this.logWarn('Missing Shopify webhook signature');
      return { isValid: false };
    }

    // Calculate expected signature
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(rawBody, 'utf8');
    const expectedSignature = hmac.digest('base64');

    // Timing-safe comparison
    const isValid =
      signature.length === expectedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

    if (!isValid) {
      this.logWarn('Webhook signature validation failed');
      return { isValid: false };
    }

    try {
      const payload = JSON.parse(rawBody);
      // Shopify webhook topic is in headers
      const eventType = headers['x-shopify-topic'] || 'unknown';
      // Generate a unique event ID from order ID and topic
      const eventId = `${payload.id || Date.now()}-${eventType}`;

      return {
        isValid: true,
        eventId,
        eventType,
        payload,
      };
    } catch {
      this.logError('Failed to parse webhook payload', null);
      return { isValid: false };
    }
  }

  /**
   * Parses transaction from Shopify webhook
   * Shopify sends orders/paid webhook when payment is complete
   */
  parseTransactionFromWebhook(payload: unknown): NormalizedTransaction | null {
    const data = payload as {
      id?: number;
      financial_status?: string;
      total_price?: string;
      currency?: string;
      location_id?: number;
      shop_id?: number;
    };

    // Only handle paid orders
    if (data.financial_status !== 'paid') {
      return null;
    }

    if (!data.id) {
      this.logWarn('No order ID in webhook payload');
      return null;
    }

    return {
      externalTransactionId: String(data.id),
      externalOrderId: String(data.id), // In Shopify, order ID is the transaction reference
      status: 'COMPLETED',
      amount: Math.round(parseFloat(data.total_price || '0') * 100),
      currency: data.currency || 'USD',
      locationId: data.location_id ? String(data.location_id) : undefined,
      merchantId: data.shop_id ? String(data.shop_id) : undefined,
    };
  }

  /**
   * Extract shop domain from redirect URI
   * In practice, this would be passed differently
   */
  private extractShopDomain(redirectUri: string): string | null {
    // This is a simplified extraction - in practice, you'd get this from
    // the callback URL params or store it during the OAuth initiation
    try {
      const url = new URL(redirectUri);
      const shop = url.searchParams.get('shop');
      return shop;
    } catch {
      return null;
    }
  }

  /**
   * Extract shop domain from token or stored metadata
   * This is a placeholder - in practice, shop domain would be stored with the connection
   */
  private extractShopFromToken(_accessToken: string): string {
    // In a real implementation, the shop domain would be stored in POSConnection.providerMetadata
    // and passed to these methods. For now, throw an error indicating proper setup is needed.
    throw new Error(
      'Shop domain must be stored in POSConnection.providerMetadata.shopDomain'
    );
  }

  /**
   * Register webhooks for order events
   */
  async registerWebhooks(accessToken: string, shopDomain: string, webhookUrl: string): Promise<void> {
    // Normalize shop domain
    let shop = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!shop.includes('.myshopify.com')) {
      shop = `${shop}.myshopify.com`;
    }

    const webhookTopics = [
      'orders/paid',      // When an order is paid
      'orders/fulfilled', // When an order is fulfilled
    ];

    for (const topic of webhookTopics) {
      try {
        const response = await fetch(
          `https://${shop}/admin/api/${shopifyConfig.apiVersion}/webhooks.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              webhook: {
                topic,
                address: webhookUrl,
                format: 'json',
              },
            }),
          }
        );

        if (response.ok) {
          this.logInfo('Registered Shopify webhook', { topic, shop });
        } else {
          const errorText = await response.text();
          // 422 often means webhook already exists, which is fine
          if (response.status === 422) {
            this.logInfo('Webhook already exists', { topic, shop });
          } else {
            this.logWarn('Failed to register webhook', { topic, shop, status: response.status, error: errorText });
          }
        }
      } catch (error) {
        this.logError('Error registering webhook', error, { topic, shop });
      }
    }
  }
}

// Create and export singleton instance
export const shopifyProvider = new ShopifyProvider();
