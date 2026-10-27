import { Icon } from '../../shared/ui/Icon.jsx';
import { phoneDigits, phoneInputError, toPhone } from '../../shared/domain/phone.js';

// Thông báo và ô nhập của khu nội bộ

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
