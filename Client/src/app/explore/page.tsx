'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Browse from '../../components/marketplace/Browse';
import { PageHeader } from '../../components/ui';

function ExploreHeader() {
  const params = useSearchParams();
  const q = params.get('q');
  const type = params.get('type');
  const title = q ? `Results for “${q}”` : type === 'AUCTION' ? 'Live auctions' : type === 'FIXED_PRICE' ? 'Buy it now' : 'Explore the marketplace';
  const description =
    type === 'AUCTION'
      ? 'Bid in real time. Deposits are refunded in full if you don’t win.'
      : 'Discover auctions and fixed-price pieces from verified sellers.';
  return <PageHeader title={title} description={description} />;
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="container-page py-10" aria-busy="true" />}>
      <Browse header={<ExploreHeader />} />
    </Suspense>
  );
}
