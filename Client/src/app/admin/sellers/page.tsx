'use client';

import React, { useState } from 'react';
import { Check, ShieldCheck, X } from 'lucide-react';
import { Button, Card, DescriptionList, EmptyState, ErrorState, Modal, PageHeader, Skeleton, Tabs, Textarea } from '../../../components/ui';
import { StatusBadge } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { formatDate, humanize } from '../../../lib/format';

interface Application {
  id: string;
  status: string;
  businessName: string;
  businessType: string;
  gstNumber?: string | null;
  panNumber?: string | null;
  bankAccountName?: string | null;
  bankAccountNo?: string | null;
  bankIfscCode?: string | null;
  businessAddressLine1?: string | null;
  businessCity?: string | null;
  businessState?: string | null;
  businessPincode?: string | null;
  reviewNote?: string | null;
  submittedAt: string;
  user: { id: string; email: string; createdAt: string; profile?: { displayName?: string; phone?: string | null } | null };
  documents: Array<{ id: string; documentType: string; fileUrl: string; fileName: string }>;
}

const mask = (v?: string | null) => (v ? `•••• ${v.slice(-4)}` : '—');

export default function AdminSellersPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Application[]>('/admin/sellers');
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [selected, setSelected] = useState<Application | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'APPROVED' | 'REJECTED' | null>(null);

  const list = (data || []).filter((a) => a.status === tab);
  const count = (s: string) => (data || []).filter((a) => a.status === s).length;

  const decide = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selected) return;
    if (decision === 'REJECTED' && note.trim().length < 5) {
      toast.error('Add a reason', 'Tell the applicant what to fix before re-applying.');
      return;
    }
    setBusy(decision);
    const res = await api.post(`/admin/sellers/${selected.id}/review`, { decision, note: note.trim() || undefined });
    setBusy(null);
    if (res.success) {
      toast.success(decision === 'APPROVED' ? 'Seller approved' : 'Application rejected', selected.businessName);
      setSelected(null);
      setNote('');
      reload();
    } else toast.error('Couldn’t record decision', res.message);
  };

  return (
    <div>
      <PageHeader title="Seller applications" description="Verify business and payout details before a seller can list." />
      <Tabs
        className="mt-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'PENDING', label: 'Pending', count: count('PENDING') },
          { value: 'APPROVED', label: 'Approved', count: count('APPROVED') },
          { value: 'REJECTED', label: 'Rejected', count: count('REJECTED') },
        ]}
      />

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : list.length === 0 ? (
          <EmptyState icon={ShieldCheck} title={tab === 'PENDING' ? 'Queue is clear' : 'Nothing here'} description={tab === 'PENDING' ? 'New seller applications will appear here.' : undefined} />
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {list.map((a) => (
              <button key={a.id} onClick={() => setSelected(a)} className="flex w-full flex-col gap-2 px-5 py-4 text-left hover:bg-subtle/60 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.businessName}</p>
                  <p className="truncate text-sm text-muted">{a.user.profile?.displayName} · {a.user.email}</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted">
                  <span>{humanize(a.businessType)}</span>
                  <span>{formatDate(a.submittedAt)}</span>
                  <StatusBadge kind="generic" status={a.status} />
                </div>
              </button>
            ))}
          </Card>
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        size="lg"
        title={selected?.businessName || ''}
        description={selected ? `Submitted ${formatDate(selected.submittedAt)} by ${selected.user.email}` : undefined}
        footer={
          selected?.status === 'PENDING' ? (
            <>
              <Button variant="secondary" icon={X} loading={busy === 'REJECTED'} onClick={() => decide('REJECTED')}>Reject</Button>
              <Button icon={Check} loading={busy === 'APPROVED'} onClick={() => decide('APPROVED')}>Approve seller</Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold">Business</p>
                <DescriptionList
                  items={[
                    { label: 'Type', value: humanize(selected.businessType) },
                    { label: 'PAN', value: selected.panNumber || '—' },
                    { label: 'GSTIN', value: selected.gstNumber || '—' },
                    { label: 'Location', value: [selected.businessCity, selected.businessState].filter(Boolean).join(', ') || '—' },
                    { label: 'PIN', value: selected.businessPincode || '—' },
                  ]}
                />
              </div>
              <div>
                <p className="text-sm font-semibold">Payout</p>
                <DescriptionList
                  items={[
                    { label: 'Account name', value: selected.bankAccountName || '—' },
                    { label: 'Account no.', value: mask(selected.bankAccountNo) },
                    { label: 'IFSC', value: selected.bankIfscCode || '—' },
                    { label: 'Phone', value: selected.user.profile?.phone || '—' },
                    { label: 'Member since', value: formatDate(selected.user.createdAt) },
                  ]}
                />
              </div>
            </div>
            {selected.businessAddressLine1 && <p className="rounded-lg bg-subtle px-3 py-2 text-sm text-ink-2">{selected.businessAddressLine1}</p>}
            {selected.documents.length > 0 && (
              <div>
                <p className="text-sm font-semibold">Documents</p>
                <ul className="mt-2 space-y-1">
                  {selected.documents.map((d) => (
                    <li key={d.id}>
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">{humanize(d.documentType)} — {d.fileName}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selected.status === 'PENDING' ? (
              <Textarea label="Note to applicant" rows={3} value={note} onChange={(e) => setNote(e.target.value)} hint="Required when rejecting. Shown on the applicant’s status page." />
            ) : (
              selected.reviewNote && <p className="text-sm text-ink-2"><span className="font-medium">Review note:</span> {selected.reviewNote}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
