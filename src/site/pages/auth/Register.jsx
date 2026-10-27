import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon.jsx';
import { Alert, ErrorAlert } from '../../../shared/components/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { isStaff, useSession } from '../../../shared/lib/session.jsx';
import { useDocumentTitle } from '../../../shared/lib/useAsync.js';
import { AuthShell, ClinicPhoto, FieldError, PhoneField, phoneDigits, phoneError, toPhone } from './AuthShell.jsx';
import { AddressFields, DobField, PROVINCES, dobError, joinAddress, joinDob } from './fields.jsx';
import { safeNext, withNext } from './Login.jsx';
import { OtpDialog } from './OtpDialog.jsx';

const GENDER_OPTIONS = [
  ['NAM', 'Nam'],
  ['NU', 'Nữ'],
];

const EMPTY = {
  fullName: '',
  phone: '',
  dob: { day: '', month: '', year: '' },
  gender: '',
  address: { province: PROVINCES[0], ward: '', street: '' },
  agree: false,
};

/** Lỗi phía giao diện cho các ô bắt buộc; Backend vẫn kiểm tra lại. */
function validate(f) {
  const e = {};
  if (f.fullName.trim().length < 2) e.fullName = 'Vui lòng nhập họ và tên.';
  const p = phoneError(f.phone);
  if (p) e.phone = p;
  const d = dobError(f.dob);
  if (d) e.dob = d;
  if (!f.gender) e.gender = 'Vui lòng chọn giới tính.';
  if (!f.address.province) e.province = 'Vui lòng chọn tỉnh / thành phố.';
  if (!f.address.ward.trim()) e.ward = 'Vui lòng chọn phường / xã.';
  if (!f.agree) e.agree = 'Cô chú cần đồng ý để phòng khám lưu thông tin.';
  return e;
}

