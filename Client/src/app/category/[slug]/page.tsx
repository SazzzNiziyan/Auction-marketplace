'use client';

import React, { Suspense, use } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Browse from '../../../components/marketplace/Browse';
import { ErrorState, SafeImage, Skeleton } from '../../../components/ui';
import { useApi } from '../../../lib/use-api';
import type { ApiCategory } from '../../../lib/types';

function CategoryHeader({ slug }: { slug: string }) {
  const { data, loading, error } = useApi<ApiCategory>(`/catalog/categories/${slug}`);

  if (error) return <ErrorState message="This category doesn’t exist or is no longer available." />;

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted">
        <Link href="/" className="hover:text-ink">Home</Link>
        <ChevronRight className="size-4" aria-hidden />
        <Link href="/explore" className="hover:text-ink">Explore</Link>
        <ChevronRight className="size-4" aria-hidden />
        <span className="text-ink">{data?.name || '…'}</span>
      </nav>
      <div className="relative overflow-hidden rounded-3xl border border-line bg-ink">
        {data?.imageUrl && <SafeImage src={data.imageUrl} alt="" loading="eager" className="absolute inset-0 size-full opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/20" aria-hidden />
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          {loading ? (
            <>
              <Skeleton className="h-10 w-64 bg-white/10" />
              <Skeleton className="mt-3 h-5 w-96 max-w-full bg-white/10" />
            </>
          ) : (
            <>
              <h1 className="font-display text-4xl tracking-tight text-white sm:text-5xl">{data?.name}</h1>
              {data?.description && <p className="mt-3 max-w-xl text-base text-stone-300">{data.description}</p>}
            </>
          )}
          {data?.children && data.children.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {data.children.map((c) => (
                <Link key={c.id} href={`/category/${c.slug}`} className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <Suspense fallback={<div className="container-page py-10" aria-busy="true" />}>
      <Browse fixedCategory={slug} header={<CategoryHeader slug={slug} />} />
    </Suspense>
  );
}
