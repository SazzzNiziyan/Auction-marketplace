'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, Minus, Plus, ShoppingBag, Store, Trash2 } from 'lucide-react';
import { Alert, Button, Card, EmptyState, LinkButton, PageHeader, SafeImage, Skeleton } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useCart } from '../../lib/cart';
import { useToast } from '../../lib/toast';
import { cn, formatINR } from '../../lib/format';

export default function CartPage() {
  const { user, ready } = useAuth();
  const { cart, loading, updateQuantity, remove, clear } = useCart();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);

  if (ready && !user) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Sign in to see your cart"
          description="Your cart is saved to your account so it follows you across devices."
          action={<LinkButton href="/auth/login?next=/cart">Sign in</LinkButton>}
        />
      </div>
    );
  }

  if (!ready || (loading && !cart)) {
    return (
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {[0, 1].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const items = cart?.items || [];
  const unavailable = items.filter((i) => i.listing.status !== 'ACTIVE' || (i.listing.stockQuantity ?? 0) < i.quantity);

  const changeQty = async (id: string, qty: number) => {
    setPending(id);
    const res = await updateQuantity(id, qty);
    setPending(null);
    if (!res.ok) toast.error('Couldn’t update quantity', res.message);
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <PageHeader
        title="Your cart"
        description={items.length ? `${items.reduce((n, i) => n + i.quantity, 0)} ${items.reduce((n, i) => n + i.quantity, 0) === 1 ? 'item' : 'items'} from ${cart?.sellerGroups.length} ${cart?.sellerGroups.length === 1 ? 'seller' : 'sellers'}` : undefined}
        actions={items.length > 0 && <Button variant="ghost" size="sm" icon={Trash2} onClick={clear}>Clear cart</Button>}
      />

      {items.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Auction lots are bought by winning them. Buy-now items you add will show up here."
          action={<LinkButton href="/explore?type=FIXED_PRICE" iconRight={ArrowRight}>Shop buy-now items</LinkButton>}
        />
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {unavailable.length > 0 && (
              <Alert tone="warning" title="Some items need attention">
                {unavailable.length === 1 ? 'One item is' : `${unavailable.length} items are`} no longer available in the quantity selected. Update or remove them to check out.
              </Alert>
            )}
            {cart!.sellerGroups.map((group) => (
              <Card key={group.sellerId} as="section" aria-label={`Items from ${group.sellerName}`}>
                <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                  <Link href={`/store/${group.sellerId}`} className="flex items-center gap-2 text-sm font-medium hover:underline">
                    <Store className="size-4 text-muted" aria-hidden />
                    {group.sellerName}
                  </Link>
                  <span className="text-sm text-muted">Shipping {formatINR(group.shippingPaise)}</span>
                </div>
                <ul className="divide-y divide-line">
                  {group.items.map((item) => {
                    const l = item.listing;
                    const stock = l.stockQuantity ?? 0;
                    const problem = l.status !== 'ACTIVE' ? 'No longer available' : stock < item.quantity ? `Only ${stock} in stock` : null;
                    return (
                      <li key={item.id} className={cn('flex gap-4 p-5', pending === item.id && 'opacity-60')}>
                        <Link href={`/product/${l.id}`} className="shrink-0">
                          <SafeImage src={l.images?.[0]?.imageUrl} alt={l.title} className="size-20 rounded-xl sm:size-24" />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <Link href={`/product/${l.id}`} className="line-clamp-2 text-sm font-medium hover:underline sm:text-[15px]">
                              {l.title}
                            </Link>
                            <p className="tabular shrink-0 font-semibold">{formatINR((l.priceInPaise || 0) * item.quantity)}</p>
                          </div>
                          <p className="mt-0.5 text-sm text-muted">{formatINR(l.priceInPaise)} each</p>
                          {problem && <p className="mt-1 text-sm font-medium text-danger">{problem}</p>}
                          <div className="mt-auto flex items-center justify-between pt-3">
                            <div className="flex items-center rounded-lg border border-line-strong" role="group" aria-label={`Quantity for ${l.title}`}>
                              <button
                                onClick={() => changeQty(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || pending === item.id}
                                className="flex size-9 items-center justify-center disabled:opacity-40"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="size-4" />
                              </button>
                              <span className="tabular w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => changeQty(item.id, item.quantity + 1)}
                                disabled={item.quantity >= stock || pending === item.id}
                                className="flex size-9 items-center justify-center disabled:opacity-40"
                                aria-label="Increase quantity"
                              >
                                <Plus className="size-4" />
                              </button>
                            </div>
                            <button
                              onClick={() => remove(item.id)}
                              className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted hover:bg-danger-soft hover:text-danger"
                            >
                              <Trash2 className="size-4" aria-hidden />
                              <span className="hidden sm:inline">Remove</span>
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
          </div>

          <aside className="lg:sticky lg:top-32 lg:self-start">
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Order summary</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular font-medium">{formatINR(cart!.totalSubtotalPaise)}</dd></div>
                <div className="flex justify-between">
                  <dt className="text-muted">Shipping ({cart!.sellerGroups.length} {cart!.sellerGroups.length === 1 ? 'seller' : 'sellers'})</dt>
                  <dd className="tabular font-medium">{formatINR(cart!.totalShippingPaise)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-3 text-base">
                  <dt className="font-semibold">Total</dt>
                  <dd className="tabular font-semibold">{formatINR(cart!.grandTotalPaise)}</dd>
                </div>
              </dl>
              <LinkButton
                href="/checkout"
                size="lg"
                className={cn('mt-6 w-full', unavailable.length > 0 && 'pointer-events-none opacity-50')}
                aria-disabled={unavailable.length > 0}
                iconRight={ArrowRight}
              >
                Checkout
              </LinkButton>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
                <Lock className="size-3.5" aria-hidden /> Secure checkout · each seller ships separately
              </p>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
