'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Lock, MapPin, ShieldCheck, Store } from 'lucide-react';
import { Alert, Button, Card, Checkbox, EmptyState, Input, LinkButton, SafeImage, Select, Skeleton, Textarea } from '../../components/ui';
import { api } from '../../lib/api';
import { useRequireAuth } from '../../lib/auth';
import { useCart } from '../../lib/cart';
import { useToast } from '../../lib/toast';
import { canCollectPayment, collectPayment } from '../../lib/razorpay';
import { cn, formatINR } from '../../lib/format';
import type { ApiOrder } from '../../lib/types';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
].map((s) => ({ value: s, label: s }));

interface Address {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
}

const EMPTY: Address = { fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' };

function validate(a: Address) {
  const e: Partial<Record<keyof Address, string>> = {};
  if (a.fullName.trim().length < 2) e.fullName = 'Enter the recipient’s full name';
  if (a.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit mobile number';
  if (a.addressLine1.trim().length < 5) e.addressLine1 = 'Enter a house number and street';
  if (a.city.trim().length < 2) e.city = 'Enter a city';
  if (!a.state) e.state = 'Choose a state';
  if (!/^\d{6}$/.test(a.pincode.trim())) e.pincode = 'Enter a 6-digit PIN code';
  return e;
}

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, allowed } = useRequireAuth();
  const { cart, loading: cartLoading, refresh } = useCart();
  const [address, setAddress] = useState<Address>(EMPTY);
  const [notes, setNotes] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const [step, setStep] = useState<'address' | 'review'>('address');
  const [placing, setPlacing] = useState(false);

  // Prefill from the saved profile address.
  useEffect(() => {
    if (!allowed) return;
    api.get<{ profile?: Partial<Address> & { displayName?: string } }>('/users/me').then((res) => {
      const p = res.data?.profile;
      if (!p) return;
      setAddress((a) => ({
        fullName: a.fullName || p.displayName || '',
        phone: a.phone || p.phone || '',
        addressLine1: a.addressLine1 || p.addressLine1 || '',
        addressLine2: a.addressLine2 || p.addressLine2 || '',
        city: a.city || p.city || '',
        state: a.state || p.state || '',
        pincode: a.pincode || p.pincode || '',
      }));
    });
  }, [allowed]);

  if (!allowed || (cartLoading && !cart)) {
    return (
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_400px]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={Store} title="Nothing to check out" description="Add buy-now items to your cart first." action={<LinkButton href="/explore?type=FIXED_PRICE">Browse items</LinkButton>} />
      </div>
    );
  }

  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAddress((a) => ({ ...a, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const continueToReview = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(address);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`addr-${first}`)?.focus();
      return;
    }
    setStep('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const placeOrder = async () => {
    setPlacing(true);
    if (saveAddress) {
      api.patch('/users/me', {
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || undefined,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      });
    }

    const res = await api.post<{ orders: ApiOrder[]; razorpayOrder: { id: string; amount: number; currency: string }; grandTotalPaise: number }>(
      '/commerce/checkout',
      { shippingAddress: { ...address, addressLine2: address.addressLine2 || undefined, country: 'IN' }, notes: notes || undefined }
    );

    if (!res.success || !res.data) {
      setPlacing(false);
      toast.error('Couldn’t place your order', res.message);
      return;
    }

    const orderIds = res.data.orders.map((o) => o.id).join(',');
    let paid = '0';
    if (canCollectPayment(res.data.razorpayOrder)) {
      const result = await collectPayment(res.data.razorpayOrder, { name: address.fullName, email: user?.email, contact: address.phone });
      if (result.status === 'paid') paid = '1';
      else if (result.status === 'failed') toast.error('Payment didn’t go through', result.message || 'Your order is saved — you can retry from your orders.');
    }

    await refresh();
    router.push(`/checkout/confirmation?orders=${orderIds}&paid=${paid}`);
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <Link href="/cart" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Back to cart
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Checkout</h1>

      <ol className="mt-6 flex items-center gap-3 text-sm" aria-label="Checkout progress">
        {[
          { key: 'address', label: 'Delivery' },
          { key: 'review', label: 'Review & pay' },
        ].map((s, i) => {
          const done = step === 'review' && s.key === 'address';
          const current = step === s.key;
          return (
            <li key={s.key} className="flex items-center gap-3" aria-current={current ? 'step' : undefined}>
              {i > 0 && <span className="h-px w-8 bg-line-strong" aria-hidden />}
              <span className={cn('flex size-7 items-center justify-center rounded-full text-xs font-semibold', done ? 'bg-success text-white' : current ? 'bg-ink text-white' : 'bg-subtle text-muted')}>
                {done ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              <span className={current ? 'font-medium text-ink' : 'text-muted'}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div>
          {step === 'address' ? (
            <Card className="p-5 sm:p-7">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><MapPin className="size-5 text-muted" aria-hidden />Delivery address</h2>
              <form onSubmit={continueToReview} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
                <Input id="addr-fullName" label="Full name" required autoComplete="name" value={address.fullName} onChange={set('fullName')} error={errors.fullName} />
                <Input id="addr-phone" label="Mobile number" required type="tel" inputMode="tel" autoComplete="tel" value={address.phone} onChange={set('phone')} error={errors.phone} />
                <Input id="addr-addressLine1" label="Address" required autoComplete="address-line1" placeholder="House no., building, street" value={address.addressLine1} onChange={set('addressLine1')} error={errors.addressLine1} wrapperClassName="sm:col-span-2" />
                <Input id="addr-addressLine2" label="Landmark / area" autoComplete="address-line2" value={address.addressLine2} onChange={set('addressLine2')} wrapperClassName="sm:col-span-2" />
                <Input id="addr-city" label="City" required autoComplete="address-level2" value={address.city} onChange={set('city')} error={errors.city} />
                <Input id="addr-pincode" label="PIN code" required inputMode="numeric" autoComplete="postal-code" maxLength={6} value={address.pincode} onChange={set('pincode')} error={errors.pincode} />
                <Select id="addr-state" label="State" required placeholder="Select state" options={STATES} value={address.state} onChange={set('state')} error={errors.state} wrapperClassName="sm:col-span-2" />
                <Textarea label="Delivery notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, preferred delivery time…" wrapperClassName="sm:col-span-2" />
                <Checkbox label="Save this address to my account" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="sm:col-span-2" />
                <div className="sm:col-span-2">
                  <Button type="submit" size="lg" className="w-full sm:w-auto">Continue to review</Button>
                </div>
              </form>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">Delivering to</h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-2">
                      {address.fullName} · {address.phone}
                      <br />
                      {address.addressLine1}
                      {address.addressLine2 && `, ${address.addressLine2}`}
                      <br />
                      {address.city}, {address.state} {address.pincode}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setStep('address')}>Change</Button>
                </div>
              </Card>

              {cart.sellerGroups.map((g) => (
                <Card key={g.sellerId}>
                  <div className="flex items-center justify-between border-b border-line px-5 py-3.5 text-sm">
                    <span className="flex items-center gap-2 font-medium"><Store className="size-4 text-muted" aria-hidden />{g.sellerName}</span>
                    <span className="text-muted">Ships separately</span>
                  </div>
                  <ul className="divide-y divide-line">
                    {g.items.map((it) => (
                      <li key={it.id} className="flex items-center gap-4 px-5 py-4">
                        <SafeImage src={it.listing.images?.[0]?.imageUrl} alt="" className="size-14 rounded-lg" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium">{it.listing.title}</p>
                          <p className="text-sm text-muted">Qty {it.quantity}</p>
                        </div>
                        <p className="tabular text-sm font-semibold">{formatINR((it.listing.priceInPaise || 0) * it.quantity)}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Items</dt><dd className="tabular font-medium">{formatINR(cart.totalSubtotalPaise)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="tabular font-medium">{formatINR(cart.totalShippingPaise)}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-base"><dt className="font-semibold">Total</dt><dd className="tabular font-semibold">{formatINR(cart.grandTotalPaise)}</dd></div>
            </dl>
            {step === 'review' ? (
              <Button size="lg" variant="accent" icon={Lock} loading={placing} onClick={placeOrder} className="mt-6 w-full">
                Place order · {formatINR(cart.grandTotalPaise)}
              </Button>
            ) : (
              <p className="mt-6 text-sm text-muted">Confirm your delivery address to continue.</p>
            )}
            {!canCollectPayment({ id: 'probe', amount: 0, currency: 'INR' }) && step === 'review' && (
              <Alert tone="warning" className="mt-4">
                Online payment isn’t configured in this environment, so your order will be saved as awaiting payment.
              </Alert>
            )}
            <p className="mt-4 flex items-start gap-2 text-xs text-muted">
              <ShieldCheck className="size-4 shrink-0" aria-hidden /> Payments are handled by Razorpay. Auctio never sees your card details.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
