'use client';

import React, { useState } from 'react';
import { Check, ExternalLink, Scale, X } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Modal, PageHeader, Skeleton, Textarea } from '../../../components/ui';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { formatINR, timeAgo } from '../../../lib/format';
import type { ApiOrder } from '../../../lib/types';

type Dispute = ApiOrder & {
  buyer: { email: string; profile?: { displayName?: string } | null };
  seller: { email: string; profile?: { displayName?: string } | null };
};

export default function AdminDisputesPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Dispute[]>('/admin/disputes');
  const [selected, setSelected] = useState<{ order: Dispute; approve: boolean } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!selected || reason.trim().length < 5) return;
    setBusy(true);
    const res = await api.post(`/admin/disputes/${selected.order.id}/adjudicate`, { approve: selected.approve, reason: reason.trim() });
    setBusy(false);
    if (res.success) {
      toast.success(selected.approve ? 'Refund approved' : 'Request dismissed');
      setSelected(null);
      setReason('');
      reload();
    } else toast.error('Couldn’t record decision', res.message);
  };

  return (
    <div>
      <PageHeader title="Disputes" description="Return requests waiting for a platform decision." />
      <div className="mt-6 space-y-4">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Scale} title="No open disputes" description="Return requests from buyers appear here for review." />
        ) : (
          data.map((o) => (
            <Card key={o.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="tabular text-sm text-muted">Order #{o.id.slice(0, 8).toUpperCase()} · requested {timeAgo(o.updatedAt || o.createdAt)}</p>
                  <p className="mt-1 font-semibold">{o.items[0]?.snapshotTitle}{o.items.length > 1 ? ` + ${o.items.length - 1} more` : ''}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Buyer {o.buyer.profile?.displayName || o.buyer.email} → Seller {o.seller.profile?.displayName || o.seller.email}
                  </p>
                </div>
                <p className="tabular text-lg font-semibold">{formatINR(o.totalPaise)}</p>
              </div>
              <div className="mt-4 rounded-xl bg-subtle p-4">
                <p className="text-sm font-medium">Buyer’s reason</p>
                <p className="mt-1 text-sm text-ink-2">{o.refundReason || 'No reason provided.'}</p>
                {o.refundEvidenceUrl && (
                  <a href={o.refundEvidenceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline">
                    View evidence <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
              </div>
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" icon={X} onClick={() => setSelected({ order: o, approve: false })}>Dismiss</Button>
                <Button icon={Check} onClick={() => setSelected({ order: o, approve: true })}>Approve refund</Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.approve ? 'Approve refund' : 'Dismiss request'}
        description={selected ? `${formatINR(selected.order.totalPaise)} · ${selected.order.items[0]?.snapshotTitle}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
            <Button variant={selected?.approve ? 'primary' : 'danger'} loading={busy} disabled={reason.trim().length < 5} onClick={submit}>
              {selected?.approve ? 'Approve refund' : 'Dismiss request'}
            </Button>
          </>
        }
      >
        <Textarea label="Decision note" required rows={4} value={reason} onChange={(e) => setReason(e.target.value)} hint="Recorded in the order history and audit log." />
      </Modal>
    </div>
  );
}
