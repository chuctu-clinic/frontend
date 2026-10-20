// Thành phần giao diện dùng chung của khu nội bộ, theo prototype (lớp CSS nb-* trong staff.css).
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from '@chuctu/shared/components/Icon.tsx';
import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { addDays, fmtDate, shortTime, todayVN, weekday } from '@chuctu/shared/lib/format.ts';
import type { AppointmentStatus, Slot } from '@chuctu/shared/types.ts';

/** Tiêu đề trang: dòng phụ phía trên, tiêu đề, mô tả và nút bên phải. */
export function NbPageHead({ eyebrow, title, lead, actions }: { eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="nb-pagehead">
      <div>
        {eyebrow && <p className="nb-eyebrow">{eyebrow}</p>}
        <h1 className="nb-h1">{title}</h1>
        {lead && <p className="nb-lead">{lead}</p>}
      </div>
      {actions && <div className="nb-row">{actions}</div>}
    </div>
  );
}

/** Thông báo thành công nền xanh, có nút đóng nếu truyền onClose. */
export function NbOk({ children, onClose, actions }: { children: ReactNode; onClose?: () => void; actions?: ReactNode }) {
  return (
    <div className="nb-ok" role="status">
      <Icon name="checkCircle" />
      <div style={{ flex: '999 1 320px', minWidth: 0 }}>{children}</div>
      {actions}
      {onClose && (
        <button type="button" className="nb-close-x" aria-label="Đóng thông báo" onClick={onClose}>
          <Icon name="x" />
        </button>
      )}
    </div>
  );
}

export function NbError({ error }: { error: ApiError | Error | null | undefined }) {
  if (!error) return null;
  return (
    <div className="nb-error-box" role="alert">
      <Icon name="alert" />
      <span>{error.message}</span>
    </div>
  );
}

export function NbLoading({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <p className="nb-row nb-muted" role="status" style={{ padding: '32px 0', justifyContent: 'center' }}>
      <span className="spinner" aria-hidden="true" />
      {label}
    </p>
  );
}

/** Ô trống trong bảng hoặc danh sách. */
export function NbEmpty({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="nb-empty">
      <p>{title}</p>
      {children && <p>{children}</p>}
    </div>
  );
}

// ---------- Nhãn trạng thái phiếu khám ----------

const STATUS_PILL: Record<AppointmentStatus, { cls: string; icon: IconName; label: string }> = {
  BOOKED: { cls: 'nb-pill-gold', icon: 'clock', label: 'Chưa đến' },
  CHECKED_IN: { cls: 'nb-pill-green', icon: 'check', label: 'Đã check-in' },
  IN_PROGRESS: { cls: 'nb-pill-solid', icon: 'activity', label: 'Đã vào khám' },
  COMPLETED: { cls: 'nb-pill-done', icon: 'checkCircle', label: 'Đã hoàn thành' },
  CANCELLED: { cls: 'nb-pill-cancel', icon: 'x', label: 'Đã huỷ' },
};

export function NbStatus({ status, suffix }: { status: AppointmentStatus; suffix?: string }) {
  const s = STATUS_PILL[status];
  return (
    <span className={`nb-pill ${s.cls}`}>
      <Icon name={s.icon} size={18} />
      {s.label}
      {suffix ? ` ${suffix}` : ''}
    </span>
  );
}

// ---------- Ô nhập ----------

interface FieldProps {
  label: ReactNode;
  required?: boolean;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: (a11y: { id: string; 'aria-invalid'?: 'true'; 'aria-describedby'?: string }) => ReactNode;
}

