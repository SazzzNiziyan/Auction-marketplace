'use client';

import React, { useEffect, useState } from 'react';
import { Ban, CheckCircle2, Search, Users } from 'lucide-react';
import { Avatar, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Select, Skeleton } from '../../../components/ui';
import { StatusBadge } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../lib/toast';
import { formatDate, humanize, timeAgo } from '../../../lib/format';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string | null;
  profile?: { displayName?: string; city?: string | null; state?: string | null } | null;
  _count: { bids: number; orders: number; listings: number };
}

export default function AdminUsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const qs = new URLSearchParams();
  if (debounced) qs.set('search', debounced);
  if (role) qs.set('role', role);
  if (status) qs.set('status', status);
  const { data, setData, loading, error, reload } = useApi<AdminUser[]>(`/admin/users${qs.toString() ? `?${qs}` : ''}`);

  const toggle = async () => {
    if (!target) return;
    const next = target.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    setBusy(true);
    const res = await api.patch(`/admin/users/${target.id}/status`, { status: next });
    setBusy(false);
    if (res.success) {
      setData((d) => (d ? d.map((u) => (u.id === target.id ? { ...u, status: next } : u)) : d));
      toast.success(next === 'SUSPENDED' ? 'User suspended' : 'User reactivated', target.email);
      setTarget(null);
    } else toast.error('Couldn’t update user', res.message);
  };

  return (
    <div>
      <PageHeader title="Users" description="Search accounts and suspend abusive users. Suspension signs the user out everywhere." />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Input aria-label="Search users" placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} leading={<Search className="size-4" />} wrapperClassName="sm:max-w-sm" />
        <Select aria-label="Role" placeholder="All roles" options={['BUYER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'].map((r) => ({ value: r, label: humanize(r) }))} value={role} onChange={(e) => setRole(e.target.value)} wrapperClassName="sm:w-44" />
        <Select aria-label="Status" placeholder="All statuses" options={['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DEACTIVATED'].map((s) => ({ value: s, label: humanize(s) }))} value={status} onChange={(e) => setStatus(e.target.value)} wrapperClassName="sm:w-52" />
      </div>

      <Card className="mt-6 overflow-hidden">
        {error ? (
          <ErrorState className="m-5 border-0" message={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState className="m-5 border-0" icon={Users} title="No users found" description="Try a different search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th scope="col" className="px-5 py-3 font-medium">User</th>
                  <th scope="col" className="px-3 py-3 font-medium">Role</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-3 py-3 font-medium">Activity</th>
                  <th scope="col" className="px-3 py-3 font-medium">Joined</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.map((u) => (
                  <tr key={u.id} className="hover:bg-subtle/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.profile?.displayName || u.email} size="sm" />
                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate font-medium">{u.profile?.displayName || '—'}</p>
                          <p className="max-w-[220px] truncate text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{humanize(u.role)}</td>
                    <td className="px-3 py-3"><StatusBadge kind="generic" status={u.status} /></td>
                    <td className="tabular px-3 py-3 text-ink-2">
                      {u._count.orders} orders · {u._count.bids} bids{u._count.listings ? ` · ${u._count.listings} listings` : ''}
                      <p className="text-xs text-muted">{u.lastLoginAt ? `Last seen ${timeAgo(u.lastLoginAt)}` : 'Never signed in'}</p>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      {u.id !== me?.id && u.role !== 'SUPER_ADMIN' && (
                        u.status === 'SUSPENDED' ? (
                          <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => setTarget(u)}>Reactivate</Button>
                        ) : (
                          <Button size="sm" variant="ghost" icon={Ban} className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setTarget(u)}>Suspend</Button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        size="sm"
        title={target?.status === 'SUSPENDED' ? 'Reactivate this user?' : 'Suspend this user?'}
        description={target?.email}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button>
            <Button variant={target?.status === 'SUSPENDED' ? 'primary' : 'danger'} loading={busy} onClick={toggle}>
              {target?.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend user'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          {target?.status === 'SUSPENDED'
            ? 'They’ll be able to sign in, bid and buy again.'
            : 'They’ll be signed out immediately and won’t be able to sign in, bid or sell until reactivated.'}
        </p>
      </Modal>
    </div>
  );
}
