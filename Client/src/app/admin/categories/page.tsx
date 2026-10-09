'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Tags } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, SafeImage, Skeleton, Textarea } from '../../../components/ui';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import type { ApiCategory } from '../../../lib/types';

interface AdminCategory extends ApiCategory {
  parentId?: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { listings: number; children: number };
}

interface Form {
  id?: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: string;
}

const EMPTY: Form = { name: '', slug: '', description: '', imageUrl: '', sortOrder: '0' };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function AdminCategoriesPage() {
  const toast = useToast();
  const { data, setData, loading, error, reload } = useApi<AdminCategory[]>('/admin/categories');
  const [form, setForm] = useState<Form | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setForm(EMPTY);
    setSlugTouched(false);
  };
  const openEdit = (c: AdminCategory) => {
    setForm({ id: c.id, name: c.name, slug: c.slug, description: c.description || '', imageUrl: c.imageUrl || '', sortOrder: String(c.sortOrder) });
    setSlugTouched(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || form.name.trim().length < 2 || !form.slug) return;
    setSaving(true);
    const body = { name: form.name.trim(), description: form.description.trim(), imageUrl: form.imageUrl.trim(), sortOrder: Number(form.sortOrder) || 0 };
    const res = form.id ? await api.patch(`/admin/categories/${form.id}`, body) : await api.post('/admin/categories', { ...body, slug: form.slug });
    setSaving(false);
    if (res.success) {
      toast.success(form.id ? 'Category updated' : 'Category created');
      setForm(null);
      reload();
    } else toast.error('Couldn’t save category', res.message);
  };

  const toggleActive = async (c: AdminCategory) => {
    setData((d) => (d ? d.map((x) => (x.id === c.id ? { ...x, isActive: !c.isActive } : x)) : d));
    const res = await api.patch(`/admin/categories/${c.id}`, { isActive: !c.isActive });
    if (!res.success) {
      setData((d) => (d ? d.map((x) => (x.id === c.id ? { ...x, isActive: c.isActive } : x)) : d));
      toast.error('Couldn’t update category', res.message);
    } else toast.success(c.isActive ? 'Category hidden' : 'Category visible', c.name);
  };

  return (
    <div>
      <PageHeader title="Categories" description="Organise the catalogue. Hidden categories disappear from navigation and search filters." actions={<Button icon={Plus} onClick={openNew}>New category</Button>} />

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Tags} title="No categories" description="Create the first category to start organising listings." action={<Button icon={Plus} onClick={openNew}>New category</Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((c) => (
              <Card key={c.id} className={c.isActive ? 'flex gap-4 p-4' : 'flex gap-4 p-4 opacity-60'}>
                <SafeImage src={c.imageUrl || undefined} alt="" className="size-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{c.name}</p>
                    {!c.isActive && <Badge>Hidden</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted">/{c.slug}{c.parentId ? ' · subcategory' : ''}</p>
                  <p className="tabular mt-1 text-sm text-ink-2">{c._count.listings} listings</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openEdit(c)} className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink" aria-label={`Edit ${c.name}`}>
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => toggleActive(c)} className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink" aria-label={c.isActive ? `Hide ${c.name}` : `Show ${c.name}`}>
                    {c.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit category' : 'New category'}>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugTouched ? form.slug : slugify(e.target.value) })}
            />
            <Input
              label="URL slug"
              required
              disabled={!!form.id}
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm({ ...form, slug: slugify(e.target.value) });
              }}
              hint={form.id ? 'Slugs can’t change once created — existing links depend on them.' : `/category/${form.slug || 'your-slug'}`}
            />
            <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input label="Image URL" type="url" placeholder="https://" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            <Input label="Sort order" inputMode="numeric" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value.replace(/[^\d-]/g, '') })} hint="Lower numbers appear first." />
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={saving} disabled={form.name.trim().length < 2 || !form.slug}>{form.id ? 'Save changes' : 'Create category'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
