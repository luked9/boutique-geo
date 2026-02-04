import { Router } from 'express';
import { posController } from '../controllers/pos.controller';

const router = Router();

// OAuth
router.get('/oauth/:provider/start', (req, res) => posController.oauthStart(req, res));
router.get('/oauth/:provider/callback', (req, res) => posController.oauthCallback(req, res));

// Webhooks
router.post('/webhook/:provider', (req, res) => posController.webhook(req, res));

// Connection management
router.get('/connections/:storePublicId', (req, res) => posController.listConnections(req, res));
router.delete('/connections/:storePublicId/:provider', (req, res) => posController.disconnect(req, res));
router.patch('/connections/:storePublicId/:provider/location', (req, res) => posController.setLocation(req, res));

export default router;
