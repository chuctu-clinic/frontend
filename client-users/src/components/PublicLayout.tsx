import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CLINIC } from '@chuctu/shared/lib/format.ts';
import { isStaff, useSession } from '@chuctu/shared/lib/session.tsx';
import { Brand } from '@chuctu/shared/components/Brand.tsx';
import { Icon, type IconName } from '@chuctu/shared/components/Icon.tsx';
import { adminUrl } from '@chuctu/shared/lib/apps.ts';
import type { User } from '@chuctu/shared/types.ts';
import './layout.css';
import '../user.css';

const NAV = [
  { to: '/gioi-thieu', label: 'Giới thiệu' },
  { to: '/dich-vu', label: 'Dịch vụ' },
  { to: '/tin-tuc', label: 'Tin tức' },
  { to: '/huong-dan', label: 'Hướng dẫn' },
  { to: '/lien-he', label: 'Liên hệ' },
];

export const ACCOUNT_LINKS: { to: string; label: string; icon: IconName; desc: string }[] = [
  { to: '/tai-khoan', label: 'Thông tin tài khoản', icon: 'user', desc: 'Họ tên, ngày sinh, địa chỉ' },
  { to: '/tai-khoan/ho-so', label: 'Hồ sơ khám bệnh', icon: 'users', desc: 'Cô chú và người thân' },
  { to: '/phieu-kham', label: 'Phiếu khám bệnh', icon: 'ticket', desc: 'Lịch khám đã đặt' },
  { to: '/lich-su-kham', label: 'Lịch sử khám', icon: 'clipboard', desc: 'Kết quả các lần khám' },
];

/** Nút tài khoản: ảnh đại diện tròn, tên, mở danh sách trang tài khoản (prototype: đã đăng nhập). */
function UserMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="u-userbtn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}>
        <span className="u-avatar" aria-hidden="true">
          <Icon name="userSoft" size={22} strokeWidth={1.75} />
        </span>
        <span className="u-userbtn-name">{user.fullName}</span>
        <Icon name="chevronDown" size={20} />
      </button>
      {open && (
        <div className="u-usermenu" role="menu" onClick={() => setOpen(false)}>
          {ACCOUNT_LINKS.map((l) => (
            <Link key={l.to} to={l.to} role="menuitem">
              <span className="u-usermenu-ic" aria-hidden="true">
                <Icon name={l.icon} size={22} strokeWidth={1.75} />
              </span>
              <span>
                <span className="u-usermenu-t">{l.label}</span>
                <span className="u-usermenu-d">{l.desc}</span>
              </span>
            </Link>
          ))}
          <span className="u-usermenu-sep" />
          <button type="button" role="menuitem" className="u-usermenu-out" onClick={onLogout}>
            <span className="u-usermenu-ic" aria-hidden="true">
              <Icon name="logout" size={22} strokeWidth={1.75} />
            </span>
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

/** Dải đường dẫn nền be ngay dưới đầu trang (prototype: các trang tài khoản, đặt lịch). */
export function Crumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <div className="u-crumbs">
      <nav aria-label="Đường dẫn">
        <Link to="/">Trang chủ</Link>
        {items.map((it, i) => (
          <span key={i}>
            <span className="u-crumbs-sep" aria-hidden="true">
              ›
            </span>
            {it.to ? <Link to={it.to}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
          </span>
        ))}
      </nav>
    </div>
  );
}

export function PublicLayout() {
  const { user, logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

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
      {isHome && (
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
      )}
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
      {user?.role === 'USER' ? <MemberFooter onLogout={handleLogout} /> : <Footer />}
    </>
  );
}

/** Khung trang đăng nhập và tạo tài khoản: đầu trang và chân trang tối giản (prototype: Đăng nhập, Tạo tài khoản). */
export function AuthLayout() {
  const location = useLocation();
  const onRegister = location.pathname.startsWith('/dang-ky');
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);
  return (
    <div className="u-auth-page">
      <a className="skip-link" href="#noi-dung">
        Bỏ qua, tới nội dung chính
      </a>
      <header className="u-auth-header">
        <div>
          <Brand />
          <div className="u-auth-header-r">
            <span>{onRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}</span>
            <Link to={onRegister ? '/dang-nhap' : '/dang-ky'} className="u-btn u-btn-ghost u-btn-md">
              {onRegister ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Link>
          </div>
        </div>
      </header>
      <main id="noi-dung" className="u-auth-main">
        <Outlet />
      </main>
      <footer className="u-auth-footer">
        <div>
          <span>
            © {new Date().getFullYear()} Phòng khám Chúc Từ · {CLINIC.address}
          </span>
          <Link to="/lien-he">Cần giúp đỡ? Liên hệ phòng khám</Link>
        </div>
      </footer>
    </div>
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

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav className="f-col" aria-label={title}>
      <h3>{title}</h3>
      {children}
    </nav>
  );
}

/** Chân trang khi chưa đăng nhập: 3 thẻ liên hệ, thương hiệu + liên kết, dòng bản quyền. */
function Footer() {
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
          <FooterCol title="Nội dung">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to}>
                {n.label}
              </Link>
            ))}
          </FooterCol>
          <FooterCol title="Tài khoản">
            <Link to="/dang-nhap">Đăng nhập</Link>
            <Link to="/dang-ky">Tạo tài khoản</Link>
          </FooterCol>
          <FooterCol title="Cần giúp đỡ">
            <Link to="/huong-dan">Hướng dẫn đặt lịch</Link>
            <Link to="/huong-dan#cau-hoi">Câu hỏi thường gặp</Link>
          </FooterCol>
        </div>
      </div>
      <FooterBottom />
    </footer>
  );
}

