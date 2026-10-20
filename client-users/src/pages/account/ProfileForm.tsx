import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useState, type FormEvent } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { GENDERS, RELATIONSHIPS } from '@chuctu/shared/lib/format.ts';
import { DobField, PhoneField, Spinner, UDialog, UError, UField, phoneDigits, phoneOk, toPhone } from '../../components/uparts.tsx';
import type { Patient } from '@chuctu/shared/types.ts';

export interface ProfileFormValues {
  fullName: string;
  phone: string;
  dob: string;
  gender: string;
  relationship: string;
  address: string;
}

export const profileValues = (p?: Patient | null): ProfileFormValues => ({
  fullName: p?.fullName || '',
  phone: phoneDigits(p?.phone),
  dob: p?.dob ? p.dob.slice(0, 10) : '',
  gender: p?.gender || '',
  relationship: p?.relationship || '',
  address: p?.address || '',
});

export function profilePayload(form: ProfileFormValues) {
  return { ...form, phone: form.phone ? toPhone(form.phone) : null, address: form.address.trim() || null };
}

/**
 * Hộp thoại thêm / sửa hồ sơ khám (UC.1.7), dùng ở trang Hồ sơ khám bệnh và bước chọn người khám khi đặt lịch.
 * Prototype có thêm ô căn cước và email; hệ thống chưa lưu hai thông tin này nên không đưa vào.
 */
export function ProfileDialog({ patient, onClose, onSaved }: { patient?: Patient | null; onClose: () => void; onSaved: (p: Patient) => void }) {
  const isNew = !patient;
  const self = patient?.relationship === 'BAN_THAN';
  const [form, setForm] = useState<ProfileFormValues>(() => profileValues(patient));
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const fe = error?.fields || {};
  const set = <K extends keyof ProfileFormValues>(k: K, v: ProfileFormValues[K]) => setForm((f) => ({ ...f, [k]: v }));

  const local = {
    fullName: form.fullName.trim().length < 2 ? 'Vui lòng nhập họ và tên.' : null,
    phone: form.phone && !phoneOk(form.phone) ? 'Số điện thoại gồm 9 đến 10 chữ số sau +84.' : null,
    dob: !form.dob ? 'Vui lòng chọn đủ ngày, tháng, năm sinh.' : null,
    gender: !form.gender ? 'Vui lòng chọn giới tính.' : null,
    relationship: !form.relationship ? 'Vui lòng chọn quan hệ với cô chú.' : null,
  };
  const show = (k: keyof typeof local) => (tried ? local[k] : null) || fe[k];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(local).some(Boolean)) return;
    setPending(true);
    setError(null);
    try {
      const res = isNew
        ? await api.post<{ patient: Patient }>('/me/patients', profilePayload(form))
        : await api.patch<{ patient: Patient }>(`/me/patients/${patient.id}`, profilePayload(form));
      onSaved(res.patient);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  const relOptions = Object.entries(RELATIONSHIPS).filter(([v]) => self || v !== 'BAN_THAN');

  return (
    <UDialog title={isNew ? 'Thêm hồ sơ mới' : 'Sửa hồ sơ'} onClose={onClose} width={680}>
      <form className="u-stack" onSubmit={submit} noValidate>
        <p className="u-text">
          {isNew ? 'Cô chú điền thông tin người đi khám. Lần sau đặt lịch chỉ cần chọn hồ sơ này.' : 'Cô chú sửa chỗ chưa đúng rồi bấm Lưu thay đổi.'}
        </p>
        <UField label="Họ và tên" required error={show('fullName')}>
          {({ id, describedBy, invalid }) => (
            <input id={id} className="u-input u-input-md" placeholder="Ví dụ: Trần Văn Bảy" value={form.fullName} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => set('fullName', e.target.value)} />
          )}
        </UField>
        <PhoneField label="Số điện thoại" optional value={form.phone} onChange={(d) => set('phone', d)} error={show('phone')} hint="Bỏ trống nếu dùng chung số của cô chú." />
        <DobField value={form.dob} onChange={(v) => set('dob', v)} required error={show('dob')} />
        <div className="u-cols">
          <UField label="Giới tính" required error={show('gender')}>
            {({ id, invalid }) => (
              <select id={id} className="u-select u-select-md" value={form.gender} aria-invalid={invalid} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Chọn giới tính</option>
                {Object.entries(GENDERS).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </UField>
          <UField label="Quan hệ với cô chú" required error={show('relationship')}>
            {({ id, invalid }) => (
              <select id={id} className="u-select u-select-md" value={form.relationship} aria-invalid={invalid} disabled={self} onChange={(e) => set('relationship', e.target.value)}>
                <option value="">Chọn quan hệ</option>
                {relOptions.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </UField>
        </div>
        <UField label="Địa chỉ" optional error={fe.address}>
          {({ id, describedBy }) => (
            <input id={id} className="u-input u-input-md" placeholder="Số nhà, đường, phường / xã, tỉnh / thành phố" value={form.address} aria-describedby={describedBy} onChange={(e) => set('address', e.target.value)} />
          )}
        </UField>
        {error && !Object.keys(fe).length && <UError>{error.message}</UError>}
        <div className="u-actions">
          <button type="submit" className="u-btn u-btn-primary grow" disabled={pending}>
            {pending ? <Spinner /> : <Icon name="check" />}
            {isNew ? 'Lưu hồ sơ' : 'Lưu thay đổi'}
          </button>
          <button type="button" className="u-btn u-btn-ghost back" onClick={onClose}>
            Huỷ
          </button>
        </div>
      </form>
    </UDialog>
  );
}

/** Đường dẫn cũ /tai-khoan/ho-so/moi và /tai-khoan/ho-so/:id mở hộp thoại trên trang Hồ sơ khám bệnh. */
export default function ProfileForm() {
  const { id } = useParams();
  return <Navigate to={id ? `/tai-khoan/ho-so?sua=${id}` : '/tai-khoan/ho-so?them=1'} replace />;
}
