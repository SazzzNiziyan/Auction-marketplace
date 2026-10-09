import { z } from 'zod';

export const createListingSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(10000),
  categoryId: z.string().uuid(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).default('good'),
  type: z.enum(['FIXED_PRICE', 'AUCTION']),
  priceInPaise: z.number().int().nonnegative().optional(),
  stockQuantity: z.number().int().positive().default(1),
  shippingNote: z.string().max(500).optional(),
  tags: z.array(z.string()).default([]),
  images: z.array(z.object({
    imageUrl: z.string().url(),
    thumbUrl: z.string().url().optional(),
    altText: z.string().max(200).optional(),
    isPrimary: z.boolean().default(false),
  })).optional(),
  attributeValues: z.array(z.object({
    attributeId: z.string().uuid(),
    value: z.string(),
  })).optional(),
  // Auction specific fields if type === AUCTION
  auctionConfig: z.object({
    startingBidPaise: z.number().int().positive(),
    reservePricePaise: z.number().int().positive().optional(),
    buyNowPricePaise: z.number().int().positive().optional(),
    depositAmountPaise: z.number().int().nonnegative().default(50000), // default ₹500
    scheduledStartAt: z.string().datetime().optional(),
    scheduledEndAt: z.string().datetime(),
    antiSnipExtensionMins: z.number().int().min(1).max(30).default(5),
  }).optional(),
});

export const updateListingSchema = createListingSchema.partial().omit({ type: true });

export const listingImageSchema = z.object({
  imageUrl: z.string().url(),
  thumbUrl: z.string().url().optional(),
  altText: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
});

export const listingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PENDING_MODERATION', 'ACTIVE', 'PAUSED', 'SOLD', 'UNSOLD', 'REMOVED']).optional(),
  search: z.string().max(200).optional(),
  type: z.enum(['FIXED_PRICE', 'AUCTION']).optional(),
  condition: z.string().optional(),
  minPrice: z.coerce.number().int().optional(),
  maxPrice: z.coerce.number().int().optional(),
  sellerId: z.string().uuid().optional(),
  sort: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'ending_soon', 'popular']).default('newest'),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListingImageInput = z.infer<typeof listingImageSchema>;
export type ListingsQuery = z.infer<typeof listingsQuerySchema>;
