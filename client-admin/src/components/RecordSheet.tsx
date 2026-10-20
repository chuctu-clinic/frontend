import { CLINIC, fmtDate, fmtDateLong, weekday } from '@chuctu/shared/lib/format.ts';

/** Nội dung một phiếu kết quả khám, đủ để in hoặc xem trước. */
export interface SheetData {
  visitDate: string;
  patientName: string;
  patientCode?: string | null;
  birthYear?: number | null;
  phone?: string | null;
  diagnosis: string | null;
  pulse: string | null;
  bloodPressure: string | null;
  acupuncture: string | null;
  acupressure: string | null;
  other: string | null;
  medicalHistory: string | null;
  followUpDate: string | null;
  doctorName: string | null;
}

const dash = (v: string | null | undefined) => (v && v.trim() ? v : '—');

/** Phiếu kết quả khám theo mẫu của phòng khám (prototype: Phiếu kết quả khám). */
export function RecordSheetView({ data, confirmed }: { data: SheetData; confirmed: boolean }) {
  const row = (label: string, value: string) => (
    <div>
      <dt>{label}</dt>
      <dd style={{ whiteSpace: 'pre-line' }}>{value}</dd>
    </div>
  );
  return (
    <article className="nb-sheet" aria-label="Phiếu kết quả khám">
      <header className="nb-sheet-head">
        <p className="nb-muted">Phòng chẩn trị Y học cổ truyền từ thiện</p>
        <p className="clinic">CHÚC TỪ</p>
        <p style={{ fontSize: 15 }}>{CLINIC.address}</p>
        <p style={{ fontSize: 15 }}>Số điện thoại: {CLINIC.phone2} · Sư cô Chúc Từ</p>
        <p style={{ marginTop: 8 }}>
          <span className={`nb-pill ${confirmed ? 'nb-pill-green' : 'nb-pill-gold'}`} style={{ padding: '4px 12px' }}>
            {confirmed ? 'Phòng khám đã xác nhận' : 'Bản xem trước, chưa xác nhận'}
          </span>
        </p>
      </header>
      <div className="nb-between">
        <h3 style={{ margin: 0, fontSize: 22 }}>Kết quả khám</h3>
        <p className="nb-muted">{fmtDateLong(data.visitDate)}</p>
      </div>
      <section>
        <h3>Thông tin bệnh nhân</h3>
        <dl className="nb-dl">
          {row('Họ và tên', `${data.patientName}${data.patientCode ? ` · Mã bệnh nhân ${data.patientCode}` : ''}`)}
          {row('Năm sinh', data.birthYear ? String(data.birthYear) : '—')}
          {row('Số điện thoại', dash(data.phone))}
        </dl>
      </section>
      <section>
        <h3>Nội dung khám</h3>
        <dl className="nb-dl">
          {row('1. Chẩn đoán', dash(data.diagnosis))}
          {row('Mạch', data.pulse ? `${data.pulse} lần/phút` : '—')}
          {row('H/A (huyết áp)', data.bloodPressure ? `${data.bloodPressure} mmHg` : '—')}
          {row('2. Châm cứu', dash(data.acupuncture))}
          {row('Bấm huyệt', dash(data.acupressure))}
          {row('Khác', dash(data.other))}
        </dl>
      </section>
      <section>
        <h3>Tiền sử bệnh</h3>
        <p style={{ whiteSpace: 'pre-line' }}>{dash(data.medicalHistory)}</p>
      </section>
      <section aria-label="Lưu ý" className="nb-warn" style={{ flexDirection: 'column', gap: 6 }}>
        <p className="nb-strong">Lưu ý</p>
        <p>Khám và điều trị miễn phí.</p>
        <p>Bệnh nhân tự ý trao đổi với Y Bác sĩ để điều trị và mua thuốc thì phòng khám không chịu trách nhiệm.</p>
        <p>
          Hẹn tái khám: <strong>{data.followUpDate ? `${weekday(data.followUpDate)}, ${fmtDate(data.followUpDate)}` : 'Không hẹn'}</strong>
        </p>
      </section>
      <div style={{ textAlign: 'right' }}>
        <p className="nb-muted">Ngày {fmtDate(data.visitDate)}</p>
        <p className="nb-strong">Bác sĩ điều trị</p>
        <p>{dash(data.doctorName)}</p>
      </div>
    </article>
  );
}
