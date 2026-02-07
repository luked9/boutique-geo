import { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../config';

/**
 * Middleware to verify Square webhook signatures.
 *
 * Square webhooks include a signature in the 'x-square-hmacsha256-signature' header.
 * The signature is generated using HMAC-SHA256 with the webhook signature key
 * and base64 encoded.
 *
 * @see https://developer.squareup.com/docs/webhooks/step3validate
 */
export function squareWebhookVerify(req: Request, res: Response, next: NextFunction): void {
  const signature = req.get('x-square-hmacsha256-signature');

  if (!signature) {
    res.status(401).json({
      error: 'Missing signature header',
      message: 'x-square-hmacsha256-signature header is required'
    });
    return;
  }

  // Get the raw body - this should be set by express.raw() middleware
  const rawBody = (req as any).rawBody;

  if (!rawBody) {
    res.status(500).json({
      error: 'Raw body not available',
      message: 'Express must be configured with raw body parser for webhook routes'
    });
    return;
  }

  try {
    // Create HMAC using the webhook signature key
    const hmac = createHmac('sha256', config.SQUARE_WEBHOOK_SIGNATURE_KEY || '');

    // Update with the raw request body (URL + body according to Square docs)
    // For webhook validation, Square uses: notification URL + request body
    const notificationUrl = `${config.APP_BASE_URL}${req.originalUrl}`;
    hmac.update(notificationUrl + rawBody);

    // Get the base64 encoded signature
    const expectedSignature = hmac.digest('base64');

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    // Ensure buffers are the same length before comparison
    if (signatureBuffer.length !== expectedBuffer.length) {
      res.status(401).json({
        error: 'Invalid signature',
        message: 'Webhook signature verification failed'
      });
      return;
    }

    // Perform timing-safe comparison
    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      res.status(401).json({
        error: 'Invalid signature',
        message: 'Webhook signature verification failed'
      });
      return;
    }

    // Signature is valid, proceed to the next middleware
    next();
  } catch (error) {
    console.error('Error verifying Square webhook signature:', error);
    res.status(500).json({
      error: 'Signature verification error',
      message: 'An error occurred while verifying the webhook signature'
    });
  }
}

/**
 * Express middleware to capture raw body for webhook signature verification.
 * This should be applied before the webhook route to preserve the raw request body.
 *
 * Usage:
 * app.use('/webhooks/square', express.json({ verify: captureRawBody }));
 */
export function captureRawBody(req: Request, _res: Response, buf: Buffer, encoding: BufferEncoding): void {
  if (buf && buf.length) {
    (req as any).rawBody = buf.toString(encoding || 'utf8');
  }
}
