import { useState } from 'react';
import { Icon } from './Icon.jsx';
import { Button, Loading, Modal } from './ui.jsx';
import { addDays, fmtDate, fmtDateLong, shortTime, todayVN, weekday } from '../lib/format.js';

const SERVICE_ICON = { CHUA_RO: 'question', CHAM_CUU: 'needle', VAT_LY_TRI_LIEU: 'activity', XOA_BOP_BAM_HUYET: 'hand', BOC_THUOC: 'pot' };

export function ServicePicker({ options, value, onChange, error }) {
  return (
    <fieldset className="stack-sm">
      <legend className="field-label" style={{ marginBottom: 8 }}>
        Khám về việc gì?<span className="field-required" aria-hidden="true">*</span>
      </legend>
      <div className="choice-grid choice-auto" role="radiogroup">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className="choice choice-left" onClick={() => onChange(o.value)}>
            <Icon name={SERVICE_ICON[o.value] || 'leaf'} />
            {o.label}
          </button>
        ))}
      </div>
      {error && (
        <span className="field-error" role="alert">
          <Icon name="alert" size={20} />
          {error}
        </span>
      )}
    </fieldset>
  );
}

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function CalendarModal({ value, minDate, maxDate, onPick, onClose }) {
  const start = value || minDate;
  const [month, setMonth] = useState(start.slice(0, 7));
  const [y, m] = month.split('-').map(Number);
  const first = `${month}-01`;
  const firstDow = new Date(`${first}T00:00:00Z`).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
  const shift = (n) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const today = todayVN();
  return (
    <Modal title="Chọn ngày khám" onClose={onClose}>
      <div className="stack-sm">
        <p className="small">
          Phòng khám nhận đặt lịch từ {fmtDate(minDate)} đến {fmtDate(maxDate)}.
        </p>
        <div className="row-between">
          <Button variant="secondary" size="sm" icon="chevronLeft" onClick={() => shift(-1)} disabled={month <= minDate.slice(0, 7)} aria-label="Tháng trước" />
          <p style={{ fontWeight: 700, color: 'var(--ink-900)' }}>
            Tháng {m}/{y}
          </p>
          <Button variant="secondary" size="sm" onClick={() => shift(1)} disabled={month >= maxDate.slice(0, 7)} aria-label="Tháng sau">
            <Icon name="chevronRight" />
          </Button>
        </div>
        <div className="calendar">
          {DOW.map((d) => (
            <span key={d} className="dow" aria-hidden="true">
              {d}
            </span>
          ))}
          {cells.map((d, i) =>
            d ? (
              <button
                key={d}
                type="button"
                className={`choice ${d === today ? 'today' : ''}`}
                aria-pressed={d === value}
                disabled={d < minDate || d > maxDate}
                aria-label={`${fmtDateLong(d)}${d < minDate || d > maxDate ? ' — không nhận lịch' : ''}`}
                onClick={() => onPick(d)}
              >
                {Number(d.slice(8))}
              </button>
            ) : (
              <span key={`e${i}`} />
            ),
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Ba ngày gần nhất và nút "Ngày khác" mở lịch tháng, như prototype. */
export function DatePicker({ value, onChange, maxDays, minOffset = 0 }) {
  const [calOpen, setCalOpen] = useState(false);
  const today = todayVN();
  const minDate = addDays(today, minOffset);
  const maxDate = addDays(today, maxDays);
  const quick = [0, 1, 2].map((n) => addDays(minDate, n)).filter((d) => d <= maxDate);
  const isOther = value && !quick.includes(value);
  return (
    <fieldset className="stack-sm">
      <legend className="field-label" style={{ marginBottom: 8 }}>
        Ngày khám<span className="field-required" aria-hidden="true">*</span>
      </legend>
      <div className="choice-grid choice-4">
        {quick.map((d) => (
          <button key={d} type="button" className="choice" aria-pressed={value === d} onClick={() => onChange(d)} style={{ minHeight: 86 }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{fmtDate(d).slice(0, 5)}</span>
            <span className="choice-sub">{d === today ? `Hôm nay · ${weekday(d)}` : weekday(d)}</span>
          </button>
        ))}
        <button type="button" className="choice" aria-pressed={Boolean(isOther)} onClick={() => setCalOpen(true)} style={{ minHeight: 86 }}>
          {isOther ? <span style={{ fontSize: 20, fontWeight: 700 }}>{fmtDate(value).slice(0, 5)}</span> : <Icon name="calendar" />}
          <span className="choice-sub">Ngày khác</span>
        </button>
      </div>
      <p className="small">
        Đang chọn: <strong>{value ? fmtDateLong(value) : 'chưa chọn ngày'}</strong>
      </p>
      {calOpen && (
        <CalendarModal
          value={value}
          minDate={minDate}
          maxDate={maxDate}
          onClose={() => setCalOpen(false)}
          onPick={(d) => {
            onChange(d);
            setCalOpen(false);
          }}
        />
      )}
    </fieldset>
  );
}

/** Khung giờ buổi sáng/chiều; khung đủ 6 phiếu hoặc đã bắt đầu thì xám và ghi rõ lý do. */
export function SlotPicker({ slots, loading, value, onChange, error }) {
  const groups = [
    ['Buổi sáng', slots?.filter((s) => s.start < '12:00') || []],
    ['Buổi chiều', slots?.filter((s) => s.start >= '12:00') || []],
  ];
  return (
    <fieldset className="stack-sm">
      <legend className="field-label" style={{ marginBottom: 8 }}>
        Giờ khám dự kiến<span className="field-required" aria-hidden="true">*</span>
      </legend>
      {loading && <Loading label="Đang xem khung giờ còn chỗ…" />}
      {!loading &&
        groups.map(([label, list]) => (
          <div key={label} className="stack-sm">
            <p className="caption">{label}</p>
            <div className="choice-grid choice-4">
              {list.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  className="choice"
                  aria-pressed={value === s.start}
                  disabled={!s.available}
                  onClick={() => onChange(s.start)}
                  aria-label={`${shortTime(s.start)}${s.available ? `, còn ${s.remaining} chỗ` : `, ${s.reason}`}`}
                >
                  {shortTime(s.start)}
                  <span className="choice-sub">{s.available ? `Còn ${s.remaining} chỗ` : s.reason}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      {error && (
        <span className="field-error" role="alert">
          <Icon name="alert" size={20} />
          {error}
        </span>
      )}
    </fieldset>
  );
}
