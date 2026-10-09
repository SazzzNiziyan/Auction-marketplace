import prisma from '../../config/database';
import { ApplySellerInput, UpdateSellerProfileInput } from './seller.schemas';
import { NotFoundError, ConflictError, AuthorizationError } from '../../utils/errors';

export class SellerService {
  async applyForSeller(userId: string, input: ApplySellerInput) {
    const existing = await prisma.sellerApplication.findUnique({ where: { userId } });
    if (existing && (existing.status === 'PENDING' || existing.status === 'APPROVED')) {
      throw new ConflictError(`You already have an application in status: ${existing.status}`);
    }

    const application = await prisma.sellerApplication.upsert({
      where: { userId },
      create: {
        userId,
        businessName: input.businessName,
        businessType: input.businessType,
        gstNumber: input.gstNumber,
        panNumber: input.panNumber,
        bankAccountName: input.bankAccountName,
        bankAccountNo: input.bankAccountNo,
        bankIfscCode: input.bankIfscCode,
        businessAddressLine1: input.businessAddressLine1,
        businessCity: input.businessCity,
        businessState: input.businessState,
        businessPincode: input.businessPincode,
        status: 'PENDING',
        documents: {
          create: input.documents.map(doc => ({
            documentType: doc.documentType,
            fileUrl: doc.fileUrl,
            fileName: doc.fileName,
          })),
        },
      },
      update: {
        businessName: input.businessName,
        businessType: input.businessType,
        gstNumber: input.gstNumber,
        panNumber: input.panNumber,
        bankAccountName: input.bankAccountName,
        bankAccountNo: input.bankAccountNo,
        bankIfscCode: input.bankIfscCode,
        businessAddressLine1: input.businessAddressLine1,
        businessCity: input.businessCity,
        businessState: input.businessState,
        businessPincode: input.businessPincode,
        status: 'PENDING',
        reviewNote: null,
      },
      include: { documents: true },
    });

    return application;
  }

  async getMyApplication(userId: string) {
    const app = await prisma.sellerApplication.findUnique({
      where: { userId },
      include: { documents: true },
    });
    return app;
  }

  async getSellerProfile(userId: string) {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundError('Seller profile');
    return profile;
  }

  async updateSellerProfile(userId: string, input: UpdateSellerProfileInput) {
    const profile = await prisma.sellerProfile.upsert({
      where: { userId },
      create: {
        userId,
        businessName: input.businessName || 'Merchant',
        businessType: input.businessType,
        gstNumber: input.gstNumber,
        panNumber: input.panNumber,
        bankAccountName: input.bankAccountName,
        bankAccountNo: input.bankAccountNo,
        bankIfscCode: input.bankIfscCode,
        returnPolicy: input.returnPolicy,
        shippingPolicy: input.shippingPolicy,
      },
      update: {
        ...(input.businessName && { businessName: input.businessName }),
        ...(input.businessType !== undefined && { businessType: input.businessType }),
        ...(input.gstNumber !== undefined && { gstNumber: input.gstNumber }),
        ...(input.panNumber !== undefined && { panNumber: input.panNumber }),
        ...(input.bankAccountName !== undefined && { bankAccountName: input.bankAccountName }),
        ...(input.bankAccountNo !== undefined && { bankAccountNo: input.bankAccountNo }),
        ...(input.bankIfscCode !== undefined && { bankIfscCode: input.bankIfscCode }),
        ...(input.returnPolicy !== undefined && { returnPolicy: input.returnPolicy }),
        ...(input.shippingPolicy !== undefined && { shippingPolicy: input.shippingPolicy }),
      },
    });

    return profile;
  }

