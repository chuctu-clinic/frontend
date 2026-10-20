// API Client: tập trung mọi lời gọi REST tới Backend.
const BASE = import.meta.env.VITE_API_URL || '';

interface ErrorBody {
  error?: { code?: string; message?: string; fields?: Record<string, string>; [key: string]: unknown };
}

export class ApiError extends Error {
  status: number;
  code: string | undefined;
  /** Lỗi theo từng trường, hiện ngay dưới ô nhập. */
  fields: Record<string, string>;
  /** Toàn bộ nội dung lỗi, có thể kèm dữ liệu thêm (ví dụ duplicates khi trùng số điện thoại). */
  data: NonNullable<ErrorBody['error']>;

  constructor(status: number, body: ErrorBody | null) {
    super(body?.error?.message || 'Có lỗi xảy ra, cô chú vui lòng thử lại.');
    this.status = status;
    this.code = body?.error?.code;
    this.fields = body?.error?.fields || {};
    this.data = body?.error || {};
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { error: { message: 'Không kết nối được tới phòng khám. Cô chú kiểm tra mạng rồi thử lại.' } });
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export function qs(params: Record<string, string | number | boolean | null | undefined>) {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => [k, String(v)]);
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
}

/** Mỗi lời gọi ghi rõ kiểu dữ liệu trả về, ví dụ api.get<{ user: User }>('/auth/me'). Kiểu khớp với shared/src/types.ts. */
export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown = {}) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown = {}) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};

/** Tham số trên URL, bỏ giá trị trống và trang 1; dùng cho setSearchParams. */
export function cleanParams(params: Record<string, string | number | null | undefined>) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v && v !== 1)
      .map(([k, v]) => [k, String(v)]),
  );
}

/** Lỗi kiểm tra ngay trên trình duyệt, hiển thị giống lỗi từ API. */
export function clientError(message: string, fields?: Record<string, string>) {
  return new ApiError(0, { error: { message, fields } });
}
