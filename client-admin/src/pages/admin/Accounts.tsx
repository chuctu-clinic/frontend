import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Empty, ErrorAlert, Loading, Modal, PageHeader, Pagination, SelectInput, TextInput, type InputEvent } from '@chuctu/shared/components/ui.tsx';
import { api, qs, cleanParams } from '@chuctu/shared/lib/api.ts';
import { ROLE_LABELS, fmtDate, fmtDateTime } from '@chuctu/shared/lib/format.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { User, Paged, Role } from '@chuctu/shared/types.ts';

const ROLE_OPTIONS = (Object.entries(ROLE_LABELS) as [Role, string][]).map(([value, label]) => ({ value, label }));
const isInternal = (role: string) => role === 'RECEPTIONIST' || role === 'ADMIN';

type OnSaved = (account: User, message: string) => void;

function AccountForm({ account, onClose, onSaved }: { account: User | null; onClose: () => void; onSaved: OnSaved }) {
  const isNew = !account;
  const [form, setForm] = useState({
    fullName: account?.fullName || '',
    phone: account?.phone || '',
    email: account?.email || '',
    role: account?.role || 'RECEPTIONIST',
    tempPassword: '',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const set = (k: keyof typeof form) => (e: InputEvent) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fe = error?.fields || {};

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const res = isNew
        ? await api.post<{ account: User }>('/admin/accounts', { ...form, tempPassword: isInternal(form.role) ? form.tempPassword : undefined })
        : await api.patch<{ account: User }>(`/admin/accounts/${account.id}`, { fullName: form.fullName, phone: form.phone, email: form.email });
      onSaved(res.account, isNew ? 'Đã thêm tài khoản.' : 'Đã lưu thông tin tài khoản.');
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      title={isNew ? 'Thêm tài khoản' : 'Sửa thông tin tài khoản'}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button icon="check" loading={pending} onClick={submit}>
            {isNew ? 'Thêm tài khoản' : 'Lưu'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <TextInput label="Họ và tên" required value={form.fullName} onChange={set('fullName')} error={fe.fullName} />
        <TextInput label="Số điện thoại" required type="tel" value={form.phone} onChange={set('phone')} error={fe.phone} />
        <TextInput label="Email" type="email" hint="Tài khoản nội bộ đăng nhập được bằng email." value={form.email} onChange={set('email')} error={fe.email} />
        {isNew && <SelectInput label="Vai trò" required options={ROLE_OPTIONS} value={form.role} onChange={set('role')} error={fe.role} />}
        {isNew && isInternal(form.role) && (
          <TextInput
            label="Mật khẩu tạm"
            required
            type="text"
            autoComplete="off"
            hint="Tối thiểu 8 ký tự. Người dùng phải đổi mật khẩu ở lần đăng nhập đầu tiên."
            value={form.tempPassword}
            onChange={set('tempPassword')}
            error={fe.tempPassword}
          />
        )}
        {error && !Object.keys(fe).length && <ErrorAlert error={error} />}
      </div>
    </Modal>
  );
}

function RoleModal({ account, onClose, onSaved }: { account: User; onClose: () => void; onSaved: OnSaved }) {
  const [role, setRole] = useState<Role>(account.role);
  const [tempPassword, setTempPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const needsPassword = isInternal(role) && account.role === 'USER';

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await api.put<{ account: User }>(`/admin/accounts/${account.id}/role`, { role, tempPassword: tempPassword || undefined });
      onSaved(res.account, `Đã đổi vai trò thành ${ROLE_LABELS[role]}.`);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      title={`Phân quyền: ${account.fullName}`}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button icon="check" loading={pending} disabled={role === account.role} onClick={submit}>
            Lưu vai trò
          </Button>
        </>
      }
    >
      <div className="stack">
        <fieldset className="stack-sm">
          <legend className="field-label">Vai trò</legend>
          {ROLE_OPTIONS.map((o) => (
            <label key={o.value} className="check">
              <input type="radio" name="role" checked={role === o.value} onChange={() => setRole(o.value)} />
              {o.label}
            </label>
          ))}
        </fieldset>
        {needsPassword && (
          <TextInput
            label="Mật khẩu tạm cho tài khoản nội bộ"
            required
            hint="Tối thiểu 8 ký tự."
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            error={error?.fields?.tempPassword}
          />
        )}
        <Alert type="info">Quyền mới áp dụng ngay ở thao tác kế tiếp của tài khoản này.</Alert>
        {error && !error.fields?.tempPassword && <ErrorAlert error={error} />}
      </div>
    </Modal>
  );
}

/** Quản lý tài khoản: tìm, lọc, thêm, sửa, khoá/mở, phân quyền (UC.8.1 – UC.8.5). */
export default function Accounts() {
  useDocumentTitle('Quản lý tài khoản');
  const { user: me } = useSession();
  const [params, setParams] = useSearchParams();
  const role = params.get('vai-tro') || '';
  const page = Number(params.get('trang') || 1);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<{ type: 'form'; account: User | null } | { type: 'role' | 'lock'; account: User } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, reload } = useAsync(() => api.get<Paged<User> & { roleCounts: Record<Role, number> }>(`/admin/accounts${qs({ q: query, role, page })}`), [query, role, page]);
  const set = (next: Record<string, string | number>) => {
    const merged = { 'vai-tro': role, trang: page, ...next };
    setParams(cleanParams(merged));
  };

  const saved: OnSaved = (_, message) => {
    setModal(null);
    setNotice(message);
    reload({ silent: true });
  };

  const toggleLock = async (a: User) => {
    setBusy(a.id);
    setError(null);
    try {
      await api.post(`/admin/accounts/${a.id}/${a.isActive ? 'lock' : 'unlock'}`);
      setNotice(a.isActive ? `Đã khoá tài khoản ${a.fullName}. Các phiếu khám đã đặt vẫn giữ nguyên.` : `Đã mở khoá tài khoản ${a.fullName}.`);
      setModal(null);
      reload({ silent: true });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="stack">
      <PageHeader title="Quản lý tài khoản" actions={<Button icon="plus" onClick={() => setModal({ type: 'form', account: null })}>Thêm tài khoản</Button>} />
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: '1 1 320px' }}>
          <label className="field-label" htmlFor="tim-tk">
            Tìm theo tên, số điện thoại hoặc email
          </label>
          <input id="tim-tk" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="tabs" role="group" aria-label="Lọc theo vai trò">
          <button type="button" className="tab" aria-pressed={!role} onClick={() => set({ 'vai-tro': '', trang: 1 })}>
            Tất cả
          </button>
          {ROLE_OPTIONS.map((o) => (
            <button key={o.value} type="button" className="tab" aria-pressed={role === o.value} onClick={() => set({ 'vai-tro': o.value, trang: 1 })}>
              {o.label}
              {data && <span className="count">({data.roleCounts[o.value]})</span>}
            </button>
          ))}
        </div>
      </div>
      {notice && <Alert type="success">{notice}</Alert>}
      <ErrorAlert error={error} />
      {loading && <Loading />}
      {data && data.items.length === 0 && <Empty icon="users" title="Không có tài khoản phù hợp" />}
      {data && data.items.length > 0 && (
        <div className="table-wrap">
          <table className="table table-responsive">
            <thead>
              <tr>
                <th scope="col">Họ và tên</th>
                <th scope="col">Số điện thoại / email</th>
                <th scope="col">Vai trò</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Đăng nhập gần nhất</th>
                <th scope="col">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td data-label="Họ tên">
                    <strong>{a.fullName}</strong>
                    <span className="caption" style={{ display: 'block' }}>
                      Tạo {fmtDate(a.createdAt)}
                    </span>
                  </td>
                  <td data-label="Liên hệ">
                    <span className="mono">{a.phone}</span>
                    {a.email && <span className="caption" style={{ display: 'block' }}>{a.email}</span>}
                  </td>
                  <td data-label="Vai trò">
                    <Badge tone={a.role === 'ADMIN' ? 'gold' : a.role === 'RECEPTIONIST' ? 'blue' : 'gray'}>{ROLE_LABELS[a.role]}</Badge>
                  </td>
                  <td data-label="Trạng thái">
                    {a.isActive ? <Badge tone="green" icon="check">Hoạt động</Badge> : <Badge tone="red" icon="lock">Đã khoá</Badge>}
                  </td>
                  <td data-label="Đăng nhập">{a.lastLoginAt ? fmtDateTime(a.lastLoginAt) : '—'}</td>
                  <td data-label="">
                    <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                      <Button size="sm" variant="ghost" icon="edit" onClick={() => setModal({ type: 'form', account: a })}>
                        Sửa
                      </Button>
                      {a.id !== me?.id && (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => setModal({ type: 'role', account: a })}>
                            Phân quyền
                          </Button>
                          <Button size="sm" variant={a.isActive ? 'danger' : 'secondary'} icon={a.isActive ? 'lock' : 'unlock'} onClick={() => setModal({ type: 'lock', account: a })}>
                            {a.isActive ? 'Khoá' : 'Mở khoá'}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={page} total={data.total} limit={data.limit} onPage={(p) => set({ trang: p })} />}

      {modal?.type === 'form' && <AccountForm account={modal.account} onClose={() => setModal(null)} onSaved={saved} />}
      {modal?.type === 'role' && <RoleModal account={modal.account} onClose={() => setModal(null)} onSaved={saved} />}
      {modal?.type === 'lock' && (
        <Modal
          title={modal.account.isActive ? `Khoá tài khoản ${modal.account.fullName}?` : `Mở khoá ${modal.account.fullName}?`}
          onClose={() => setModal(null)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                Quay lại
              </Button>
              <Button variant={modal.account.isActive ? 'danger-solid' : 'primary'} loading={busy === modal.account.id} onClick={() => toggleLock(modal.account)}>
                {modal.account.isActive ? 'Khoá tài khoản' : 'Mở khoá'}
              </Button>
            </>
          }
        >
          <p>
            {modal.account.isActive
              ? 'Tài khoản sẽ không đăng nhập được nữa và bị đăng xuất ngay trên mọi thiết bị. Các phiếu khám đã đặt vẫn giữ nguyên.'
              : 'Tài khoản sẽ đăng nhập lại được bình thường.'}
          </p>
        </Modal>
      )}
    </div>
  );
}
