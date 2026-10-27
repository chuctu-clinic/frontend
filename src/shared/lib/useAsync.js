import { useCallback, useEffect, useRef, useState } from 'react';

/** Tải dữ liệu khi deps đổi; trả về { data, error, loading, reload, setData }. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }));
      return null;
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — Phòng khám Chúc Từ` : 'Phòng khám Chúc Từ — Y học cổ truyền từ thiện';
  }, [title]);
}
