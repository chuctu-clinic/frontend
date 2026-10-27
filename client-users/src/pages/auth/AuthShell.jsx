import { Link } from 'react-router-dom';
import { Brand } from '@chuctu/shared/components/Brand.jsx';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { CLINIC } from '@chuctu/shared/lib/format.js';
import { phoneDigits, phoneInputError, toPhone } from '@chuctu/shared/phone.js';
import './auth.css';

/**
 * Khung chung cho trang đăng nhập/tạo tài khoản theo prototype: đầu trang rút gọn
 * (logo + nút sang trang còn lại), cột ảnh bên trái, biểu mẫu bên phải, chân trang một dòng.
 */
export function AuthShell({ switchText, switchLabel, switchTo, aside, wide, children }) {
  return (
    <div className="auth">
      <a className="skip-link" href="#noi-dung">
        Bỏ qua, tới nội dung chính
      </a>
      <header className="a-header">
        <div className="a-header-row">
          <Brand />
          <div className="a-header-switch">
            <span>{switchText}</span>
            <Link className="a-btn-ghost" to={switchTo}>
              {switchLabel}
            </Link>
          </div>
        </div>
      </header>

      <main id="noi-dung" className="a-main">
        <div className={`a-grid ${wide ? 'a-grid-top' : ''}`}>
          <div className={`a-aside ${wide ? 'a-aside-narrow' : ''}`}>{aside}</div>
          <div className={`a-card ${wide ? 'a-card-wide' : ''}`}>{children}</div>
        </div>
      </main>

      <footer className="a-footer">
        <div className="a-footer-row">
          <span>
            © {new Date().getFullYear()} Phòng khám {CLINIC.short} · {CLINIC.address}
          </span>
          <Link to="/lien-he">Cần giúp đỡ? Liên hệ phòng khám</Link>
        </div>
      </footer>
    </div>
  );
}

export function ClinicPhoto({ framed, short }) {
  return (
    <img
      className={`a-photo ${framed ? 'a-photo-framed' : ''} ${short ? 'a-photo-short' : ''}`}
      src="/mat-tien.jpg"
      alt="Mặt tiền Phòng khám Chúc Từ"
    />
  );
}

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="a-error" role="alert">
      <Icon name="alert" size={22} />
      {children}
    </p>
  );
}

// Xử lý ô số điện thoại dùng chung với khu nội bộ và cùng quy tắc với Backend (shared/src/phone.js)
export { phoneDigits, toPhone, phoneInputError as phoneError };

/** Ô số điện thoại có tiền tố +84 cố định. */
export function PhoneField({ id, label, required, value, onChange, error, note, autoFocus }) {
  const errId = `${id}-loi`;
  const noteId = `${id}-note`;
  return (
    <div className="a-field">
      <label htmlFor={id} className="a-label">
        {label}
        {required && (
          <>
            {' '}
            <span className="a-req" aria-hidden="true">
              *
            </span>
          </>
        )}
      </label>
      <div className="a-phone">
        <span className="a-phone-pre" aria-hidden="true">
          +84
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={12}
          value={value}
          onChange={(e) => onChange(phoneDigits(e.target.value))}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={[error && errId, note && noteId].filter(Boolean).join(' ') || undefined}
          autoFocus={autoFocus}
        />
      </div>
      <FieldError id={errId}>{error}</FieldError>
      {note && (
        <p id={noteId} className="a-hint">
          {note}
        </p>
      )}
    </div>
  );
}
