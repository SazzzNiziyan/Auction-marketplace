'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CreditCard, ExternalLink, MapPin, RotateCcw, Store, Truck } from 'lucide-react';
import { Alert, Button, Card, CardHeader, ErrorState, Input, Modal, SafeImage, Skeleton, Textarea } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/marketplace';
import { useApi } from '../../../../lib/use-api';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';
import { useToast } from '../../../../lib/toast';
import { canCollectPayment, collectPayment } from '../../../../lib/razorpay';
import { cn, formatDate, formatDateTime, formatINR, humanize } from '../../../../lib/format';
import { sellerDisplayName, type ApiOrder, type OrderStatus } from '../../../../lib/types';

const PROGRESS: OrderStatus[] = ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'SHIPPED', 'DELIVERED'];
const PROGRESS_LABELS = ['Ordered', 'Paid', 'Shipped', 'Delivered'];
const RETURNABLE: OrderStatus[] = ['SHIPPED', 'DELIVERED', 'COMPLETED'];

export default function BuyerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const toast = useToast();
  const { data: order, loading, error, reload } = useApi<ApiOrder>(`/commerce/orders/${id}`);
  const [refundOpen, setRefundOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const step = order.status === 'PROCESSING' ? 1 : order.status === 'COMPLETED' ? 3 : PROGRESS.indexOf(order.status);
  const shipment = order.shipments?.[0];
  const address = order.shippingAddress || {};
  const payment = order.payments?.find((p) => p.razorpayOrderId);
  const canPay = order.status === 'PENDING_PAYMENT' && !!payment?.razorpayOrderId && canCollectPayment({ id: payment.razorpayOrderId, amount: payment.amountPaise, currency: 'INR' });

  const submitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) return;
    setSubmitting(true);
    const res = await api.post(`/commerce/orders/${order.id}/refund`, { reason: reason.trim(), evidenceUrl: evidenceUrl.trim() || undefined });
    setSubmitting(false);
    if (res.success) {
      setRefundOpen(false);
      toast.success('Return requested', 'The seller has been notified. We’ll update you here.');
      reload();
    } else toast.error('Couldn’t submit request', res.message);
  };

  const pay = async () => {
    if (!payment?.razorpayOrderId) return;
    setPaying(true);
    const result = await collectPayment({ id: payment.razorpayOrderId, amount: payment.amountPaise, currency: 'INR' }, { name: address.fullName, email: user?.email, contact: address.phone });
    setPaying(false);
    if (result.status === 'paid') {
      toast.success('Payment received');
      reload();
    } else if (result.status === 'failed') toast.error('Payment failed', result.message);
  };

  return (
    <div>
      <Link href="/buyer/orders" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All orders
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="tabular text-2xl font-semibold tracking-tight sm:text-3xl">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="mt-1 text-sm text-muted">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} className="text-sm" />
      </div>

      {order.status === 'PENDING_PAYMENT' && (
        <Alert
          tone="warning"
          className="mt-6"
          title="Payment pending"
          action={canPay ? <Button size="sm" icon={CreditCard} loading={paying} onClick={pay}>Pay {formatINR(order.totalPaise)}</Button> : undefined}
        >
          {canPay
            ? 'Complete payment so the seller can ship your order.'
            : 'Online payment isn’t available for this order in this environment. Contact support@auctio.in to complete payment.'}
        </Alert>
      )}
      {order.status === 'REFUND_REQUESTED' && (
        <Alert tone="info" className="mt-6" title="Return requested">
          {order.refundReason}
        </Alert>
      )}

      {step >= 0 && !order.status.startsWith('REFUND') && order.status !== 'CANCELLED' && (
        <Card className="mt-6 p-5 sm:p-6">
          <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
            {PROGRESS_LABELS.map((label, i) => {
              const done = i <= step;
              return (
                <li key={label} className="flex flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <span className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done ? 'bg-ink' : 'bg-line')} />
                    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold', done ? 'bg-ink text-white' : 'bg-subtle text-muted')}>
                      {done ? <Check className="size-4" aria-hidden /> : i + 1}
                    </span>
                    <span className={cn('h-0.5 flex-1', i === 3 ? 'bg-transparent' : i < step ? 'bg-ink' : 'bg-line')} />
                  </div>
                  <span className={cn('mt-2 text-xs sm:text-sm', done ? 'font-medium text-ink' : 'text-muted')}>{label}</span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title={
                <Link href={`/store/${order.sellerId}`} className="flex items-center gap-2 hover:underline">
                  <Store className="size-4 text-muted" aria-hidden /> {sellerDisplayName(order.seller)}
                </Link>
              }
            />
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <SafeImage src={it.snapshotImageUrl || it.listing?.images?.[0]?.imageUrl} alt="" className="size-16 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    {it.listing ? (
                      <Link href={`/product/${it.listing.id}`} className="line-clamp-2 font-medium hover:underline">{it.snapshotTitle}</Link>
                    ) : (
                      <p className="line-clamp-2 font-medium">{it.snapshotTitle}</p>
                    )}
                    <p className="text-sm text-muted">Qty {it.quantity} · {formatINR(it.unitPriceInPaise)} each</p>
                  </div>
                  <p className="tabular font-semibold">{formatINR(it.unitPriceInPaise * it.quantity)}</p>
                </li>
              ))}
            </ul>
          </Card>

          {shipment && (
            <Card className="p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-semibold"><Truck className="size-5 text-muted" aria-hidden /> Shipment</h2>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{shipment.carrier}</p>
                  <p className="tabular text-muted">Tracking {shipment.trackingNumber}</p>
                  {shipment.estimatedDelivery && <p className="text-muted">Estimated delivery {formatDate(shipment.estimatedDelivery)}</p>}
                </div>
                {shipment.trackingUrl && (
                  <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 font-medium hover:bg-subtle">
                    Track package <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
              </div>
            </Card>
          )}

          {order.statusHistory && order.statusHistory.length > 0 && (
            <Card className="p-5 sm:p-6">
              <h2 className="font-semibold">Activity</h2>
              <ol className="mt-4 space-y-4 border-l border-line pl-5">
                {[...order.statusHistory].reverse().map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-ink" aria-hidden />
                    <p className="text-sm font-medium">{humanize(h.toStatus)}</p>
                    {h.note && <p className="text-sm text-muted">{h.note}</p>}
                    <p className="text-xs text-muted">{formatDateTime(h.createdAt)}</p>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="font-semibold">Summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular">{formatINR(order.subtotalPaise)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="tabular">{formatINR(order.shippingPaise)}</dd></div>
              {order.discountPaise > 0 && (
                <div className="flex justify-between"><dt className="text-muted">Deposit credit</dt><dd className="tabular text-success">−{formatINR(order.discountPaise)}</dd></div>
              )}
              <div className="flex justify-between border-t border-line pt-2.5 text-base font-semibold"><dt>Total</dt><dd className="tabular">{formatINR(order.totalPaise)}</dd></div>
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-semibold"><MapPin className="size-4 text-muted" aria-hidden /> Delivery address</h2>
            {address.addressLine1 ? (
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                {address.fullName}
                {address.phone && <> · {address.phone}</>}
                <br />
                {address.addressLine1}
                {address.addressLine2 && `, ${address.addressLine2}`}
                <br />
                {address.city}, {address.state} {address.pincode}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted">{address.note || 'No address on file yet.'}</p>
            )}
          </Card>

          {RETURNABLE.includes(order.status) && (
            <Button variant="secondary" icon={RotateCcw} className="w-full" onClick={() => setRefundOpen(true)}>
              Request a return
            </Button>
          )}
        </div>
      </div>

      <Modal open={refundOpen} onClose={() => setRefundOpen(false)} title="Request a return" description="Tell the seller what’s wrong. Returns are accepted within 7 days of delivery.">
        <form onSubmit={submitRefund} className="space-y-4">
          <Textarea
            label="What’s the problem?"
            required
            rows={4}
            minLength={10}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            hint={reason.length > 0 && reason.trim().length < 10 ? 'Please add a little more detail (at least 10 characters).' : 'E.g. damaged in transit, not as described, wrong item.'}
          />
          <Input label="Photo link (optional)" type="url" placeholder="https://" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} hint="Link to a photo showing the issue." />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setRefundOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting} disabled={reason.trim().length < 10}>Submit request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
