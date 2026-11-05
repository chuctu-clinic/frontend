import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { CLINIC } from '../../../shared/lib/format.js';
import './auth.css';

/** Liên kết giữa đăng nhập và tạo tài khoản: khung trang biến đổi mượt sang trang kia (auth.css); trình duyệt chưa hỗ trợ thì đổi trang như thường. */
export function AuthLink({ to, ...props }) {
  const navigate = useNavigate();
  const go = (e) => {
    const plainClick = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
    if (!plainClick || !document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    document.startViewTransition(() => flushSync(() => navigate(to)));
  };
  return <Link to={to} onClick={go} {...props} />;
}

/** Khung chung cho trang đăng nhập/tạo tài khoản: logo lớn bên trái, khối màu bo góc chứa thẻ biểu mẫu bên phải. */
export function AuthShell({ wide, note, children }) {
  return (
    <div className={`auth a-split ${wide ? 'a-split-wide' : ''}`}>
      <a className="skip-link" href="#noi-dung">
        Bỏ qua, tới nội dung chính
      </a>
      <div className="a-split-brand">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="1292" height="1218" />
        <span className="a-split-name">{CLINIC.short}</span>
        <span className="a-split-tag">Y học cổ truyền từ thiện</span>
        {note && <p className="a-split-note">{note}</p>}
      </div>
      <main id="noi-dung" className="a-split-panel">
        <div className={`a-split-card ${wide ? 'a-split-card-wide' : ''}`}>{children}</div>
        <div className="a-split-links">
          <Link to="/">Về trang chủ</Link>
          <Link to="/lien-he">Cần giúp đỡ? Liên hệ phòng khám</Link>
        </div>
      </main>
    </div>
  );
}
