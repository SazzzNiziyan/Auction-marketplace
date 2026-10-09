'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SearchX, SlidersHorizontal, X } from 'lucide-react';
import { Button, EmptyState, ErrorState, Pagination, Select } from '../ui';
import { ListingCard, ListingCardSkeleton, ListingGrid } from '.';
import { useApi } from '../../lib/use-api';
import { cn, CONDITION_LABELS, formatNumber } from '../../lib/format';
import { toCardListing, type ApiListing, type Paginated } from '../../lib/types';

interface SearchResult extends Paginated<ApiListing> {
  facets: { categories: Array<{ id: string; name: string; slug: string; _count: { listings: number } }> };
}

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'ending_soon', label: 'Ending soon' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

const TYPES = [
  { value: '', label: 'All formats' },
  { value: 'AUCTION', label: 'Auctions' },
  { value: 'FIXED_PRICE', label: 'Buy now' },
];

const PAGE_SIZE = 24;

function FilterPanel({
  params,
  setParam,
  categories,
  fixedCategory,
}: {
  params: URLSearchParams;
  setParam: (patch: Record<string, string | null>) => void;
  categories: SearchResult['facets']['categories'];
  fixedCategory?: string;
}) {
  const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');

  useEffect(() => {
    setMinPrice(params.get('minPrice') || '');
    setMaxPrice(params.get('maxPrice') || '');
  }, [params]);

  const type = params.get('type') || '';
  const condition = params.get('condition') || '';
  const category = params.get('category') || '';

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-ink">Format</legend>
        <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setParam({ type: t.value || null })}
              aria-pressed={type === t.value}
              className={cn(
                'h-10 rounded-lg px-3 text-left text-sm transition-colors',
                type === t.value ? 'bg-ink font-medium text-white' : 'border border-line bg-surface text-ink-2 hover:bg-subtle lg:border-0 lg:bg-transparent'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      {!fixedCategory && categories.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-ink">Category</legend>
          <div className="max-h-80 space-y-0.5 overflow-y-auto pr-1">
            <button
              onClick={() => setParam({ category: null })}
              className={cn('flex h-9 w-full items-center rounded-lg px-3 text-left text-sm', !category ? 'bg-subtle font-medium text-ink' : 'text-ink-2 hover:bg-subtle')}
            >
              All categories
            </button>
            {categories
              .filter((c) => c._count.listings > 0 || c.slug === category)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => setParam({ category: c.slug })}
                  className={cn(
                    'flex h-9 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm',
                    category === c.slug ? 'bg-subtle font-medium text-ink' : 'text-ink-2 hover:bg-subtle'
                  )}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="tabular text-xs text-muted">{c._count.listings}</span>
                </button>
              ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-ink">Condition</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setParam({ condition: condition === value ? null : value })}
              aria-pressed={condition === value}
              className={cn(
                'h-9 rounded-full border px-3 text-sm transition-colors',
                condition === value ? 'border-ink bg-ink text-white' : 'border-line-strong bg-surface text-ink-2 hover:border-ink'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-ink">Price (₹)</legend>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ minPrice: minPrice || null, maxPrice: maxPrice || null });
          }}
        >
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="min-price">Minimum price</label>
            <input
              id="min-price"
              inputMode="numeric"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="Min"
              className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 focus:border-ink focus:outline-none"
            />
            <span className="text-muted" aria-hidden>–</span>
            <label className="sr-only" htmlFor="max-price">Maximum price</label>
            <input
              id="max-price"
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="Max"
              className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 focus:border-ink focus:outline-none"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="w-full">
            Apply price
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted">Price filters apply to buy-now listings.</p>
      </fieldset>
    </div>
  );
}

export default function Browse({ fixedCategory, header }: { fixedCategory?: string; header?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    const keep = ['q', 'type', 'condition', 'sort', 'page'];
    keep.forEach((k) => params.get(k) && q.set(k, params.get(k)!));
    const category = fixedCategory || params.get('category');
    if (category) q.set('category', category);
    // Price is entered in rupees and stored in paise.
    if (params.get('minPrice')) q.set('minPrice', String(Number(params.get('minPrice')) * 100));
    if (params.get('maxPrice')) q.set('maxPrice', String(Number(params.get('maxPrice')) * 100));
    q.set('limit', String(PAGE_SIZE));
    return q.toString();
  }, [params, fixedCategory]);

  const { data, loading, error, reload } = useApi<SearchResult>(`/discovery/search?${query}`);

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setSheetOpen(false);
  };

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  const q = params.get('q');
  const activeChips = [
    q && { key: 'q', label: `“${q}”` },
    params.get('type') && { key: 'type', label: TYPES.find((t) => t.value === params.get('type'))?.label || '' },
    !fixedCategory && params.get('category') && { key: 'category', label: data?.facets.categories.find((c) => c.slug === params.get('category'))?.name || params.get('category')! },
    params.get('condition') && { key: 'condition', label: CONDITION_LABELS[params.get('condition')!] || params.get('condition')! },
    (params.get('minPrice') || params.get('maxPrice')) && {
      key: 'price',
      label: `₹${params.get('minPrice') || '0'} – ${params.get('maxPrice') ? `₹${params.get('maxPrice')}` : 'any'}`,
    },
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  const categories = data?.facets.categories || [];
  const page = Number(params.get('page') || 1);

  return (
    <div className="container-page py-8 sm:py-10">
      {header}

      <div className="mt-6 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted" aria-live="polite">
          {loading ? 'Searching…' : data ? `${formatNumber(data.total)} ${data.total === 1 ? 'result' : 'results'}` : ''}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={SlidersHorizontal} className="lg:hidden" onClick={() => setSheetOpen(true)}>
            Filters{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
          </Button>
          <Select
            aria-label="Sort by"
            value={params.get('sort') || 'newest'}
            onChange={(e) => setParam({ sort: e.target.value === 'newest' ? null : e.target.value })}
            options={SORTS}
            wrapperClassName="w-48"
            className="h-9"
          />
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeChips.map((c) => (
            <button
              key={c.key}
              onClick={() => setParam(c.key === 'price' ? { minPrice: null, maxPrice: null } : { [c.key]: null })}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-subtle pl-3 pr-2 text-sm text-ink hover:bg-line"
              aria-label={`Remove filter ${c.label}`}
            >
              {c.label}
              <X className="size-3.5" aria-hidden />
            </button>
          ))}
          <Link href={pathname} className="ml-1 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
            Clear all
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-32">
            <FilterPanel params={params} setParam={setParam} categories={categories} fixedCategory={fixedCategory} />
          </div>
        </aside>

        <div>
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : loading && !data ? (
            <ListingGrid className="xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </ListingGrid>
          ) : data && data.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No listings match your filters"
              description="Try a broader search, a different category, or clear your filters."
              action={
                <Link href={pathname} className="text-sm font-medium text-ink underline underline-offset-4">
                  Clear filters
                </Link>
              }
            />
          ) : data ? (
            <div className={cn('transition-opacity', loading && 'opacity-60')}>
              <ListingGrid className="xl:grid-cols-3">
                {data.items.map((l, i) => (
                  <ListingCard key={l.id} listing={toCardListing(l)} priority={i < 3} />
                ))}
              </ListingGrid>
              <Pagination page={page} totalPages={data.totalPages} onChange={(p) => setParam({ page: p > 1 ? String(p) : null })} />
            </div>
          ) : null}
        </div>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 animate-fade-in bg-ink/40" onClick={() => setSheetOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] animate-rise flex-col rounded-t-2xl bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-semibold">Filters</p>
              <button onClick={() => setSheetOpen(false)} className="flex size-11 items-center justify-center rounded-lg hover:bg-subtle" aria-label="Close filters">
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <FilterPanel params={params} setParam={setParam} categories={categories} fixedCategory={fixedCategory} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
