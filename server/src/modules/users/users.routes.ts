import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { getUploadAuth } from '../../integrations/imagekit';

const router = Router();

// Public profile
router.get('/:userId/profile', optionalAuth, usersController.getPublicProfile);

// Authenticated user profile routes
router.get('/me', authenticate, usersController.getMe);
router.patch('/me', authenticate, usersController.updateProfile);
router.post('/me/change-password', authenticate, usersController.changePassword);
router.get('/me/image-upload-auth', authenticate, (_req, res) => {
  res.json({ success: true, data: getUploadAuth() });
});

// Watchlist
router.get('/me/watchlist', authenticate, usersController.getWatchlist);
router.post('/me/watchlist/:listingId', authenticate, usersController.addToWatchlist);
router.delete('/me/watchlist/:listingId', authenticate, usersController.removeFromWatchlist);

// Notifications
router.get('/me/notifications', authenticate, usersController.getNotifications);
router.post('/me/notifications/read', authenticate, usersController.markNotificationsRead);

// Followed sellers
router.get('/me/following', authenticate, usersController.getFollowedSellers);

// Bids
router.get('/me/bids', authenticate, usersController.getUserBids);

export default router;
