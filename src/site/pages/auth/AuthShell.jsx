import { Link } from 'react-router-dom';
import { Brand } from '../../../shared/ui/Brand.jsx';
import { CLINIC } from '../../../shared/lib/format.js';
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
