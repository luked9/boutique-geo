import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { onboardingController } from '../controllers/onboarding.controller';

const router = Router();

// All onboarding routes require employee authentication
router.use(requireAuth);

router.get('/stores', (req, res) => onboardingController.listStores(req, res));
router.post('/stores', (req, res) => onboardingController.createStore(req, res));
router.get('/stores/:publicId/status', (req, res) => onboardingController.getStoreStatus(req, res));
router.get('/stores/:publicId/oauth-url/:provider', (req, res) => onboardingController.getOAuthUrl(req, res));

export default router;
