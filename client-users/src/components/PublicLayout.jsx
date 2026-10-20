import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CLINIC } from '@chuctu/shared/lib/format.js';
import { isStaff, useSession } from '@chuctu/shared/lib/session.jsx';
import { Brand } from '@chuctu/shared/components/Brand.jsx';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { adminUrl } from '@chuctu/shared/lib/apps.js';
import './layout.css';

const NAV = [
  { to: '/gioi-thieu', label: 'Giới thiệu' },
  { to: '/dich-vu', label: 'Dịch vụ' },
  { to: '/tin-tuc', label: 'Tin tức' },
  { to: '/huong-dan', label: 'Hướng dẫn' },
  { to: '/lien-he', label: 'Liên hệ' },
];

export const ACCOUNT_LINKS = [
  { to: '/tai-khoan', label: 'Thông tin tài khoản', icon: 'user' },
  { to: '/tai-khoan/ho-so', label: 'Hồ sơ khám bệnh', icon: 'users' },
  { to: '/phieu-kham', label: 'Phiếu khám bệnh', icon: 'ticket' },
  { to: '/lich-su-kham', label: 'Lịch sử khám', icon: 'clipboard' },
];

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="btn btn-secondary" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}>
        <Icon name="user" />
        <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.fullName}</span>
        <Icon name="chevronDown" size={20} />
      </button>
      {open && (
        <div className="user-menu-list" onClick={() => setOpen(false)}>
          {ACCOUNT_LINKS.map((l) => (
            <Link key={l.to} to={l.to}>
              <Icon name={l.icon} />
              {l.label}
            </Link>
          ))}
          <button type="button" onClick={onLogout}>
            <Icon name="logout" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

export function PublicLayout() {
  const { user, logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
    // Đổi trang thì lên đầu ngay, không cuộn mượt (scroll-behavior: smooth chỉ dành cho liên kết trong trang)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <a className="skip-link" href="#noi-dung">
        Bỏ qua, tới nội dung chính
      </a>
      <div className="topbar">
        <div className="container">
          <span className="topbar-item">
            <Icon name="phone" size={20} strokeWidth={1.75} />
            <a href={CLINIC.phoneHref}>{CLINIC.phone}</a>
          </span>
          <span className="topbar-item">
            <Icon name="pin" size={20} strokeWidth={1.75} />
            {CLINIC.address}
          </span>
          <span className="topbar-item topbar-free">
            <Icon name="heartSoft" size={20} strokeWidth={1.75} />
            Khám và điều trị từ thiện — không thu phí
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="container">
          <Brand />
          <button
            type="button"
            className="btn btn-secondary menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} />
            Menu
          </button>
          <nav id="main-nav" className={`main-nav ${menuOpen ? 'open' : ''}`} aria-label="Điều hướng chính">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            {user && user.role === 'USER' ? (
              <UserMenu user={user} onLogout={handleLogout} />
            ) : isStaff(user) ? (
              <a href={adminUrl(user.role === 'ADMIN' ? 'quan-tri' : 'lich-trong-ngay')} className="btn btn-secondary">
                <Icon name="dashboard" />
                Khu nội bộ
              </a>
            ) : (
              <Link to="/dang-nhap" className="btn btn-login">
                <Icon name="userSoft" size={22} strokeWidth={1.75} />
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>
      <main id="noi-dung">
        {/* key theo đường dẫn để nội dung hiện dần mỗi lần chuyển trang (motion.css) */}
        <div key={location.pathname} className="route-fade">
          <Outlet />
        </div>
      </main>
      <Footer user={user} />
    </>
  );
}

/** Chân trang theo prototype: 3 thẻ liên hệ, thương hiệu + liên kết, dòng bản quyền. */
function Footer({ user }) {
  const cols = [
    ['Nội dung', NAV],
    [
      'Tài khoản',
      user?.role === 'USER'
        ? ACCOUNT_LINKS
        : [
            { to: '/dang-nhap', label: 'Đăng nhập' },
            { to: '/dang-ky', label: 'Tạo tài khoản' },
          ],
    ],
    [
      'Cần giúp đỡ',
      [
        { to: '/huong-dan', label: 'Hướng dẫn đặt lịch' },
        { to: '/huong-dan', label: 'Câu hỏi thường gặp' },
        { href: adminUrl('dang-nhap'), label: 'Đăng nhập nội bộ' },
      ],
    ],
  ];
  return (
    <footer className="site-footer">
      <div className="f-contacts">
        <div className="f-grid">
          <div className="f-card">
            <span className="f-dot">
              <Icon name="pin" strokeWidth={1.75} />
            </span>
            <div>
              <h3>Địa chỉ phòng khám</h3>
              <p>{CLINIC.address}</p>
            </div>
          </div>
          <div className="f-card">
            <span className="f-dot">
              <Icon name="clockSoft" strokeWidth={1.75} />
            </span>
            <div>
              <h3>Giờ khám</h3>
              <p>
                Tất cả các ngày trong tuần,
                <br />
                kể cả Chủ Nhật: <strong>{CLINIC.hours}</strong>
              </p>
            </div>
          </div>
          <div className="f-card">
            <span className="f-dot">
              <Icon name="phone" strokeWidth={1.75} />
            </span>
            <div>
              <h3>Gọi cho phòng khám</h3>
              <a href={CLINIC.phoneHref} className="f-phone">
                {CLINIC.phone}
              </a>
              <p className="f-muted">Cô chú cứ gọi, có người trực nghe máy.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="f-links">
        <div className="f-links-row">
          <div className="f-brand">
            <Brand tag="Y học cổ truyền · Từ thiện" />
            <p>{CLINIC.name} — khám và điều trị không thu phí cho bà con.</p>
          </div>
          {cols.map(([title, links]) => (
            <nav key={title} className="f-col" aria-label={title}>
              <h3>{title}</h3>
              {links.map((l) => (
                l.href ? (
                  <a key={l.label} href={l.href}>
                    {l.label}
                  </a>
                ) : (
                  <Link key={l.label} to={l.to}>
                    {l.label}
                  </Link>
                )
              ))}
            </nav>
          ))}
        </div>
      </div>
      <div className="f-bottom">
        <div className="f-bottom-row">
          <p>
            © {new Date().getFullYear()} {CLINIC.name}.
          </p>
          <p>Thông tin trên trang chỉ mang tính tham khảo, không thay thế chẩn đoán của thầy thuốc.</p>
        </div>
      </div>
    </footer>
  );
}
