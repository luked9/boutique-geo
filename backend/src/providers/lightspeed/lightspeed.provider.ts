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
import { lightspeedConfig } from './lightspeed.config';

/**
 * Lightspeed POS provider implementation
 * Supports Lightspeed Restaurant (L-Series) API
 */
export class LightspeedProvider extends BasePOSProvider {
  readonly providerType = POSProvider.LIGHTSPEED;

  constructor() {
    super();
    this.logInfo('LightspeedProvider initialized');
  }

  getOAuthUrl(storePublicId: string, redirectUri: string): string {
    const state = this.encodeState(storePublicId);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: lightspeedConfig.clientId,
      scope: lightspeedConfig.scopes,
      redirect_uri: redirectUri,
      state,
    });

    const url = `${lightspeedConfig.authUrl}?${params.toString()}`;

    this.logDebug('Generated OAuth URL', { storePublicId, redirectUri });
    return url;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    try {
      const response = await fetch(lightspeedConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: lightspeedConfig.clientId,
          client_secret: lightspeedConfig.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lightspeed OAuth error: ${response.status} - ${errorText}`);
      }

      interface TokenResponse {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        account_id?: string;
      }

      const data = (await response.json()) as TokenResponse;

      if (!data.access_token) {
        throw new Error('Missing access token in OAuth response');
      }

      // Calculate expiration (Lightspeed tokens typically expire in 1 hour)
      const expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : new Date(Date.now() + 3600 * 1000); // Default 1 hour

      this.logInfo('Successfully exchanged OAuth code for tokens');

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        additionalData: {
          accountId: data.account_id,
        },
      };
    } catch (error) {
      this.logError('Failed to exchange OAuth code', error);
      throw new Error('Failed to exchange OAuth code for tokens');
    }
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    try {
      const response = await fetch(lightspeedConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: lightspeedConfig.clientId,
          client_secret: lightspeedConfig.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Lightspeed token refresh error: ${response.status}`);
      }

      interface TokenResponse {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      }

      const data = (await response.json()) as TokenResponse;

      if (!data.access_token) {
        throw new Error('Missing access token in refresh response');
      }

      const expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : new Date(Date.now() + 3600 * 1000);

      this.logInfo('Successfully refreshed access token');

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt,
      };
    } catch (error) {
      this.logError('Failed to refresh token', error);
      throw new Error('Failed to refresh access token');
    }
  }

  async getMerchantInfo(accessToken: string): Promise<MerchantInfo> {
    try {
      // Get account info
      const response = await fetch(`${lightspeedConfig.apiBaseUrl}/Account`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Lightspeed API error: ${response.status}`);
      }

      interface AccountResponse {
        Account: {
          accountID: string;
          name?: string;
        };
      }

      const data = (await response.json()) as AccountResponse;
      const account = data.Account;

      this.logInfo('Retrieved account info', { accountId: account.accountID });

      // Get locations
      const locationsResponse = await fetch(
        `${lightspeedConfig.apiBaseUrl}/Account/${account.accountID}/Shop`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      interface LocationsResponse {
        Shop?: Array<{
          shopID: string;
          name?: string;
        }>;
      }

      let locations: MerchantInfo['locations'] = [];
      if (locationsResponse.ok) {
        const locData = (await locationsResponse.json()) as LocationsResponse;
        locations = (locData.Shop || []).map((shop) => ({
          id: String(shop.shopID),
          name: shop.name || 'Unnamed Location',
        }));
      }

      return {
        merchantId: String(account.accountID),
        businessName: account.name || 'Lightspeed Business',
        locations,
      };
    } catch (error) {
      this.logError('Failed to fetch merchant info', error);
      throw new Error('Failed to fetch merchant profile');
    }
  }

  async getOrder(accessToken: string, orderId: string): Promise<NormalizedOrder> {
    try {
      // Lightspeed uses "Sale" for completed orders
      const response = await fetch(
        `${lightspeedConfig.apiBaseUrl}/Account/~/Sale/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Lightspeed API error: ${response.status}`);
      }

      interface SaleLineItem {
        itemDescription?: string;
        unitQuantity?: string;
        calcSubtotal?: string;
      }

      interface SaleResponse {
        Sale: {
          saleID: string;
          calcTotal?: string;
          completed?: string;
          SaleLines?: {
            SaleLine?: SaleLineItem[];
          };
        };
      }

      const data = (await response.json()) as SaleResponse;
      const sale = data.Sale;

      const lineItems =
        sale.SaleLines?.SaleLine?.map((line) => ({
          name: line.itemDescription || 'Unknown Item',
          quantity: parseInt(line.unitQuantity || '1', 10),
          amount: Math.round(parseFloat(line.calcSubtotal || '0') * 100),
        })) || [];

      const totalAmount = Math.round(parseFloat(sale.calcTotal || '0') * 100);

      this.logInfo('Retrieved order details', { orderId, totalAmount });

      return {
        externalOrderId: String(sale.saleID),
        totalAmount,
        currency: 'USD', // Lightspeed typically uses account currency
        lineItems,
        createdAt: sale.completed ? new Date(sale.completed) : new Date(),
        rawPayload: sale,
      };
    } catch (error) {
      this.logError('Failed to fetch order', error, { orderId });
      throw new Error('Failed to fetch order details');
    }
  }

  validateWebhook(
    rawBody: string,
    headers: Record<string, string>,
    webhookSecret: string
  ): WebhookValidationResult {
    // Lightspeed uses HMAC-SHA256 signature
    const signature = headers['x-lightspeed-signature'] || headers['x-ls-signature'];

    if (!signature) {
      this.logWarn('Missing Lightspeed webhook signature');
      return { isValid: false };
    }

    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest('hex');

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
        eventId: payload.id || payload.saleID || String(Date.now()),
        eventType: payload.type || 'sale.completed',
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
      saleID?: string;
      calcTotal?: string;
      shopID?: string;
      accountID?: string;
      completed?: boolean;
    };

    // Only handle completed sales
    if (!data.completed || !data.saleID) {
      return null;
    }

    return {
      externalTransactionId: String(data.saleID),
      externalOrderId: String(data.saleID),
      status: 'COMPLETED',
      amount: Math.round(parseFloat(data.calcTotal || '0') * 100),
      currency: 'USD',
      locationId: data.shopID ? String(data.shopID) : undefined,
      merchantId: data.accountID ? String(data.accountID) : undefined,
    };
  }
}

export const lightspeedProvider = new LightspeedProvider();
