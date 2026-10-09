'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import DashboardShell from '../../components/layout/DashboardShell';

// The application and onboarding pages are for buyers who are not sellers
// yet, so they render inside the public site instead of the seller hub.
const PUBLIC_PAGES = ['/seller/apply', '/seller/onboarding'];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (PUBLIC_PAGES.includes(pathname)) return <>{children}</>;
  return <DashboardShell area="seller">{children}</DashboardShell>;
}
