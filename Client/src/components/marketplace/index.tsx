'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Gavel } from 'lucide-react';
import { Badge, SafeImage, Skeleton, type BadgeTone } from '../ui';
import { cn, conditionLabel, formatINR, humanize, timeRemaining } from '../../lib/format';
import { isAuctionOpen, isAwaitingClose, isBiddable, listingHref, type CardListing } from '../../lib/types';

/* ─── Countdown ────────────────────────────────────────────────────────────── */

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function Countdown({ endsAt, className, compact }: { endsAt?: string; className?: string; compact?: boolean }) {
  const now = useNow();
  const r = timeRemaining(endsAt, now);
  const urgent = !r.ended && r.totalMs < 5 * 60 * 1000;
  return (
    <span className={cn('tabular inline-flex items-center gap-1', urgent ? 'font-semibold text-live' : '', className)}>
      {!compact && <Clock className="size-3.5" aria-hidden />}
      <span>{r.ended ? 'Ended' : r.label}</span>
    </span>
  );
}

/* ─── Status badges ────────────────────────────────────────────────────────── */

const ORDER_TONES: Record<string, BadgeTone> = {
  PENDING_PAYMENT: 'warning',
  PAYMENT_CONFIRMED: 'info',
  PROCESSING: 'info',
  SHIPPED: 'accent',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  REFUND_REQUESTED: 'danger',
  REFUND_APPROVED: 'warning',
  REFUNDED: 'neutral',
};

const LISTING_TONES: Record<string, BadgeTone> = {
  DRAFT: 'neutral',
  PENDING_MODERATION: 'warning',
  ACTIVE: 'success',
  PAUSED: 'neutral',
  SOLD: 'info',
  UNSOLD: 'neutral',
  REMOVED: 'danger',
};

const AUCTION_TONES: Record<string, BadgeTone> = {
  SCHEDULED: 'info',
  DEPOSIT_OPEN: 'info',
  LIVE: 'live',
  CLOSING: 'live',
  ENDED: 'neutral',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  FAILED: 'neutral',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  PAYMENT_CONFIRMED: 'Paid',
  REFUND_REQUESTED: 'Refund requested',
  REFUND_APPROVED: 'Refund approved',
  PENDING_MODERATION: 'In review',
  CLOSING: 'Closing',
  FAILED: 'No sale',
  ADMIN_ESCALATED: 'Escalated',
};

export function StatusBadge({ status, kind = 'order', className }: { status?: string | null; kind?: 'order' | 'listing' | 'auction' | 'generic'; className?: string }) {
  if (!status) return null;
  const map = kind === 'order' ? ORDER_TONES : kind === 'listing' ? LISTING_TONES : kind === 'auction' ? AUCTION_TONES : {};
  const tone: BadgeTone =
    map[status] ||
    (status === 'APPROVED' || status === 'ACTIVE' ? 'success' : status === 'REJECTED' || status === 'SUSPENDED' ? 'danger' : status === 'PENDING' ? 'warning' : 'neutral');
  return (
    <Badge tone={tone} dot={kind === 'auction' && isAuctionOpen(status as never)} className={className}>
      {STATUS_LABELS[status] || humanize(status)}
    </Badge>
  );
}

/* ─── Listing card ─────────────────────────────────────────────────────────── */

export function ListingCard({ listing, priority }: { listing: CardListing; priority?: boolean }) {
  const isAuction = listing.type === 'AUCTION';
  const live = isAuction && isBiddable(listing.auctionStatus, listing.endsAt);
  const awaiting = isAuction && isAwaitingClose(listing.auctionStatus, listing.endsAt);
  return (
    <Link
      href={listingHref(listing)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-[box-shadow,border-color] duration-200 hover:border-line-strong hover:shadow-raised"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <SafeImage
          src={listing.imageUrl}
          alt={listing.title}
          loading={priority ? 'eager' : 'lazy'}
          className="size-full transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {isAuction ? (
            live ? (
              <Badge tone="live" dot>Live</Badge>
            ) : (
              <Badge tone="dark">{awaiting ? 'Bidding closed' : listing.auctionStatus === 'SCHEDULED' ? 'Upcoming' : 'Auction'}</Badge>
            )
          ) : (
            <Badge tone="dark">Buy now</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {listing.categoryName && <span className="truncate">{listing.categoryName}</span>}
          {listing.categoryName && listing.condition && <span aria-hidden>·</span>}
          {listing.condition && <span className="shrink-0">{conditionLabel(listing.condition)}</span>}
        </div>
        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-ink sm:text-[15px]">{listing.title}</h3>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-3 sm:pt-4">
          <div>
            <p className="text-xs text-muted">{isAuction ? (listing.bidCount ? 'Current bid' : 'Starting bid') : 'Price'}</p>
            <p className="tabular text-base font-semibold tracking-tight text-ink sm:text-lg">{formatINR(listing.pricePaise)}</p>
          </div>
          {isAuction && (
            <div className="text-right text-xs text-muted">
              {listing.bidCount !== undefined && (
                <p className="flex items-center justify-end gap-1">
                  <Gavel className="size-3.5" aria-hidden />
                  {listing.bidCount} {listing.bidCount === 1 ? 'bid' : 'bids'}
                </p>
              )}
              {live && <Countdown endsAt={listing.endsAt} className="mt-0.5 text-ink-2" />}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ListingGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4 sm:gap-5', className)}>{children}</div>;
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-4 h-6 w-28" />
      </div>
    </div>
  );
}

export function SectionHeading({ title, description, action, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {action}
    </div>
  );
}
