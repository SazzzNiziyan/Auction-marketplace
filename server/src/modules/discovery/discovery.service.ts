import prisma from '../../config/database';

export class DiscoveryService {
  async getHomeFeed() {
    const [liveAuctions, endingSoonAuctions, featuredFixedPrice, categories, stats] = await Promise.all([
      // Live Auctions (up to 6)
      prisma.auction.findMany({
        where: {
          status: 'LIVE',
          listing: { status: 'ACTIVE', deletedAt: null },
        },
        orderBy: { scheduledEndAt: 'asc' },
        take: 6,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              slug: true,
              condition: true,
              images: { take: 1, select: { imageUrl: true, altText: true } },
              category: { select: { name: true, slug: true } },
            },
          },
        },
      }),

      // Ending Soon (next to end)
      prisma.auction.findMany({
        where: {
          status: 'LIVE',
          listing: { status: 'ACTIVE', deletedAt: null },
        },
        orderBy: { scheduledEndAt: 'asc' },
        take: 4,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              slug: true,
              images: { take: 1, select: { imageUrl: true } },
            },
          },
        },
      }),

      // Curated Fixed Price listings
      prisma.productListing.findMany({
        where: {
          type: 'FIXED_PRICE',
          status: 'ACTIVE',
          deletedAt: null,
        },
        orderBy: { viewCount: 'desc' },
        take: 8,
        include: {
          images: { take: 1, select: { imageUrl: true } },
          category: { select: { name: true, slug: true } },
          seller: { select: { profile: { select: { displayName: true } } } },
        },
      }),

      // Categories
      prisma.category.findMany({
        where: { parentId: null, isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 6,
        select: { id: true, name: true, slug: true, description: true, imageUrl: true },
      }),

      // Platform stats
      Promise.all([
        prisma.user.count(),
        prisma.productListing.count({ where: { status: 'ACTIVE' } }),
        prisma.auction.count({ where: { status: 'LIVE' } }),
        prisma.bid.count(),
      ]),
    ]);

    return {
      liveAuctions,
      endingSoonAuctions,
      featuredFixedPrice,
      categories,
      stats: {
        totalUsers: stats[0],
        activeListings: stats[1],
        liveAuctions: stats[2],
        totalBids: stats[3],
      },
    };
  }

  async search(params: {
    q?: string;
    categorySlug?: string;
    type?: 'FIXED_PRICE' | 'AUCTION';
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50);
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (params.categorySlug) {
      where.category = { slug: params.categorySlug };
    }

    if (params.type) {
      where.type = params.type;
    }

    if (params.condition) {
      where.condition = params.condition;
    }

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      where.priceInPaise = {
        ...(params.minPrice !== undefined && { gte: params.minPrice }),
        ...(params.maxPrice !== undefined && { lte: params.maxPrice }),
      };
    }

    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
        { tags: { has: params.q.toLowerCase() } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (params.sort === 'price_asc') orderBy = { priceInPaise: 'asc' };
    if (params.sort === 'price_desc') orderBy = { priceInPaise: 'desc' };
    if (params.sort === 'popular') orderBy = { viewCount: 'desc' };
    if (params.sort === 'ending_soon') orderBy = { auction: { scheduledEndAt: 'asc' } };

    const [items, total, categoriesCount] = await Promise.all([
      prisma.productListing.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { name: true, slug: true } },
          images: { take: 1, select: { imageUrl: true, altText: true } },
          auction: {
            select: { id: true, status: true, currentHighBidPaise: true, scheduledEndAt: true, bidCount: true },
          },
          seller: { select: { profile: { select: { displayName: true } } } },
        },
      }),
      prisma.productListing.count({ where }),
      prisma.category.findMany({
        where: { parentId: null },
        select: { id: true, name: true, slug: true, _count: { select: { listings: { where: { status: 'ACTIVE' } } } } },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      facets: {
        categories: categoriesCount,
      },
    };
  }
}

export const discoveryService = new DiscoveryService();
