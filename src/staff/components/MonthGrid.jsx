import { useEffect, useState } from 'react';
import { Icon } from '../../shared/ui/Icon.jsx';
import { addDays, fmtDate, todayVN, weekday } from '../../shared/lib/format.js';
import { pad } from '../lib/format.js';

const WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * Lịch tháng: T2 → CN. `marked(iso)` đánh chấm ngày có lịch, `disabled(iso)` khoá ngày không chọn được.
 */
export function MonthGrid({ value, onPick, marked, disabled, initial, onMonth }) {
  const start = initial || value || todayVN();
  const [ym, setYm] = useState(() => start.slice(0, 7));
  useEffect(() => {
    onMonth?.(ym);
  }, [ym, onMonth]);
  const [y, m] = ym.split('-').map(Number);
  const first = `${ym}-01`;
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = todayVN();
  const shift = (n) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setYm(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
  };
  const cells = [];
  for (let i = lead; i > 0; i -= 1) cells.push({ iso: addDays(first, -i), out: true });
  for (let d = 1; d <= dim; d += 1) cells.push({ iso: `${ym}-${pad(d)}` });
  while (cells.length % 7) cells.push({ iso: addDays(cells[cells.length - 1].iso, 1), out: true });

  return (
    <>
      <div className="t-cal-head">
        <button type="button" className="t-btn t-btn-ghost t-btn-icon" onClick={() => shift(-1)} aria-label="Tháng trước">
          <Icon name="chevronLeft" size={26} />
        </button>
        <p className="t-cal-title" aria-live="polite">
          Tháng {m} năm {y}
        </p>
        <button type="button" className="t-btn t-btn-ghost t-btn-icon" onClick={() => shift(1)} aria-label="Tháng sau">
          <Icon name="chevronRight" size={26} />
        </button>
      </div>
      <div className="t-cal-week" aria-hidden="true">
        {WEEK.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="t-cal-grid" role="group" aria-label="Các ngày trong tháng">
        {cells.map((c) => {
          const off = disabled?.(c.iso);
          return (
            <button
              key={c.iso}
              type="button"
              className={`t-cal-cell ${c.out ? 'out' : ''} ${c.iso === today ? 'today' : ''}`}
              aria-pressed={c.iso === value}
              aria-label={`${weekday(c.iso)}, ${fmtDate(c.iso)}${off ? ' (không chọn được)' : ''}`}
              disabled={off}
              onClick={() => onPick(c.iso)}
            >
              <span>{Number(c.iso.slice(8))}</span>
              {marked && <span className={`t-cal-dot ${marked(c.iso) ? 'on' : ''}`} />}
            </button>
          );
        })}
      </div>
    </>
  );
}
