// API Client: tập trung mọi lời gọi REST tới Backend.
// Địa chỉ API (VITE_API_URL trong .env); để trống thì gọi /api cùng địa chỉ
export const API_BASE = import.meta.env.VITE_API_URL || '';

// Tài khoản tab này đang hiển thị. Cookie đăng nhập là chung cho mọi tab, nên server so khớp để từ chối
// thao tác nếu tab khác vừa đăng nhập tài khoản khác hay đăng xuất (lỗi SESSION_CHANGED).
let SESSION_USER = null;
let onSessionChanged = null;
export function setApiSession(userId, onChanged) {
  SESSION_USER = userId || null;
  onSessionChanged = onChanged;
}
export const appHeaders = () => (SESSION_USER ? { 'X-Session-User': SESSION_USER } : {});

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || 'Có lỗi xảy ra, cô chú vui lòng thử lại.');
    this.status = status;
    this.code = body?.error?.code;
    this.fields = body?.error?.fields || {};
    this.data = body?.error || {};
  }
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      credentials: 'include',
      headers: { ...appHeaders(), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { error: { message: 'Không kết nối được tới phòng khám. Cô chú kiểm tra mạng rồi thử lại.' } });
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = new ApiError(res.status, data);
    if (err.code === 'SESSION_CHANGED') onSessionChanged?.();
    throw err;
  }
  return data;
}

export function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};
