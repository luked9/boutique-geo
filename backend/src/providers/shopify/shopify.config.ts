import { config } from '../../config';

/**
 * Shopify-specific configuration
 */
export const shopifyConfig = {
  clientId: config.SHOPIFY_CLIENT_ID || '',
  clientSecret: config.SHOPIFY_CLIENT_SECRET || '',
  webhookSecret: config.SHOPIFY_WEBHOOK_SECRET || '',
  scopes: 'read_orders,read_products',
  apiVersion: '2025-01',
} as const;

/**
 * Check if Shopify is configured
 */
export function isShopifyConfigured(): boolean {
  return !!(config.SHOPIFY_CLIENT_ID && config.SHOPIFY_CLIENT_SECRET);
}
