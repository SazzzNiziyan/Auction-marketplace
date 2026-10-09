import { z } from 'zod';

export const placeBidSchema = z.object({
  amountPaise: z.number().int().positive('Bid amount must be positive'),
});

export const setAutoBidSchema = z.object({
  maxAmountPaise: z.number().int().positive('Max proxy amount must be positive'),
  incrementPaise: z.number().int().positive().default(10000), // ₹100 default increment
});

export const cautionDepositSchema = z.object({
  amountPaise: z.number().int().positive().optional(),
});

export const auctionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  status: z.enum(['SCHEDULED', 'DEPOSIT_OPEN', 'LIVE', 'CLOSING', 'ENDED', 'COMPLETED', 'CANCELLED', 'FAILED']).optional(),
});

export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type SetAutoBidInput = z.infer<typeof setAutoBidSchema>;
export type CautionDepositInput = z.infer<typeof cautionDepositSchema>;
