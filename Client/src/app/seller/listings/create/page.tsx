'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ListingForm, { EMPTY_LISTING, toCreatePayload } from '../../../../components/seller/ListingForm';
import { PageHeader } from '../../../../components/ui';
import { api } from '../../../../lib/api';
import { useToast } from '../../../../lib/toast';
import type { ApiListing } from '../../../../lib/types';

function CreateListing() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const initial = { ...EMPTY_LISTING, type: params.get('type') === 'AUCTION' ? ('AUCTION' as const) : ('FIXED_PRICE' as const) };

  return (
    <div>
      <PageHeader title="New listing" description="Fixed price or auction — publish in a couple of minutes." />
      <div className="mt-6">
        <ListingForm
          mode="create"
          initial={initial}
          submitLabel="Publish listing"
          onSubmit={async (values) => {
            const res = await api.post<ApiListing>('/catalog/listings', toCreatePayload(values));
            if (!res.success || !res.data) {
              toast.error('Couldn’t publish listing', res.message);
              return;
            }
            if (res.data.status === 'PENDING_MODERATION') {
              toast.info('Listing sent for review', 'Our team will check it before it goes live.');
            } else {
              toast.success('Your listing is live');
            }
            router.push(values.type === 'AUCTION' ? '/seller/auctions' : '/seller/inventory');
          }}
        />
      </div>
    </div>
  );
}

export default function CreateListingPage() {
  return (
    <Suspense fallback={null}>
      <CreateListing />
    </Suspense>
  );
}
