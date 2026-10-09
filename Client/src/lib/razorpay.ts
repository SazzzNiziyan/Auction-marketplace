'use client';

import { api } from './api';

const KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (e: unknown) => void) => void };
  }
}

/** True when a real Razorpay key is configured and the backend created a real order. */
export function canCollectPayment(order?: RazorpayOrder | null) {
  return !!KEY_ID && !!order?.id && !order.id.startsWith('order_mock_');
}

function loadCheckoutScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Opens Razorpay Checkout for an order created by the backend, then verifies
 * the signature server-side. Resolves to 'paid', 'dismissed' or 'failed'.
 */
export async function collectPayment(order: RazorpayOrder, prefill: { name?: string; email?: string; contact?: string }) {
  const loaded = await loadCheckoutScript();
  if (!loaded || !window.Razorpay) return { status: 'failed' as const, message: 'Could not load the payment window.' };

  return new Promise<{ status: 'paid' | 'dismissed' | 'failed'; message?: string }>((resolve) => {
    const rzp = new window.Razorpay!({
      key: KEY_ID,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      name: 'Auctio',
      description: 'Marketplace order',
      prefill,
      theme: { color: '#1c1917' },
      handler: async (resp: RazorpaySuccess) => {
        const verify = await api.post('/payments/verify', {
          razorpayOrderId: resp.razorpay_order_id,
          razorpayPaymentId: resp.razorpay_payment_id,
          razorpaySignature: resp.razorpay_signature,
        });
        resolve(verify.success ? { status: 'paid' } : { status: 'failed', message: verify.message });
      },
      modal: { ondismiss: () => resolve({ status: 'dismissed' }) },
    });
    rzp.on('payment.failed', () => resolve({ status: 'failed', message: 'The payment was declined.' }));
    rzp.open();
  });
}
