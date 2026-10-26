// Tiền sử bệnh dùng chung cho khu tiếp tân (nhập, xem phiếu) và trang người dùng (xem kết quả khám)

/**
 * Tiền sử bệnh gồm 8 mục chọn. Server lưu một đoạn chữ, mỗi mục một dòng (có thể kèm chi tiết sau dấu ":").
 * Dòng không thuộc mục nào được giữ nguyên.
 */
export const HISTORY_ITEMS = [
  { label: 'Cao huyết áp', keys: ['cao huyet ap', 'tang huyet ap'] },
  { label: 'Tim mạch', keys: ['tim mach', 'benh tim'] },
  { label: 'Đái tháo đường', keys: ['dai thao duong', 'tieu duong'] },
  { label: 'Phẫu thuật, chấn thương', keys: ['phau thuat', 'chan thuong'] },
  { label: 'Bệnh di truyền', keys: ['benh di truyen', 'di truyen'] },
  { label: 'Hút thuốc, uống rượu bia', keys: ['hut thuoc', 'uong ruou', 'ruou bia'] },
  { label: 'Dị ứng thuốc', keys: ['di ung'] },
  { label: 'Thuốc đang sử dụng', keys: ['thuoc dang su dung', 'dang dung thuoc', 'dang uong thuoc'] },
];

const plain = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Đoạn tiền sử → { lines: dòng của từng mục (null nếu không chọn), extra: các dòng còn lại }. */
export function parseHistory(text) {
  const lines = HISTORY_ITEMS.map(() => null);
  const extra = [];
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const p = plain(line);
    const i = HISTORY_ITEMS.findIndex((it) => it.keys.some((k) => p.startsWith(k)));
    if (i >= 0 && lines[i] === null) lines[i] = line;
    else extra.push(line);
  }
  return { lines, extra };
}

export function buildHistory({ lines, extra }) {
  const out = [...lines.filter(Boolean), ...extra];
  return out.length ? out.join('\n') : null;
}
