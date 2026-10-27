import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { addDays, fmtDate, todayVN, weekday } from '@chuctu/shared/lib/format.js';
import { phoneDigits, phoneInputError, toPhone } from '@chuctu/shared/phone.js';

// Thành phần dùng chung cho các trang nội bộ, theo prototype "TiepTan-*".

const WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const pad = (n) => String(n).padStart(2, '0');

/** 10:05 ngày 15/10/2026 */
export function fmtStamp(value) {
  const vn = new Date(new Date(value).getTime() + 7 * 3600_000);
  return `${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())} ngày ${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()}`;
}

/** 23 giờ 5 phút */
export function fmtLeft(ms) {
  const mins = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} giờ${m ? ` ${m} phút` : ''}` : `${m} phút`;
}

/** Thông báo đã xong việc, nền xanh. */
export function Notice({ children, onClose }) {
  return (
    <div className="t-notice" role="status">
      <Icon name="checkCircle" size={28} />
      <p style={{ lineHeight: '24px' }}>{children}</p>
      {onClose && (
        <button type="button" className="t-notice-close" onClick={onClose} aria-label="Đóng thông báo">
          <Icon name="x" />
        </button>
      )}
    </div>
  );
}

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="t-error" role="alert">
      <Icon name="alert" size={22} />
      {children}
    </p>
  );
}

/** Ô số điện thoại: tiền tố +84 cố định; kiểm tra bằng phoneError (cùng quy tắc với trang người dùng và server). */
export function PhoneField({ id, label = 'Số điện thoại', value, onChange, error, required = true }) {
  return (
    <div className="t-field">
      <label htmlFor={id} className="t-label">
        {label} {required && <span className="t-req">*</span>}
      </label>
      <div className="t-phone">
        <span className="t-phone-pre" aria-hidden="true">
          +84
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          maxLength={12}
          placeholder="912345678"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(phoneDigits(e.target.value))}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-loi` : undefined}
        />
      </div>
      <FieldError id={`${id}-loi`}>{error}</FieldError>
    </div>
  );
}

/** "912345678" → "0912345678" */
export const normalizePhone = (raw) => toPhone(phoneDigits(raw));

/** Lỗi của ô số điện thoại; null nếu hợp lệ. */
export const phoneError = phoneInputError;

/**
 * Hộp thoại: thanh tiêu đề màu (xanh; vàng khi hoàn tác; đỏ khi huỷ), Esc để đóng, Tab không chạy ra ngoài.
 * Gắn thẳng vào <body> để luôn nằm giữa màn hình.
 */
export function TDialog({ title, subtitle, tone = 'green', width = 700, onClose, children, alert }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const prev = document.activeElement;
    const first = ref.current?.querySelector('.t-dialog-body input, .t-dialog-body select, .t-dialog-body textarea') || ref.current?.querySelector('.t-dialog-close');
    first?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="t-dialog-backdrop t-vars t-app-portal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="t-dialog"
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
        onKeyDown={(e) => trapKeys(e, ref.current, onClose)}
        style={{ maxWidth: width }}
      >
        <div className={`t-dialog-head ${tone}`}>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="t-dialog-close" onClick={onClose} aria-label="Đóng">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Hộp thoại có phần đầu, thân cuộn và phần cuối cố định (phiếu kết quả). */
export function TSheet({ labelledBy, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector('button')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);
  return createPortal(
    <div className="t-dialog-backdrop t-vars t-app-portal" style={{ zIndex: 80 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="t-sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={ref} onKeyDown={(e) => trapKeys(e, ref.current, onClose)}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function trapKeys(e, root, onClose) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    onClose();
    return;
  }
  if (e.key !== 'Tab' || !root) return;
  const items = root.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, a[href]');
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/** Khối tóm tắt phiếu khám trong hộp thoại. */
export function Summary({ items }) {
  return (
    <div className="t-summary">
      {items.map(([label, value, sub, bold = true]) => (
        <div key={label}>
          <p>{label}</p>
          <p className={bold ? 't-v' : 't-v2'}>{value}</p>
          {sub && <p className="t-text">{sub}</p>}
        </div>
      ))}
    </div>
  );
}

/** Phân trang tối đa 10 dòng một trang. */
export function Pager({ page, total, perPage = 10, unit, onPage }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const go = (p) => p >= 1 && p <= pages && p !== page && onPage(p);
  return (
    <nav className="t-pager" aria-label="Phân trang">
      <p className="t-text" aria-live="polite">
        Hiển thị {from}–{to} trong {total} {unit}
      </p>
      <div className="t-pager-btns">
        <button type="button" className="t-pg" aria-disabled={page <= 1} aria-label="Trang trước" onClick={() => go(page - 1)}>
          <Icon name="chevronLeft" size={20} />
          Trước
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            className="t-pg"
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Trang ${p}${p === page ? ', trang hiện tại' : ''}`}
            onClick={() => go(p)}
          >
            {p}
          </button>
        ))}
        <button type="button" className="t-pg" aria-disabled={page >= pages} aria-label="Trang sau" onClick={() => go(page + 1)}>
          Sau
          <Icon name="chevronRight" size={20} />
        </button>
      </div>
    </nav>
  );
}

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

/** Đóng khối nổi (lịch, menu) khi bấm ra ngoài hoặc bấm Esc. */
export function useDismiss(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    const key = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open, onClose]);
  return ref;
}

/** Hộp thoại không có thanh tiêu đề màu (trang quản trị): thân tự trình bày, Esc để đóng. */
export function PlainDialog({ labelledBy, width = 560, alert, onClose, onSubmit, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const first = ref.current?.querySelector('input, select, textarea') || ref.current?.querySelector('button');
    first?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);
  const Tag = onSubmit ? 'form' : 'div';
  return createPortal(
    <div className="t-dialog-backdrop t-vars t-app-portal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Tag
        ref={ref}
        className="a-modal"
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ maxWidth: width }}
        onKeyDown={(e) => trapKeys(e, ref.current, onClose)}
        onSubmit={
          onSubmit &&
          ((e) => {
            e.preventDefault();
            onSubmit();
          })
        }
        noValidate={onSubmit ? true : undefined}
      >
        {children}
      </Tag>
    </div>,
    document.body,
  );
}
