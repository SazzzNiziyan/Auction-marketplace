'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, Clock, Gavel, Landmark, Sparkles, Store } from 'lucide-react';
import { Alert, Button, Card, CardHeader, Input, LinkButton, Select, Skeleton } from '../../../components/ui';
import { api, refreshSession } from '../../../lib/api';
import { isSellerRole, useAuth } from '../../../lib/auth';
import { useApi } from '../../../lib/use-api';
import { useToast } from '../../../lib/toast';
import { formatDate } from '../../../lib/format';

interface Application {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFO' | string;
  businessName: string;
  businessType: string;
  reviewNote?: string | null;
  submittedAt?: string;
  reviewedAt?: string | null;
}

const BUSINESS_TYPES = [
  { value: 'individual', label: 'Individual collector' },
  { value: 'artisan', label: 'Artisan / maker' },
  { value: 'sole_proprietor', label: 'Sole proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'private_limited', label: 'Private limited company' },
];

type Form = Record<
  'businessName' | 'businessType' | 'gstNumber' | 'panNumber' | 'bankAccountName' | 'bankAccountNo' | 'bankIfscCode' | 'businessAddressLine1' | 'businessCity' | 'businessState' | 'businessPincode',
  string
>;

const EMPTY: Form = {
  businessName: '',
  businessType: 'individual',
  gstNumber: '',
  panNumber: '',
  bankAccountName: '',
  bankAccountNo: '',
  bankIfscCode: '',
  businessAddressLine1: '',
  businessCity: '',
  businessState: '',
  businessPincode: '',
};

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {};
  if (f.businessName.trim().length < 2) e.businessName = 'Enter your store or business name';
  if (f.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(f.panNumber.trim())) e.panNumber = 'PAN should look like ABCDE1234F';
  if (f.gstNumber && f.gstNumber.trim().length !== 15) e.gstNumber = 'GSTIN is 15 characters';
  if (f.bankAccountName.trim().length < 2) e.bankAccountName = 'Enter the account holder name';
  if (!/^\d{9,18}$/.test(f.bankAccountNo.trim())) e.bankAccountNo = 'Account numbers are 9–18 digits';
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(f.bankIfscCode.trim())) e.bankIfscCode = 'IFSC should look like HDFC0001234';
  if (f.businessAddressLine1.trim().length < 5) e.businessAddressLine1 = 'Enter your business address';
  if (f.businessCity.trim().length < 2) e.businessCity = 'Enter a city';
  if (f.businessState.trim().length < 2) e.businessState = 'Enter a state';
  if (!/^\d{6}$/.test(f.businessPincode.trim())) e.businessPincode = 'Enter a 6-digit PIN code';
  return e;
}

