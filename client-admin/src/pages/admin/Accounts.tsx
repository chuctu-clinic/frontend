import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api, cleanParams, qs, type ApiError } from '@chuctu/shared/lib/api.ts';
import { ROLE_LABELS, fmtDate } from '@chuctu/shared/lib/format.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { Paged, Role, User } from '@chuctu/shared/types.ts';
import { NbActionMenu, NbEmpty, NbError, NbField, NbLoading, NbModal, NbOk, NbPageHead, NbPager, NbPhone } from '../../components/nb.tsx';

const ROLES: Role[] = ['USER', 'RECEPTIONIST', 'ADMIN'];
const isInternal = (role: Role) => role === 'RECEPTIONIST' || role === 'ADMIN';
const COLS = 'minmax(150px, 1.4fr) minmax(120px, 0.9fr) minmax(165px, 1.1fr) 200px 110px 112px';

type AccountList = Paged<User> & { roleCounts: Record<Role, number> };

/** Thêm hoặc sửa tài khoản; tài khoản nội bộ cần mật khẩu tạm tối thiểu 8 ký tự (UC.8.2, UC.8.3, BR.33). */
function AccountForm({ account, onClose, onSaved }: { account: User | null; onClose: () => void; onSaved: (u: User, message: string) => void }) {
  const isNew = !account;
  const [form, setForm] = useState({
    fullName: account?.fullName || '',
    phone: account?.phone || '',
    email: account?.email || '',
    role: (account?.role || 'RECEPTIONIST') as Role,
    tempPassword: '',
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (form.fullName.trim().length < 2) fe.fullName = 'Vui lòng nhập họ và tên.';
    if (!/^0\d{9}$/.test(form.phone)) fe.phone = 'Nhập số điện thoại 9 số sau +84, ví dụ 912345678.';
    if (isNew && isInternal(form.role) && form.tempPassword.length < 8) fe.tempPassword = 'Mật khẩu tạm cần ít nhất 8 ký tự.';
    setFields(fe);
    if (Object.keys(fe).length) return;
    setPending(true);
    setError(null);
    try {
      const res = isNew
        ? await api.post<{ account: User }>('/admin/accounts', { ...form, tempPassword: isInternal(form.role) ? form.tempPassword : undefined })
        : await api.patch<{ account: User }>(`/admin/accounts/${account.id}`, { fullName: form.fullName, phone: form.phone, email: form.email });
      onSaved(res.account, isNew ? `Đã thêm tài khoản ${res.account.fullName}.` : `Đã lưu thông tin tài khoản ${res.account.fullName}.`);
    } catch (err) {
      const apiErr = err as ApiError;
      setFields(apiErr.fields);
      setError(apiErr);
    } finally {
      setPending(false);
    }
  };

  return (
    <NbModal
      plain
      title={isNew ? 'Thêm tài khoản' : 'Sửa thông tin tài khoản'}
      subtitle={<p>{isNew ? 'Tạo tài khoản cho nhân viên hoặc người dùng. Vai trò đổi được sau trong danh sách.' : 'Vai trò và trạng thái khoá đổi ngay trong danh sách tài khoản.'}</p>}
      onClose={onClose}
      width={560}
    >
      <form className="nb-stack" style={{ gap: 22 }} onSubmit={submit} noValidate>
        <NbField label="Họ và tên" required error={fields.fullName}>
          {(a) => <input className="nb-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} {...a} />}
        </NbField>
        <NbField label="Số điện thoại" required error={fields.phone}>
          {(a) => <NbPhone value={form.phone} onChange={(phone) => setForm({ ...form, phone })} {...a} />}
        </NbField>
        <NbField label="Email" optional hint="Tài khoản nội bộ đăng nhập được bằng số điện thoại hoặc email." error={fields.email}>
          {(a) => <input className="nb-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} {...a} />}
        </NbField>
        {isNew && (
          <>
            <NbField label="Vai trò" error={fields.role}>
              {(a) => (
                <select className="nb-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} {...a}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              )}
            </NbField>
            {isInternal(form.role) && (
              <NbField label="Mật khẩu tạm" required hint="Ít nhất 8 ký tự. Người dùng phải đổi mật khẩu sau lần đăng nhập đầu." error={fields.tempPassword}>
                {(a) => <input className="nb-input" value={form.tempPassword} autoComplete="new-password" onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} {...a} />}
              </NbField>
            )}
          </>
        )}
        <NbError error={error && !Object.keys(error.fields).length ? error : null} />
        <div className="nb-dialog-actions">
          <button type="button" className="nb-btn nb-btn-ghost" style={{ padding: '0 28px' }} onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" className="nb-btn nb-btn-primary" style={{ padding: '0 28px' }} disabled={pending}>
            <Icon name="check" />
            {isNew ? 'Thêm tài khoản' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </NbModal>
  );
}

/** Xác nhận đổi vai trò; lên vai trò nội bộ mà chưa có mật khẩu thì đặt mật khẩu tạm (UC.8.4, BR.32). */
function RoleModal({ account, role, onClose, onSaved }: { account: User; role: Role; onClose: () => void; onSaved: (u: User, message: string) => void }) {
  const [tempPassword, setTempPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const needsPassword = isInternal(role) && account.role === 'USER';

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await api.put<{ account: User }>(`/admin/accounts/${account.id}/role`, { role, tempPassword: tempPassword || undefined });
      onSaved(res.account, `Đã đổi vai trò thành công. Tài khoản ${res.account.fullName} nay có vai trò ${ROLE_LABELS[role]}.`);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  return (
    <NbModal
      plain
      icon="shield"
      title={`Đổi vai trò của ${account.fullName}?`}
      subtitle={
        <p>
          Từ <strong className="nb-ink">{ROLE_LABELS[account.role]}</strong> thành <strong className="nb-ink">{ROLE_LABELS[role]}</strong>. Quyền mới áp dụng ngay ở thao tác kế tiếp của tài khoản này.
        </p>
      }
      onClose={onClose}
      width={560}
    >
      {needsPassword && (
        <NbField label="Mật khẩu tạm" required hint="Tài khoản nội bộ đăng nhập bằng mật khẩu, ít nhất 8 ký tự. Người dùng phải đổi sau lần đăng nhập đầu." error={error?.fields.tempPassword}>
          {(a) => <input className="nb-input" value={tempPassword} autoComplete="new-password" onChange={(e) => setTempPassword(e.target.value)} {...a} />}
        </NbField>
      )}
      <NbError error={error && !Object.keys(error.fields).length ? error : null} />
      <div className="nb-dialog-actions">
        <button type="button" className="nb-btn nb-btn-ghost" onClick={onClose}>
          Quay lại
        </button>
        <button type="button" className="nb-btn nb-btn-primary" disabled={pending} onClick={submit}>
          <Icon name="check" />
          Đổi vai trò
        </button>
      </div>
    </NbModal>
  );
}

/** Quản lý tài khoản: tìm, lọc vai trò, thêm, sửa, phân quyền, khoá (UC.8.1 – UC.8.5). */
export default function Accounts() {
  useDocumentTitle('Quản lý tài khoản');
  const { user: me } = useSession();
  const [params, setParams] = useSearchParams();
  const role = params.get('vai-tro') || '';
  const page = Number(params.get('trang') || 1);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<{ type: 'form'; account: User | null } | { type: 'role'; account: User; role: Role } | { type: 'lock'; account: User } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Lối tắt "Thêm tài khoản" ở trang Tổng quan
  useEffect(() => {
    if (params.get('them') !== '1') return;
    setModal({ type: 'form', account: null });
    const next = new URLSearchParams(params);
    next.delete('them');
    setParams(next, { replace: true });
  }, [params, setParams]);

  const { data, loading, reload } = useAsync(() => api.get<AccountList>(`/admin/accounts${qs({ q: query, role, page })}`), [query, role, page]);
  const set = (next: Record<string, string | number>) => setParams(cleanParams({ 'vai-tro': role, trang: page, ...next }));

  const saved = (_: User, message: string) => {
    setModal(null);
    setNotice(message);
    reload({ silent: true });
  };

  const setLock = async (a: User, lock: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/accounts/${a.id}/${lock ? 'lock' : 'unlock'}`);
      setModal(null);
      setNotice(lock ? `Đã khoá tài khoản ${a.fullName}.` : `Đã mở khoá tài khoản ${a.fullName}.`);
      reload({ silent: true });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const counts = data?.roleCounts;
  const totalAll = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      <NbPageHead
        title="Quản lý tài khoản"
        actions={
          <button type="button" className="nb-btn nb-btn-primary" style={{ padding: '0 26px' }} onClick={() => setModal({ type: 'form', account: null })}>
            <Icon name="plus" />
            Thêm tài khoản
          </button>
        }
      />
      {notice && <NbOk onClose={() => setNotice(null)}>{notice}</NbOk>}
      {!modal && <NbError error={error} />}

      <div className="nb-card nb-filters" style={{ flexDirection: 'row', padding: 20 }}>
        <div className="nb-field grow">
          <label className="nb-label" htmlFor="tk-tim">
            Tìm theo tên hoặc số điện thoại
          </label>
          <input
            id="tk-tim"
            type="search"
            className="nb-input"
            placeholder="Nhập để lọc danh sách"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (page !== 1) set({ trang: 1 });
            }}
          />
        </div>
        <div className="nb-field">
          <label className="nb-label" htmlFor="tk-vaitro">
            Vai trò
          </label>
          <select id="tk-vaitro" className="nb-select" value={role} onChange={(e) => set({ 'vai-tro': e.target.value, trang: 1 })}>
            <option value="">Tất cả</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="nb-card nb-card-flush">
        <div className="nb-row" style={{ gap: '6px 20px', padding: '20px 24px 14px', justifyContent: 'space-between' }}>
          <p className="nb-strong" style={{ fontWeight: 600 }}>
            Tài khoản hệ thống — {totalAll} tài khoản
          </p>
          {counts && (
            <p className="nb-muted">
              {counts.USER} người dùng · {counts.RECEPTIONIST} tiếp tân · {counts.ADMIN} quản trị viên
            </p>
          )}
        </div>
        {loading && <NbLoading />}
        {!loading && data && data.items.length > 0 && (
          <div className="nb-table-wrap">
            <div className="nb-table" role="table" aria-label="Danh sách tài khoản hệ thống">
              <div className="nb-tr nb-thead" role="row" style={{ ['--cols' as string]: COLS }}>
                {['Họ và tên', 'Số điện thoại', 'Vai trò', 'Trạng thái', 'Tạo lúc', 'Thao tác'].map((h) => (
                  <div key={h} className="nb-th" role="columnheader">
                    {h}
                  </div>
                ))}
              </div>
              {data.items.map((a) => {
                const self = a.id === me?.id;
                return (
                  <div key={a.id} className="nb-tr" role="row" style={{ ['--cols' as string]: COLS }}>
                    <div className="nb-td" role="cell" style={{ padding: '14px 16px' }}>
                      <span className="nb-strong" style={{ fontWeight: 600 }}>
                        {a.fullName}
                      </span>
                      {self && <span className="nb-sub">Tài khoản đang đăng nhập</span>}
                    </div>
                    <div className="nb-td" role="cell" style={{ padding: '14px 16px' }}>
                      {a.phone}
                    </div>
                    <div className="nb-td" role="cell" style={{ padding: '14px 16px' }}>
                      {self ? (
                        <span className="nb-strong" style={{ fontWeight: 600 }}>
                          {ROLE_LABELS[a.role]}
                        </span>
                      ) : (
                        <select
                          className="nb-select"
                          aria-label={`Vai trò của ${a.fullName}`}
                          value={a.role}
                          onChange={(e) => setModal({ type: 'role', account: a, role: e.target.value as Role })}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="nb-td" role="cell" style={{ padding: '14px 16px' }}>
                      {a.isActive ? (
                        <span className="nb-pill nb-pill-green">
                          <Icon name="check" size={18} />
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="nb-pill nb-pill-red">
                          <Icon name="lock" size={18} />
                          Đã khoá
                        </span>
                      )}
                    </div>
                    <div className="nb-td nb-nowrap" role="cell" style={{ padding: "14px 12px" }}>
                      {fmtDate(a.createdAt)}
                    </div>
                    <div className="nb-td-action" role="cell">
                      <NbActionMenu
                        label={`Thao tác cho ${a.fullName}`}
                        items={[
                          { label: 'Sửa', icon: 'edit', onClick: () => setModal({ type: 'form', account: a }) },
                          ...(self
                            ? []
                            : a.isActive
                              ? [{ label: 'Khoá', icon: 'lock' as const, tone: 'danger' as const, onClick: () => setModal({ type: 'lock', account: a }) }]
                              : [{ label: 'Mở khoá', icon: 'unlock' as const, tone: 'accent' as const, onClick: () => setLock(a, false) }]),
                        ]}
                        renderLink={(it) => (
                          <Link key={it.label} to={it.to!} role="menuitem">
                            {it.label}
                          </Link>
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {!loading && data && data.items.length === 0 && (
          <NbEmpty title="Không tìm thấy tài khoản nào">
            Kiểm tra lại tên, số điện thoại hoặc chọn vai trò <strong>Tất cả</strong>.
          </NbEmpty>
        )}
        {data && <NbPager page={page} total={data.total} limit={data.limit} onPage={(p) => set({ trang: p })} unit="tài khoản" />}
      </div>

      {modal?.type === 'form' && <AccountForm account={modal.account} onClose={() => setModal(null)} onSaved={saved} />}
      {modal?.type === 'role' && <RoleModal account={modal.account} role={modal.role} onClose={() => setModal(null)} onSaved={saved} />}
      {modal?.type === 'lock' && (
        <NbModal
          plain
          icon="lock"
          tone="red"
          title={`Khoá tài khoản ${modal.account.fullName}?`}
          subtitle={
            <p>
              Tài khoản sẽ <strong className="nb-ink">không đăng nhập được</strong> cho đến khi được mở khoá. Các phiếu khám đã đặt vẫn giữ nguyên. Quản trị viên có thể mở khoá lại bất cứ lúc nào.
            </p>
          }
          onClose={() => setModal(null)}
          width={600}
        >
          <NbError error={error} />
          <div className="nb-dialog-actions">
            <button type="button" className="nb-btn nb-btn-ghost" onClick={() => setModal(null)}>
              Quay lại
            </button>
            <button type="button" className="nb-btn nb-btn-danger" disabled={busy} onClick={() => setLock(modal.account, true)}>
              <Icon name="lock" />
              Khoá tài khoản
            </button>
          </div>
        </NbModal>
      )}
    </>
  );
}
