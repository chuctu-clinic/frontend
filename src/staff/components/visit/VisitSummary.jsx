import { Icon } from '../../../shared/ui/Icon.jsx';
import { TREATMENT_KINDS, VISIT_STAGE_LABELS } from '../../../shared/domain/constants.js';
import { fmtTime } from '../../../shared/lib/format.js';

// Thông tin một lượt khám qua các bước: khám sơ bộ và chỉ định (bác sĩ), báo cáo điều trị (kỹ thuật viên)

export const clock = (value) => (value ? fmtTime(value).replace(/^0/, '') : '');

/** Tên các kỹ thuật đã chỉ định; "Khác" kèm nội dung bác sĩ ghi rõ (other). */
export const kindLabels = (kinds, other) =>
  (kinds || []).map((k) => (k === 'KHAC' && other ? `Khác: ${other}` : TREATMENT_KINDS[k] || k)).join(', ');

/** Nhãn bước hiện tại của lượt khám, dạng chip. */
export function StageChip({ status }) {
  const tone =
    status === 'WAITING_CONCLUSION'
      ? 't-chip-gold'
      : status === 'COMPLETED'
        ? 't-chip-done'
        : status === 'IN_ROOM' || status === 'EXAMINING'
          ? 't-chip-solid'
          : 't-chip-green';
  return <span className={`t-chip t-chip-sm ${tone}`}>{VISIT_STAGE_LABELS[status] || status}</span>;
}

function Row({ label, children }) {
  if (!children) return null;
  return (
    <div className="t-dl-row">
      <dt className="t-label" style={{ color: 'var(--ink-500)' }}>
        {label}
      </dt>
      <dd style={{ margin: 0, color: 'var(--ink-900)', whiteSpace: 'pre-line' }}>{children}</dd>
    </div>
  );
}

/** Chỉ định của bác sĩ: kỹ thuật và ghi chú cho kỹ thuật viên. */
export function OrderBox({ visit }) {
  return (
    <div className="t-tint-green" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p>
        <strong className="t-strong">Chỉ định:</strong> {kindLabels(visit.treatmentKinds, visit.treatmentOther) || '—'}
      </p>
      {visit.treatmentOrder && <p style={{ whiteSpace: 'pre-line' }}>{visit.treatmentOrder}</p>}
      {visit.doctorName && <p className="t-muted">Bác sĩ {visit.doctorName}</p>}
    </div>
  );
}

/**
 * Toàn bộ những gì đã ghi trong lượt khám, để bác sĩ đọc trước khi kết luận. Không hiện gì khi lượt chưa qua khám sơ bộ.
 */
export function VisitSummary({ visit }) {
  if (!visit || (!visit.orderedAt && !visit.report)) return null;
  const r = visit.report;
  return (
    <section aria-labelledby="lk-tieude" className="t-panel" style={{ gap: 18 }}>
      <div className="t-titlerow">
        <h2 id="lk-tieude" className="t-h2">
          Diễn tiến lượt khám
        </h2>
        <StageChip status={visit.status} />
      </div>
      {visit.orderedAt && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="t-eyebrow t-iconrow" style={{ gap: 8 }}>
            <Icon name="user" size={18} />
            Khám sơ bộ{visit.doctorName ? ` — bác sĩ ${visit.doctorName}` : ''} {visit.examStartedAt ? `· ${clock(visit.examStartedAt)}` : ''}
          </p>
          <dl className="t-dl">
            <Row label="Triệu chứng">{visit.symptoms}</Row>
            <Row label="Tiền sử bệnh">{visit.medicalHistory}</Row>
            <Row label="Chẩn đoán ban đầu">{visit.prelimDiagnosis}</Row>
            <Row label="Mạch">{visit.pulse && `${visit.pulse} lần/phút`}</Row>
            <Row label="Huyết áp">{visit.bloodPressure && `${visit.bloodPressure} mmHg`}</Row>
            <Row label="Chỉ định">{kindLabels(visit.treatmentKinds, visit.treatmentOther)}</Row>
            <Row label="Ghi chú cho kỹ thuật viên">{visit.treatmentOrder}</Row>
          </dl>
        </div>
      )}
      {r && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
          <p className="t-eyebrow t-iconrow" style={{ gap: 8 }}>
            <Icon name="check" size={18} />
            Báo cáo điều trị{visit.technicianName ? ` — kỹ thuật viên ${visit.technicianName}` : ''} {visit.treatedAt ? `· ${clock(visit.treatedAt)}` : ''}
          </p>
          <dl className="t-dl">
            <Row label="Châm cứu">{r.acupuncture}</Row>
            <Row label="Xoa bóp — bấm huyệt">{r.acupressure}</Row>
            <Row label="Vật lý trị liệu">{r.physio}</Row>
            <Row label="Khác">{r.other}</Row>
            <Row label="Ghi chú cho bác sĩ">{r.note}</Row>
          </dl>
        </div>
      )}
    </section>
  );
}
