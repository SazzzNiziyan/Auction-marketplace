'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Banknote, Gavel, Package, PlusCircle, Tags, Truck } from 'lucide-react';
import { Card, CardHeader, EmptyState, ErrorState, LinkButton, PageHeader, Skeleton, StatCard } from '../../../components/ui';
import { StatusBadge } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { useAuth } from '../../../lib/auth';
import { formatDate, formatINR, formatNumber } from '../../../lib/format';
import type { ApiOrder } from '../../../lib/types';

interface Dashboard {
  totalListings: number;
  activeListings: number;
  totalOrders: number;
  totalRevenuePaise: number;
  recentOrders: ApiOrder[];
}

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const dash = useApi<Dashboard>('/seller/dashboard');
  const orders = useApi<ApiOrder[]>('/commerce/orders/seller');

  const toShip = (orders.data || []).filter((o) => o.status === 'PAYMENT_CONFIRMED' || o.status === 'PROCESSING');
  const disputes = (orders.data || []).filter((o) => o.status === 'REFUND_REQUESTED');

  if (dash.error) return <ErrorState message={dash.error} onRetry={dash.reload} />;

  const d = dash.data;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Seller hub"
        title={`Welcome back${user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}`}
        description="Here’s how your store is doing."
        actions={<LinkButton href="/seller/listings/create" icon={PlusCircle}>New listing</LinkButton>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (paid orders)" icon={Banknote} loading={dash.loading} value={formatINR(d?.totalRevenuePaise)} />
        <StatCard label="Orders" icon={Package} loading={dash.loading} value={formatNumber(d?.totalOrders)} />
        <StatCard label="Active listings" icon={Tags} loading={dash.loading} value={formatNumber(d?.activeListings)} hint={d ? `${formatNumber(d.totalListings)} total` : undefined} />
        <StatCard label="Ready to ship" icon={Truck} loading={orders.loading} value={formatNumber(toShip.length)} hint={disputes.length ? `${disputes.length} return ${disputes.length === 1 ? 'request' : 'requests'}` : undefined} />
      </div>

      {(toShip.length > 0 || disputes.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {toShip.length > 0 && (
            <Link href="/seller/orders" className="flex items-center gap-4 rounded-2xl border border-accent-line/60 bg-accent-soft/50 p-5 hover:bg-accent-soft">
              <Truck className="size-6 shrink-0 text-accent" aria-hidden />
              <div className="flex-1">
                <p className="font-semibold">{toShip.length} {toShip.length === 1 ? 'order needs' : 'orders need'} shipping</p>
                <p className="text-sm text-ink-2">Add tracking so buyers can follow delivery.</p>
              </div>
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          )}
          {disputes.length > 0 && (
            <Link href="/seller/disputes" className="flex items-center gap-4 rounded-2xl border border-red-200 bg-danger-soft p-5 hover:bg-red-100/60">
              <Package className="size-6 shrink-0 text-danger" aria-hidden />
              <div className="flex-1">
                <p className="font-semibold">{disputes.length} return {disputes.length === 1 ? 'request' : 'requests'}</p>
                <p className="text-sm text-ink-2">Review the buyer’s reason and evidence.</p>
              </div>
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          )}
        </div>
      )}

      <Card>
        <CardHeader title="Recent orders" action={<LinkButton href="/seller/orders" variant="link" iconRight={ArrowRight} className="text-sm">All orders</LinkButton>} />
        {dash.loading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !d || d.recentOrders.length === 0 ? (
          <EmptyState
            className="m-5 border-0"
            icon={Gavel}
            title="No orders yet"
            description="Orders appear here when buyers purchase your items or win your auctions."
            action={<LinkButton href="/seller/listings/create" size="sm">Create a listing</LinkButton>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th scope="col" className="px-5 py-3 font-medium sm:px-6">Order</th>
                  <th scope="col" className="px-3 py-3 font-medium">Item</th>
                  <th scope="col" className="px-3 py-3 font-medium">Buyer</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium sm:px-6">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-subtle/60">
                    <td className="px-5 py-3 sm:px-6">
                      <Link href={`/seller/fulfillment/${o.id}`} className="tabular font-medium hover:underline">#{o.id.slice(0, 8).toUpperCase()}</Link>
                      <p className="text-xs text-muted">{formatDate(o.createdAt)}</p>
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-3">{o.items[0]?.snapshotTitle}</td>
                    <td className="px-3 py-3 text-ink-2">{o.buyer?.profile?.displayName || 'Buyer'}</td>
                    <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                    <td className="tabular px-5 py-3 text-right font-medium sm:px-6">{formatINR(o.totalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: '/seller/listings/create', icon: PlusCircle, title: 'List an item', body: 'Use the AI assistant to write it for you.' },
          { href: '/seller/auctions', icon: Gavel, title: 'Track auctions', body: 'See bids and time left on every lot.' },
          { href: '/seller/earnings', icon: Banknote, title: 'View earnings', body: 'Gross sales, fees and net payout.' },
        ].map(({ href, icon: Icon, title, body }) => (
          <Link key={href} href={href} className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
            <Icon className="size-5 text-accent" aria-hidden />
            <p className="mt-3 font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
