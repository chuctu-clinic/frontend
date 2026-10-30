import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { useDismiss } from '../../shared/lib/hooks.js';
import { isAdmin, useSession } from '../../shared/lib/session.jsx';
import { Icon } from '../../shared/ui/Icon.jsx';
import './staff.css';

const STAFF_NAV = [
  { to: '/noi-bo/lich-trong-ngay', label: 'Lịch trong ngày', icon: 'calendar' },
  { to: '/noi-bo/hang-doi', label: 'Hàng đợi', icon: 'queue' },
  { to: '/noi-bo/benh-nhan', label: 'Hồ sơ bệnh nhân', icon: 'users' },
];
const ADMIN_NAV = [
  { to: '/noi-bo/quan-tri', label: 'Tổng quan', icon: 'dashboard', end: true },
  ...STAFF_NAV,
  { to: '/noi-bo/quan-tri/bai-viet', label: 'Quản lý bài viết', icon: 'news' },
  { to: '/noi-bo/quan-tri/tai-khoan', label: 'Quản lý tài khoản', icon: 'userPlus' },
];

// Trang lập phiếu kết quả và trang soạn bài rộng hết khung, không có cột menu (theo prototype)
const WIDE = ['/noi-bo/phieu-kham/:appointmentId/ket-qua', '/noi-bo/quan-tri/bai-viet/moi', '/noi-bo/quan-tri/bai-viet/:id'];
const EXTRA_WIDE = ['/noi-bo/quan-tri/bai-viet/moi', '/noi-bo/quan-tri/bai-viet/:id'];

export function StaffLayout() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const admin = isAdmin(user);
  const nav = admin ? ADMIN_NAV : STAFF_NAV;
  const wide = WIDE.some((p) => matchPath(p, pathname));
  const extraWide = EXTRA_WIDE.some((p) => matchPath(p, pathname));

  useEffect(() => setMenuOpen(false), [pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/noi-bo/dang-nhap');
  };

  return (
    <div className="t-app t-vars">
      <a className="skip-link" href="#noi-dung">
        Bỏ qua, tới nội dung chính
      </a>
      <header className="t-header">
        <div className="t-header-row">
          <Link to={admin ? '/noi-bo/quan-tri' : '/noi-bo/lich-trong-ngay'} className="t-logo" aria-label="Khu nội bộ Phòng khám Chúc Từ">
            <img src={`${import.meta.env.BASE_URL}logo-192.png`} alt="" />
            <span>Chúc Từ</span>
          </Link>
          <span className={`t-role ${admin ? 't-role-admin' : ''}`}>
            <Icon name={admin ? 'shield' : 'user'} size={20} strokeWidth={1.75} />
            {admin ? 'Quản trị viên' : 'Tiếp tân'}
          </span>
          {!wide && (
            <button type="button" className="t-burger" aria-expanded={menuOpen} aria-controls="t-side" onClick={() => setMenuOpen((v) => !v)}>
              <Icon name={menuOpen ? 'x' : 'menu'} />
              <span className="t-burger-label">Menu</span>
            </button>
          )}
          <div className="t-user">
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </div>
      </header>
      <section className="t-page">
        {wide ? (
          <main id="noi-dung" className="t-shell-narrow" style={extraWide ? { maxWidth: 1160 } : undefined}>
            <Outlet />
          </main>
        ) : (
          <div className="t-shell">
            <div className="t-aside">
              <nav id="t-side" className={`t-side ${menuOpen ? 'open' : ''}`} aria-label={admin ? 'Chức năng quản trị' : 'Chức năng tiếp tân'}>
                {nav.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.end}>
                    <Icon name={n.icon} strokeWidth={1.75} />
                    {n.label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <main id="noi-dung" className="t-main">
              <Outlet />
            </main>
          </div>
        )}
      </section>
    </div>
  );
}

/** Nút tên người dùng trên thanh đầu, mở menu Thông tin tài khoản và Đăng xuất. */
function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const { pathname } = useLocation();
  useEffect(close, [pathname, close]);
  return (
    <div className="t-menu-wrap t-user-menu" ref={ref}>
      <button type="button" className="t-user-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Tài khoản của ${user.fullName}`} onClick={() => setOpen((v) => !v)}>
        <span className="t-user-avatar">
          <Icon name="user" size={20} strokeWidth={1.75} />
        </span>
        <span className="t-user-name">{user.fullName}</span>
        <Icon name="chevronDown" size={18} strokeWidth={2.25} />
      </button>
      {open && (
        <div role="menu" aria-label={`Tài khoản của ${user.fullName}`} className="t-menu down">
          <NavLink to="/noi-bo/tai-khoan" role="menuitem" className="t-menu-item">
            <Icon name="user" size={22} strokeWidth={1.75} />
            Thông tin tài khoản
          </NavLink>
          <button type="button" role="menuitem" className="t-menu-item danger" onClick={onLogout}>
            <Icon name="logout" size={22} strokeWidth={1.75} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
