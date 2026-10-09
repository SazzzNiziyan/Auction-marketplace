'use client';

import React, { useState } from 'react';
import { Check, ClipboardCheck, Sparkles, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, SafeImage, Skeleton } from '../../../components/ui';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { conditionLabel, formatINR, timeAgo } from '../../../lib/format';
import type { ApiListing } from '../../../lib/types';

interface QueueItem extends ApiListing {
  createdAt: string;
  seller: { id: string; email: string; profile?: { displayName?: string } | null };
  category: { name: string; slug: string };
  moderation: Array<{ id: string; decision: string; reason?: string | null; createdAt: string }>;
}

export default function AdminModerationPage() {
  const toast = useToast();
  const { data, setData, loading, error, reload } = useApi<QueueItem[]>('/admin/moderation');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const decide = async (item: QueueItem, decision: 'APPROVED' | 'REJECTED') => {
    const reason = reasons[item.id]?.trim();
    if (decision === 'REJECTED' && !reason) {
      toast.error('Add a reason', 'The seller sees why their listing was removed.');
      document.getElementById(`reason-${item.id}`)?.focus();
      return;
    }
    setBusy(`${item.id}:${decision}`);
    const res = await api.post(`/admin/moderation/${item.id}/decide`, { decision, reason });
    setBusy(null);
    if (res.success) {
      setData((d) => (d ? d.filter((x) => x.id !== item.id) : d));
      toast.success(decision === 'APPROVED' ? 'Listing published' : 'Listing removed', item.title);
    } else toast.error('Couldn’t record decision', res.message);
  };

  return (
    <div>
      <PageHeader title="Moderation queue" description="Listings flagged by automated screening or submitted for review." />
      <div className="mt-6 space-y-4">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)
        ) : !data || data.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Nothing to review" description="New listings that need a human check will appear here." />
        ) : (
          data.map((item) => {
            const flag = item.moderation.find((m) => m.decision === 'FLAGGED');
            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="grid gap-5 p-5 md:grid-cols-[200px_1fr]">
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
                    <SafeImage src={item.images?.[0]?.imageUrl} alt="" className="aspect-square w-full rounded-xl md:aspect-[4/3]" />
                    {item.images?.slice(1, 3).map((img, i) => (
                      <SafeImage key={i} src={img.imageUrl} alt="" className="aspect-square w-full rounded-xl md:hidden" />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{item.type === 'AUCTION' ? 'Auction' : 'Buy now'}</Badge>
                      <Badge>{item.category?.name}</Badge>
                      {item.condition && <Badge>{conditionLabel(item.condition)}</Badge>}
                      <span className="text-sm text-muted">{timeAgo(item.createdAt)}</span>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
                    <p className="text-sm text-muted">
                      by {item.seller.profile?.displayName || item.seller.email}
                      {item.priceInPaise ? ` · ${formatINR(item.priceInPaise)}` : ''}
                    </p>
                    {flag?.reason && (
                      <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                        <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
                        {flag.reason}
                      </p>
                    )}
                    <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm text-ink-2">{item.description}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-line bg-subtle/50 p-4 sm:flex-row sm:items-end">
                  <Input
                    id={`reason-${item.id}`}
                    label="Reason"
                    placeholder="Required to reject; optional to approve"
                    value={reasons[item.id] || ''}
                    onChange={(e) => setReasons((r) => ({ ...r, [item.id]: e.target.value }))}
                    wrapperClassName="flex-1"
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" icon={X} loading={busy === `${item.id}:REJECTED`} onClick={() => decide(item, 'REJECTED')}>Reject</Button>
                    <Button icon={Check} loading={busy === `${item.id}:APPROVED`} onClick={() => decide(item, 'APPROVED')}>Approve</Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
