import { config } from '../../config';

/**
 * Square-specific configuration
 */
export const squareConfig = {
  appId: config.SQUARE_APP_ID,
  appSecret: config.SQUARE_APP_SECRET,
  webhookSignatureKey: config.SQUARE_WEBHOOK_SIGNATURE_KEY,
  environment: config.SQUARE_ENV,
  scopes: 'MERCHANT_PROFILE_READ ORDERS_READ ORDERS_WRITE',
} as const;
