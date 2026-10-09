import { Router } from 'express';
import { auctionsController } from './auctions.controller';
import { authenticate, optionalAuth, requireRole } from '../../middleware/auth';

const router = Router();

// Public / optional auth
/**
 * @swagger
 * tags:
 *   name: Auctions
 *   description: Real-time auction bidding and management
 */

/**
 * @swagger
 * /auctions/{id}:
 *   get:
 *     summary: Get auction details and current status
 *     tags: [Auctions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Auction data including highest bid
 */
router.get('/:id', optionalAuth, auctionsController.getAuction);

// Authenticated bidder actions
/**
 * @swagger
 * /auctions/{id}/deposit:
 *   post:
 *     summary: Pay caution deposit to participate in auction
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deposit processed
 */
router.post('/:id/deposit', authenticate, auctionsController.payCautionDeposit);

/**
 * @swagger
 * /auctions/{id}/bid:
 *   post:
 *     summary: Place a new bid on an auction
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amountPaise]
 *             properties:
 *               amountPaise:
 *                 type: number
 *                 description: Bid amount in Paise
 *     responses:
 *       200:
 *         description: Bid accepted
 */
router.post('/:id/bid', authenticate, auctionsController.placeBid);

/**
 * @swagger
 * /auctions/{id}/autobid:
 *   post:
 *     summary: Set up autobid limits
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [maxAmountPaise]
 *             properties:
 *               maxAmountPaise:
 *                 type: number
 *     responses:
 *       200:
 *         description: Autobid configured
 */
router.post('/:id/autobid', authenticate, auctionsController.setAutoBid);

// Admin close trigger
/**
 * @swagger
 * /auctions/{id}/close:
 *   post:
 *     summary: Manually close an auction (Admin only)
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Auction closed
 */
router.post('/:id/close', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), auctionsController.closeAuction);

export default router;
