'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Pencil, PlusCircle, Search, Send, Tags, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LinkButton, Modal, PageHeader, Pagination, SafeImage, Skeleton, Tabs } from '../../../components/ui';
import { StatusBadge } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { formatDate, formatINR } from '../../../lib/format';
import { listingHref, type ApiListing, type ListingStatus, type Paginated } from '../../../lib/types';

const STATUS_TABS: Array<{ value: '' | ListingStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING_MODERATION', label: 'In review' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'UNSOLD', label: 'Unsold' },
];

export default function InventoryPage() {
  const toast = useToast();
  const [status, setStatus] = useState<'' | ListingStatus>('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<ApiListing | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [status, debounced]);

  const qs = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) qs.set('status', status);
  if (debounced) qs.set('search', debounced);
  const { data, loading, error, reload } = useApi<Paginated<ApiListing>>(`/seller/inventory?${qs}`);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusy(toDelete.id);
    const res = await api.del(`/catalog/listings/${toDelete.id}`);
    setBusy(null);
    setToDelete(null);
    if (res.success) {
      toast.success('Listing removed');
      reload();
    } else toast.error('Couldn’t remove listing', res.message);
  };

  const submitForReview = async (l: ApiListing) => {
    setBusy(l.id);
    const res = await api.post(`/catalog/listings/${l.id}/submit`);
    setBusy(null);
    if (res.success) {
      toast.success('Submitted for review');
      reload();
    } else toast.error('Couldn’t submit', res.message);
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Every listing in your store."
        actions={<LinkButton href="/seller/listings/create" icon={PlusCircle}>New listing</LinkButton>}
      />

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs tabs={STATUS_TABS} value={status} onChange={setStatus} />
        <Input aria-label="Search listings" placeholder="Search by title" value={search} onChange={(e) => setSearch(e.target.value)} leading={<Search className="size-4" />} wrapperClassName="lg:w-72" />
      </div>

      <Card className="mt-6 overflow-hidden">
        {error ? (
          <ErrorState className="m-5 border-0" message={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            className="m-5 border-0"
            icon={Tags}
            title={debounced || status ? 'No matching listings' : 'No listings yet'}
            description={debounced || status ? 'Try another filter.' : 'Create your first listing — it only takes a minute.'}
            action={!debounced && !status && <LinkButton href="/seller/listings/create" size="sm">Create listing</LinkButton>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th scope="col" className="px-5 py-3 font-medium">Listing</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-3 py-3 font-medium">Price</th>
                  <th scope="col" className="px-3 py-3 font-medium">Stock / bids</th>
                  <th scope="col" className="px-3 py-3 font-medium">Created</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((l) => {
                  const isAuction = l.type === 'AUCTION';
                  const locked = isAuction && (l.auction?.bidCount || 0) > 0;
                  return (
                    <tr key={l.id} className="hover:bg-subtle/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <SafeImage src={l.images?.[0]?.imageUrl} alt="" className="size-12 shrink-0 rounded-lg" />
                          <div className="min-w-0">
                            <p className="max-w-[260px] truncate font-medium">{l.title}</p>
                            <p className="text-xs text-muted">{isAuction ? 'Auction' : 'Buy now'} · {l.category?.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3"><StatusBadge kind="listing" status={l.status} /></td>
                      <td className="tabular px-3 py-3 font-medium">
                        {isAuction ? formatINR(l.auction?.currentHighBidPaise) : formatINR(l.priceInPaise)}
                      </td>
                      <td className="tabular px-3 py-3 text-ink-2">{isAuction ? `${l.auction?.bidCount || 0} bids` : `${l.stockQuantity} in stock`}</td>
                      <td className="px-3 py-3 text-ink-2">{formatDate(l.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          {l.status === 'DRAFT' && (
                            <Button size="sm" variant="ghost" icon={Send} loading={busy === l.id} onClick={() => submitForReview(l)}>
                              Submit
                            </Button>
                          )}
                          {l.status === 'ACTIVE' && (
                            <Link href={listingHref({ id: l.id, type: l.type, auctionId: l.auction?.id })} className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink" aria-label={`View ${l.title}`}>
                              <ExternalLink className="size-4" />
                            </Link>
                          )}
                          {!locked && l.status !== 'SOLD' && (
                            <Link href={`/seller/listings/${l.id}/edit`} className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink" aria-label={`Edit ${l.title}`}>
                              <Pencil className="size-4" />
                            </Link>
                          )}
                          {!locked && l.status !== 'SOLD' && (
                            <button onClick={() => setToDelete(l)} className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger" aria-label={`Remove ${l.title}`}>
                              <Trash2 className="size-4" />
                            </button>
                          )}
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
      {data && <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Remove this listing?"
        description={toDelete?.title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Keep listing</Button>
            <Button variant="danger" icon={Trash2} loading={!!busy} onClick={confirmDelete}>Remove</Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">It will be hidden from buyers immediately. This can’t be undone.</p>
      </Modal>
    </div>
  );
}
