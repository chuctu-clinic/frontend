import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '@chuctu/shared/lib/api.js';
import { fmtDateLong, todayVN } from '@chuctu/shared/lib/format.js';
import { isAdmin, useSession } from '@chuctu/shared/lib/session.jsx';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { Brand } from '@chuctu/shared/components/Brand.jsx';

const STAFF_NAV = [
  { to: '/lich-trong-ngay', label: 'Lịch trong ngày', icon: 'calendar' },
  { to: '/hang-doi', label: 'Hàng đợi', icon: 'queue' },
  { to: '/benh-nhan', label: 'Hồ sơ bệnh nhân', icon: 'users' },
];
const ADMIN_NAV = [
  { to: '/quan-tri', label: 'Tổng quan', icon: 'dashboard', end: true },
  ...STAFF_NAV,
  { to: '/quan-tri/tai-khoan', label: 'Tài khoản', icon: 'shield' },
  { to: '/quan-tri/bai-viet', label: 'Bài viết', icon: 'news' },
];

export function StaffLayout() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = isAdmin(user) ? ADMIN_NAV : STAFF_NAV;

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/dang-nhap');
  };

  return (
    <>
      <a className="skip-link" href="#noi-dung">
        Bỏ qua, tới nội dung chính
      </a>
      <header className="staff-header">
        <div className="container">
          <Brand tag={isAdmin(user) ? 'Quản trị viên' : 'Tiếp tân'} to={isAdmin(user) ? '/quan-tri' : '/lich-trong-ngay'} />
          <button
            type="button"
            className="btn btn-sm btn-on-dark menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="staff-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} />
            Menu
          </button>
          <nav id="staff-nav" className={`staff-nav ${menuOpen ? 'open' : ''}`} aria-label="Chức năng nội bộ">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>
                <Icon name={n.icon} size={20} />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="staff-user">
            <span className="row" style={{ gap: 8 }}>
              <Icon name="user" size={20} />
              {user.fullName}
            </span>
            <button type="button" className="btn btn-sm btn-on-dark" onClick={handleLogout}>
              <Icon name="logout" size={20} />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>
      <main id="noi-dung" className="container staff-main page">
        <p className="caption" style={{ marginBottom: 8 }}>
          {fmtDateLong(todayVN())}
        </p>
        <Outlet />
      </main>
    </>
  );
}

/** Hàng đợi thu gọn: số người trong phòng và đang chờ (UC.10.5). */
export function MiniQueue() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .get('/staff/queue/mini')
        .then((d) => alive && setData(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 20_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  if (!data) return null;
  return (
    <aside className="card stack-sm" aria-label="Hàng đợi thu gọn">
      <h3 style={{ fontSize: 20 }}>Hàng đợi hôm nay</h3>
      <div className="grid-2" style={{ gap: 12 }}>
        <div className="stat">
          <span className="stat-value">
            {data.inRoom}/{data.capacity}
          </span>
          <span className="stat-label">Trong phòng khám</span>
        </div>
        <div className="stat">
          <span className="stat-value">{data.waiting}</span>
          <span className="stat-label">Đang chờ</span>
        </div>
      </div>
      <NavLink to="/hang-doi" className="btn btn-secondary btn-sm">
        Mở hàng đợi
      </NavLink>
    </aside>
  );
}
