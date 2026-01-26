import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * Audit event logging service
 * Tracks all user interactions and system events for analytics
 */

export class AuditService {
  /**
   * Logs an audit event to the database
   * @param storeId - Store UUID
   * @param eventType - Type of event (e.g., SESSION_CREATED, RATING_SUBMITTED)
   * @param payload - Event-specific data as object
   * @param sessionId - Optional session UUID
   */
  async logEvent(
    storeId: string,
    eventType: string,
    payload: object,
    sessionId?: string
  ): Promise<void> {
    try {
      await prisma.auditEvent.create({
        data: {
          storeId,
          reviewSessionId: sessionId || null,
          eventType,
          payload: payload as any, // Prisma handles JSONB conversion
        },
      });

      logger.info(
        { eventType, storeId, sessionId, payload },
        'Audit event logged'
      );
    } catch (error) {
      logger.error(
        { error, eventType, storeId, sessionId },
        'Failed to log audit event'
      );
      // Don't throw - audit logging should not break main flow
    }
  }
}

export const auditService = new AuditService();
