'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  Gavel,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  User,
  X,
} from 'lucide-react';
import Logo from './Logo';
import { Avatar, buttonClasses } from '../ui';
import { useAuth, isAdminRole, isSellerRole } from '../../lib/auth';
import { useCart } from '../../lib/cart';
import { useApi } from '../../lib/use-api';
import { cn } from '../../lib/format';
import type { ApiCategory } from '../../lib/types';

function SearchForm({ className, autoFocus, onDone }: { className?: string; autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  return (
    <form
      role="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        router.push(query ? `/explore?q=${encodeURIComponent(query)}` : '/explore');
        onDone?.();
      }}
    >
      <label htmlFor="global-search" className="sr-only">
        Search listings
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id="global-search"
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search watches, art, coins, sneakers…"
          className="h-11 w-full rounded-full border border-line-strong bg-surface pl-10 pr-4 text-ink placeholder:text-muted/80 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
        />
      </div>
    </form>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!user) return null;

  const links = [
    { href: '/buyer/orders', label: 'Orders', icon: Package },
    { href: '/buyer/bids', label: 'My bids', icon: Gavel },
    { href: '/buyer/wishlist', label: 'Watchlist', icon: Heart },
    { href: '/buyer/notifications', label: 'Notifications', icon: Bell },
    { href: '/buyer/profile', label: 'Account settings', icon: User },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-11 items-center gap-2 rounded-full pl-1 pr-2 hover:bg-subtle"
      >
        <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
        <ChevronDown className={cn('size-4 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
        <span className="sr-only">Open account menu</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 animate-rise rounded-xl border border-line bg-surface p-1.5 shadow-overlay">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">{user.displayName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          {isSellerRole(user.role) && (
            <Link role="menuitem" href="/seller/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-subtle">
              <Store className="size-4 text-muted" aria-hidden /> Seller hub
            </Link>
          )}
          {isAdminRole(user.role) && (
            <Link role="menuitem" href="/admin/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-subtle">
              <ShieldCheck className="size-4 text-muted" aria-hidden /> Admin console
            </Link>
          )}
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} role="menuitem" href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-subtle">
              <Icon className="size-4 text-muted" aria-hidden /> {label}
            </Link>
          ))}
          <div className="my-1 h-px bg-line" />
          <button
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await logout();
              router.push('/');
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-danger hover:bg-danger-soft"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function PublicHeader() {
  const pathname = usePathname();
  const { user, ready, logout } = useAuth();
  const { count } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: categories } = useApi<ApiCategory[]>('/catalog/categories');

  useEffect(() => {
    setDrawerOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const sellHref = user && isSellerRole(user.role) ? '/seller/listings/create' : '/seller/apply';
  const navLinks = [
    { href: '/explore?type=AUCTION', label: 'Live auctions', match: (p: string) => p.startsWith('/auction/') },
    { href: '/explore', label: 'Explore', match: (p: string) => p === '/explore' },
    { href: sellHref, label: 'Sell', match: (p: string) => p.startsWith('/seller') },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-lg supports-[backdrop-filter]:bg-canvas/80">
      <div className="container-page flex h-16 items-center gap-3 sm:gap-6">
        <button
          onClick={() => setDrawerOpen(true)}
          className="-ml-2 flex size-11 items-center justify-center rounded-lg text-ink hover:bg-subtle lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>

        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
                l.match(pathname) ? 'bg-subtle text-ink' : 'text-ink-2 hover:bg-subtle hover:text-ink'
              )}
            >
              {l.label === 'Live auctions' && <span className="live-dot size-1.5 rounded-full bg-live" aria-hidden />}
              {l.label}
            </Link>
          ))}
        </nav>

        <SearchForm className="mx-auto hidden w-full max-w-md md:block" />

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button
            onClick={() => setSearchOpen((s) => !s)}
            className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-subtle md:hidden"
            aria-label="Search"
            aria-expanded={searchOpen}
          >
            <Search className="size-5" />
          </button>
          {user && (
            <Link href="/buyer/wishlist" className="hidden size-11 items-center justify-center rounded-full text-ink hover:bg-subtle sm:flex" aria-label="Watchlist">
              <Heart className="size-5" />
            </Link>
          )}
          <Link href="/cart" className="relative flex size-11 items-center justify-center rounded-full text-ink hover:bg-subtle" aria-label={`Cart, ${count} items`}>
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="tabular absolute right-1 top-1 flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold leading-[18px] text-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>

          {!ready ? (
            <div className="ml-1 h-9 w-20" aria-hidden />
          ) : user ? (
            <AccountMenu />
          ) : (
            <div className="ml-1 hidden items-center gap-2 sm:flex">
              <Link href="/auth/login" className={buttonClasses('ghost', 'sm')}>
                Sign in
              </Link>
              <Link href="/auth/register" className={buttonClasses('primary', 'sm')}>
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>

      {searchOpen && (
        <div className="container-page animate-fade-in pb-3 md:hidden">
          <SearchForm autoFocus onDone={() => setSearchOpen(false)} />
        </div>
      )}

      {categories && categories.length > 0 && pathname !== '/' && !pathname.startsWith('/auth') && (
        <div className="hidden border-t border-line md:block">
          <nav aria-label="Categories" className="container-page scrollbar-none flex h-11 items-center gap-1 overflow-x-auto">
            {categories.slice(0, 14).map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors',
                  pathname === `/category/${c.slug}` ? 'bg-ink text-white' : 'text-ink-2 hover:bg-subtle hover:text-ink'
                )}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-fade-in bg-ink/40" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm animate-slide-in flex-col bg-surface shadow-overlay">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo />
              <button onClick={() => setDrawerOpen(false)} className="flex size-11 items-center justify-center rounded-lg hover:bg-subtle" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {user ? (
                <div className="mb-4 flex items-center gap-3 rounded-xl bg-subtle p-3">
                  <Avatar name={user.displayName} src={user.avatarUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user.displayName}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <Link href="/auth/login" className={buttonClasses('secondary', 'md')}>
                    Sign in
                  </Link>
                  <Link href="/auth/register" className={buttonClasses('primary', 'md')}>
                    Get started
                  </Link>
                </div>
              )}
              <nav className="space-y-1" aria-label="Mobile">
                {navLinks.map((l) => (
                  <Link key={l.label} href={l.href} className="flex h-11 items-center rounded-lg px-3 text-[15px] font-medium hover:bg-subtle">
                    {l.label}
                  </Link>
                ))}
                {user && (
                  <>
                    <div className="my-3 h-px bg-line" />
                    {isSellerRole(user.role) && (
                      <Link href="/seller/dashboard" className="flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] hover:bg-subtle">
                        <Store className="size-4 text-muted" /> Seller hub
                      </Link>
                    )}
                    {isAdminRole(user.role) && (
                      <Link href="/admin/dashboard" className="flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] hover:bg-subtle">
                        <LayoutDashboard className="size-4 text-muted" /> Admin console
                      </Link>
                    )}
                    <Link href="/buyer/orders" className="flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] hover:bg-subtle">
                      <Package className="size-4 text-muted" /> Orders
                    </Link>
                    <Link href="/buyer/bids" className="flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] hover:bg-subtle">
                      <Gavel className="size-4 text-muted" /> My bids
                    </Link>
                    <Link href="/buyer/wishlist" className="flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] hover:bg-subtle">
                      <Heart className="size-4 text-muted" /> Watchlist
                    </Link>
                    <Link href="/buyer/profile" className="flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] hover:bg-subtle">
                      <User className="size-4 text-muted" /> Account settings
                    </Link>
                  </>
                )}
              </nav>
              {categories && categories.length > 0 && (
                <>
                  <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-muted">Categories</p>
                  <div className="space-y-1">
                    {categories.map((c) => (
                      <Link key={c.id} href={`/category/${c.slug}`} className="flex h-10 items-center rounded-lg px-3 text-sm text-ink-2 hover:bg-subtle">
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
            {user && (
              <div className="border-t border-line p-4">
                <button
                  onClick={async () => {
                    await logout();
                    setDrawerOpen(false);
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-danger hover:bg-danger-soft"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
