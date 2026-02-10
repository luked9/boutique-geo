import { Response } from 'express';
import { POSProvider } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { providerRegistry } from '../providers';
import { posConnectionService } from '../services/posConnection.service';
import { generateStoreId } from '../utils/ids';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { CreateOnboardingStoreDtoSchema } from '../types/dto';

class OnboardingController {
  /**
   * GET /api/v1/onboarding/stores
   * Lists all stores with their POS connection status.
   */
  async listStores(req: AuthenticatedRequest, res: Response) {
    try {
      const stores = await prisma.store.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          posConnections: {
            where: { isActive: true },
            select: {
              id: true,
              provider: true,
              merchantId: true,
              isActive: true,
              providerMetadata: true,
              createdAt: true,
            },
          },
        },
      });

      const result = stores.map((store) => ({
        publicId: store.publicId,
        name: store.name,
        googleMapsUrl: store.googleMapsUrl,
        posConnections: store.posConnections,
        createdAt: store.createdAt,
      }));

      return res.json({ stores: result });
    } catch (error) {
      logger.error({ error }, 'Failed to list stores');
      return res.status(500).json({ error: 'Failed to list stores' });
    }
  }

  /**
   * POST /api/v1/onboarding/stores
   * Creates a new store during the onboarding flow.
   */
  async createStore(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = CreateOnboardingStoreDtoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { name, posProvider, googleMapsUrl, shopDomain } = parsed.data;

      // Validate that the provider is configured
      if (!providerRegistry.isSupported(posProvider as string)) {
        return res.status(400).json({
          error: `${posProvider} is not configured. Contact your administrator.`,
        });
      }

      // Shopify requires a shop domain
      if (posProvider === 'SHOPIFY' && !shopDomain) {
        return res.status(400).json({
          error: 'shopDomain is required for Shopify stores',
        });
      }

      // Find or create the employee record
      const user = req.user!;
      const employee = await prisma.employee.upsert({
        where: { firebaseUid: user.uid },
        create: {
          firebaseUid: user.uid,
          email: user.email,
        },
        update: {
          email: user.email,
        },
      });

      const publicId = generateStoreId();

      const store = await prisma.store.create({
        data: {
          publicId,
          name,
          primaryReviewPlatform: 'GOOGLE',
          reviewDestinationUrl: googleMapsUrl,
          googleMapsUrl,
          createdByEmployeeId: employee.id,
        },
      });

      logger.info(
        { storeId: store.id, publicId, provider: posProvider, employeeEmail: user.email },
        'Store created via onboarding'
      );

      return res.status(201).json({
        publicId: store.publicId,
        name: store.name,
        googleMapsUrl: store.googleMapsUrl,
        posProvider,
        shopDomain: shopDomain || null,
        createdAt: store.createdAt,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create store');
      return res.status(500).json({ error: 'Failed to create store' });
    }
  }

  /**
   * GET /api/v1/onboarding/stores/:publicId/status
   * Returns store details + POS connection status.
   */
  async getStoreStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { publicId } = req.params;

      const store = await prisma.store.findUnique({
        where: { publicId },
        include: {
          posConnections: {
            where: { isActive: true },
            select: {
              id: true,
              provider: true,
              merchantId: true,
              locationId: true,
              isActive: true,
              providerMetadata: true,
              createdAt: true,
            },
          },
        },
      });

      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      return res.json({
        publicId: store.publicId,
        name: store.name,
        googleMapsUrl: store.googleMapsUrl,
        posConnections: store.posConnections,
        createdAt: store.createdAt,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get store status');
      return res.status(500).json({ error: 'Failed to get store status' });
    }
  }

  /**
   * GET /api/v1/onboarding/stores/:publicId/oauth-url/:provider
   * Returns the OAuth URL as JSON (frontend opens it).
   */
  async getOAuthUrl(req: AuthenticatedRequest, res: Response) {
    try {
      const { publicId } = req.params;
      const provider = req.params.provider?.toUpperCase();
      const { shop } = req.query;

      if (!provider || !providerRegistry.isSupported(provider)) {
        return res.status(400).json({
          error: `Unsupported or unconfigured provider: ${provider}`,
          supportedProviders: providerRegistry.getSupportedTypes(),
        });
      }

      if (provider === 'SHOPIFY' && (!shop || typeof shop !== 'string')) {
        return res.status(400).json({
          error: 'shop query parameter is required for Shopify',
        });
      }

      const store = await prisma.store.findUnique({
        where: { publicId },
      });

      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      const providerImpl = providerRegistry.get(provider as POSProvider);
      const redirectUri = `${config.APP_BASE_URL}/api/v1/pos/oauth/${provider}/callback`;

      // Build OAuth URL — include frontendRedirectUrl in the state
      const shopDomain = shop as string | undefined;
      const storePublicId = publicId as string;
      const oauthUrl = providerImpl.getOAuthUrl(storePublicId, redirectUri, {
        shop: shopDomain,
        frontendRedirectUrl: `${config.APP_BASE_URL}/onboarding/${publicId}/connect`,
      });

      return res.json({ url: oauthUrl });
    } catch (error) {
      logger.error({ error }, 'Failed to generate OAuth URL');
      return res.status(500).json({ error: 'Failed to generate OAuth URL' });
    }
  }
  /**
   * DELETE /api/v1/onboarding/stores/:publicId
   * Permanently deletes a store and all associated data.
   */
  async deleteStore(req: AuthenticatedRequest, res: Response) {
    try {
      const { publicId } = req.params;

      const store = await prisma.store.findUnique({ where: { publicId } });
      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      await prisma.store.delete({ where: { publicId } });

      logger.info(
        { storeId: store.id, publicId, employeeEmail: req.user?.email },
        'Store deleted'
      );

      return res.json({ ok: true });
    } catch (error) {
      logger.error({ error }, 'Failed to delete store');
      return res.status(500).json({ error: 'Failed to delete store' });
    }
  }
}

export const onboardingController = new OnboardingController();
