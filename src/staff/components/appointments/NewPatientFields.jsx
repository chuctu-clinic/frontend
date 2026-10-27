import { useState } from 'react';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { todayVN } from '../../../shared/lib/format.js';
import { FieldError, PhoneField, normalizePhone, phoneError } from '../fields.jsx';

/** Kiểm tra 3 trường bắt buộc khi tạo hồ sơ tại quầy (BR.25). */
export function validateNewPatient({ fullName, birthYear, phone }) {
  const year = Number(birthYear);
  const thisYear = Number(todayVN().slice(0, 4));
  return {
    fullName: fullName.trim().length >= 2 ? null : 'Vui lòng nhập họ và tên bệnh nhân.',
    birthYear: /^(19|20)\d{2}$/.test(birthYear) && year <= thisYear ? null : 'Nhập năm sinh gồm 4 chữ số, ví dụ 1952.',
    phone: phoneError(phone),
  };
}

/**
 * Biểu mẫu hồ sơ mới: họ tên, năm sinh, số điện thoại. Mỗi số điện thoại chỉ có một hồ sơ;
 * trùng thì báo hồ sơ đã có để chọn lại.
 */
export function NewPatientFields({ idPrefix, onCreated, onCancel, submitLabel, onPickExisting, intro }) {
  const [form, setForm] = useState({ fullName: '', birthYear: '', phone: '' });
  const [tried, setTried] = useState(false);
  const [dup, setDup] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const errs = validateNewPatient(form);
  const show = (k) => (tried ? errs[k] : null);
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDup(null);
  };

  const submit = async () => {
    setTried(true);
    if (Object.values(errs).some(Boolean)) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.post('/staff/patients', { fullName: form.fullName.trim(), birthYear: form.birthYear, phone: normalizePhone(form.phone) });
      onCreated(res.patient);
    } catch (err) {
      if (err.code === 'DUPLICATE_PHONE') setDup(err.data.duplicates[0]);
      else setError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {intro}
      <div className="t-field">
        <label htmlFor={`${idPrefix}-ten`} className="t-label">
          Họ và tên <span className="t-req">*</span>
        </label>
        <input
          id={`${idPrefix}-ten`}
          className="t-input"
          autoComplete="off"
          value={form.fullName}
          onChange={(e) => set('fullName', e.target.value)}
          aria-invalid={show('fullName') ? 'true' : 'false'}
          aria-describedby={`${idPrefix}-ten-loi`}
        />
        <FieldError id={`${idPrefix}-ten-loi`}>{show('fullName')}</FieldError>
      </div>
      <div className="t-row" style={{ gap: 20 }}>
        <div className="t-field" style={{ flex: '1 1 180px' }}>
          <label htmlFor={`${idPrefix}-nam`} className="t-label">
            Năm sinh <span className="t-req">*</span>
          </label>
          <input
            id={`${idPrefix}-nam`}
            className="t-input"
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            value={form.birthYear}
            onChange={(e) => set('birthYear', e.target.value.replace(/\D/g, ''))}
            aria-invalid={show('birthYear') ? 'true' : 'false'}
            aria-describedby={`${idPrefix}-nam-loi`}
          />
          <FieldError id={`${idPrefix}-nam-loi`}>{show('birthYear')}</FieldError>
        </div>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <PhoneField id={`${idPrefix}-sdt`} value={form.phone} onChange={(v) => set('phone', v)} error={show('phone')} />
        </div>
      </div>
      {dup && (
        <div role="alert" className="t-tint-gold" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          <p className="t-text" style={{ flex: '1 1 300px' }}>
            Số điện thoại này đã có hồ sơ: <strong className="t-strong">{dup.fullName}</strong>, mã <strong className="t-strong">{dup.patientCode}</strong>.{' '}
            {dup.isLocked ? 'Hồ sơ này đã khoá, hãy liên hệ Admin để mở khoá, không tạo hồ sơ mới.' : 'Mỗi số điện thoại chỉ có một hồ sơ, hãy mở hồ sơ đã có.'}
          </p>
          {onPickExisting && !dup.isLocked && (
            <button type="button" className="t-btn t-btn-ghost" onClick={() => onPickExisting(dup)}>
              Chọn hồ sơ này
            </button>
          )}
        </div>
      )}
      <ErrorAlert error={error} />
      <div className="t-actions" style={{ paddingTop: 4 }}>
        <button type="submit" className="t-btn t-btn-primary" style={{ flex: '1 1 240px' }} disabled={pending}>
          <Icon name="plus" strokeWidth={1.75} />
          {submitLabel}
        </button>
        <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 28px' }} onClick={onCancel}>
          Huỷ
        </button>
      </div>
    </form>
  );
}
