import { config } from '../../config';

/**
 * Lightspeed-specific configuration
 * Lightspeed has multiple products (Restaurant, Retail) - this is for L-Series (Restaurant)
 */
export const lightspeedConfig = {
  clientId: config.LIGHTSPEED_CLIENT_ID || '',
  clientSecret: config.LIGHTSPEED_CLIENT_SECRET || '',
  webhookSecret: config.LIGHTSPEED_WEBHOOK_SECRET || '',
  // Lightspeed Restaurant API
  authUrl: 'https://cloud.lightspeedapp.com/oauth/authorize',
  tokenUrl: 'https://cloud.lightspeedapp.com/oauth/access_token',
  apiBaseUrl: 'https://api.lightspeedapp.com/API/V3',
  scopes: 'employee:orders:read employee:inventory:read',
} as const;

/**
 * Check if Lightspeed is configured
 */
export function isLightspeedConfigured(): boolean {
  return !!(config.LIGHTSPEED_CLIENT_ID && config.LIGHTSPEED_CLIENT_SECRET);
}
