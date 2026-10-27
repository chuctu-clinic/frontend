import { HISTORY_ITEMS, buildHistory, parseHistory } from '../../../shared/domain/medicalHistory.js';

// Dữ liệu biểu mẫu phiếu kết quả khám: giá trị trống, chuyển đổi với API, kiểm tra

export const EMPTY_FORM = {
  diagnosis: '',
  pulse: '',
  bpTop: '',
  bpBottom: '',
  acupuncture: '',
  acupressure: '',
  other: '',
  history: { lines: HISTORY_ITEMS.map(() => null), extra: [] },
  followUpDate: '',
  doctorName: '',
};

export function fromRecord(r) {
  const [top = '', bottom = ''] = String(r.bloodPressure || '')
    .replace(/[^\d/]/g, '')
    .split('/');
  return {
    diagnosis: r.diagnosis || '',
    pulse: String(r.pulse || '').replace(/\D/g, ''),
    bpTop: top,
    bpBottom: bottom,
    acupuncture: r.treatmentNotes?.acupuncture || '',
    acupressure: r.treatmentNotes?.acupressure || '',
    other: r.treatmentNotes?.other || '',
    history: parseHistory(r.medicalHistory),
    followUpDate: r.followUpDate || '',
    doctorName: r.doctorName || '',
  };
}

export function toPayload(f) {
  const v = (s) => (s && s.trim() ? s.trim() : null);
  return {
    diagnosis: v(f.diagnosis),
    pulse: v(f.pulse),
    bloodPressure: f.bpTop && f.bpBottom ? `${f.bpTop}/${f.bpBottom}` : null,
    treatmentNotes: { acupuncture: v(f.acupuncture), acupressure: v(f.acupressure), other: v(f.other) },
    medicalHistory: buildHistory(f.history),
    followUpDate: f.followUpDate || null,
    doctorName: v(f.doctorName),
  };
}

export function validateRecord(f) {
  const pulse = Number(f.pulse);
  const top = Number(f.bpTop);
  const bottom = Number(f.bpBottom);
  const bothOrNone = (f.bpTop === '') === (f.bpBottom === '');
  return {
    diagnosis: f.diagnosis.trim() ? null : 'Vui lòng nhập chẩn đoán.',
    pulse: f.pulse === '' || (pulse >= 30 && pulse <= 220) ? null : 'Mạch từ 30 đến 220 lần/phút.',
    bp: !bothOrNone
      ? 'Nhập đủ hai số, ví dụ 130 và 80.'
      : f.bpTop === '' || (top >= 60 && top <= 260 && bottom >= 30 && bottom <= 160 && top > bottom)
        ? null
        : 'Huyết áp chưa hợp lý. Số trên từ 60 đến 260, số dưới từ 30 đến 160 và số trên phải lớn hơn số dưới.',
  };
}

/** Còn sửa được không: chỉ trong 24 giờ kể từ lúc xác nhận, và hồ sơ chưa khoá. */
export function editState(record, locked) {
  const until = record.editableUntil ? new Date(record.editableUntil).getTime() : 0;
  const now = Date.now();
  return { editable: !locked && now <= until, until, left: until - now };
}
