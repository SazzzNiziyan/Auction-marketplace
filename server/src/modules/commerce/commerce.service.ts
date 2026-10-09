import prisma from '../../config/database';
import { AddToCartInput, UpdateCartItemInput, CheckoutInput, FulfillOrderInput, RequestRefundInput } from './commerce.schemas';
import { NotFoundError, UnprocessableError, AuthorizationError } from '../../utils/errors';
import { createOrder as createRazorpayOrder } from '../../integrations/razorpay';

export class CommerceService {
  async getCart(userId: string) {
    const items = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            status: true,
            priceInPaise: true,
            stockQuantity: true,
            shippingNote: true,
            sellerId: true,
            seller: {
              select: {
                id: true,
                profile: { select: { displayName: true } },
                sellerProfile: { select: { businessName: true } },
              },
            },
            images: { take: 1, select: { imageUrl: true } },
          },
        },
      },
    });

    // Group items by seller for multi-seller checkout calculation
    const groupedBySeller: Record<string, {
      sellerId: string;
      sellerName: string;
      items: typeof items;
      subtotalPaise: number;
      shippingPaise: number;
    }> = {};

    let totalSubtotalPaise = 0;
    let totalShippingPaise = 0;

    for (const item of items) {
      const sellerId = item.listing.sellerId;
      const sellerName = item.listing.seller.sellerProfile?.businessName || item.listing.seller.profile?.displayName || 'Merchant';
      const itemSubtotal = (item.listing.priceInPaise || 0) * item.quantity;
      totalSubtotalPaise += itemSubtotal;

      if (!groupedBySeller[sellerId]) {
        groupedBySeller[sellerId] = {
          sellerId,
          sellerName,
          items: [],
          subtotalPaise: 0,
          shippingPaise: 9900, // ₹99 per seller shipping
        };
        totalShippingPaise += 9900;
      }

      groupedBySeller[sellerId].items.push(item);
      groupedBySeller[sellerId].subtotalPaise += itemSubtotal;
    }

    return {
      items,
      sellerGroups: Object.values(groupedBySeller),
      totalSubtotalPaise,
      totalShippingPaise,
      grandTotalPaise: totalSubtotalPaise + totalShippingPaise,
    };
  }

  async addToCart(userId: string, input: AddToCartInput) {
    const listing = await prisma.productListing.findUnique({
      where: { id: input.listingId },
    });

    if (!listing || listing.status !== 'ACTIVE') {
      throw new NotFoundError('Available product');
    }

    if (listing.type === 'AUCTION') {
      throw new UnprocessableError('Auction items cannot be added to cart directly. Bid or win the auction first.');
    }

    if (listing.sellerId === userId) {
      throw new UnprocessableError('You cannot purchase your own listing');
    }

    if (listing.stockQuantity < input.quantity) {
      throw new UnprocessableError(`Only ${listing.stockQuantity} items in stock`);
    }

    const item = await prisma.cartItem.upsert({
      where: { userId_listingId: { userId, listingId: input.listingId } },
      create: {
        userId,
        listingId: input.listingId,
        quantity: input.quantity,
      },
      update: {
        quantity: { increment: input.quantity },
      },
    });

    return item;
  }

  async updateCartItem(userId: string, cartItemId: string, input: UpdateCartItemInput) {
    const item = await prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
      include: { listing: true },
    });

    if (!item) throw new NotFoundError('Cart item');
    if (item.listing.stockQuantity < input.quantity) {
      throw new UnprocessableError(`Only ${item.listing.stockQuantity} items available in stock`);
    }

    const updated = await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: input.quantity },
    });

    return updated;
  }

  async removeFromCart(userId: string, cartItemId: string) {
    await prisma.cartItem.deleteMany({
      where: { id: cartItemId, userId },
    });
    return { message: 'Item removed from cart' };
  }

  async clearCart(userId: string) {
    await prisma.cartItem.deleteMany({ where: { userId } });
    return { message: 'Cart cleared' };
  }

  /**
   * Multi-seller checkout:
   * Splits into individual seller orders under a common transaction,
   * generates Razorpay order, decrements stock atomically.
   */
  async checkout(userId: string, input: CheckoutInput) {
    const cart = await this.getCart(userId);
    if (cart.items.length === 0) {
      throw new UnprocessableError('Your shopping cart is empty');
    }

    // Validate that all items are active and have sufficient stock
    for (const item of cart.items) {
      if (item.listing.status !== 'ACTIVE') {
        throw new UnprocessableError(`Product "${item.listing.title}" is no longer active`);
      }
      if (item.listing.stockQuantity < item.quantity) {
        throw new UnprocessableError(`Insufficient stock for "${item.listing.title}"`);
      }
    }

    // Create Razorpay payment order
    const rzpOrder = await createRazorpayOrder(cart.grandTotalPaise, 'INR', `rcpt_${Date.now()}`);

    // Create DB records in atomic transaction
    const createdOrders = await prisma.$transaction(async (tx) => {
      const orders = [];

      for (const group of cart.sellerGroups) {
        const sellerOrderTotal = group.subtotalPaise + group.shippingPaise;

        const order = await tx.order.create({
          data: {
            buyerId: userId,
            sellerId: group.sellerId,
            status: 'PENDING_PAYMENT',
            subtotalPaise: group.subtotalPaise,
            shippingPaise: group.shippingPaise,
            discountPaise: 0,
            totalPaise: sellerOrderTotal,
            shippingAddress: input.shippingAddress,
            notes: input.notes,
            items: {
              create: group.items.map((it) => ({
                listingId: it.listing.id,
                quantity: it.quantity,
                unitPriceInPaise: it.listing.priceInPaise || 0,
                snapshotTitle: it.listing.title,
                snapshotImageUrl: it.listing.images[0]?.imageUrl,
              })),
            },
            statusHistory: {
              create: {
                toStatus: 'PENDING_PAYMENT',
                note: 'Order created via cart checkout',
              },
            },
          },
        });

        // Decrement stock
        for (const it of group.items) {
          await tx.productListing.update({
            where: { id: it.listing.id },
            data: { stockQuantity: { decrement: it.quantity } },
          });
        }

        orders.push(order);
      }

      // Link payment record to user and first order (or group)
      await tx.payment.create({
        data: {
          userId,
          orderId: orders[0]?.id,
          purpose: 'ORDER',
          razorpayOrderId: rzpOrder.id,
          amountPaise: cart.grandTotalPaise,
          currency: 'INR',
          status: 'CREATED',
        },
      });

      // Clear user cart
      await tx.cartItem.deleteMany({ where: { userId } });

      return orders;
    });

    return {
      orders: createdOrders,
      razorpayOrder: rzpOrder,
      grandTotalPaise: cart.grandTotalPaise,
    };
  }

  async getBuyerOrders(userId: string) {
    return prisma.order.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            listing: { select: { id: true, title: true, slug: true, images: { take: 1, select: { imageUrl: true } } } },
          },
        },
        seller: {
          select: {
            id: true,
            profile: { select: { displayName: true } },
            sellerProfile: { select: { businessName: true } },
          },
        },
        shipments: true,
        payments: true,
      },
    });
  }

  async getSellerOrders(sellerId: string) {
    return prisma.order.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        buyer: {
          select: {
            id: true,
            profile: { select: { displayName: true, phone: true } },
          },
        },
        shipments: true,
      },
    });
  }

  async getOrderById(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            listing: { select: { id: true, title: true, slug: true, images: { take: 1, select: { imageUrl: true } } } },
          },
        },
        seller: {
          select: {
            id: true,
            profile: { select: { displayName: true } },
            sellerProfile: { select: { businessName: true, returnPolicy: true } },
          },
        },
        buyer: {
          select: {
            id: true,
            profile: { select: { displayName: true } },
          },
        },
        shipments: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: true,
      },
    });

    if (!order) throw new NotFoundError('Order');
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new AuthorizationError('Not authorized to view this order');
    }

    return order;
  }

  async fulfillOrder(sellerId: string, orderId: string, input: FulfillOrderInput) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, sellerId },
    });
    if (!order) throw new NotFoundError('Order');

    const updated = await prisma.$transaction(async (tx) => {
      await tx.shipment.create({
        data: {
          orderId,
          carrier: input.carrier,
          trackingNumber: input.trackingNumber,
          trackingUrl: input.trackingUrl,
          estimatedDelivery: input.estimatedDelivery ? new Date(input.estimatedDelivery) : undefined,
          shippedAt: new Date(),
        },
      });

      const o = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'SHIPPED',
          statusHistory: {
            create: {
              fromStatus: order.status,
              toStatus: 'SHIPPED',
              note: `Carrier: ${input.carrier}, Tracking: ${input.trackingNumber}`,
            },
          },
        },
        include: { shipments: true },
      });

      return o;
    });

    return updated;
  }

  async markDelivered(sellerId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, sellerId },
    });
    if (!order) throw new NotFoundError('Order');

    return prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: 'DELIVERED',
            note: 'Delivered to buyer',
          },
        },
      },
    });
  }

  async requestRefund(buyerId: string, orderId: string, input: RequestRefundInput) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, buyerId },
    });
    if (!order) throw new NotFoundError('Order');

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUND_REQUESTED',
        refundReason: input.reason,
        refundEvidenceUrl: input.evidenceUrl,
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: 'REFUND_REQUESTED',
            note: `Refund requested: ${input.reason}`,
          },
        },
      },
    });

    return updated;
  }
}

export const commerceService = new CommerceService();
