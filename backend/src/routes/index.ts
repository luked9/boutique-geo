import { Router } from 'express';
import { healthController } from '../controllers/health.controller';
import { storesController } from '../controllers/stores.controller';
import { kioskController } from '../controllers/kiosk.controller';
import { squareController } from '../controllers/square.controller';
import { landingController } from '../controllers/landing.controller';
import posRoutes from './pos.routes';

const router = Router();

// Multi-provider POS routes
router.use('/pos', posRoutes);

// Health check
router.get('/health', (req, res) => healthController.check(req, res));

// Store management
router.post('/stores', (req, res) => storesController.create(req, res));
router.get('/stores/:publicId', (req, res) => storesController.getByPublicId(req, res));
router.patch('/stores/:publicId', (req, res) => storesController.update(req, res));

// Kiosk endpoints (iPad app)
router.get('/kiosk/:storePublicId/next', (req, res) => kioskController.getNext(req, res));
router.post('/kiosk/:storePublicId/sessions/:sessionPublicId/rating', (req, res) =>
  kioskController.submitRating(req, res)
);
router.post('/kiosk/:storePublicId/sessions/:sessionPublicId/approve', (req, res) =>
  kioskController.approve(req, res)
);
router.post('/kiosk/:storePublicId/sessions/:sessionPublicId/decline', (req, res) =>
  kioskController.decline(req, res)
);

// Square OAuth
router.get('/square/oauth/start', (req, res) => squareController.oauthStart(req, res));
router.get('/square/oauth/callback', (req, res) => squareController.oauthCallback(req, res));
router.post('/square/webhook', (req, res) => squareController.webhook(req, res));

// Review landing page API endpoints
router.post('/review/:sessionPublicId/copied', (req, res) => landingController.logCopied(req, res));
router.post('/review/:sessionPublicId/platform_clicked', (req, res) =>
  landingController.logPlatformClicked(req, res)
);
router.post('/review/:sessionPublicId/done', (req, res) => landingController.markDone(req, res));

export default router;
