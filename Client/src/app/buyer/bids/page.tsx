'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Gavel } from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, LinkButton, PageHeader, SafeImage, Skeleton, Tabs, type BadgeTone } from '../../../components/ui';
import { Countdown } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { useAuth } from '../../../lib/auth';
import { formatINR, timeAgo } from '../../../lib/format';
import { isAuctionOpen, type AuctionStatus } from '../../../lib/types';

interface BidEntry {
  id: string;
  amountPaise: number;
  status: 'ACTIVE' | 'OUTBID' | 'RETRACTED' | 'WON';
  placedAt: string;
  auction: {
    id: string;
    status: AuctionStatus;
    currentHighBidPaise: number | null;
    scheduledEndAt: string;
    listing: { id: string; title: string; images?: Array<{ imageUrl: string }> };
  };
}

interface Row {
  auctionId: string;
  title: string;
  imageUrl?: string;
  myTopBid: number;
  current: number;
  status: AuctionStatus;
  endsAt: string;
  lastBidAt: string;
  bidCount: number;
  leading: boolean;
}

function standing(r: Row): { label: string; tone: BadgeTone } {
  const open = isAuctionOpen(r.status);
  if (open) return r.leading ? { label: 'Highest bid', tone: 'success' } : { label: 'Outbid', tone: 'danger' };
  if (r.leading && (r.status === 'ENDED' || r.status === 'COMPLETED')) return { label: 'Won', tone: 'accent' };
  if (r.status === 'CANCELLED') return { label: 'Cancelled', tone: 'neutral' };
  return { label: 'Not won', tone: 'neutral' };
}

export default function BuyerBidsPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi<{ bids: BidEntry[]; total: number }>('/users/me/bids?limit=50');
  const [tab, setTab] = useState<'active' | 'ended'>('active');

  // One row per auction, using the user's highest bid.
  const rows = useMemo<Row[]>(() => {
    const byAuction = new Map<string, Row>();
    for (const b of data?.bids || []) {
      const existing = byAuction.get(b.auction.id);
      const current = b.auction.currentHighBidPaise || 0;
      if (!existing) {
        byAuction.set(b.auction.id, {
          auctionId: b.auction.id,
          title: b.auction.listing.title,
          imageUrl: b.auction.listing.images?.[0]?.imageUrl,
          myTopBid: b.amountPaise,
          current,
          status: b.auction.status,
          endsAt: b.auction.scheduledEndAt,
          lastBidAt: b.placedAt,
          bidCount: 1,
          leading: b.status === 'ACTIVE' && b.amountPaise >= current,
        });
      } else {
        existing.bidCount += 1;
        if (b.amountPaise > existing.myTopBid) existing.myTopBid = b.amountPaise;
        if (b.status === 'ACTIVE' && b.amountPaise >= current) existing.leading = true;
      }
    }
    return [...byAuction.values()];
  }, [data]);

  const active = rows.filter((r) => isAuctionOpen(r.status));
  const ended = rows.filter((r) => !isAuctionOpen(r.status));
  const list = tab === 'active' ? active : ended;

  return (
    <div>
      <PageHeader title="My bids" description="Every auction you’ve bid on, and where you stand right now." />
      <Tabs
        className="mt-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'active', label: 'Live', count: active.length },
          { value: 'ended', label: 'Ended', count: ended.length },
        ]}
      />
      <div className="mt-6 space-y-3">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading || !user ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : list.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title={tab === 'active' ? 'No live bids' : 'No finished auctions yet'}
            description="Find something you love and place your first bid."
            action={<LinkButton href="/explore?type=AUCTION">Browse live auctions</LinkButton>}
          />
        ) : (
          list.map((r) => {
            const s = standing(r);
            return (
              <Link key={r.auctionId} href={`/auction/${r.auctionId}`} className="block">
                <Card className="flex items-center gap-4 p-4 transition-colors hover:border-line-strong">
                  <SafeImage src={r.imageUrl} alt="" className="size-16 rounded-xl sm:size-20" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={s.tone}>{s.label}</Badge>
                      {isAuctionOpen(r.status) && <Countdown endsAt={r.endsAt} className="text-xs text-muted" />}
                    </div>
                    <p className="mt-1 line-clamp-1 font-medium">{r.title}</p>
                    <p className="text-sm text-muted">
                      {r.bidCount} {r.bidCount === 1 ? 'bid' : 'bids'} · last {timeAgo(r.lastBidAt)}
                    </p>
                  </div>
                  <dl className="hidden shrink-0 text-right text-sm sm:block">
                    <dt className="text-muted">Your top bid</dt>
                    <dd className="tabular font-semibold">{formatINR(r.myTopBid)}</dd>
                    <dt className="mt-1 text-muted">Current</dt>
                    <dd className="tabular">{formatINR(r.current)}</dd>
                  </dl>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
