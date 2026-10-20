import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '@chuctu/shared/lib/api.ts';
import { fmtTime } from '@chuctu/shared/lib/format.ts';
import { isAdmin, useSession } from '@chuctu/shared/lib/session.tsx';
import { Icon, type IconName } from '@chuctu/shared/components/Icon.tsx';
import type { MiniQueue as MiniQueueData } from '@chuctu/shared/types.ts';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const STAFF_NAV: NavItem[] = [
  { to: '/lich-trong-ngay', label: 'Lịch trong ngày', icon: 'calendar' },
  { to: '/hang-doi', label: 'Hàng đợi', icon: 'queue' },
  { to: '/benh-nhan', label: 'Hồ sơ bệnh nhân', icon: 'users' },
];
const ADMIN_NAV: NavItem[] = [
  { to: '/quan-tri', label: 'Tổng quan', icon: 'dashboard', end: true },
  ...STAFF_NAV,
  { to: '/quan-tri/bai-viet', label: 'Quản lý bài viết', icon: 'news' },
  { to: '/quan-tri/tai-khoan', label: 'Quản lý tài khoản', icon: 'shield' },
];

/**
 * Khung khu nội bộ theo prototype: header xanh (logo, vai trò, tên, đăng xuất),
 * cột trái gồm menu và hàng đợi mini. solo: trang rộng không có cột trái (phiếu kết quả, soạn bài).
 */
export function StaffLayout({ solo = false }: { solo?: boolean }) {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const admin = isAdmin(user);
  const nav = admin ? ADMIN_NAV : STAFF_NAV;

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/dang-nhap');
  };

  return (
    <div className="nb-page">
      <a className="skip-link" href="#noi-dung">
        Bỏ qua, tới nội dung chính
      </a>
      <header className="nb-header">
        <div className="nb-header-in">
          <Link to={admin ? '/quan-tri' : '/lich-trong-ngay'} className="nb-logo" aria-label={admin ? 'Khu quản trị Phòng khám Chúc Từ' : 'Khu nội bộ Phòng khám Chúc Từ'}>
            <img src={`${import.meta.env.BASE_URL}logo-192.png`} alt="" />
            <span>Chúc Từ</span>
          </Link>
          <span className={`nb-role ${admin ? 'nb-role-admin' : 'nb-role-staff'}`}>
            <Icon name={admin ? 'shield' : 'user'} size={20} />
            {admin ? 'Quản trị viên' : 'Tiếp tân'}
          </span>
          {!solo && (
            <button type="button" className="nb-burger" aria-expanded={menuOpen} aria-controls="nb-nav" onClick={() => setMenuOpen((v) => !v)}>
              <Icon name={menuOpen ? 'x' : 'menu'} />
              Menu
            </button>
          )}
          <div className="nb-user">
            <span className="nb-user-name">{user?.fullName}</span>
            <button type="button" className="nb-btn-dark" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>
      <section className="nb-body">
        {solo ? (
          <main id="noi-dung">
            <Outlet />
          </main>
        ) : (
          <div className="nb-body-in">
            <div className="nb-side">
              <nav id="nb-nav" className={`nb-nav ${menuOpen ? 'open' : ''}`} aria-label={admin ? 'Chức năng quản trị' : 'Chức năng tiếp tân'}>
                {nav.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.end}>
                    <Icon name={n.icon} />
                    {n.label}
                  </NavLink>
                ))}
              </nav>
              <MiniQueue />
            </div>
            <main id="noi-dung" className="nb-main">
              <Outlet />
            </main>
          </div>
        )}
      </section>
    </div>
  );
}

/** Hàng đợi thu gọn: trong phòng, đang chờ, 5 người kế tiếp và chú thích màu (UC.10.5). */
export function MiniQueue() {
  const location = useLocation();
  const [data, setData] = useState<MiniQueueData | null>(null);
  const [at, setAt] = useState<Date>(new Date());
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .get<MiniQueueData>('/staff/queue/mini')
        .then((d) => {
          if (!alive) return;
          setData(d);
          setAt(new Date());
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 20_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // Tải lại khi chuyển trang để số liệu khớp thao tác vừa làm
  }, [location.pathname, location.search]);
  if (!data) return null;
  return (
    <section className="nb-mini" aria-labelledby="nb-mini-title">
      <div className="nb-between" style={{ alignItems: 'center' }}>
        <h2 id="nb-mini-title">
          <Icon name="queue" size={22} />
          Hàng đợi
        </h2>
        <span className="nb-muted" style={{ fontSize: 15, fontWeight: 600 }}>
          lúc {fmtTime(at)}
        </span>
      </div>
      <div className="nb-mini-counts">
        <div style={{ background: '#E4EFE2', color: '#2E5B37' }}>
          <p>Trong phòng</p>
          <p>
            {data.inRoom}/{data.capacity}
          </p>
        </div>
        <div style={{ background: '#F4EADB', color: '#2A2118' }}>
          <p style={{ color: '#4A3F33' }}>Đang chờ</p>
          <p>{data.waiting}</p>
        </div>
      </div>
      {data.next.length > 0 && (
        <div className="nb-stack-sm">
          <p className="nb-caps">{data.next.length} người kế tiếp</p>
          <ol className="nb-mini-next">
            {data.next.map((n, i) => (
              <li key={n.id} className={n.priority ? 'priority' : ''}>
                <span>{i + 1}</span>
                <span>{n.fullName}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="nb-mini-legend" role="group" aria-label="Chú thích màu nền">
        <p className="nb-caps">Chú thích</p>
        <div>
          <span aria-hidden="true" style={{ background: '#E8F0F7', border: '1px solid #C5D6E6' }} />
          <span>
            <strong className="nb-ink">Ưu tiên</strong>
            <br />
            Đặt trước, đến đúng khung giờ
          </span>
        </div>
        <div>
          <span aria-hidden="true" style={{ background: '#FFFFFF', border: '1px solid #D5C7AC' }} />
          <span>
            <strong className="nb-ink">Thường</strong>
            <br />
            Các trường hợp còn lại
          </span>
        </div>
      </div>
      <Link to="/hang-doi" className="nb-btn nb-btn-ghost" style={{ borderColor: '#3B7145' }}>
        Mở hàng đợi
        <Icon name="arrowRight" size={20} />
      </Link>
    </section>
  );
}
