import { Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../lib/logger';
import { sessionService } from '../services/session.service';
import { auditService } from '../services/audit.service';
import { prisma } from '../lib/prisma';
import { PlatformClickDto } from '../types/dto';

export class LandingController {
  private landingTemplate: string;
  private noSessionTemplate: string;

  constructor() {
    // Load HTML templates
    this.landingTemplate = readFileSync(
      join(__dirname, '../templates/landing.html'),
      'utf-8'
    );
    this.noSessionTemplate = readFileSync(
      join(__dirname, '../templates/no-session.html'),
      'utf-8'
    );
  }

  /**
   * GET /tap/:storePublicId
   * Render landing page for store's latest approved session (NFC tag target)
   */
  async tapLanding(req: Request, res: Response) {
    try {
      const storePublicId = req.params.storePublicId as string;

      // Get latest approved session
      const session = await sessionService.getLatestApprovedSession(storePublicId);

      if (!session) {
        logger.debug({ storePublicId }, 'No approved session found for store');
        return res.send(this.noSessionTemplate);
      }

      // Get store details
      const store = await prisma.store.findUnique({
        where: { id: session.storeId },
      });

      if (!store) {
        logger.error({ sessionId: session.id }, 'Store not found for session');
        return res.send(this.noSessionTemplate);
      }

      const html = this.renderLandingPage({
        storeName: store.name,
        reviewText: session.generatedReviewText || 'Thank you for your visit!',
        sessionId: session.publicId,
        reviewDestinationUrl: store.reviewDestinationUrl,
      });

      logger.info(
        { storePublicId, sessionId: session.id },
        'Rendered tap landing page'
      );

      return res.send(html);
    } catch (error) {
      logger.error({ error }, 'Failed to render tap landing page');
      return res.status(500).send(this.noSessionTemplate);
    }
  }

  /**
   * GET /r/:sessionPublicId
   * Render landing page for specific session (QR code target)
   */
  async sessionLanding(req: Request, res: Response) {
    try {
      const sessionPublicId = req.params.sessionPublicId as string;

      // Get session
      const session = await sessionService.getSessionByPublicId(sessionPublicId);

      if (!session) {
        logger.warn({ sessionPublicId }, 'Session not found');
        return res.send(this.noSessionTemplate);
      }

      // Only show approved sessions
      if (session.status !== 'APPROVED') {
        logger.debug({ sessionPublicId, status: session.status }, 'Session not approved');
        return res.send(this.noSessionTemplate);
      }

      // Get store details
      const store = await prisma.store.findUnique({
        where: { id: session.storeId },
      });

      if (!store) {
        logger.error({ sessionId: session.id }, 'Store not found for session');
        return res.send(this.noSessionTemplate);
      }

      const html = this.renderLandingPage({
        storeName: store.name,
        reviewText: session.generatedReviewText || 'Thank you for your visit!',
        sessionId: session.publicId,
        reviewDestinationUrl: store.reviewDestinationUrl,
      });

      logger.info(
        { sessionPublicId },
        'Rendered session landing page'
      );

      return res.send(html);
    } catch (error) {
      logger.error({ error }, 'Failed to render session landing page');
      return res.status(500).send(this.noSessionTemplate);
    }
  }

  /**
   * POST /api/v1/review/:sessionPublicId/copied
   * Log COPIED audit event
   */
  async logCopied(req: Request, res: Response) {
    try {
      const sessionPublicId = req.params.sessionPublicId as string;

      const session = await sessionService.getSessionByPublicId(sessionPublicId);

      if (!session) {
        return res.status(404).json({
          error: 'Session not found',
        });
      }

      await auditService.logEvent(
        session.storeId,
        'COPIED',
        {},
        session.id
      );

      logger.debug({ sessionPublicId }, 'Logged COPIED event');

      return res.json({ ok: true });
    } catch (error) {
      logger.error({ error }, 'Failed to log copied event');
      return res.status(500).json({
        error: 'Failed to log event',
      });
    }
  }

  /**
   * POST /api/v1/review/:sessionPublicId/platform_clicked
   * Log PLATFORM_CLICKED audit event with platform
   */
  async logPlatformClicked(req: Request, res: Response) {
    try {
      const sessionPublicId = req.params.sessionPublicId as string;
      const dto = req.body as PlatformClickDto;

      const session = await sessionService.getSessionByPublicId(sessionPublicId);

      if (!session) {
        return res.status(404).json({
          error: 'Session not found',
        });
      }

      await auditService.logEvent(
        session.storeId,
        'PLATFORM_CLICKED',
        { platform: dto.platform },
        session.id
      );

      logger.debug({ sessionPublicId, platform: dto.platform }, 'Logged PLATFORM_CLICKED event');

      return res.json({ ok: true });
    } catch (error) {
      logger.error({ error }, 'Failed to log platform clicked event');
      return res.status(500).json({
        error: 'Failed to log event',
      });
    }
  }

  /**
   * POST /api/v1/review/:sessionPublicId/done
   * Set session status to POSTED_INTENT
   */
  async markDone(req: Request, res: Response) {
    try {
      const sessionPublicId = req.params.sessionPublicId as string;

      const session = await sessionService.getSessionByPublicId(sessionPublicId);

      if (!session) {
        return res.status(404).json({
          error: 'Session not found',
        });
      }

      await sessionService.markPostedIntent(sessionPublicId);

      await auditService.logEvent(
        session.storeId,
        'POSTED_INTENT',
        {},
        session.id
      );

      logger.info({ sessionPublicId }, 'Session marked as POSTED_INTENT');

      return res.json({ ok: true });
    } catch (error) {
      logger.error({ error }, 'Failed to mark session as done');
      return res.status(500).json({
        error: 'Failed to mark as done',
      });
    }
  }

  /**
   * Render landing page HTML by replacing template variables
   */
  private renderLandingPage(data: {
    storeName: string;
    reviewText: string;
    sessionId: string;
    reviewDestinationUrl: string;
  }): string {
    return this.landingTemplate
      .replace(/\$\{storeName\}/g, this.escapeHtml(data.storeName))
      .replace(/\$\{reviewText\}/g, this.escapeHtml(data.reviewText))
      .replace(/\$\{sessionId\}/g, this.escapeHtml(data.sessionId))
      .replace(/\$\{reviewDestinationUrl\}/g, this.escapeJs(data.reviewDestinationUrl));
  }

  /**
   * Escape for use inside a JavaScript string (single-quoted)
   */
  private escapeJs(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m] ?? m);
  }
}

export const landingController = new LandingController();
