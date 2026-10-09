import { z } from 'zod';

export const addToCartSchema = z.object({
  listingId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});

export const checkoutSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(10),
    addressLine1: z.string().min(5),
    addressLine2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().min(5),
    country: z.string().default('IN'),
  }),
  notes: z.string().max(500).optional(),
});

export const fulfillOrderSchema = z.object({
  carrier: z.string().min(2),
  trackingNumber: z.string().min(4),
  trackingUrl: z.string().url().optional(),
  estimatedDelivery: z.string().datetime().optional(),
});

export const requestRefundSchema = z.object({
  reason: z.string().min(10).max(1000),
  evidenceUrl: z.string().url().optional(),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type FulfillOrderInput = z.infer<typeof fulfillOrderSchema>;
export type RequestRefundInput = z.infer<typeof requestRefundSchema>;
