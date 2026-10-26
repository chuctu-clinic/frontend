import { useState } from 'react';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { ErrorAlert } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { GENDERS, RELATIONSHIPS, fmtDate } from '@chuctu/shared/lib/format.js';
import { Dialog } from '../../components/Dialog.jsx';
import { FieldError, PhoneField, phoneDigits, phoneError, toPhone } from '../auth/AuthShell.jsx';
import { DobField, dobError, joinDob, splitDob } from '../auth/fields.jsx';

// Hộp thoại hồ sơ khám theo prototype "Hồ sơ khám bệnh": thêm / sửa, xem chi tiết, xác nhận xoá.
// Dùng ở trang Hồ sơ khám bệnh và bước chọn người đi khám khi đặt lịch.

export const EMPTY_TEXT = 'Chưa cập nhật';

/** 0912345678 → 091****678 */
export const maskPhone = (v) => (v && v.length >= 7 ? `${v.slice(0, 3)}****${v.slice(-3)}` : v || '');

export const relationLabel = (p) => RELATIONSHIPS[p.relationship] || 'Chưa khai quan hệ';

const isoDate = (d) => (d ? String(d).slice(0, 10) : '');

function TextField({ id, label, required, error, ...props }) {
  return (
    <div className="a-field">
      <label htmlFor={id} className="a-label">
        {label}
        {required && (
          <>
            {' '}
            <span className="a-req" aria-hidden="true">
              *
            </span>
          </>
        )}
      </label>
      <input id={id} className="a-input" aria-invalid={error ? 'true' : 'false'} aria-describedby={error ? `${id}-loi` : undefined} {...props} />
      <FieldError id={`${id}-loi`}>{error}</FieldError>
    </div>
  );
}

function SelectField({ id, label, required, error, options, placeholder, ...props }) {
  return (
    <div className="a-field">
      <label htmlFor={id} className="a-label">
        {label}
        {required && (
          <>
            {' '}
            <span className="a-req" aria-hidden="true">
              *
            </span>
          </>
        )}
      </label>
      <select id={id} className="a-input" aria-invalid={error ? 'true' : 'false'} aria-describedby={error ? `${id}-loi` : undefined} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      <FieldError id={`${id}-loi`}>{error}</FieldError>
    </div>
  );
}

/** Thêm hồ sơ mới (profile = null) hoặc sửa hồ sơ có sẵn. onSaved(patient) sau khi lưu xong. */
export function ProfileFormDialog({ profile, onClose, onSaved }) {
  const editing = Boolean(profile);
  const isSelf = profile?.relationship === 'BAN_THAN';
  const [form, setForm] = useState(() => ({
    fullName: profile?.fullName || '',
    phone: phoneDigits(profile?.phone || ''),
    dob: splitDob(isoDate(profile?.dob)),
    gender: profile?.gender || '',
    relationship: profile?.relationship || '',
    nationalId: profile?.nationalId || '',
    email: profile?.email || '',
    address: profile?.address || '',
  }));
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const setValue = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const set = (k) => (e) => setValue(k, e.target.value);

  const validate = () => {
    const e = {};
    if (form.fullName.trim().length < 2) e.fullName = 'Vui lòng nhập họ và tên.';
    const p = phoneError(form.phone, { required: false });
    if (p) e.phone = p;
    const d = dobError(form.dob);
    if (d) e.dob = d;
    if (!form.gender) e.gender = 'Vui lòng chọn giới tính.';
    if (!form.relationship) e.relationship = 'Vui lòng chọn quan hệ với cô chú.';
    return e;
  };
  const local = tried ? validate() : {};
  const fe = { ...(error?.fields || {}), ...local };

  const relOptions = Object.entries(RELATIONSHIPS).filter(([v]) => isSelf || v !== 'BAN_THAN');

  const save = async () => {
    setTried(true);
    setError(null);
    if (Object.keys(validate()).length) return;
    setPending(true);
    const body = {
      fullName: form.fullName.trim(),
      phone: form.phone ? toPhone(form.phone) : null,
      dob: joinDob(form.dob),
      gender: form.gender,
      relationship: form.relationship,
      nationalId: form.nationalId.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
    };
    try {
      const res = editing ? await api.patch(`/me/patients/${profile.id}`, body) : await api.post('/me/patients', body);
      onSaved(res.patient);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      title={editing ? 'Sửa hồ sơ' : 'Thêm hồ sơ mới'}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="a-btn-primary a-grow" onClick={save} disabled={pending} aria-busy={pending || undefined}>
            {pending && <span className="spinner" aria-hidden="true" />}
            {editing ? 'Lưu thay đổi' : 'Lưu hồ sơ'}
          </button>
          <button type="button" className="a-btn-ghost" onClick={onClose}>
            Huỷ
          </button>
        </>
      }
    >
      <p className="a-lead">
        {editing
          ? 'Cô chú sửa các thông tin cần thiết rồi bấm Lưu thay đổi.'
          : 'Lập hồ sơ cho người thân để lần sau đặt lịch khỏi nhập lại. Các ô không có dấu * thì cô chú không cần điền, phòng khám sẽ hỏi thêm khi đến khám.'}
      </p>
      <TextField id="hs-ten" label="Họ và tên" required placeholder="Ví dụ: Trần Văn Bảy" value={form.fullName} onChange={set('fullName')} error={fe.fullName} />
      <PhoneField id="hs-sdt" label="Số điện thoại" value={form.phone} onChange={(v) => setValue('phone', v)} error={fe.phone} />
      <DobField id="hs-ns" required value={form.dob} onChange={(v) => setValue('dob', v)} error={fe.dob} />
      <div className="a-row" style={{ gap: 14 }}>
        <SelectField
          id="hs-gt"
          label="Giới tính"
          required
          placeholder="Chọn giới tính"
          options={Object.entries(GENDERS)}
          value={form.gender}
          onChange={set('gender')}
          error={fe.gender}
        />
        <SelectField
          id="hs-qh"
          label="Quan hệ với cô chú"
          required
          placeholder="Chọn quan hệ"
          options={relOptions}
          value={form.relationship}
          onChange={set('relationship')}
          disabled={isSelf}
          error={fe.relationship}
        />
      </div>
      <TextField
        id="hs-cccd"
        label="Số căn cước công dân"
        inputMode="numeric"
        maxLength={12}
        placeholder="Không bắt buộc"
        value={form.nationalId}
        onChange={(e) => setValue('nationalId', e.target.value.replace(/\D/g, '').slice(0, 12))}
        error={fe.nationalId}
      />
      <TextField id="hs-email" label="Email" type="email" placeholder="Không bắt buộc" value={form.email} onChange={set('email')} error={fe.email} />
      <TextField
        id="hs-diachi"
        label="Địa chỉ"
        placeholder="Số nhà, đường, phường / xã, tỉnh / thành phố"
        value={form.address}
        onChange={set('address')}
        error={fe.address}
      />
      {error && !Object.keys(error.fields || {}).length && <ErrorAlert error={error} />}
    </Dialog>
  );
}

