import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { STATUS } from '../lib/format.js';
import { Icon } from './Icon.jsx';

export function Button({ variant = 'primary', size, block, loading, icon, children, className = '', ...props }) {
  const cls = ['btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', className].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} disabled={loading || props.disabled} aria-busy={loading || undefined} {...props}>
      {loading ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({ to, variant = 'primary', size, block, icon, children, className = '', ...props }) {
  const cls = ['btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', className].filter(Boolean).join(' ');
  return (
    <Link to={to} className={cls} {...props}>
      {icon && <Icon name={icon} />}
      {children}
    </Link>
  );
}

/** Ô nhập có nhãn phía trên và lỗi hiện ngay dưới ô (Design System — Form). */
export function Field({ label, required, hint, error, children, className = '' }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  const control = typeof children === 'function' ? children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? 'true' : undefined }) : children;
  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={id}>
        {label}
        {required && (
          <span className="field-required" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (bắt buộc)</span>}
      </label>
      {hint && (
        <span className="field-hint" id={hintId}>
          {hint}
        </span>
      )}
      {control}
      {error && (
        <span className="field-error" id={errId} role="alert">
          <Icon name="alert" size={20} />
          {error}
        </span>
      )}
    </div>
  );
}

export function TextInput({ label, required, hint, error, className, ...props }) {
  return (
    <Field label={label} required={required} hint={hint} error={error} className={className}>
      {(a11y) => <input className="input" required={required} {...a11y} {...props} />}
    </Field>
  );
}

export function SelectInput({ label, required, hint, error, options, placeholder, className, ...props }) {
  return (
    <Field label={label} required={required} hint={hint} error={error} className={className}>
      {(a11y) => (
        <select className="select" required={required} {...a11y} {...props}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function TextArea({ label, required, hint, error, className, ...props }) {
  return (
    <Field label={label} required={required} hint={hint} error={error} className={className}>
      {(a11y) => <textarea className="textarea" required={required} {...a11y} {...props} />}
    </Field>
  );
}

const ALERT_ICON = { success: 'checkCircle', error: 'alert', info: 'info', warning: 'alert' };

export function Alert({ type = 'info', title, children, className = '' }) {
  return (
    <div className={`alert alert-${type} ${className}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={ALERT_ICON[type]} />
      <div className="stack-sm" style={{ gap: 4 }}>
        {title && <p className="alert-title">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

/** Lỗi từ API; lỗi theo từng trường đã hiện dưới ô nhập nên chỉ nhắc chung. */
export function ErrorAlert({ error, className }) {
  if (!error) return null;
  return (
    <Alert type="error" className={className}>
      {error.message}
    </Alert>
  );
}

export function Badge({ tone = 'gray', icon, children }) {
  return (
    <span className={`badge badge-${tone}`}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </span>
  );
}

const STATUS_ICON = { BOOKED: 'calendar', CHECKED_IN: 'check', IN_PROGRESS: 'activity', COMPLETED: 'checkCircle', CANCELLED: 'x' };

export function StatusBadge({ status, forUser }) {
  const s = STATUS[status];
  if (!s) return null;
  return (
    <Badge tone={s.tone} icon={STATUS_ICON[status]}>
      {forUser && s.userLabel ? s.userLabel : s.label}
    </Badge>
  );
}

export function Loading({ label = 'Đang tải…' }) {
  return (
    <div className="row muted" role="status" style={{ padding: '32px 0', justifyContent: 'center' }}>
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function Empty({ icon = 'info', title, children, action }) {
  return (
    <div className="empty stack-sm" style={{ alignItems: 'center' }}>
      <Icon name={icon} size={36} />
      <p className="lead" style={{ color: 'var(--ink-900)', fontWeight: 600 }}>
        {title}
      </p>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

/** Hộp thoại chỉ dùng cho xác nhận và thông tin ngắn (Design System — Modal). */
export function Modal({ title, children, onClose, actions, wide }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement;
    const first = ref.current?.querySelector('input, select, textarea, button:not([data-close])');
    (first || ref.current)?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    ref.current?.addEventListener('keydown', onKey);
    const node = ref.current;
    return () => {
      node?.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
          <h2 id={titleId} style={{ fontSize: 26, lineHeight: '34px' }}>
            {title}
          </h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Đóng" data-close>
            <Icon name="x" />
          </button>
        </div>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Pagination({ page, total, limit, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Phân trang">
      <Button variant="secondary" size="sm" icon="chevronLeft" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Trang trước
      </Button>
      <span className="row" style={{ padding: '0 8px' }}>
        Trang {page} / {pages}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Trang sau
        <Icon name="chevronRight" />
      </Button>
    </nav>
  );
}

export function Breadcrumb({ items }) {
  return (
    <nav aria-label="Đường dẫn">
      <ol className="breadcrumb">
        {items.map((it, i) => (
          <li key={i}>{it.to ? <Link to={it.to}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="row-between" style={{ alignItems: 'flex-end', marginBottom: 28 }}>
      <div className="stack-sm" style={{ gap: 6 }}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}
