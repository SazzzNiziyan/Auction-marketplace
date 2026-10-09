import prisma from '../../config/database';
import { io } from '../../app';
import { PlaceBidInput, SetAutoBidInput, CautionDepositInput } from './auctions.schemas';
import { NotFoundError, UnprocessableError, AuthorizationError } from '../../utils/errors';
import { createOrder as createRazorpayOrder, initiateRefund } from '../../integrations/razorpay';
import { AuctionStatus } from '@prisma/client';

export class AuctionsService {
  async getAuctionById(auctionId: string, currentUserId?: string) {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        listing: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            category: { select: { id: true, name: true, slug: true } },
            seller: {
              select: {
                id: true,
                profile: { select: { displayName: true, avatarUrl: true, city: true, state: true } },
                sellerProfile: { select: { businessName: true, isVerified: true, avgRating: true, totalSales: true } },
              },
            },
          },
        },
        bids: {
          orderBy: { placedAt: 'desc' },
          take: 20,
          include: {
            user: {
              select: {
                id: true,
                profile: { select: { displayName: true } },
              },
            },
          },
        },
        _count: { select: { participants: true, bids: true } },
      },
    });

    if (!auction) throw new NotFoundError('Auction');

    // Pseudonymize bidder names for general public (e.g. "Bidder ***a1b")
    const sanitizedBids = auction.bids.map(b => {
      const name = b.user.profile?.displayName || 'Bidder';
      const masked = b.userId === currentUserId ? `${name} (You)` : `${name.slice(0, 2)}***${b.userId.slice(-2)}`;
      return {
        id: b.id,
        amountPaise: b.amountPaise,
        placedAt: b.placedAt,
        bidderLabel: masked,
        isAutoBid: b.isAutoBid,
        isMine: b.userId === currentUserId,
      };
    });

    let myDeposit = null;
    let myAutoBid = null;

    if (currentUserId) {
      [myDeposit, myAutoBid] = await Promise.all([
        prisma.auctionDeposit.findUnique({
          where: { auctionId_userId: { auctionId, userId: currentUserId } },
        }),
        prisma.autoBidRule.findUnique({
          where: { auctionId_userId: { auctionId, userId: currentUserId } },
        }),
      ]);
    }

    return {
      ...auction,
      bids: sanitizedBids,
      userState: {
        hasPaidDeposit: myDeposit?.status === 'PAID',
        depositStatus: myDeposit?.status || null,
        autoBidMaxPaise: myAutoBid?.isActive ? myAutoBid.maxAmountPaise : null,
        isSeller: auction.listing.sellerId === currentUserId,
        isCurrentHighBidder: auction.currentHighBidderId === currentUserId,
      },
    };
  }

  async payCautionDeposit(auctionId: string, userId: string, _input: CautionDepositInput) {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: { listing: true },
    });
    if (!auction) throw new NotFoundError('Auction');

    if (auction.listing.sellerId === userId) {
      throw new UnprocessableError('Sellers cannot place caution deposits on their own auctions');
    }

    if (auction.status === 'ENDED' || auction.status === 'CANCELLED' || auction.status === 'FAILED') {
      throw new UnprocessableError('This auction is no longer active');
    }

    const existing = await prisma.auctionDeposit.findUnique({
      where: { auctionId_userId: { auctionId, userId } },
    });

    if (existing && existing.status === 'PAID') {
      return { message: 'Caution deposit already verified and active', deposit: existing };
    }

    const depositAmount = auction.depositAmountPaise;

    // Create Razorpay test order
    const rzpOrder = await createRazorpayOrder(depositAmount, 'INR', `dep_${auctionId.slice(0, 8)}`);

    // In Razorpay Test Mode / MVP instant confirmation
    const deposit = await prisma.$transaction(async (tx) => {
      const dep = await tx.auctionDeposit.upsert({
        where: { auctionId_userId: { auctionId, userId } },
        create: {
          auctionId,
          userId,
          amountPaise: depositAmount,
          status: 'PAID',
          paidAt: new Date(),
        },
        update: {
          status: 'PAID',
          amountPaise: depositAmount,
          paidAt: new Date(),
        },
      });

      await tx.auctionParticipant.upsert({
        where: { auctionId_userId: { auctionId, userId } },
        create: { auctionId, userId },
        update: {},
      });

      await tx.payment.create({
        data: {
          userId,
          purpose: 'AUCTION_DEPOSIT',
          razorpayOrderId: rzpOrder.id,
          amountPaise: depositAmount,
          status: 'CAPTURED',
          capturedAt: new Date(),
        },
      });

      return dep;
    });

    // Notify room of new participant
    io.to(`auction:${auctionId}`).emit('PARTICIPANT_JOINED', {
      auctionId,
      participantCount: await prisma.auctionParticipant.count({ where: { auctionId } }),
    });

    return {
      message: 'Caution deposit confirmed successfully. You are now eligible to bid!',
      deposit,
      razorpayOrder: rzpOrder,
    };
  }

  /**
   * Concurrency-safe atomic bidding
   */
  async placeBid(auctionId: string, userId: string, input: PlaceBidInput, ipAddress?: string, userAgent?: string) {
    const minIncrementPaise = 10000; // ₹100 minimum increment

    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock auction row for update to eliminate race conditions
      const rawAuctions = await tx.$queryRaw<Array<{
        id: string;
        status: AuctionStatus;
        currentHighBidPaise: number | null;
        startingBidPaise: number;
        scheduledEndAt: Date;
        currentHighBidderId: string | null;
        antiSnipExtensionMins: number;
        maxAntiSnipExtensions: number;
        snipExtensionCount: number;
      }>>`SELECT id, status, "currentHighBidPaise", "startingBidPaise", "scheduledEndAt", "currentHighBidderId", "antiSnipExtensionMins", "maxAntiSnipExtensions", "snipExtensionCount" FROM auctions WHERE id = ${auctionId} FOR UPDATE`;

      const auction = rawAuctions[0];
      if (!auction) throw new NotFoundError('Auction');

      if (auction.status !== 'LIVE' && auction.status !== 'CLOSING') {
        throw new UnprocessableError(`Auction is not accepting bids (current status: ${auction.status})`);
      }

      const now = new Date();
      if (now > new Date(auction.scheduledEndAt)) {
        throw new UnprocessableError('Auction has already ended');
      }

      // Check seller
      const listing = await tx.productListing.findFirst({
        where: { auction: { id: auctionId } },
        select: { sellerId: true, title: true },
      });

      if (listing?.sellerId === userId) {
        throw new UnprocessableError('Sellers are prohibited from bidding on their own listings');
      }

      // 2. Validate caution deposit
      const deposit = await tx.auctionDeposit.findUnique({
        where: { auctionId_userId: { auctionId, userId } },
      });

      if (!deposit || deposit.status !== 'PAID') {
        throw new AuthorizationError('You must deposit a refundable caution deposit before placing a bid');
      }

      // 3. Validate bid amount
      const currentHighest = auction.currentHighBidPaise || auction.startingBidPaise;
      const minRequired = auction.currentHighBidPaise
        ? currentHighest + minIncrementPaise
        : auction.startingBidPaise;

      if (input.amountPaise < minRequired) {
        throw new UnprocessableError(`Bid must be at least ₹${minRequired / 100} (minimum increment is ₹${minIncrementPaise / 100})`);
      }

      const previousBidderId = auction.currentHighBidderId;

      // 4. Record new bid
      const newBid = await tx.bid.create({
        data: {
          auctionId,
          userId,
          amountPaise: input.amountPaise,
          status: 'ACTIVE',
          ipAddress,
          userAgent,
        },
        include: {
          user: { select: { profile: { select: { displayName: true } } } },
        },
      });

      // Mark older bids as OUTBID
      await tx.bid.updateMany({
        where: {
          auctionId,
          id: { not: newBid.id },
          status: 'ACTIVE',
        },
        data: { status: 'OUTBID' },
      });

      // 5. Anti-sniping window check
      let newEndAt = new Date(auction.scheduledEndAt);
      let timeExtended = false;
      const msLeft = newEndAt.getTime() - now.getTime();
      const snipThresholdMs = (auction.antiSnipExtensionMins || 5) * 60 * 1000;

      if (msLeft < snipThresholdMs && auction.snipExtensionCount < auction.maxAntiSnipExtensions) {
        newEndAt = new Date(newEndAt.getTime() + snipThresholdMs);
        timeExtended = true;
      }

      // 6. Update auction state
      const updatedAuction = await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentHighBidPaise: input.amountPaise,
          currentHighBidderId: userId,
          bidCount: { increment: 1 },
          scheduledEndAt: newEndAt,
          status: timeExtended ? 'CLOSING' : auction.status,
          snipExtensionCount: timeExtended ? { increment: 1 } : undefined,
        },
      });

      // 7. Event log
      await tx.auctionEventLog.create({
        data: {
          auctionId,
          actorId: userId,
          eventType: timeExtended ? 'BID_PLACED_AND_TIME_EXTENDED' : 'BID_PLACED',
          payload: { amountPaise: input.amountPaise, timeExtended, newEndAt },
        },
      });

      return {
        bid: newBid,
        auction: updatedAuction,
        previousBidderId,
        timeExtended,
        newEndAt,
        listingTitle: listing?.title || 'Auction Item',
      };
    });

    // 8. Broadcast real-time Socket.IO events
    const bidderName = result.bid.user.profile?.displayName || 'Bidder';
    const maskedLabel = `${bidderName.slice(0, 2)}***${userId.slice(-2)}`;

    io.to(`auction:${auctionId}`).emit('BID_PLACED', {
      auctionId,
      amountPaise: result.bid.amountPaise,
      placedAt: result.bid.placedAt,
      bidderLabel: maskedLabel,
      totalBids: result.auction.bidCount,
      timeExtended: result.timeExtended,
      newEndAt: result.newEndAt,
    });

    if (result.timeExtended) {
      io.to(`auction:${auctionId}`).emit('TIME_EXTENDED', {
        auctionId,
        newEndAt: result.newEndAt,
        reason: 'Anti-sniping protection extended closing by 5 minutes',
      });
    }

    // Notify previous high bidder that they were outbid
    if (result.previousBidderId && result.previousBidderId !== userId) {
      io.to(`user:${result.previousBidderId}`).emit('OUTBID', {
        auctionId,
        title: result.listingTitle,
        newHighBidPaise: result.bid.amountPaise,
      });

      prisma.notification.create({
        data: {
          userId: result.previousBidderId,
          type: 'OUTBID',
          title: 'You were outbid!',
          body: `A new highest bid of ₹${result.bid.amountPaise / 100} was placed on "${result.listingTitle}".`,
          data: { auctionId, amountPaise: result.bid.amountPaise },
        },
      }).catch(() => {});
    }

    // 9. Check if any opposing Auto-Bid can automatically compete
    this.processAutoBids(auctionId, userId, result.bid.amountPaise).catch(err => {
      console.error('[AutoBid Worker Error]', err);
    });

    return {
      message: 'Bid placed successfully!',
      bid: result.bid,
      currentHighBidPaise: result.auction.currentHighBidPaise,
      scheduledEndAt: result.auction.scheduledEndAt,
    };
  }

  /**
   * Set proxy auto-bid
   */
  async setAutoBid(auctionId: string, userId: string, input: SetAutoBidInput) {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: { listing: true },
    });
    if (!auction) throw new NotFoundError('Auction');

    if (auction.listing.sellerId === userId) {
      throw new UnprocessableError('Sellers cannot place auto-bids on their own auction');
    }

    const deposit = await prisma.auctionDeposit.findUnique({
      where: { auctionId_userId: { auctionId, userId } },
    });
    if (!deposit || deposit.status !== 'PAID') {
      throw new AuthorizationError('Caution deposit must be verified before setting auto-bid');
    }

    const currentHigh = auction.currentHighBidPaise || auction.startingBidPaise;
    if (input.maxAmountPaise <= currentHigh) {
      throw new UnprocessableError(`Proxy maximum must be greater than current price (₹${currentHigh / 100})`);
    }

    const rule = await prisma.autoBidRule.upsert({
      where: { auctionId_userId: { auctionId, userId } },
      create: {
        auctionId,
        userId,
        maxAmountPaise: input.maxAmountPaise,
        incrementPaise: input.incrementPaise,
        isActive: true,
      },
      update: {
        maxAmountPaise: input.maxAmountPaise,
        incrementPaise: input.incrementPaise,
        isActive: true,
      },
    });

    // If current high bidder is not this user, immediately trigger auto bid
    if (auction.currentHighBidderId !== userId) {
      const nextBid = currentHigh + input.incrementPaise;
      if (nextBid <= input.maxAmountPaise) {
        await this.placeBid(auctionId, userId, { amountPaise: nextBid });
      }
    }

    return { message: 'Auto-bid rule saved. System will automatically bid on your behalf.', rule };
  }

  /**
   * Background evaluation of competing auto bids
   */
  private async processAutoBids(auctionId: string, currentHighBidderId: string, currentAmountPaise: number) {
    const rules = await prisma.autoBidRule.findMany({
      where: {
        auctionId,
        isActive: true,
        userId: { not: currentHighBidderId },
        maxAmountPaise: { gt: currentAmountPaise },
      },
      orderBy: { createdAt: 'asc' }, // deterministic tie breaker: earliest registration wins
    });

    if (rules.length === 0) return;

    const highestCompete = rules[0];
    const nextAmount = currentAmountPaise + (highestCompete.incrementPaise || 10000);

    if (nextAmount <= highestCompete.maxAmountPaise) {
      await this.placeBid(auctionId, highestCompete.userId, { amountPaise: nextAmount });
    }
  }

  /**
   * Close auction authoritatively and award winner or mark no-sale
   */
  async closeAuction(auctionId: string) {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        listing: { select: { id: true, title: true, sellerId: true, images: { take: 1 } } },
      },
    });
    if (!auction) throw new NotFoundError('Auction');

    if (auction.status === 'ENDED' || auction.status === 'COMPLETED' || auction.status === 'FAILED') {
      return { message: 'Auction is already finalized', auction };
    }

    const hasMetReserve = !auction.reservePricePaise || ((auction.currentHighBidPaise || 0) >= auction.reservePricePaise);
    const hasBids = (auction.bidCount > 0) && !!auction.currentHighBidderId && !!auction.currentHighBidPaise;

    if (hasBids && hasMetReserve) {
      // Winner declared!
      const winnerId = auction.currentHighBidderId!;
      const winningAmount = auction.currentHighBidPaise!;
      const paymentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours to pay

      const closed = await prisma.$transaction(async (tx) => {
        const a = await tx.auction.update({
          where: { id: auctionId },
          data: {
            status: 'ENDED',
            winnerId,
            winningBidPaise: winningAmount,
            winnerPaymentDeadlineAt: paymentDeadline,
            actualEndAt: new Date(),
          },
        });

        await tx.productListing.update({
          where: { id: auction.listing.id },
          data: { status: 'SOLD' },
        });

        // Create winning order obligation
        const order = await tx.order.create({
          data: {
            buyerId: winnerId,
            sellerId: auction.listing.sellerId,
            status: 'PENDING_PAYMENT',
            subtotalPaise: winningAmount,
            shippingPaise: 0,
            discountPaise: auction.depositAmountPaise, // deposit credited against final purchase
            totalPaise: winningAmount - auction.depositAmountPaise,
            shippingAddress: { note: 'Awaiting buyer address confirmation at checkout' },
            items: {
              create: {
                listingId: auction.listing.id,
                quantity: 1,
                unitPriceInPaise: winningAmount,
                snapshotTitle: auction.listing.title,
                snapshotImageUrl: auction.listing.images[0]?.imageUrl,
              },
            },
          },
        });

        // Refund all non-winning bidders' caution deposits
        await tx.auctionDeposit.updateMany({
          where: {
            auctionId,
            userId: { not: winnerId },
            status: 'PAID',
          },
          data: { status: 'REFUNDED', refundedAt: new Date() },
        });

        return { auction: a, order };
      });

      // Socket broadcast
      io.to(`auction:${auctionId}`).emit('AUCTION_ENDED', {
        auctionId,
        status: 'ENDED',
        winnerDeclared: true,
        winningBidPaise: winningAmount,
      });

      io.to(`user:${winnerId}`).emit('AUCTION_WON', {
        auctionId,
        title: auction.listing.title,
        winningBidPaise: winningAmount,
        paymentDeadline,
      });

      return {
        message: 'Auction closed with winning bidder',
        auction: closed.auction,
        order: closed.order,
      };
    } else {
      // Reserve not met or no bids placed -> Mark FAILED (No Sale)
      const failed = await prisma.$transaction(async (tx) => {
        const a = await tx.auction.update({
          where: { id: auctionId },
          data: { status: 'FAILED', actualEndAt: new Date() },
        });

        await tx.productListing.update({
          where: { id: auction.listing.id },
          data: { status: 'UNSOLD' },
        });

        // Refund all caution deposits
        await tx.auctionDeposit.updateMany({
          where: { auctionId, status: 'PAID' },
          data: { status: 'REFUNDED', refundedAt: new Date() },
        });

        return a;
      });

      io.to(`auction:${auctionId}`).emit('AUCTION_ENDED', {
        auctionId,
        status: 'FAILED',
        winnerDeclared: false,
        reason: hasBids ? 'Reserve price was not met' : 'No bids placed',
      });

      return { message: 'Auction closed with no sale', auction: failed };
    }
  }

  /**
   * Handle winner payment default and offer sequential fallback to 2nd highest bidder
   */
  async handleWinnerDefault(auctionId: string) {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        listing: true,
        bids: { orderBy: { amountPaise: 'desc' }, take: 5 },
      },
    });
    if (!auction || !auction.winnerId) throw new NotFoundError('Auction with winner');

    // Forfeit defaulting winner's caution deposit
    await prisma.auctionDeposit.updateMany({
      where: { auctionId, userId: auction.winnerId },
      data: {
        status: 'FORFEITED',
        forfeitedAt: new Date(),
        forfeitReason: 'Winner failed to complete payment within deadline',
      },
    });

    // Find 2nd highest bidder
    const fallbackBids = auction.bids.filter(b => b.userId !== auction.winnerId);
    if (fallbackBids.length > 0) {
      const secondBid = fallbackBids[0];

      const offer = await prisma.auctionFallbackOffer.create({
        data: {
          auctionId,
          userId: secondBid.userId,
          offerRank: 2,
          offerAmountPaise: secondBid.amountPaise,
          offeredAt: new Date(),
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Notify 2nd bidder
      io.to(`user:${secondBid.userId}`).emit('FALLBACK_OFFER', {
        auctionId,
        offerId: offer.id,
        amountPaise: secondBid.amountPaise,
        title: auction.listing.title,
      });

      return { message: 'Default processed. Fallback offer sent to 2nd highest bidder', offer };
    }

    return { message: 'Default processed. No fallback bidders available.' };
  }
}

export const auctionsService = new AuctionsService();
