'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound, Store, UserRound } from 'lucide-react';
import { Avatar, Button, Card, CardHeader, ErrorState, Input, LinkButton, PageHeader, Skeleton, Textarea } from '../../../components/ui';
import { PasswordField, passwordIsStrong } from '../../../components/PasswordField';
import { StatusBadge } from '../../../components/marketplace';
import { useApi } from '../../../lib/use-api';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../lib/toast';
import { formatDate, humanize } from '../../../lib/format';

interface Me {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  emailVerifiedAt?: string | null;
  profile?: {
    displayName?: string;
    bio?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    avatarUrl?: string | null;
  } | null;
}

type ProfileForm = Required<Record<'displayName' | 'bio' | 'phone' | 'addressLine1' | 'addressLine2' | 'city' | 'state' | 'pincode' | 'avatarUrl', string>>;

const EMPTY: ProfileForm = { displayName: '', bio: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', avatarUrl: '' };

export default function ProfilePage() {
  const toast = useToast();
  const { updateUser } = useAuth();
  const { data: me, loading, error, reload } = useApi<Me>('/users/me');
  const application = useApi<{ status: string; businessName: string; reviewNote?: string | null } | null>('/seller/application');
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (!me) return;
    const p = me.profile || {};
    setForm({
      displayName: p.displayName || '',
      bio: p.bio || '',
      phone: p.phone || '',
      addressLine1: p.addressLine1 || '',
      addressLine2: p.addressLine2 || '',
      city: p.city || '',
      state: p.state || '',
      pincode: p.pincode || '',
      avatarUrl: p.avatarUrl || '',
    });
  }, [me]);

  const set = (k: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Only send non-empty values — the API validates URLs and minimum lengths.
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, v.trim()]));
    const res = await api.patch('/users/me', payload);
    setSaving(false);
    if (res.success) {
      updateUser({ displayName: form.displayName, avatarUrl: form.avatarUrl || null });
      toast.success('Profile saved');
    } else toast.error('Couldn’t save profile', res.message);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChanging(true);
    const res = await api.post('/users/me/change-password', { currentPassword: current, newPassword: next });
    setChanging(false);
    if (res.success) {
      setCurrent('');
      setNext('');
      toast.success('Password changed', 'Other devices have been signed out.');
    } else toast.error('Couldn’t change password', res.message);
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !me) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const app = application.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Account settings" description="Manage your profile, delivery address and password." />

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <Avatar name={form.displayName || me.email} src={form.avatarUrl || undefined} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{form.displayName || me.email}</p>
          <p className="truncate text-sm text-muted">{me.email}</p>
          <p className="mt-1 text-sm text-muted">
            {humanize(me.role)} · Member since {formatDate(me.createdAt, { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><UserRound className="size-4 text-muted" aria-hidden />Profile & address</span>} description="Your address prefills at checkout." />
        <form onSubmit={saveProfile} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <Input label="Display name" required minLength={2} value={form.displayName} onChange={set('displayName')} autoComplete="name" />
          <Input label="Mobile number" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
          <Textarea label="Bio" rows={3} maxLength={500} value={form.bio} onChange={set('bio')} wrapperClassName="sm:col-span-2" hint="Shown on your public profile and storefront." />
          <Input label="Avatar image URL" type="url" placeholder="https://" value={form.avatarUrl} onChange={set('avatarUrl')} wrapperClassName="sm:col-span-2" />
          <Input label="Address" value={form.addressLine1} onChange={set('addressLine1')} autoComplete="address-line1" wrapperClassName="sm:col-span-2" />
          <Input label="Landmark / area" value={form.addressLine2} onChange={set('addressLine2')} autoComplete="address-line2" wrapperClassName="sm:col-span-2" />
          <Input label="City" value={form.city} onChange={set('city')} autoComplete="address-level2" />
          <Input label="State" value={form.state} onChange={set('state')} autoComplete="address-level1" />
          <Input label="PIN code" inputMode="numeric" maxLength={6} value={form.pincode} onChange={set('pincode')} autoComplete="postal-code" />
          <div className="flex items-end justify-end sm:col-span-2">
            <Button type="submit" loading={saving}>Save changes</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><KeyRound className="size-4 text-muted" aria-hidden />Password</span>} description="Changing your password signs you out everywhere else." />
        <form onSubmit={changePassword} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <PasswordField label="Current password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          <PasswordField label="New password" autoComplete="new-password" required showRules value={next} onChange={(e) => setNext(e.target.value)} />
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" variant="secondary" loading={changing} disabled={!current || !passwordIsStrong(next)}>Update password</Button>
          </div>
        </form>
      </Card>

      {me.role === 'BUYER' && (
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Store className="size-4 text-muted" aria-hidden />Selling on Auctio</span>} />
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            {app ? (
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{app.businessName}</p>
                  <StatusBadge kind="generic" status={app.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{app.status === 'PENDING' ? 'Your application is being reviewed.' : app.reviewNote || 'See the application page for details.'}</p>
              </div>
            ) : (
              <p className="text-sm text-muted">Run auctions and sell fixed-price items to buyers across India.</p>
            )}
            <LinkButton href="/seller/apply" variant={app ? 'secondary' : 'primary'}>{app ? 'View application' : 'Apply to sell'}</LinkButton>
          </div>
        </Card>
      )}
    </div>
  );
}
