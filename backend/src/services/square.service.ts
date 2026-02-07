import { Client, Environment, ApiError } from 'square';
import { config } from '../config';
import { logger } from '../lib/logger';
import { tokenCryptoService } from './tokenCrypto.service';
import { prisma } from '../lib/prisma';
import { Store } from '@prisma/client';

/**
 * Square API integration service
 * Handles OAuth, token management, and Square API calls
 */

interface OAuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface MerchantProfile {
  merchantId: string;
  businessName: string;
}

interface Location {
  id: string;
  name: string;
}

interface OrderLineItem {
  name: string;
  quantity: number;
  amount: number;
}

interface OrderDetails {
  id: string;
  totalAmount: number;
  currency: string;
  lineItems: OrderLineItem[];
  createdAt: Date;
}

class SquareService {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly environment: Environment;
  private readonly baseUrl: string;

  constructor() {
    this.appId = config.SQUARE_APP_ID || '';
    this.appSecret = config.SQUARE_APP_SECRET || '';
    this.environment =
      config.SQUARE_ENV === 'production' ? Environment.Production : Environment.Sandbox;
    this.baseUrl =
      this.environment === Environment.Production
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com';

    if (this.appId) {
      logger.info({ environment: config.SQUARE_ENV }, 'SquareService initialized');
    } else {
      logger.warn('Square credentials not configured - Square features disabled');
    }
  }

  /**
   * Generates Square OAuth authorization URL
   * @param storePublicId - Store public ID to pass in state parameter
   * @param redirectUri - OAuth callback URL
   * @returns Authorization URL to redirect user to
   */
  getOAuthUrl(storePublicId: string, redirectUri: string): string {
    const state = Buffer.from(
      JSON.stringify({ storePublicId, timestamp: Date.now() })
    ).toString('base64');

    const params = new URLSearchParams({
      client_id: this.appId,
      scope: 'MERCHANT_PROFILE_READ ORDERS_READ ORDERS_WRITE',
      session: 'false',
      state,
    });

    const url = `${this.baseUrl}/oauth2/authorize?${params.toString()}`;

    logger.debug({ storePublicId, redirectUri }, 'Generated OAuth URL');
    return url;
  }

  /**
   * Exchanges OAuth authorization code for access and refresh tokens
   * @param code - Authorization code from OAuth callback
   * @returns Access token, refresh token, and expiration date
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
    try {
      const client = new Client({
        environment: this.environment,
      });

      const response = await client.oAuthApi.obtainToken({
        clientId: this.appId,
        clientSecret: this.appSecret,
        code,
        grantType: 'authorization_code',
      });

      if (!response.result.accessToken || !response.result.refreshToken) {
        throw new Error('Missing tokens in OAuth response');
      }

      const expiresAt = response.result.expiresAt
        ? new Date(response.result.expiresAt)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

      logger.info('Successfully exchanged OAuth code for tokens');

      return {
        accessToken: response.result.accessToken,
        refreshToken: response.result.refreshToken,
        expiresAt,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to exchange OAuth code');

      if (error instanceof ApiError) {
        throw new Error(`Square API error: ${error.message}`);
      }

      throw new Error('Failed to exchange OAuth code for tokens');
    }
  }

  /**
   * Fetches merchant profile information
   * @param accessToken - Square access token
   * @returns Merchant ID and business name
   */
  async getMerchantProfile(accessToken: string): Promise<MerchantProfile> {
    try {
      const client = new Client({
        environment: this.environment,
        accessToken,
      });

      const response = await client.merchantsApi.retrieveMerchant('me');

      if (!response.result.merchant) {
        throw new Error('Merchant not found in response');
      }

      const merchant = response.result.merchant;

      logger.info({ merchantId: merchant.id }, 'Retrieved merchant profile');

      return {
        merchantId: merchant.id!,
        businessName: merchant.businessName || 'Unknown Business',
      };
    } catch (error) {
      logger.error({ error }, 'Failed to fetch merchant profile');

      if (error instanceof ApiError) {
        throw new Error(`Square API error: ${error.message}`);
      }

      throw new Error('Failed to fetch merchant profile');
    }
  }

