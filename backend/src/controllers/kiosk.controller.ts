import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { sessionService } from '../services/session.service';
import { reviewGenService } from '../services/reviewGen.service';
import { auditService } from '../services/audit.service';
import { RatingDto } from '../types/dto';

export class KioskController {
  /**
   * GET /api/v1/kiosk/:storePublicId/next
   * Get next pending session for store with order details
   */
  async getNext(req: Request, res: Response) {
    try {
      const storePublicId = req.params.storePublicId as string;

      // Get next pending session
      const result = await sessionService.getNextPendingSession(storePublicId);

      if (!result) {
        return res.json({
          session: null,
          order: null,
        });
      }

      // Format response
      const sessionData = {
        publicId: result.session.publicId,
        status: result.session.status,
        createdAt: result.session.createdAt,
      };

      const orderData = result.order
        ? {
            totalAmount: result.order.totalAmount,
            currency: result.order.currency,
            items: result.order.lineItemsJson as Array<{
              name: string;
              quantity: number;
              amount: number;
            }>,
          }
        : null;

      logger.debug(
        { sessionPublicId: result.session.publicId },
        'Next pending session retrieved'
      );

      return res.json({
        session: sessionData,
        order: orderData,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get next pending session');
      return res.status(500).json({
        error: 'Failed to get next session',
      });
    }
  }

  /**
   * POST /api/v1/kiosk/:storePublicId/sessions/:sessionPublicId/rating
   * Submit rating and generate review
   */
  async submitRating(req: Request, res: Response) {
    try {
      const storePublicId = req.params.storePublicId as string;
      const sessionPublicId = req.params.sessionPublicId as string;
      const dto = req.body as RatingDto;

      // Find session with store and order
      const session = await prisma.reviewSession.findFirst({
        where: {
          publicId: sessionPublicId,
          store: { publicId: storePublicId },
        },
        include: {
          store: true,
          order: true,
        },
      });

      if (!session) {
        return res.status(404).json({
          error: 'Session not found',
        });
      }

      if (session.status !== 'PENDING') {
        return res.status(400).json({
          error: 'Session is not in pending state',
        });
      }

      // Generate review text
      let reviewText = '';

      if (session.order) {
        const items = session.order.lineItemsJson as Array<{
          name: string;
          quantity: number;
          amount: number;
        }>;

        reviewText = await reviewGenService.generateReview(
          session.store.name,
          dto.starRating,
          items
        );
      } else {
        // Fallback if no order
        reviewText = 'Thank you for your visit!';
      }

      // Update session with rating and review text
      await sessionService.updateSessionRating(
        sessionPublicId,
        dto.starRating,
        reviewText
      );

      // Create audit event
      await auditService.logEvent(
        session.storeId,
        'RATING_SUBMITTED',
        { starRating: dto.starRating },
        session.id
      );

      logger.info(
        { sessionId: session.id, starRating: dto.starRating },
        'Rating submitted and review generated'
      );

      return res.json({
        generatedReviewText: reviewText,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to submit rating');
      return res.status(500).json({
        error: 'Failed to submit rating',
      });
    }
  }

  /**
   * POST /api/v1/kiosk/:storePublicId/sessions/:sessionPublicId/approve
   * Approve session and update lastApprovedSessionId
   */
  async approve(req: Request, res: Response) {
    try {
      const sessionPublicId = req.params.sessionPublicId as string;

      // Find session to get storeId for audit
      const session = await sessionService.getSessionByPublicId(sessionPublicId);

      if (!session) {
        return res.status(404).json({
          error: 'Session not found',
        });
      }

      // Approve session (also updates store.lastApprovedSessionId)
      await sessionService.approveSession(sessionPublicId);

      // Create audit event
      await auditService.logEvent(
        session.storeId,
        'APPROVED',
        {},
        session.id
      );

      logger.info({ sessionId: session.id }, 'Session approved');

      return res.json({
        ok: true,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to approve session');
      return res.status(500).json({
        error: 'Failed to approve session',
      });
    }
  }

  /**
   * POST /api/v1/kiosk/:storePublicId/sessions/:sessionPublicId/decline
   * Decline session
   */
  async decline(req: Request, res: Response) {
    try {
      const sessionPublicId = req.params.sessionPublicId as string;

      // Find session to get storeId for audit
      const session = await sessionService.getSessionByPublicId(sessionPublicId);

      if (!session) {
        return res.status(404).json({
          error: 'Session not found',
        });
      }

      // Decline session
      await sessionService.declineSession(sessionPublicId);

      // Create audit event
      await auditService.logEvent(
        session.storeId,
        'DECLINED',
        {},
        session.id
      );

      logger.info({ sessionId: session.id }, 'Session declined');

      return res.json({
        ok: true,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to decline session');
      return res.status(500).json({
        error: 'Failed to decline session',
      });
    }
  }
}

export const kioskController = new KioskController();
