'use client';

import React, { use, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BadgeCheck, CalendarDays, MapPin, PackageOpen, Star, UserCheck, UserPlus } from 'lucide-react';
import { Avatar, Button, Card, EmptyState, ErrorState, Skeleton, Tabs } from '../../../components/ui';
import { ListingCard, ListingGrid } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../lib/toast';
import { formatDate, formatNumber, timeAgo } from '../../../lib/format';
import { toCardListing, type ApiListing } from '../../../lib/types';

interface Storefront {
  id: string;
  createdAt: string;
  profile?: { displayName?: string; avatarUrl?: string | null; bio?: string | null; city?: string | null; state?: string | null };
  sellerProfile: {
    businessName: string;
    isVerified: boolean;
    avgRating: string | number;
    totalRatings: number;
    totalSales: number;
    returnPolicy?: string | null;
    shippingPolicy?: string | null;
  };
  listings: ApiListing[];
  reviewsReceived: Array<{ id: string; rating: number; title?: string | null; body?: string | null; createdAt: string; reviewer?: { profile?: { displayName?: string; avatarUrl?: string | null } } }>;
  _count: { sellerFollowers: number; listings: number };
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={i <= Math.round(rating) ? 'size-4 fill-accent text-accent' : 'size-4 text-line-strong'} aria-hidden />
      ))}
    </span>
  );
}

export default function StorefrontPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const toast = useToast();
  const { data: store, setData, loading, error, reload } = useApi<Storefront>(`/seller/storefront/${sellerId}`);
  const [tab, setTab] = useState<'all' | 'AUCTION' | 'FIXED_PRICE' | 'reviews' | 'policies'>('all');
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<Array<{ seller: { id: string } }>>('/users/me/following').then((res) => {
      if (res.success && res.data) setFollowing(res.data.some((f) => f.seller.id === sellerId));
    });
  }, [user, sellerId]);

  const toggleFollow = async () => {
    if (!user) return router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
    setFollowBusy(true);
    const res = following ? await api.del(`/seller/follow/${sellerId}`) : await api.post(`/seller/follow/${sellerId}`);
    setFollowBusy(false);
    if (!res.success) return toast.error('Couldn’t update follow', res.message);
    setFollowing(!following);
    setData((s) => (s ? { ...s, _count: { ...s._count, sellerFollowers: s._count.sellerFollowers + (following ? -1 : 1) } } : s));
  };

  if (error) {
    return (
      <div className="container-page py-16">
        <ErrorState message="This storefront doesn’t exist or isn’t public yet." onRetry={reload} />
      </div>
    );
  }

  if (loading || !store) {
    return (
      <div className="container-page py-10">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const name = store.sellerProfile.businessName || store.profile?.displayName || 'Seller';
  const rating = Number(store.sellerProfile.avgRating || 0);
  const location = [store.profile?.city, store.profile?.state].filter(Boolean).join(', ');
  const listings = tab === 'AUCTION' || tab === 'FIXED_PRICE' ? store.listings.filter((l) => l.type === tab) : store.listings;

  return (
    <div className="container-page py-8 sm:py-10">
      <Card className="overflow-hidden">
        <div className="h-28 bg-[linear-gradient(120deg,#1c1917,#44403c_60%,#92400e)] sm:h-36" aria-hidden />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Avatar name={name} src={store.profile?.avatarUrl} size="lg" className="size-20 border-4 border-surface text-2xl sm:size-24" />
              <div className="pb-1">
                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                  {name}
                  {store.sellerProfile.isVerified && <BadgeCheck className="size-5 text-info" aria-label="Verified seller" />}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  {location && <span className="flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{location}</span>}
                  <span className="flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden />Since {formatDate(store.createdAt, { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
            {user?.id !== sellerId && (
              <Button variant={following ? 'secondary' : 'primary'} icon={following ? UserCheck : UserPlus} loading={followBusy} onClick={toggleFollow}>
                {following ? 'Following' : 'Follow store'}
              </Button>
            )}
          </div>
          {store.profile?.bio && <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-2">{store.profile.bio}</p>}
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-4">
            {[
              { label: 'Rating', value: rating ? `${rating.toFixed(1)} (${store.sellerProfile.totalRatings})` : 'New seller' },
              { label: 'Sales', value: formatNumber(store.sellerProfile.totalSales) },
              { label: 'Active listings', value: formatNumber(store._count.listings) },
              { label: 'Followers', value: formatNumber(store._count.sellerFollowers) },
            ].map((s) => (
              <div key={s.label}>
                <dt className="text-sm text-muted">{s.label}</dt>
                <dd className="tabular mt-0.5 text-lg font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <Tabs
        className="mt-8"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'all', label: 'All items', count: store.listings.length },
          { value: 'AUCTION', label: 'Auctions', count: store.listings.filter((l) => l.type === 'AUCTION').length },
          { value: 'FIXED_PRICE', label: 'Buy now', count: store.listings.filter((l) => l.type === 'FIXED_PRICE').length },
          { value: 'reviews', label: 'Reviews', count: store.reviewsReceived.length },
          { value: 'policies', label: 'Policies' },
        ]}
      />

      <div className="mt-6">
        {tab === 'reviews' ? (
          store.reviewsReceived.length === 0 ? (
            <EmptyState icon={Star} title="No reviews yet" description="Reviews appear here after buyers receive their orders." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {store.reviewsReceived.map((r) => (
                <Card key={r.id} className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.reviewer?.profile?.displayName} src={r.reviewer?.profile?.avatarUrl} size="sm" />
                      <span className="text-sm font-medium">{r.reviewer?.profile?.displayName || 'Buyer'}</span>
                    </div>
                    <span className="text-xs text-muted">{timeAgo(r.createdAt)}</span>
                  </div>
                  <div className="mt-3"><Stars rating={r.rating} /></div>
                  {r.title && <p className="mt-2 font-medium">{r.title}</p>}
                  {r.body && <p className="mt-1 text-sm leading-relaxed text-ink-2">{r.body}</p>}
                </Card>
              ))}
            </div>
          )
        ) : tab === 'policies' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <h2 className="font-semibold">Returns</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">{store.sellerProfile.returnPolicy || 'Returns accepted within 7 days of delivery for items not as described, under the Auctio buyer protection policy.'}</p>
            </Card>
            <Card className="p-6">
              <h2 className="font-semibold">Shipping</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">{store.sellerProfile.shippingPolicy || 'Orders ship with courier tracking. Tracking details are added to your order as soon as it is dispatched.'}</p>
            </Card>
          </div>
        ) : listings.length === 0 ? (
          <EmptyState icon={PackageOpen} title="Nothing listed here yet" description="Follow the store to hear when new items go live." />
        ) : (
          <ListingGrid>
            {listings.map((l) => (
              <ListingCard key={l.id} listing={toCardListing(l)} />
            ))}
          </ListingGrid>
        )}
      </div>
    </div>
  );
}
