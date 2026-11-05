import { useEffect, useMemo, useState } from 'react';
import { todayVN } from '../../shared/lib/format.js';
import { Icon } from '../../shared/ui/Icon.jsx';
import { phoneDigits, phoneInputError, toPhone } from '../../shared/domain/phone.js';
import { Picker } from './Picker.jsx';
import '../pages/auth/auth.css';

// Ô nhập dùng chung cho tạo tài khoản, thông tin tài khoản và hồ sơ khám (theo prototype)

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="a-error" role="alert">
      <Icon name="alert" size={22} />
      {children}
    </p>
  );
}

// Xử lý ô số điện thoại dùng chung với khu nội bộ và cùng quy tắc với Backend (shared/domain/phone.js)
export { phoneDigits, toPhone, phoneInputError as phoneError };

/** Ô số điện thoại có tiền tố +84 cố định. */
export function PhoneField({ id, label, required, value, onChange, error, note, autoFocus, readOnly }) {
  const errId = `${id}-loi`;
  const noteId = `${id}-note`;
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
      <div className={`a-phone ${readOnly ? 'a-phone-ro' : ''}`}>
        <span className="a-phone-pre" aria-hidden="true">
          +84
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={12}
          value={value}
          onChange={(e) => onChange(phoneDigits(e.target.value))}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={[error && errId, note && noteId].filter(Boolean).join(' ') || undefined}
          autoFocus={autoFocus}
          readOnly={readOnly}
        />
      </div>
      <FieldError id={errId}>{error}</FieldError>
      {note && (
        <p id={noteId} className="a-hint">
          {note}
        </p>
      )}
    </div>
  );
}

// 63 tỉnh, thành phố trước sắp xếp đơn vị hành chính năm 2025; cùng thứ tự với dvhc.json
export const PROVINCES = [
  'TP. Hồ Chí Minh', 'TP. Hà Nội', 'TP. Hải Phòng', 'TP. Huế', 'TP. Đà Nẵng', 'TP. Cần Thơ',
  'Tỉnh An Giang', 'Tỉnh Bà Rịa - Vũng Tàu', 'Tỉnh Bạc Liêu', 'Tỉnh Bắc Giang', 'Tỉnh Bắc Kạn',
  'Tỉnh Bắc Ninh', 'Tỉnh Bến Tre', 'Tỉnh Bình Dương', 'Tỉnh Bình Định', 'Tỉnh Bình Phước',
  'Tỉnh Bình Thuận', 'Tỉnh Cà Mau', 'Tỉnh Cao Bằng', 'Tỉnh Đắk Lắk', 'Tỉnh Đắk Nông', 'Tỉnh Điện Biên',
  'Tỉnh Đồng Nai', 'Tỉnh Đồng Tháp', 'Tỉnh Gia Lai', 'Tỉnh Hà Giang', 'Tỉnh Hà Nam', 'Tỉnh Hà Tĩnh',
  'Tỉnh Hải Dương', 'Tỉnh Hậu Giang', 'Tỉnh Hoà Bình', 'Tỉnh Hưng Yên', 'Tỉnh Khánh Hòa',
  'Tỉnh Kiên Giang', 'Tỉnh Kon Tum', 'Tỉnh Lai Châu', 'Tỉnh Lạng Sơn', 'Tỉnh Lào Cai', 'Tỉnh Lâm Đồng',
  'Tỉnh Long An', 'Tỉnh Nam Định', 'Tỉnh Nghệ An', 'Tỉnh Ninh Bình', 'Tỉnh Ninh Thuận', 'Tỉnh Phú Thọ',
  'Tỉnh Phú Yên', 'Tỉnh Quảng Bình', 'Tỉnh Quảng Nam', 'Tỉnh Quảng Ngãi', 'Tỉnh Quảng Ninh',
  'Tỉnh Quảng Trị', 'Tỉnh Sóc Trăng', 'Tỉnh Sơn La', 'Tỉnh Tây Ninh', 'Tỉnh Thái Bình',
  'Tỉnh Thái Nguyên', 'Tỉnh Thanh Hóa', 'Tỉnh Tiền Giang', 'Tỉnh Trà Vinh', 'Tỉnh Tuyên Quang',
  'Tỉnh Vĩnh Long', 'Tỉnh Vĩnh Phúc', 'Tỉnh Yên Bái',
];

