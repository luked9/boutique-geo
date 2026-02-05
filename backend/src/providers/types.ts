import { POSProvider } from '@prisma/client';

/**
 * Provider type enum matching Prisma enum
 */
export { POSProvider as POSProviderType };

/**
 * OAuth token response from provider
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  additionalData?: Record<string, unknown>;
}

/**
 * Merchant/business information from provider
 */
export interface MerchantInfo {
  merchantId: string;
  businessName: string;
  locations?: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * Normalized line item for orders
 */
export interface OrderLineItem {
  name: string;
  quantity: number;
  amount: number; // cents
}

/**
 * Normalized order from any provider
 */
export interface NormalizedOrder {
  externalOrderId: string;
  totalAmount: number; // cents
  currency: string;
  lineItems: OrderLineItem[];
  createdAt: Date;
  rawPayload?: unknown;
}

/**
 * Normalized transaction/payment from webhook
 */
export interface NormalizedTransaction {
  externalTransactionId: string;
  externalOrderId: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';
  amount: number; // cents
  currency: string;
  locationId?: string;
  merchantId?: string;
}

/**
 * Result of webhook signature validation
 */
export interface WebhookValidationResult {
  isValid: boolean;
  eventId?: string;
  eventType?: string;
  payload?: unknown;
}

/**
 * OAuth state parameter structure
 */
export interface OAuthState {
  storePublicId: string;
  provider: POSProvider;
  timestamp: number;
}

/**
 * Main provider interface - all POS providers must implement this
 */
export interface IPOSProvider {
  readonly providerType: POSProvider;

  /**
   * Generates OAuth authorization URL
   * @param storePublicId - Store public ID to include in state
   * @param redirectUri - OAuth callback URL
   * @param options - Provider-specific options (e.g., shop domain for Shopify)
   * @returns Full authorization URL to redirect user to
   */
  getOAuthUrl(storePublicId: string, redirectUri: string, options?: { shop?: string }): string;

  /**
   * Exchanges OAuth authorization code for access/refresh tokens
   * @param code - Authorization code from OAuth callback
   * @param redirectUri - Must match the original redirect URI
   * @param options - Provider-specific options (e.g., shop domain for Shopify)
   * @returns Access token, optional refresh token, and expiration
   */
  exchangeCodeForTokens(code: string, redirectUri: string, options?: { shop?: string }): Promise<OAuthTokens>;

  /**
   * Refreshes an expired or expiring access token
   * @param refreshToken - The refresh token
   * @returns New tokens
   */
  refreshTokens(refreshToken: string): Promise<OAuthTokens>;

  /**
   * Fetches merchant/business information
   * @param accessToken - Valid access token
   * @param options - Provider-specific options (e.g., shop domain for Shopify)
   * @returns Merchant ID, business name, and optionally locations
   */
  getMerchantInfo(accessToken: string, options?: { shop?: string }): Promise<MerchantInfo>;

  /**
   * Fetches order details from the provider
   * @param accessToken - Valid access token
   * @param orderId - Provider's order ID
   * @returns Normalized order with line items
   */
  getOrder(accessToken: string, orderId: string): Promise<NormalizedOrder>;

  /**
   * Validates webhook signature and parses the payload
   * @param rawBody - Raw request body as string
   * @param headers - Request headers (lowercase keys)
   * @param webhookSecret - Provider's webhook secret/signature key
   * @returns Validation result with parsed payload if valid
   */
  validateWebhook(
    rawBody: string,
    headers: Record<string, string>,
    webhookSecret: string
  ): WebhookValidationResult;

  /**
   * Parses transaction/payment information from webhook payload
   * @param payload - Parsed webhook payload
   * @returns Normalized transaction or null if not a transaction event
   */
  parseTransactionFromWebhook(payload: unknown): NormalizedTransaction | null;

  /**
   * Checks if token needs refresh (typically within 24 hours of expiry)
   * @param expiresAt - Token expiration date
   * @returns true if token should be refreshed
   */
  needsTokenRefresh(expiresAt: Date | null): boolean;
}
