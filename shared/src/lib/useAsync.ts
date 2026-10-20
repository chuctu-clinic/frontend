import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import type { ApiError } from './api.ts';

interface AsyncState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

/** Tải dữ liệu khi deps đổi; trả về { data, error, loading, reload, setData }. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      setState((s) => ({ ...s, error: error as ApiError, loading: false }));
      return null;
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((updater: T | null | ((prev: T | null) => T | null)) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? (updater as (prev: T | null) => T | null)(s.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}

/** Chạy một thao tác (gửi form, bấm nút) với trạng thái đang xử lý và lỗi. */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const run = useCallback(
    async (...args: A) => {
      setPending(true);
      setError(null);
      try {
        return await fn(...args);
      } catch (err) {
        setError(err as ApiError);
        throw err;
      } finally {
        setPending(false);
      }
    },
    [fn],
  );
  return { run, pending, error, setError };
}

export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} — Phòng khám Chúc Từ` : 'Phòng khám Chúc Từ — Y học cổ truyền từ thiện';
  }, [title]);
}
