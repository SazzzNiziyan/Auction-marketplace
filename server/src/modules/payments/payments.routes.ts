import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Webhook endpoint (public with signature header)
router.post('/webhook', paymentsController.webhook);

// Authenticated verification
router.post('/verify', authenticate, paymentsController.verify);

// Admin refunds
router.post('/refund', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), paymentsController.refund);

export default router;
