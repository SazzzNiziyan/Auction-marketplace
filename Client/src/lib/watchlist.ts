'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from './api';
import { useAuth } from './auth';
import { useToast } from './toast';
import type { Paginated } from './types';

/** Watch / unwatch a single listing against the user's real watchlist. */
export function useWatchToggle(listingId: string | undefined) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [watched, setWatched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !listingId) return;
    let cancelled = false;
    api.get<Paginated<{ listing: { id: string } }>>('/users/me/watchlist?limit=50').then((res) => {
      if (!cancelled && res.success && res.data) setWatched(res.data.items.some((i) => i.listing.id === listingId));
    });
    return () => {
      cancelled = true;
    };
  }, [user, listingId]);

  const toggle = useCallback(async () => {
    if (!listingId) return;
    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setBusy(true);
    const res = watched ? await api.del(`/users/me/watchlist/${listingId}`) : await api.post(`/users/me/watchlist/${listingId}`);
    setBusy(false);
    if (res.success || res.status === 409) {
      setWatched(!watched);
      toast.success(watched ? 'Removed from watchlist' : 'Saved to your watchlist');
    } else {
      toast.error('Couldn’t update watchlist', res.message);
    }
  }, [listingId, user, watched, router, pathname, toast]);

  return { watched, busy, toggle };
}
