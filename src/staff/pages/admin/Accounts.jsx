import { useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert, Loading } from '../../../shared/ui/ui.jsx';
import { api, qs } from '../../../shared/lib/api.js';
import { fmtDate, ROLE_LABELS } from '../../../shared/lib/format.js';
import { useSession } from '../../../shared/lib/session.jsx';
import { useAsync, useDismiss, useDocumentTitle } from '../../../shared/lib/hooks.js';
import { Notice } from '../../components/fields.jsx';
import { Pager } from '../../components/Pager.jsx';
import { PlainDialog } from '../../components/dialogs.jsx';
import './admin.css';
import { AccountDialog, RolePasswordDialog } from './AccountDialogs.jsx';

const PER_PAGE = 10;

export const ROLE_ORDER = ['USER', 'RECEPTIONIST', 'ADMIN'];

export const STAFF = ['RECEPTIONIST', 'ADMIN'];

/** "0919770245" → "0919 770 245" */
const fmtPhone = (p) => String(p || '').replace(/^(\d{4})(\d{3})(\d+)$/, '$1 $2 $3');

function RowMenu({ a, self, open, up, onToggle, onEdit, onLock, onUnlock }) {
  const ref = useDismiss(open, onToggle);
  return (
    <div className="t-menu-wrap" ref={ref}>
      <button type="button" className="t-btn t-btn-ghost t-btn-icon" aria-haspopup="menu" aria-expanded={open} aria-label={`Thao tác cho ${a.fullName}`} onClick={onToggle}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div role="menu" aria-label={`Thao tác cho ${a.fullName}`} className={`t-menu ${up ? 'up' : 'down'}`} style={{ width: 200 }}>
          {a.isActive && (
            <button type="button" role="menuitem" className="t-menu-item" onClick={onEdit}>
              <Icon name="edit" size={22} />
              Sửa
            </button>
          )}
          {a.isActive && !self && (
            <button type="button" role="menuitem" className="t-menu-item danger" onClick={onLock}>
              <Icon name="lock" size={22} />
              Khoá
            </button>
          )}
          {!a.isActive && (
            <button type="button" role="menuitem" className="t-menu-item green" onClick={onUnlock}>
              <Icon name="unlock" size={22} />
              Mở khoá
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Quản lý tài khoản: tìm, thêm, sửa, đổi vai trò, khoá và mở khoá (UC.8.1 – UC.8.5). */
export default function Accounts() {
  useDocumentTitle('Quản lý tài khoản');
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const lockTitle = useId();
  const roleTitle = useId();

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Lối tắt "Thêm tài khoản" ở trang Tổng quan
  useEffect(() => {
    if (!params.get('them')) return;
    setDialog({ type: 'form' });
    setParams({}, { replace: true });
  }, [params, setParams]);

  const { data, loading, reload } = useAsync(() => api.get(`/admin/accounts${qs({ q: query, role, page, limit: PER_PAGE })}`), [query, role, page]);
  const all = data ? Object.values(data.roleCounts).reduce((x, y) => x + y, 0) : 0;
  const filtered = Boolean(query || role);

  const changeRole = async (a, next) => {
    setError(null);
    setNotice(null);
    try {
      const res = await api.put(`/admin/accounts/${a.id}/role`, { role: next });
      setDialog({ type: 'roleOk', account: res.account });
      reload({ silent: true });
    } catch (err) {
      if (err.code === 'PASSWORD_REQUIRED') setDialog({ type: 'rolePw', account: a, role: next });
      else setError(err);
      reload({ silent: true });
    }
  };

  const setActive = async (a, active) => {
    setMenu(null);
    setError(null);
    try {
      await api.post(`/admin/accounts/${a.id}/${active ? 'unlock' : 'lock'}`);
      setDialog(null);
      setNotice(
        active
          ? `Đã mở khoá tài khoản ${a.fullName}. Người dùng đăng nhập lại được ngay.`
          : `Đã khoá tài khoản ${a.fullName}. Tài khoản này không đăng nhập được cho tới khi được mở khoá.`,
      );
      reload({ silent: true });
    } catch (err) {
      setError(err);
      setDialog(null);
    }
  };

  return (
    <>
      <div className="t-pagehead" style={{ alignItems: 'center', gap: 20 }}>
        <h1 className="t-h1" style={{ marginBottom: 0 }}>
          Quản lý tài khoản
        </h1>
        <button type="button" className="t-btn t-btn-primary" style={{ padding: '0 26px' }} onClick={() => setDialog({ type: 'form' })}>
          <Icon name="userPlus" strokeWidth={1.75} />
          Thêm tài khoản
        </button>
      </div>

      {notice && <Notice onClose={() => setNotice(null)}>{notice}</Notice>}
      <ErrorAlert error={error} />

      <div className="t-card" style={{ padding: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
        <div className="t-field" style={{ flex: '999 1 300px' }}>
          <label htmlFor="tk-tim" className="t-label">
            Tìm theo tên hoặc số điện thoại
          </label>
          <input id="tk-tim" type="search" className="t-input" placeholder="Nhập để lọc danh sách" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="t-field" style={{ flex: '1 1 200px' }}>
          <label htmlFor="tk-vaitro" className="t-label">
            Vai trò
          </label>
          <select
            id="tk-vaitro"
            className="t-select"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="t-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px 20px', padding: '20px 24px 14px' }}>
          <p className="t-label">
            Tài khoản hệ thống — {data ? (filtered ? `${data.total} trên ${all} tài khoản` : `${all} tài khoản`) : '…'}
          </p>
          {data && (
            <p className="t-muted">
              {data.roleCounts.ADMIN} Quản trị viên · {data.roleCounts.RECEPTIONIST} Tiếp tân · {data.roleCounts.USER} Người dùng
            </p>
          )}
        </div>
        {loading && !data && <Loading />}
        {data && data.items.length > 0 && (
          <div className="t-scroll">
            <div role="table" aria-label="Danh sách tài khoản hệ thống" className="t-table a-accounts">
              <div role="row" className="t-tr t-thead" style={{ borderTop: '1px solid var(--line-soft)' }}>
                {['Họ và tên', 'Số điện thoại', 'Vai trò', 'Trạng thái', 'Tạo lúc', 'Thao tác'].map((h) => (
                  <div key={h} role="columnheader" className="t-th">
                    {h}
                  </div>
                ))}
              </div>
              <div role="rowgroup" className="t-tbody">
                {data.items.map((a, i) => {
                  const self = a.id === user.id;
                  return (
                    <div key={a.id} role="row" className={`t-tr ${a.isActive ? '' : 'a-tr-locked'}`} style={menu === a.id ? { position: 'relative', zIndex: 30 } : undefined}>
                      <div role="cell" className="t-td">
                        <span className="t-td-name">{a.fullName}</span>
                        {self && <span className="t-td-sub">Tài khoản đang đăng nhập</span>}
                      </div>
                      <div role="cell" className="t-td t-text">
                        {fmtPhone(a.phone)}
                      </div>
                      <div role="cell" className="t-td">
                        {self ? (
                          <span style={{ display: 'flex', alignItems: 'center', minHeight: 44, padding: '0 14px', fontWeight: 600, color: 'var(--ink-900)' }}>
                            {ROLE_LABELS[a.role]}
                          </span>
                        ) : (
                          <select className="t-select a-role-select" aria-label={`Vai trò của ${a.fullName}`} value={a.role} onChange={(e) => changeRole(a, e.target.value)}>
                            {ROLE_ORDER.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div role="cell" className="t-td">
                        {a.isActive ? (
                          <span className="t-chip t-chip-green">
                            <Icon name="checkCircle" size={18} strokeWidth={2.25} />
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="t-chip" style={{ background: 'var(--alert-100)', color: 'var(--alert-700)' }}>
                            <Icon name="lock" size={18} strokeWidth={2.25} />
                            Đã khoá
                          </span>
                        )}
                      </div>
                      <div role="cell" className="t-td t-text">
                        {fmtDate(a.createdAt)}
                      </div>
                      <div role="cell" className="t-td" style={{ padding: '14px 12px 14px 16px' }}>
                        <RowMenu
                          a={a}
                          self={self}
                          open={menu === a.id}
                          up={data.items.length >= 4 && i >= data.items.length - 2}
                          onToggle={() => setMenu((m) => (m === a.id ? null : a.id))}
                          onEdit={() => {
                            setMenu(null);
                            setDialog({ type: 'form', account: a });
                          }}
                          onLock={() => {
                            setMenu(null);
                            setDialog({ type: 'lock', account: a });
                          }}
                          onUnlock={() => setActive(a, true)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {data && data.items.length === 0 && (
          <div className="t-empty">
            <p>Không tìm thấy tài khoản nào</p>
            <p className="t-text">
              Kiểm tra lại tên, số điện thoại hoặc chọn vai trò <strong>Tất cả</strong>.
            </p>
          </div>
        )}
        {data && <Pager page={page} total={data.total} perPage={PER_PAGE} unit="tài khoản" onPage={setPage} />}
      </div>

      {dialog?.type === 'form' && (
        <AccountDialog
          account={dialog.account}
          onClose={() => setDialog(null)}
          onSaved={(acc, isAdd) => {
            setDialog(null);
            setNotice(
              isAdd
                ? `Đã thêm tài khoản ${acc.fullName} với vai trò ${ROLE_LABELS[acc.role]}. ${
                    STAFF.includes(acc.role) ? 'Tài khoản đăng nhập được ngay bằng số điện thoại và mật khẩu tạm.' : 'Người dùng đăng nhập bằng số điện thoại và mã xác nhận.'
                  }`
                : `Đã lưu thông tin tài khoản ${acc.fullName}.`,
            );
            reload({ silent: true });
          }}
        />
      )}
      {dialog?.type === 'rolePw' && (
        <RolePasswordDialog
          account={dialog.account}
          role={dialog.role}
          onClose={() => setDialog(null)}
          onDone={(acc) => {
            setDialog({ type: 'roleOk', account: acc });
            reload({ silent: true });
          }}
        />
      )}
      {dialog?.type === 'roleOk' && (
        <PlainDialog labelledBy={roleTitle} alert onClose={() => setDialog(null)}>
          <div className="a-modal-head">
            <span className="a-modal-icon">
              <Icon name="shield" size={30} strokeWidth={1.75} />
            </span>
            <div style={{ minWidth: 0 }}>
              <h2 id={roleTitle} className="t-h2" style={{ marginBottom: 10 }}>
                Đã đổi vai trò thành công
              </h2>
              <p className="t-text">
                Tài khoản <strong className="t-strong">{dialog.account.fullName}</strong> nay có vai trò <strong className="t-strong">{ROLE_LABELS[dialog.account.role]}</strong>.
              </p>
            </div>
          </div>
          <div className="a-modal-actions">
            <button type="button" className="t-btn t-btn-primary" style={{ padding: '0 32px' }} onClick={() => setDialog(null)}>
              Đóng
            </button>
          </div>
        </PlainDialog>
      )}
      {dialog?.type === 'lock' && (
        <PlainDialog labelledBy={lockTitle} width={600} onClose={() => setDialog(null)}>
          <div className="a-modal-head">
            <span className="a-modal-icon red">
              <Icon name="lock" size={30} strokeWidth={1.75} />
            </span>
            <div style={{ minWidth: 0 }}>
              <h2 id={lockTitle} className="t-h2" style={{ marginBottom: 10 }}>
                Khoá tài khoản {dialog.account.fullName}?
              </h2>
              <p className="t-text">
                Tài khoản sẽ <strong style={{ color: 'var(--alert-700)' }}>không đăng nhập được</strong> cho đến khi được mở khoá. Các phiếu khám đã đặt vẫn giữ nguyên. Quản trị
                viên có thể mở khoá lại bất cứ lúc nào.
              </p>
            </div>
          </div>
          <div className="a-modal-actions">
            <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 28px' }} onClick={() => setDialog(null)}>
              Quay lại
            </button>
            <button type="button" className="t-btn t-btn-danger" style={{ padding: '0 28px' }} onClick={() => setActive(dialog.account, false)}>
              <Icon name="lock" />
              Khoá tài khoản
            </button>
          </div>
        </PlainDialog>
      )}
    </>
  );
}
