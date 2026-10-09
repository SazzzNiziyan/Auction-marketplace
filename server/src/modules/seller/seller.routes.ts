import { Router } from 'express';
import { sellerController } from './seller.controller';
import { authenticate, optionalAuth, requireRole } from '../../middleware/auth';

const router = Router();

// Public storefront view
router.get('/storefront/:sellerId', optionalAuth, sellerController.getPublicStorefront);

// Authenticated actions
router.post('/apply', authenticate, sellerController.apply);
router.get('/application', authenticate, sellerController.getMyApplication);
router.post('/follow/:sellerId', authenticate, sellerController.followSeller);
router.delete('/follow/:sellerId', authenticate, sellerController.unfollowSeller);

// Seller dashboard & profile (require SELLER or ADMIN role)
router.get('/profile', authenticate, requireRole(['SELLER', 'ADMIN', 'SUPER_ADMIN']), sellerController.getProfile);
router.patch('/profile', authenticate, requireRole(['SELLER', 'ADMIN', 'SUPER_ADMIN']), sellerController.updateProfile);
router.get('/dashboard', authenticate, requireRole(['SELLER', 'ADMIN', 'SUPER_ADMIN']), sellerController.getDashboard);
router.get('/earnings', authenticate, requireRole(['SELLER', 'ADMIN', 'SUPER_ADMIN']), sellerController.getEarnings);
// Inventory = seller's own listings
router.get('/inventory', authenticate, requireRole(['SELLER', 'ADMIN', 'SUPER_ADMIN']), sellerController.getInventory);
// Settings = alias for profile (GET/PUT)
router.get('/settings', authenticate, requireRole(['SELLER', 'ADMIN', 'SUPER_ADMIN']), sellerController.getProfile);
router.put('/settings', authenticate, requireRole(['SELLER', 'ADMIN', 'SUPER_ADMIN']), sellerController.updateProfile);
// Disputes
router.get('/disputes', authenticate, requireRole(['SELLER', 'ADMIN', 'SUPER_ADMIN']), sellerController.getDisputes);
router.post('/disputes/:disputeId/respond', authenticate, requireRole(['SELLER', 'ADMIN', 'SUPER_ADMIN']), sellerController.respondToDispute);

export default router;