function Hero() {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium text-accent">Sell on Auctio</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Reach serious buyers, live.</h1>
      <p className="mt-4 text-base text-ink-2 sm:text-lg">Run timed auctions or sell at a fixed price. Free to list, 5% commission on completed sales.</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Gavel, text: 'Auctions with deposits & reserves' },
          { icon: Sparkles, text: 'AI-written listings in seconds' },
          { icon: BadgeCheck, text: 'Verified-seller badge' },
        ].map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2.5 text-sm text-ink-2">
            <Icon className="size-4 shrink-0 text-accent" aria-hidden /> {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SellerApplyPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, ready } = useAuth();
  const { data: app, setData, loading } = useApi<Application | null>(ready && user ? '/seller/application' : null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [opening, setOpening] = useState(false);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`apply-${first}`)?.focus();
      return;
    }
    setSubmitting(true);
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, k === 'panNumber' || k === 'gstNumber' || k === 'bankIfscCode' ? v.trim().toUpperCase() : v.trim()]));
    if (!payload.gstNumber) delete payload.gstNumber;
    if (!payload.panNumber) delete payload.panNumber;
    const res = await api.post<Application>('/seller/apply', { ...payload, documents: [] });
    setSubmitting(false);
    if (res.success && res.data) {
      setData(res.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Application submitted', 'We’ll review it and update you here.');
    } else toast.error('Couldn’t submit application', res.message);
  };

  const openSellerHub = async () => {
    setOpening(true);
    const refreshed = await refreshSession();
    setOpening(false);
    if (refreshed && isSellerRole(refreshed.role)) router.push('/seller/dashboard');
    else toast.error('Couldn’t open the seller hub', 'Please sign out and sign back in.');
  };

  let body: React.ReactNode;

  if (!ready || (user && loading)) {
    body = <Skeleton className="h-96 rounded-2xl" />;
  } else if (!user) {
    body = (
      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Start with an Auctio account</h2>
        <p className="mt-1 text-sm text-muted">You’ll use the same account to buy and to manage your store.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <LinkButton href="/auth/register?next=/seller/apply" iconRight={ArrowRight}>Create account</LinkButton>
          <LinkButton href="/auth/login?next=/seller/apply" variant="secondary">I already have one</LinkButton>
        </div>
      </Card>
    );
  } else if (isSellerRole(user.role)) {
    body = (
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success"><Store className="size-6" aria-hidden /></span>
          <div>
            <h2 className="text-lg font-semibold">You’re already a seller</h2>
            <p className="text-sm text-muted">Manage listings, auctions and orders from your seller hub.</p>
          </div>
        </div>
        <LinkButton href="/seller/dashboard" iconRight={ArrowRight}>Open seller hub</LinkButton>
      </Card>
    );
  } else if (app && app.status !== 'REJECTED') {
    const approved = app.status === 'APPROVED';
    body = (
      <Card className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className={approved ? 'flex size-12 shrink-0 items-center justify-center rounded-full bg-success-soft text-success' : 'flex size-12 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning'}>
            {approved ? <CheckCircle2 className="size-6" aria-hidden /> : <Clock className="size-6" aria-hidden />}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{approved ? 'You’re approved!' : 'Application under review'}</h2>
            <p className="mt-1 text-sm text-muted">
              {approved
                ? `${app.businessName} is ready to sell.`
                : `We received the application for ${app.businessName}${app.submittedAt ? ` on ${formatDate(app.submittedAt)}` : ''}. Reviews usually take 1–2 business days.`}
            </p>
            {app.reviewNote && <p className="mt-3 rounded-lg bg-subtle px-3 py-2 text-sm text-ink-2">{app.reviewNote}</p>}
            {approved && (
              <Button className="mt-5" iconRight={ArrowRight} loading={opening} onClick={openSellerHub}>
                Open seller hub
              </Button>
            )}
          </div>
        </div>
        <ol className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
          {['Application submitted', 'Verification review', 'Start selling'].map((s, i) => {
            const done = approved || i === 0;
            return (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className={done ? 'flex size-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white' : 'flex size-7 items-center justify-center rounded-full bg-subtle text-xs font-semibold text-muted'}>{i + 1}</span>
                <span className={done ? 'font-medium' : 'text-muted'}>{s}</span>
              </li>
            );
          })}
        </ol>
      </Card>
    );
  } else {
    body = (
      <form onSubmit={submit} noValidate className="space-y-6">
        {app?.status === 'REJECTED' && (
          <Alert tone="danger" title="Your previous application wasn’t approved">
            {app.reviewNote || 'Please check your details and apply again.'}
          </Alert>
        )}
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Building2 className="size-4 text-muted" aria-hidden />Business details</span>} />
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <Input id="apply-businessName" label="Store name" required value={form.businessName} onChange={set('businessName')} error={errors.businessName} hint="Shown to buyers on your storefront." />
            <Select id="apply-businessType" label="Business type" required options={BUSINESS_TYPES} value={form.businessType} onChange={set('businessType')} />
            <Input id="apply-panNumber" label="PAN" value={form.panNumber} onChange={set('panNumber')} error={errors.panNumber} maxLength={10} className="uppercase" />
            <Input id="apply-gstNumber" label="GSTIN (if registered)" value={form.gstNumber} onChange={set('gstNumber')} error={errors.gstNumber} maxLength={15} className="uppercase" />
            <Input id="apply-businessAddressLine1" label="Business address" required value={form.businessAddressLine1} onChange={set('businessAddressLine1')} error={errors.businessAddressLine1} wrapperClassName="sm:col-span-2" />
            <Input id="apply-businessCity" label="City" required value={form.businessCity} onChange={set('businessCity')} error={errors.businessCity} />
            <Input id="apply-businessState" label="State" required value={form.businessState} onChange={set('businessState')} error={errors.businessState} />
            <Input id="apply-businessPincode" label="PIN code" required inputMode="numeric" maxLength={6} value={form.businessPincode} onChange={set('businessPincode')} error={errors.businessPincode} />
          </div>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Landmark className="size-4 text-muted" aria-hidden />Payout account</span>} description="Sales are paid out to this account after delivery." />
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <Input id="apply-bankAccountName" label="Account holder name" required value={form.bankAccountName} onChange={set('bankAccountName')} error={errors.bankAccountName} wrapperClassName="sm:col-span-2" />
            <Input id="apply-bankAccountNo" label="Account number" required inputMode="numeric" value={form.bankAccountNo} onChange={set('bankAccountNo')} error={errors.bankAccountNo} />
            <Input id="apply-bankIfscCode" label="IFSC" required maxLength={11} value={form.bankIfscCode} onChange={set('bankIfscCode')} error={errors.bankIfscCode} className="uppercase" />
          </div>
        </Card>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">By applying you agree to the <a href="/policies#sellers" className="underline">seller standards</a>.</p>
          <Button type="submit" size="lg" loading={submitting} iconRight={ArrowRight}>Submit application</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <Hero />
      <div className="mt-10">{body}</div>
    </div>
  );
}
