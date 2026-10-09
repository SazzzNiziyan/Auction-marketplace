import prisma from '../../config/database';
import { NotFoundError, UnprocessableError } from '../../utils/errors';
import { io } from '../../app';

export class AdminService {
  async getKPIs() {
    const [
      totalUsers,
      totalSellers,
      activeListings,
      pendingModerationListings,
      liveAuctions,
      endedAuctions,
      orderStats,
      pendingApplications,
      openReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'SELLER' } }),
      prisma.productListing.count({ where: { status: 'ACTIVE' } }),
      prisma.productListing.count({ where: { status: 'PENDING_MODERATION' } }),
      prisma.auction.count({ where: { status: 'LIVE' } }),
      prisma.auction.count({ where: { status: 'ENDED' } }),
      prisma.order.aggregate({
        where: { status: { in: ['PAYMENT_CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] } },
        _sum: { totalPaise: true },
        _count: true,
      }),
      prisma.sellerApplication.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'OPEN' } }),
    ]);

    const gmvPaise = orderStats._sum.totalPaise || 0;
    const estimatedCommissionPaise = Math.round(gmvPaise * 0.05);

    return {
      totalUsers,
      totalSellers,
      activeListings,
      pendingModerationListings,
      liveAuctions,
      endedAuctions,
      totalOrders: orderStats._count || 0,
      gmvPaise,
      estimatedCommissionPaise,
      pendingApplications,
      openReports,
    };
  }

  async getSellerApplications() {
    return prisma.sellerApplication.findMany({
      orderBy: { submittedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            profile: { select: { displayName: true, phone: true } },
          },
        },
        documents: true,
      },
    });
  }

  async reviewSellerApplication(adminId: string, appId: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
    const app = await prisma.sellerApplication.findUnique({
      where: { id: appId },
    });
    if (!app) throw new NotFoundError('Seller application');

    const updated = await prisma.$transaction(async (tx) => {
      const a = await tx.sellerApplication.update({
        where: { id: appId },
        data: {
          status: decision,
          reviewedById: adminId,
          reviewNote: note,
          reviewedAt: new Date(),
        },
      });

      if (decision === 'APPROVED') {
        await tx.user.update({
          where: { id: app.userId },
          data: { role: 'SELLER' },
        });

        await tx.sellerProfile.upsert({
          where: { userId: app.userId },
          create: {
            userId: app.userId,
            businessName: app.businessName,
            businessType: app.businessType,
            gstNumber: app.gstNumber,
            panNumber: app.panNumber,
            bankAccountName: app.bankAccountName,
            bankAccountNo: app.bankAccountNo,
            bankIfscCode: app.bankIfscCode,
            businessAddressLine1: app.businessAddressLine1,
            businessCity: app.businessCity,
            businessState: app.businessState,
            businessPincode: app.businessPincode,
            isVerified: true,
          },
          update: {
            businessName: app.businessName,
            businessType: app.businessType,
            gstNumber: app.gstNumber,
            panNumber: app.panNumber,
            bankAccountName: app.bankAccountName,
            bankAccountNo: app.bankAccountNo,
            bankIfscCode: app.bankIfscCode,
            businessAddressLine1: app.businessAddressLine1,
            businessCity: app.businessCity,
            businessState: app.businessState,
            businessPincode: app.businessPincode,
            isVerified: true,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: `SELLER_APPLICATION_${decision}`,
          entityType: 'SellerApplication',
          entityId: appId,
          after: { decision, note, userId: app.userId },
        },
      });

      return a;
    });

    return updated;
  }

  async getModerationQueue() {
    return prisma.productListing.findMany({
      where: { status: 'PENDING_MODERATION' },
      orderBy: { createdAt: 'desc' },
      include: {
        images: { take: 3 },
        category: { select: { name: true } },
        seller: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
        moderation: true,
      },
    });
  }

  async decideListingModeration(adminId: string, listingId: string, decision: 'APPROVED' | 'REJECTED', reason?: string) {
    const listing = await prisma.productListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundError('Listing');

    const nextStatus = decision === 'APPROVED' ? 'ACTIVE' : 'REMOVED';

    const updated = await prisma.$transaction(async (tx) => {
      const l = await tx.productListing.update({
        where: { id: listingId },
        data: {
          status: nextStatus,
          publishedAt: decision === 'APPROVED' ? new Date() : null,
        },
      });

      await tx.moderationDecision.create({
        data: {
          listingId,
          moderatorId: adminId,
          decision: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
          reason: reason || `Admin manual decision: ${decision}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: `LISTING_MODERATION_${decision}`,
          entityType: 'ProductListing',
          entityId: listingId,
          after: { decision, reason },
        },
      });

      return l;
    });

    return updated;
  }

  async getLiveAuctions() {
    return prisma.auction.findMany({
      where: { status: { in: ['LIVE', 'CLOSING', 'SCHEDULED'] } },
      orderBy: { scheduledEndAt: 'asc' },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            seller: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
          },
        },
        _count: { select: { bids: true, participants: true } },
      },
    });
  }

  async emergencyAuctionAction(adminId: string, auctionId: string, action: 'CANCEL', reason: string) {
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw new NotFoundError('Auction');

    const updated = await prisma.$transaction(async (tx) => {
      const a = await tx.auction.update({
        where: { id: auctionId },
        data: { status: 'CANCELLED', actualEndAt: new Date() },
      });

      // Refund all caution deposits
      await tx.auctionDeposit.updateMany({
        where: { auctionId, status: 'PAID' },
        data: { status: 'REFUNDED', refundedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'AUCTION_EMERGENCY_CANCEL',
          entityType: 'Auction',
          entityId: auctionId,
          after: { reason },
        },
      });

      return a;
    });

    io.to(`auction:${auctionId}`).emit('AUCTION_ENDED', {
      auctionId,
      status: 'CANCELLED',
      reason,
    });

    return updated;
  }

  async getDisputes() {
    return prisma.order.findMany({
      where: { status: 'REFUND_REQUESTED' },
      orderBy: { updatedAt: 'desc' },
      include: {
        items: true,
        buyer: { select: { email: true, profile: { select: { displayName: true } } } },
        seller: { select: { email: true, profile: { select: { displayName: true } } } },
        payments: true,
      },
    });
  }

  async adjudicateDispute(adminId: string, orderId: string, approve: boolean, reason: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order');

    const nextStatus = approve ? 'REFUND_APPROVED' : 'COMPLETED';

    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          statusHistory: {
            create: {
              fromStatus: order.status,
              toStatus: nextStatus,
              note: `Admin dispute adjudication: ${approve ? 'Approved' : 'Dismissed'}. Reason: ${reason}`,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: `DISPUTE_${approve ? 'APPROVED' : 'DISMISSED'}`,
          entityType: 'Order',
          entityId: orderId,
          after: { approve, reason },
        },
      });

      return o;
    });

    return updated;
  }

  async getAuditLogs(limit = 50) {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { email: true, profile: { select: { displayName: true } } } },
      },
    });
  }

  async exportDataCSV(type: 'orders' | 'auctions' | 'users') {
    if (type === 'users') {
      const users = await prisma.user.findMany({ take: 200, orderBy: { createdAt: 'desc' } });
      const header = 'id,email,role,status,createdAt\n';
      const rows = users.map(u => `"${u.id}","${u.email}","${u.role}","${u.status}","${u.createdAt.toISOString()}"`).join('\n');
      return header + rows;
    }

    if (type === 'orders') {
      const orders = await prisma.order.findMany({ take: 200, orderBy: { createdAt: 'desc' } });
      const header = 'id,buyerId,sellerId,status,totalPaise,createdAt\n';
      const rows = orders.map(o => `"${o.id}","${o.buyerId}","${o.sellerId}","${o.status}",${o.totalPaise},"${o.createdAt.toISOString()}"`).join('\n');
      return header + rows;
    }

    const auctions = await prisma.auction.findMany({ take: 200, orderBy: { createdAt: 'desc' } });
    const header = 'id,status,startingBidPaise,currentHighBidPaise,bidCount,scheduledEndAt\n';
    const rows = auctions.map(a => `"${a.id}","${a.status}",${a.startingBidPaise},${a.currentHighBidPaise || 0},${a.bidCount},"${a.scheduledEndAt.toISOString()}"`).join('\n');
    return header + rows;
  }

  async getUsers(filters: { search?: string; role?: string; status?: string }) {
    const where: any = { deletedAt: null };
    if (filters.role) where.role = filters.role;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { profile: { displayName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    return prisma.user.findMany({
      where,
      take: 200,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        profile: { select: { displayName: true, city: true, state: true } },
        _count: { select: { bids: true, orders: true, listings: true } },
      },
    });
  }

  async updateUserStatus(adminId: string, userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    if (adminId === userId) throw new UnprocessableError('You cannot change your own account status');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (user.role === 'SUPER_ADMIN') throw new UnprocessableError('Super admin accounts cannot be suspended');

    return prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { status },
        select: { id: true, email: true, role: true, status: true },
      });

      if (status === 'SUSPENDED') {
        await tx.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: `USER_${status}`,
          entityType: 'User',
          entityId: userId,
          before: { status: user.status },
          after: { status },
        },
      });

      return updated;
    });
  }

  async getOrders(status?: string) {
    return prisma.order.findMany({
      where: status ? { status: status as any } : {},
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { select: { id: true, snapshotTitle: true, quantity: true, unitPriceInPaise: true } },
        buyer: { select: { email: true, profile: { select: { displayName: true } } } },
        seller: { select: { email: true, profile: { select: { displayName: true } }, sellerProfile: { select: { businessName: true } } } },
      },
    });
  }

  async getSettings() {
    return prisma.platformSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async updateSettings(adminId: string, settings: Record<string, unknown>) {
    const existing = await prisma.platformSetting.findMany();
    const known = new Map(existing.map((s) => [s.key, s]));

    const unknownKeys = Object.keys(settings).filter((k) => !known.has(k));
    if (unknownKeys.length > 0) {
      throw new UnprocessableError(`Unknown setting: ${unknownKeys.join(', ')}`);
    }

    await prisma.$transaction(async (tx) => {
      for (const [key, raw] of Object.entries(settings)) {
        const setting = known.get(key)!;
        const value = String(raw);
        if (setting.dataType === 'number' && Number.isNaN(Number(value))) {
          throw new UnprocessableError(`Setting ${key} must be a number`);
        }
        if (setting.dataType === 'boolean' && value !== 'true' && value !== 'false') {
          throw new UnprocessableError(`Setting ${key} must be true or false`);
        }
        if (value === setting.value) continue;

        await tx.platformSetting.update({ where: { key }, data: { value, updatedBy: adminId } });
        await tx.auditLog.create({
          data: {
            actorId: adminId,
            action: 'PLATFORM_SETTING_UPDATED',
            entityType: 'PlatformSetting',
            entityId: setting.id,
            before: { key, value: setting.value },
            after: { key, value },
          },
        });
      }
    });

    return this.getSettings();
  }

  async getCategories() {
    return prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { listings: true, children: true } } },
    });
  }

  async createCategory(
    adminId: string,
    input: { name: string; slug: string; description?: string; imageUrl?: string; sortOrder?: number }
  ) {
    const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!slug) throw new UnprocessableError('Slug must contain letters or numbers');

    const category = await prisma.category.create({
      data: {
        name: input.name.trim(),
        slug,
        description: input.description || null,
        imageUrl: input.imageUrl || null,
        sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
      },
    });

    await prisma.auditLog.create({
      data: { actorId: adminId, action: 'CATEGORY_CREATED', entityType: 'Category', entityId: category.id, after: { name: category.name, slug } },
    });

    return category;
  }

  async updateCategory(
    adminId: string,
    categoryId: string,
    input: { name?: string; description?: string; imageUrl?: string; sortOrder?: number; isActive?: boolean }
  ) {
    const existing = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!existing) throw new NotFoundError('Category');

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(typeof input.name === 'string' && input.name.trim() && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description || null }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl || null }),
        ...(input.sortOrder !== undefined && Number.isFinite(Number(input.sortOrder)) && { sortOrder: Number(input.sortOrder) }),
        ...(typeof input.isActive === 'boolean' && { isActive: input.isActive }),
      },
    });

    await prisma.auditLog.create({
      data: { actorId: adminId, action: 'CATEGORY_UPDATED', entityType: 'Category', entityId: categoryId, before: { name: existing.name, isActive: existing.isActive }, after: input },
    });

    return category;
  }
}

export const adminService = new AdminService();