export default function Register() {
  useDocumentTitle('Tạo tài khoản');
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('tiep'));

  const [form, setForm] = useState(() => ({ ...EMPTY, phone: phoneDigits(params.get('sdt') || '') }));
  const [tried, setTried] = useState(false);
  const [otp, setOtp] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [codeError, setCodeError] = useState(null);

  const setValue = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const set = (k) => (e) => setValue(k, e.target.value);

  const local = tried ? validate(form) : {};
  const server = error?.fields || {};
  const fe = {
    ...local,
    fullName: local.fullName || server.fullName,
    phone: local.phone || server.phone,
    dob: local.dob || server.dob,
    gender: local.gender || server.gender,
    ward: local.ward || server.address,
  };
  const phone = toPhone(form.phone);

  const submitForm = async (e) => {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (Object.keys(validate(form)).length) {
      // Đưa con trỏ tới ô lỗi đầu tiên
      setTimeout(() => document.querySelector('.a-card [aria-invalid="true"], .a-card .a-radios-invalid input')?.focus());
      return;
    }
    setPending(true);
    try {
      const body = {
        fullName: form.fullName.trim(),
        phone,
        dob: joinDob(form.dob),
        gender: form.gender,
        address: joinAddress(form.address),
      };
      setCodeError(null);
      setOtp(await api.post('/auth/register', body));
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  /** proof: { code } khi server tự gửi mã, { idToken } khi gửi qua Firebase */
  const submitCode = async (proof) => {
    setPending(true);
    setCodeError(null);
    try {
      const res = await api.post('/auth/register/verify', { phone, ...proof });
      setUser(res.user);
      navigate(next === '/' ? '/tai-khoan/ho-so?moi=1' : next, { replace: true });
    } catch (err) {
      setCodeError(err);
    } finally {
      setPending(false);
    }
  };

  const describe = (id, err) => (err ? `${id}-loi` : undefined);

  return (
    <AuthShell
      wide
      switchText="Đã có tài khoản?"
      switchLabel="Đăng nhập"
      switchTo={withNext('/dang-nhap', next)}
      aside={
        <>
          <div className="a-note-card">
            <Icon name="lock" size={30} strokeWidth={1.75} />
            <p>Phòng khám chỉ dùng thông tin của cô chú cho việc khám chữa bệnh, không chia sẻ cho bên nào khác.</p>
          </div>
          <ClinicPhoto short />
        </>
      }
    >
      <div>
        <h1 className="a-title">Tạo tài khoản</h1>
        <p className="a-lead">
          Cô chú điền giúp mấy ô dưới đây. Ô có dấu <span className="a-req">*</span> là bắt buộc.
        </p>
      </div>

      <form className="a-form" onSubmit={submitForm} noValidate>
        {isStaff(user) && (
          <Alert>
            Cô chú đang đăng nhập tài khoản nội bộ {user.fullName}. Tạo tài khoản khách sẽ đăng xuất tài khoản nội bộ.
          </Alert>
        )}
        <div className="a-field">
          <label htmlFor="dk-hoten" className="a-label">
            Họ và tên <span className="a-req" aria-hidden="true">*</span>
          </label>
          <input
            id="dk-hoten"
            className="a-input"
            type="text"
            autoComplete="name"
            value={form.fullName}
            onChange={set('fullName')}
            aria-invalid={fe.fullName ? 'true' : 'false'}
            aria-describedby={describe('dk-hoten', fe.fullName)}
          />
          <FieldError id="dk-hoten-loi">{fe.fullName}</FieldError>
        </div>

        <PhoneField
          id="dk-sdt"
          label="Số điện thoại"
          required
          value={form.phone}
          onChange={(v) => setValue('phone', v)}
          error={fe.phone}
          note="Phòng khám gửi mã xác nhận tới số này. Không cần đặt mật khẩu."
        />

        <DobField id="dk-ns" required value={form.dob} onChange={(v) => setValue('dob', v)} error={fe.dob} />

        <div role="radiogroup" aria-labelledby="dk-gt-label" aria-describedby={describe('dk-gt', fe.gender)} className={`a-field ${fe.gender ? 'a-radios-invalid' : ''}`} style={{ gap: 10 }}>
          <span id="dk-gt-label" className="a-label">
            Giới tính <span className="a-req" aria-hidden="true">*</span>
          </span>
          <div className="a-row">
            {GENDER_OPTIONS.map(([value, label]) => (
              <label key={value} className="a-radio">
                <input type="radio" name="dk-gioitinh" value={value} checked={form.gender === value} onChange={set('gender')} />
                {label}
              </label>
            ))}
          </div>
          <FieldError id="dk-gt-loi">{fe.gender}</FieldError>
        </div>

        <AddressFields id="dk" required value={form.address} onChange={(v) => setValue('address', v)} errors={fe} />

        <div className="a-field">
          <label className={`a-check a-check-box ${fe.agree ? 'a-check-invalid' : ''}`}>
            <input
              type="checkbox"
              checked={form.agree}
              onChange={(e) => setValue('agree', e.target.checked)}
              aria-invalid={fe.agree ? 'true' : 'false'}
              aria-describedby={describe('dk-dongy', fe.agree)}
            />
            <span>Tôi đồng ý để phòng khám lưu thông tin này phục vụ việc khám chữa bệnh.</span>
          </label>
          <FieldError id="dk-dongy-loi">{fe.agree}</FieldError>
        </div>

        {error && !Object.keys(server).length && <ErrorAlert error={error} />}
        {error?.code === 'PHONE_TAKEN' && (
          <Link className="a-btn-ghost a-btn-block" to={withNext('/dang-nhap', next, { sdt: form.phone })}>
            <Icon name="login" strokeWidth={1.75} />
            Đăng nhập với số điện thoại này
          </Link>
        )}

        <button type="submit" className="a-btn-primary" disabled={pending} aria-busy={pending || undefined}>
          {pending && !otp ? <span className="spinner" aria-hidden="true" /> : <Icon name="userPlus" strokeWidth={1.75} />}
          Tạo tài khoản
        </button>
      </form>

      <p className="a-lead">
        Đã có tài khoản? <Link to={withNext('/dang-nhap', next)}>Đăng nhập tại đây</Link>
      </p>

      {otp && (
        <OtpDialog
          phone={phone}
          purpose="REGISTER"
          otp={otp}
          outro="Cô chú nhập mã đó để xác nhận số này là của mình."
          submitLabel="Xác nhận và tạo tài khoản"
          submitIcon="userPlus"
          backLabel="Quay lại sửa thông tin"
          onSubmit={submitCode}
          onClose={() => setOtp(null)}
          pending={pending}
          error={codeError}
        />
      )}
    </AuthShell>
  );
}
