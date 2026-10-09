'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, Package } from 'lucide-react';
import { Card, LinkButton, SafeImage, Skeleton } from '../../../components/ui';
import { StatusBadge } from '../../../components/marketplace';
import { api } from '../../../lib/api';
import { formatINR } from '../../../lib/format';
import { sellerDisplayName, type ApiOrder } from '../../../lib/types';

function Confirmation() {
  const params = useSearchParams();
  const ids = (params.get('orders') || '').split(',').filter(Boolean);
  const paid = params.get('paid') === '1';
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);

  useEffect(() => {
    if (ids.length === 0) {
      setOrders([]);
      return;
    }
    Promise.all(ids.map((id) => api.get<ApiOrder>(`/commerce/orders/${id}`))).then((results) =>
      setOrders(results.filter((r) => r.success && r.data).map((r) => r.data!))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const total = orders?.reduce((n, o) => n + o.totalPaise, 0) || 0;

  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <div className="text-center">
        <span className={paid ? 'mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success' : 'mx-auto flex size-14 items-center justify-center rounded-full bg-warning-soft text-warning'}>
          {paid ? <CheckCircle2 className="size-7" aria-hidden /> : <Clock className="size-7" aria-hidden />}
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">{paid ? 'Order confirmed' : 'Order placed'}</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          {paid
            ? 'Payment received. Each seller will ship separately and add tracking to your order.'
            : 'Your order is saved and awaiting payment. You can follow its progress from your orders page.'}
        </p>
      </div>

      <Card className="mt-10">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-semibold">{ids.length} {ids.length === 1 ? 'order' : 'orders'}</h2>
          {orders && <p className="tabular font-semibold">{formatINR(total)}</p>}
        </div>
        {!orders ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                <div className="flex -space-x-3">
                  {o.items.slice(0, 3).map((it) => (
                    <SafeImage key={it.id} src={it.snapshotImageUrl || it.listing?.images?.[0]?.imageUrl} alt="" className="size-12 rounded-lg border-2 border-surface" />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{sellerDisplayName(o.seller)}</p>
                  <p className="text-sm text-muted">#{o.id.slice(0, 8).toUpperCase()} · {o.items.length} {o.items.length === 1 ? 'item' : 'items'}</p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <StatusBadge status={o.status} />
                  <p className="tabular text-sm font-semibold">{formatINR(o.totalPaise)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <LinkButton href="/buyer/orders" icon={Package}>View my orders</LinkButton>
        <LinkButton href="/explore" variant="secondary">Continue shopping</LinkButton>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="container-page py-16" aria-busy="true" />}>
      <Confirmation />
    </Suspense>
  );
}
