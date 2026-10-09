'use client';

import React, { useMemo, useState } from 'react';
import { Gavel, ImagePlus, Lock, Sparkles, Tag, Trash2, X } from 'lucide-react';
import { Alert, Button, Card, CardHeader, Input, SafeImage, Select, Textarea } from '../ui';
import { api } from '../../lib/api';
import { useApi } from '../../lib/use-api';
import { useToast } from '../../lib/toast';
import { cn, CONDITION_LABELS, formatINR, rupeesToPaise } from '../../lib/format';
import type { ApiCategory, ListingType } from '../../lib/types';

export interface ListingFormValues {
  type: ListingType;
  title: string;
  description: string;
  categoryId: string;
  condition: string;
  price: string;
  stock: string;
  shippingNote: string;
  tags: string[];
  images: string[];
  startingBid: string;
  reservePrice: string;
  deposit: string;
  durationHours: string;
  antiSnipMins: string;
}

export const EMPTY_LISTING: ListingFormValues = {
  type: 'FIXED_PRICE',
  title: '',
  description: '',
  categoryId: '',
  condition: 'good',
  price: '',
  stock: '1',
  shippingNote: '',
  tags: [],
  images: [],
  startingBid: '',
  reservePrice: '',
  deposit: '500',
  durationHours: '72',
  antiSnipMins: '5',
};

const DURATIONS = [
  { value: '24', label: '1 day' },
  { value: '72', label: '3 days' },
  { value: '120', label: '5 days' },
  { value: '168', label: '7 days' },
  { value: '240', label: '10 days' },
];

type Errors = Partial<Record<keyof ListingFormValues, string>>;

function validate(v: ListingFormValues, mode: 'create' | 'edit'): Errors {
  const e: Errors = {};
  if (v.title.trim().length < 3) e.title = 'Title must be at least 3 characters';
  if (v.description.trim().length < 10) e.description = 'Describe the item in at least 10 characters';
  if (!v.categoryId) e.categoryId = 'Choose a category';
  if (v.type === 'FIXED_PRICE') {
    if (!(Number(v.price) > 0)) e.price = 'Enter a price above ₹0';
    if (!(Number(v.stock) >= 1)) e.stock = 'Stock must be at least 1';
  } else if (mode === 'create') {
    if (!(Number(v.startingBid) > 0)) e.startingBid = 'Enter a starting bid';
    if (v.reservePrice && Number(v.reservePrice) < Number(v.startingBid)) e.reservePrice = 'Reserve must be at least the starting bid';
    if (!(Number(v.deposit) >= 0)) e.deposit = 'Enter a deposit amount';
  }
  return e;
}

export function toCreatePayload(v: ListingFormValues) {
  const base = {
    title: v.title.trim(),
    description: v.description.trim(),
    categoryId: v.categoryId,
    condition: v.condition,
    type: v.type,
    shippingNote: v.shippingNote.trim() || undefined,
    tags: v.tags,
    images: v.images.map((imageUrl, i) => ({ imageUrl, isPrimary: i === 0 })),
  };
  if (v.type === 'FIXED_PRICE') {
    return { ...base, priceInPaise: rupeesToPaise(v.price), stockQuantity: Number(v.stock) };
  }
  const end = new Date(Date.now() + Number(v.durationHours) * 3600 * 1000);
  return {
    ...base,
    stockQuantity: 1,
    auctionConfig: {
      startingBidPaise: rupeesToPaise(v.startingBid),
      reservePricePaise: v.reservePrice ? rupeesToPaise(v.reservePrice) : undefined,
      depositAmountPaise: rupeesToPaise(v.deposit),
      scheduledEndAt: end.toISOString(),
      antiSnipExtensionMins: Number(v.antiSnipMins) || 5,
    },
  };
}

export function toUpdatePayload(v: ListingFormValues) {
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    categoryId: v.categoryId,
    condition: v.condition,
    shippingNote: v.shippingNote.trim() || undefined,
    tags: v.tags,
    ...(v.type === 'FIXED_PRICE' && { priceInPaise: rupeesToPaise(v.price), stockQuantity: Number(v.stock) }),
  };
}

