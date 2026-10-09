import { Router } from 'express';
import { commerceController } from './commerce.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Cart routes (buyer)
router.get('/cart', authenticate, commerceController.getCart);
router.post('/cart', authenticate, commerceController.addToCart);
router.patch('/cart/:id', authenticate, commerceController.updateCartItem);
router.delete('/cart/:id', authenticate, commerceController.removeFromCart);
router.delete('/cart', authenticate, commerceController.clearCart);

// Checkout
router.post('/checkout', authenticate, commerceController.checkout);

// Order lists — registered before /orders/:id so "buyer"/"seller" are not captured as an id
router.get('/orders/buyer', authenticate, commerceController.getBuyerOrders);
router.get('/orders/seller', authenticate, requireRole(['SELLER', 'ADMIN', 'SUPER_ADMIN']), commerceController.getSellerOrders);

// Orders (buyer)
router.get('/orders/:id', authenticate, commerceController.getOrderById);
router.post('/orders/:id/refund', authenticate, commerceController.requestRefund);

// Orders (seller fulfillment)
router.post('/orders/:id/fulfill', authenticate, requireRole(['SELLER', 'ADMIN', 'SUPER_ADMIN']), commerceController.fulfillOrder);
router.post('/orders/:id/delivered', authenticate, requireRole(['SELLER', 'ADMIN', 'SUPER_ADMIN']), commerceController.markDelivered);

export default router;
