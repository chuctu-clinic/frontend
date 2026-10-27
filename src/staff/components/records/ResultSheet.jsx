import { useId } from 'react';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { CLINIC, fmtDate, weekday } from '../../../shared/lib/format.js';
import { HISTORY_ITEMS, parseHistory } from '../../../shared/domain/medicalHistory.js';
import { TSheet } from '../dialogs.jsx';
import { fmtLeft, fmtStamp } from '../../lib/format.js';
import { editState } from './recordForm.js';

const NOT_DONE = 'Không thực hiện.';

/** Phiếu kết quả đúng như bệnh nhân thấy trong tài khoản. `r` theo dạng dữ liệu server trả về. */
export function ResultSheet({ r, patient, preview }) {
  const history = parseHistory(r.medicalHistory);
  const [y, m, d] = r.visitDate.split('-');
  const rows = (list) =>
    list.map(([label, value]) => (
      <div key={label} className="t-dl-row">
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    ));
  return (
    <article className="t-result">
      <div className="t-result-head">
        <div style={{ minWidth: 0 }}>
          <p className="t-text">Phòng chẩn trị Y học cổ truyền từ thiện</p>
          <p className="t-result-brand">CHÚC TỪ</p>
          <p className="t-text">
            {CLINIC.address}
            <br />
            Số điện thoại: {CLINIC.phone2} · Sư cô Chúc Từ
          </p>
        </div>
        {preview ? (
          <span className="t-chip t-chip-gold" style={{ padding: '8px 16px', gap: 8 }}>
            <Icon name="clock" size={20} />
            Bản xem trước, chưa xác nhận
          </span>
        ) : (
          <span className="t-chip t-chip-green" style={{ padding: '8px 16px', gap: 8 }}>
            <Icon name="checkCircle" size={20} />
            Phòng khám đã xác nhận
          </span>
        )}
      </div>
      <div className="t-result-body">
        <div className="t-result-title">
          <h3>Kết quả khám</h3>
          <p className="t-text">
            {weekday(r.visitDate)}, {fmtDate(r.visitDate)}
          </p>
        </div>
        <section>
          <h4>Thông tin bệnh nhân</h4>
          <dl className="t-dl">
            {rows([
              [
                'Họ và tên',
                <>
                  {patient.fullName} <span style={{ color: 'var(--ink-500)' }}>· Mã bệnh nhân {patient.patientCode}</span>
                </>,
              ],
              ['Năm sinh', patient.birthYear || '—'],
              ['Số điện thoại', patient.phone || '—'],
            ])}
          </dl>
        </section>
        <section>
          <h4>Nội dung khám</h4>
          <dl className="t-dl">
            {rows([
              ['1. Chẩn đoán', r.diagnosis || '—'],
              ['Mạch', r.pulse ? `${String(r.pulse).replace(/\D/g, '')} lần/phút` : '—'],
              ['H/A (huyết áp)', r.bloodPressure ? `${String(r.bloodPressure).replace(/[^\d/]/g, '')} mmHg` : '—'],
            ])}
            <div className="t-result-sub">
              <dt>2. Ghi chú điều trị</dt>
            </div>
            {rows([
              ['Châm cứu', r.treatmentNotes?.acupuncture || NOT_DONE],
              ['Bấm huyệt', r.treatmentNotes?.acupressure || NOT_DONE],
              ['Khác', r.treatmentNotes?.other || '—'],
            ])}
          </dl>
        </section>
        <section>
          <h4>Tiền sử bệnh</h4>
          <ul className="t-history">
            {HISTORY_ITEMS.map((it, i) => {
              const line = history.lines[i];
              const detail = line && line.includes(':') ? line.slice(line.indexOf(':') + 1).trim() : '';
              return (
                <li key={it.label} style={{ alignItems: 'flex-start' }}>
                  <span aria-hidden="true" className={`t-check ${line ? 'on' : ''}`}>
                    {line && <Icon name="check" size={20} strokeWidth={3} />}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>
                      {i + 1}. {it.label}
                      <span className="sr-only">{line ? ': có' : ': không'}</span>
                    </span>
                    {detail && <span style={{ fontWeight: 400, color: 'var(--ink-700)' }}>{detail}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          {history.extra.length > 0 && (
            <p className="t-text" style={{ marginTop: 10, whiteSpace: 'pre-line' }}>
              {history.extra.join('\n')}
            </p>
          )}
        </section>
        <section aria-label="Lưu ý" className="t-note">
          <Icon name="info" size={26} />
          <div>
            <p className="t-note-title">Lưu ý</p>
            <ul>
              <li>Khám và điều trị miễn phí.</li>
              <li>Bệnh nhân tự ý trao đổi với Y Bác sĩ để điều trị và mua thuốc thì phòng khám không chịu trách nhiệm.</li>
              <li>
                <strong>{r.followUpDate ? `Hẹn tái khám ngày ${fmtDate(r.followUpDate)}.` : 'Chưa hẹn ngày tái khám.'}</strong>
              </li>
            </ul>
          </div>
        </section>
        <div className="t-sign">
          <div>
            <p className="t-sign-date">
              Ngày {Number(d)} tháng {Number(m)} năm {y}
            </p>
            <p className="t-sign-role">Bác sĩ điều trị</p>
            <p style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{r.doctorName || '—'}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Xem phiếu kết quả (đúng như bệnh nhân thấy), hoặc xem lại bản nháp trước khi xác nhận (`draft`).
 */
export function ResultDialog({ record, patient, locked, draft, onEdit, onClose, onConfirm, pending }) {
  const titleId = useId();
  const confirm = Boolean(draft);
  const r = draft || record;
  const st = record && !confirm ? editState(record, locked) : null;
  const edits = record?.editHistory?.length || 0;
  const code = r.appointment?.ticketCode || r.ticketCode;
  return (
    <TSheet labelledBy={titleId} onClose={onClose}>
      <div className="t-sheet-head">
        <div className="t-sheet-title">
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId} className="t-h2">
              {confirm ? 'Xác nhận phiếu kết quả khám' : 'Phiếu kết quả khám'}
            </h2>
            <p className="t-muted">{confirm ? `Mã phiếu khám ${code}.` : `Bệnh nhân sẽ thấy đúng nội dung này trong tài khoản. Mã phiếu khám ${code}.`}</p>
          </div>
          {!confirm && (
            <div className="t-actions" style={{ gap: 12 }}>
              {st?.editable && onEdit && (
                <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 20px' }} onClick={onEdit}>
                  <Icon name="edit" size={20} />
                  Sửa phiếu
                </button>
              )}
              <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 20px' }} onClick={onClose}>
                <Icon name="x" size={20} />
                Đóng
              </button>
            </div>
          )}
        </div>
        {confirm && (
          <div role="alert" className="t-tint-gold-line t-iconrow" style={{ padding: '16px 20px' }}>
            <Icon name="warning" size={28} />
            <div>
              <p className="t-h2" style={{ marginBottom: 4 }}>
                Kiểm tra lại thông tin trước khi xác nhận
              </p>
              <p style={{ lineHeight: '26px', color: 'var(--ink-900)' }}>
                Đây là phiếu bệnh nhân sẽ thấy trong tài khoản website. Nếu đúng hết, bấm <strong>Xác nhận</strong>. Nếu có chỗ sai, bấm <strong>Huỷ</strong> để quay lại sửa. Sau
                khi xác nhận, bạn chỉ sửa được trong <strong>24 giờ</strong>.
              </p>
            </div>
          </div>
        )}
        {st?.editable && (
          <p className="t-tint-green t-iconrow" style={{ gap: 10 }}>
            <Icon name="clock" size={22} />
            <span>
              Phiếu này còn sửa được đến {fmtStamp(st.until)} (còn {fmtLeft(st.left)}).
            </span>
          </p>
        )}
        {edits > 0 && !confirm && (
          <p className="t-text">
            Đã chỉnh sửa {edits} lần, lần cuối lúc {fmtStamp(record.editHistory[edits - 1].editedAt)} ({record.editHistory[edits - 1].editedByName}).
          </p>
        )}
        {st && !st.editable && (
          <p className="t-tint-sand t-iconrow" style={{ gap: 10 }}>
            <Icon name="lock" size={22} />
            <span>
              {locked
                ? 'Hồ sơ đã khoá nên không sửa được phiếu kết quả.'
                : `Phiếu đã khoá: đã quá 24 giờ kể từ lúc xác nhận (${fmtStamp(record.createdAt)}), không sửa được nữa.`}
            </span>
          </p>
        )}
      </div>
      <div className="t-sheet-body" style={{ gap: 0 }}>
        <ResultSheet r={r} patient={patient} preview={confirm} />
      </div>
      {confirm && (
        <div className="t-sheet-foot">
          <button type="button" className="t-btn t-btn-primary t-btn-lg" disabled={pending} onClick={onConfirm}>
            <Icon name="check" strokeWidth={2.25} />
            Xác nhận
          </button>
          <button type="button" className="t-btn t-btn-ghost t-btn-lg" onClick={onClose}>
            Huỷ
          </button>
        </div>
      )}
    </TSheet>
  );
}
