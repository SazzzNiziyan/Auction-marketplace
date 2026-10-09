import prisma from '../../config/database';
import { CreateListingInput, UpdateListingInput, ListingImageInput, ListingsQuery } from './catalog.schemas';
import { NotFoundError, AuthorizationError, UnprocessableError } from '../../utils/errors';
import { ListingStatus, UserRole, AuctionStatus } from '@prisma/client';
import { moderateListing } from '../../integrations/gemini';

const listingSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  status: true,
  type: true,
  condition: true,
  priceInPaise: true,
  stockQuantity: true,
  shippingNote: true,
  tags: true,
  viewCount: true,
  wishlistCount: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  seller: {
    select: {
      id: true,
      profile: { select: { displayName: true, avatarUrl: true, city: true, state: true } },
      sellerProfile: { select: { businessName: true, isVerified: true, avgRating: true, totalSales: true } },
    },
  },
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' as const }, select: { id: true, imageUrl: true, thumbUrl: true, altText: true, sortOrder: true, isPrimary: true } },
  auction: {
    select: {
      id: true,
      status: true,
      startingBidPaise: true,
      currentHighBidPaise: true,
      reservePricePaise: true,
      buyNowPricePaise: true,
      depositAmountPaise: true,
      bidCount: true,
      scheduledStartAt: true,
      scheduledEndAt: true,
      antiSnipExtensionMins: true,
      winnerId: true,
      winningBidPaise: true,
    },
  },
  _count: { select: { watchlistItems: true } },
};

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base}-${Math.random().toString(36).substring(2, 8)}`;
}

export class CatalogService {
  async getCategories() {
    return prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, slug: true, description: true, imageUrl: true },
        },
        attributes: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, slug: true, type: true, isRequired: true, isFilterable: true, options: { select: { id: true, value: true, label: true } } },
        },
        _count: { select: { listings: { where: { status: 'ACTIVE' } } } },
      },
    });
  }

  async getCategoryBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        attributes: {
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!category) throw new NotFoundError('Category');
    return category;
  }

  async getListings(query: ListingsQuery) {
    const { page, limit, categoryId, status, search, type, condition, minPrice, maxPrice, sellerId, sort } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      status: status || 'ACTIVE',
    };

    if (sellerId) where.sellerId = sellerId;
    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type;
    if (condition) where.condition = condition;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.priceInPaise = {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    if (sort === 'price_asc') orderBy = { priceInPaise: 'asc' };
    if (sort === 'price_desc') orderBy = { priceInPaise: 'desc' };
    if (sort === 'popular') orderBy = { viewCount: 'desc' };
    if (sort === 'ending_soon') {
      orderBy = { auction: { scheduledEndAt: 'asc' } };
    }

    const [items, total] = await Promise.all([
      prisma.productListing.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: listingSelect,
      }),
      prisma.productListing.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getListingById(id: string) {
    const listing = await prisma.productListing.findUnique({
      where: { id },
      select: listingSelect,
    });
    if (!listing || listing.status === 'REMOVED') throw new NotFoundError('Listing');

    // Increment view count asynchronously
    prisma.productListing.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    return listing;
  }

  async createListing(sellerId: string, input: CreateListingInput) {
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      include: { sellerProfile: true },
    });

    if (!seller) throw new NotFoundError('User');
    if (seller.role !== 'SELLER' && seller.role !== 'ADMIN' && seller.role !== 'SUPER_ADMIN') {
      throw new AuthorizationError('Only approved sellers can create listings');
    }

    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new NotFoundError('Category');

    const slug = generateSlug(input.title);

    // AI Content Moderation scan
    const moderation = await moderateListing(input.title, input.description);
    const initialStatus: ListingStatus = moderation?.flagged ? 'PENDING_MODERATION' : 'ACTIVE';

    const listing = await prisma.productListing.create({
      data: {
        sellerId,
        sellerProfileId: seller.sellerProfile?.id,
        categoryId: input.categoryId,
        type: input.type,
        status: initialStatus,
        title: input.title,
        slug,
        description: input.description,
        condition: input.condition,
        priceInPaise: input.priceInPaise,
        stockQuantity: input.stockQuantity,
        shippingNote: input.shippingNote,
        tags: input.tags,
        publishedAt: initialStatus === 'ACTIVE' ? new Date() : null,
        images: input.images && input.images.length > 0 ? {
          create: input.images.map((img, idx) => ({
            imageUrl: img.imageUrl,
            thumbUrl: img.thumbUrl,
            altText: img.altText,
            sortOrder: idx,
            isPrimary: img.isPrimary || idx === 0,
          })),
        } : undefined,
        attributeValues: input.attributeValues && input.attributeValues.length > 0 ? {
          create: input.attributeValues.map(attr => ({
            attributeId: attr.attributeId,
            value: attr.value,
          })),
        } : undefined,
        // If AUCTION, create initial Auction record
        auction: input.type === 'AUCTION' && input.auctionConfig ? {
          create: {
            status: 'LIVE',
            startingBidPaise: input.auctionConfig.startingBidPaise,
            currentHighBidPaise: input.auctionConfig.startingBidPaise,
            reservePricePaise: input.auctionConfig.reservePricePaise,
            buyNowPricePaise: input.auctionConfig.buyNowPricePaise,
            depositAmountPaise: input.auctionConfig.depositAmountPaise || 50000,
            scheduledStartAt: input.auctionConfig.scheduledStartAt ? new Date(input.auctionConfig.scheduledStartAt) : new Date(),
            scheduledEndAt: new Date(input.auctionConfig.scheduledEndAt),
            depositDeadlineAt: new Date(input.auctionConfig.scheduledEndAt),
            antiSnipExtensionMins: input.auctionConfig.antiSnipExtensionMins || 5,
          },
        } : undefined,
      },
      select: listingSelect,
    });

    if (moderation?.flagged) {
      await prisma.moderationDecision.create({
        data: {
          listingId: listing.id,
          moderatorId: sellerId,
          decision: 'FLAGGED',
          reason: `[AI Moderation Flag] ${moderation.reason || 'Flagged by automated filter'} (Confidence: ${Math.round((moderation.confidence || 0) * 100)}%)`,
        },
      });
    }

    return listing;
  }

  async updateListing(userId: string, userRole: UserRole, listingId: string, input: UpdateListingInput) {
    const listing = await prisma.productListing.findUnique({
      where: { id: listingId },
      include: { auction: true },
    });
    if (!listing) throw new NotFoundError('Listing');

    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && listing.sellerId !== userId) {
      throw new AuthorizationError('You cannot update another seller\'s listing');
    }

    if (listing.auction && listing.auction.bidCount > 0) {
      throw new UnprocessableError('Cannot modify an auction that already has bids placed');
    }

    const updated = await prisma.productListing.update({
      where: { id: listingId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.condition !== undefined && { condition: input.condition }),
        ...(input.priceInPaise !== undefined && { priceInPaise: input.priceInPaise }),
        ...(input.stockQuantity !== undefined && { stockQuantity: input.stockQuantity }),
        ...(input.shippingNote !== undefined && { shippingNote: input.shippingNote }),
        ...(input.tags !== undefined && { tags: input.tags }),
      },
      select: listingSelect,
    });

    return updated;
  }

  async deleteListing(userId: string, userRole: UserRole, listingId: string) {
    const listing = await prisma.productListing.findUnique({
      where: { id: listingId },
      include: { auction: true },
    });
    if (!listing) throw new NotFoundError('Listing');

    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && listing.sellerId !== userId) {
      throw new AuthorizationError('Not authorized to delete this listing');
    }

    if (listing.auction && listing.auction.bidCount > 0) {
      throw new UnprocessableError('Cannot delete an active auction with bids placed');
    }

    await prisma.productListing.update({
      where: { id: listingId },
      data: { status: 'REMOVED', deletedAt: new Date() },
    });

    return { message: 'Listing removed successfully' };
  }

  async submitForModeration(sellerId: string, listingId: string) {
    const listing = await prisma.productListing.findFirst({
      where: { id: listingId, sellerId },
    });
    if (!listing) throw new NotFoundError('Listing');

    const updated = await prisma.productListing.update({
      where: { id: listingId },
      data: { status: 'PENDING_MODERATION' },
      select: listingSelect,
    });

    return updated;
  }
}

export const catalogService = new CatalogService();
