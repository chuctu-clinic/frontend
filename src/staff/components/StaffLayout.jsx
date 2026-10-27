import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../shared/lib/api.js';
import { fmtTime } from '../../shared/lib/format.js';
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
// Các trang có hàng đợi thu gọn dưới menu
const WITH_MINI = ['/noi-bo/lich-trong-ngay', '/noi-bo/benh-nhan', '/noi-bo/benh-nhan/:id'];

export function StaffLayout() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const admin = isAdmin(user);
  const nav = admin ? ADMIN_NAV : STAFF_NAV;
  const wide = WIDE.some((p) => matchPath(p, pathname));
  const mini = WITH_MINI.some((p) => matchPath(p, pathname));
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
            <span className="t-user-name">{user.fullName}</span>
            <button type="button" className="t-btn-dark" onClick={handleLogout}>
              Đăng xuất
            </button>
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
              {mini && <MiniQueue />}
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

/** Hàng đợi thu gọn: số người trong phòng, đang chờ và 5 người kế tiếp (UC.10.5). */
export function MiniQueue() {
  const [data, setData] = useState(null);
  const { pathname } = useLocation();
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .get('/staff/queue/mini')
        .then((d) => alive && setData({ ...d, at: new Date() }))
        .catch(() => {});
    load();
    const t = setInterval(load, 20_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // Tải lại khi đổi trang để thấy ngay người vừa check-in
  }, [pathname]);
  if (!data) return null;
  return (
    <section className="t-mini" aria-labelledby="t-mini-title">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h2 id="t-mini-title" className="t-mini-title">
          <Icon name="queue" size={22} strokeWidth={1.75} />
          Hàng đợi
        </h2>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-500)', whiteSpace: 'nowrap' }}>lúc {fmtTime(data.at).replace(/^0/, '')}</span>
      </div>
      <div className="t-mini-stats">
        <p className="t-mini-stat green">
          Trong phòng
          <strong>
            {data.inRoom}/{data.capacity}
          </strong>
        </p>
        <p className="t-mini-stat">
          Đang chờ
          <strong>{data.waiting}</strong>
        </p>
      </div>
      {data.next?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p className="t-eyebrow">{data.next.length} người kế tiếp</p>
          <ol className="t-mini-list">
            {data.next.map((k, i) => (
              <li key={k.id} className={k.priorityGroup === 'PRIORITY' ? 'prio' : ''}>
                <span className="t-mini-no">{i + 1}</span>
                <span>{k.fullName}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="t-mini-legend" role="group" aria-label="Chú thích màu nền">
        <p className="t-eyebrow">Chú thích</p>
        <div>
          <span className="t-swatch prio" aria-hidden="true" />
          <span>
            <strong className="t-strong">Ưu tiên</strong>
            <br />
            Đặt trước, đến đúng khung giờ
          </span>
        </div>
        <div>
          <span className="t-swatch" aria-hidden="true" />
          <span>
            <strong className="t-strong">Thường</strong>
            <br />
            Các trường hợp còn lại
          </span>
        </div>
      </div>
      <Link to="/noi-bo/hang-doi" className="t-btn t-btn-ghost" style={{ borderColor: 'var(--green-600)', fontWeight: 700 }}>
        Mở hàng đợi
        <Icon name="arrowRight" size={20} />
      </Link>
    </section>
  );
}
