'use client';

import React from 'react';
import { AuthProvider } from '../lib/auth';
import { CartProvider } from '../lib/cart';
import { ToastProvider } from '../lib/toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
