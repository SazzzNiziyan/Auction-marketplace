'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Package } from 'lucide-react';
import { Card, EmptyState, ErrorState, LinkButton, PageHeader, SafeImage, Skeleton, Tabs } from '../../../components/ui';
import { StatusBadge } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { formatDate, formatINR } from '../../../lib/format';
import { sellerDisplayName, type ApiOrder, type OrderStatus } from '../../../lib/types';

const GROUPS: Record<string, OrderStatus[] | null> = {
  all: null,
  active: ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'PROCESSING', 'SHIPPED'],
  delivered: ['DELIVERED', 'COMPLETED'],
  returns: ['REFUND_REQUESTED', 'REFUND_APPROVED', 'REFUNDED', 'CANCELLED'],
};

export default function BuyerOrdersPage() {
  const { data, loading, error, reload } = useApi<ApiOrder[]>('/commerce/orders/buyer');
  const [tab, setTab] = useState<keyof typeof GROUPS>('all');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    Object.entries(GROUPS).forEach(([k, statuses]) => (c[k] = (data || []).filter((o) => !statuses || statuses.includes(o.status)).length));
    return c;
  }, [data]);

  const orders = (data || []).filter((o) => !GROUPS[tab] || GROUPS[tab]!.includes(o.status));

  return (
    <div>
      <PageHeader title="Orders" description="Track deliveries, pay for won auctions and request returns." />

      <Tabs
        className="mt-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'active', label: 'In progress', count: counts.active },
          { value: 'delivered', label: 'Delivered', count: counts.delivered },
          { value: 'returns', label: 'Returns & cancelled', count: counts.returns },
        ]}
      />

      <div className="mt-6 space-y-4">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title={tab === 'all' ? 'No orders yet' : 'Nothing here'}
            description={tab === 'all' ? 'Orders from purchases and won auctions appear here.' : 'No orders match this filter.'}
            action={tab === 'all' && <LinkButton href="/explore">Start exploring</LinkButton>}
          />
        ) : (
          orders.map((o) => (
            <Link key={o.id} href={`/buyer/orders/${o.id}`} className="block">
              <Card className="transition-colors hover:border-line-strong">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
                    <span className="tabular font-medium text-ink">#{o.id.slice(0, 8).toUpperCase()}</span>
                    <span>{formatDate(o.createdAt)}</span>
                    <span>{sellerDisplayName(o.seller)}</span>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="flex items-center gap-4 p-5">
                  <div className="flex -space-x-3">
                    {o.items.slice(0, 3).map((it) => (
                      <SafeImage key={it.id} src={it.snapshotImageUrl || it.listing?.images?.[0]?.imageUrl} alt="" className="size-14 rounded-xl border-2 border-surface" />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium">{o.items[0]?.snapshotTitle}</p>
                    <p className="text-sm text-muted">
                      {o.items.length > 1 ? `+ ${o.items.length - 1} more · ` : ''}
                      {o.shipments?.[0] ? `${o.shipments[0].carrier} · ${o.shipments[0].trackingNumber}` : o.status === 'PENDING_PAYMENT' ? 'Payment pending' : 'Awaiting dispatch'}
                    </p>
                  </div>
                  <p className="tabular hidden font-semibold sm:block">{formatINR(o.totalPaise)}</p>
                  <ChevronRight className="size-5 text-muted" aria-hidden />
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
