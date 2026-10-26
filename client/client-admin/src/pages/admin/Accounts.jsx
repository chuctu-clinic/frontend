import { useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { ErrorAlert, Loading } from '@chuctu/shared/components/ui.jsx';
import { api, qs } from '@chuctu/shared/lib/api.js';
import { ROLE_LABELS, fmtDate } from '@chuctu/shared/lib/format.js';
import { useSession } from '@chuctu/shared/lib/session.jsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { FieldError, Notice, Pager, PhoneField, PlainDialog, normalizePhone, useDismiss } from '../../components/t-ui.jsx';
import './admin.css';

const PER_PAGE = 10;
const ROLE_ORDER = ['USER', 'RECEPTIONIST', 'ADMIN'];
const STAFF = ['RECEPTIONIST', 'ADMIN'];

/** "0919770245" → "0919 770 245" */
const fmtPhone = (p) => String(p || '').replace(/^(\d{4})(\d{3})(\d+)$/, '$1 $2 $3');

/** Thêm hoặc sửa tài khoản (UC.8.1, UC.8.2). */
function AccountDialog({ account, onClose, onSaved }) {
  const titleId = useId();
  const isAdd = !account;
  const [form, setForm] = useState({
    fullName: account?.fullName || '',
    phone: String(account?.phone || '').replace(/^0/, ''),
    role: 'USER',
    tempPassword: '',
  });
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const needsPassword = isAdd && STAFF.includes(form.role);
  const errs = {
    fullName: form.fullName.trim() ? null : 'Vui lòng nhập họ và tên.',
    phone: !form.phone ? 'Vui lòng nhập số điện thoại.' : /^\d{9,10}$/.test(form.phone) ? null : 'Số điện thoại gồm 9 đến 10 chữ số sau +84.',
    tempPassword: !needsPassword || form.tempPassword.length >= 8 ? null : form.tempPassword ? 'Mật khẩu tạm cần ít nhất 8 ký tự.' : 'Vui lòng nhập mật khẩu tạm.',
  };
  const fe = { ...(tried ? errs : {}), ...(error?.fields || {}) };

  const submit = async () => {
    setTried(true);
    setError(null);
    if (Object.values(errs).some(Boolean)) return;
    setPending(true);
    try {
      const body = { fullName: form.fullName.trim(), phone: normalizePhone(form.phone) };
      const res = isAdd
        ? await api.post('/admin/accounts', { ...body, role: form.role, tempPassword: needsPassword ? form.tempPassword : undefined })
        : await api.patch(`/admin/accounts/${account.id}`, body);
      onSaved(res.account, isAdd);
    } catch (err) {
      setError(err);
      setPending(false);
    }
  };

  return (
    <PlainDialog labelledBy={titleId} onClose={onClose} onSubmit={submit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 id={titleId} className="t-h2">
          {isAdd ? 'Thêm tài khoản' : 'Sửa thông tin tài khoản'}
        </h2>
        <p className="t-text">{isAdd ? 'Điền thông tin của người dùng mới.' : 'Chỉ sửa họ tên và số điện thoại. Muốn đổi vai trò, chọn ở cột Vai trò trong danh sách.'}</p>
      </div>
      <div className="t-field">
        <label htmlFor="tk-f-ten" className="t-label">
          Họ và tên <span className="t-req">*</span>
        </label>
        <input
          id="tk-f-ten"
          className="t-input"
          autoComplete="off"
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          aria-invalid={fe.fullName ? 'true' : 'false'}
          aria-describedby="tk-f-ten-loi"
        />
        <FieldError id="tk-f-ten-loi">{fe.fullName}</FieldError>
      </div>
      <PhoneField id="tk-f-sdt" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} error={fe.phone} />
      {isAdd && (
        <>
          <div className="t-field">
            <label htmlFor="tk-f-vaitro" className="t-label">
              Vai trò
            </label>
            <select id="tk-f-vaitro" className="t-select" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {needsPassword ? (
            <div className="t-field">
              <label htmlFor="tk-f-mk" className="t-label">
                Mật khẩu tạm <span className="t-req">*</span>
              </label>
              <input
                id="tk-f-mk"
                className="t-input"
                autoComplete="off"
                value={form.tempPassword}
                onChange={(e) => setForm((f) => ({ ...f, tempPassword: e.target.value }))}
                aria-invalid={fe.tempPassword ? 'true' : 'false'}
                aria-describedby="tk-f-mk-ghichu tk-f-mk-loi"
              />
              <p id="tk-f-mk-ghichu" className="t-muted">
                Ít nhất 8 ký tự. Người dùng phải đổi mật khẩu sau lần đăng nhập đầu.
              </p>
              <FieldError id="tk-f-mk-loi">{fe.tempPassword}</FieldError>
            </div>
          ) : (
            <p className="t-muted">Người dùng đăng nhập bằng số điện thoại và mã xác nhận gửi qua tin nhắn, không cần mật khẩu.</p>
          )}
        </>
      )}
      {error && !error.fields && <ErrorAlert error={error} />}
      <div className="a-modal-actions">
        <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 28px' }} onClick={onClose}>
          Huỷ
        </button>
        <button type="submit" className="t-btn t-btn-primary" style={{ padding: '0 28px' }} disabled={pending}>
          {isAdd ? 'Thêm tài khoản' : 'Lưu thay đổi'}
        </button>
      </div>
    </PlainDialog>
  );
}

/** Lên vai trò nội bộ mà tài khoản chưa có mật khẩu thì phải đặt mật khẩu tạm (BR.32). */
function RolePasswordDialog({ account, role, onClose, onDone }) {
  const titleId = useId();
  const [pw, setPw] = useState('');
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const err = pw.length >= 8 ? null : pw ? 'Mật khẩu tạm cần ít nhất 8 ký tự.' : 'Vui lòng nhập mật khẩu tạm.';
  const submit = async () => {
    setTried(true);
    if (err) return;
    setPending(true);
    try {
      const res = await api.put(`/admin/accounts/${account.id}/role`, { role, tempPassword: pw });
      onDone(res.account);
    } catch (e) {
      setError(e);
      setPending(false);
    }
  };
  return (
    <PlainDialog labelledBy={titleId} onClose={onClose} onSubmit={submit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 id={titleId} className="t-h2">
          Đặt mật khẩu tạm
        </h2>
        <p className="t-text">
          Tài khoản <strong className="t-strong">{account.fullName}</strong> chưa có mật khẩu. Vai trò {ROLE_LABELS[role]} đăng nhập khu nội bộ bằng mật khẩu, nên cần đặt mật khẩu
          tạm trước khi đổi.
        </p>
      </div>
      <div className="t-field">
        <label htmlFor="vt-mk" className="t-label">
          Mật khẩu tạm <span className="t-req">*</span>
        </label>
        <input id="vt-mk" className="t-input" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={tried && err ? 'true' : 'false'} />
        <p className="t-muted">Ít nhất 8 ký tự. Người dùng phải đổi mật khẩu sau lần đăng nhập đầu.</p>
        <FieldError>{tried ? err : null}</FieldError>
      </div>
      <ErrorAlert error={error} />
      <div className="a-modal-actions">
        <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 28px' }} onClick={onClose}>
          Huỷ
        </button>
        <button type="submit" className="t-btn t-btn-primary" style={{ padding: '0 28px' }} disabled={pending}>
          Đổi vai trò
        </button>
      </div>
    </PlainDialog>
  );
}

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
