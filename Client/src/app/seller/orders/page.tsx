'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, Truck } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, PageHeader, SafeImage, Skeleton, Tabs } from '../../../components/ui';
import { StatusBadge } from '../../../components/marketplace';
import ShipOrderModal from '../../../components/seller/ShipOrderModal';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { formatDate, formatINR } from '../../../lib/format';
import type { ApiOrder, OrderStatus } from '../../../lib/types';

const GROUPS: Record<string, OrderStatus[] | null> = {
  ship: ['PAYMENT_CONFIRMED', 'PROCESSING'],
  unpaid: ['PENDING_PAYMENT'],
  shipped: ['SHIPPED'],
  done: ['DELIVERED', 'COMPLETED'],
  all: null,
};

export default function SellerOrdersPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<ApiOrder[]>('/commerce/orders/seller');
  const [tab, setTab] = useState<keyof typeof GROUPS>('ship');
  const [shipping, setShipping] = useState<string | null>(null);
  const [delivering, setDelivering] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    Object.entries(GROUPS).forEach(([k, s]) => (c[k] = (data || []).filter((o) => !s || s.includes(o.status)).length));
    return c;
  }, [data]);

  const orders = (data || []).filter((o) => !GROUPS[tab] || GROUPS[tab]!.includes(o.status));

  const markDelivered = async (id: string) => {
    setDelivering(id);
    const res = await api.post(`/commerce/orders/${id}/delivered`);
    setDelivering(null);
    if (res.success) {
      toast.success('Marked as delivered');
      reload();
    } else toast.error('Couldn’t update order', res.message);
  };

  return (
    <div>
      <PageHeader title="Orders" description="Ship paid orders and keep buyers updated." />
      <Tabs
        className="mt-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'ship', label: 'To ship', count: counts.ship },
          { value: 'unpaid', label: 'Awaiting payment', count: counts.unpaid },
          { value: 'shipped', label: 'Shipped', count: counts.shipped },
          { value: 'done', label: 'Delivered', count: counts.done },
          { value: 'all', label: 'All', count: counts.all },
        ]}
      />

      <div className="mt-6 space-y-4">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
        ) : orders.length === 0 ? (
          <EmptyState icon={Truck} title={tab === 'ship' ? 'Nothing to ship' : 'No orders here'} description={tab === 'ship' ? 'Paid orders waiting for dispatch will appear here.' : 'Try another tab.'} />
        ) : (
          orders.map((o) => {
            const addr = o.shippingAddress || {};
            return (
              <Card key={o.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <Link href={`/seller/fulfillment/${o.id}`} className="tabular font-medium hover:underline">#{o.id.slice(0, 8).toUpperCase()}</Link>
                    <span className="text-muted">{formatDate(o.createdAt)}</span>
                    <span className="text-muted">{o.buyer?.profile?.displayName || 'Buyer'}</span>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <SafeImage src={o.items[0]?.snapshotImageUrl} alt="" className="size-14 shrink-0 rounded-xl" />
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-medium">{o.items[0]?.snapshotTitle}</p>
                      <p className="text-sm text-muted">
                        {o.items.reduce((n, i) => n + i.quantity, 0)} items · {formatINR(o.totalPaise)}
                        {addr.city && ` · ${addr.city}, ${addr.state}`}
                      </p>
                      {o.shipments?.[0] && <p className="tabular text-sm text-muted">{o.shipments[0].carrier} · {o.shipments[0].trackingNumber}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(o.status === 'PAYMENT_CONFIRMED' || o.status === 'PROCESSING') && (
                      <Button icon={Truck} onClick={() => setShipping(o.id)}>Ship</Button>
                    )}
                    {o.status === 'SHIPPED' && (
                      <Button variant="secondary" icon={CheckCircle2} loading={delivering === o.id} onClick={() => markDelivered(o.id)}>Mark delivered</Button>
                    )}
                    <Link href={`/seller/fulfillment/${o.id}`} className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink" aria-label="Order details">
                      <ChevronRight className="size-5" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <ShipOrderModal orderId={shipping} open={!!shipping} onClose={() => setShipping(null)} onShipped={reload} />
    </div>
  );
}
