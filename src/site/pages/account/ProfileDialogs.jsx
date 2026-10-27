import { useState } from 'react';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { GENDERS, RELATIONSHIPS, fmtDate } from '../../../shared/lib/format.js';
import { Dialog } from '../../components/Dialog.jsx';
import { FieldError } from '../../components/fields.jsx';
import { Picker } from '../../components/Picker.jsx';
import { PatientFields, RELATIVE_PHONE_NOTE, focusFirstError, patientBody, patientErrors, patientForm, validatePatient } from '../../components/PatientFields.jsx';

// Hộp thoại hồ sơ khám theo prototype "Hồ sơ khám bệnh": thêm / sửa, xem chi tiết, xác nhận xoá.
// Dùng ở trang Hồ sơ khám bệnh và bước chọn người đi khám khi đặt lịch.

export const EMPTY_TEXT = 'Chưa cập nhật';

/** 0912345678 → 091****678 */
export const maskPhone = (v) => (v && v.length >= 7 ? `${v.slice(0, 3)}****${v.slice(-3)}` : v || '');

export const relationLabel = (p) => RELATIONSHIPS[p.relationship] || 'Chưa khai quan hệ';

const isoDate = (d) => (d ? String(d).slice(0, 10) : '');

/** Thêm hồ sơ mới (profile = null) hoặc sửa hồ sơ có sẵn. onSaved(patient) sau khi lưu xong. */
export function ProfileFormDialog({ profile, onClose, onSaved }) {
  const editing = Boolean(profile);
  const isSelf = profile?.relationship === 'BAN_THAN';
  const [form, setForm] = useState(() => patientForm(profile));
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const fe = patientErrors(form, error, tried);

  const relItems = Object.entries(RELATIONSHIPS)
    .filter(([v]) => isSelf || v !== 'BAN_THAN')
    .map(([value, label]) => ({ value, label }));

  const save = async () => {
    setTried(true);
    setError(null);
    if (Object.keys(validatePatient(form)).length) {
      focusFirstError('.a-dialog');
      return;
    }
    setPending(true);
    try {
      const body = patientBody(form);
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
      width={860}
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
        {editing ? 'Cô chú sửa các thông tin cần thiết rồi bấm Lưu thay đổi.' : 'Lập hồ sơ cho người thân để lần sau đặt lịch khỏi nhập lại.'} Ô có dấu{' '}
        <span className="a-req">*</span> là bắt buộc.
      </p>
      <PatientFields id="hs" form={form} setForm={setForm} errors={fe} phoneNote={isSelf ? undefined : RELATIVE_PHONE_NOTE} />
      <div className="a-field">
        <label htmlFor="hs-qh" className="a-label">
          Quan hệ với cô chú <span className="a-req">*</span>
        </label>
        <Picker
          id="hs-qh"
          items={relItems}
          value={form.relationship}
          onChange={(v) => setForm((f) => ({ ...f, relationship: v }))}
          disabled={isSelf}
          aria-invalid={fe.relationship ? 'true' : 'false'}
          aria-describedby={fe.relationship ? 'hs-qh-loi' : undefined}
        />
        <FieldError id="hs-qh-loi">{fe.relationship}</FieldError>
      </div>
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
