// Định dạng riêng của khu nội bộ (theo prototype "TiepTan-*")

export const pad = (n) => String(n).padStart(2, '0');

/** 10:05 ngày 15/10/2026 */
export function fmtStamp(value) {
  const vn = new Date(new Date(value).getTime() + 7 * 3600_000);
  return `${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())} ngày ${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()}`;
}

/** 23 giờ 5 phút */
export function fmtLeft(ms) {
  const mins = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} giờ${m ? ` ${m} phút` : ''}` : `${m} phút`;
}
