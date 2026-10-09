'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Gavel, PlusCircle, Users } from 'lucide-react';
import { Card, EmptyState, ErrorState, LinkButton, PageHeader, SafeImage, Skeleton, Tabs } from '../../../components/ui';
import { Countdown, StatusBadge } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { formatINR, formatNumber } from '../../../lib/format';
import { isAuctionOpen, type ApiListing, type Paginated } from '../../../lib/types';

export default function SellerAuctionsPage() {
  // The inventory endpoint has no type filter, so fetch a large page and filter client-side.
  const { data, loading, error, reload } = useApi<Paginated<ApiListing>>('/seller/inventory?limit=100');
  const [tab, setTab] = useState<'live' | 'ended'>('live');

  const auctions = (data?.items || []).filter((l) => l.type === 'AUCTION' && l.auction);
  const live = auctions.filter((l) => isAuctionOpen(l.auction!.status) || l.auction!.status === 'SCHEDULED');
  const ended = auctions.filter((l) => !live.includes(l));
  const list = tab === 'live' ? live : ended;

  return (
    <div>
      <PageHeader
        title="Auctions"
        description="Bids and time remaining on every lot you’re running."
        actions={<LinkButton href="/seller/listings/create?type=AUCTION" icon={PlusCircle}>New auction</LinkButton>}
      />
      <Tabs
        className="mt-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'live', label: 'Live & upcoming', count: live.length },
          { value: 'ended', label: 'Ended', count: ended.length },
        ]}
      />

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title={tab === 'live' ? 'No live auctions' : 'No finished auctions'}
            description="Auctions add urgency — buyers compete in real time and late bids extend the clock."
            action={tab === 'live' && <LinkButton href="/seller/listings/create?type=AUCTION" size="sm">Start an auction</LinkButton>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((l) => {
              const a = l.auction!;
              const open = isAuctionOpen(a.status);
              return (
                <Link key={l.id} href={`/auction/${a.id}`} className="block">
                  <Card className="flex gap-4 p-4 transition-colors hover:border-line-strong">
                    <SafeImage src={l.images?.[0]?.imageUrl} alt="" className="size-24 shrink-0 rounded-xl" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge kind="auction" status={a.status} />
                        {open && <Countdown endsAt={a.scheduledEndAt} className="text-sm text-ink-2" />}
                      </div>
                      <p className="mt-1.5 line-clamp-1 font-medium">{l.title}</p>
                      <div className="mt-auto flex items-end justify-between pt-2">
                        <div>
                          <p className="text-xs text-muted">{a.bidCount ? 'Current bid' : 'Starting bid'}</p>
                          <p className="tabular font-semibold">{formatINR(a.currentHighBidPaise)}</p>
                        </div>
                        <p className="flex items-center gap-1 text-sm text-muted"><Users className="size-3.5" aria-hidden />{formatNumber(a.bidCount)} bids</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
