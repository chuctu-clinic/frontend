import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { CLINIC } from '@chuctu/shared/lib/format.js';

/** Khung chung cho trang đăng nhập/đăng ký: biểu mẫu bên trái, lời nhắn bên phải. */
export function AuthShell({ title, subtitle, children, aside }) {
  return (
    <div className="page">
      <div className="container">
        <div className="auth-layout">
          <div className="card card-lg stack">
            <div className="stack-sm">
              <h1>{title}</h1>
              {subtitle && <p className="lead">{subtitle}</p>}
            </div>
            {children}
          </div>
          <aside className="stack">
            {aside}
            <div className="card card-gold stack-sm">
              <h3 className="row" style={{ gap: 10 }}>
                <Icon name="phone" />
                Thấy khó? Gọi phòng khám
              </h3>
              <p>
                Nhân viên phòng khám sẽ giúp cô chú từng bước qua điện thoại:{' '}
                <a href={CLINIC.phoneHref} style={{ fontWeight: 700 }}>
                  {CLINIC.phone}
                </a>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
