'use client';

import React, { useMemo } from 'react';
import { Banknote, Percent, Receipt, Wallet } from 'lucide-react';
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, StatCard } from '../../../components/ui';
import { useApi } from '../../../lib/use-api';
import { formatDate, formatINR, humanize } from '../../../lib/format';
import type { ApiOrder } from '../../../lib/types';

interface Earnings {
  grossSalesPaise: number;
  platformFeePaise: number;
  netEarningsPaise: number;
  ledgerEntries: Array<{ id: string; entryType: string; amountPaise: number; description?: string | null; createdAt: string }>;
}

const PAID = ['PAYMENT_CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
const FEE_RATE = 0.05; // matches the backend's commission

export default function EarningsPage() {
  const { data, loading, error, reload } = useApi<Earnings>('/seller/earnings');
  const orders = useApi<ApiOrder[]>('/commerce/orders/seller');

  const months = useMemo(() => {
    const map = new Map<string, { label: string; gross: number; count: number }>();
    for (const o of orders.data || []) {
      if (!PAID.includes(o.status)) continue;
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const row = map.get(key) || { label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), gross: 0, count: 0 };
      row.gross += o.totalPaise;
      row.count += 1;
      map.set(key, row);
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? 1 : -1)).map(([, v]) => v);
  }, [orders.data]);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-8">
      <PageHeader title="Earnings" description="Sales from paid orders, less the 5% platform commission." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Gross sales" icon={Receipt} loading={loading} value={formatINR(data?.grossSalesPaise)} />
        <StatCard label="Platform fee (5%)" icon={Percent} loading={loading} value={formatINR(data?.platformFeePaise)} />
        <StatCard label="Net earnings" icon={Wallet} loading={loading} value={formatINR(data?.netEarningsPaise)} hint="Paid out after delivery" />
      </div>

      <Card>
        <CardHeader title="By month" description="Paid orders, including shipping charged." />
        {orders.loading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : months.length === 0 ? (
          <EmptyState className="m-5 border-0" icon={Banknote} title="No paid sales yet" description="Your monthly totals appear here once orders are paid." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th scope="col" className="px-5 py-3 font-medium sm:px-6">Month</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Orders</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Gross</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Fee</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium sm:px-6">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {months.map((m) => {
                  const fee = Math.round(m.gross * FEE_RATE);
                  return (
                    <tr key={m.label}>
                      <td className="px-5 py-3 font-medium sm:px-6">{m.label}</td>
                      <td className="tabular px-3 py-3 text-right">{m.count}</td>
                      <td className="tabular px-3 py-3 text-right">{formatINR(m.gross)}</td>
                      <td className="tabular px-3 py-3 text-right text-muted">−{formatINR(fee)}</td>
                      <td className="tabular px-5 py-3 text-right font-semibold sm:px-6">{formatINR(m.gross - fee)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && data.ledgerEntries.length > 0 && (
        <Card>
          <CardHeader title="Ledger" description="Payouts and adjustments recorded on your account." />
          <ul className="divide-y divide-line">
            {data.ledgerEntries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm sm:px-6">
                <div>
                  <p className="font-medium">{e.description || humanize(e.entryType)}</p>
                  <p className="text-muted">{formatDate(e.createdAt)}</p>
                </div>
                <p className={`tabular font-semibold ${e.amountPaise < 0 ? 'text-danger' : 'text-success'}`}>{formatINR(e.amountPaise)}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
