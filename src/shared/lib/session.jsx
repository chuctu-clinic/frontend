import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { api, setApiSession } from './api.js';
import { ROLE_LABELS } from './format.js';

const SessionContext = createContext(null);

// Cookie đăng nhập là chung cho mọi tab của trình duyệt. Khi tab khác đăng nhập tài khoản khác (hoặc đăng xuất),
// tab này phải tải lại theo phiên mới, không được tiếp tục hiển thị và thao tác dưới tên người cũ.
const SWITCHED_KEY = 'ct-session-switched';
const ROLE_CHANGED_KEY = 'ct-session-role-changed';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ct-session') : null;

function reloadForNewSession(user) {
  try {
    sessionStorage.setItem(SWITCHED_KEY, user?.fullName || '');
  } catch {
    /* không lưu được thì vẫn tải lại */
  }
  window.location.reload();
}

/** Vai trò vừa bị Admin đổi: quyền trên trang đang mở không còn đúng nên phải tải lại. */
function reloadForNewRole(user) {
  const password = user.mustChangePassword ? ' Cô chú hỏi quản trị viên mật khẩu tạm để vào khu nội bộ.' : '';
  try {
    sessionStorage.setItem(ROLE_CHANGED_KEY, `Vai trò tài khoản của cô chú vừa được đổi thành ${ROLE_LABELS[user.role]}.${password}`);
  } catch {
    /* không lưu được thì vẫn tải lại */
  }
  // Hết quyền nội bộ thì về trang chủ, không ở lại trang đăng nhập nội bộ
  if (user.role === 'USER' && window.location.pathname.startsWith('/noi-bo')) window.location.replace('/');
  else window.location.reload();
}

function readOnce(key) {
  try {
    const v = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    return v;
  } catch {
    return null;
  }
}
// Đọc một lần khi tải trang (không đọc trong useState vì StrictMode gọi hai lần, lần sau đã bị xoá)
const SWITCHED_AT_LOAD = typeof window !== 'undefined' ? readOnce(SWITCHED_KEY) : null;
const ROLE_CHANGED_AT_LOAD = typeof window !== 'undefined' ? readOnce(ROLE_CHANGED_KEY) : null;

/** Thông báo sau khi tab tự tải lại vì phiên đăng nhập hoặc vai trò đã đổi. */
function SessionNotice({ children, onClose }) {
  return (
    <div className="session-switched" role="status">
      <Icon name="info" size={22} />
      <p>{children}</p>
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
  const [roleChanged, setRoleChanged] = useState(ROLE_CHANGED_AT_LOAD);
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

  /** Hỏi lại server phiên hiện tại; khác tài khoản hoặc khác vai trò tab đang hiển thị thì tải lại trang. */
  const recheck = useCallback(async () => {
    const shown = userRef.current;
    if (shown === undefined) return;
    const res = await api.get('/auth/me').catch(() => null);
    if (!res) return;
    if ((res.user?.id ?? null) !== (shown?.id ?? null)) reloadForNewSession(res.user);
    else if (res.user && res.user.role !== shown?.role) reloadForNewRole(res.user);
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
      {switched !== null && (
        <SessionNotice onClose={() => setSwitched(null)}>
          {switched
            ? `Trình duyệt này vừa được đăng nhập bằng tài khoản ${switched} ở một thẻ khác, nên trang đã tải lại theo tài khoản đó.`
            : 'Tài khoản đã đăng xuất ở một thẻ khác, nên trang đã tải lại.'}{' '}
          Mỗi người nên dùng một trình duyệt hoặc một hồ sơ Chrome riêng.
        </SessionNotice>
      )}
      {roleChanged !== null && <SessionNotice onClose={() => setRoleChanged(null)}>{roleChanged}</SessionNotice>}
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

export const isStaff = (user) => user && (user.role === 'RECEPTIONIST' || user.role === 'ADMIN');
export const isAdmin = (user) => user?.role === 'ADMIN';
