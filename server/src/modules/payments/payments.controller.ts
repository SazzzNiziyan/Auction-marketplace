import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { paymentsService } from './payments.service';
import { ValidationError } from '../../utils/errors';

export const paymentsController = {
  verify: asyncHandler(async (req: Request, res: Response) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new ValidationError('Missing required Razorpay verification credentials');
    }
    const result = await paymentsService.verifyPayment(req.user!.sub, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
    res.json(result);
  }),

  webhook: asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = JSON.stringify(req.body);
    const result = await paymentsService.handleWebhook(rawBody, signature, req.body);
    res.json(result);
  }),

  refund: asyncHandler(async (req: Request, res: Response) => {
    const { paymentId, amountPaise, reason } = req.body;
    if (!paymentId || !amountPaise || !reason) throw new ValidationError('Invalid refund parameters');
    const result = await paymentsService.processRefund(req.user!.sub, req.user!.role, paymentId, amountPaise, reason);
    res.json({ success: true, data: result });
  }),
};
