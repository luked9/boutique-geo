import { POSConnection, POSProvider, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { tokenCryptoService } from './tokenCrypto.service';
import { providerRegistry } from '../providers';
import { logger } from '../lib/logger';

interface UpsertConnectionData {
  merchantId?: string;
  locationId?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  providerMetadata?: Record<string, unknown>;
}

/**
 * Service for managing POS connections
 */
class POSConnectionService {
  /**
   * Creates or updates a POS connection after OAuth
   */
  async upsertConnection(
    storeId: string,
    provider: POSProvider,
    data: UpsertConnectionData
  ): Promise<POSConnection> {
    const accessTokenEnc = tokenCryptoService.encrypt(data.accessToken);
    const refreshTokenEnc = data.refreshToken
      ? tokenCryptoService.encrypt(data.refreshToken)
      : null;

    const connection = await prisma.pOSConnection.upsert({
      where: {
        storeId_provider: { storeId, provider },
      },
      create: {
        storeId,
        provider,
        merchantId: data.merchantId,
        locationId: data.locationId,
        accessTokenEnc,
        refreshTokenEnc,
        tokenExpiresAt: data.tokenExpiresAt,
        providerMetadata: (data.providerMetadata || {}) as Prisma.InputJsonValue,
      },
      update: {
        merchantId: data.merchantId,
        locationId: data.locationId,
        accessTokenEnc,
        refreshTokenEnc,
        tokenExpiresAt: data.tokenExpiresAt,
        providerMetadata: (data.providerMetadata || {}) as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    logger.info(
      { storeId, provider, connectionId: connection.id },
      'Upserted POS connection'
    );

    return connection;
  }

  /**
   * Finds connection by provider-specific identifier (locationId or merchantId)
   */
  async findByProviderIdentifier(
    provider: POSProvider,
    identifier: { merchantId?: string; locationId?: string }
  ): Promise<(POSConnection & { store: { id: string; publicId: string; name: string } }) | null> {
    const where: Prisma.POSConnectionWhereInput = { provider, isActive: true };

    if (identifier.locationId) {
      where.locationId = identifier.locationId;
    } else if (identifier.merchantId) {
      where.merchantId = identifier.merchantId;
    } else {
      return null;
    }

    return prisma.pOSConnection.findFirst({
      where,
      include: {
        store: {
          select: { id: true, publicId: true, name: true },
        },
      },
    });
  }

  /**
   * Gets decrypted access token, refreshing if needed
   */
  async getAccessToken(connectionId: string): Promise<string> {
    const connection = await prisma.pOSConnection.findUniqueOrThrow({
      where: { id: connectionId },
    });

    if (!connection.accessTokenEnc) {
      throw new Error('Connection has no access token');
    }

    const providerImpl = providerRegistry.get(connection.provider);

    // Check if refresh needed
    if (
      connection.refreshTokenEnc &&
      providerImpl.needsTokenRefresh(connection.tokenExpiresAt)
    ) {
      const refreshToken = tokenCryptoService.decrypt(connection.refreshTokenEnc);
      const newTokens = await providerImpl.refreshTokens(refreshToken);

      // Update stored tokens
      await prisma.pOSConnection.update({
        where: { id: connectionId },
        data: {
          accessTokenEnc: tokenCryptoService.encrypt(newTokens.accessToken),
          refreshTokenEnc: newTokens.refreshToken
            ? tokenCryptoService.encrypt(newTokens.refreshToken)
            : connection.refreshTokenEnc,
          tokenExpiresAt: newTokens.expiresAt,
        },
      });

      logger.info({ connectionId, provider: connection.provider }, 'Refreshed access token');
      return newTokens.accessToken;
    }

    return tokenCryptoService.decrypt(connection.accessTokenEnc);
  }

  /**
   * Updates the location ID for a connection
   */
  async setLocationId(connectionId: string, locationId: string): Promise<POSConnection> {
    return prisma.pOSConnection.update({
      where: { id: connectionId },
      data: { locationId },
    });
  }

  /**
   * Disconnects (soft delete) a POS connection
   */
  async disconnect(storeId: string, provider: POSProvider): Promise<void> {
    await prisma.pOSConnection.updateMany({
      where: { storeId, provider },
      data: { isActive: false },
    });

    logger.info({ storeId, provider }, 'Disconnected POS connection');
  }

  /**
   * Lists all active connections for a store
   */
  async listForStore(storeId: string): Promise<POSConnection[]> {
    return prisma.pOSConnection.findMany({
      where: { storeId, isActive: true },
    });
  }

  /**
   * Gets a specific connection for a store
   */
  async getForStore(storeId: string, provider: POSProvider): Promise<POSConnection | null> {
    return prisma.pOSConnection.findUnique({
      where: {
        storeId_provider: { storeId, provider },
      },
    });
  }
}

export const posConnectionService = new POSConnectionService();
