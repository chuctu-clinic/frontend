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

/** Đóng khối nổi (lịch, menu) khi bấm ra ngoài hoặc bấm Esc. */
export function useDismiss(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    const key = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open, onClose]);
  return ref;
}

/**
 * Hành vi chung của hộp thoại: mở ra thì đưa con trỏ vào phần tử đầu tiên khớp `focusFirst` (thử lần lượt),
 * khoá cuộn trang, đóng thì trả con trỏ về chỗ cũ; Esc để đóng, phím Tab không chạy ra ngoài.
 * Trả về { ref, onKeyDown } để gắn vào khung hộp thoại.
 */
export function useModal(onClose, focusFirst = ['input, select, textarea', 'button']) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    for (const sel of focusFirst) {
      const el = ref.current?.querySelector(sel);
      if (el) {
        el.focus();
        break;
      }
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !ref.current) return;
    const items = ref.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, a[href]');
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  return { ref, onKeyDown };
}
