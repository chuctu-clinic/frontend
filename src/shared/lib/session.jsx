import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { api, setApiSession } from './api.js';

const SessionContext = createContext(null);

// Cookie đăng nhập là chung cho mọi tab của trình duyệt. Khi tab khác đăng nhập tài khoản khác (hoặc đăng xuất),
// tab này phải tải lại theo phiên mới, không được tiếp tục hiển thị và thao tác dưới tên người cũ.
const SWITCHED_KEY = 'ct-session-switched';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ct-session') : null;

function reloadForNewSession(user) {
  try {
    sessionStorage.setItem(SWITCHED_KEY, user?.fullName || '');
  } catch {
    /* không lưu được thì vẫn tải lại */
  }
  window.location.reload();
}

function readSwitched() {
  try {
    const v = sessionStorage.getItem(SWITCHED_KEY);
    sessionStorage.removeItem(SWITCHED_KEY);
    return v;
  } catch {
    return null;
  }
}
// Đọc một lần khi tải trang (không đọc trong useState vì StrictMode gọi hai lần, lần sau đã bị xoá)
const SWITCHED_AT_LOAD = typeof window !== 'undefined' ? readSwitched() : null;

/** Thông báo sau khi tab tự tải lại vì phiên đăng nhập đã đổi ở tab khác. */
function SwitchedNotice({ name, onClose }) {
  return (
    <div className="session-switched" role="status">
      <Icon name="info" size={22} />
      <p>
        {name
          ? `Trình duyệt này vừa được đăng nhập bằng tài khoản ${name} ở một thẻ khác, nên trang đã tải lại theo tài khoản đó.`
          : 'Tài khoản đã đăng xuất ở một thẻ khác, nên trang đã tải lại.'}{' '}
        Mỗi người nên dùng một trình duyệt hoặc một hồ sơ Chrome riêng.
      </p>
      <button type="button" onClick={onClose} aria-label="Đóng thông báo">
        <Icon name="x" size={20} />
      </button>
    </div>
  );
}

export function SessionProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined: đang tải
  const [meta, setMeta] = useState(null);
  const [switched, setSwitched] = useState(SWITCHED_AT_LOAD);
  const userRef = useRef(undefined);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.user);
      return res.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  /** Hỏi lại server phiên hiện tại; khác tài khoản tab đang hiển thị thì tải lại trang. */
  const recheck = useCallback(async () => {
    const shown = userRef.current;
    if (shown === undefined) return;
    const res = await api.get('/auth/me').catch(() => null);
    if (!res) return;
    if ((res.user?.id ?? null) !== (shown?.id ?? null)) reloadForNewSession(res.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
  }, []);

  useEffect(() => {
    refresh();
    api.get('/meta').then(setMeta).catch(() => setMeta(null));
  }, [refresh]);

  // Tài khoản của tab đổi (đăng nhập, đăng xuất ngay tại tab này): báo server và các tab khác
  useEffect(() => {
    const prev = userRef.current;
    userRef.current = user;
    setApiSession(user?.id, recheck);
    if (prev !== undefined && (prev?.id ?? null) !== (user?.id ?? null)) channel?.postMessage('changed');
  }, [user, recheck]);

  // Tab được mở lại, hoặc tab khác vừa đổi tài khoản: kiểm tra lại phiên
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && recheck();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', recheck);
    if (channel) channel.onmessage = recheck;
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', recheck);
      if (channel) channel.onmessage = null;
    };
  }, [recheck]);

  return (
    <SessionContext.Provider value={{ user, setUser, refresh, logout, meta, loading: user === undefined }}>
      {switched !== null && <SwitchedNotice name={switched} onClose={() => setSwitched(null)} />}
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

export const isStaff = (user) => user && (user.role === 'RECEPTIONIST' || user.role === 'ADMIN');
export const isAdmin = (user) => user?.role === 'ADMIN';
