import { Router } from 'express';
import { adminController } from './admin.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Protect all admin routes
router.use(authenticate);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

router.get('/kpis', adminController.getKPIs);
router.get('/sellers', adminController.getSellerApplications);
router.post('/sellers/:id/review', adminController.reviewSellerApplication);
router.get('/moderation', adminController.getModerationQueue);
router.post('/moderation/:id/decide', adminController.decideListingModeration);
router.get('/auctions/live', adminController.getLiveAuctions);
router.post('/auctions/:id/cancel', adminController.emergencyCancelAuction);
router.get('/disputes', adminController.getDisputes);
router.post('/disputes/:id/adjudicate', adminController.adjudicateDispute);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/export', adminController.exportCSV);
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.get('/orders', adminController.getOrders);
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.patch('/categories/:id', adminController.updateCategory);

export default router;
