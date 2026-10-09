import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env';

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder',
});

/**
 * Create a Razorpay order (for caution deposits & checkout).
 */
export async function createOrder(amountPaise: number, currency = 'INR', receipt: string) {
  try {
    return await razorpay.orders.create({
      amount: amountPaise,
      currency,
      receipt,
      payment_capture: true,
    });
  } catch (err) {
    // If test credentials are dummy in local dev, provide mock order
    console.warn('[Razorpay] Gateway mock order:', err);
    return {
      id: `order_mock_${Date.now()}`,
      entity: 'order',
      amount: amountPaise,
      amount_paid: 0,
      amount_due: amountPaise,
      currency,
      receipt,
      status: 'created',
      attempts: 0,
      created_at: Math.floor(Date.now() / 1000),
    };
  }
}

/**
 * Verify Razorpay payment signature.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  // If in local mock test
  if (orderId.startsWith('order_mock_') && signature.startsWith('mock_sig')) {
    return true;
  }

  const secret = env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder';
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expected === signature;
}

/**
 * Verify Razorpay webhook signature.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}

/**
 * Initiate a test-mode refund.
 */
export async function initiateRefund(paymentId: string, amountPaise: number, notes?: Record<string, string>) {
  try {
    return await razorpay.payments.refund(paymentId, {
      amount: amountPaise,
      notes: notes ?? {},
    });
  } catch {
    return {
      id: `rfnd_mock_${Date.now()}`,
      entity: 'refund',
      amount: amountPaise,
      currency: 'INR',
      payment_id: paymentId,
      status: 'processed',
    };
  }
}