/** Ngày sinh dạng 15/03/1952; hồ sơ do tiếp tân lập có thể chỉ có năm sinh. */
export const dobText = (p) => (p.dob ? fmtDate(isoDate(p.dob)) : p.birthYear ? `Năm ${p.birthYear}` : '');

export function ProfileDetailDialog({ profile: p, onClose, onEdit, onDelete }) {
  const rows = [
    ['Họ và tên', p.fullName],
    ['Mã bệnh nhân', p.patientCode],
    ['Quan hệ với cô chú', RELATIONSHIPS[p.relationship]],
    ['Ngày sinh', dobText(p)],
    ['Giới tính', GENDERS[p.gender]],
    ['Số điện thoại', maskPhone(p.phone)],
    ['Số căn cước', p.nationalId],
    ['Email', p.email],
    ['Địa chỉ', p.address],
    ['Ngày lập hồ sơ', p.createdAt && fmtDate(p.createdAt)],
    ['Lần khám gần nhất', p.lastVisitDate ? fmtDate(isoDate(p.lastVisitDate)) : 'Chưa khám lần nào'],
  ];
  const canDelete = p.relationship !== 'BAN_THAN';
  return (
    <Dialog
      title="Chi tiết hồ sơ"
      onClose={onClose}
      actions={
        <>
          {canDelete && (
            <button type="button" className="a-btn-danger-ghost" onClick={onDelete}>
              <Icon name="trash" size={22} strokeWidth={1.75} />
              Xoá hồ sơ
            </button>
          )}
          {!p.isLocked && (
            <button type="button" className="a-btn-primary a-grow" onClick={onEdit}>
              <Icon name="edit" size={22} strokeWidth={1.75} />
              Sửa hồ sơ
            </button>
          )}
        </>
      }
    >
      {p.isLocked && (
        <p className="k-locked">
          <Icon name="lock" size={22} strokeWidth={1.75} />
          Hồ sơ đang bị phòng khám khoá: không đặt lịch và không sửa được. Lịch sử khám vẫn xem được.
        </p>
      )}
      <dl className="a-dl">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={value ? '' : 'a-empty'}>{value || EMPTY_TEXT}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}

/** Xác nhận xoá. onDeleted(result) với result.detached = true khi phòng khám vẫn giữ lịch sử. */
export function ProfileDeleteDialog({ profile: p, onClose, onDeleted }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const remove = async () => {
    setPending(true);
    setError(null);
    try {
      onDeleted(await api.del(`/me/patients/${p.id}`));
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog
      title="Xoá hồ sơ này?"
      tone="red"
      width={560}
      alert
      onClose={onClose}
      actions={
        <>
          <button type="button" className="a-btn-danger a-grow" onClick={remove} disabled={pending} aria-busy={pending || undefined}>
            {pending ? <span className="spinner" aria-hidden="true" /> : <Icon name="trash" size={22} strokeWidth={1.75} />}
            Xoá hồ sơ
          </button>
          <button type="button" className="a-btn-ghost" onClick={onClose}>
            Giữ lại
          </button>
        </>
      }
    >
      <div className="k-who">
        <Icon name="user" size={28} strokeWidth={1.75} />
        <span>
          <strong>{p.fullName}</strong>
          <span>
            {relationLabel(p)}
            {dobText(p) && ` · Ngày sinh ${dobText(p)}`}
          </span>
        </span>
      </div>
      <p className="a-lead">
        Hồ sơ này sẽ bị xoá khỏi danh sách và <strong>không khôi phục lại được</strong>. Nếu người này đã từng khám, phòng khám vẫn giữ lịch sử khám. Cô chú có chắc
        chắn muốn xoá không?
      </p>
      <ErrorAlert error={error} />
    </Dialog>
  );
}
