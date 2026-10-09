'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BadgeCheck, Bot, ChevronRight, Clock, Gavel, Heart, Info, Lock, ShieldCheck, Trophy, TrendingUp, Users } from 'lucide-react';
import { Alert, Avatar, Badge, Button, Card, CardHeader, ErrorState, Input, Modal, SafeImage, Skeleton } from '../../../components/ui';
import { StatusBadge, useNow } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../lib/toast';
import { useWatchToggle } from '../../../lib/watchlist';
import { getSocket } from '../../../lib/socket';
import { cn, conditionLabel, formatDateTime, formatINR, formatNumber, rupeesToPaise, timeAgo, timeRemaining } from '../../../lib/format';
import { isBiddable, sellerDisplayName, type ApiAuctionSummary, type ApiListing } from '../../../lib/types';

const MIN_INCREMENT_PAISE = 10000; // mirrors the backend rule (₹100)

interface BidRow {
  id: string;
  amountPaise: number;
  placedAt: string;
  bidderLabel: string;
  isAutoBid?: boolean;
  isMine?: boolean;
}

interface AuctionDetail extends ApiAuctionSummary {
  listing: ApiListing;
  bids: BidRow[];
  antiSnipExtensionMins?: number;
  _count: { participants: number; bids: number };
  userState: {
    hasPaidDeposit: boolean;
    depositStatus: string | null;
    autoBidMaxPaise: number | null;
    isSeller: boolean;
    isCurrentHighBidder: boolean;
  };
}

