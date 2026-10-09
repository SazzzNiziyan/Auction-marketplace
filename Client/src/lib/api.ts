export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const API_BASE = `${API_ORIGIN}/api/v1`;

const TOKEN_KEY = 'auctio_token';
const REFRESH_KEY = 'auctio_refresh_token';
const USER_KEY = 'auctio_user';

export type UserRole = 'BUYER' | 'SELLER' | 'ADMIN' | 'SUPER_ADMIN';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  avatarUrl?: string | null;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  status?: number;
}

function hasWindow() {
  return typeof window !== 'undefined';
}

export function getToken(): string | null {
  return hasWindow() ? localStorage.getItem(TOKEN_KEY) : null;
}

export function getRefreshToken(): string | null {
  return hasWindow() ? localStorage.getItem(REFRESH_KEY) : null;
}

export function getCurrentUser(): SessionUser | null {
  if (!hasWindow()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: { accessToken: string; refreshToken?: string; user: SessionUser }) {
  if (!hasWindow()) return;
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  if (session.refreshToken) localStorage.setItem(REFRESH_KEY, session.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  window.dispatchEvent(new Event('authchange'));
}

export function clearSession() {
  if (!hasWindow()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event('authchange'));
}

let refreshInFlight: Promise<string | null> | null = null;

// Silent refresh; concurrent 401s share one refresh request.
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          clearSession();
          return null;
        }
        const body = await res.json();
        if (body.success && body.data?.accessToken) {
          saveSession(body.data);
          return body.data.accessToken as string;
        }
      } catch {
        // network error — keep tokens so the next request can retry
      }
      return null;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

/** Re-issue tokens now — used after a role change (e.g. seller approval). */
export async function refreshSession(): Promise<SessionUser | null> {
  const token = await refreshAccessToken();
  return token ? getCurrentUser() : null;
}

export async function apiRequest<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    let res = await fetch(url, { ...options, headers });

    if (res.status === 401 && token) {
      const fresh = await refreshAccessToken();
      if (fresh) {
        headers.Authorization = `Bearer ${fresh}`;
        res = await fetch(url, { ...options, headers });
      }
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        code: body.code,
        message: body.message || `Request failed (${res.status})`,
      };
    }
    return { ...body, status: res.status };
  } catch {
    return {
      success: false,
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the Auctio servers. Check your connection and try again.',
    };
  }
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};

// Authenticated file download (used for admin CSV exports).
export async function downloadFile(endpoint: string, filename: string): Promise<boolean> {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
    return true;
  } catch {
    return false;
  }
}
