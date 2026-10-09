'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgeCheck, Gavel, Lock, Search, ShieldCheck, Timer, TrendingUp, Truck } from 'lucide-react';
import { Badge, ErrorState, LinkButton, SafeImage, Skeleton } from '../components/ui';
import { Countdown, ListingCard, ListingCardSkeleton, ListingGrid, SectionHeading } from '../components/marketplace';
import { useApi } from '../lib/use-api';
import { formatINR, formatNumber } from '../lib/format';
import { auctionToCardListing, isBiddable, toCardListing, type ApiAuctionSummary, type ApiCategory, type ApiListing } from '../lib/types';

interface HomeFeed {
  liveAuctions: Array<ApiAuctionSummary & { listing: ApiListing }>;
  endingSoonAuctions: Array<ApiAuctionSummary & { listing: ApiListing }>;
  featuredFixedPrice: ApiListing[];
  categories: ApiCategory[];
  stats: { totalUsers: number; activeListings: number; liveAuctions: number; totalBids: number };
}

const POPULAR = ['Rolex', 'Tanjore painting', 'Gold coins', 'Leica', 'Pashmina', 'Sneakers'];

function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(q.trim() ? `/explore?q=${encodeURIComponent(q.trim())}` : '/explore');
        }}
        className="flex items-center gap-2 rounded-2xl border border-line-strong bg-surface p-2 shadow-raised focus-within:border-ink"
      >
        <Search className="ml-2 size-5 shrink-0 text-muted" aria-hidden />
        <label htmlFor="hero-search" className="sr-only">
          Search the marketplace
        </label>
        <input
          id="hero-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What are you looking for?"
          className="h-11 min-w-0 flex-1 bg-transparent text-ink placeholder:text-muted/80 focus:outline-none"
        />
        <button type="submit" className="h-11 shrink-0 rounded-xl bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2">
          Search
        </button>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Popular:</span>
        {POPULAR.map((p) => (
          <Link key={p} href={`/explore?q=${encodeURIComponent(p)}`} className="rounded-full border border-line bg-surface px-3 py-1 text-ink-2 hover:border-line-strong hover:text-ink">
            {p}
          </Link>
        ))}
      </div>
    </div>
  );
}

