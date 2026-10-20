import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useId, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { joinAddress, PROVINCES } from '@chuctu/shared/lib/diaGioi.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { safeNext } from './Login.tsx';
import { OtpDialog } from './OtpStep.tsx';
import { AddressBox, DobField, GenderField, PhoneField, Spinner, UError, UField, phoneOk, toPhone, type AddressParts } from '../../components/uparts.tsx';
import type { User, OtpInfo } from '@chuctu/shared/types.ts';

export default function Register() {
  useDocumentTitle('Tạo tài khoản');
  const { setUser } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('tiep'));
  const consentId = useId();

  const [fullName, setFullName] = useState('');
  const [digits, setDigits] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [addr, setAddr] = useState<AddressParts>({ street: '', ward: '', province: PROVINCES[0].name });
  const [consent, setConsent] = useState(false);
  const [tried, setTried] = useState(false);
  const [otp, setOtp] = useState<OtpInfo | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const fe = error?.fields || {};
  const phone = toPhone(digits);

  // Kiểm tra ngay trên trình duyệt cho cô chú thấy lỗi sớm; Backend vẫn kiểm tra lại
  const local = {
    fullName: fullName.trim().length < 2 ? 'Vui lòng nhập họ và tên.' : null,
    phone: !phoneOk(digits) ? (digits ? 'Số điện thoại gồm 9 đến 10 chữ số sau +84.' : 'Vui lòng nhập số điện thoại.') : null,
    dob: !dob ? 'Vui lòng chọn đủ ngày, tháng, năm sinh.' : null,
    gender: !gender ? 'Vui lòng chọn giới tính.' : null,
    consent: !consent ? 'Cô chú đánh dấu đồng ý để tiếp tục.' : null,
  };
  const show = (k: keyof typeof local) => (tried ? local[k] : null);

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(local).some(Boolean)) return;
    setPending(true);
    setError(null);
    try {
      setOtp(await api.post<OtpInfo>('/auth/register', { fullName, phone, dob, gender, address: joinAddress(addr.street, addr.ward, addr.province) }));
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  const submitCode = async (code: string) => {
    setPending(true);
    setError(null);
    try {
      const res = await api.post<{ user: User }>('/auth/register/verify', { phone, code });
      setUser(res.user);
      navigate(next === '/' ? '/tai-khoan/ho-so?moi=1' : next, { replace: true });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="u-auth-grid">
      <div className="u-auth-side">
        <div className="u-card u-card-pad" style={{ borderRadius: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="u-icon-dot" style={{ width: 56, height: 56 }} aria-hidden="true">
            <Icon name="lockSoft" size={28} strokeWidth={1.75} />
          </span>
          <p className="u-text" style={{ fontSize: 17, lineHeight: '27px' }}>
            Phòng khám chỉ dùng thông tin của cô chú cho việc khám chữa bệnh, không chia sẻ cho bên nào khác.
          </p>
        </div>
        <img className="u-auth-photo" style={{ height: 240, border: 0 }} src="/mat-tien.jpg" alt="Mặt tiền Phòng khám Chúc Từ" />
      </div>
      <form className="u-auth-form u-card-lg" style={{ flexBasis: 460 }} onSubmit={submitForm} noValidate>
        <div>
          <h1>Tạo tài khoản</h1>
          <p className="u-text">
            Cô chú điền giúp mấy ô dưới đây. Ô có dấu <span className="u-req">*</span> là bắt buộc.
          </p>
        </div>
        <UField label="Họ và tên" required error={show('fullName') || fe.fullName}>
          {({ id, describedBy, invalid }) => (
            <input id={id} className="u-input" autoComplete="name" placeholder="Ví dụ: Nguyễn Thị Hoa" value={fullName} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => setFullName(e.target.value)} />
          )}
        </UField>
        <PhoneField
          label="Số điện thoại"
          required
          value={digits}
          onChange={setDigits}
          error={show('phone') || fe.phone}
          hint="Phòng khám gửi mã xác nhận tới số này. Không cần đặt mật khẩu."
        />
        <DobField value={dob} onChange={setDob} required error={show('dob') || fe.dob} hint="Dùng để bác sĩ biết tuổi khi khám." />
        <GenderField value={gender} onChange={setGender} error={show('gender') || fe.gender} />
        <AddressBox value={addr} onChange={setAddr} error={fe.address} />
        <div className="u-field">
          <label className="u-check" htmlFor={consentId}>
            <input id={consentId} type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            Tôi đồng ý để phòng khám lưu thông tin này phục vụ việc khám chữa bệnh.
          </label>
          <UError>{show('consent')}</UError>
        </div>
        {error && !Object.keys(fe).length && !otp && <UError>{error.message}</UError>}
        {error?.code === 'PHONE_TAKEN' && (
          <p className="u-text">
            <Link to="/dang-nhap" className="u-link">
              Đăng nhập với số điện thoại này
            </Link>
          </p>
        )}
        <button type="submit" className="u-btn u-btn-primary u-btn-lg u-btn-block" disabled={pending && !otp}>
          {pending && !otp ? <Spinner /> : <Icon name="user" />}
          Tạo tài khoản
        </button>
        <p className="u-text">
          Đã có tài khoản?{' '}
          <Link to={`/dang-nhap${next !== '/' ? `?tiep=${encodeURIComponent(next)}` : ''}`} className="u-link">
            Đăng nhập tại đây
          </Link>
        </p>
      </form>
      {otp && (
        <OtpDialog
          phone={phone}
          purpose="REGISTER"
          otp={otp}
          intro="Phòng khám vừa gửi tin nhắn có mã 6 số tới số điện thoại cô chú vừa nhập. Cô chú nhập mã đó để xác nhận số này là của mình."
          submitLabel="Xác nhận và tạo tài khoản"
          backLabel="Quay lại sửa thông tin"
          pending={pending}
          error={error}
          onSubmit={submitCode}
          onBack={() => {
            setOtp(null);
            setError(null);
          }}
        />
      )}
    </div>
  );
}