function TimerBlock({ endsAt, open }: { endsAt?: string; open: boolean }) {
  const now = useNow();
  const r = timeRemaining(endsAt, now);
  const urgent = open && !r.ended && r.totalMs < 5 * 60 * 1000;
  const units = r.days > 0 ? [[r.days, 'days'], [r.hours, 'hrs'], [r.minutes, 'min']] : [[r.hours, 'hrs'], [r.minutes, 'min'], [r.seconds, 'sec']];
  return (
    <div className={cn('rounded-2xl p-4', urgent ? 'bg-danger-soft' : 'bg-subtle')}>
      <p className={cn('flex items-center gap-1.5 text-sm', urgent ? 'font-medium text-danger' : 'text-muted')}>
        <Clock className="size-4" aria-hidden />
        {!open || r.ended ? 'Bidding closed' : urgent ? 'Closing — late bids extend the timer' : 'Time remaining'}
      </p>
      {open && !r.ended ? (
        <div className="mt-2 flex gap-4" role="timer" aria-live="off">
          {units.map(([v, l]) => (
            <div key={l as string}>
              <span className={cn('tabular text-3xl font-semibold tracking-tight', urgent ? 'text-danger' : 'text-ink')}>{String(v).padStart(2, '0')}</span>
              <span className="ml-1 text-sm text-muted">{l}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-ink-2">Ended {formatDateTime(endsAt)}</p>
      )}
    </div>
  );
}

export default function AuctionRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { user, ready } = useAuth();
  // Re-fetch once auth is known so userState reflects the signed-in bidder.
  const { data: auction, setData, error, reload } = useApi<AuctionDetail>(ready ? `/auctions/${id}` : null);
  const { watched, toggle: toggleWatch } = useWatchToggle(auction?.listing.id);

  const [bidRupees, setBidRupees] = useState('');
  const [busy, setBusy] = useState<'deposit' | 'bid' | 'auto' | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoMax, setAutoMax] = useState('');
  const [autoStep, setAutoStep] = useState('100');
  const [flash, setFlash] = useState(false);
  const [participants, setParticipants] = useState<number | null>(null);

  const open = auction ? isBiddable(auction.status, auction.scheduledEndAt) : false;
  const current = auction?.currentHighBidPaise || auction?.startingBidPaise || 0;
  const minNext = auction ? (auction.currentHighBidPaise ? auction.currentHighBidPaise + MIN_INCREMENT_PAISE : auction.startingBidPaise || 0) : 0;

  // Prefill the bid box with the minimum valid bid whenever the price moves.
  useEffect(() => {
    if (minNext) setBidRupees(String(minNext / 100));
  }, [minNext]);

  // Real-time room
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join:auction', id);
    if (user) socket.emit('join:user', user.id);

    const onBid = (e: { auctionId: string; amountPaise: number; placedAt: string; bidderLabel: string; totalBids: number; newEndAt: string }) => {
      if (e.auctionId !== id) return;
      setData((prev) =>
        prev
          ? {
              ...prev,
              currentHighBidPaise: e.amountPaise,
              bidCount: e.totalBids,
              scheduledEndAt: e.newEndAt || prev.scheduledEndAt,
              bids: [{ id: `live-${e.placedAt}-${e.amountPaise}`, amountPaise: e.amountPaise, placedAt: e.placedAt, bidderLabel: e.bidderLabel }, ...prev.bids].slice(0, 20),
            }
          : prev
      );
      setFlash(true);
      setTimeout(() => setFlash(false), 900);
    };
    const onExtended = (e: { auctionId: string; newEndAt: string }) => {
      if (e.auctionId !== id) return;
      setData((prev) => (prev ? { ...prev, scheduledEndAt: e.newEndAt, status: 'CLOSING' } : prev));
      toast.info('Timer extended', 'A late bid added time to the clock.');
    };
    const onOutbid = (e: { auctionId: string; newHighBidPaise: number }) => {
      if (e.auctionId !== id) return;
      toast.error('You’ve been outbid', `New high bid: ${formatINR(e.newHighBidPaise)}`);
      reload();
    };
    const onEnded = (e: { auctionId: string; status: string; reason?: string }) => {
      if (e.auctionId !== id) return;
      toast.info('Auction closed', e.reason || 'Bidding has ended for this lot.');
      reload();
    };
    const onWon = (e: { auctionId: string }) => {
      if (e.auctionId !== id) return;
      toast.success('You won this auction!', 'Complete payment from your orders within 24 hours.');
    };
    const onJoined = (e: { auctionId: string; participantCount: number }) => {
      if (e.auctionId === id) setParticipants(e.participantCount);
    };

    socket.on('BID_PLACED', onBid);
    socket.on('TIME_EXTENDED', onExtended);
    socket.on('OUTBID', onOutbid);
    socket.on('AUCTION_ENDED', onEnded);
    socket.on('AUCTION_WON', onWon);
    socket.on('PARTICIPANT_JOINED', onJoined);
    return () => {
      socket.emit('leave:auction', id);
      socket.off('BID_PLACED', onBid);
      socket.off('TIME_EXTENDED', onExtended);
      socket.off('OUTBID', onOutbid);
      socket.off('AUCTION_ENDED', onEnded);
      socket.off('AUCTION_WON', onWon);
      socket.off('PARTICIPANT_JOINED', onJoined);
    };
  }, [id, user, setData, reload, toast]);

  const quickBids = useMemo(() => {
    if (!minNext) return [];
    const step = current >= 10_000_000 ? 500_000 : current >= 1_000_000 ? 100_000 : MIN_INCREMENT_PAISE * 5;
    return [minNext, minNext + step, minNext + step * 3];
  }, [minNext, current]);

  if (error) {
    return (
      <div className="container-page py-16">
        <ErrorState message="This auction doesn’t exist or is no longer available." onRetry={reload} />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1.2fr_1fr]">
        <Skeleton className="aspect-[4/3] rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const { listing, userState } = auction;
  const requireLogin = () => router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);

  const payDeposit = async () => {
    setBusy('deposit');
    const res = await api.post<unknown>(`/auctions/${id}/deposit`, {});
    setBusy(null);
    setDepositOpen(false);
    if (res.success) {
      toast.success('Deposit confirmed', 'You can now place bids on this lot.');
      reload();
    } else toast.error('Deposit failed', res.message);
  };

  const placeBid = async (amountPaise: number) => {
    if (!user) return requireLogin();
    if (!userState.hasPaidDeposit) return setDepositOpen(true);
    if (amountPaise < minNext) {
      toast.error('Bid too low', `The minimum bid is ${formatINR(minNext)}.`);
      return;
    }
    setBusy('bid');
    const res = await api.post(`/auctions/${id}/bid`, { amountPaise });
    setBusy(null);
    if (res.success) {
      toast.success('Bid placed', `You’re the highest bidder at ${formatINR(amountPaise)}.`);
      reload();
    } else toast.error('Bid not accepted', res.message);
  };

  const saveAutoBid = async (e: React.FormEvent) => {
    e.preventDefault();
    const maxAmountPaise = rupeesToPaise(autoMax);
    const incrementPaise = Math.max(MIN_INCREMENT_PAISE, rupeesToPaise(autoStep));
    if (maxAmountPaise <= current) {
      toast.error('Maximum too low', `Set a maximum above ${formatINR(current)}.`);
      return;
    }
    setBusy('auto');
    const res = await api.post(`/auctions/${id}/autobid`, { maxAmountPaise, incrementPaise });
    setBusy(null);
    if (res.success) {
      setAutoOpen(false);
      toast.success('Auto-bid active', `We’ll bid for you up to ${formatINR(maxAmountPaise)}.`);
      reload();
    } else toast.error('Couldn’t save auto-bid', res.message);
  };

  const sellerName = sellerDisplayName(listing.seller);
  const ended = !open;
  const youWon = ended && !!user && auction.winnerId === user.id;

  return (
    <div className="container-page py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 overflow-hidden text-sm text-muted">
        <Link href="/explore?type=AUCTION" className="shrink-0 hover:text-ink">Auctions</Link>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
        <span className="truncate text-ink">{listing.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:grid-rows-[auto_1fr] lg:gap-x-12">
        {/* Media */}
        <div className="order-1 min-w-0 lg:order-none lg:col-start-1 lg:row-start-1">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-surface">
            <SafeImage src={listing.images?.[0]?.imageUrl} alt={listing.title} loading="eager" className="aspect-[4/3] w-full" />
            <div className="absolute left-4 top-4 flex gap-2">
              <StatusBadge kind="auction" status={auction.status} />
            </div>
            <button
              onClick={toggleWatch}
              aria-pressed={watched}
              aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
              className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-surface/90 shadow-card backdrop-blur hover:bg-surface"
            >
              <Heart className={cn('size-5', watched && 'fill-live text-live')} />
            </button>
          </div>
          {listing.images && listing.images.length > 1 && (
            <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
              {listing.images.slice(1, 6).map((img, i) => (
                <SafeImage key={i} src={img.imageUrl} alt="" className="size-20 shrink-0 rounded-xl border border-line" />
              ))}
            </div>
          )}
        </div>

        {/* Details — after the bid panel on mobile */}
        <div className="order-3 min-w-0 lg:order-none lg:col-start-1 lg:row-start-2">
          <div className="mt-8">
            <h2 className="text-xl font-semibold">About this lot</h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{listing.description}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Condition', value: conditionLabel(listing.condition) || '—' },
                { label: 'Category', value: listing.category?.name || '—' },
                { label: 'Starting bid', value: formatINR(auction.startingBidPaise) },
                { label: 'Reserve', value: auction.reservePricePaise ? (current >= auction.reservePricePaise ? 'Met' : 'Not yet met') : 'None' },
              ].map((d) => (
                <div key={d.label} className="rounded-xl border border-line bg-surface p-3">
                  <p className="text-xs text-muted">{d.label}</p>
                  <p className="mt-0.5 text-sm font-medium text-ink">{d.value}</p>
                </div>
              ))}
            </div>
          </div>

          {listing.seller?.id && (
            <Link href={`/store/${listing.seller.id}`} className="mt-8 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-line-strong">
              <Avatar name={sellerName} src={listing.seller.profile?.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-medium">
                  {sellerName}
                  {listing.seller.sellerProfile?.isVerified && <BadgeCheck className="size-4 text-info" aria-label="Verified seller" />}
                </p>
                <p className="text-sm text-muted">{formatNumber(listing.seller.sellerProfile?.totalSales)} sales · View storefront</p>
              </div>
              <ChevronRight className="size-5 text-muted" aria-hidden />
            </Link>
          )}
        </div>

        {/* Right: bidding panel */}
        <div className="order-2 min-w-0 lg:order-none lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <p className="text-sm text-muted">{listing.category?.name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{listing.title}</h1>

          <Card className="mt-5 p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted">{auction.bidCount ? (ended ? 'Winning bid' : 'Current bid') : 'Starting bid'}</p>
                <p className={cn('tabular mt-1 rounded-lg text-4xl font-semibold tracking-tight transition-colors duration-500', flash && 'bg-accent-soft text-accent-strong')} aria-live="polite">
                  {formatINR(current)}
                </p>
              </div>
              <div className="space-y-1 text-right text-sm text-muted">
                <p className="flex items-center justify-end gap-1.5"><TrendingUp className="size-4" aria-hidden />{formatNumber(auction.bidCount)} bids</p>
                {(participants ?? auction._count.participants) > 0 && (
                  <p className="flex items-center justify-end gap-1.5"><Users className="size-4" aria-hidden />{formatNumber(participants ?? auction._count.participants)} {(participants ?? auction._count.participants) === 1 ? 'bidder' : 'bidders'}</p>
                )}
              </div>
            </div>

            <div className="mt-5">
              <TimerBlock endsAt={auction.scheduledEndAt} open={open} />
            </div>

            {userState.isCurrentHighBidder && open && (
              <Alert tone="success" className="mt-4" title="You’re the highest bidder">
                We’ll notify you instantly if someone outbids you.
              </Alert>
            )}
            {youWon && (
              <Alert tone="success" className="mt-4" title="You won this auction" action={<Link href="/buyer/orders" className="text-sm font-medium underline">Pay now</Link>}>
                Your deposit has been credited. Complete payment within 24 hours.
              </Alert>
            )}
            {ended && !youWon && (
              <Alert tone="info" className="mt-4" title={auction.status === 'FAILED' ? 'Closed without a sale' : auction.status === 'CANCELLED' ? 'Auction cancelled' : 'Bidding has ended'}>
                {userState.depositStatus === 'REFUNDED' || userState.depositStatus === 'PAID' ? 'Your caution deposit is refunded to your original payment method.' : 'Browse other live lots to keep bidding.'}
              </Alert>
            )}

            {open && !userState.isSeller && (
              <>
                {user && !userState.hasPaidDeposit && (
                  <div className="mt-5 rounded-2xl border border-accent-line/60 bg-accent-soft/60 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-accent-strong">
                      <Lock className="size-4" aria-hidden /> Deposit required to bid
                    </p>
                    <p className="mt-1 text-sm text-ink-2">
                      Place a fully refundable {formatINR(auction.depositAmountPaise)} caution deposit. It’s credited to your purchase if you win.
                    </p>
                    <Button variant="accent" className="mt-3 w-full" icon={ShieldCheck} onClick={() => setDepositOpen(true)}>
                      Place deposit
                    </Button>
                  </div>
                )}

                <form
                  className="mt-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    placeBid(rupeesToPaise(bidRupees));
                  }}
                >
                  <Input
                    label="Your bid"
                    inputMode="decimal"
                    value={bidRupees}
                    onChange={(e) => setBidRupees(e.target.value.replace(/[^\d.]/g, ''))}
                    leading={<span className="text-sm font-medium">₹</span>}
                    hint={`Enter ${formatINR(minNext)} or more`}
                    className="tabular h-12 text-lg font-semibold"
                  />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {quickBids.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setBidRupees(String(amt / 100))}
                        className={cn(
                          'tabular h-10 rounded-lg border text-sm font-medium transition-colors',
                          rupeesToPaise(bidRupees) === amt ? 'border-ink bg-ink text-white' : 'border-line-strong hover:border-ink'
                        )}
                      >
                        {formatINR(amt)}
                      </button>
                    ))}
                  </div>
                  <Button type="submit" variant="primary" size="lg" icon={Gavel} loading={busy === 'bid'} className="mt-4 w-full">
                    {user ? `Place bid · ${formatINR(rupeesToPaise(bidRupees))}` : 'Sign in to bid'}
                  </Button>
                </form>

                {user && userState.hasPaidDeposit && (
                  <button onClick={() => setAutoOpen(true)} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-ink-2 hover:bg-subtle">
                    <Bot className="size-4" aria-hidden />
                    {userState.autoBidMaxPaise ? `Auto-bid on · up to ${formatINR(userState.autoBidMaxPaise)}` : 'Set up auto-bid'}
                  </button>
                )}
              </>
            )}

            {userState.isSeller && (
              <Alert tone="info" className="mt-5">You’re the seller of this lot, so bidding is disabled.</Alert>
            )}

            {userState.hasPaidDeposit && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-success">
                <ShieldCheck className="size-4" aria-hidden /> Deposit of {formatINR(auction.depositAmountPaise)} held
              </p>
            )}
          </Card>

          <Card className="mt-5">
            <CardHeader title="Bid history" description={`${formatNumber(auction._count.bids)} total · bidder names are masked`} />
            {auction.bids.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted">No bids yet — be the first.</p>
            ) : (
              <ol className="max-h-80 divide-y divide-line overflow-y-auto">
                {auction.bids.map((b, i) => (
                  <li key={b.id} className={cn('flex items-center justify-between gap-3 px-5 py-3 sm:px-6', i === 0 && 'bg-accent-soft/40')}>
                    <div className="flex min-w-0 items-center gap-3">
                      {i === 0 ? <Trophy className="size-4 shrink-0 text-accent" aria-label="Highest bid" /> : <span className="size-4 shrink-0" />}
                      <div className="min-w-0">
                        <p className={cn('truncate text-sm', b.isMine ? 'font-semibold text-ink' : 'text-ink-2')}>
                          {b.bidderLabel}
                          {b.isAutoBid && <Badge className="ml-2" tone="neutral">Auto</Badge>}
                        </p>
                        <p className="text-xs text-muted">{timeAgo(b.placedAt)}</p>
                      </div>
                    </div>
                    <p className="tabular text-sm font-semibold">{formatINR(b.amountPaise)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <div className="mt-5 flex gap-3 rounded-2xl bg-subtle p-4 text-sm text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <p>
              Minimum increment is {formatINR(MIN_INCREMENT_PAISE)}. Bids in the final {auction.antiSnipExtensionMins || 5} minutes extend the auction so everyone can respond.{' '}
              <Link href="/help#bidding" className="font-medium text-ink underline underline-offset-2">How bidding works</Link>
            </p>
          </div>
        </div>
      </div>

      <Modal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        title="Place your caution deposit"
        description="Required once per auction before your first bid."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDepositOpen(false)}>Cancel</Button>
            <Button variant="accent" loading={busy === 'deposit'} onClick={payDeposit}>
              Confirm {formatINR(auction.depositAmountPaise)} deposit
            </Button>
          </>
        }
      >
        <ul className="space-y-3 text-sm text-ink-2">
          <li className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-success" aria-hidden />Refunded in full if you don’t win.</li>
          <li className="flex gap-3"><Trophy className="size-5 shrink-0 text-accent" aria-hidden />Credited against the final price if you do.</li>
          <li className="flex gap-3"><Clock className="size-5 shrink-0 text-muted" aria-hidden />Forfeited only if you win and don’t pay within 24 hours.</li>
        </ul>
        <Alert tone="warning" className="mt-5">Payments run in test mode — no real money is charged.</Alert>
      </Modal>

      <Modal
        open={autoOpen}
        onClose={() => setAutoOpen(false)}
        title="Auto-bid"
        description="We’ll bid the minimum needed to keep you on top, up to your maximum."
      >
        <form onSubmit={saveAutoBid} className="space-y-4">
          <Input
            label="Your maximum"
            inputMode="decimal"
            required
            value={autoMax}
            onChange={(e) => setAutoMax(e.target.value.replace(/[^\d.]/g, ''))}
            leading={<span className="text-sm font-medium">₹</span>}
            hint={`Must be more than ${formatINR(current)}. Other bidders never see it.`}
          />
          <Input
            label="Bid increment"
            inputMode="decimal"
            value={autoStep}
            onChange={(e) => setAutoStep(e.target.value.replace(/[^\d.]/g, ''))}
            leading={<span className="text-sm font-medium">₹</span>}
            hint="Minimum ₹100"
          />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setAutoOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy === 'auto'} icon={Bot}>Activate auto-bid</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
