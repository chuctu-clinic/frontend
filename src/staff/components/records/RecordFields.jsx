import { useId, useState } from 'react';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { fmtDate, weekday } from '../../../shared/lib/format.js';
import { HISTORY_ITEMS } from '../../../shared/domain/medicalHistory.js';
import { FieldError } from '../fields.jsx';
import { MonthGrid } from '../MonthGrid.jsx';
import { useDismiss } from '../../../shared/lib/hooks.js';

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