  async getPublicStorefront(sellerId: string) {
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        createdAt: true,
        profile: { select: { displayName: true, avatarUrl: true, bio: true, city: true, state: true } },
        sellerProfile: true,
        listings: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            priceInPaise: true,
            condition: true,
            images: { take: 1, select: { imageUrl: true } },
            auction: {
              select: { id: true, status: true, currentHighBidPaise: true, scheduledEndAt: true },
            },
          },
        },
        reviewsReceived: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            title: true,
            body: true,
            createdAt: true,
            reviewer: { select: { profile: { select: { displayName: true, avatarUrl: true } } } },
          },
        },
        _count: { select: { sellerFollowers: true, listings: { where: { status: 'ACTIVE' } } } },
      },
    });

    if (!seller || !seller.sellerProfile) throw new NotFoundError('Seller storefront');
    return seller;
  }

  async followSeller(followerId: string, sellerId: string) {
    if (followerId === sellerId) throw new AuthorizationError('You cannot follow yourself');
    await prisma.sellerFollow.upsert({
      where: { followerId_sellerId: { followerId, sellerId } },
      create: { followerId, sellerId },
      update: {},
    });
    return { message: 'Followed seller successfully' };
  }

  async unfollowSeller(followerId: string, sellerId: string) {
    await prisma.sellerFollow.deleteMany({
      where: { followerId, sellerId },
    });
    return { message: 'Unfollowed seller successfully' };
  }

  async getSellerDashboard(sellerId: string) {
    const [listingsCount, activeListings, ordersCount, totalSalesResult, recentOrders] = await Promise.all([
      prisma.productListing.count({ where: { sellerId } }),
      prisma.productListing.count({ where: { sellerId, status: 'ACTIVE' } }),
      prisma.order.count({ where: { sellerId } }),
      prisma.order.aggregate({
        where: { sellerId, status: { in: ['PAYMENT_CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] } },
        _sum: { totalPaise: true },
      }),
      prisma.order.findMany({
        where: { sellerId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          buyer: { select: { profile: { select: { displayName: true } } } },
        },
      }),
    ]);

    return {
      totalListings: listingsCount,
      activeListings,
      totalOrders: ordersCount,
      totalRevenuePaise: totalSalesResult._sum.totalPaise || 0,
      recentOrders,
    };
  }

  async getSellerEarnings(sellerId: string) {
    const entries = await prisma.ledgerEntry.findMany({
      where: { userId: sellerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const aggregate = await prisma.order.aggregate({
      where: { sellerId, status: { in: ['PAYMENT_CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] } },
      _sum: { totalPaise: true },
    });

    const grossPaise = aggregate._sum.totalPaise || 0;
    const estimatedFeePaise = Math.round(grossPaise * 0.05); // 5% platform commission
    const netPaise = grossPaise - estimatedFeePaise;

    return {
      grossSalesPaise: grossPaise,
      platformFeePaise: estimatedFeePaise,
      netEarningsPaise: netPaise,
      ledgerEntries: entries,
    };
  }

  async getInventory(sellerId: string, opts: { page: number; limit: number; status?: string; search?: string }) {
    const { page, limit, status, search } = opts;
    const where: any = { sellerId, deletedAt: null };
    if (status) where.status = status;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      prisma.productListing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          category: { select: { id: true, name: true, slug: true } },
          auction: { select: { id: true, status: true, currentHighBidPaise: true, scheduledEndAt: true, bidCount: true } },
        },
      }),
      prisma.productListing.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDisputes(sellerId: string) {
    return prisma.refundRequest.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          include: {
            items: { take: 1 },
            buyer: { select: { id: true, profile: { select: { displayName: true } } } },
          },
        },
      },
    });
  }

  async respondToDispute(sellerId: string, disputeId: string, response: string, acceptRefund: boolean) {
    const dispute = await prisma.refundRequest.findFirst({ where: { id: disputeId, sellerId } });
    if (!dispute) throw new NotFoundError('Dispute');

    const updated = await prisma.refundRequest.update({
      where: { id: disputeId },
      data: {
        sellerResponse: response,
        status: acceptRefund ? 'APPROVED' : 'ADMIN_ESCALATED',
        resolvedAt: acceptRefund ? new Date() : null,
      },
    });

    return { message: acceptRefund ? 'Refund approved and initiated.' : 'Response sent. Escalated to admin.', dispute: updated };
  }
}

export const sellerService = new SellerService();
