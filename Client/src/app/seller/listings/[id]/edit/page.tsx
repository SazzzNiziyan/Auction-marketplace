'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ListingForm, { EMPTY_LISTING, toUpdatePayload } from '../../../../../components/seller/ListingForm';
import { ErrorState, PageHeader, Skeleton } from '../../../../../components/ui';
import { StatusBadge } from '../../../../../components/marketplace';
import { useApi } from '../../../../../lib/use-api';
import { api } from '../../../../../lib/api';
import { useToast } from '../../../../../lib/toast';
import type { ApiListing } from '../../../../../lib/types';

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { data: listing, loading, error, reload } = useApi<ApiListing>(`/catalog/listings/${id}`);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !listing) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[480px] rounded-2xl" />
      </div>
    );
  }

  const locked = listing.type === 'AUCTION' && (listing.auction?.bidCount || 0) > 0;

  return (
    <div>
      <Link href="/seller/inventory" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Inventory
      </Link>
      <PageHeader className="mt-3" title="Edit listing" description={<span className="flex items-center gap-2">{listing.title} <StatusBadge kind="listing" status={listing.status} /></span>} />
      <div className="mt-6">
        <ListingForm
          mode="edit"
          locked={locked}
          submitLabel="Save changes"
          initial={{
            ...EMPTY_LISTING,
            type: listing.type,
            title: listing.title,
            description: listing.description || '',
            categoryId: listing.category?.id || '',
            condition: listing.condition || 'good',
            price: listing.priceInPaise ? String(listing.priceInPaise / 100) : '',
            stock: String(listing.stockQuantity ?? 1),
            shippingNote: listing.shippingNote || '',
            tags: listing.tags || [],
            images: (listing.images || []).map((i) => i.imageUrl),
          }}
          onSubmit={async (values) => {
            const res = await api.patch(`/catalog/listings/${id}`, toUpdatePayload(values));
            if (res.success) {
              toast.success('Listing updated');
              router.push('/seller/inventory');
            } else toast.error('Couldn’t save changes', res.message);
          }}
        />
      </div>
    </div>
  );
}
