import { APPOINTMENT_STATUSES, GENDERS, RELATIONSHIPS, STATUS_LABELS, USER_STATUS_LABELS, type AppointmentStatus, type Gender, type Relationship } from '../constants.ts';

// Nhãn dùng chung với backend nằm ở shared/src/constants.ts
export { GENDERS, RELATIONSHIPS, ROLE_LABELS } from '../constants.ts';

export const CLINIC = {
  name: 'Phòng chẩn trị Y học cổ truyền từ thiện Chúc Từ',
  short: 'Chúc Từ',
  address: '57/8-10 Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh',
  phone: '0397 116 666',
  phoneHref: 'tel:0397116666',
  phone2: '0835 555 115',
  hours: '8:00 – 16:30',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=57%2F8-10+%C4%90i%E1%BB%87n+Bi%C3%AAn+Ph%E1%BB%A7%2C+B%C3%ACnh+Th%E1%BA%A1nh%2C+TP.HCM',
};

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-20" → Date ở nửa đêm UTC, chỉ dùng để tính thứ và cộng ngày. */
const parseDay = (s: string) => new Date(`${s}T00:00:00Z`);

export function addDays(dateStr: string, n: number) {
  return new Date(parseDay(dateStr).getTime() + n * 86400_000).toISOString().slice(0, 10);
}

export function weekday(dateStr: string) {
  return WEEKDAYS[parseDay(dateStr).getUTCDay()];
}

type DateValue = string | number | Date | null | undefined;

/** 20/10/2026 */
export function fmtDate(value: DateValue) {
  if (!value) return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(value);
  const vn = new Date(d.getTime() + 7 * 3600_000);
  return `${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()}`;
}

/** Thứ Ba, 20/10/2026 */
export function fmtDateLong(dateStr: string) {
  return `${weekday(dateStr)}, ${fmtDate(dateStr)}`;
}

/** 09:05 theo giờ Việt Nam */
export function fmtTime(value: DateValue) {
  if (!value) return '—';
  const vn = new Date(new Date(value).getTime() + 7 * 3600_000);
  return `${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`;
}

export function fmtDateTime(value: DateValue) {
  return value ? `${fmtTime(value)} · ${fmtDate(value)}` : '—';
}

/** "08:00" → "8:00 – 9:00" */
export function slotLabel(start: string) {
  const [h, m] = start.split(':').map(Number);
  return `${h}:${pad(m)} – ${h + 1}:${pad(m)}`;
}

export function shortTime(start: string) {
  const [h, m] = start.split(':').map(Number);
  return `${h}:${pad(m)}`;
}

/** Ngày hôm nay theo giờ Việt Nam */
export function todayVN() {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

export type Tone = 'gold' | 'blue' | 'green' | 'red' | 'gray';

// Trạng thái phiếu: màu luôn đi kèm chữ (Design System — Accessibility)
const TONES: Record<AppointmentStatus, Tone> = { BOOKED: 'gold', CHECKED_IN: 'blue', IN_PROGRESS: 'green', COMPLETED: 'green', CANCELLED: 'red' };
export const STATUS = Object.fromEntries(
  APPOINTMENT_STATUSES.map((k) => [
    k,
    { label: STATUS_LABELS[k], userLabel: k in USER_STATUS_LABELS ? USER_STATUS_LABELS[k as keyof typeof USER_STATUS_LABELS] : undefined, tone: TONES[k] },
  ]),
) as Record<AppointmentStatus, { label: string; userLabel?: string; tone: Tone }>;

export function ageFrom(birthYear: number | null | undefined) {
  if (!birthYear) return null;
  return Number(todayVN().slice(0, 4)) - birthYear;
}

/** Nhãn quan hệ với chủ tài khoản; hồ sơ chưa khai thì undefined. */
export const relationshipLabel = (r: Relationship | null | undefined) => (r ? RELATIONSHIPS[r] : undefined);

/** Nhãn giới tính; chưa khai thì undefined. */
export const genderLabel = (g: Gender | null | undefined) => (g ? GENDERS[g] : undefined);

/** Giờ:phút theo giờ Việt Nam, dạng "09:05", để so sánh với khung giờ. */
export function hhmm(date: Date) {
  const vn = new Date(date.getTime() + 7 * 3600_000);
  return `${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`;
}
