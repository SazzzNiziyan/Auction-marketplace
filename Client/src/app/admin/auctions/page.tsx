'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Ban, Gavel, Hammer, RefreshCw } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Modal, PageHeader, Skeleton, Textarea } from '../../../components/ui';
import { Countdown, StatusBadge } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { formatINR, formatNumber, timeRemaining } from '../../../lib/format';
import type { ApiAuctionSummary } from '../../../lib/types';

interface LiveAuction extends ApiAuctionSummary {
  listing: { id: string; title: string; seller: { email: string; profile?: { displayName?: string } | null } };
  _count: { bids: number; participants: number };
}

export default function AdminAuctionsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<LiveAuction[]>('/admin/auctions/live');
  const [action, setAction] = useState<{ auction: LiveAuction; kind: 'cancel' | 'close' } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!action) return;
    setBusy(true);
    const res =
      action.kind === 'cancel'
        ? await api.post(`/admin/auctions/${action.auction.id}/cancel`, { reason: reason.trim() })
        : await api.post<{ message: string }>(`/auctions/${action.auction.id}/close`);
    setBusy(false);
    if (res.success) {
      toast.success(action.kind === 'cancel' ? 'Auction cancelled' : 'Auction closed', action.kind === 'cancel' ? 'All deposits are marked for refund.' : undefined);
      setAction(null);
      setReason('');
      reload();
    } else toast.error('Action failed', res.message);
  };

  const overdue = (data || []).filter((a) => timeRemaining(a.scheduledEndAt).ended);

  return (
    <div>
      <PageHeader
        title="Auctions"
        description="Monitor live and scheduled lots. Close auctions whose timer has run out, or cancel one in an emergency."
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={reload}>Refresh</Button>}
      />

      {overdue.length > 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-accent-line/60 bg-accent-soft/50 p-4 text-sm">
          <Hammer className="size-5 shrink-0 text-accent" aria-hidden />
          <p className="flex-1">
            <span className="font-semibold">{overdue.length} {overdue.length === 1 ? 'auction has' : 'auctions have'} passed the end time</span> and {overdue.length === 1 ? 'is' : 'are'} waiting to be closed so the winner can pay.
          </p>
        </div>
      )}

      <Card className="mt-6 overflow-hidden">
        {error ? (
          <ErrorState className="m-5 border-0" message={error} onRetry={reload} />
        ) : loading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState className="m-5 border-0" icon={Gavel} title="No live auctions" description="Live and scheduled auctions will show here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th scope="col" className="px-5 py-3 font-medium">Lot</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Current</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Bids</th>
                  <th scope="col" className="px-3 py-3 font-medium">Time left</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.map((a) => {
                  const ended = timeRemaining(a.scheduledEndAt).ended;
                  return (
                    <tr key={a.id} className="hover:bg-subtle/60">
                      <td className="px-5 py-3">
                        <Link href={`/auction/${a.id}`} className="block max-w-[280px] truncate font-medium hover:underline">{a.listing.title}</Link>
                        <p className="truncate text-xs text-muted">{a.listing.seller.profile?.displayName || a.listing.seller.email}</p>
                      </td>
                      <td className="px-3 py-3"><StatusBadge kind="auction" status={a.status} /></td>
                      <td className="tabular px-3 py-3 text-right font-medium">{formatINR(a.currentHighBidPaise || a.startingBidPaise)}</td>
                      <td className="tabular px-3 py-3 text-right">{formatNumber(a._count.bids)} <span className="text-muted">/ {a._count.participants} bidders</span></td>
                      <td className="px-3 py-3">{ended ? <span className="font-medium text-accent">Ready to close</span> : <Countdown endsAt={a.scheduledEndAt} />}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant={ended ? 'primary' : 'secondary'} icon={Hammer} onClick={() => setAction({ auction: a, kind: 'close' })}>Close</Button>
                          <Button size="sm" variant="ghost" icon={Ban} className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setAction({ auction: a, kind: 'cancel' })}>Cancel</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={action?.kind === 'cancel' ? 'Emergency cancel' : 'Close auction now'}
        description={action?.auction.listing.title}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)}>Back</Button>
            <Button
              variant={action?.kind === 'cancel' ? 'danger' : 'primary'}
              loading={busy}
              disabled={action?.kind === 'cancel' && reason.trim().length < 5}
              onClick={run}
            >
              {action?.kind === 'cancel' ? 'Cancel auction' : 'Close and declare result'}
            </Button>
          </>
        }
      >
        {action?.kind === 'cancel' ? (
          <Textarea label="Reason" required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} hint="Shown to everyone in the auction room and recorded in the audit log." />
        ) : (
          <p className="text-sm text-ink-2">
            The highest bidder wins if the reserve is met and an order is created for them. Otherwise the lot closes without a sale. All other deposits are released.
            {action && !timeRemaining(action.auction.scheduledEndAt).ended && <span className="mt-2 block font-medium text-danger">This auction still has time left.</span>}
          </p>
        )}
      </Modal>
    </div>
  );
}
