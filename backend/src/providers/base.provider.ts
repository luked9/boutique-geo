import { POSProvider } from '@prisma/client';
import { logger } from '../lib/logger';
import {
  IPOSProvider,
  OAuthTokens,
  MerchantInfo,
  NormalizedOrder,
  NormalizedTransaction,
  WebhookValidationResult,
} from './types';

/**
 * Abstract base class for POS providers
 * Provides common functionality and logging helpers
 */
export abstract class BasePOSProvider implements IPOSProvider {
  abstract readonly providerType: POSProvider;

  /**
   * Default implementation: refresh if within 24 hours of expiry
   */
  needsTokenRefresh(expiresAt: Date | null): boolean {
    if (!expiresAt) return false;
    const hoursUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 24;
  }

  /**
   * Log info with provider context
   */
  protected logInfo(message: string, data?: Record<string, unknown>): void {
    logger.info({ provider: this.providerType, ...data }, message);
  }

  /**
   * Log warning with provider context
   */
  protected logWarn(message: string, data?: Record<string, unknown>): void {
    logger.warn({ provider: this.providerType, ...data }, message);
  }

  /**
   * Log error with provider context
   */
  protected logError(message: string, error: unknown, data?: Record<string, unknown>): void {
    logger.error({ provider: this.providerType, error, ...data }, message);
  }

  /**
   * Log debug with provider context
   */
  protected logDebug(message: string, data?: Record<string, unknown>): void {
    logger.debug({ provider: this.providerType, ...data }, message);
  }

  /**
   * Encode OAuth state parameter
   */
  protected encodeState(storePublicId: string): string {
    return Buffer.from(
      JSON.stringify({
        storePublicId,
        provider: this.providerType,
        timestamp: Date.now(),
      })
    ).toString('base64');
  }

  /**
   * Decode OAuth state parameter
   */
  protected decodeState(state: string): { storePublicId: string; provider: POSProvider; timestamp: number } {
    return JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
  }

  // Abstract methods that must be implemented by each provider
  abstract getOAuthUrl(storePublicId: string, redirectUri: string, options?: { shop?: string }): string;
  abstract exchangeCodeForTokens(code: string, redirectUri: string, options?: { shop?: string }): Promise<OAuthTokens>;
  abstract refreshTokens(refreshToken: string): Promise<OAuthTokens>;
  abstract getMerchantInfo(accessToken: string, options?: { shop?: string }): Promise<MerchantInfo>;
  abstract getOrder(accessToken: string, orderId: string): Promise<NormalizedOrder>;
  abstract validateWebhook(
    rawBody: string,
    headers: Record<string, string>,
    webhookSecret: string
  ): WebhookValidationResult;
  abstract parseTransactionFromWebhook(payload: unknown): NormalizedTransaction | null;
}
