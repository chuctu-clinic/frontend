import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { ACCOUNT_LINKS } from '../../components/PublicLayout.tsx';
import { Breadcrumb, ButtonLink } from '@chuctu/shared/components/ui.tsx';

export function AccountShell({ crumbs, children }: { crumbs: { label: ReactNode; to?: string }[]; children: ReactNode }) {
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
