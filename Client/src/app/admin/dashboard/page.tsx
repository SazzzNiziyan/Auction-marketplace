'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Banknote, ClipboardCheck, Download, Gavel, Package, ShieldCheck, Tags, Users } from 'lucide-react';
import { Button, Card, CardHeader, ErrorState, PageHeader, Skeleton, StatCard } from '../../../components/ui';
import { useApi } from '../../../lib/use-api';
import { downloadFile } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { formatINR, formatNumber, humanize, timeAgo } from '../../../lib/format';

interface KPIs {
  totalUsers: number;
  totalSellers: number;
  activeListings: number;
  pendingModerationListings: number;
  liveAuctions: number;
  endedAuctions: number;
  totalOrders: number;
  gmvPaise: number;
  estimatedCommissionPaise: number;
  pendingApplications: number;
  openReports: number;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor?: { email: string; profile?: { displayName?: string } | null } | null;
}

export default function AdminDashboardPage() {
  const toast = useToast();
  const kpis = useApi<KPIs>('/admin/kpis');
  const logs = useApi<AuditLog[]>('/admin/audit-logs');
  const [exporting, setExporting] = useState<string | null>(null);

  const exportCsv = async (type: 'orders' | 'auctions' | 'users') => {
    setExporting(type);
    const ok = await downloadFile(`/admin/export?type=${type}`, `auctio_${type}_${new Date().toISOString().slice(0, 10)}.csv`);
    setExporting(null);
    if (!ok) toast.error('Export failed', 'Please try again.');
  };

  if (kpis.error) return <ErrorState message={kpis.error} onRetry={kpis.reload} />;
  const k = kpis.data;

  const queues = [
    { href: '/admin/sellers', icon: ShieldCheck, label: 'Seller applications', count: k?.pendingApplications },
    { href: '/admin/moderation', icon: ClipboardCheck, label: 'Listings in review', count: k?.pendingModerationListings },
    { href: '/admin/disputes', icon: AlertTriangle, label: 'Open reports', count: k?.openReports },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin console"
        title="Platform overview"
        description="Marketplace health, queues that need attention and recent staff activity."
        actions={
          <div className="flex flex-wrap gap-2">
            {(['orders', 'auctions', 'users'] as const).map((t) => (
              <Button key={t} variant="secondary" size="sm" icon={Download} loading={exporting === t} onClick={() => exportCsv(t)}>
                {humanize(t)} CSV
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross merchandise value" icon={Banknote} loading={kpis.loading} value={formatINR(k?.gmvPaise)} hint={k ? `~${formatINR(k.estimatedCommissionPaise)} commission` : undefined} />
        <StatCard label="Paid orders" icon={Package} loading={kpis.loading} value={formatNumber(k?.totalOrders)} />
        <StatCard label="Live auctions" icon={Gavel} loading={kpis.loading} value={formatNumber(k?.liveAuctions)} hint={k ? `${formatNumber(k.endedAuctions)} ended` : undefined} />
        <StatCard label="Users" icon={Users} loading={kpis.loading} value={formatNumber(k?.totalUsers)} hint={k ? `${formatNumber(k.totalSellers)} sellers · ${formatNumber(k.activeListings)} listings` : undefined} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {queues.map(({ href, icon: Icon, label, count }) => (
          <Link key={href} href={href} className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-strong">
            <span className={count ? 'flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent' : 'flex size-11 items-center justify-center rounded-xl bg-subtle text-muted'}>
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="text-sm text-muted">{label}</p>
              {count === undefined ? <Skeleton className="mt-1 h-6 w-10" /> : <p className="tabular text-xl font-semibold">{count}</p>}
            </div>
            <ArrowRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="Recent staff activity" description="Every admin decision is recorded in the audit log." />
          {logs.loading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : !logs.data || logs.data.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted">No admin actions recorded yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {logs.data.slice(0, 12).map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm sm:px-6">
                  <div className="min-w-0">
                    <p className="font-medium">{humanize(l.action)}</p>
                    <p className="truncate text-muted">
                      {l.actor?.profile?.displayName || l.actor?.email || 'System'} · {l.entityType} <span className="tabular">{l.entityId.slice(0, 8)}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(l.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <p className="font-semibold">Shortcuts</p>
          <div className="mt-4 space-y-1">
            {[
              { href: '/admin/auctions', icon: Gavel, label: 'Monitor live auctions' },
              { href: '/admin/orders', icon: Package, label: 'Search orders' },
              { href: '/admin/users', icon: Users, label: 'Manage users' },
              { href: '/admin/categories', icon: Tags, label: 'Edit categories' },
            ].map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-subtle">
                <Icon className="size-4 text-muted" aria-hidden /> {label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
