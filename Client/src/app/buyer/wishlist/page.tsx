'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Trash2 } from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, LinkButton, PageHeader, SafeImage, Skeleton } from '../../../components/ui';
import { Countdown } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { formatINR } from '../../../lib/format';
import { isAuctionOpen, type ApiListing, type Paginated } from '../../../lib/types';

interface WatchItem {
  id: string;
  listing: ApiListing;
}

export default function WatchlistPage() {
  const toast = useToast();
  const { data, setData, loading, error, reload } = useApi<Paginated<WatchItem>>('/users/me/watchlist?limit=50');

  const remove = async (listingId: string) => {
    const prev = data;
    setData((d) => (d ? { ...d, items: d.items.filter((i) => i.listing.id !== listingId), total: d.total - 1 } : d));
    const res = await api.del(`/users/me/watchlist/${listingId}`);
    if (!res.success) {
      setData(prev);
      toast.error('Couldn’t remove item', res.message);
    }
  };

  return (
    <div>
      <PageHeader title="Watchlist" description="Items and auctions you’re keeping an eye on." />
      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={Heart} title="Your watchlist is empty" description="Tap the heart on any listing to save it here." action={<LinkButton href="/explore">Explore listings</LinkButton>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map(({ id, listing: l }) => {
              const auction = l.auction;
              const href = l.type === 'AUCTION' && auction ? `/auction/${auction.id}` : `/product/${l.id}`;
              const live = auction && isAuctionOpen(auction.status);
              return (
                <Card key={id} className="group overflow-hidden">
                  <Link href={href} className="block">
                    <div className="relative">
                      <SafeImage src={l.images?.[0]?.imageUrl} alt={l.title} className="aspect-[4/3] w-full" />
                      <div className="absolute left-3 top-3">
                        {l.status !== 'ACTIVE' ? <Badge tone="dark">No longer available</Badge> : live ? <Badge tone="live" dot>Live</Badge> : l.type === 'AUCTION' ? <Badge tone="dark">Auction</Badge> : null}
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="line-clamp-1 font-medium">{l.title}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="tabular font-semibold">{formatINR(l.type === 'AUCTION' ? auction?.currentHighBidPaise : l.priceInPaise)}</p>
                        {live && <Countdown endsAt={auction!.scheduledEndAt} className="text-sm text-muted" />}
                      </div>
                    </div>
                  </Link>
                  <div className="border-t border-line px-4 py-2">
                    <button onClick={() => remove(l.id)} className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted hover:bg-danger-soft hover:text-danger">
                      <Trash2 className="size-4" aria-hidden /> Remove
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
