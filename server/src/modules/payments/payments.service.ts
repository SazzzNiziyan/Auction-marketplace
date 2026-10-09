import prisma from '../../config/database';
import { verifyPaymentSignature, verifyWebhookSignature, initiateRefund } from '../../integrations/razorpay';
import { NotFoundError, UnprocessableError, AuthorizationError } from '../../utils/errors';

export class PaymentsService {
  async verifyPayment(
    userId: string,
    input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }
  ) {
    const isValid = verifyPaymentSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature);
    if (!isValid) {
      throw new UnprocessableError('Invalid payment signature verification failed');
    }

    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: input.razorpayOrderId },
      include: { order: true },
    });

    if (!payment) throw new NotFoundError('Payment order');
    if (payment.userId !== userId) throw new AuthorizationError('Payment does not belong to user');

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
          status: 'CAPTURED',
          capturedAt: new Date(),
        },
      });

      if (payment.purpose === 'ORDER' && payment.orderId) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: 'PAYMENT_CONFIRMED',
            statusHistory: {
              create: {
                fromStatus: 'PENDING_PAYMENT',
                toStatus: 'PAYMENT_CONFIRMED',
                note: `Payment verified (${input.razorpayPaymentId})`,
              },
            },
          },
        });
      }

      return p;
    });

    return { success: true, message: 'Payment verified and captured', payment: updated };
  }

  async handleWebhook(rawBody: string, signature: string, eventData: any) {
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new UnprocessableError('Webhook signature verification failed');
    }

    const event = eventData.event;
    const payload = eventData.payload?.payment?.entity;

    if (payload?.order_id) {
      await prisma.paymentWebhookEvent.create({
        data: {
          eventType: event,
          eventId: eventData.id || `evt_${Date.now()}`,
          payload: eventData,
        },
      });

      if (event === 'payment.captured') {
        await prisma.payment.updateMany({
          where: { razorpayOrderId: payload.order_id },
          data: {
            status: 'CAPTURED',
            razorpayPaymentId: payload.id,
            capturedAt: new Date(),
          },
        });
      }
    }

    return { received: true };
  }

  async processRefund(userId: string, userRole: string, paymentId: string, amountPaise: number, reason: string) {
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new AuthorizationError('Only admins can initiate refunds');
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment || !payment.razorpayPaymentId) {
      throw new NotFoundError('Captured payment');
    }

    const rzpRefund = await initiateRefund(payment.razorpayPaymentId, amountPaise, { reason });

    const refund = await prisma.refund.create({
      data: {
        paymentId,
        amountPaise,
        reason,
        status: 'PROCESSED',
        razorpayRefundId: rzpRefund.id,
      },
    });

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED' },
    });

    return refund;
  }
}

export const paymentsService = new PaymentsService();
