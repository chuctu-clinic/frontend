import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CLINIC } from '../../shared/lib/format.js';
import { useDismiss } from '../../shared/lib/hooks.js';
import { isStaff, useSession } from '../../shared/lib/session.jsx';
import { Brand } from '../../shared/ui/Brand.jsx';
import { Icon } from '../../shared/ui/Icon.jsx';
import { homeFor } from '../../staff/lib/home.js';
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
  { to: '/tai-khoan/ho-so', label: 'Hồ sơ khám bệnh', icon: 'clipboard' },
  { to: '/phieu-kham', label: 'Phiếu khám bệnh', icon: 'calendar' },
  { to: '/lich-su-kham', label: 'Lịch sử khám', icon: 'file' },
];

/** Nút tên người dùng và menu tài khoản, theo prototype "Người dùng · Trang chủ". */
function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}>
        <span className="user-avatar">
          <Icon name="user" size={22} strokeWidth={1.75} />
        </span>
        <span className="user-name">{user.fullName}</span>
        <Icon name="chevronDown" size={20} strokeWidth={2.25} />
      </button>
      {open && (
        <div className="user-menu-list" onClick={() => setOpen(false)}>
          {ACCOUNT_LINKS.map((l) => (
            <Link key={l.to} to={l.to}>
              <Icon name={l.icon} size={26} strokeWidth={1.75} />
              {l.label}
            </Link>
          ))}
          <span className="user-menu-sep" aria-hidden="true" />
          <button type="button" className="user-menu-logout" onClick={onLogout}>
            <Icon name="logout" size={26} strokeWidth={1.75} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

export function PublicLayout() {
  const { user, logout } = useSession();
  const loggedIn = user?.role === 'USER';
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
      <header className={`site-header ${loggedIn ? 'site-header-user' : ''}`}>
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
            {loggedIn ? (
              <UserMenu user={user} onLogout={handleLogout} />
            ) : isStaff(user) ? (
              <Link to={homeFor(user)} className="btn btn-secondary">
                <Icon name="dashboard" />
                Khu nội bộ
              </Link>
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
      {loggedIn ? <UserFooter onLogout={handleLogout} /> : <Footer />}
      <QuickContact />
    </>
  );
}

/** Hai nút gọi điện và chỉ đường, luôn nằm ở góc dưới bên phải màn hình điện thoại và máy bảng (layout.css). */
function QuickContact() {
  return (
    <nav className="quick-contact" aria-label="Liên hệ nhanh">
      <a href={CLINIC.phoneHref} className="quick-btn" aria-label={`Gọi phòng khám ${CLINIC.phone}`}>
        <Icon name="phone" size={28} strokeWidth={1.75} />
      </a>
      <a href={CLINIC.mapUrl} className="quick-btn quick-btn-map" target="_blank" rel="noreferrer" aria-label="Xem đường đi trên Google Maps">
        <Icon name="map" size={28} strokeWidth={1.75} />
      </a>
    </nav>
  );
}

function FooterBottom() {
  return (
    <div className="f-bottom">
      <div className="f-bottom-row">
        <p>
          © {new Date().getFullYear()} {CLINIC.name}.
        </p>
        <p>Thông tin trên trang chỉ mang tính tham khảo, không thay thế chẩn đoán của thầy thuốc.</p>
      </div>
    </div>
  );
}

/** Chân trang khi đã đăng nhập, theo prototype "Người dùng": thương hiệu, tài khoản, giúp đỡ, thông tin phòng khám. */
function UserFooter({ onLogout }) {
  return (
    <footer className="site-footer">
      <div className="f-links f-links-user">
        <div className="f-links-row">
          <div className="f-brand">
            <Brand tag="Y học cổ truyền · Từ thiện" />
            <p>Khám và điều trị không thu phí cho bà con. Cần gì cô chú cứ gọi, có người trực nghe máy.</p>
          </div>
          <nav className="f-col" aria-label="Tài khoản của tôi">
            <h3>Tài khoản của tôi</h3>
            {ACCOUNT_LINKS.map((l) => (
              <Link key={l.to} to={l.to}>
                {l.label}
              </Link>
            ))}
            <Link to="/dat-lich" className="f-strong">
              Đặt lịch khám mới
            </Link>
          </nav>
          <nav className="f-col" aria-label="Cần giúp đỡ">
            <h3>Cần giúp đỡ</h3>
            <Link to="/huong-dan">Hướng dẫn đặt lịch</Link>
            <Link to="/huong-dan">Câu hỏi thường gặp</Link>
            <Link to="/lien-he">Liên hệ phòng khám</Link>
            <button type="button" className="f-logout" onClick={onLogout}>
              Đăng xuất
            </button>
          </nav>
          <div className="f-clinic">
            <h3>Phòng khám</h3>
            <div className="f-clinic-item">
              <span className="f-dot">
                <Icon name="pin" size={22} strokeWidth={1.75} />
              </span>
              <p>{CLINIC.address}</p>
            </div>
            <div className="f-clinic-item">
              <span className="f-dot">
                <Icon name="clockSoft" size={22} strokeWidth={1.75} />
              </span>
              <p>
                Mỗi ngày kể cả Chủ Nhật:
                <br />
                <strong>{CLINIC.hours}</strong>
              </p>
            </div>
            <div className="f-clinic-item" style={{ alignItems: 'center' }}>
              <span className="f-dot">
                <Icon name="phone" size={22} strokeWidth={1.75} />
              </span>
              <a href={CLINIC.phoneHref} className="f-phone">
                {CLINIC.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
      <FooterBottom />
    </footer>
  );
}

/** Chân trang theo prototype: 3 thẻ liên hệ, thương hiệu + liên kết, dòng bản quyền. */
function Footer() {
  const cols = [
    ['Nội dung', NAV],
    [
      'Tài khoản',
      [
        { to: '/dang-nhap', label: 'Đăng nhập' },
        { to: '/dang-ky', label: 'Tạo tài khoản' },
      ],
    ],
    [
      'Cần giúp đỡ',
      [
        { to: '/huong-dan', label: 'Hướng dẫn đặt lịch' },
        { to: '/huong-dan', label: 'Câu hỏi thường gặp' },
        { to: '/noi-bo/dang-nhap', label: 'Đăng nhập nội bộ' },
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
      <FooterBottom />
    </footer>
  );
}
