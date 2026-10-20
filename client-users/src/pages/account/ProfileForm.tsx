import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, ErrorAlert, Loading, PageHeader, SelectInput, TextInput, type InputEvent } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { GENDERS, RELATIONSHIPS, todayVN } from '@chuctu/shared/lib/format.ts';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { AccountShell } from './AccountShell.tsx';
import type { Patient } from '@chuctu/shared/types.ts';

export interface ProfileFormValues {
  fullName: string;
  phone: string;
  dob: string;
  gender: string;
  relationship: string;
  address: string;
}

const EMPTY: ProfileFormValues = { fullName: '', phone: '', dob: '', gender: '', relationship: '', address: '' };

/** Biểu mẫu hồ sơ khám dùng chung cho trang hồ sơ và bước chọn người đi khám khi đặt lịch. */
export function ProfileFields({
  form,
  setForm,
  errors = {},
  lockRelationship,
}: {
  form: ProfileFormValues;
  /** Nhận hàm cập nhật để dùng được cả với state có thể null (đang tải). */
  setForm: (update: (f: ProfileFormValues) => ProfileFormValues) => void;
  errors?: Record<string, string>;
  lockRelationship?: boolean;
}) {
  const set = (k: keyof ProfileFormValues) => (e: InputEvent) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const relOptions = Object.entries(RELATIONSHIPS)
    .filter(([v]) => lockRelationship || v !== 'BAN_THAN')
    .map(([value, label]) => ({ value, label }));
  return (
    <div className="stack">
      <TextInput label="Họ và tên người đi khám" required value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
      <SelectInput
        label="Quan hệ với cô chú"
        required
        placeholder="Chọn quan hệ"
        hint="Đặt lịch cho người thân cần khai quan hệ với người đặt."
        options={relOptions}
        value={form.relationship}
        onChange={set('relationship')}
        disabled={lockRelationship}
        error={errors.relationship}
      />
      <div className="form-grid">
        <TextInput label="Ngày sinh" required type="date" max={todayVN()} value={form.dob} onChange={set('dob')} error={errors.dob} />
        <SelectInput
          label="Giới tính"
          required
          placeholder="Chọn giới tính"
          options={Object.entries(GENDERS).map(([value, label]) => ({ value, label }))}
          value={form.gender}
          onChange={set('gender')}
          error={errors.gender}
        />
      </div>
      <TextInput
        label="Số điện thoại người đi khám"
        type="tel"
        inputMode="tel"
        hint="Không bắt buộc. Bỏ trống nếu dùng chung số của cô chú."
        value={form.phone}
        onChange={set('phone')}
        error={errors.phone}
      />
      <TextInput label="Địa chỉ" value={form.address} onChange={set('address')} error={errors.address} />
    </div>
  );
}

export function profilePayload(form: ProfileFormValues) {
  return { ...form, phone: form.phone || null, address: form.address || null };
}

/** Thêm và sửa hồ sơ khám (UC.1.7). */
export default function ProfileForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id;
  useDocumentTitle(isNew ? 'Thêm hồ sơ khám' : 'Sửa hồ sơ khám');
  const [form, setForm] = useState<ProfileFormValues | null>(isNew ? EMPTY : null);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isNew) return;
    api
      .get<{ patient: Patient }>(`/me/patients/${id}`)
      .then(({ patient: p }) =>
        setForm({
          fullName: p.fullName,
          phone: p.phone || '',
          dob: p.dob ? p.dob.slice(0, 10) : '',
          gender: p.gender || '',
          relationship: p.relationship || '',
          address: p.address || '',
        }),
      )
      .catch(setError);
  }, [id, isNew]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setPending(true);
    setError(null);
    try {
      if (isNew) await api.post('/me/patients', profilePayload(form));
      else await api.patch(`/me/patients/${id}`, profilePayload(form));
      navigate(params.get('tiep') === 'dat-lich' ? '/dat-lich' : '/tai-khoan/ho-so');
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  return (
    <AccountShell crumbs={[{ to: '/tai-khoan/ho-so', label: 'Hồ sơ khám bệnh' }, { label: isNew ? 'Thêm hồ sơ' : 'Sửa hồ sơ' }]}>
      <PageHeader title={isNew ? 'Thêm hồ sơ người thân' : 'Sửa hồ sơ khám'} />
      {!form && !error && <Loading />}
      {form && (
        <form className="card card-lg stack" onSubmit={submit} noValidate>
          <ProfileFields form={form} setForm={(u) => setForm((f) => (f ? u(f) : f))} errors={error?.fields} lockRelationship={form.relationship === 'BAN_THAN'} />
          {error && !Object.keys(error.fields || {}).length && <ErrorAlert error={error} />}
          <div className="row">
            <Button type="submit" loading={pending}>
              {isNew ? 'Lưu hồ sơ' : 'Lưu thay đổi'}
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Quay lại
            </Button>
          </div>
        </form>
      )}
      {!form && error && <ErrorAlert error={error} />}
    </AccountShell>
  );
}
