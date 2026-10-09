'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Landmark, Store, Truck } from 'lucide-react';
import { Button, Card, CardHeader, ErrorState, Input, LinkButton, PageHeader, Skeleton, Textarea } from '../../../components/ui';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../lib/toast';

const FIELDS = ['businessName', 'businessType', 'gstNumber', 'panNumber', 'bankAccountName', 'bankAccountNo', 'bankIfscCode', 'returnPolicy', 'shippingPolicy'] as const;
type Field = (typeof FIELDS)[number];
type Form = Record<Field, string>;

export default function SellerSettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi<Partial<Record<Field, string | null>> & { isVerified?: boolean }>('/seller/settings');
  const [form, setForm] = useState<Form>(() => Object.fromEntries(FIELDS.map((f) => [f, ''])) as Form);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(Object.fromEntries(FIELDS.map((f) => [f, data[f] || ''])) as Form);
  }, [data]);

  const set = (k: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.businessName.trim().length < 2) {
      toast.error('Store name is required');
      return;
    }
    setSaving(true);
    const payload = Object.fromEntries(FIELDS.map((f) => [f, form[f].trim()]).filter(([, v]) => v !== ''));
    const res = await api.put('/seller/settings', payload);
    setSaving(false);
    if (res.success) toast.success('Store settings saved');
    else toast.error('Couldn’t save settings', res.message);
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <PageHeader
        title="Store settings"
        description="How your store appears to buyers, and where payouts go."
        actions={user && <LinkButton href={`/store/${user.id}`} variant="secondary" iconRight={ExternalLink}>View storefront</LinkButton>}
      />

      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><Store className="size-4 text-muted" aria-hidden />Store profile</span>} />
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <Input label="Store name" required value={form.businessName} onChange={set('businessName')} />
          <Input label="Business type" value={form.businessType} onChange={set('businessType')} />
          <Input label="PAN" value={form.panNumber} onChange={set('panNumber')} maxLength={10} className="uppercase" />
          <Input label="GSTIN" value={form.gstNumber} onChange={set('gstNumber')} maxLength={15} className="uppercase" />
        </div>
      </Card>

      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><Truck className="size-4 text-muted" aria-hidden />Policies</span>} description="Shown on your storefront’s Policies tab." />
        <div className="grid gap-4 p-5 sm:p-6">
          <Textarea label="Return policy" rows={4} maxLength={1000} value={form.returnPolicy} onChange={set('returnPolicy')} placeholder="e.g. Returns accepted within 7 days if the item is not as described." />
          <Textarea label="Shipping policy" rows={4} maxLength={1000} value={form.shippingPolicy} onChange={set('shippingPolicy')} placeholder="e.g. Ships within 2 business days via insured courier." />
        </div>
      </Card>

      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><Landmark className="size-4 text-muted" aria-hidden />Payout account</span>} description="Only visible to you and Auctio’s payments team." />
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <Input label="Account holder name" value={form.bankAccountName} onChange={set('bankAccountName')} wrapperClassName="sm:col-span-2" />
          <Input label="Account number" inputMode="numeric" autoComplete="off" value={form.bankAccountNo} onChange={set('bankAccountNo')} />
          <Input label="IFSC" maxLength={11} value={form.bankIfscCode} onChange={set('bankIfscCode')} className="uppercase" />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={saving}>Save settings</Button>
      </div>
    </form>
  );
}
