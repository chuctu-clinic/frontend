import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useEffect, useState } from 'react';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Alert, Button, ErrorAlert, SelectInput, TextInput, type InputEvent } from '@chuctu/shared/components/ui.tsx';
import { api, qs } from '@chuctu/shared/lib/api.ts';
import { GENDERS } from '@chuctu/shared/lib/format.ts';
import type { Paged, Patient } from '@chuctu/shared/types.ts';

const EMPTY = { fullName: '', birthYear: '', phone: '', gender: '', address: '' };

/** Biểu mẫu tạo hồ sơ bệnh nhân tại quầy: họ tên, năm sinh, số điện thoại bắt buộc (BR.25). */
export function NewPatientForm({
  onCreated,
  onCancel,
  submitLabel = 'Tạo hồ sơ',
}: {
  onCreated: (patient: Patient) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [duplicates, setDuplicates] = useState<Patient[] | null>(null);
  const set = (k: keyof typeof form) => (e: InputEvent) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fe = error?.fields || {};

  const submit = async (confirmDuplicate = false) => {
    setPending(true);
    setError(null);
    try {
      const res = await api.post<{ patient: Patient }>('/staff/patients', {
        ...form,
        gender: form.gender || null,
        address: form.address || null,
        confirmDuplicate,
      });
      onCreated(res.patient);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'DUPLICATE_PHONE') setDuplicates(apiErr.data.duplicates as Patient[]);
      else setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  if (duplicates) {
    return (
      <div className="stack">
        <Alert type="warning" title="Số điện thoại này đã có hồ sơ">
          Kiểm tra xem bệnh nhân có phải là một trong các hồ sơ dưới đây không, để tránh tạo trùng.
        </Alert>
        <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {duplicates.map((p) => (
            <li key={p.id} className="card row-between">
              <div>
                <p style={{ fontWeight: 700, color: 'var(--ink-900)' }}>{p.fullName}</p>
                <p className="caption mono">
                  {p.patientCode} · {p.birthYear ? `SN ${p.birthYear}` : ''} · {p.phone}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => onCreated(p)} disabled={p.isLocked}>
                {p.isLocked ? 'Hồ sơ đang khoá' : 'Dùng hồ sơ này'}
              </Button>
            </li>
          ))}
        </ul>
        <div className="row">
          <Button variant="ghost" icon="arrowLeft" onClick={() => setDuplicates(null)}>
            Sửa lại thông tin
          </Button>
          <Button variant="secondary" loading={pending} onClick={() => submit(true)}>
            Đây là người khác, vẫn tạo hồ sơ mới
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="stack"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
    >
      <TextInput label="Họ và tên" required value={form.fullName} onChange={set('fullName')} error={fe.fullName} />
      <div className="form-grid">
        <TextInput label="Năm sinh" required inputMode="numeric" maxLength={4} placeholder="Ví dụ: 1958" value={form.birthYear} onChange={set('birthYear')} error={fe.birthYear} />
        <TextInput label="Số điện thoại" required type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} error={fe.phone} />
        <SelectInput
          label="Giới tính"
          placeholder="Không ghi"
          options={Object.entries(GENDERS).map(([value, label]) => ({ value, label }))}
          value={form.gender}
          onChange={set('gender')}
        />
        <TextInput label="Địa chỉ" value={form.address} onChange={set('address')} error={fe.address} />
      </div>
      {error && !Object.keys(fe).length && <ErrorAlert error={error} />}
      <div className="row">
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Quay lại tìm hồ sơ
          </Button>
        )}
      </div>
    </form>
  );
}

/** Tìm hồ sơ có sẵn hoặc tạo mới cho bệnh nhân đến trực tiếp. */
export function PatientPicker({ onPick }: { onPick: (patient: Patient) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Patient[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setResults(null);
      return undefined;
    }
    const t = setTimeout(() => {
      api
        .get<Paged<Patient>>(`/staff/patients${qs({ q: text, limit: 8 })}`)
        .then((r) => setResults(r.items))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  if (creating) return <NewPatientForm onCreated={onPick} onCancel={() => setCreating(false)} submitLabel="Tạo hồ sơ và tiếp tục" />;

  return (
    <div className="stack">
      <TextInput
        label="Tìm hồ sơ bệnh nhân"
        type="search"
        hint="Nhập họ tên, số điện thoại hoặc mã bệnh nhân."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {results && results.length === 0 && <p className="muted">Không tìm thấy hồ sơ phù hợp.</p>}
      {results && results.length > 0 && (
        <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {results.map((p) => (
            <li key={p.id} className="card row-between" style={{ padding: 16 }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--ink-900)' }}>{p.fullName}</p>
                <p className="caption mono">{[p.patientCode, p.birthYear && `SN ${p.birthYear}`, p.phone].filter(Boolean).join(' · ')}</p>
              </div>
              <Button size="sm" variant="secondary" disabled={p.isLocked} onClick={() => onPick(p)}>
                {p.isLocked ? (
                  <>
                    <Icon name="lock" size={20} /> Đang khoá
                  </>
                ) : (
                  'Chọn'
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" icon="plus" onClick={() => setCreating(true)} style={{ alignSelf: 'flex-start' }}>
        Tạo hồ sơ mới
      </Button>
    </div>
  );
}