function AiAssistant({ categories, onApply }: { categories: ApiCategory[]; onApply: (patch: Partial<ListingFormValues>) => void }) {
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (notes.trim().length < 10) return;
    setBusy(true);
    const res = await api.post<{ title: string; description: string; suggestedCategory: string }>('/ai/listing-assistant', { rawText: notes.trim() });
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error('The assistant is unavailable', res.message);
      return;
    }
    const match = categories.find((c) => c.name.toLowerCase() === res.data!.suggestedCategory?.toLowerCase());
    onApply({ title: res.data.title.slice(0, 200), description: res.data.description, ...(match && { categoryId: match.id }) });
    toast.success('Draft written', 'Review the title and description below before publishing.');
  };

  return (
    <div className="rounded-2xl border border-accent-line/60 bg-accent-soft/40 p-5">
      <p className="flex items-center gap-2 font-semibold text-accent-strong"><Sparkles className="size-4" aria-hidden />Write it for me</p>
      <p className="mt-1 text-sm text-ink-2">Jot down what you know — brand, age, condition, flaws — and the AI drafts a title and description.</p>
      <Textarea
        aria-label="Notes for the AI assistant"
        rows={3}
        className="mt-3 bg-surface"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. 1970s HMT Janata wristwatch, working, original dial, light scratches on case, new leather strap"
      />
      <Button variant="accent" size="sm" className="mt-3" icon={Sparkles} loading={busy} disabled={notes.trim().length < 10} onClick={generate}>
        Generate draft
      </Button>
    </div>
  );
}

