import { config } from '../../config';

/**
 * Check if Square is fully configured
 */
export function isSquareConfigured(): boolean {
  return !!(config.SQUARE_APP_ID && config.SQUARE_APP_SECRET && config.SQUARE_WEBHOOK_SIGNATURE_KEY);
}

/**
 * Square-specific configuration
 */
export const squareConfig = {
  appId: config.SQUARE_APP_ID || '',
  appSecret: config.SQUARE_APP_SECRET || '',
  webhookSignatureKey: config.SQUARE_WEBHOOK_SIGNATURE_KEY || '',
  environment: config.SQUARE_ENV,
  scopes: 'MERCHANT_PROFILE_READ ORDERS_READ ORDERS_WRITE',
} as const;
