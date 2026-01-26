import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { generateStoreId } from '../utils/ids';
import { CreateStoreDto, UpdateStoreDto } from '../types/dto';

export class StoresController {
  /**
   * POST /api/v1/stores
   * Create a new store
   */
  async create(req: Request, res: Response) {
    try {
      const dto = req.body as CreateStoreDto;

      const publicId = generateStoreId();

      const store = await prisma.store.create({
        data: {
          publicId,
          name: dto.name,
          primaryReviewPlatform: dto.primaryReviewPlatform,
          reviewDestinationUrl: dto.reviewDestinationUrl,
        },
      });

      logger.info({ storeId: store.id, publicId: store.publicId }, 'Store created');

      return res.status(201).json({
        id: store.id,
        publicId: store.publicId,
        name: store.name,
        primaryReviewPlatform: store.primaryReviewPlatform,
        reviewDestinationUrl: store.reviewDestinationUrl,
        squareConnected: !!store.accessTokenEnc,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create store');
      return res.status(500).json({
        error: 'Failed to create store',
      });
    }
  }

  /**
   * GET /api/v1/stores/:publicId
   * Get store by public ID
   */
  async getByPublicId(req: Request, res: Response) {
    try {
      const { publicId } = req.params;

      const store = await prisma.store.findUnique({
        where: { publicId },
      });

      if (!store) {
        return res.status(404).json({
          error: 'Store not found',
        });
      }

      logger.debug({ storeId: store.id, publicId }, 'Store retrieved');

      return res.json({
        id: store.id,
        publicId: store.publicId,
        name: store.name,
        primaryReviewPlatform: store.primaryReviewPlatform,
        reviewDestinationUrl: store.reviewDestinationUrl,
        squareConnected: !!store.accessTokenEnc,
        squareMerchantId: store.squareMerchantId,
        squareLocationId: store.squareLocationId,
        lastApprovedSessionId: store.lastApprovedSessionId,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get store');
      return res.status(500).json({
        error: 'Failed to get store',
      });
    }
  }

  /**
   * PATCH /api/v1/stores/:publicId
   * Update store
   */
  async update(req: Request, res: Response) {
    try {
      const { publicId } = req.params;
      const dto = req.body as UpdateStoreDto;

      const existingStore = await prisma.store.findUnique({
        where: { publicId },
      });

      if (!existingStore) {
        return res.status(404).json({
          error: 'Store not found',
        });
      }

      const updateData: any = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.primaryReviewPlatform !== undefined)
        updateData.primaryReviewPlatform = dto.primaryReviewPlatform;
      if (dto.reviewDestinationUrl !== undefined)
        updateData.reviewDestinationUrl = dto.reviewDestinationUrl;

      const store = await prisma.store.update({
        where: { publicId },
        data: updateData,
      });

      logger.info({ storeId: store.id, publicId }, 'Store updated');

      return res.json({
        id: store.id,
        publicId: store.publicId,
        name: store.name,
        primaryReviewPlatform: store.primaryReviewPlatform,
        reviewDestinationUrl: store.reviewDestinationUrl,
        squareConnected: !!store.accessTokenEnc,
        squareMerchantId: store.squareMerchantId,
        squareLocationId: store.squareLocationId,
        lastApprovedSessionId: store.lastApprovedSessionId,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update store');
      return res.status(500).json({
        error: 'Failed to update store',
      });
    }
  }
}

export const storesController = new StoresController();
