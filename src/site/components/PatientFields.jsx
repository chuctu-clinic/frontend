import { useState } from 'react';
import { Icon } from '../../shared/ui/Icon.jsx';
import { AddressFields, dobError, DobField, FieldError, joinAddress, joinDob, phoneDigits, phoneError, PhoneField, PROVINCES, splitAddress, splitDob, toPhone } from './fields.jsx';
import '../pages/booking/booking.css';

// Các ô của một hồ sơ khám, dùng chung cho "Đặt cho người thân" lần đầu và hộp thoại thêm / sửa hồ sơ,
// để hai nơi luôn cùng ô và cùng quy tắc như lúc tạo tài khoản.

const isoDate = (d) => (d ? String(d).slice(0, 10) : '');

export const RELATIVE_PHONE_NOTE = 'Người thân không có điện thoại riêng thì cô chú nhập số của mình.';

export function SectionTitle({ children, ...props }) {
  return (
    <h3 className="b-sec" {...props}>
      {children}
      <span aria-hidden="true" />
    </h3>
  );
}

/** Dữ liệu form từ hồ sơ có sẵn, hoặc form trống khi thêm mới. */
export function patientForm(profile) {
  return {
    fullName: profile?.fullName || '',
    phone: phoneDigits(profile?.phone || ''),
    dob: splitDob(isoDate(profile?.dob)),
    gender: profile?.gender || '',
    address: profile ? splitAddress(profile.address) : { province: PROVINCES[0], ward: '', street: '' },
    nationalId: profile?.nationalId || '',
    email: profile?.email || '',
    relationship: profile?.relationship || '',
  };
}

/** Lỗi phía giao diện cho các ô bắt buộc; Backend vẫn kiểm tra lại. */
export function validatePatient(form) {
  const e = {};
  if (form.fullName.trim().length < 2) e.fullName = 'Vui lòng nhập họ và tên.';
  const p = phoneError(form.phone);
  if (p) e.phone = p;
  const d = dobError(form.dob);
  if (d) e.dob = d;
  if (!form.gender) e.gender = 'Vui lòng chọn giới tính.';
  if (!form.address.province) e.province = 'Vui lòng chọn tỉnh / thành phố.';
  if (!form.address.ward.trim()) e.ward = 'Vui lòng chọn phường / xã.';
  if (!form.relationship) e.relationship = 'Vui lòng chọn quan hệ với người khám.';
  return e;
}

/** Lỗi hiển thị: lỗi Backend (địa chỉ gắn vào ô phường / xã) rồi tới lỗi phía giao diện. */
export const patientErrors = (form, error, tried) => {
  const server = error?.fields || {};
  return { ...server, ward: server.address, ...(tried ? validatePatient(form) : {}) };
};

export const patientBody = (form) => ({
  fullName: form.fullName.trim(),
  phone: toPhone(form.phone),
  dob: joinDob(form.dob),
  gender: form.gender,
  address: joinAddress(form.address),
  relationship: form.relationship,
  nationalId: form.nationalId.trim() || null,
  email: form.email.trim() || null,
});

/** Đưa con trỏ tới ô lỗi đầu tiên trong vùng chứa. */
export const focusFirstError = (scope) =>
  setTimeout(() => document.querySelector(`${scope} [aria-invalid="true"], ${scope} .a-radios-invalid input`)?.focus());

/**
 * Hai nhóm "Thông tin người khám" và "Thông tin khác (Không bắt buộc)".
 * Quan hệ với người khám do nơi dùng tự đặt (trang đặt lịch để ở nhóm Thông tin người đặt).
 */
export function PatientFields({ id, form, setForm, errors: fe, phoneNote }) {
  const [moreOpen, setMoreOpen] = useState(true);
  const setValue = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inv = (k) => (fe[k] ? 'true' : 'false');

  return (
    <>
      <div className="b-group">
        <SectionTitle>Thông tin người khám</SectionTitle>
        <div className="a-row" style={{ gap: 20 }}>
          <div className="a-field" style={{ flex: '1 1 300px' }}>
            <label htmlFor={`${id}-ten`} className="a-label">
              Họ và tên <span className="a-req">*</span>
            </label>
            <input
              id={`${id}-ten`}
              className="a-input"
              type="text"
              value={form.fullName}
              onChange={(e) => setValue('fullName', e.target.value)}
              aria-invalid={inv('fullName')}
            />
            <FieldError id={`${id}-ten-loi`}>{fe.fullName}</FieldError>
          </div>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <PhoneField id={`${id}-sdt`} label="Số điện thoại" required value={form.phone} onChange={(v) => setValue('phone', v)} error={fe.phone} note={phoneNote} />
          </div>
        </div>
        <DobField id={`${id}-ns`} required value={form.dob} onChange={(v) => setValue('dob', v)} error={fe.dob} />
        <div role="radiogroup" aria-labelledby={`${id}-gt`} className={`a-field ${fe.gender ? 'a-radios-invalid' : ''}`}>
          <span id={`${id}-gt`} className="a-label">
            Giới tính <span className="a-req">*</span>
          </span>
          {/* Hai nút chia đôi hàng, thẳng cột với Họ và tên / Số điện thoại */}
          <div className="a-row" style={{ gap: 20 }}>
            {[
              ['NAM', 'Nam'],
              ['NU', 'Nữ'],
            ].map(([v, label]) => (
              <label key={v} className="a-radio" style={{ flex: '1 1 300px' }}>
                <input type="radio" name={`${id}-gioitinh`} value={v} checked={form.gender === v} onChange={() => setValue('gender', v)} />
                {label}
              </label>
            ))}
          </div>
          <FieldError id={`${id}-gt-loi`}>{fe.gender}</FieldError>
        </div>
        <AddressFields id={id} required value={form.address} onChange={(v) => setValue('address', v)} errors={fe} />
      </div>

      <div className="b-group">
        <h3 className="b-sec">
          <button type="button" className="b-sec-toggle" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
            Thông tin khác <span className="b-sec-opt">(Không bắt buộc)</span>
            <Icon name="chevronDown" size={20} strokeWidth={2.25} />
          </button>
          <span aria-hidden="true" />
        </h3>
        {moreOpen && (
          <div className="a-row" style={{ gap: 20 }}>
            <div className="a-field" style={{ flex: '1 1 300px' }}>
              <label htmlFor={`${id}-cccd`} className="a-label">
                Số căn cước công dân
              </label>
              <input
                id={`${id}-cccd`}
                className="a-input"
                type="text"
                inputMode="numeric"
                maxLength={12}
                value={form.nationalId}
                onChange={(e) => setValue('nationalId', e.target.value.replace(/\D/g, '').slice(0, 12))}
                aria-invalid={inv('nationalId')}
              />
              <FieldError id={`${id}-cccd-loi`}>{fe.nationalId}</FieldError>
            </div>
            <div className="a-field" style={{ flex: '1 1 300px' }}>
              <label htmlFor={`${id}-email`} className="a-label">
                Email nhận phiếu khám
              </label>
              <input
                id={`${id}-email`}
                className="a-input"
                type="email"
                value={form.email}
                onChange={(e) => setValue('email', e.target.value)}
                aria-invalid={inv('email')}
              />
              <FieldError id={`${id}-email-loi`}>{fe.email}</FieldError>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
