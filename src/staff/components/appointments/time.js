import { fmtDate, weekday } from '../../../shared/lib/format.js';

// Giờ, ngày và dòng mô tả bệnh nhân dùng trong các thao tác với phiếu khám

/** Phút trong ngày theo giờ Việt Nam. */
export function nowMinutesVN() {
  const vn = new Date(Date.now() + 7 * 3600_000);
  return vn.getUTCHours() * 60 + vn.getUTCMinutes();
}

export const minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const ddmm = (iso) => fmtDate(iso).slice(0, 5);

/** "Thứ Năm, 15/10/2026" */
export const longDay = (iso) => `${weekday(iso)}, ${fmtDate(iso)}`;

/** Mô tả hồ sơ một dòng: mã · năm sinh · số điện thoại */
export const patientLine = (p) => [p.patientCode, p.birthYear, p.phone].filter(Boolean).join(' · ');