export default function ListingForm({
  mode,
  initial,
  locked,
  submitLabel,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  initial: ListingFormValues;
  locked?: boolean;
  submitLabel: string;
  onSubmit: (values: ListingFormValues) => Promise<void>;
}) {
  const [v, setV] = useState<ListingFormValues>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [imageInput, setImageInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const { data: categories } = useApi<ApiCategory[]>('/catalog/categories');

  const categoryOptions = useMemo(
    () =>
      (categories || []).flatMap((c) => [
        { value: c.id, label: c.name },
        ...(c.children || []).map((ch) => ({ value: ch.id, label: `${c.name} › ${ch.name}` })),
      ]),
    [categories]
  );

  const set = <K extends keyof ListingFormValues>(k: K, value: ListingFormValues[K]) => {
    setV((x) => ({ ...x, [k]: value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const field = (k: keyof ListingFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never);
  const money = (k: keyof ListingFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value.replace(/[^\d.]/g, '') as never);

  const addImage = () => {
    const url = imageInput.trim();
    try {
      new URL(url);
    } catch {
      setErrors((x) => ({ ...x, images: 'Enter a full image URL starting with https://' }));
      return;
    }
    if (v.images.length >= 8) return;
    set('images', [...v.images, url]);
    setImageInput('');
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !v.tags.includes(t) && v.tags.length < 10) set('tags', [...v.tags, t]);
    setTagInput('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(v, mode);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`lf-${first}`)?.focus();
      return;
    }
    setSubmitting(true);
    await onSubmit(v);
    setSubmitting(false);
  };

  const isAuction = v.type === 'AUCTION';

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {mode === 'create' && (
          <Card className="p-5 sm:p-6">
            <p className="text-sm font-medium" id="format-label">How do you want to sell?</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby="format-label">
              {[
                { value: 'FIXED_PRICE' as const, icon: Tag, title: 'Fixed price', body: 'Buyers purchase instantly at your price.' },
                { value: 'AUCTION' as const, icon: Gavel, title: 'Auction', body: 'Buyers bid against each other in real time.' },
              ].map(({ value, icon: Icon, title, body }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={v.type === value}
                  onClick={() => set('type', value)}
                  className={cn('flex items-start gap-3 rounded-xl border p-4 text-left transition-colors', v.type === value ? 'border-ink bg-subtle ring-1 ring-ink' : 'border-line-strong hover:border-ink')}
                >
                  <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
                  <span>
                    <span className="block font-medium">{title}</span>
                    <span className="mt-0.5 block text-sm text-muted">{body}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {mode === 'create' && <AiAssistant categories={categories || []} onApply={(patch) => setV((x) => ({ ...x, ...patch }))} />}

        <Card>
          <CardHeader title="Item details" />
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <Input id="lf-title" label="Title" required maxLength={200} value={v.title} onChange={field('title')} error={errors.title} wrapperClassName="sm:col-span-2" hint="Lead with brand, model and key detail." />
            <Textarea id="lf-description" label="Description" required rows={7} maxLength={10000} value={v.description} onChange={field('description')} error={errors.description} wrapperClassName="sm:col-span-2" hint="Be honest about condition and any flaws — it reduces returns." />
            <Select id="lf-categoryId" label="Category" required placeholder={categories ? 'Select a category' : 'Loading…'} options={categoryOptions} value={v.categoryId} onChange={field('categoryId')} error={errors.categoryId} />
            <Select id="lf-condition" label="Condition" options={Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))} value={v.condition} onChange={field('condition')} />
            <div className="sm:col-span-2">
              <Input
                label="Tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                hint="Press Enter to add. Helps buyers find your item."
                trailing={<Button size="sm" variant="ghost" onClick={addTag} disabled={!tagInput.trim()}>Add</Button>}
              />
              {v.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {v.tags.map((t) => (
                    <span key={t} className="inline-flex h-8 items-center gap-1 rounded-full bg-subtle pl-3 pr-1.5 text-sm">
                      {t}
                      <button type="button" onClick={() => set('tags', v.tags.filter((x) => x !== t))} className="flex size-6 items-center justify-center rounded-full hover:bg-line" aria-label={`Remove tag ${t}`}>
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {mode === 'create' && (
          <Card>
            <CardHeader title="Photos" description="Add up to 8 image URLs. The first one is the cover." />
            <div className="p-5 sm:p-6">
              <div className="flex gap-2">
                <Input
                  aria-label="Image URL"
                  type="url"
                  placeholder="https://images.example.com/photo.jpg"
                  value={imageInput}
                  onChange={(e) => {
                    setImageInput(e.target.value);
                    if (errors.images) setErrors((x) => ({ ...x, images: undefined }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addImage();
                    }
                  }}
                  error={errors.images}
                />
                <Button variant="secondary" icon={ImagePlus} onClick={addImage} disabled={!imageInput.trim() || v.images.length >= 8} className="shrink-0">
                  Add
                </Button>
              </div>
              {v.images.length > 0 && (
                <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {v.images.map((src, i) => (
                    <li key={src} className="group relative overflow-hidden rounded-xl border border-line">
                      <SafeImage src={src} alt={`Photo ${i + 1}`} className="aspect-square w-full" />
                      {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-ink/80 px-1.5 py-0.5 text-[11px] font-medium text-white">Cover</span>}
                      <button
                        type="button"
                        onClick={() => set('images', v.images.filter((x) => x !== src))}
                        className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-surface/90 text-danger shadow-card"
                        aria-label={`Remove photo ${i + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
        <Card>
          <CardHeader title={isAuction ? 'Auction settings' : 'Price & stock'} />
          <div className="space-y-4 p-5">
            {locked && (
              <Alert tone="warning" title="Bidding has started">
                Price, stock and auction settings can’t be changed once a bid is placed.
              </Alert>
            )}
            {!isAuction ? (
              <>
                <Input id="lf-price" label="Price" required inputMode="decimal" leading={<span className="text-sm">₹</span>} value={v.price} onChange={money('price')} error={errors.price} disabled={locked} />
                <Input id="lf-stock" label="Quantity available" required inputMode="numeric" value={v.stock} onChange={(e) => set('stock', e.target.value.replace(/\D/g, ''))} error={errors.stock} disabled={locked} />
              </>
            ) : mode === 'create' ? (
              <>
                <Input id="lf-startingBid" label="Starting bid" required inputMode="decimal" leading={<span className="text-sm">₹</span>} value={v.startingBid} onChange={money('startingBid')} error={errors.startingBid} />
                <Input id="lf-reservePrice" label="Reserve price" inputMode="decimal" leading={<span className="text-sm">₹</span>} value={v.reservePrice} onChange={money('reservePrice')} error={errors.reservePrice} hint="Optional. The item won’t sell below this; bidders only see whether it’s met." />
                <Input id="lf-deposit" label="Caution deposit" inputMode="decimal" leading={<span className="text-sm">₹</span>} value={v.deposit} onChange={money('deposit')} error={errors.deposit} hint="Refundable. Higher deposits deter non-paying winners." />
                <Select label="Duration" options={DURATIONS} value={v.durationHours} onChange={field('durationHours')} hint="Starts as soon as the listing is published." />
                <Select
                  label="Anti-sniping window"
                  options={[3, 5, 10, 15].map((m) => ({ value: String(m), label: `${m} minutes` }))}
                  value={v.antiSnipMins}
                  onChange={field('antiSnipMins')}
                  hint="Late bids extend the auction by this much."
                />
              </>
            ) : (
              <p className="flex items-start gap-2 text-sm text-muted">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden /> Auction settings are fixed once the auction is live.
              </p>
            )}
            <Textarea label="Shipping note" rows={2} maxLength={500} value={v.shippingNote} onChange={field('shippingNote')} placeholder="e.g. Ships in 2 days, insured" />
          </div>
        </Card>

        {mode === 'create' && (
          <Card className="p-5">
            <p className="text-sm font-medium">Summary</p>
            <p className="tabular mt-2 text-2xl font-semibold">{formatINR(rupeesToPaise(isAuction ? v.startingBid : v.price))}</p>
            <p className="text-sm text-muted">{isAuction ? 'starting bid' : `× ${v.stock || 0} in stock`}</p>
            <p className="mt-3 text-sm text-muted">New listings are screened automatically. Most go live instantly; flagged ones are reviewed by our team.</p>
          </Card>
        )}

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
