import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { ErrorAlert, Loading } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { CLINIC, GENDERS } from '@chuctu/shared/lib/format.js';
import { useSession } from '@chuctu/shared/lib/session.jsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { FieldError } from '../auth/AuthShell.jsx';
import { AddressFields, DobField, dobError, joinAddress, joinDob, splitAddress, splitDob } from '../auth/fields.jsx';
import './account.css';

// Theo màn "Tài khoản · Thông tin" của prototype (TaiKhoan-ThongTin.dc.html)

const fromUser = (u) => ({
  fullName: u.fullName,
  dob: splitDob(u.dob),
  gender: u.gender || '',
  address: splitAddress(u.address),
});

/** Xem và cập nhật thông tin tài khoản; số điện thoại không tự sửa (UC.1.4, UC.1.5). */
export default function AccountInfo() {
  useDocumentTitle('Thông tin tài khoản');
  const { setUser } = useSession();
  const { data, loading, setData } = useAsync(() => api.get('/me'), []);
  const [form, setForm] = useState(null);
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.user) setForm(fromUser(data.user));
  }, [data]);

  const setValue = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const validate = (f) => {
    const e = {};
    if (f.fullName.trim().length < 2) e.fullName = 'Vui lòng nhập họ và tên.';
    const d = dobError(f.dob, { required: false });
    if (d) e.dob = d;
    if (f.address.ward.trim() && !f.address.province) e.province = 'Vui lòng chọn tỉnh / thành phố.';
    return e;
  };
  const fe = { ...(error?.fields || {}), ...(tried && form ? validate(form) : {}) };
  if (error?.fields?.address) fe.street = error.fields.address;

  const save = async (e) => {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (Object.keys(validate(form)).length) return;
    setPending(true);
    try {
      const res = await api.patch('/me', {
        fullName: form.fullName.trim(),
        dob: joinDob(form.dob) || null,
        gender: form.gender || null,
        address: joinAddress(form.address) || null,
      });
      setData(res);
      setUser(res.user);
      setSaved(true);
      setTried(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setForm(fromUser(data.user));
    setError(null);
    setTried(false);
    setSaved(false);
  };

  const u = data?.user;

  return (
    <div className="k-page a-vars">
      <section className="k-titleband">
        <div className="k-wrap">
          <h1>Tài khoản của tôi</h1>
        </div>
      </section>

      <section className="k-main">
        <div className="k-wrap">
          {loading && <Loading />}

          {saved && (
            <div className="k-success" role="status">
              <Icon name="checkCircle" size={28} />
              Đã lưu thay đổi thông tin tài khoản.
            </div>
          )}

          {u && (
            <div className="k-gold">
              <span className="k-gold-dot">
                <Icon name="clipboard" size={30} strokeWidth={1.75} />
              </span>
              <div>
                <h2>Hồ sơ bệnh nhân đã liên kết</h2>
                <p>
                  {data.patientCode ? (
                    <>
                      Mã bệnh nhân <strong>{data.patientCode}</strong> — do phòng khám tạo.{' '}
                    </>
                  ) : (
                    'Tài khoản chưa có hồ sơ bệnh nhân của chính chủ. '
                  )}
                  Lịch sử và kết quả khám của hồ sơ này, cùng các hồ sơ người thân, xem ở mục <Link to="/lich-su-kham">Lịch sử khám</Link>.
                </p>
              </div>
            </div>
          )}

          {form && (
            <form className="k-card" onSubmit={save} noValidate>
              <div className="k-card-head">
                <h2>Thông tin cá nhân</h2>
                <p>Số điện thoại là tên đăng nhập nên không sửa được tại đây. Cần đổi, cô chú gọi cho phòng khám {CLINIC.phone}.</p>
              </div>

              <div className="a-field">
                <label htmlFor="tk-ten" className="a-label">
                  Họ và tên <span className="a-req" aria-hidden="true">*</span>
                </label>
                <input
                  id="tk-ten"
                  className="a-input"
                  type="text"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={(e) => setValue('fullName', e.target.value)}
                  aria-invalid={fe.fullName ? 'true' : 'false'}
                  aria-describedby={fe.fullName ? 'tk-ten-loi' : undefined}
                />
                <FieldError id="tk-ten-loi">{fe.fullName}</FieldError>
              </div>

              <div className="a-field">
                <label htmlFor="tk-sdt" className="a-label">
                  Số điện thoại (tên đăng nhập)
                </label>
                <div className="a-phone a-phone-ro">
                  <span className="a-phone-pre" aria-hidden="true">
                    +84
                  </span>
                  <input id="tk-sdt" type="tel" value={u.phone.replace(/^0/, '')} readOnly aria-describedby="tk-sdt-note" />
                </div>
                <p id="tk-sdt-note" className="k-readonly-note">
                  <Icon name="lock" size={20} strokeWidth={1.75} />
                  Ô này không sửa được.
                </p>
              </div>

              <DobField id="tk-ns" value={form.dob} onChange={(v) => setValue('dob', v)} error={fe.dob} />

              <div className="a-field">
                <label htmlFor="tk-gioitinh" className="a-label">
                  Giới tính
                </label>
                <select id="tk-gioitinh" className="a-input" value={form.gender} onChange={(e) => setValue('gender', e.target.value)}>
                  <option value="">Chưa chọn</option>
                  {Object.entries(GENDERS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <FieldError id="tk-gioitinh-loi">{fe.gender}</FieldError>
              </div>

              <AddressFields id="tk" value={form.address} onChange={(v) => setValue('address', v)} errors={fe} />

              {error && !Object.keys(error.fields || {}).length && <ErrorAlert error={error} />}

              <div className="k-form-actions">
                <button type="submit" className="a-btn-primary k-btn" disabled={pending} aria-busy={pending || undefined}>
                  {pending ? <span className="spinner" aria-hidden="true" /> : <Icon name="check" strokeWidth={1.75} />}
                  Lưu thay đổi
                </button>
                <button type="button" className="a-btn-ghost k-btn-ghost" onClick={reset}>
                  Bỏ thay đổi
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