/**
 * Phường / xã theo tỉnh: [[tỉnh, [[quận / huyện, [phường / xã]]]]]. Tải riêng khi cần để không làm nặng trang.
 * Một phường / xã được lưu kèm quận / huyện ("Phường 25, Quận Bình Thạnh") vì nhiều quận trùng tên phường.
 */
let wardsPromise = null;
const loadWards = () => (wardsPromise ??= import('./dvhc.json').then((m) => new Map(m.default)));

/** Danh sách quận / huyện và phường / xã của một tỉnh; null khi đang tải. */
function useDistricts(province) {
  const [map, setMap] = useState(null);
  useEffect(() => {
    let alive = true;
    loadWards().then((m) => alive && setMap(m));
    return () => {
      alive = false;
    };
  }, []);
  if (!map) return null;
  return map.get(province) || [];
}

const wardValue = (ward, district) => (ward ? `${ward}, ${district}` : district);
const toItems = (list) => list.map((v) => ({ value: String(v), label: String(v) }));
const PROVINCE_ITEMS = toItems(PROVINCES);
const MONTH_ITEMS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` }));

const pad = (n) => String(n).padStart(2, '0');
const daysIn = (month, year) => (month ? new Date(Number(year) || 2000, Number(month), 0).getDate() : 31);

/** "1952-03-15" → { day: '15', month: '3', year: '1952' } */
export function splitDob(iso) {
  if (!iso) return { day: '', month: '', year: '' };
  const [y, m, d] = iso.slice(0, 10).split('-');
  return { day: String(Number(d)), month: String(Number(m)), year: y };
}

/** Ngày đã chọn đủ thì trả về "YYYY-MM-DD", thiếu thì trả về "". Ngày vượt số ngày của tháng bị bỏ. */
export function joinDob({ day, month, year }) {
  if (!day || !month || !year || Number(day) > daysIn(month, year)) return '';
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Lỗi ngày sinh phía giao diện; Backend vẫn kiểm tra lại. */
export function dobError(dob, { required = true } = {}) {
  const iso = joinDob(dob);
  if (!iso) return required || dob.day || dob.month || dob.year ? 'Vui lòng chọn đủ ngày, tháng, năm sinh.' : null;
  if (iso >= todayVN()) return 'Ngày sinh phải trước hôm nay.';
  return null;
}

/** Ngày sinh bằng ba ô chọn ngày / tháng / năm. value = { day, month, year }. */
export function DobField({ id, value, onChange, error, required, label = 'Ngày sinh' }) {
  const maxDay = daysIn(value.month, value.year);
  const day = Number(value.day) > maxDay ? '' : value.day;
  const thisYear = Number(todayVN().slice(0, 4));
  const years = useMemo(() => toItems(Array.from({ length: thisYear - 1919 }, (_, i) => thisYear - i)), [thisYear]);
  const days = useMemo(() => toItems(Array.from({ length: maxDay }, (_, i) => i + 1)), [maxDay]);
  const set = (k) => (v) => onChange({ ...value, day, [k]: v });
  const describedBy = [error && `${id}-loi`, `${id}-note`].filter(Boolean).join(' ');
  const note = day && value.month && value.year ? `Cô chú sinh ngày ${day} tháng ${value.month} năm ${value.year}.` : 'Cô chú chọn lần lượt ngày, tháng, năm sinh.';
  return (
    <div role="group" aria-labelledby={`${id}-label`} className="a-field">
      <span id={`${id}-label`} className="a-label">
        {label}
        {required && (
          <>
            {' '}
            <span className="a-req" aria-hidden="true">
              *
            </span>
          </>
        )}
      </span>
      <div className="a-row">
        <div className="a-field" style={{ gap: 6 }}>
          <label htmlFor={`${id}-ngay`} className="a-sublabel">
            Ngày
          </label>
          <Picker id={`${id}-ngay`} items={days} searchable={false} value={day} onChange={set('day')} aria-invalid={error && !day ? 'true' : 'false'} aria-describedby={describedBy} />
        </div>
        <div className="a-field" style={{ gap: 6, flexGrow: 1.3 }}>
          <label htmlFor={`${id}-thang`} className="a-sublabel">
            Tháng
          </label>
          <Picker id={`${id}-thang`} items={MONTH_ITEMS} value={value.month} onChange={set('month')} aria-invalid={error && !value.month ? 'true' : 'false'} aria-describedby={describedBy} />
        </div>
        <div className="a-field" style={{ gap: 6, flexGrow: 1.2 }}>
          <label htmlFor={`${id}-nam`} className="a-sublabel">
            Năm
          </label>
          <Picker id={`${id}-nam`} items={years} searchable={false} value={value.year} onChange={set('year')} aria-invalid={error && !value.year ? 'true' : 'false'} aria-describedby={describedBy} />
        </div>
      </div>
      <FieldError id={`${id}-loi`}>{error}</FieldError>
      <p id={`${id}-note`} className="a-hint" aria-live="polite">
        {note}
      </p>
    </div>
  );
}

const DISTRICT = /^(Quận|Huyện|Thị xã|Thành phố) /;
const WARD = /^(Phường|Xã|Thị trấn) /;

/** "57/8 Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh" → { street, ward, province }. */
export function splitAddress(address) {
  const parts = (address || '').split(',').map((s) => s.trim()).filter(Boolean);
  const province = parts.length && PROVINCES.includes(parts[parts.length - 1]) ? parts.pop() : '';
  let ward = '';
  if (province && parts.length) {
    // Phường / xã đi kèm quận / huyện; địa chỉ lưu trước đây có thể chỉ có phường / xã
    const two = parts.length >= 2 && DISTRICT.test(parts[parts.length - 1]) && WARD.test(parts[parts.length - 2]);
    ward = parts.splice(two ? -2 : -1).join(', ');
  }
  return { street: parts.join(', '), ward, province: province || (address ? '' : PROVINCES[0]) };
}

export const joinAddress = ({ street, ward, province }) => [street.trim(), ward.trim(), province].filter(Boolean).join(', ');

/** Khối địa chỉ nền be: tỉnh / thành phố, phường / xã, địa chỉ cụ thể. value = { province, ward, street }. */
export function AddressFields({ id, value, onChange, errors = {}, required }) {
  const districts = useDistricts(value.province);
  const wardItems = useMemo(() => {
    const list = (districts || []).flatMap(([district, wards]) =>
      wards.length ? wards.map((w) => ({ value: wardValue(w, district), label: w, group: district, display: wardValue(w, district) })) : [{ value: district, label: district }],
    );
    // Địa chỉ đã lưu không có trong danh sách (ví dụ theo tên mới) vẫn được giữ nguyên
    if (districts && value.ward && !list.some((it) => it.value === value.ward)) list.unshift({ value: value.ward, label: value.ward });
    return list;
  }, [districts, value.ward]);
  const set = (k) => (v) => onChange({ ...value, [k]: v });
  // Đổi tỉnh thì phường / xã cũ không còn đúng
  const setProvince = (v) => v !== value.province && onChange({ ...value, province: v, ward: '' });
  const req = required && (
    <>
      {' '}
      <span className="a-req" aria-hidden="true">
        *
      </span>
    </>
  );
  return (
    <div className="a-panel">
      <h2>Địa chỉ</h2>
      <div className="a-row a-row-wide" style={{ gap: 20 }}>
        <div className="a-field">
          <label htmlFor={`${id}-tinh`} className="a-label">
            Tỉnh / Thành phố{req}
          </label>
          <Picker
            id={`${id}-tinh`}
            items={PROVINCE_ITEMS}
            value={value.province}
            onChange={setProvince}
            aria-invalid={errors.province ? 'true' : 'false'}
            aria-describedby={errors.province ? `${id}-tinh-loi` : undefined}
          />
          <FieldError id={`${id}-tinh-loi`}>{errors.province}</FieldError>
        </div>
        <div className="a-field">
          <label htmlFor={`${id}-xa`} className="a-label">
            Phường / Xã{req}
          </label>
          <Picker
            id={`${id}-xa`}
            items={wardItems}
            searchable
            value={value.ward}
            onChange={set('ward')}
            disabled={!value.province || !districts}
            busy={Boolean(value.province && !districts)}
            aria-invalid={errors.ward ? 'true' : 'false'}
            aria-describedby={errors.ward ? `${id}-xa-loi` : undefined}
          />
          <FieldError id={`${id}-xa-loi`}>{errors.ward}</FieldError>
        </div>
      </div>
      <div className="a-field">
        <label htmlFor={`${id}-diachi`} className="a-label">
          Địa chỉ cụ thể
        </label>
        <input
          id={`${id}-diachi`}
          className="a-input"
          type="text"
          autoComplete="street-address"
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
          aria-invalid={errors.street ? 'true' : 'false'}
        />
        <FieldError id={`${id}-diachi-loi`}>{errors.street}</FieldError>
      </div>
    </div>
  );
}
