import { Client, Environment, ApiError } from 'square';
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
import { squareConfig } from './square.config';

/**
 * Square POS provider implementation
 */
export class SquareProvider extends BasePOSProvider {
  readonly providerType = POSProvider.SQUARE;

  private readonly environment: Environment;
  private readonly baseUrl: string;

  constructor() {
    super();
    this.environment =
      squareConfig.environment === 'production' ? Environment.Production : Environment.Sandbox;
    this.baseUrl =
      this.environment === Environment.Production
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com';

    this.logInfo('SquareProvider initialized', { environment: squareConfig.environment });
  }

  getOAuthUrl(storePublicId: string, redirectUri: string, _options?: { shop?: string }): string {
    const state = this.encodeState(storePublicId);

    const params = new URLSearchParams({
      client_id: squareConfig.appId,
      scope: squareConfig.scopes,
      session: 'false',
      state,
    });

    const url = `${this.baseUrl}/oauth2/authorize?${params.toString()}`;

    this.logDebug('Generated OAuth URL', { storePublicId, redirectUri });
    return url;
  }

  async exchangeCodeForTokens(code: string, _redirectUri: string): Promise<OAuthTokens> {
    try {
      const client = new Client({
        environment: this.environment,
      });

      const response = await client.oAuthApi.obtainToken({
        clientId: squareConfig.appId,
        clientSecret: squareConfig.appSecret,
        code,
        grantType: 'authorization_code',
      });

      if (!response.result.accessToken) {
        throw new Error('Missing access token in OAuth response');
      }

      const expiresAt = response.result.expiresAt
        ? new Date(response.result.expiresAt)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

      this.logInfo('Successfully exchanged OAuth code for tokens');

      return {
        accessToken: response.result.accessToken,
        refreshToken: response.result.refreshToken,
        expiresAt,
      };
    } catch (error) {
      this.logError('Failed to exchange OAuth code', error);

      if (error instanceof ApiError) {
        throw new Error(`Square API error: ${error.message}`);
      }

      throw new Error('Failed to exchange OAuth code for tokens');
    }
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    try {
      const client = new Client({
        environment: this.environment,
      });

      const response = await client.oAuthApi.obtainToken({
        clientId: squareConfig.appId,
        clientSecret: squareConfig.appSecret,
        refreshToken,
        grantType: 'refresh_token',
      });

      if (!response.result.accessToken) {
        throw new Error('Missing access token in refresh response');
      }

      const expiresAt = response.result.expiresAt
        ? new Date(response.result.expiresAt)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      this.logInfo('Successfully refreshed access token');

      return {
        accessToken: response.result.accessToken,
        refreshToken: response.result.refreshToken,
        expiresAt,
      };
    } catch (error) {
      this.logError('Failed to refresh token', error);

      if (error instanceof ApiError) {
        throw new Error(`Square API error during token refresh: ${error.message}`);
      }

      throw new Error('Failed to refresh access token');
    }
  }

  async getMerchantInfo(accessToken: string): Promise<MerchantInfo> {
    try {
      const client = new Client({
        environment: this.environment,
        accessToken,
      });

      const [merchantRes, locationsRes] = await Promise.all([
        client.merchantsApi.retrieveMerchant('me'),
        client.locationsApi.listLocations(),
      ]);

      if (!merchantRes.result.merchant) {
        throw new Error('Merchant not found in response');
      }

      const merchant = merchantRes.result.merchant;

      this.logInfo('Retrieved merchant profile', { merchantId: merchant.id });

      return {
        merchantId: merchant.id!,
        businessName: merchant.businessName || 'Unknown Business',
        locations: locationsRes.result.locations?.map((loc) => ({
          id: loc.id!,
          name: loc.name || 'Unnamed Location',
        })),
      };
    } catch (error) {
      this.logError('Failed to fetch merchant profile', error);

      if (error instanceof ApiError) {
        throw new Error(`Square API error: ${error.message}`);
      }

      throw new Error('Failed to fetch merchant profile');
    }
  }

  async getOrder(accessToken: string, orderId: string): Promise<NormalizedOrder> {
    try {
      const client = new Client({
        environment: this.environment,
        accessToken,
      });

      const response = await client.ordersApi.retrieveOrder(orderId);

      if (!response.result.order) {
        throw new Error('Order not found');
      }

      const order = response.result.order;

      const lineItems = (order.lineItems || []).map((item) => ({
        name: item.name || 'Unknown Item',
        quantity: parseInt(item.quantity || '1', 10),
        amount: Number(item.totalMoney?.amount ?? 0),
      }));

      const totalAmount = Number(order.totalMoney?.amount ?? 0);
      const currency = order.totalMoney?.currency || 'USD';

      this.logInfo('Retrieved order details', { orderId, totalAmount });

      return {
        externalOrderId: order.id!,
        totalAmount,
        currency,
        lineItems,
        createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
        rawPayload: order,
      };
    } catch (error) {
      this.logError('Failed to fetch order', error, { orderId });

      if (error instanceof ApiError) {
        throw new Error(`Square API error: ${error.message}`);
      }

      throw new Error('Failed to fetch order details');
    }
  }

  validateWebhook(
    rawBody: string,
    headers: Record<string, string>,
    webhookSecret: string
  ): WebhookValidationResult {
    const signature = headers['x-square-hmacsha256-signature'];
    const notificationUrl = headers['x-notification-url'];

    if (!signature || !notificationUrl) {
      this.logWarn('Missing webhook signature or notification URL');
      return { isValid: false };
    }

    // Calculate expected signature
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(notificationUrl + rawBody);
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
      return {
        isValid: true,
        eventId: payload.event_id,
        eventType: payload.type,
        payload,
      };
    } catch {
      this.logError('Failed to parse webhook payload', null);
      return { isValid: false };
    }
  }

  parseTransactionFromWebhook(payload: unknown): NormalizedTransaction | null {
    const data = payload as {
      type?: string;
      data?: {
        object?: {
          payment?: {
            id?: string;
            order_id?: string;
            status?: string;
            amount_money?: {
              amount?: number;
              currency?: string;
            };
            location_id?: string;
            merchant_id?: string;
          };
        };
      };
    };

    // Only handle payment events
    const eventType = data.type;
    if (
      !eventType ||
      !['payment.created', 'payment.updated', 'payment.completed'].includes(eventType)
    ) {
      return null;
    }

    const payment = data.data?.object?.payment;
    if (!payment) {
      this.logWarn('No payment object in webhook payload');
      return null;
    }

    const statusMap: Record<string, NormalizedTransaction['status']> = {
      COMPLETED: 'COMPLETED',
      APPROVED: 'COMPLETED',
      PENDING: 'PENDING',
      CANCELED: 'FAILED',
      FAILED: 'FAILED',
    };

    return {
      externalTransactionId: payment.id || '',
      externalOrderId: payment.order_id || '',
      status: statusMap[payment.status || ''] || 'PENDING',
      amount: Number(payment.amount_money?.amount ?? 0),
      currency: payment.amount_money?.currency || 'USD',
      locationId: payment.location_id,
      merchantId: payment.merchant_id,
    };
  }
}

// Create and export singleton instance
export const squareProvider = new SquareProvider();
