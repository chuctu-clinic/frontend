import { useState } from 'react';
import { Alert, Button, ErrorAlert, Loading, PageHeader, SelectInput, TextInput } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { CLINIC, GENDERS, fmtDate, todayVN } from '@chuctu/shared/lib/format.js';
import { useSession } from '@chuctu/shared/lib/session.jsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { AccountShell } from './AccountShell.jsx';

/** Xem và cập nhật thông tin tài khoản; số điện thoại không tự sửa (UC.1.4, UC.1.5). */
export default function AccountInfo() {
  useDocumentTitle('Thông tin tài khoản');
  const { setUser } = useSession();
  const { data, loading, setData } = useAsync(() => api.get('/me'), []);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const startEdit = () => {
    const u = data.user;
    setForm({ fullName: u.fullName, dob: u.dob ? u.dob.slice(0, 10) : '', gender: u.gender || '', address: u.address || '' });
    setEditing(true);
    setSaved(false);
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await api.patch('/me', { ...form, dob: form.dob || null, gender: form.gender || null });
      setData(res);
      setUser(res.user);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  const fe = error?.fields || {};
  const u = data?.user;

  return (
    <AccountShell crumbs={[{ label: 'Thông tin tài khoản' }]}>
      <PageHeader title="Thông tin tài khoản" actions={u && !editing && <Button variant="secondary" icon="edit" onClick={startEdit}>Sửa thông tin</Button>} />
      {loading && <Loading />}
      {saved && <Alert type="success" title="Đã lưu thông tin tài khoản." />}
      {u && !editing && (
        <div className="card card-lg">
          <dl className="info">
            <dt>Họ và tên</dt>
            <dd>{u.fullName}</dd>
            <dt>Số điện thoại</dt>
            <dd className="mono">{u.phone}</dd>
            <dt>Mã bệnh nhân</dt>
            <dd className="mono">{data.patientCode || '—'}</dd>
            <dt>Ngày sinh</dt>
            <dd>{fmtDate(u.dob)}</dd>
            <dt>Giới tính</dt>
            <dd>{GENDERS[u.gender] || '—'}</dd>
            <dt>Địa chỉ</dt>
            <dd>{u.address || '—'}</dd>
          </dl>
        </div>
      )}
      {editing && form && (
        <form className="card card-lg stack" onSubmit={submit} noValidate>
          <TextInput label="Họ và tên" required value={form.fullName} onChange={set('fullName')} error={fe.fullName} />
          <TextInput
            label="Số điện thoại"
            value={u.phone}
            disabled
            hint={`Số điện thoại là tên đăng nhập nên không tự sửa được. Cần đổi số, cô chú gọi ${CLINIC.phone}.`}
          />
          <div className="form-grid">
            <TextInput label="Ngày sinh" type="date" max={todayVN()} value={form.dob} onChange={set('dob')} error={fe.dob} />
            <SelectInput
              label="Giới tính"
              placeholder="Chọn giới tính"
              options={Object.entries(GENDERS).map(([value, label]) => ({ value, label }))}
              value={form.gender}
              onChange={set('gender')}
              error={fe.gender}
            />
          </div>
          <TextInput label="Địa chỉ" value={form.address} onChange={set('address')} error={fe.address} />
          {error && !Object.keys(fe).length && <ErrorAlert error={error} />}
          <div className="row">
            <Button type="submit" loading={pending}>
              Lưu thông tin
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Huỷ, không sửa nữa
            </Button>
          </div>
        </form>
      )}
    </AccountShell>
  );
}
