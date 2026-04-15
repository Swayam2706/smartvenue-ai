/**
 * useApi — custom hook for data fetching with abort, caching, retry
 * Eliminates raw axios calls in components
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const cache = new Map();

export function useApi(url, options = {}) {
  const { 
    immediate = true, 
    cacheMs = 0,
    fallback = null,
    deps = []
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    // Check cache
    if (cacheMs > 0) {
      const cached = cache.get(url);
      if (cached && Date.now() - cached.ts < cacheMs) {
        setData(cached.data);
        setLoading(false);
        return cached.data;
      }
    }

    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await axios.get(url, { signal: abortRef.current.signal });
      const result = res.data;
      if (cacheMs > 0) cache.set(url, { data: result, ts: Date.now() });
      setData(result);
      return result;
    } catch (err) {
      if (axios.isCancel(err)) return;
      setError(err);
      if (fallback !== null) setData(fallback);
    } finally {
      setLoading(false);
    }
  }, [url, cacheMs]);

  useEffect(() => {
    if (immediate) fetch();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [url, ...deps]);

  return { data, loading, error, refetch: fetch };
}
