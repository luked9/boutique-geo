// Export types
export * from './types';

// Export base class
export { BasePOSProvider } from './base.provider';

// Export registry
export { providerRegistry } from './registry';

// Import and register providers
import { squareProvider } from './square';
import { shopifyProvider, isShopifyConfigured } from './shopify';
import { lightspeedProvider, isLightspeedConfigured } from './lightspeed';
import { providerRegistry } from './registry';

// Register Square provider (always available)
providerRegistry.register(squareProvider);

// Register Shopify provider (only if configured)
if (isShopifyConfigured()) {
  providerRegistry.register(shopifyProvider);
}

// Register Lightspeed provider (only if configured)
if (isLightspeedConfigured()) {
  providerRegistry.register(lightspeedProvider);
}

// Export individual providers
export { squareProvider } from './square';
export { shopifyProvider, isShopifyConfigured } from './shopify';
export { lightspeedProvider, isLightspeedConfigured } from './lightspeed';
