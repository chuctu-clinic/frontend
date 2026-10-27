import { Button, ButtonLink, Empty } from '../../shared/components/ui.jsx';
import { useSession } from '../../shared/lib/session.jsx';
import { homeFor } from '../../staff/home.js';

/**
 * Tài khoản nội bộ mở trang chỉ dành cho khách (đặt lịch, tài khoản…). Không chuyển sang trang đăng nhập,
 * vì đăng nhập tài khoản khách ở đó sẽ thay mất phiên nội bộ.
 */
export function StaffOnSite() {
  const { user, logout } = useSession();
  return (
    <div className="container" style={{ padding: '56px 0' }}>
      <Empty
        icon="lock"
        title="Trang này dành cho tài khoản khách"
        action={
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
            <ButtonLink to={homeFor(user)} icon="dashboard">
              Về khu nội bộ
            </ButtonLink>
            <Button variant="secondary" icon="logout" onClick={logout}>
              Đăng xuất
            </Button>
          </div>
        }
      >
        Cô chú đang đăng nhập tài khoản nội bộ {user.fullName}. Muốn đặt lịch hay xem phiếu khám, cô chú đăng xuất rồi
        đăng nhập bằng số điện thoại của khách.
      </Empty>
    </div>
  );
}
