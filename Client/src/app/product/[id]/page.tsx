'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, ChevronRight, Eye, Gavel, Heart, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Star, Truck, Zap } from 'lucide-react';
import { Alert, Avatar, Badge, Button, Card, DescriptionList, ErrorState, LinkButton, SafeImage, Skeleton } from '../../../components/ui';
import { Countdown, ListingCard, ListingGrid, SectionHeading, StatusBadge } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { useAuth } from '../../../lib/auth';
import { useCart } from '../../../lib/cart';
import { useToast } from '../../../lib/toast';
import { useWatchToggle } from '../../../lib/watchlist';
import { cn, conditionLabel, formatDate, formatINR, formatNumber } from '../../../lib/format';
import { isAuctionOpen, sellerDisplayName, toCardListing, type ApiListing, type Paginated } from '../../../lib/types';

function Gallery({ listing }: { listing: ApiListing }) {
  const images = listing.images?.length ? listing.images : [{ imageUrl: '' }];
  const [active, setActive] = useState(0);
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto sm:w-20 sm:flex-col">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-pressed={active === i}
              className={cn('size-16 shrink-0 overflow-hidden rounded-xl border-2 sm:size-20', active === i ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100')}
            >
              <SafeImage src={img.imageUrl} alt="" className="size-full" />
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-hidden rounded-3xl border border-line bg-surface sm:self-start">
        <SafeImage src={images[active]?.imageUrl} alt={images[active]?.altText || listing.title} loading="eager" className="aspect-square w-full" />
      </div>
    </div>
  );
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const { data: listing, loading, error, reload } = useApi<ApiListing>(`/catalog/listings/${id}`);
  const { watched, busy: watchBusy, toggle: toggleWatch } = useWatchToggle(listing?.id);
  const related = useApi<Paginated<ApiListing>>(listing?.category ? `/discovery/search?category=${listing.category.slug}&limit=5` : null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState<'cart' | 'buy' | null>(null);

  if (error) {
    return (
      <div className="container-page py-16">
        <ErrorState message="This listing doesn’t exist or has been removed." onRetry={reload} />
      </div>
    );
  }

  if (loading || !listing) {
    return (
      <div className="container-page grid gap-10 py-10 lg:grid-cols-2">
        <Skeleton className="aspect-square rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="mt-8 h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const isAuction = listing.type === 'AUCTION';
  const auction = listing.auction;
  const stock = listing.stockQuantity ?? 0;
  const isOwnListing = user?.id === listing.seller?.id;
  const purchasable = !isAuction && listing.status === 'ACTIVE' && stock > 0 && !isOwnListing;
  const sellerName = sellerDisplayName(listing.seller);

  const addToCart = async (mode: 'cart' | 'buy') => {
    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(`/product/${id}`)}`);
      return;
    }
    setAdding(mode);
    const res = await cart.add(listing.id, qty);
    setAdding(null);
    if (!res.ok) {
      toast.error('Couldn’t add to cart', res.message);
      return;
    }
    if (mode === 'buy') router.push('/checkout');
    else toast.success('Added to cart', `${qty} × ${listing.title}`);
  };

  const relatedItems = (related.data?.items || []).filter((l) => l.id !== listing.id).slice(0, 4);

  return (
    <div className="container-page py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 overflow-hidden text-sm text-muted">
        <Link href="/" className="shrink-0 hover:text-ink">Home</Link>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
        {listing.category && (
          <>
            <Link href={`/category/${listing.category.slug}`} className="shrink-0 hover:text-ink">{listing.category.name}</Link>
            <ChevronRight className="size-4 shrink-0" aria-hidden />
          </>
        )}
        <span className="truncate text-ink">{listing.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <Gallery listing={listing} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {isAuction ? <Badge tone="accent">Auction</Badge> : <Badge>Buy it now</Badge>}
            {listing.condition && <Badge>{conditionLabel(listing.condition)}</Badge>}
            {listing.status && listing.status !== 'ACTIVE' && <StatusBadge kind="listing" status={listing.status} />}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{listing.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <Eye className="size-4" aria-hidden /> {formatNumber(listing.viewCount)} views
            {listing.createdAt && <span aria-hidden>·</span>}
            {listing.createdAt && <span>Listed {formatDate(listing.createdAt)}</span>}
          </p>

          <Card className="mt-6 p-5 sm:p-6">
            {isAuction && auction ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted">{auction.bidCount ? 'Current bid' : 'Starting bid'}</p>
                    <p className="tabular mt-1 text-3xl font-semibold tracking-tight">{formatINR(auction.currentHighBidPaise || auction.startingBidPaise)}</p>
                    <p className="mt-1 text-sm text-muted">{auction.bidCount || 0} bids</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge kind="auction" status={auction.status} />
                    {isAuctionOpen(auction.status) && <Countdown endsAt={auction.scheduledEndAt} className="mt-2 block text-sm text-ink" />}
                  </div>
                </div>
                <LinkButton href={`/auction/${auction.id}`} variant="accent" size="lg" icon={Gavel} className="mt-6 w-full">
                  {isAuctionOpen(auction.status) ? 'Enter auction room' : 'View auction results'}
                </LinkButton>
                <p className="mt-3 text-center text-sm text-muted">
                  Refundable caution deposit: <span className="font-medium text-ink">{formatINR(auction.depositAmountPaise)}</span>
                </p>
              </>
            ) : (
              <>
                <p className="tabular text-3xl font-semibold tracking-tight">{formatINR(listing.priceInPaise)}</p>
                <p className={cn('mt-1 text-sm', stock > 0 ? 'text-success' : 'text-danger')}>
                  {stock > 0 ? (stock <= 3 ? `Only ${stock} left in stock` : 'In stock') : 'Sold out'}
                </p>

                {purchasable && (
                  <div className="mt-6 flex items-center gap-3">
                    <span className="text-sm font-medium" id="qty-label">Quantity</span>
                    <div className="flex items-center rounded-lg border border-line-strong" role="group" aria-labelledby="qty-label">
                      <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="flex size-10 items-center justify-center disabled:opacity-40" aria-label="Decrease quantity">
                        <Minus className="size-4" />
                      </button>
                      <span className="tabular w-10 text-center text-sm font-medium" aria-live="polite">{qty}</span>
                      <button onClick={() => setQty((q) => Math.min(stock, q + 1))} disabled={qty >= stock} className="flex size-10 items-center justify-center disabled:opacity-40" aria-label="Increase quantity">
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                )}

                {isOwnListing ? (
                  <Alert tone="info" className="mt-6">This is your listing. <Link href={`/seller/listings/${listing.id}/edit`} className="font-medium underline">Edit it in the seller hub</Link>.</Alert>
                ) : (
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    <Button size="lg" variant="accent" icon={Zap} disabled={!purchasable} loading={adding === 'buy'} onClick={() => addToCart('buy')}>
                      Buy now
                    </Button>
                    <Button size="lg" variant="secondary" icon={ShoppingBag} disabled={!purchasable} loading={adding === 'cart'} onClick={() => addToCart('cart')}>
                      Add to cart
                    </Button>
                  </div>
                )}
              </>
            )}

            <button
              onClick={toggleWatch}
              disabled={watchBusy}
              aria-pressed={watched}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-ink-2 hover:bg-subtle"
            >
              <Heart className={cn('size-4', watched && 'fill-live text-live')} aria-hidden />
              {watched ? 'Saved to watchlist' : 'Add to watchlist'}
            </button>
          </Card>

          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex gap-3">
              <Truck className="size-5 shrink-0 text-muted" aria-hidden />
              <span className="text-ink-2">{listing.shippingNote || 'Ships with courier tracking. ₹99 shipping per seller at checkout.'}</span>
            </li>
            <li className="flex gap-3">
              <RotateCcw className="size-5 shrink-0 text-muted" aria-hidden />
              <span className="text-ink-2">Request a return within 7 days of delivery if the item isn’t as described.</span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="size-5 shrink-0 text-muted" aria-hidden />
              <span className="text-ink-2">Payments are protected and released after delivery.</span>
            </li>
          </ul>

          {listing.seller?.id && (
            <Link href={`/store/${listing.seller.id}`} className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
              <Avatar name={sellerName} src={listing.seller.profile?.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                  {sellerName}
                  {listing.seller.sellerProfile?.isVerified && <BadgeCheck className="size-4 shrink-0 text-info" aria-label="Verified seller" />}
                </p>
                <p className="flex items-center gap-1 text-sm text-muted">
                  <Star className="size-3.5 fill-accent text-accent" aria-hidden />
                  {Number(listing.seller.sellerProfile?.avgRating || 0).toFixed(1)}
                  <span aria-hidden>·</span>
                  {formatNumber(listing.seller.sellerProfile?.totalSales)} sales
                  {listing.seller.profile?.city && <span className="truncate"> · {listing.seller.profile.city}</span>}
                </p>
              </div>
              <ChevronRight className="size-5 text-muted" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <section>
          <h2 className="text-xl font-semibold">Description</h2>
          <div className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{listing.description}</div>
          {listing.tags && listing.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {listing.tags.map((t) => (
                <Link key={t} href={`/explore?q=${encodeURIComponent(t)}`} className="rounded-full bg-subtle px-3 py-1 text-sm text-ink-2 hover:bg-line">
                  #{t}
                </Link>
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="text-xl font-semibold">Details</h2>
          <DescriptionList
            className="mt-2"
            items={[
              { label: 'Format', value: isAuction ? 'Timed auction' : 'Fixed price' },
              { label: 'Condition', value: conditionLabel(listing.condition) || '—' },
              { label: 'Category', value: listing.category?.name || '—' },
              ...(isAuction && auction
                ? [
                    { label: 'Starting bid', value: formatINR(auction.startingBidPaise) },
                    { label: 'Reserve', value: auction.reservePricePaise ? 'Set by seller' : 'No reserve' },
                    { label: 'Anti-sniping', value: 'Extends on late bids' },
                  ]
                : [{ label: 'Available', value: `${stock} in stock` }]),
            ]}
          />
        </section>
      </div>

      {relatedItems.length > 0 && (
        <section className="mt-16">
          <SectionHeading title={`More in ${listing.category?.name}`} />
          <ListingGrid>
            {relatedItems.map((l) => (
              <ListingCard key={l.id} listing={toCardListing(l)} />
            ))}
          </ListingGrid>
        </section>
      )}
    </div>
  );
}
