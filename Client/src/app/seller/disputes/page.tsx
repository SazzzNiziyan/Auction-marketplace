'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Scale } from 'lucide-react';
import { Alert, Button, Card, EmptyState, ErrorState, Modal, PageHeader, SafeImage, Skeleton, Textarea } from '../../../components/ui';
import { StatusBadge } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { formatDate, formatINR } from '../../../lib/format';
import type { ApiOrder } from '../../../lib/types';

interface RefundRequest {
  id: string;
  status: string;
  reason?: string;
  sellerResponse?: string | null;
  createdAt: string;
  order: ApiOrder;
}

const RETURN_STATUSES = ['REFUND_REQUESTED', 'REFUND_APPROVED', 'REFUNDED'];

export default function SellerDisputesPage() {
  const toast = useToast();
  const orders = useApi<ApiOrder[]>('/commerce/orders/seller');
  const requests = useApi<RefundRequest[]>('/seller/disputes');
  const [responding, setResponding] = useState<RefundRequest | null>(null);
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState<'accept' | 'escalate' | null>(null);

  const returns = (orders.data || []).filter((o) => RETURN_STATUSES.includes(o.status));
  const openRequests = (requests.data || []).filter((r) => r.status === 'PENDING');

  const respond = async (acceptRefund: boolean) => {
    if (!responding || response.trim().length < 5) return;
    setBusy(acceptRefund ? 'accept' : 'escalate');
    const res = await api.post<unknown>(`/seller/disputes/${responding.id}/respond`, { response: response.trim(), acceptRefund });
    setBusy(null);
    if (res.success) {
      toast.success(acceptRefund ? 'Refund accepted' : 'Response sent to Auctio');
      setResponding(null);
      setResponse('');
      requests.reload();
    } else toast.error('Couldn’t send response', res.message);
  };

  const loading = orders.loading || requests.loading;
  const error = orders.error;

  return (
    <div>
      <PageHeader title="Returns & disputes" description="Buyers can request a return within 7 days of delivery. Unresolved cases are decided by Auctio." />

      {openRequests.length > 0 && (
        <section className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold">Waiting for your response</h2>
          {openRequests.map((r) => (
            <Card key={r.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.order.items[0]?.snapshotTitle}</p>
                <p className="mt-1 text-sm text-ink-2">“{r.reason}”</p>
              </div>
              <Button onClick={() => setResponding(r)}>Respond</Button>
            </Card>
          ))}
        </section>
      )}

      <div className="mt-6 space-y-4">
        {error ? (
          <ErrorState message={error} onRetry={orders.reload} />
        ) : loading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
        ) : returns.length === 0 && openRequests.length === 0 ? (
          <EmptyState icon={Scale} title="No returns or disputes" description="When a buyer requests a return, it shows up here with their reason and evidence." />
        ) : (
          returns.map((o) => (
            <Card key={o.id} className="p-5">
              <div className="flex items-start gap-4">
                <SafeImage src={o.items[0]?.snapshotImageUrl} alt="" className="size-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={o.status} />
                    <Link href={`/seller/fulfillment/${o.id}`} className="tabular text-sm text-muted hover:underline">
                      #{o.id.slice(0, 8).toUpperCase()}
                    </Link>
                    <span className="text-sm text-muted">· {formatDate(o.updatedAt || o.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 font-medium">{o.items[0]?.snapshotTitle}</p>
                  <p className="text-sm text-muted">{o.buyer?.profile?.displayName || 'Buyer'} · {formatINR(o.totalPaise)}</p>
                  {o.refundReason && <p className="mt-3 rounded-lg bg-subtle px-3 py-2 text-sm text-ink-2">“{o.refundReason}”</p>}
                  {o.refundEvidenceUrl && (
                    <a href={o.refundEvidenceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline">
                      View buyer evidence <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                </div>
              </div>
              {o.status === 'REFUND_REQUESTED' && (
                <Alert tone="info" className="mt-4">
                  Auctio’s trust team is reviewing this request. To resolve it faster, reach out at support@auctio.in with the order number.
                </Alert>
              )}
            </Card>
          ))
        )}
      </div>

      <Modal open={!!responding} onClose={() => setResponding(null)} title="Respond to return request" description={responding?.order.items[0]?.snapshotTitle}>
        <div className="space-y-4">
          {responding?.reason && <p className="rounded-lg bg-subtle px-3 py-2 text-sm text-ink-2">Buyer: “{responding.reason}”</p>}
          <Textarea label="Your response" required rows={4} value={response} onChange={(e) => setResponse(e.target.value)} hint="Accepting issues a refund. Otherwise your response goes to Auctio for a decision." />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" loading={busy === 'escalate'} disabled={response.trim().length < 5} onClick={() => respond(false)}>Send to Auctio</Button>
            <Button loading={busy === 'accept'} disabled={response.trim().length < 5} onClick={() => respond(true)}>Accept return</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
