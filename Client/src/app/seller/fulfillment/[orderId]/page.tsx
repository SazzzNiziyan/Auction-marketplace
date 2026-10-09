'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, MapPin, Truck } from 'lucide-react';
import { Alert, Button, Card, CardHeader, ErrorState, SafeImage, Skeleton } from '../../../../components/ui';
import { StatusBadge } from '../../../../components/marketplace';
import ShipOrderModal from '../../../../components/seller/ShipOrderModal';
import { useApi } from '../../../../lib/use-api';
import { api } from '../../../../lib/api';
import { useToast } from '../../../../lib/toast';
import { formatDate, formatDateTime, formatINR, humanize } from '../../../../lib/format';
import type { ApiOrder } from '../../../../lib/types';

export default function FulfillmentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const toast = useToast();
  const { data: order, loading, error, reload } = useApi<ApiOrder>(`/commerce/orders/${orderId}`);
  const [shipOpen, setShipOpen] = useState(false);
  const [delivering, setDelivering] = useState(false);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const a = order.shippingAddress || {};
  const addressText = [a.fullName, a.phone, a.addressLine1, a.addressLine2, `${a.city || ''}, ${a.state || ''} ${a.pincode || ''}`].filter(Boolean).join('\n');
  const shipment = order.shipments?.[0];
  const canShip = order.status === 'PAYMENT_CONFIRMED' || order.status === 'PROCESSING';

  const markDelivered = async () => {
    setDelivering(true);
    const res = await api.post(`/commerce/orders/${order.id}/delivered`);
    setDelivering(false);
    if (res.success) {
      toast.success('Marked as delivered');
      reload();
    } else toast.error('Couldn’t update order', res.message);
  };

  return (
    <div>
      <Link href="/seller/orders" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Orders
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="tabular text-2xl font-semibold tracking-tight sm:text-3xl">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="mt-1 text-sm text-muted">Placed {formatDateTime(order.createdAt)} by {order.buyer?.profile?.displayName || 'buyer'}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          {canShip && <Button icon={Truck} onClick={() => setShipOpen(true)}>Ship order</Button>}
          {order.status === 'SHIPPED' && <Button variant="secondary" icon={CheckCircle2} loading={delivering} onClick={markDelivered}>Mark delivered</Button>}
        </div>
      </div>

      {order.status === 'PENDING_PAYMENT' && (
        <Alert tone="warning" className="mt-6" title="Don’t ship yet">The buyer hasn’t paid. You’ll be able to ship once payment is confirmed.</Alert>
      )}
      {order.status === 'REFUND_REQUESTED' && (
        <Alert tone="danger" className="mt-6" title="The buyer requested a return">
          {order.refundReason}
          {order.refundEvidenceUrl && (
            <a href={order.refundEvidenceUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 font-medium underline">
              Evidence <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </Alert>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Items to pack" />
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <SafeImage src={it.snapshotImageUrl || it.listing?.images?.[0]?.imageUrl} alt="" className="size-16 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium">{it.snapshotTitle}</p>
                    <p className="text-sm text-muted">{formatINR(it.unitPriceInPaise)} each</p>
                  </div>
                  <span className="tabular rounded-lg bg-subtle px-2.5 py-1 text-sm font-semibold">× {it.quantity}</span>
                </li>
              ))}
            </ul>
          </Card>

          {shipment && (
            <Card className="p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-semibold"><Truck className="size-5 text-muted" aria-hidden /> Shipment</h2>
              <p className="mt-2 text-sm">{shipment.carrier} · <span className="tabular">{shipment.trackingNumber}</span></p>
              <p className="text-sm text-muted">Shipped {formatDateTime(shipment.shippedAt)}{shipment.estimatedDelivery && ` · ETA ${formatDate(shipment.estimatedDelivery)}`}</p>
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
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold"><MapPin className="size-4 text-muted" aria-hidden /> Ship to</h2>
              {a.addressLine1 && (
                <button
                  onClick={() => navigator.clipboard.writeText(addressText).then(() => toast.success('Address copied'))}
                  className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted hover:bg-subtle hover:text-ink"
                >
                  <Copy className="size-4" aria-hidden /> Copy
                </button>
              )}
            </div>
            {a.addressLine1 ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-2">{addressText}</p>
            ) : (
              <p className="mt-3 text-sm text-muted">{a.note || 'Address not provided yet.'}</p>
            )}
            {order.notes && <p className="mt-3 rounded-lg bg-subtle px-3 py-2 text-sm text-ink-2">Note: {order.notes}</p>}
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="font-semibold">Payment</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Items</dt><dd className="tabular">{formatINR(order.subtotalPaise)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="tabular">{formatINR(order.shippingPaise)}</dd></div>
              {order.discountPaise > 0 && <div className="flex justify-between"><dt className="text-muted">Deposit credit</dt><dd className="tabular">−{formatINR(order.discountPaise)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd className="tabular">{formatINR(order.totalPaise)}</dd></div>
            </dl>
          </Card>
        </div>
      </div>

      <ShipOrderModal orderId={order.id} open={shipOpen} onClose={() => setShipOpen(false)} onShipped={reload} />
    </div>
  );
}
