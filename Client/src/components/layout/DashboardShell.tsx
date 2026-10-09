'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Bell,
  ClipboardCheck,
  Gavel,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  RotateCcw,
  Scale,
  Settings,
  ShieldCheck,
  Store,
  Tags,
  Truck,
  User,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Logo from './Logo';
import { Avatar, Spinner } from '../ui';
import { useAuth, useRequireAuth } from '../../lib/auth';
import type { UserRole } from '../../lib/api';
import { cn } from '../../lib/format';

type Area = 'buyer' | 'seller' | 'admin';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: Record<Area, { title: string; roles?: UserRole[]; groups: Array<{ label?: string; items: NavItem[] }> }> = {
  buyer: {
    title: 'My account',
    groups: [
      {
        items: [
          { href: '/buyer/orders', label: 'Orders', icon: Package },
          { href: '/buyer/bids', label: 'My bids', icon: Gavel },
          { href: '/buyer/wishlist', label: 'Watchlist', icon: Heart },
          { href: '/buyer/refunds', label: 'Returns & refunds', icon: RotateCcw },
          { href: '/buyer/notifications', label: 'Notifications', icon: Bell },
          { href: '/buyer/profile', label: 'Account settings', icon: User },
        ],
      },
    ],
  },
  seller: {
    title: 'Seller hub',
    roles: ['SELLER', 'ADMIN', 'SUPER_ADMIN'],
    groups: [
      {
        items: [
          { href: '/seller/dashboard', label: 'Overview', icon: LayoutDashboard },
          { href: '/seller/listings/create', label: 'New listing', icon: PlusCircle },
        ],
      },
      {
        label: 'Catalogue',
        items: [
          { href: '/seller/inventory', label: 'Inventory', icon: Tags },
          { href: '/seller/auctions', label: 'Auctions', icon: Gavel },
        ],
      },
      {
        label: 'Sales',
        items: [
          { href: '/seller/orders', label: 'Orders', icon: Truck },
          { href: '/seller/disputes', label: 'Disputes', icon: Scale },
          { href: '/seller/earnings', label: 'Earnings', icon: Banknote },
        ],
      },
      { items: [{ href: '/seller/settings', label: 'Store settings', icon: Settings }] },
    ],
  },
  admin: {
    title: 'Admin console',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    groups: [
      { items: [{ href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard }] },
      {
        label: 'Trust & safety',
        items: [
          { href: '/admin/sellers', label: 'Seller applications', icon: ShieldCheck },
          { href: '/admin/moderation', label: 'Moderation', icon: ClipboardCheck },
          { href: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
        ],
      },
      {
        label: 'Operations',
        items: [
          { href: '/admin/auctions', label: 'Auctions', icon: Gavel },
          { href: '/admin/orders', label: 'Orders', icon: Package },
          { href: '/admin/users', label: 'Users', icon: Users },
          { href: '/admin/categories', label: 'Categories', icon: Tags },
        ],
      },
      { items: [{ href: '/admin/settings', label: 'Platform settings', icon: Settings }] },
    ],
  },
};

function isActive(pathname: string, href: string) {
  if (href === '/seller/listings/create') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ area, onNavigate }: { area: Area; onNavigate?: () => void }) {
  const pathname = usePathname() || '';
  return (
    <nav aria-label={NAV[area].title} className="space-y-6">
      {NAV[area].groups.map((g, gi) => (
        <div key={gi}>
          {g.label && <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      active ? 'bg-ink text-white' : 'text-ink-2 hover:bg-subtle hover:text-ink'
                    )}
                  >
                    <Icon className={cn('size-4', active ? 'text-white' : 'text-muted')} aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

const SUFFIX: Record<Area, string> = { buyer: 'Account', seller: 'Seller', admin: 'Admin' };

export default function DashboardShell({ area, children }: { area: Area; children: React.ReactNode }) {
  const { user, ready, allowed } = useRequireAuth(NAV[area].roles);
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [pathname]);

  if (!ready || !allowed || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Checking your access" />
      </div>
    );
  }

  const footer = (
    <div className="space-y-1 border-t border-line p-3">
      {area !== 'buyer' && (
        <Link href="/buyer/orders" className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-ink-2 hover:bg-subtle">
          <User className="size-4 text-muted" aria-hidden /> My account
        </Link>
      )}
      <Link href="/" className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-ink-2 hover:bg-subtle">
        <Store className="size-4 text-muted" aria-hidden /> Back to marketplace
      </Link>
      <div className="flex items-center gap-3 rounded-lg px-3 py-2">
        <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{user.displayName}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <button
          onClick={async () => {
            await logout();
            router.push('/');
          }}
          className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
          aria-label="Sign out"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-canvas lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Logo href={area === 'buyer' ? '/' : `/${area}/dashboard`} suffix={SUFFIX[area]} />
        </div>
        <div className="flex-1 overflow-y-auto p-3 pt-5">
          <SidebarNav area={area} />
        </div>
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-2 backdrop-blur lg:hidden">
        <button onClick={() => setDrawerOpen(true)} className="flex size-11 items-center justify-center rounded-lg hover:bg-subtle" aria-label="Open navigation">
          <Menu className="size-5" />
        </button>
        <Logo href={area === 'buyer' ? '/' : `/${area}/dashboard`} suffix={SUFFIX[area]} />
        <Link href="/" className="ml-auto flex size-11 items-center justify-center rounded-lg text-muted hover:bg-subtle" aria-label="Back to marketplace">
          <ArrowLeft className="size-5" />
        </Link>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 animate-fade-in bg-ink/40" onClick={() => setDrawerOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs animate-slide-in flex-col bg-surface shadow-overlay">
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              <p className="text-sm font-semibold">{NAV[area].title}</p>
              <button onClick={() => setDrawerOpen(false)} className="flex size-11 items-center justify-center rounded-lg hover:bg-subtle" aria-label="Close navigation">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 pt-4">
              <SidebarNav area={area} onNavigate={() => setDrawerOpen(false)} />
            </div>
            {footer}
          </aside>
        </div>
      )}

      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