  /**
   * Fetches all locations for the merchant
   * @param accessToken - Square access token
   * @returns Array of locations with id and name
   */
  async getLocations(accessToken: string): Promise<Location[]> {
    try {
      const client = new Client({
        environment: this.environment,
        accessToken,
      });

      const response = await client.locationsApi.listLocations();

      if (!response.result.locations) {
        logger.warn('No locations found for merchant');
        return [];
      }

      const locations = response.result.locations.map((loc) => ({
        id: loc.id!,
        name: loc.name || 'Unnamed Location',
      }));

      logger.info({ count: locations.length }, 'Retrieved merchant locations');

      return locations;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch locations');

      if (error instanceof ApiError) {
        throw new Error(`Square API error: ${error.message}`);
      }

      throw new Error('Failed to fetch locations');
    }
  }

  /**
   * Fetches order details from Square
   * @param accessToken - Square access token
   * @param orderId - Square order ID
   * @returns Order details including line items
   */
  async getOrder(accessToken: string, orderId: string): Promise<OrderDetails> {
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

      // Parse line items
      const lineItems: OrderLineItem[] = (order.lineItems || []).map((item) => ({
        name: item.name || 'Unknown Item',
        quantity: parseInt(item.quantity || '1', 10),
        amount: Number(item.totalMoney?.amount ?? 0),
      }));

      // Get total amount
      const totalAmount = Number(order.totalMoney?.amount ?? 0);
      const currency = order.totalMoney?.currency || 'USD';

      logger.info({ orderId, totalAmount }, 'Retrieved order details');

      return {
        id: order.id!,
        totalAmount,
        currency,
        lineItems,
        createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
      };
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to fetch order');

      if (error instanceof ApiError) {
        throw new Error(`Square API error: ${error.message}`);
      }

      throw new Error('Failed to fetch order details');
    }
  }

  /**
   * Refreshes access token if it's expiring soon (within 24 hours)
   * @param store - Store record with encrypted tokens
   * @returns Updated store record with new tokens (if refreshed)
   */
  async refreshTokenIfNeeded(store: Store): Promise<Store> {
    try {
      // Check if token needs refresh (within 24 hours of expiry)
      const now = new Date();
      const expiresAt = store.tokenExpiresAt;

      if (!expiresAt) {
        logger.warn({ storeId: store.id }, 'No token expiration date found');
        return store;
      }

      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Only refresh if expiring within 24 hours
      if (hoursUntilExpiry > 24) {
        logger.debug(
          { storeId: store.id, hoursUntilExpiry },
          'Token still valid, no refresh needed'
        );
        return store;
      }

      // Decrypt refresh token
      if (!store.refreshTokenEnc) {
        throw new Error('No refresh token available');
      }

      const refreshToken = tokenCryptoService.decrypt(store.refreshTokenEnc);

      // Call Square API to refresh token
      const client = new Client({
        environment: this.environment,
      });

      const response = await client.oAuthApi.obtainToken({
        clientId: this.appId,
        clientSecret: this.appSecret,
        refreshToken,
        grantType: 'refresh_token',
      });

      if (!response.result.accessToken) {
        throw new Error('Missing access token in refresh response');
      }

      const newExpiresAt = response.result.expiresAt
        ? new Date(response.result.expiresAt)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Encrypt and store new tokens
      const accessTokenEnc = tokenCryptoService.encrypt(response.result.accessToken);
      const refreshTokenEnc = response.result.refreshToken
        ? tokenCryptoService.encrypt(response.result.refreshToken)
        : store.refreshTokenEnc;

      // Update store in database
      const updatedStore = await prisma.store.update({
        where: { id: store.id },
        data: {
          accessTokenEnc,
          refreshTokenEnc,
          tokenExpiresAt: newExpiresAt,
        },
      });

      logger.info(
        { storeId: store.id, newExpiresAt },
        'Successfully refreshed Square access token'
      );

      return updatedStore;
    } catch (error) {
      logger.error({ error, storeId: store.id }, 'Failed to refresh token');

      if (error instanceof ApiError) {
        throw new Error(`Square API error during token refresh: ${error.message}`);
      }

      throw new Error('Failed to refresh access token');
    }
  }
}

export const squareService = new SquareService();