/** Nhãn phía trên, gợi ý và lỗi phía dưới, gắn đúng với ô nhập. */
export function NbField({ label, required, optional, hint, error, className = '', children }: FieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-g` : '', error ? `${id}-e` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`nb-field ${className}`}>
      <label className="nb-label" htmlFor={id}>
        {label}
        {required && <span className="nb-req"> *</span>}
        {optional && <span className="nb-opt"> (không bắt buộc)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy })}
      {hint && (
        <p className="nb-hint" id={`${id}-g`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="nb-error" id={`${id}-e`} role="alert">
          <Icon name="alert" size={20} />
          {error}
        </p>
      )}
    </div>
  );
}

/** Ô số điện thoại có tiền tố +84 như prototype; giá trị vẫn là số Việt Nam đầy đủ. */
export function NbPhone({ value, onChange, ...a11y }: { value: string; onChange: (v: string) => void; id: string; 'aria-invalid'?: 'true'; 'aria-describedby'?: string }) {
  const shown = value.startsWith('0') ? value.slice(1) : value;
  return (
    <div className="nb-phone">
      <span aria-hidden="true">+84</span>
      <input
        type="tel"
        inputMode="tel"
        placeholder="912345678"
        value={shown}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '').replace(/^0+/, '');
          onChange(digits ? `0${digits}` : '');
        }}
        {...a11y}
      />
    </div>
  );
}

// ---------- Hộp thoại ----------

interface ModalProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  tone?: 'green' | 'red';
  /** Hộp thoại xác nhận ngắn, không có dải màu phía trên. */
  plain?: boolean;
  icon?: IconName;
}

export function NbModal({ title, subtitle, onClose, children, width = 640, tone = 'green', plain, icon }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])');
    (first || ref.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const node = ref.current;
    node?.addEventListener('keydown', onKey);
    return () => {
      node?.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="nb-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="nb-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1} style={{ maxWidth: width }}>
        {plain ? (
          <div className="nb-dialog-plain">
            <div className="nb-dialog-top">
              {icon && (
                <span className={`nb-icon-circle ${tone === 'red' ? 'red' : ''}`}>
                  <Icon name={icon} size={30} />
                </span>
              )}
              <div className="nb-stack-sm" style={{ flex: 1, minWidth: 0 }}>
                <h2 id={titleId} className="nb-h2">
                  {title}
                </h2>
                {subtitle}
              </div>
            </div>
            {children}
          </div>
        ) : (
          <>
            <div className={`nb-dialog-head ${tone === 'red' ? 'red' : ''}`}>
              <div>
                <h2 id={titleId}>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
              </div>
              <button type="button" className="nb-dialog-x" aria-label="Đóng" data-close onClick={onClose}>
                <Icon name="x" />
              </button>
            </div>
            <div className="nb-dialog-body">{children}</div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Menu thao tác của một dòng ----------

export interface MenuItem {
  label: string;
  icon: IconName;
  onClick?: () => void;
  to?: string;
  tone?: 'accent' | 'danger';
}

/** Nút ba chấm mở danh sách thao tác; đóng khi bấm ra ngoài hoặc nhấn Esc. */
export function NbActionMenu({ label, items, renderLink }: { label: string; items: MenuItem[]; renderLink: (item: MenuItem, close: () => void) => ReactNode }) {
  const [pos, setPos] = useState<CSSProperties | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const open = !!pos;
  useEffect(() => {
    if (!open) return undefined;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setPos(null);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPos(null);
    // Menu đặt theo toạ độ màn hình nên đóng khi cuộn hoặc đổi cỡ cửa sổ
    const hide = () => setPos(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [open]);
  if (!items.length) return null;
  const toggle = () => {
    if (open) {
      setPos(null);
      return;
    }
    // position: fixed để menu không bị khung cuộn của bảng cắt; gần cuối màn hình thì mở lên trên
    const rect = ref.current!.getBoundingClientRect();
    const right = Math.max(8, window.innerWidth - rect.right);
    const up = window.innerHeight - rect.bottom < 24 + items.length * 46;
    setPos(up ? { position: 'fixed', right, bottom: window.innerHeight - rect.top + 4, top: 'auto' } : { position: 'fixed', right, top: rect.bottom + 4 });
  };
  const setOpen = (v: boolean) => !v && setPos(null);
  return (
    <div className="nb-menu-wrap" ref={ref}>
      <button type="button" className="nb-btn nb-btn-ghost nb-btn-icon" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        <Icon name="menu" />
      </button>
      {pos && (
        <div className="nb-menu" role="menu" aria-label={label} style={pos}>
          {items.map((it) =>
            it.to ? (
              renderLink(it, () => setOpen(false))
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                className={it.tone}
                onClick={() => {
                  setOpen(false);
                  it.onClick?.();
                }}
              >
                <Icon name={it.icon} size={22} />
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Phân trang ----------

export function NbPager({ page, total, limit, onPage, unit }: { page: number; total: number; limit: number; onPage: (p: number) => void; unit: string }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  const nums = [...Array(pages).keys()].map((i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  return (
    <nav className="nb-pager" aria-label="Phân trang">
      <p>
        Hiển thị {from}–{to} trong {total} {unit}
      </p>
      <div>
        <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <Icon name="chevronLeft" size={20} />
          Trước
        </button>
        {nums.map((p, i) => (
          <span key={p} style={{ display: 'contents' }}>
            {i > 0 && p - nums[i - 1] > 1 && <span aria-hidden="true">…</span>}
            <button type="button" aria-label={`Trang ${p}`} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}>
              {p}
            </button>
          </span>
        ))}
        <button type="button" aria-label="Trang sau" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Sau
          <Icon name="chevronRight" size={20} />
        </button>
      </div>
    </nav>
  );
}

// ---------- Chọn ngày, chọn khung giờ (đặt hộ, đổi giờ) ----------

/** Các ngày từ hôm nay tới maxDays ngày sau, dạng thẻ. */
export function NbDayCards({ value, onChange, maxDays, label }: { value: string; onChange: (d: string) => void; maxDays: number; label: string }) {
  const today = todayVN();
  const days = [...Array(maxDays + 1).keys()].map((n) => addDays(today, n));
  return (
    <div className="nb-stack-sm" style={{ gap: 12 }}>
      <span className="nb-label">
        {label}
        <span className="nb-req"> *</span>
      </span>
      <div className="nb-days" role="radiogroup" aria-label={label}>
        {days.map((d, i) => (
          <button key={d} type="button" className="nb-day" role="radio" aria-checked={value === d} aria-pressed={value === d} onClick={() => onChange(d)}>
            <span>{i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : weekday(d)}</span>
            <span>{fmtDate(d).slice(0, 5)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Khung giờ buổi sáng và chiều; khung hết giờ hoặc đủ chỗ hiện xám và không chọn được. */
export function NbSlotPicker({ slots, value, onChange, label, loading }: { slots: Slot[] | null | undefined; value: string; onChange: (s: string) => void; label: string; loading?: boolean }) {
  const groups: [string, Slot[]][] = [
    ['Buổi sáng', (slots || []).filter((s) => s.start < '12:00')],
    ['Buổi chiều', (slots || []).filter((s) => s.start >= '12:00')],
  ];
  return (
    <div className="nb-stack-sm" style={{ gap: 14 }}>
      <span className="nb-label">
        {label}
        <span className="nb-req"> *</span>
      </span>
      {loading && <NbLoading label="Đang xem khung giờ còn chỗ…" />}
      {!loading &&
        groups.map(([name, list]) => (
          <div key={name} className="nb-stack-sm" style={{ gap: 10 }}>
            <span className="nb-label nb-muted">{name}</span>
            <div className="nb-slots" role="radiogroup" aria-label={`Khung giờ ${name.toLowerCase()}`}>
              {list.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  className="nb-slot"
                  role="radio"
                  aria-checked={value === s.start}
                  aria-pressed={value === s.start}
                  disabled={!s.available}
                  onClick={() => onChange(s.start)}
                >
                  {shortTime(s.start)}
                  {!s.available ? <small>{s.reason}</small> : <small>Còn {s.remaining} chỗ</small>}
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

// ---------- Lịch tháng ----------

const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Lịch tháng bắt đầu từ Thứ Hai; min/max giới hạn ngày chọn được. */
export function NbMonthCalendar({ value, onPick, min, max }: { value: string | null; onPick: (d: string) => void; min?: string; max?: string }) {
  const [month, setMonth] = useState((value || todayVN()).slice(0, 7));
  const [y, m] = month.split('-').map(Number);
  const firstDow = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array<null>(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
  const shift = (n: number) => setMonth(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7));
  const today = todayVN();
  return (
    <div className="nb-stack-sm" style={{ gap: 12 }}>
      <div className="nb-row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <button type="button" className="nb-btn nb-btn-ghost nb-btn-icon" aria-label="Tháng trước" onClick={() => shift(-1)}>
          <Icon name="chevronLeft" />
        </button>
        <p className="nb-h2">
          Tháng {m}/{y}
        </p>
        <button type="button" className="nb-btn nb-btn-ghost nb-btn-icon" aria-label="Tháng sau" onClick={() => shift(1)}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <div className="nb-cal-grid" aria-hidden="true">
        {DOW.map((d) => (
          <span key={d} className={d === 'CN' ? 'sun' : ''}>
            {d}
          </span>
        ))}
      </div>
      <div className="nb-cal-grid">
        {cells.map((d, i) =>
          d ? (
            <button
              key={d}
              type="button"
              className={`nb-cal-day ${d === today ? 'today' : ''}`}
              aria-pressed={d === value}
              aria-label={`${weekday(d)}, ${fmtDate(d)}`}
              disabled={(!!min && d < min) || (!!max && d > max)}
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
  );
}
