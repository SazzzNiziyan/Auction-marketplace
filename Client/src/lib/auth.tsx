'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, clearSession, getCurrentUser, getRefreshToken, saveSession, type SessionUser, type UserRole } from './api';

interface AuthContextValue {
  user: SessionUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string; user?: SessionUser }>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<SessionUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setUser(getCurrentUser());
    sync();
    setReady(true);
    window.addEventListener('authchange', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('authchange', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthPayload>('/auth/login', { email, password });
    if (!res.success || !res.data) return { ok: false, message: res.message || 'Invalid email or password' };
    saveSession(res.data);
    return { ok: true, user: res.data.user };
  }, []);

  const register = useCallback(async (input: { email: string; password: string; displayName: string }) => {
    const res = await api.post<AuthPayload>('/auth/register', input);
    if (!res.success || !res.data) return { ok: false, message: res.message || 'Registration failed' };
    saveSession(res.data);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) await api.post('/auth/logout', { refreshToken });
    clearSession();
  }, []);

  const updateUser = useCallback((patch: Partial<SessionUser>) => {
    const current = getCurrentUser();
    if (!current) return;
    const next = { ...current, ...patch };
    localStorage.setItem('auctio_user', JSON.stringify(next));
    window.dispatchEvent(new Event('authchange'));
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout, updateUser }), [user, ready, login, register, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const isAdminRole = (role?: UserRole) => role === 'ADMIN' || role === 'SUPER_ADMIN';
export const isSellerRole = (role?: UserRole) => role === 'SELLER' || isAdminRole(role);

/**
 * Client-side gate for signed-in areas. The API enforces roles too — this only
 * decides what to render and where to send the visitor.
 */
export function useRequireAuth(roles?: UserRole[]) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = !!user && (!roles || roles.includes(user.role));

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    } else if (roles && !roles.includes(user.role)) {
      router.replace(`/auth/access-denied?from=${encodeURIComponent(pathname)}`);
    }
  }, [ready, user, roles, router, pathname]);

  return { user, ready, allowed };
}
