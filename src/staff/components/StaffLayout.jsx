import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { useDismiss } from '../../shared/lib/hooks.js';
import { isAdmin, useSession } from '../../shared/lib/session.jsx';
import { ROLE_LABELS } from '../../shared/lib/format.js';
import { homeFor } from '../lib/home.js';
import { Icon } from '../../shared/ui/Icon.jsx';
import './staff.css';
import { TodayBar } from './TodayBar.jsx';

const SCHEDULE = { to: '/noi-bo/lich-trong-ngay', label: 'Lịch trong ngày', icon: 'calendar' };
const QUEUE = { to: '/noi-bo/hang-doi', label: 'Hàng đợi', icon: 'queue' };
const PATIENTS = { to: '/noi-bo/benh-nhan', label: 'Hồ sơ bệnh nhân', icon: 'users', end: true };
const EXAM = { to: '/noi-bo/kham-benh', label: 'Khám bệnh', icon: 'file' };
const TREATMENT = { to: '/noi-bo/dieu-tri', label: 'Điều trị', icon: 'check' };

const NAV = {
  RECEPTIONIST: [SCHEDULE, QUEUE, PATIENTS],
  DOCTOR: [EXAM, QUEUE],
  TECHNICIAN: [TREATMENT, QUEUE],
  ADMIN: [
    { to: '/noi-bo/quan-tri', label: 'Tổng quan', icon: 'dashboard', end: true },
    SCHEDULE,
    QUEUE,
    EXAM,
    TREATMENT,
    PATIENTS,
    { to: '/noi-bo/quan-tri/bai-viet', label: 'Quản lý bài viết', icon: 'news' },
    { to: '/noi-bo/quan-tri/tai-khoan', label: 'Quản lý tài khoản', icon: 'userPlus' },
  ],
};

// Trang lập phiếu kết quả, khám sơ bộ và trang soạn bài rộng hết khung, không có cột menu (theo prototype)
const WIDE = ['/noi-bo/phieu-kham/:appointmentId/ket-qua', '/noi-bo/kham-benh/:checkinId', '/noi-bo/quan-tri/bai-viet/moi', '/noi-bo/quan-tri/bai-viet/:id'];
const EXTRA_WIDE = ['/noi-bo/quan-tri/bai-viet/moi', '/noi-bo/quan-tri/bai-viet/:id'];

export function StaffLayout() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const admin = isAdmin(user);
  const nav = NAV[user.role] || NAV.RECEPTIONIST;
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
          <Link to={homeFor(user)} className="t-logo" aria-label="Khu nội bộ Phòng khám Chúc Từ">
            <img src={`${import.meta.env.BASE_URL}logo-192.png`} alt="" />
            <span>Chúc Từ</span>
          </Link>
          <span className={`t-role ${admin ? 't-role-admin' : ''}`}>
            <Icon name={admin ? 'shield' : 'user'} size={20} strokeWidth={1.75} />
            {ROLE_LABELS[user.role]}
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
            <TodayBar />
            <Outlet />
          </main>
        ) : (
          <div className="t-shell">
            <div className="t-aside">
              <nav id="t-side" className={`t-side ${menuOpen ? 'open' : ''}`} aria-label={`Chức năng ${ROLE_LABELS[user.role].toLowerCase()}`}>
                {nav.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.end}>
                    <Icon name={n.icon} strokeWidth={1.75} />
                    {n.label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <main id="noi-dung" className="t-main">
              <TodayBar />
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
