import { POSProvider, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { providerRegistry, NormalizedTransaction } from '../providers';
import { posConnectionService } from './posConnection.service';
import { sessionService } from './session.service';
import { auditService } from './audit.service';
import { logger } from '../lib/logger';

interface ProcessResult {
  success: boolean;
  eventId?: string;
  message?: string;
}

/**
 * Unified webhook processing service for all POS providers
 */
class WebhookService {
  /**
   * Process incoming webhook from any provider
   */
  async processWebhook(
    provider: POSProvider,
    rawBody: string,
    headers: Record<string, string>,
    webhookSecret: string
  ): Promise<ProcessResult> {
    const providerImpl = providerRegistry.get(provider);

    // Validate webhook signature
    const validation = providerImpl.validateWebhook(rawBody, headers, webhookSecret);

    if (!validation.isValid) {
      logger.warn({ provider }, 'Webhook signature validation failed');
      return { success: false, message: 'Invalid signature' };
    }

    const { eventId, eventType, payload } = validation;

    if (!eventId) {
      logger.warn({ provider }, 'Webhook missing event ID');
      return { success: false, message: 'Missing event ID' };
    }

    // Check for duplicate (idempotency)
    const existing = await prisma.webhookEvent.findUnique({
      where: { provider_eventId: { provider, eventId } },
    });

    if (existing) {
      logger.debug({ provider, eventId }, 'Duplicate webhook event, skipping');
      return { success: true, eventId, message: 'Duplicate event' };
    }

    // Create webhook event record
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        provider,
        eventId,
        eventType: eventType || 'unknown',
        payload: payload as Prisma.InputJsonValue,
        status: 'RECEIVED',
      },
    });

    try {
      // Parse transaction from webhook
      const transaction = providerImpl.parseTransactionFromWebhook(payload);

      if (!transaction) {
        await this.updateEventStatus(webhookEvent.id, 'SKIPPED', 'Not a transaction event');
        return { success: true, eventId, message: 'Not a transaction event' };
      }

      if (transaction.status !== 'COMPLETED') {
        await this.updateEventStatus(
          webhookEvent.id,
          'SKIPPED',
          `Transaction status: ${transaction.status}`
        );
        return { success: true, eventId, message: 'Non-completed transaction' };
      }

      // Find POS connection by location/merchant ID
      const connection = await posConnectionService.findByProviderIdentifier(provider, {
        locationId: transaction.locationId,
        merchantId: transaction.merchantId,
      });

      if (!connection) {
        await this.updateEventStatus(webhookEvent.id, 'SKIPPED', 'No matching connection');
        logger.warn(
          { provider, locationId: transaction.locationId, merchantId: transaction.merchantId },
          'No POS connection found for webhook'
        );
        return { success: true, eventId, message: 'No matching connection' };
      }

      // Update webhook event with connection
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { posConnectionId: connection.id },
      });

      // Process the completed transaction
      await this.processCompletedTransaction(connection, transaction, provider);

      await this.updateEventStatus(webhookEvent.id, 'PROCESSED');

      return { success: true, eventId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateEventStatus(webhookEvent.id, 'FAILED', errorMessage);
      logger.error({ error, provider, eventId }, 'Webhook processing failed');
      throw error;
    }
  }

  /**
   * Process a completed transaction - create order and review session
   */
  private async processCompletedTransaction(
    connection: Awaited<ReturnType<typeof posConnectionService.findByProviderIdentifier>> & {},
    transaction: NormalizedTransaction,
    provider: POSProvider
  ): Promise<void> {
    // Check if order already exists
    const existingOrder = await prisma.order.findUnique({
      where: {
        provider_externalOrderId: {
          provider,
          externalOrderId: transaction.externalOrderId,
        },
      },
    });

    if (existingOrder) {
      logger.debug(
        { orderId: transaction.externalOrderId, provider },
        'Order already exists'
      );
      return;
    }

    // Fetch full order details from provider
    const accessToken = await posConnectionService.getAccessToken(connection.id);
    const providerImpl = providerRegistry.get(provider);
    const metadata = connection.providerMetadata as Record<string, unknown> | null;
    const shopDomain = metadata?.shopDomain as string | undefined;
    const orderDetails = await providerImpl.getOrder(accessToken, transaction.externalOrderId, { shop: shopDomain });

    // Create order
    const order = await prisma.order.create({
      data: {
        storeId: connection.storeId,
        posConnectionId: connection.id,
        provider,
        externalOrderId: orderDetails.externalOrderId,
        // For backwards compatibility with Square
        squareOrderId: provider === 'SQUARE' ? orderDetails.externalOrderId : null,
        totalAmount: orderDetails.totalAmount,
        currency: orderDetails.currency,
        lineItemsJson: orderDetails.lineItems as unknown as Prisma.InputJsonValue,
        rawPayload: orderDetails.rawPayload as Prisma.InputJsonValue,
      },
    });

    // Create review session
    const session = await sessionService.createSessionForOrder(connection.storeId, order.id);

    // Audit
    await auditService.logEvent(
      connection.storeId,
      'SESSION_CREATED',
      { orderId: order.id, provider },
      session.id
    );

    logger.info(
      {
        storeId: connection.storeId,
        orderId: order.id,
        sessionId: session.id,
        provider,
      },
      'Created order and session from webhook'
    );
  }

  /**
   * Update webhook event status
   */
  private async updateEventStatus(
    eventId: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status,
        errorMessage,
        processedAt: status === 'PROCESSED' ? new Date() : undefined,
      },
    });
  }
}

export const webhookService = new WebhookService();
