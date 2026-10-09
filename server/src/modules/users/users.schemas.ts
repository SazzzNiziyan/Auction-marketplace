import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  addressLine1: z.string().max(150).optional(),
  addressLine2: z.string().max(150).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  pincode: z.string().max(20).optional(),
  country: z.string().max(10).optional(),
  avatarUrl: z.string().url().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[0-9]/, 'Must contain a number').regex(/[^a-zA-Z0-9]/, 'Must contain a special character'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
