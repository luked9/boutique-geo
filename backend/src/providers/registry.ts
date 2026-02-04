import { POSProvider } from '@prisma/client';
import { IPOSProvider } from './types';
import { logger } from '../lib/logger';

/**
 * Registry for POS provider implementations
 * Uses singleton pattern to maintain a single registry instance
 */
class ProviderRegistry {
  private providers: Map<POSProvider, IPOSProvider> = new Map();

  /**
   * Register a provider implementation
   */
  register(provider: IPOSProvider): void {
    if (this.providers.has(provider.providerType)) {
      logger.warn(
        { provider: provider.providerType },
        'Overwriting existing provider registration'
      );
    }
    this.providers.set(provider.providerType, provider);
    logger.info({ provider: provider.providerType }, 'Registered POS provider');
  }

  /**
   * Get a provider by type
   * @throws Error if provider is not registered
   */
  get(providerType: POSProvider): IPOSProvider {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`POS provider not registered: ${providerType}`);
    }
    return provider;
  }

  /**
   * Get a provider by type, or undefined if not registered
   */
  getOptional(providerType: POSProvider): IPOSProvider | undefined {
    return this.providers.get(providerType);
  }

  /**
   * Check if a provider type is supported/registered
   */
  isSupported(providerType: string): providerType is POSProvider {
    return this.providers.has(providerType as POSProvider);
  }

  /**
   * Get all registered providers
   */
  getAll(): IPOSProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all registered provider types
   */
  getSupportedTypes(): POSProvider[] {
    return Array.from(this.providers.keys());
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();
