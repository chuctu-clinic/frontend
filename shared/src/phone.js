// Số điện thoại di động Việt Nam: dùng chung giữa server và client để hai bên báo cùng một lỗi

/** Chuẩn hoá về dạng 0xxxxxxxxx: bỏ khoảng trắng, dấu chấm, gạch; "+84…" hoặc "84…" (11 số) đổi thành "0…". */
export function normalizePhone(raw) {
  if (typeof raw !== 'string') return raw;
  let s = raw.replace(/[\s.\-()]/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (s.startsWith('84') && s.length === 11) s = '0' + s.slice(2);
  return s;
}

const LENGTH_NOTE = 'Số di động gồm 10 chữ số.';

/**
 * Lý do số điện thoại không hợp lệ, null nếu hợp lệ.
 * Hợp lệ: 10 chữ số bắt đầu bằng 03, 05, 07, 08, 09; nhận cả dạng +84 (+84912345678).
 */
export function phoneProblem(raw, { required = true } = {}) {
  const s = normalizePhone(raw ?? '');
  if (!s) return required ? 'Cô chú vui lòng nhập số điện thoại.' : null;
  if (!/^\d+$/.test(s)) return 'Số điện thoại chỉ gồm chữ số.';
  // Phần sau số 0 đầu (hoặc sau +84) phải đủ 9 chữ số
  const rest = s.startsWith('0') ? s.slice(1) : s;
  if (rest.length < 9) return `Số điện thoại còn thiếu ${9 - rest.length} chữ số. ${LENGTH_NOTE}`;
  if (rest.length > 9) return `Số điện thoại bị thừa ${rest.length - 9} chữ số. ${LENGTH_NOTE}`;
  if (!/^[35789]/.test(rest)) return `Đầu số 0${rest[0]} không phải đầu số di động. Số di động bắt đầu bằng 03, 05, 07, 08 hoặc 09.`;
  return null;
}
