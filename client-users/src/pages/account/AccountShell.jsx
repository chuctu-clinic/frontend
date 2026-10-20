import { NavLink } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { ACCOUNT_LINKS } from '../../components/PublicLayout.jsx';
import { Breadcrumb, ButtonLink } from '@chuctu/shared/components/ui.jsx';

export function AccountShell({ crumbs, children }) {
  return (
    <div className="page">
      <div className="container">
        <Breadcrumb items={[{ to: '/', label: 'Trang chủ' }, ...crumbs]} />
        <div className="account-layout">
          <aside className="stack-sm">
            <nav className="card side-nav" aria-label="Tài khoản của tôi">
              {ACCOUNT_LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.to === '/tai-khoan'}>
                  <Icon name={l.icon} />
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <ButtonLink to="/dat-lich" icon="calendar" block>
              Đặt lịch khám mới
            </ButtonLink>
          </aside>
          <div className="stack">{children}</div>
        </div>
      </div>
    </div>
  );
}
