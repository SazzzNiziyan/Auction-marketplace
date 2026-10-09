'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import { Alert, Button, Card, CardHeader, EmptyState, ErrorState, Input, PageHeader, Skeleton } from '../../../components/ui';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { formatINR, timeAgo } from '../../../lib/format';

interface Setting {
  id: string;
  key: string;
  value: string;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  updatedAt: string;
}

const META: Record<string, { label: string; hint: string; unit?: string }> = {
  platform_commission_percent: { label: 'Platform commission', hint: 'Percentage of each completed sale.', unit: '%' },
  caution_deposit_amount_paise: { label: 'Default caution deposit', hint: 'Stored in paise. Sellers can override per auction.', unit: 'paise' },
  anti_snip_extension_mins: { label: 'Anti-sniping extension', hint: 'Minutes added when a bid lands near the end.', unit: 'min' },
  max_anti_snip_extensions: { label: 'Maximum extensions', hint: 'How many times one auction can be extended.' },
  winner_payment_deadline_hours: { label: 'Winner payment window', hint: 'Hours a winner has to pay before the deposit is forfeited.', unit: 'hrs' },
  maintenance_mode: { label: 'Maintenance mode', hint: 'Signals that the marketplace is temporarily read-only.' },
};

export default function AdminSettingsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Setting[]>('/admin/settings');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setValues(Object.fromEntries(data.map((s) => [s.key, s.value])));
  }, [data]);

  const changed = useMemo(() => (data || []).filter((s) => values[s.key] !== undefined && values[s.key] !== s.value), [data, values]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changed.length === 0) return;
    setSaving(true);
    const res = await api.put<Setting[]>('/admin/settings', { settings: Object.fromEntries(changed.map((s) => [s.key, values[s.key]])) });
    setSaving(false);
    if (res.success) {
      toast.success('Settings saved', `${changed.length} ${changed.length === 1 ? 'change' : 'changes'} recorded in the audit log.`);
      reload();
    } else toast.error('Couldn’t save settings', res.message);
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <form onSubmit={save} className="space-y-6">
      <PageHeader
        title="Platform settings"
        description="Marketplace-wide rules. Every change is recorded in the audit log."
        actions={<Button type="submit" loading={saving} disabled={changed.length === 0}>{changed.length ? `Save ${changed.length} ${changed.length === 1 ? 'change' : 'changes'}` : 'Saved'}</Button>}
      />

      <Alert tone="info">
        These values are stored centrally. Some engine rules (₹100 bid increment, 5% earnings estimate) are still fixed in the API code and don’t yet read from here.
      </Alert>

      <Card>
        <CardHeader title="Rules" />
        {loading ? (
          <div className="space-y-4 p-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState className="m-5 border-0" icon={Settings} title="No settings found" description="Run the database seed to create the default platform settings." />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((s) => {
              const meta = META[s.key] || { label: s.key.replace(/_/g, ' '), hint: '' };
              const value = values[s.key] ?? s.value;
              return (
                <li key={s.key} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_260px] sm:items-center sm:px-6">
                  <div>
                    <p className="font-medium capitalize">{meta.label}</p>
                    <p className="text-sm text-muted">
                      {meta.hint}
                      {s.key === 'caution_deposit_amount_paise' && value && !Number.isNaN(Number(value)) && ` Currently ${formatINR(Number(value))}.`}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">Updated {timeAgo(s.updatedAt)}</p>
                  </div>
                  {s.dataType === 'boolean' ? (
                    <label className="flex h-11 items-center justify-end gap-3">
                      <span className="text-sm text-ink-2">{value === 'true' ? 'On' : 'Off'}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={value === 'true'}
                        aria-label={meta.label}
                        onClick={() => setValues((v) => ({ ...v, [s.key]: value === 'true' ? 'false' : 'true' }))}
                        className={value === 'true' ? 'relative h-7 w-12 rounded-full bg-ink transition-colors' : 'relative h-7 w-12 rounded-full bg-line-strong transition-colors'}
                      >
                        <span className={value === 'true' ? 'absolute left-6 top-1 size-5 rounded-full bg-white shadow transition-[left]' : 'absolute left-1 top-1 size-5 rounded-full bg-white shadow transition-[left]'} />
                      </button>
                    </label>
                  ) : (
                    <Input
                      aria-label={meta.label}
                      inputMode={s.dataType === 'number' ? 'decimal' : undefined}
                      value={value}
                      onChange={(e) => setValues((v) => ({ ...v, [s.key]: s.dataType === 'number' ? e.target.value.replace(/[^\d.]/g, '') : e.target.value }))}
                      trailing={meta.unit ? <span className="pr-2 text-sm text-muted">{meta.unit}</span> : undefined}
                      className="tabular text-right"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </form>
  );
}
