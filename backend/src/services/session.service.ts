import { ReviewSession, Order, SessionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { generateSessionId } from '../utils/ids';

/**
 * Review session management service
 * Handles creation, retrieval, and state transitions of review sessions
 */

interface SessionWithOrder {
  session: ReviewSession;
  order: Order | null;
}

export class SessionService {
  /**
   * Creates a new pending review session for an order
   * @param storeId - Store UUID
   * @param orderId - Order UUID
   * @returns Created review session
   */
  async createSessionForOrder(storeId: string, orderId: string): Promise<ReviewSession> {
    try {
      const publicId = generateSessionId();

      const session = await prisma.reviewSession.create({
        data: {
          publicId,
          storeId,
          orderId,
          status: SessionStatus.PENDING,
        },
      });

      logger.info(
        { sessionId: session.id, publicId, storeId, orderId },
        'Created review session for order'
      );

      return session;
    } catch (error) {
      logger.error({ error, storeId, orderId }, 'Failed to create session');
      throw new Error('Failed to create review session');
    }
  }

  /**
   * Gets the next pending session for a store (for iPad kiosk)
   * Returns the oldest pending session with its order details
   * @param storePublicId - Store public ID
   * @returns Session and order data, or null if no pending sessions
   */
  async getNextPendingSession(storePublicId: string): Promise<SessionWithOrder | null> {
    try {
      // First, find the store
      const store = await prisma.store.findUnique({
        where: { publicId: storePublicId },
      });

      if (!store) {
        logger.warn({ storePublicId }, 'Store not found for next pending session');
        return null;
      }

      // Find oldest pending session
      const session = await prisma.reviewSession.findFirst({
        where: {
          storeId: store.id,
          status: SessionStatus.PENDING,
        },
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          order: true,
        },
      });

      if (!session) {
        logger.debug({ storePublicId }, 'No pending sessions found');
        return null;
      }

      logger.info(
        { sessionId: session.id, publicId: session.publicId },
        'Retrieved next pending session'
      );

      return {
        session,
        order: session.order,
      };
    } catch (error) {
      logger.error({ error, storePublicId }, 'Failed to get next pending session');
      throw new Error('Failed to retrieve pending session');
    }
  }

  /**
   * Updates session with star rating and generated review text
   * @param sessionPublicId - Session public ID
   * @param rating - Star rating (1-5)
   * @param reviewText - AI-generated review text
   */
  async updateSessionRating(
    sessionPublicId: string,
    rating: number,
    reviewText: string
  ): Promise<void> {
    try {
      // Validate rating
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        throw new Error('Rating must be an integer between 1 and 5');
      }

      await prisma.reviewSession.update({
        where: { publicId: sessionPublicId },
        data: {
          starRating: rating,
          generatedReviewText: reviewText,
        },
      });

      logger.info(
        { sessionPublicId, rating },
        'Updated session with rating and review text'
      );
    } catch (error) {
      logger.error({ error, sessionPublicId }, 'Failed to update session rating');
      throw new Error('Failed to update session rating');
    }
  }

  /**
   * Approves a session (customer consents to use the review)
   * Also updates store.lastApprovedSessionId to this session
   * @param sessionPublicId - Session public ID
   */
  async approveSession(sessionPublicId: string): Promise<void> {
    try {
      // Update session status
      const session = await prisma.reviewSession.update({
        where: { publicId: sessionPublicId },
        data: {
          status: SessionStatus.APPROVED,
        },
      });

      // Update store's lastApprovedSessionId
      await prisma.store.update({
        where: { id: session.storeId },
        data: {
          lastApprovedSessionId: session.id,
        },
      });

      logger.info({ sessionPublicId, sessionId: session.id }, 'Approved session');
    } catch (error) {
      logger.error({ error, sessionPublicId }, 'Failed to approve session');
      throw new Error('Failed to approve session');
    }
  }

  /**
   * Declines a session (customer doesn't want to use the review)
   * @param sessionPublicId - Session public ID
   */
  async declineSession(sessionPublicId: string): Promise<void> {
    try {
      await prisma.reviewSession.update({
        where: { publicId: sessionPublicId },
        data: {
          status: SessionStatus.DECLINED,
        },
      });

      logger.info({ sessionPublicId }, 'Declined session');
    } catch (error) {
      logger.error({ error, sessionPublicId }, 'Failed to decline session');
      throw new Error('Failed to decline session');
    }
  }

  /**
   * Marks session as posted intent (customer clicked "Done" on landing page)
   * @param sessionPublicId - Session public ID
   */
  async markPostedIntent(sessionPublicId: string): Promise<void> {
    try {
      await prisma.reviewSession.update({
        where: { publicId: sessionPublicId },
        data: {
          status: SessionStatus.POSTED_INTENT,
        },
      });

      logger.info({ sessionPublicId }, 'Marked session as posted intent');
    } catch (error) {
      logger.error({ error, sessionPublicId }, 'Failed to mark posted intent');
      throw new Error('Failed to mark session as posted');
    }
  }

  /**
   * Gets a session by its public ID
   * @param publicId - Session public ID
   * @returns Review session or null if not found
   */
  async getSessionByPublicId(publicId: string): Promise<ReviewSession | null> {
    try {
      const session = await prisma.reviewSession.findUnique({
        where: { publicId },
      });

      if (session) {
        logger.debug({ publicId, sessionId: session.id }, 'Retrieved session by public ID');
      }

      return session;
    } catch (error) {
      logger.error({ error, publicId }, 'Failed to get session by public ID');
      throw new Error('Failed to retrieve session');
    }
  }

  /**
   * Gets the latest approved session for a store (for NFC tag landing page)
   * @param storePublicId - Store public ID
   * @returns Latest approved session or null if none exists
   */
  async getLatestApprovedSession(storePublicId: string): Promise<ReviewSession | null> {
    try {
      // First, find the store
      const store = await prisma.store.findUnique({
        where: { publicId: storePublicId },
      });

      if (!store) {
        logger.warn({ storePublicId }, 'Store not found for latest approved session');
        return null;
      }

      // If store has lastApprovedSessionId, fetch that session
      if (store.lastApprovedSessionId) {
        const session = await prisma.reviewSession.findUnique({
          where: { id: store.lastApprovedSessionId },
        });

        if (session) {
          logger.info(
            { storePublicId, sessionId: session.id },
            'Retrieved latest approved session from store reference'
          );
          return session;
        }
      }

      // Fallback: find most recent approved session
      const session = await prisma.reviewSession.findFirst({
        where: {
          storeId: store.id,
          status: SessionStatus.APPROVED,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (session) {
        logger.info(
          { storePublicId, sessionId: session.id },
          'Retrieved latest approved session via query'
        );
      } else {
        logger.debug({ storePublicId }, 'No approved sessions found for store');
      }

      return session;
    } catch (error) {
      logger.error({ error, storePublicId }, 'Failed to get latest approved session');
      throw new Error('Failed to retrieve latest approved session');
    }
  }
}

export const sessionService = new SessionService();
