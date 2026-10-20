import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { PROVINCES } from '@chuctu/shared/lib/diaGioi.ts';
import { todayVN } from '@chuctu/shared/lib/format.ts';

// Ô nhập và hộp thoại dùng chung cho các trang của người dùng (prototype: chữ 20px, ô cao 60px).

/** Số đã lưu "0912345678" → phần sau +84 "912345678". */
export const phoneDigits = (phone: string | null | undefined) => (phone || '').replace(/\D/g, '').replace(/^84(?=\d{9}$)/, '').replace(/^0/, '');

/** Phần sau +84 → số gửi lên Backend (Backend chuẩn hoá về 0xxxxxxxxx). */
export const toPhone = (digits: string) => (digits.startsWith('0') ? digits : `0${digits}`);

/** 9–10 chữ số sau +84 như prototype. */
export const phoneOk = (digits: string) => /^[0-9]{9,10}$/.test(digits);

export function UError({ id, children }: { id?: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="u-error" role="alert" id={id}>
      <Icon name="alert" size={20} />
      {children}
    </p>
  );
}

interface FieldProps {
  label: ReactNode;
  required?: boolean;
  optional?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
}

/** Nhãn + ô + ghi chú + lỗi; children nhận id và aria-describedby để gắn vào ô. */
export function UField({ label, required, optional, hint, error, children }: FieldProps & { children: (a: { id: string; describedBy?: string; invalid: boolean }) => ReactNode }) {
  const id = useId();
  const describedBy = [hint && `${id}-note`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="u-field">
      <label className="u-label" htmlFor={id}>
        {label}
        {required && <span className="u-req"> *</span>}
        {optional && <span className="u-opt"> (không bắt buộc)</span>}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      <UError id={`${id}-err`}>{error}</UError>
      {hint && (
        <p className="u-hint" id={`${id}-note`}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** Ô số điện thoại có tiền tố +84; value là phần chữ số sau +84. */
export function PhoneField({ value, onChange, readOnly, ...field }: FieldProps & { value: string; onChange?: (digits: string) => void; readOnly?: boolean }) {
  return (
    <UField {...field}>
      {({ id, describedBy, invalid }) => (
        <div className={`u-phone${invalid ? ' invalid' : ''}${readOnly ? ' ro' : ''}`}>
          <span>+84</span>
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="912345678"
            value={value}
            readOnly={readOnly}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            onChange={(e) => onChange?.(e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
        </div>
      )}
    </UField>
  );
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Ngày sinh chọn bằng ba ô Ngày / Tháng / Năm; value dạng YYYY-MM-DD, chưa chọn đủ thì ''. */
export function DobField({ value, onChange, required, error, hint }: { value: string; onChange: (iso: string) => void; required?: boolean; error?: ReactNode; hint?: ReactNode }) {
  const [y0, m0, d0] = value ? value.split('-') : ['', '', ''];
  const [parts, setParts] = useState({ d: d0 ? String(Number(d0)) : '', m: m0 ? String(Number(m0)) : '', y: y0 || '' });
  const id = useId();
  // Giá trị bên ngoài đổi (tải xong dữ liệu, bấm Bỏ thay đổi) thì cập nhật lại ba ô
  useEffect(() => {
    if (!value) return;
    const [y, m, d] = value.split('-');
    setParts({ d: String(Number(d)), m: String(Number(m)), y });
  }, [value]);

  const thisYear = Number(todayVN().slice(0, 4));
  const years = Array.from({ length: 111 }, (_, i) => thisYear - i);
  const daysIn = parts.m && parts.y ? new Date(Number(parts.y), Number(parts.m), 0).getDate() : 31;
  const days = Array.from({ length: daysIn }, (_, i) => i + 1);

  const set = (k: 'd' | 'm' | 'y', v: string) => {
    const next = { ...parts, [k]: v };
    if (next.d && next.m && next.y && Number(next.d) > new Date(Number(next.y), Number(next.m), 0).getDate()) next.d = '';
    setParts(next);
    onChange(next.d && next.m && next.y ? `${next.y}-${next.m.padStart(2, '0')}-${next.d.padStart(2, '0')}` : '');
  };

  const sel = (k: 'd' | 'm' | 'y', label: string, placeholder: string, opts: { v: number; t: string }[], flex: string) => (
    <div className="u-field" style={{ flex }}>
      <label className="u-label-sm" htmlFor={`${id}-${k}`}>
        {label}
      </label>
      <select id={`${id}-${k}`} className="u-select" value={parts[k]} aria-invalid={!!error} onChange={(e) => set(k, e.target.value)}>
        <option value="">{placeholder}</option>
        {opts.map((o) => (
          <option key={o.v} value={o.v}>
            {o.t}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="u-field" role="group" aria-labelledby={`${id}-lb`}>
      <span className="u-label" id={`${id}-lb`}>
        Ngày sinh
        {required && <span className="u-req"> *</span>}
      </span>
      <div className="u-cols">
        {sel('d', 'Ngày', 'Chọn ngày', days.map((n) => ({ v: n, t: String(n) })), '1 1 120px')}
        {sel('m', 'Tháng', 'Chọn tháng', MONTHS.map((n) => ({ v: n, t: `Tháng ${n}` })), '1.3 1 160px')}
        {sel('y', 'Năm', 'Chọn năm', years.map((n) => ({ v: n, t: String(n) })), '1.2 1 140px')}
      </div>
      <UError>{error}</UError>
      {hint && <p className="u-hint">{hint}</p>}
    </div>
  );
}

/** Giới tính dạng hai thẻ chọn Nam / Nữ. */
export function GenderField({ value, onChange, error, required = true }: { value: string; onChange: (v: string) => void; error?: ReactNode; required?: boolean }) {
  const id = useId();
  return (
    <div className="u-field" role="radiogroup" aria-labelledby={`${id}-lb`}>
      <span className="u-label" id={`${id}-lb`}>
        Giới tính
        {required && <span className="u-req"> *</span>}
      </span>
      <div className="u-radio-cards">
        {[
          ['NAM', 'Nam'],
          ['NU', 'Nữ'],
        ].map(([v, t]) => (
          <label key={v} className="u-radio-card">
            <input type="radio" name={id} checked={value === v} onChange={() => onChange(v)} />
            {t}
          </label>
        ))}
      </div>
      <UError>{error}</UError>
    </div>
  );
}

export interface AddressParts {
  street: string;
  ward: string;
  province: string;
}

/**
 * Khối địa chỉ nền be: Tỉnh / Thành phố, Phường / Xã, Địa chỉ cụ thể.
 * Danh sách phường / xã mẫu chưa đầy đủ nên ô này cho gõ tự do, có gợi ý theo tỉnh đã chọn.
 */
export function AddressBox({ value, onChange, error, title = 'Địa chỉ' }: { value: AddressParts; onChange: (v: AddressParts) => void; error?: ReactNode; title?: string }) {
  const id = useId();
  const wards = PROVINCES.find((p) => p.name === value.province)?.wards || [];
  return (
    <div className="u-panel">
      <h2>{title}</h2>
      <div className="u-cols" style={{ gap: 20 }}>
        <div className="u-field" style={{ flex: '1 1 240px' }}>
          <label className="u-label" htmlFor={`${id}-t`}>
            Tỉnh / Thành phố
          </label>
          <select id={`${id}-t`} className="u-select" value={value.province} onChange={(e) => onChange({ ...value, province: e.target.value, ward: '' })}>
            <option value="">— Chọn tỉnh / thành phố —</option>
            {PROVINCES.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="u-field" style={{ flex: '1 1 240px' }}>
          <label className="u-label" htmlFor={`${id}-x`}>
            Phường / Xã
          </label>
          <input
            id={`${id}-x`}
            className="u-input"
            list={`${id}-xl`}
            placeholder={value.province ? 'Gõ hoặc chọn phường / xã' : 'Chọn tỉnh / thành phố trước'}
            disabled={!value.province}
            value={value.ward}
            onChange={(e) => onChange({ ...value, ward: e.target.value })}
          />
          <datalist id={`${id}-xl`}>
            {wards.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="u-field">
        <label className="u-label" htmlFor={`${id}-d`}>
          Địa chỉ cụ thể
        </label>
        <input id={`${id}-d`} className="u-input" autoComplete="street-address" placeholder="Số nhà, tên đường, tổ / ấp" value={value.street} onChange={(e) => onChange({ ...value, street: e.target.value })} />
      </div>
      <UError>{error}</UError>
    </div>
  );
}

/** Hộp thoại theo prototype: dải đầu xanh (hoặc đỏ nhạt khi huỷ), nút Đóng vuông bên phải. */
export function UDialog({ title, sub, tone = 'green', onClose, children, width = 560 }: { title: ReactNode; sub?: ReactNode; tone?: 'green' | 'red' | 'danger'; onClose: () => void; children: ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea, .u-dialog-body button');
    (first || ref.current)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="u-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="u-dialog" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <div className={`u-dialog-head ${tone}`}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id={titleId}>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button type="button" className="u-dialog-x" aria-label="Đóng" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="u-dialog-body">{children}</div>
      </div>
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

const STEPS = ['Thông tin khám', 'Người đi khám', 'Xác nhận', 'Phiếu khám'];

/** Dải đầu xanh của khung đặt lịch / phiếu khám: nút quay lại, tiêu đề, các bước (nếu có). */
export function FlowHead({ title, onBack, backLabel = 'Quay lại', step }: { title: string; onBack: () => void; backLabel?: string; step?: number }) {
  return (
    <div className={`u-flow-head${step ? ' with-steps' : ''}`}>
      <div className="u-flow-bar">
        <button type="button" className="u-flow-back" aria-label={backLabel} onClick={onBack}>
          <Icon name="arrowLeft" />
        </button>
        <h1>{title}</h1>
        <span className="u-flow-spacer" />
      </div>
      {step && (
        <ol className="u-steps" aria-label="Các bước đặt lịch">
          {STEPS.map((label, i) => (
            <li key={label} className={i + 1 === step ? 'on' : ''} aria-current={i + 1 === step ? 'step' : undefined}>
              <span className="dot">{i + 1}</span>
              <span className="lb">{label}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
