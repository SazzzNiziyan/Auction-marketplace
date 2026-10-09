'use client';

import React, { useState } from 'react';
import { Package, Search } from 'lucide-react';
import { Card, EmptyState, ErrorState, Input, PageHeader, Select, Skeleton } from '../../../components/ui';
import { StatusBadge } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { formatDate, formatINR, humanize } from '../../../lib/format';
import type { ApiOrder } from '../../../lib/types';

type AdminOrder = ApiOrder & {
  buyer: { email: string; profile?: { displayName?: string } | null };
  seller: { email: string; profile?: { displayName?: string } | null; sellerProfile?: { businessName?: string } | null };
};

const STATUSES = ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUND_APPROVED', 'REFUNDED'];

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useApi<AdminOrder[]>(`/admin/orders${status ? `?status=${status}` : ''}`);

  const term = q.trim().toLowerCase();
  const orders = (data || []).filter(
    (o) =>
      !term ||
      o.id.toLowerCase().includes(term) ||
      o.buyer.email.toLowerCase().includes(term) ||
      o.seller.email.toLowerCase().includes(term) ||
      o.items.some((i) => i.snapshotTitle.toLowerCase().includes(term))
  );

  return (
    <div>
      <PageHeader title="Orders" description="Every order across the marketplace (latest 200)." />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Input aria-label="Search orders" placeholder="Order ID, email or item" value={q} onChange={(e) => setQ(e.target.value)} leading={<Search className="size-4" />} wrapperClassName="sm:max-w-sm" />
        <Select aria-label="Filter by status" placeholder="All statuses" options={STATUSES.map((s) => ({ value: s, label: humanize(s) }))} value={status} onChange={(e) => setStatus(e.target.value)} wrapperClassName="sm:w-56" />
      </div>

      <Card className="mt-6 overflow-hidden">
        {error ? (
          <ErrorState className="m-5 border-0" message={error} onRetry={reload} />
        ) : loading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : orders.length === 0 ? (
          <EmptyState className="m-5 border-0" icon={Package} title="No orders found" description={term || status ? 'Try a different search or status.' : 'Orders will appear here once buyers check out.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th scope="col" className="px-5 py-3 font-medium">Order</th>
                  <th scope="col" className="px-3 py-3 font-medium">Items</th>
                  <th scope="col" className="px-3 py-3 font-medium">Buyer</th>
                  <th scope="col" className="px-3 py-3 font-medium">Seller</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-subtle/60">
                    <td className="px-5 py-3">
                      <p className="tabular font-medium">#{o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted">{formatDate(o.createdAt)}</p>
                    </td>
                    <td className="max-w-[220px] px-3 py-3">
                      <p className="truncate">{o.items[0]?.snapshotTitle}</p>
                      {o.items.length > 1 && <p className="text-xs text-muted">+ {o.items.length - 1} more</p>}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-3 text-ink-2">{o.buyer.profile?.displayName || o.buyer.email}</td>
                    <td className="max-w-[180px] truncate px-3 py-3 text-ink-2">{o.seller.sellerProfile?.businessName || o.seller.profile?.displayName || o.seller.email}</td>
                    <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                    <td className="tabular px-5 py-3 text-right font-medium">{formatINR(o.totalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
