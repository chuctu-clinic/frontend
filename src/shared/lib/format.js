// Nhãn dùng chung với server nằm ở shared/constants.js (bản chép của backend)
export { GENDERS, RELATIONSHIPS, ROLE_LABELS } from '../domain/constants.js';

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

const pad = (n) => String(n).padStart(2, '0');

/** "2026-10-20" → Date ở nửa đêm UTC, chỉ dùng để tính thứ và cộng ngày. */
const parseDay = (s) => new Date(`${s}T00:00:00Z`);

export function addDays(dateStr, n) {
  return new Date(parseDay(dateStr).getTime() + n * 86400_000).toISOString().slice(0, 10);
}

export function weekday(dateStr) {
  return WEEKDAYS[parseDay(dateStr).getUTCDay()];
}

/** 20/10/2026 */
export function fmtDate(value) {
  if (!value) return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(value);
  const vn = new Date(d.getTime() + 7 * 3600_000);
  return `${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()}`;
}

/** 09:05 theo giờ Việt Nam */
export function fmtTime(value) {
  if (!value) return '—';
  const vn = new Date(new Date(value).getTime() + 7 * 3600_000);
  return `${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`;
}

/** "08:00" → "8:00 – 9:00" */
export function slotLabel(start) {
  const [h, m] = start.split(':').map(Number);
  return `${h}:${pad(m)} – ${h + 1}:${pad(m)}`;
}

export function shortTime(start) {
  const [h, m] = start.split(':').map(Number);
  return `${h}:${pad(m)}`;
}

/** Ngày hôm nay theo giờ Việt Nam */
export function todayVN() {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function ageFrom(birthYear) {
  if (!birthYear) return null;
  return Number(todayVN().slice(0, 4)) - birthYear;
}
