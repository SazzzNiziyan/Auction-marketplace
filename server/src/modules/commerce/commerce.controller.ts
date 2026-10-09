import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { commerceService } from './commerce.service';
import { addToCartSchema, updateCartItemSchema, checkoutSchema, fulfillOrderSchema, requestRefundSchema } from './commerce.schemas';
import { ValidationError } from '../../utils/errors';

export const commerceController = {
  getCart: asyncHandler(async (req: Request, res: Response) => {
    const data = await commerceService.getCart(req.user!.sub);
    res.json({ success: true, data });
  }),

  addToCart: asyncHandler(async (req: Request, res: Response) => {
    const parsed = addToCartSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid item data');
    const data = await commerceService.addToCart(req.user!.sub, parsed.data);
    res.status(201).json({ success: true, data });
  }),

  updateCartItem: asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateCartItemSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid quantity');
    const cartItemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await commerceService.updateCartItem(req.user!.sub, cartItemId, parsed.data);
    res.json({ success: true, data });
  }),

  removeFromCart: asyncHandler(async (req: Request, res: Response) => {
    const cartItemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await commerceService.removeFromCart(req.user!.sub, cartItemId);
    res.json({ success: true, ...result });
  }),

  clearCart: asyncHandler(async (req: Request, res: Response) => {
    const result = await commerceService.clearCart(req.user!.sub);
    res.json({ success: true, ...result });
  }),

  checkout: asyncHandler(async (req: Request, res: Response) => {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid checkout data');
    const data = await commerceService.checkout(req.user!.sub, parsed.data);
    res.status(201).json({ success: true, data });
  }),

  getBuyerOrders: asyncHandler(async (req: Request, res: Response) => {
    const data = await commerceService.getBuyerOrders(req.user!.sub);
    res.json({ success: true, data });
  }),

  getSellerOrders: asyncHandler(async (req: Request, res: Response) => {
    const data = await commerceService.getSellerOrders(req.user!.sub);
    res.json({ success: true, data });
  }),

  getOrderById: asyncHandler(async (req: Request, res: Response) => {
    const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await commerceService.getOrderById(orderId, req.user!.sub);
    res.json({ success: true, data });
  }),

  fulfillOrder: asyncHandler(async (req: Request, res: Response) => {
    const parsed = fulfillOrderSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid shipping data');
    const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await commerceService.fulfillOrder(req.user!.sub, orderId, parsed.data);
    res.json({ success: true, data });
  }),

  markDelivered: asyncHandler(async (req: Request, res: Response) => {
    const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await commerceService.markDelivered(req.user!.sub, orderId);
    res.json({ success: true, data });
  }),

  requestRefund: asyncHandler(async (req: Request, res: Response) => {
    const parsed = requestRefundSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid refund request');
    const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await commerceService.requestRefund(req.user!.sub, orderId, parsed.data);
    res.json({ success: true, data });
  }),
};
