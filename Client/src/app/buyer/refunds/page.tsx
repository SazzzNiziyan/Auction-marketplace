'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { Card, EmptyState, ErrorState, PageHeader, SafeImage, Skeleton } from '../../../components/ui';
import { StatusBadge } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { formatDate, formatINR } from '../../../lib/format';
import { sellerDisplayName, type ApiOrder } from '../../../lib/types';

const REFUND_STATUSES = ['REFUND_REQUESTED', 'REFUND_APPROVED', 'REFUNDED'];

export default function BuyerRefundsPage() {
  const { data, loading, error, reload } = useApi<ApiOrder[]>('/commerce/orders/buyer');
  const refunds = (data || []).filter((o) => REFUND_STATUSES.includes(o.status));

  return (
    <div>
      <PageHeader title="Returns & refunds" description="Track return requests. To start a new one, open a delivered order." />

      <div className="mt-6 space-y-4">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : refunds.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title="No return requests"
            description="If something arrives damaged or not as described, open the order within 7 days of delivery and choose “Request a return”."
            action={<Link href="/buyer/orders" className="text-sm font-medium underline underline-offset-4">Go to orders</Link>}
          />
        ) : (
          refunds.map((o) => (
            <Link key={o.id} href={`/buyer/orders/${o.id}`} className="block">
              <Card className="p-5 transition-colors hover:border-line-strong">
                <div className="flex items-start gap-4">
                  <SafeImage src={o.items[0]?.snapshotImageUrl || o.items[0]?.listing?.images?.[0]?.imageUrl} alt="" className="size-16 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={o.status} />
                      <span className="tabular text-sm text-muted">#{o.id.slice(0, 8).toUpperCase()} · {formatDate(o.updatedAt || o.createdAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 font-medium">{o.items[0]?.snapshotTitle}</p>
                    <p className="text-sm text-muted">{sellerDisplayName(o.seller)} · {formatINR(o.totalPaise)}</p>
                    {o.refundReason && <p className="mt-2 line-clamp-2 rounded-lg bg-subtle px-3 py-2 text-sm text-ink-2">“{o.refundReason}”</p>}
                  </div>
                  <ChevronRight className="mt-1 size-5 text-muted" aria-hidden />
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
