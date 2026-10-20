import { fmtDate, fmtDateLong } from '../lib/format.js';

const NOTE_LABELS = { acupuncture: 'Châm cứu', acupressure: 'Bấm huyệt', other: 'Điều trị khác' };

/** Phiếu kết quả khám, dùng cho người dùng và trang hồ sơ của tiếp tân. */
export function RecordSheet({ record }) {
  const notes = Object.entries(record.treatmentNotes || {}).filter(([, v]) => v);
  return (
    <div className="card card-lg stack">
      <div className="row-between">
        <div>
          <p className="caption">Ngày khám</p>
          <p style={{ fontWeight: 700, fontSize: 20, color: 'var(--ink-900)' }}>{fmtDateLong(record.visitDate)}</p>
        </div>
        {record.appointment && <p className="mono caption">{record.appointment.ticketCode}</p>}
      </div>
      <dl className="info">
        <dt>Người khám</dt>
        <dd>{record.patient?.fullName}</dd>
        <dt>Nội dung khám</dt>
        <dd>{record.appointment?.serviceLabel || '—'}</dd>
        <dt>Chẩn đoán</dt>
        <dd>{record.diagnosis || '—'}</dd>
        <dt>Mạch</dt>
        <dd>{record.pulse ? `${record.pulse} lần/phút` : '—'}</dd>
        <dt>Huyết áp</dt>
        <dd>{record.bloodPressure ? `${record.bloodPressure} mmHg` : '—'}</dd>
        {notes.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt>{NOTE_LABELS[k]}</dt>
            <dd style={{ whiteSpace: 'pre-line' }}>{v}</dd>
          </div>
        ))}
        <dt>Tiền sử bệnh</dt>
        <dd style={{ whiteSpace: 'pre-line' }}>{record.medicalHistory || '—'}</dd>
        <dt>Hẹn tái khám</dt>
        <dd>{record.followUpDate ? fmtDateLong(record.followUpDate) : 'Không hẹn'}</dd>
        <dt>Bác sĩ điều trị</dt>
        <dd>{record.doctorName || '—'}</dd>
      </dl>
      <p className="caption">Cập nhật lần cuối {fmtDate(record.updatedAt)}. Kết quả do phòng khám ghi nhận.</p>
    </div>
  );
}