/** Chân trang khi đã đăng nhập: liên kết tài khoản, trợ giúp, thông tin phòng khám (prototype: đã đăng nhập). */
function MemberFooter({ onLogout }: { onLogout: () => void }) {
  return (
    <footer className="site-footer">
      <div className="f-links" style={{ borderTop: 0, padding: '44px 24px 40px' }}>
        <div className="f-links-row" style={{ gap: '40px 48px' }}>
          <div className="f-brand" style={{ flex: '1 1 300px' }}>
            <Brand tag="Y học cổ truyền · Từ thiện" />
            <p style={{ maxWidth: '40ch' }}>Khám và điều trị không thu phí cho bà con. Cần gì cô chú cứ gọi, có người trực nghe máy.</p>
          </div>
          <FooterCol title="Tài khoản của tôi">
            {ACCOUNT_LINKS.map((l) => (
              <Link key={l.to} to={l.to}>
                {l.label}
              </Link>
            ))}
            <Link to="/dat-lich" className="f-strong">
              Đặt lịch khám mới
            </Link>
          </FooterCol>
          <FooterCol title="Cần giúp đỡ">
            <Link to="/huong-dan">Hướng dẫn đặt lịch</Link>
            <Link to="/huong-dan#cau-hoi">Câu hỏi thường gặp</Link>
            <Link to="/lien-he">Liên hệ phòng khám</Link>
            <button type="button" className="f-logout" onClick={onLogout}>
              Đăng xuất
            </button>
          </FooterCol>
          <div className="f-col f-clinic" style={{ flex: '1 1 300px' }}>
            <h3>Phòng khám</h3>
            <div>
              <span className="f-dot f-dot-sm">
                <Icon name="pin" size={20} strokeWidth={1.75} />
              </span>
              <p>{CLINIC.address}</p>
            </div>
            <div>
              <span className="f-dot f-dot-sm">
                <Icon name="clockSoft" size={20} strokeWidth={1.75} />
              </span>
              <p>
                Mỗi ngày kể cả Chủ Nhật:
                <br />
                <strong>{CLINIC.hours}</strong>
              </p>
            </div>
            <div>
              <span className="f-dot f-dot-sm">
                <Icon name="phone" size={20} strokeWidth={1.75} />
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
