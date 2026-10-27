import { useState } from 'react';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { addDays, fmtDate } from '../../../shared/lib/format.js';
import { Dialog } from '../../components/Dialog.jsx';
import { CLINIC_NAME, dayLabel } from './BookingFrame.jsx';

const MONTHS_CAP = (y, m) => `Tháng ${m} - ${y}`;

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Lịch tháng chọn ngày khám trong khoảng hôm nay tới maxDays ngày tới. */
export function CalendarDialog({ today, maxDays, value, onPick, onClose }) {
  const last = addDays(today, maxDays);
  const [ty, tm] = today.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);
  const start = value || today;
  const [month, setMonth] = useState(() => {
    const [y, m] = start.split('-').map(Number);
    return { y, m };
  });
  const atFirst = month.y === ty && month.m === tm;
  const atLast = month.y === ly && month.m === lm;
  const shift = (n) => setMonth(({ y, m }) => (m + n > 12 ? { y: y + 1, m: 1 } : m + n < 1 ? { y: y - 1, m: 12 } : { y, m: m + n }));

  const firstDow = new Date(Date.UTC(month.y, month.m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(month.y, month.m, 0)).getUTCDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => `${month.y}-${String(month.m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)];

  return (
    <Dialog
      title="Chọn ngày khám"
      width={620}
      onClose={onClose}
      actions={
        <button type="button" className="a-btn-ghost" onClick={onClose} style={{ minHeight: 56, fontSize: 19 }}>
          Đóng
        </button>
      }
    >
      <p className="b-cal-info">
        <Icon name="infoSoft" strokeWidth={1.75} />
        <span>
          <strong>{CLINIC_NAME}</strong> nhận đặt lịch từ hôm nay tới {maxDays} ngày tới (đến hết ngày {fmtDate(last)}).
        </span>
      </p>
      <div className="b-cal">
        <div className="b-cal-head">
          <button type="button" className="b-cal-nav" aria-label="Tháng trước" disabled={atFirst} onClick={() => shift(-1)}>
            <Icon name="chevronLeft" size={22} />
          </button>
          <span aria-live="polite">{MONTHS_CAP(month.y, month.m)}</span>
          <button type="button" className="b-cal-nav" aria-label="Tháng sau" disabled={atLast} onClick={() => shift(1)}>
            <Icon name="chevronRight" size={22} />
          </button>
        </div>
        <div className="b-cal-grid">
          {WEEKDAY_SHORT.map((w) => (
            <span key={w} className="b-cal-wd" aria-hidden="true">
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`x${i}`} className="b-cal-cell out" aria-hidden="true" />;
            const ok = d >= today && d <= last;
            return (
              <button
                key={d}
                type="button"
                className={`b-cal-cell ${d === today ? 'today' : ''}`}
                disabled={!ok}
                aria-pressed={d === value}
                aria-label={`${dayLabel(d)}${ok ? '' : ' — không nhận lịch'}`}
                onClick={() => onPick(d)}
              >
                {Number(d.slice(8))}
              </button>
            );
          })}
        </div>
      </div>
      <div className="b-legend" aria-hidden="true">
        <span>
          <i style={{ background: 'var(--surface-card)', border: '2px solid var(--green-700)' }} />
          Ngày hiện tại
        </span>
        <span>
          <i style={{ background: 'var(--green-100)' }} />
          Ngày có lịch
        </span>
        <span>
          <i style={{ background: 'var(--surface-200)' }} />
          Ngày không có lịch
        </span>
        <span>
          <i style={{ background: 'var(--green-600)' }} />
          Ngày đã chọn
        </span>
      </div>
    </Dialog>
  );
}
