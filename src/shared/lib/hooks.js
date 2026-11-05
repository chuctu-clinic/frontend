import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

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

/** Vùng nhìn thấy được của phần tử: cắt bởi khung cuộn gần nhất (overflow khác visible) và cửa sổ. */
function visibleBounds(el) {
  let top = 0;
  let bottom = window.innerHeight;
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const style = getComputedStyle(p);
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
      const r = p.getBoundingClientRect();
      top = Math.max(top, r.top);
      bottom = Math.min(bottom, r.bottom);
      break;
    }
  }
  return { top, bottom };
}

/**
 * Chọn hướng mở cho menu thả của một dòng bảng: mở lên khi bên dưới không đủ chỗ mà bên trên đủ, tính theo khung thật
 * sự cắt menu (khung cuộn ngang của bảng trên màn hình hẹp cũng cắt theo chiều dọc), không chỉ theo cửa sổ. Tính lại
 * khi cuộn hay đổi kích thước lúc menu đang mở. Mở xuống mà vẫn bị che thì cuộn cho thấy đủ menu, chỉ sau khi đã chọn
 * hướng (không cuộn theo hướng cũ). Trả về { menuRef, up }; wrapRef là khối chứa nút mở menu.
 */
export function useMenuPlacement(open, wrapRef) {
  const menuRef = useRef(null);
  const [place, setPlace] = useState({ up: false, ready: false });

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const menu = menuRef.current;
    if (!wrap || !menu) return;
    const button = wrap.getBoundingClientRect();
    const height = menu.offsetHeight + 4;
    const { top, bottom } = visibleBounds(wrap);
    const up = button.bottom + height > bottom && button.top - height >= top;
    setPlace((p) => (p.up === up && p.ready ? p : { up, ready: true }));
  }, [wrapRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPlace({ up: false, ready: false });
      return undefined;
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, measure]);

  // Chạy khi đã chọn hướng xong (ready), nên không cuộn theo vị trí của lần mở trước
  useEffect(() => {
    if (open && place.ready && !place.up) menuRef.current?.scrollIntoView({ block: 'nearest' });
  }, [open, place.ready, place.up]);

  return { menuRef, up: place.up };
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
