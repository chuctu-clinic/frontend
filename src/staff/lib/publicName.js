/**
 * Tên che bớt cho màn hình phòng chờ chiếu công khai (A13): họ và tên đệm chỉ giữ chữ cái đầu, giữ nguyên tên gọi.
 * "Nguyễn Văn An" → "N. V. An", "Trương Thị Mỹ" → "T. T. Mỹ". Tên một chữ giữ nguyên; không có tên thì "Bệnh nhân".
 */
export function publicName(full) {
  const words = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Bệnh nhân';
  const given = words[words.length - 1];
  const initials = words.slice(0, -1).map((w) => `${Array.from(w)[0].toLocaleUpperCase('vi')}.`);
  return [...initials, given].join(' ');
}
