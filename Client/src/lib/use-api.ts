'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from './api';

/**
 * Fetch a JSON endpoint on mount (and whenever `endpoint` changes).
 * Pass `null` to skip fetching (e.g. until auth is ready).
 */
export function useApi<T>(endpoint: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(endpoint !== null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!endpoint) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    const res = await apiRequest<T>(endpoint);
    if (id !== requestId.current) return; // a newer request superseded this one
    if (res.success) setData((res.data ?? null) as T | null);
    else setError(res.message || 'Request failed');
    setLoading(false);
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, setData, error, loading, reload: load };
}
