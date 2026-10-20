import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Loading } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { joinAddress, splitAddress } from '@chuctu/shared/lib/diaGioi.ts';
import { GENDERS } from '@chuctu/shared/lib/format.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { AddressBox, DobField, PhoneField, Spinner, UError, UField, phoneDigits, type AddressParts } from '../../components/uparts.tsx';
import type { User } from '@chuctu/shared/types.ts';

/** Xem và cập nhật thông tin tài khoản; số điện thoại không tự sửa (UC.1.4, UC.1.5). */
interface AccountForm {
  fullName: string;
  dob: string;
  gender: string;
  addr: AddressParts;
}

const toForm = (u: User): AccountForm => ({ fullName: u.fullName, dob: u.dob ? u.dob.slice(0, 10) : '', gender: u.gender || '', addr: splitAddress(u.address) });

export default function AccountInfo() {
  useDocumentTitle('Tài khoản của tôi');
  const { setUser } = useSession();
  const { data, loading, setData } = useAsync(() => api.get<{ user: User; patientCode: string | null }>('/me'), []);
  const [form, setForm] = useState<AccountForm | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);
  // Đổi lại khi Bỏ thay đổi để ba ô ngày sinh lấy lại giá trị cũ
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (data?.user) setForm(toForm(data.user));
  }, [data]);

  const set = <K extends keyof AccountForm>(k: K, v: AccountForm[K]) => {
    setSaved(false);
    setForm((f) => (f ? { ...f, [k]: v } : f));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.patch<{ user: User; patientCode: string | null }>('/me', {
        fullName: form.fullName,
        dob: form.dob || null,
        gender: form.gender || null,
        address: joinAddress(form.addr.street, form.addr.ward, form.addr.province) || null,
      });
      setData(res);
      setUser(res.user);
      setSaved(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  const fe = error?.fields || {};
  const u = data?.user;

  return (
    <>
      <section className="u-band">
        <div className="u-wrap">
          <h1 className="u-h1">Tài khoản của tôi</h1>
        </div>
      </section>
      <section className="u-section">
        <div className="u-wrap" style={{ maxWidth: 1160 }}>
          {loading && <Loading />}
          {saved && (
            <div className="u-ok" role="status">
              <Icon name="checkCircle" />
              Đã lưu thay đổi thông tin tài khoản.
            </div>
          )}
          {u && (
            <div className="u-linked">
              <span aria-hidden="true">
                <Icon name="file" size={28} />
              </span>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#2a2118' }}>Hồ sơ bệnh nhân đã liên kết</h2>
                <p className="u-text" style={{ marginTop: 6 }}>
                  Mã bệnh nhân <strong className="u-ink">{data.patientCode || '—'}</strong> — do phòng khám tạo. Lịch sử và kết quả khám của hồ sơ này, cùng các hồ sơ người thân, xem ở mục
                  Lịch sử khám.
                </p>
              </div>
            </div>
          )}
          {u && form && (
            <form key={formKey} className="u-card-lg" style={{ padding: 32 }} onSubmit={submit} noValidate>
              <div>
                <h2 className="u-h2" style={{ fontSize: 26, lineHeight: '36px' }}>
                  Thông tin cá nhân
                </h2>
                <p className="u-text u-muted" style={{ fontSize: 17 }}>
                  Số điện thoại là tên đăng nhập nên không sửa được tại đây. Cần đổi, cô chú gọi cho phòng khám.
                </p>
              </div>
              <UField label="Họ và tên" required error={fe.fullName}>
                {({ id, describedBy, invalid }) => (
                  <input id={id} className="u-input u-input-md" autoComplete="name" value={form.fullName} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => set('fullName', e.target.value)} />
                )}
              </UField>
              <PhoneField label="Số điện thoại (tên đăng nhập)" value={phoneDigits(u.phone)} readOnly hint="Ô này không sửa được." />
              <DobField value={form.dob} onChange={(v) => set('dob', v)} error={fe.dob} hint="Dùng để bác sĩ biết tuổi khi khám." />
              <UField label="Giới tính" error={fe.gender}>
                {({ id, invalid }) => (
                  <select id={id} className="u-select u-select-md" value={form.gender} aria-invalid={invalid} onChange={(e) => set('gender', e.target.value)}>
                    <option value="">Không muốn nêu</option>
                    {Object.entries(GENDERS).map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}
              </UField>
              <AddressBox value={form.addr} onChange={(v) => set('addr', v)} error={fe.address} />
              {error && !Object.keys(fe).length && <UError>{error.message}</UError>}
              <div className="u-row" style={{ gap: 16, paddingTop: 24, borderTop: '1px solid #e0d3bc' }}>
                <button type="submit" className="u-btn u-btn-primary u-btn-lg" style={{ padding: '0 32px' }} disabled={pending}>
                  {pending ? <Spinner /> : <Icon name="check" />}
                  Lưu thay đổi
                </button>
                <button
                  type="button"
                  className="u-btn u-btn-ghost u-btn-lg"
                  onClick={() => {
                    setForm(toForm(u));
                    setFormKey((k) => k + 1);
                    setError(null);
                    setSaved(false);
                  }}
                >
                  Bỏ thay đổi
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
