import { useId, useState } from 'react';
import { Icon } from '../../../shared/components/Icon.jsx';
import { ErrorAlert } from '../../../shared/components/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { CLINIC, fmtDate, weekday } from '../../../shared/lib/format.js';
import { HISTORY_ITEMS, buildHistory, parseHistory } from '../../../shared/medicalHistory.js';
import { FieldError, MonthGrid, TSheet, fmtLeft, fmtStamp, useDismiss } from '../../components/t-ui.jsx';

// Phiếu kết quả khám: biểu mẫu nhập và bản xem đúng như bệnh nhân thấy (UC.9.7, UC.9.9).

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

/** Biểu mẫu phiếu kết quả: nội dung khám, tiền sử bệnh, hoàn tất phiếu. */
export function RecordFields({ form, setForm, errors, visitDate }) {
  const uid = useId();
  const id = (k) => `${uid}-${k}`;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setNum = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value.replace(/\D/g, '').slice(0, 3) }));
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useDismiss(calOpen, () => setCalOpen(false));
  const toggle = (i) =>
    setForm((f) => {
      const lines = [...f.history.lines];
      lines[i] = lines[i] ? null : HISTORY_ITEMS[i].label;
      return { ...f, history: { ...f.history, lines } };
    });

  return (
    <>
      <fieldset style={{ margin: 0, padding: 0, border: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <legend className="t-legend">Nội dung khám</legend>
        <div className="t-field">
          <label htmlFor={id('cd')} className="t-label">
            1. Chẩn đoán <span className="t-req">*</span>
          </label>
          <textarea
            id={id('cd')}
            rows={2}
            className="t-textarea"
            value={form.diagnosis}
            onChange={set('diagnosis')}
            aria-invalid={errors.diagnosis ? 'true' : 'false'}
            aria-describedby={id('cd-loi')}
          />
          <FieldError id={id('cd-loi')}>{errors.diagnosis}</FieldError>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px 32px' }}>
          <div className="t-field">
            <label htmlFor={id('mach')} className="t-label">
              Mạch
            </label>
            <div className="t-unit">
              <input
                id={id('mach')}
                className="t-input t-input-num"
                inputMode="numeric"
                maxLength={3}
                autoComplete="off"
                value={form.pulse}
                onChange={setNum('pulse')}
                aria-invalid={errors.pulse ? 'true' : 'false'}
                aria-describedby={`${id('mach-dv')} ${id('mach-loi')}`}
              />
              <span id={id('mach-dv')} className="t-text">
                lần/phút
              </span>
            </div>
            <div style={{ maxWidth: 220 }}>
              <FieldError id={id('mach-loi')}>{errors.pulse}</FieldError>
            </div>
          </div>
          <div className="t-field">
            <label htmlFor={id('ha')} className="t-label">
              H/A (huyết áp)
            </label>
            <div className="t-unit">
              <input
                id={id('ha')}
                className="t-input t-input-num"
                inputMode="numeric"
                maxLength={3}
                autoComplete="off"
                aria-label="Huyết áp số trên (tâm thu)"
                value={form.bpTop}
                onChange={setNum('bpTop')}
                aria-invalid={errors.bp ? 'true' : 'false'}
                aria-describedby={`${id('ha-dv')} ${id('ha-loi')}`}
              />
              <span aria-hidden="true" style={{ fontSize: 20, color: 'var(--ink-500)' }}>
                /
              </span>
              <input
                className="t-input t-input-num"
                inputMode="numeric"
                maxLength={3}
                autoComplete="off"
                aria-label="Huyết áp số dưới (tâm trương)"
                value={form.bpBottom}
                onChange={setNum('bpBottom')}
                aria-invalid={errors.bp ? 'true' : 'false'}
                aria-describedby={`${id('ha-dv')} ${id('ha-loi')}`}
              />
              <span id={id('ha-dv')} className="t-text">
                mmHg
              </span>
            </div>
            <FieldError id={id('ha-loi')}>{errors.bp}</FieldError>
          </div>
        </div>
        <p className="t-label" style={{ marginTop: 6 }}>
          2. Ghi chú điều trị
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px 20px' }}>
          <div className="t-field" style={{ flex: '1 1 280px' }}>
            <label htmlFor={id('cc')} className="t-label">
              Châm cứu
            </label>
            <textarea id={id('cc')} rows={3} className="t-textarea" placeholder="Để trống nếu không thực hiện" value={form.acupuncture} onChange={set('acupuncture')} />
          </div>
          <div className="t-field" style={{ flex: '1 1 280px' }}>
            <label htmlFor={id('bh')} className="t-label">
              Bấm huyệt
            </label>
            <textarea id={id('bh')} rows={3} className="t-textarea" placeholder="Để trống nếu không thực hiện" value={form.acupressure} onChange={set('acupressure')} />
          </div>
        </div>
        <div className="t-field">
          <label htmlFor={id('kh')} className="t-label">
            Khác
          </label>
          <textarea id={id('kh')} rows={2} className="t-textarea" placeholder="Thuốc Nam, xông, dặn dò tại nhà…" value={form.other} onChange={set('other')} />
        </div>
        <p className="t-iconrow" style={{ gap: 10, color: 'var(--gold-700)', fontWeight: 600 }}>
          <Icon name="info" size={22} />
          Tiếp tân không tự nhận xét chuyên môn. Chỉ ghi lại nội dung đã được bác sĩ hoặc người có chuyên môn của phòng khám xác nhận.
        </p>
      </fieldset>

      <fieldset style={{ margin: 0, padding: 0, border: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <legend className="t-legend">Tiền sử bệnh</legend>
        <p className="t-muted" style={{ marginBottom: 8 }}>
          Bấm vào ô vuông để chọn những mục bệnh nhân có. Mỗi phiếu giữ tiền sử tại thời điểm khám.
        </p>
        <ul className="t-history">
          {HISTORY_ITEMS.map((it, i) => {
            const on = Boolean(form.history.lines[i]);
            return (
              <li key={it.label}>
                <button type="button" role="checkbox" aria-checked={on} aria-label={it.label} className={`t-check ${on ? 'on' : ''}`} onClick={() => toggle(i)}>
                  {on && <Icon name="check" size={20} strokeWidth={3} />}
                </button>
                <span>
                  {i + 1}. {it.label}
                </span>
              </li>
            );
          })}
        </ul>
        {form.history.extra.length > 0 && (
          <p className="t-muted" style={{ marginTop: 10, whiteSpace: 'pre-line' }}>
            Ghi chú tiền sử đã có (giữ nguyên): {form.history.extra.join('\n')}
          </p>
        )}
      </fieldset>

      <fieldset style={{ margin: 0, padding: 0, border: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <legend className="t-legend">Hoàn tất phiếu</legend>
        <div className="t-row">
          <div className="t-field" style={{ flex: '1 1 200px' }}>
            <span className="t-label">Ngày khám</span>
            <div className="t-readonly">{fmtDate(visitDate)}</div>
          </div>
          <div className="t-field" style={{ flex: '1.5 1 340px', position: 'relative' }} ref={calRef}>
            <span id={id('tk-nhan')} className="t-label">
              Hẹn ngày tái khám
            </span>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
              <button
                id={id('tk')}
                type="button"
                className="t-field-btn"
                aria-haspopup="dialog"
                aria-expanded={calOpen}
                aria-labelledby={`${id('tk-nhan')} ${id('tk')}`}
                onClick={() => setCalOpen((v) => !v)}
              >
                <Icon name="calendar" size={22} strokeWidth={1.75} />
                <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                  {form.followUpDate ? `${fmtDate(form.followUpDate)} (${weekday(form.followUpDate)})` : 'Không hẹn tái khám'}
                </span>
                <Icon name="chevronDown" size={20} />
              </button>
              <button
                type="button"
                className="t-chipbtn"
                aria-pressed={!form.followUpDate}
                onClick={() => {
                  setForm((f) => ({ ...f, followUpDate: '' }));
                  setCalOpen(false);
                }}
              >
                Không hẹn
              </button>
            </div>
            {calOpen && (
              <div className="t-cal-pop" role="dialog" aria-label="Chọn ngày tái khám" style={{ top: 84, left: 0, width: 340, maxWidth: '100%', padding: 16, borderRadius: 20 }}>
                <MonthGrid
                  value={form.followUpDate}
                  initial={form.followUpDate || visitDate}
                  disabled={(iso) => iso <= visitDate}
                  onPick={(iso) => {
                    setForm((f) => ({ ...f, followUpDate: iso }));
                    setCalOpen(false);
                  }}
                />
                <p className="t-muted" style={{ marginTop: 10 }}>
                  Chỉ chọn được ngày sau ngày khám {fmtDate(visitDate)}.
                </p>
              </div>
            )}
          </div>
          <div className="t-field" style={{ flex: '1 1 260px' }}>
            <label htmlFor={id('bs')} className="t-label">
              Bác sĩ điều trị
            </label>
            <input id={id('bs')} className="t-input" autoComplete="off" value={form.doctorName} onChange={set('doctorName')} />
          </div>
        </div>
      </fieldset>
    </>
  );
}

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

/** Còn sửa được không: chỉ trong 24 giờ kể từ lúc xác nhận, và hồ sơ chưa khoá. */
export function editState(record, locked) {
  const until = record.editableUntil ? new Date(record.editableUntil).getTime() : 0;
  const now = Date.now();
  return { editable: !locked && now <= until, until, left: until - now };
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

/** Lịch sử khám: ngày, chẩn đoán, người ghi nhận, xem / sửa phiếu. */
export function HistoryTable({ records, locked, onView, onEdit, withVitals }) {
  const grid = { gridTemplateColumns: withVitals ? '200px minmax(0, 1fr) 150px 170px 190px' : '200px minmax(0, 1fr) 160px 190px', alignItems: 'start' };
  return (
    <div className="t-boxed t-scroll">
      <div role="table" aria-label="Lịch sử khám của hồ sơ" className="t-table">
        <div role="row" className="t-tr t-thead" style={{ ...grid, alignItems: 'center' }}>
          <div role="columnheader" className="t-th">
            Ngày khám
          </div>
          <div role="columnheader" className="t-th">
            Chẩn đoán
          </div>
          {withVitals && (
            <div role="columnheader" className="t-th">
              Mạch · H/A
            </div>
          )}
          <div role="columnheader" className="t-th">
            Người ghi nhận
          </div>
          <div role="columnheader" className="t-th">
            {withVitals ? 'Phiếu' : 'Phiếu kết quả'}
          </div>
        </div>
        <div role="rowgroup" className="t-tbody">
          {records.map((r) => {
            const st = editState(r, locked);
            return (
              <div key={r.id} role="row" className="t-tr" style={grid}>
                <div role="cell" className="t-td">
                  <span className="t-td-name">{fmtDate(r.visitDate)}</span>
                  <span className="t-td-sub">{r.appointment?.ticketCode}</span>
                </div>
                <div role="cell" className="t-td t-text">
                  {r.diagnosis || '—'}
                </div>
                {withVitals && (
                  <div role="cell" className="t-td t-text">
                    <span style={{ display: 'block' }}>{r.pulse ? `${String(r.pulse).replace(/\D/g, '')} lần/phút` : '—'}</span>
                    <span style={{ display: 'block' }}>{r.bloodPressure ? `${r.bloodPressure} mmHg` : '—'}</span>
                  </div>
                )}
                <div role="cell" className="t-td t-text">
                  {r.recordedByName || '—'}
                </div>
                <div role="cell" className="t-td" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                  <button type="button" className="t-btn t-btn-ghost t-btn-sm" aria-haspopup="dialog" onClick={() => onView(r)}>
                    <Icon name="eye" size={20} />
                    {withVitals ? 'Xem' : 'Xem phiếu'}
                  </button>
                  {st.editable && onEdit && (
                    <>
                      <button type="button" className="t-btn t-btn-gold t-btn-sm" aria-haspopup="dialog" onClick={() => onEdit(r)}>
                        <Icon name="edit" size={20} />
                        Sửa phiếu
                      </button>
                      <span className="t-text">Sửa được đến {fmtStamp(st.until).replace(' ngày ', ' ')}</span>
                    </>
                  )}
                  {withVitals && !st.editable && !locked && (
                    <span className="t-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="lock" size={18} />
                      Đã khoá sửa
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Sửa phiếu kết quả trong hộp thoại: sửa → Lưu thay đổi → xem lại → Xác nhận (UC.9.9).
 * `onSaved(record)` nhận phiếu sau khi server lưu.
 */
export function EditRecordDialog({ record, patient, onClose, onSaved }) {
  const titleId = useId();
  const [form, setForm] = useState(() => fromRecord(record));
  const [tried, setTried] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const errs = validateRecord(form);
  const shown = tried ? errs : {};
  const st = editState(record, false);

  const review = () => {
    setTried(true);
    if (Object.values(errs).some(Boolean)) return;
    setReviewing(true);
  };

  const confirm = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await api.put(`/staff/records/${record.id}`, toPayload(form));
      onSaved(res.record);
    } catch (err) {
      setError(err);
      setReviewing(false);
    } finally {
      setPending(false);
    }
  };

  if (reviewing) {
    return (
      <ResultDialog
        draft={{ ...record, ...toPayload(form) }}
        patient={patient}
        pending={pending}
        onConfirm={confirm}
        onClose={() => setReviewing(false)}
      />
    );
  }

  return (
    <TSheet labelledBy={titleId} onClose={onClose}>
      <div className="t-sheet-head">
        <div className="t-sheet-title">
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId} className="t-h2">
              Sửa phiếu kết quả khám
            </h2>
            <p className="t-muted">
              Mã phiếu khám {record.appointment?.ticketCode} · Ngày khám {fmtDate(record.visitDate)}
            </p>
          </div>
          <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 20px' }} onClick={onClose}>
            <Icon name="x" size={20} />
            Huỷ sửa
          </button>
        </div>
        <p role="status" className="t-tint-gold-line t-iconrow" style={{ gap: 10, borderRadius: 12, padding: '12px 16px' }}>
          <Icon name="edit" size={22} />
          <span>
            <strong className="t-strong">Đang sửa phiếu đã xác nhận.</strong> Còn sửa được đến <strong className="t-strong">{fmtStamp(st.until)}</strong> (còn {fmtLeft(st.left)}).
            Bấm Lưu thay đổi để xem lại phiếu trước khi xác nhận.
          </span>
        </p>
      </div>
      <div className="t-sheet-body" style={{ padding: '24px 28px' }}>
        <RecordFields form={form} setForm={setForm} errors={shown} visitDate={record.visitDate} />
        <ErrorAlert error={error} />
      </div>
      <div className="t-sheet-foot">
        <button type="button" className="t-btn t-btn-primary t-btn-lg" onClick={review}>
          <Icon name="check" strokeWidth={2.25} />
          Lưu thay đổi
        </button>
        <button type="button" className="t-btn t-btn-ghost t-btn-lg" onClick={onClose}>
          Huỷ sửa
        </button>
      </div>
    </TSheet>
  );
}
