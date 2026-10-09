'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { useAuth } from './auth';
import type { ApiCart } from './types';

interface CartContextValue {
  cart: ApiCart | null;
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
  add: (listingId: string, quantity?: number) => Promise<{ ok: boolean; message?: string }>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<{ ok: boolean; message?: string }>;
  remove: (cartItemId: string) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    setLoading(true);
    const res = await api.get<ApiCart>('/commerce/cart');
    if (res.success && res.data) setCart(res.data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (ready) refresh();
  }, [ready, refresh]);

  const add = useCallback(
    async (listingId: string, quantity = 1) => {
      const res = await api.post('/commerce/cart', { listingId, quantity });
      if (res.success) await refresh();
      return { ok: res.success, message: res.message };
    },
    [refresh]
  );

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      const res = await api.patch(`/commerce/cart/${cartItemId}`, { quantity });
      await refresh();
      return { ok: res.success, message: res.message };
    },
    [refresh]
  );

  const remove = useCallback(
    async (cartItemId: string) => {
      await api.del(`/commerce/cart/${cartItemId}`);
      await refresh();
    },
    [refresh]
  );

  const clear = useCallback(async () => {
    await api.del('/commerce/cart');
    await refresh();
  }, [refresh]);

  const count = cart?.items.reduce((n, i) => n + i.quantity, 0) || 0;

  const value = useMemo(
    () => ({ cart, count, loading, refresh, add, updateQuantity, remove, clear }),
    [cart, count, loading, refresh, add, updateQuantity, remove, clear]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
