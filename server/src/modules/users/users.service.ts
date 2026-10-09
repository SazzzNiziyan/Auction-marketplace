import prisma from '../../config/database';
import { UpdateProfileInput, ChangePasswordInput } from './users.schemas';
import { NotFoundError, AuthenticationError, ConflictError } from '../../utils/errors';
import { passwordUtils } from '../auth/auth.utils';

export class UsersService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        profile: {
          select: {
            displayName: true,
            bio: true,
            phone: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            pincode: true,
            country: true,
            avatarUrl: true,
          },
        },
        sellerProfile: {
          select: {
            isVerified: true,
            businessName: true,
            businessType: true,
            avgRating: true,
            totalRatings: true,
            totalSales: true,
          },
        },
        notificationPrefs: true,
      },
    });

    if (!user) throw new NotFoundError('User');
    return user;
  }

  async getPublicProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            displayName: true,
            bio: true,
            city: true,
            state: true,
            avatarUrl: true,
          },
        },
        sellerProfile: {
          select: {
            isVerified: true,
            businessName: true,
            businessType: true,
            returnPolicy: true,
            shippingPolicy: true,
            avgRating: true,
            totalRatings: true,
            totalSales: true,
          },
        },
        _count: {
          select: {
            listings: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User');
    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: input.displayName || 'User',
        bio: input.bio,
        phone: input.phone,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        country: input.country || 'IN',
        avatarUrl: input.avatarUrl,
      },
      update: {
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.addressLine1 !== undefined && { addressLine1: input.addressLine1 }),
        ...(input.addressLine2 !== undefined && { addressLine2: input.addressLine2 }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.state !== undefined && { state: input.state }),
        ...(input.pincode !== undefined && { pincode: input.pincode }),
        ...(input.country !== undefined && { country: input.country }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      },
    });

    return profile;
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new NotFoundError('User');

    const valid = await passwordUtils.verify(input.currentPassword, user.passwordHash);
    if (!valid) throw new AuthenticationError('Current password is incorrect');

    const newHash = await passwordUtils.hash(input.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all sessions
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password changed. Please login again.' };
  }

  async getWatchlist(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.watchlistItem.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { addedAt: 'desc' },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              type: true,
              priceInPaise: true,
              images: { take: 1, select: { imageUrl: true, altText: true } },
              auction: {
                select: { id: true, status: true, currentHighBidPaise: true, scheduledEndAt: true },
              },
            },
          },
        },
      }),
      prisma.watchlistItem.count({ where: { userId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async addToWatchlist(userId: string, listingId: string) {
    const listing = await prisma.productListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundError('Listing');

    try {
      await prisma.watchlistItem.create({ data: { userId, listingId } });
    } catch {
      throw new ConflictError('Already in watchlist');
    }
    return { message: 'Added to watchlist' };
  }

  async removeFromWatchlist(userId: string, listingId: string) {
    await prisma.watchlistItem.deleteMany({ where: { userId, listingId } });
    return { message: 'Removed from watchlist' };
  }

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { items, total, page, limit, unreadCount, totalPages: Math.ceil(total / limit) };
  }

  async markNotificationsRead(userId: string, ids?: string[]) {
    await prisma.notification.updateMany({
      where: { userId, ...(ids ? { id: { in: ids } } : {}) },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'Marked as read' };
  }

  async getFollowedSellers(userId: string) {
    return prisma.sellerFollow.findMany({
      where: { followerId: userId },
      include: {
        seller: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true } },
            sellerProfile: { select: { businessName: true, isVerified: true, avgRating: true } },
            _count: { select: { listings: { where: { status: 'ACTIVE' } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserBids(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [bids, total] = await Promise.all([
      prisma.bid.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { placedAt: 'desc' },
        include: {
          auction: {
            select: {
              id: true,
              status: true,
              currentHighBidPaise: true,
              scheduledEndAt: true,
              listing: { select: { id: true, title: true, images: { take: 1, select: { imageUrl: true } } } },
            },
          },
        },
      }),
      prisma.bid.count({ where: { userId } }),
    ]);

    return { bids, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

export const usersService = new UsersService();