function FeaturedAuction({ auction }: { auction?: HomeFeed['liveAuctions'][number] }) {
  if (!auction) {
    return <Skeleton className="aspect-[4/5] w-full rounded-3xl" />;
  }
  return (
    <Link href={`/auction/${auction.id}`} className="group relative block overflow-hidden rounded-3xl border border-line bg-surface shadow-overlay">
      <SafeImage src={auction.listing.images?.[0]?.imageUrl} alt={auction.listing.title} loading="eager" className="aspect-[4/5] w-full transition-transform duration-500 group-hover:scale-[1.02]" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <Badge tone="live" dot>Live now</Badge>
        <span className="rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          <Countdown endsAt={auction.scheduledEndAt} className="text-white" />
        </span>
      </div>
      <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-surface/95 p-4 backdrop-blur">
        <p className="text-xs text-muted">{auction.listing.category?.name || 'Featured auction'}</p>
        <p className="mt-0.5 line-clamp-1 font-medium text-ink">{auction.listing.title}</p>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-xs text-muted">Current bid</p>
            <p className="tabular text-xl font-semibold text-ink">{formatINR(auction.currentHighBidPaise || auction.startingBidPaise)}</p>
          </div>
          <span className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-medium text-white">
            Place bid <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { data, loading, error, reload } = useApi<HomeFeed>('/discovery/home');
  const live = (data?.liveAuctions || []).filter((a) => isBiddable(a.status, a.scheduledEndAt));
  const featured = live[0];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,rgb(254_243_199/0.7),transparent_70%)]" />
        <div className="container-page relative grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink-2">
              <span className="live-dot size-2 rounded-full bg-live" aria-hidden />
              {data ? `${formatNumber(data.stats.liveAuctions)} auctions live right now` : 'Live auctions, every day'}
            </div>
            <h1 className="mt-6 font-display text-[44px] leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Bid live.
              <br />
              <span className="italic text-accent">Own the rare.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
              Real-time auctions and a curated marketplace of verified Indian sellers — with refundable caution deposits and anti-sniping protection on every lot.
            </p>
            <div className="mt-8 max-w-xl">
              <HeroSearch />
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
              {[
                { label: 'Active listings', value: data?.stats.activeListings },
                { label: 'Bids placed', value: data?.stats.totalBids },
                { label: 'Members', value: data?.stats.totalUsers },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="text-sm text-muted">{s.label}</dt>
                  <dd className="tabular mt-1 text-2xl font-semibold tracking-tight text-ink">
                    {s.value === undefined ? <Skeleton className="h-7 w-16" /> : formatNumber(s.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            {error || (data && !featured) ? null : <FeaturedAuction auction={featured} />}
          </div>
        </div>
      </section>

      {error && (
        <div className="container-page py-12">
          <ErrorState message={error} onRetry={reload} />
        </div>
      )}

      {/* Categories */}
      {(loading || (data && data.categories.length > 0)) && (
        <section className="container-page pt-16 sm:pt-20">
          <SectionHeading
            title="Shop by category"
            action={<LinkButton href="/explore" variant="link" iconRight={ArrowRight}>All categories</LinkButton>}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)
              : data!.categories.map((c) => (
                  <Link key={c.id} href={`/category/${c.slug}`} className="group relative overflow-hidden rounded-2xl border border-line bg-surface">
                    <SafeImage src={c.imageUrl || undefined} alt="" className="aspect-square w-full transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" aria-hidden />
                    <span className="absolute inset-x-3 bottom-3 text-sm font-medium text-white">{c.name}</span>
                  </Link>
                ))}
          </div>
        </section>
      )}

      {/* Live auctions */}
      {(loading || live.length > 0) && (
        <section className="container-page pt-16 sm:pt-20">
          <SectionHeading
            title={
              <span className="flex items-center gap-3">
                Live auctions <Badge tone="live" dot>Live</Badge>
              </span>
            }
            description="Closing soonest first. Late bids extend the timer, so everyone gets a fair final call."
            action={<LinkButton href="/explore?type=AUCTION&sort=ending_soon" variant="secondary" size="sm" iconRight={ArrowRight}>View all</LinkButton>}
          />
          <ListingGrid>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)
              : live.slice(0, 8).map((a, i) => <ListingCard key={a.id} listing={auctionToCardListing(a)} priority={i < 4} />)}
          </ListingGrid>
        </section>
      )}

      {/* How it works */}
      <section className="container-page pt-20 sm:pt-28">
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-10 lg:p-14">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-accent">How bidding works</p>
            <h2 className="mt-2 font-display text-4xl tracking-tight text-ink sm:text-5xl">Fair auctions, by design.</h2>
          </div>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { icon: Lock, title: 'Place a refundable deposit', body: 'A small caution deposit unlocks bidding. Lose the auction and it is refunded in full; win and it is credited to your purchase.' },
              { icon: Timer, title: 'Bid in real time', body: 'Bids appear instantly for everyone. Any bid in the last five minutes extends the clock, so sniping never wins.' },
              { icon: Gavel, title: 'Win, pay, and track', body: 'Winners pay the balance within 24 hours. Every order ships with courier tracking from a verified seller.' },
            ].map(({ icon: Icon, title, body }, i) => (
              <li key={title}>
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-ink text-white">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="tabular text-sm font-medium text-muted">Step {i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Buy now */}
      {(loading || (data && data.featuredFixedPrice.length > 0)) && (
        <section className="container-page pt-20 sm:pt-28">
          <SectionHeading
            title="Buy it now"
            description="Most-viewed fixed-price pieces, ready to ship."
            action={<LinkButton href="/explore?type=FIXED_PRICE" variant="secondary" size="sm" iconRight={ArrowRight}>Shop all</LinkButton>}
          />
          <ListingGrid>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)
              : data!.featuredFixedPrice.map((l) => <ListingCard key={l.id} listing={toCardListing(l)} />)}
          </ListingGrid>
        </section>
      )}

      {/* Trust */}
      <section className="container-page pt-20 sm:pt-28">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BadgeCheck, title: 'KYC-verified sellers', body: 'Business, PAN and bank details checked before a seller can list.' },
            { icon: ShieldCheck, title: 'AI + human moderation', body: 'Every new listing is screened for prohibited and misleading items.' },
            { icon: TrendingUp, title: 'Transparent bidding', body: 'Full bid history on every lot, with bidder identities masked.' },
            { icon: Truck, title: 'Tracked shipping', body: 'Sellers add courier tracking the moment your order ships.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-line bg-surface p-6">
              <Icon className="size-6 text-accent" aria-hidden />
              <h3 className="mt-4 font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Seller CTA */}
      <section className="container-page pt-20 sm:pt-28">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-12 sm:px-12 sm:py-16">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-accent/30 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="text-sm font-medium text-amber-300">For sellers</p>
            <h2 className="mt-2 font-display text-4xl tracking-tight text-white sm:text-5xl">Turn your collection into a live event.</h2>
            <p className="mt-4 text-base leading-relaxed text-stone-300">
              List fixed-price stock or run timed auctions with deposits, reserves and anti-sniping built in. Our AI assistant writes your listing in seconds.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/seller/apply" variant="accent" size="lg" iconRight={ArrowRight}>Start selling</LinkButton>
              <LinkButton href="/help#selling" size="lg" className="bg-white/10 text-white hover:bg-white/15">
                How selling works
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
