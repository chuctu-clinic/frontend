import { useId } from 'react';
import { Link } from 'react-router-dom';
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
