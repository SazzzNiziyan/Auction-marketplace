'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import PublicHeader from './PublicHeader';
import Footer from './Footer';
import AIChatWidget from '../AIChatWidget';

// Dashboards (buyer / seller / admin) render their own shell; the seller
// application flow stays inside the public site.
const DASHBOARD_PREFIXES = ['/admin', '/buyer', '/seller'];
const PUBLIC_SELLER_PAGES = ['/seller/apply', '/seller/onboarding'];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const isDashboard =
    DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !PUBLIC_SELLER_PAGES.includes(pathname);
  const isAuth = pathname.startsWith('/auth');

  if (isDashboard) {
    return (
      <>
        {children}
        <AIChatWidget />
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      {!isAuth && <Footer />}
      {!isAuth && <AIChatWidget />}
    </div>
  );
}
