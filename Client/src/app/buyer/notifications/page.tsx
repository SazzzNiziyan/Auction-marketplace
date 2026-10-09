'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Gavel, Package, ShieldCheck, Trophy, TrendingDown, Wallet, type LucideIcon } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../../../components/ui';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { cn, timeAgo } from '../../../lib/format';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: { auctionId?: string; orderId?: string } | null;
}

const ICONS: Record<string, LucideIcon> = {
  OUTBID: TrendingDown,
  BID_PLACED: Gavel,
  AUCTION_WON: Trophy,
  AUCTION_LOST: Gavel,
  ORDER_PLACED: Package,
  ORDER_SHIPPED: Package,
  ORDER_DELIVERED: Package,
  PAYMENT_CONFIRMED: Wallet,
  REFUND_PROCESSED: Wallet,
  SELLER_APPLICATION_UPDATE: ShieldCheck,
  LISTING_MODERATION_UPDATE: ShieldCheck,
};

function linkFor(n: Notification) {
  if (n.data?.auctionId) return `/auction/${n.data.auctionId}`;
  if (n.data?.orderId) return `/buyer/orders/${n.data.orderId}`;
  return null;
}

export default function NotificationsPage() {
  const { data, setData, loading, error, reload } = useApi<{ items: Notification[]; unreadCount: number }>('/users/me/notifications');

  const markRead = async (ids?: string[]) => {
    setData((d) =>
      d
        ? {
            ...d,
            items: d.items.map((n) => (!ids || ids.includes(n.id) ? { ...n, isRead: true } : n)),
            unreadCount: ids ? Math.max(0, d.unreadCount - ids.length) : 0,
          }
        : d
    );
    await api.post('/users/me/notifications/read', ids ? { ids } : {});
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={data && data.unreadCount > 0 ? `${data.unreadCount} unread` : 'Outbid alerts, wins and order updates.'}
        actions={data && data.unreadCount > 0 && <Button variant="secondary" size="sm" icon={CheckCheck} onClick={() => markRead()}>Mark all as read</Button>}
      />
      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={Bell} title="You’re all caught up" description="We’ll let you know when you’re outbid, win an auction, or an order ships." />
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {data.items.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              const href = linkFor(n);
              const content = (
                <div className={cn('flex gap-4 px-5 py-4 transition-colors', !n.isRead && 'bg-accent-soft/30', href && 'hover:bg-subtle')}>
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', n.type === 'OUTBID' ? 'bg-danger-soft text-danger' : n.type === 'AUCTION_WON' ? 'bg-accent-soft text-accent' : 'bg-subtle text-ink-2')}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className={cn('text-sm', !n.isRead ? 'font-semibold' : 'font-medium')}>{n.title}</p>
                      <span className="shrink-0 text-xs text-muted">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-2">{n.body}</p>
                  </div>
                  {!n.isRead && <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                </div>
              );
              return href ? (
                <Link key={n.id} href={href} onClick={() => !n.isRead && markRead([n.id])} className="block">
                  {content}
                </Link>
              ) : (
                <button key={n.id} onClick={() => !n.isRead && markRead([n.id])} className="block w-full text-left">
                  {content}
                </button>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}
