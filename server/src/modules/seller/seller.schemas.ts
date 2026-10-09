import { z } from 'zod';

export const applySellerSchema = z.object({
  businessName: z.string().min(2).max(100),
  businessType: z.enum(['individual', 'sole_proprietor', 'private_limited', 'partnership', 'artisan']),
  gstNumber: z.string().max(20).optional(),
  panNumber: z.string().max(20).optional(),
  bankAccountName: z.string().max(100),
  bankAccountNo: z.string().max(30),
  bankIfscCode: z.string().max(20),
  businessAddressLine1: z.string().max(255),
  businessCity: z.string().max(100),
  businessState: z.string().max(100),
  businessPincode: z.string().max(20),
  documents: z.array(z.object({
    documentType: z.string(),
    fileUrl: z.string().url(),
    fileName: z.string(),
  })).default([]),
});

export const updateSellerProfileSchema = z.object({
  businessName: z.string().min(2).max(100).optional(),
  businessType: z.string().optional(),
  gstNumber: z.string().max(20).optional(),
  panNumber: z.string().max(20).optional(),
  bankAccountName: z.string().max(100).optional(),
  bankAccountNo: z.string().max(30).optional(),
  bankIfscCode: z.string().max(20).optional(),
  businessAddressLine1: z.string().max(255).optional(),
  businessAddressLine2: z.string().max(255).optional(),
  businessCity: z.string().max(100).optional(),
  businessState: z.string().max(100).optional(),
  businessPincode: z.string().max(20).optional(),
  returnPolicy: z.string().max(1000).optional(),
  shippingPolicy: z.string().max(1000).optional(),
});

export type ApplySellerInput = z.infer<typeof applySellerSchema>;
export type UpdateSellerProfileInput = z.infer<typeof updateSellerProfileSchema>;
