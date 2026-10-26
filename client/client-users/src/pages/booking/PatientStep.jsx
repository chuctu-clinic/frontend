import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { ErrorAlert, Loading } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { CLINIC, GENDERS, RELATIONSHIPS, todayVN } from '@chuctu/shared/lib/format.js';
import { FieldError, PhoneField, phoneError, toPhone } from '../auth/AuthShell.jsx';
import { Picker } from '../auth/Picker.jsx';
import { ProfileChip, ProfileLines } from '../account/Profiles.jsx';

// Bước 2 theo các màn "Đặt lịch 2" của prototype: hai thẻ "Đặt cho mình" / "Đặt cho người thân",
// mỗi thẻ có trạng thái đã có hồ sơ (chọn trong danh sách) và chưa có hồ sơ (lập ngay tại đây).

const isSelf = (p) => p.relationship === 'BAN_THAN';

function FieldErr({ children }) {
  if (!children) return null;
  return (
    <p className="a-error" role="alert">
      <Icon name="alert" size={22} />
      {children}
    </p>
  );
}

/** Ô chỉ đọc, lấy từ tài khoản. */
function ReadOnly({ label, value, grow }) {
  return (
    <div className="a-field" style={{ flex: grow ? '999 1 260px' : '1 1 200px' }}>
      <span className="a-label">{label}</span>
      <span className="b-ro">
        {value || '—'}
        <Icon name="lock" size={20} strokeWidth={1.75} />
      </span>
    </div>
  );
}

function SectionTitle({ children, ...props }) {
  return (
    <h3 className="b-sec" {...props}>
      {children}
      <span aria-hidden="true" />
    </h3>
  );
}

function Nav({ onBack, onNext, nextLabel = 'Tiếp tục', pending, disabled }) {
  return (
    <div className="b-nav">
      <button type="button" className="a-btn-ghost" onClick={onBack}>
        Quay lại
      </button>
      <button type="button" className="a-btn-primary" onClick={onNext} disabled={pending || disabled} aria-busy={pending || undefined}>
        {pending && <span className="spinner" aria-hidden="true" />}
        {nextLabel}
        {!pending && <Icon name="arrowRight" strokeWidth={1.75} />}
      </button>
    </div>
  );
}

function MissingNote({ children }) {
  return (
    <div className="b-gold">
      <p>{children}</p>
      <p className="b-gold-help">
        Đã từng khám ở đây rồi? Gọi <a href={CLINIC.phoneHref}>{CLINIC.phone}</a> để phòng khám nối hồ sơ cũ vào tài khoản.
      </p>
    </div>
  );
}

/** Đặt cho mình mà chưa có hồ sơ chính chủ: lập hồ sơ từ thông tin tài khoản. */
function SelfCreate({ user, onBack, onCreated }) {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const birthYear = user.dob ? Number(String(user.dob).slice(0, 4)) : null;
  const missing = !user.gender || !user.dob;

  const create = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await api.post('/me/patients', {
        fullName: user.fullName,
        phone: user.phone,
        dob: String(user.dob).slice(0, 10),
        gender: user.gender,
        relationship: 'BAN_THAN',
        address: user.address || null,
        email: email.trim() || null,
      });
      onCreated(res.patient);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <MissingNote>
        Cô chú chưa có hồ sơ khám của chính mình ở phòng khám. Bấm <strong>Tạo hồ sơ và tiếp tục</strong>, phòng khám sẽ lập hồ sơ từ thông tin tài khoản.
      </MissingNote>
      <div className="b-green-note">
        <Icon name="infoSoft" size={26} strokeWidth={1.75} />
        <p>
          Những ô dưới đây lấy từ tài khoản của cô chú nên <strong>không sửa được ở đây</strong>. Muốn đổi, cô chú vào{' '}
          <Link to="/tai-khoan">Thông tin tài khoản</Link>.
        </p>
      </div>
      <div className="a-row" style={{ gap: 20 }}>
        <ReadOnly label="Họ và tên" value={user.fullName} grow />
        <ReadOnly label="Số điện thoại" value={user.phone} />
      </div>
      <div className="a-row" style={{ gap: 20 }}>
        <ReadOnly label="Năm sinh" value={birthYear} />
        <ReadOnly label="Giới tính" value={GENDERS[user.gender]} />
        <div className="a-field" style={{ flex: '999 1 260px' }}>
          <label htmlFor="nk-email" className="a-label">
            Email nhận phiếu khám
          </label>
          <input
            id="nk-email"
            className="a-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error?.fields?.email ? 'true' : 'false'}
          />
          <FieldError id="nk-email-loi">{error?.fields?.email}</FieldError>
        </div>
      </div>
      {missing && (
        <p className="k-locked">
          <Icon name="alert" size={22} strokeWidth={1.75} />
          <span>
            Tài khoản chưa có {[!user.dob && 'ngày sinh', !user.gender && 'giới tính'].filter(Boolean).join(' và ')}. Cô chú vào{' '}
            <Link to="/tai-khoan">Thông tin tài khoản</Link> điền thêm rồi quay lại đặt lịch.
          </span>
        </p>
      )}
      {error && !error.fields?.email && <ErrorAlert error={error} />}
      <Nav onBack={onBack} onNext={create} nextLabel="Tạo hồ sơ và tiếp tục" pending={pending} disabled={missing} />
    </>
  );
}

const EMPTY_RELATIVE = { fullName: '', phone: '', birthYear: '', gender: '', nationalId: '', email: '', relationship: '' };

/** Đặt cho người thân lần đầu: điền ngay hồ sơ người thân. */
function RelativeCreate({ user, max, onBack, onCreated }) {
  const [form, setForm] = useState(EMPTY_RELATIVE);
  const [moreOpen, setMoreOpen] = useState(true);
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const thisYear = Number(todayVN().slice(0, 4));
  const years = Array.from({ length: thisYear - 1919 }, (_, i) => thisYear - i);

  const validate = () => {
    const e = {};
    if (form.fullName.trim().length < 2) e.fullName = 'Vui lòng nhập họ và tên.';
    const p = phoneError(form.phone);
    if (p) e.phone = p;
    if (!form.birthYear) e.birthYear = 'Vui lòng chọn năm sinh.';
    if (!form.gender) e.gender = 'Vui lòng chọn giới tính.';
    if (!form.relationship) e.relationship = 'Vui lòng chọn quan hệ với người khám.';
    return e;
  };
  const server = error?.fields || {};
  const fe = { ...server, birthYear: server.birthYear || server.dob, ...(tried ? validate() : {}) };

  const create = async () => {
    setTried(true);
    setError(null);
    if (Object.keys(validate()).length) {
      setTimeout(() => document.querySelector('.b-panel [aria-invalid="true"], .b-panel .a-radios-invalid input')?.focus());
      return;
    }
    setPending(true);
    try {
      const res = await api.post('/me/patients', {
        fullName: form.fullName.trim(),
        phone: toPhone(form.phone),
        birthYear: Number(form.birthYear),
        gender: form.gender,
        relationship: form.relationship,
        nationalId: form.nationalId.trim() || null,
        email: form.email.trim() || null,
      });
      onCreated(res.patient);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  const inv = (k) => (fe[k] ? 'true' : 'false');

  return (
    <>
      <MissingNote>
        Cô chú chưa có hồ sơ người thân nào. Mỗi tài khoản được tạo tối đa <strong>{max} hồ sơ</strong> (cho chính mình và người thân trong gia đình). Điền thông tin
        người khám rồi bấm <strong>Tạo hồ sơ và tiếp tục</strong>.
      </MissingNote>

      <div className="b-group">
        <SectionTitle>Thông tin người khám</SectionTitle>
        <div className="a-row" style={{ gap: 20 }}>
          <div className="a-field" style={{ flex: '999 1 260px' }}>
            <label htmlFor="nk-ten" className="a-label">
              Họ và tên <span className="a-req">*</span>
            </label>
            <input id="nk-ten" className="a-input" type="text" value={form.fullName} onChange={set('fullName')} aria-invalid={inv('fullName')} />
            <FieldError id="nk-ten-loi">{fe.fullName}</FieldError>
          </div>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <PhoneField id="nk-sdt" label="Số điện thoại" required value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} error={fe.phone} />
          </div>
        </div>
        <div className="a-row" style={{ gap: 20 }}>
          <div className="a-field" style={{ flex: '1 1 200px' }}>
            <label htmlFor="nk-nam" className="a-label">
              Năm sinh <span className="a-req">*</span>
            </label>
            <Picker
              id="nk-nam"
              items={years.map((y) => ({ value: String(y), label: String(y) }))}
              searchable={false}
              value={String(form.birthYear)}
              onChange={(v) => setForm((f) => ({ ...f, birthYear: v }))}
              aria-invalid={inv('birthYear')}
            />
            <FieldError id="nk-nam-loi">{fe.birthYear}</FieldError>
          </div>
          <div role="radiogroup" aria-labelledby="nk-gt" className={`a-field ${fe.gender ? 'a-radios-invalid' : ''}`} style={{ flex: '999 1 240px' }}>
            <span id="nk-gt" className="a-label">
              Giới tính <span className="a-req">*</span>
            </span>
            <div className="a-row" style={{ gap: 12 }}>
              {[
                ['NAM', 'Nam'],
                ['NU', 'Nữ'],
              ].map(([v, label]) => (
                <label key={v} className="a-radio" style={{ flexBasis: 0 }}>
                  <input type="radio" name="nk-gioitinh" value={v} checked={form.gender === v} onChange={set('gender')} />
                  {label}
                </label>
              ))}
            </div>
            <FieldError id="nk-gt-loi">{fe.gender}</FieldError>
          </div>
        </div>
      </div>

      <div className="b-group">
        <h3 className="b-sec">
          <button type="button" className="b-sec-toggle" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
            Thông tin khác
            <Icon name="chevronDown" size={20} strokeWidth={2.25} />
          </button>
          <span aria-hidden="true" />
        </h3>
        {moreOpen && (
          <div className="a-row" style={{ gap: 20 }}>
            <div className="a-field" style={{ flex: '1 1 240px' }}>
              <label htmlFor="nk-cccd" className="a-label">
                Số căn cước công dân
              </label>
              <input
                id="nk-cccd"
                className="a-input"
                type="text"
                inputMode="numeric"
                maxLength={12}
                value={form.nationalId}
                onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                aria-invalid={inv('nationalId')}
              />
              <FieldError id="nk-cccd-loi">{fe.nationalId}</FieldError>
            </div>
            <div className="a-field" style={{ flex: '999 1 260px' }}>
              <label htmlFor="nk-email" className="a-label">
                Email nhận phiếu khám
              </label>
              <input id="nk-email" className="a-input" type="email" value={form.email} onChange={set('email')} aria-invalid={inv('email')} />
              <FieldError id="nk-email-loi">{fe.email}</FieldError>
            </div>
          </div>
        )}
      </div>

      <div className="b-group">
        <SectionTitle>Thông tin người đặt</SectionTitle>
        <p className="k-muted" style={{ lineHeight: '27px' }}>
          Là tài khoản cô chú đang đăng nhập — phòng khám gọi lại theo số này khi cần.
        </p>
        <div className="a-row" style={{ gap: 20 }}>
          <ReadOnly label="Họ và tên" value={user.fullName} grow />
          <ReadOnly label="Số điện thoại" value={user.phone} />
        </div>
        <div className="a-field">
          <label htmlFor="nk-quanhe" className="a-label">
            Quan hệ với người khám <span className="a-req">*</span>
          </label>
          <Picker
            id="nk-quanhe"
            items={Object.entries(RELATIONSHIPS)
              .filter(([v]) => v !== 'BAN_THAN')
              .map(([value, label]) => ({ value, label }))}
            value={form.relationship}
            onChange={(v) => setForm((f) => ({ ...f, relationship: v }))}
            aria-invalid={inv('relationship')}
          />
          <FieldError id="nk-quanhe-loi">{fe.relationship}</FieldError>
        </div>
      </div>

      {error && !Object.keys(server).length && <ErrorAlert error={error} />}
      <Nav onBack={onBack} onNext={create} nextLabel="Tạo hồ sơ và tiếp tục" pending={pending} />
    </>
  );
}

/** Danh sách hồ sơ chọn bằng nút tròn, mỗi hồ sơ có menu Xem chi tiết / Sửa / Xoá. */
function ProfileList({ items, patientId, onPick, onAction }) {
  const [menuFor, setMenuFor] = useState(null);

  // Bấm ra ngoài hoặc Esc thì đóng menu tuỳ chọn
  useEffect(() => {
    if (!menuFor) return undefined;
    const close = (e) => !e.target.closest('.b-pick-wrap') && setMenuFor(null);
    const esc = (e) => e.key === 'Escape' && setMenuFor(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menuFor]);

  const act = (type, p) => {
    setMenuFor(null);
    onAction(type, p);
  };

  return (
    <div className="b-list" role="radiogroup" aria-label="Chọn người đi khám">
      {items.map((p) => (
        <div key={p.id} className="b-pick-wrap">
          <button type="button" role="radio" className="b-pick" aria-checked={patientId === p.id} aria-disabled={p.isLocked} onClick={() => !p.isLocked && onPick(p.id)}>
            <span className="b-radio">{patientId === p.id && <Icon name="check" size={20} strokeWidth={3} />}</span>
            <span className="b-pick-body">
              <span className="k-pcard-title">
                <span className="k-pname">{p.fullName}</span>
                <ProfileChip p={p} />
                {p.isLocked && (
                  <span className="k-chip k-chip-lock">
                    <Icon name="lock" size={16} />
                    Hồ sơ đang khoá, không đặt lịch được
                  </span>
                )}
              </span>
              <ProfileLines p={p} />
            </span>
          </button>
          <button
            type="button"
            className="b-kebab"
            aria-haspopup="menu"
            aria-expanded={menuFor === p.id}
            aria-label={`Tuỳ chọn hồ sơ ${p.fullName}`}
            onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}
          >
            <Icon name="moreV" size={22} strokeWidth={3} />
          </button>
          {menuFor === p.id && (
            <div className="b-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => act('detail', p)}>
                <Icon name="eye" strokeWidth={1.75} />
                Xem chi tiết
              </button>
              {!p.isLocked && (
                <button type="button" role="menuitem" onClick={() => act('form', p)}>
                  <Icon name="edit" strokeWidth={1.75} />
                  Sửa
                </button>
              )}
              {!isSelf(p) && (
                <button type="button" role="menuitem" className="b-menu-del" onClick={() => act('delete', p)}>
                  <Icon name="trash" strokeWidth={1.75} />
                  Xoá
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * who: 'self' | 'relative'. onCreated(patient) sau khi lập hồ sơ ngay tại bước này (đi tiếp sang xác nhận).
 * onAction(type, profile) mở hộp thoại xem / sửa / xoá / thêm ở trang đặt lịch.
 */
export function PatientStep({ loading, profiles, max, user, who, setWho, patientId, setPatientId, error, onBack, onNext, onCreated, onAction }) {
  const self = profiles.find(isSelf);
  const relatives = profiles.filter((p) => !isSelf(p));
  const patient = profiles.find((p) => p.id === patientId);

  const switchTo = (next) => {
    setWho(next);
    const pool = next === 'self' ? (self ? [self] : []) : relatives;
    if (!pool.some((p) => p.id === patientId)) setPatientId(pool.find((p) => !p.isLocked)?.id || '');
  };

  return (
    <div className="b-body b-body-tight" style={{ gap: 24 }}>
      <div className="b-tabs" role="tablist" aria-label="Đặt cho ai">
        <button type="button" role="tab" aria-selected={who === 'self'} onClick={() => switchTo('self')}>
          Đặt cho mình
        </button>
        <button type="button" role="tab" aria-selected={who === 'relative'} onClick={() => switchTo('relative')}>
          Đặt cho người thân
        </button>
      </div>

      {loading && <Loading />}

      {!loading && who === 'self' && !self && <SelfCreate user={user} onBack={onBack} onCreated={onCreated} />}
      {!loading && who === 'relative' && relatives.length === 0 && <RelativeCreate user={user} max={max} onBack={onBack} onCreated={onCreated} />}

      {!loading && ((who === 'self' && self) || (who === 'relative' && relatives.length > 0)) && (
        <>
          <div className="b-list-head">
            {who === 'self' ? (
              <div>
                <h2>Hồ sơ của cô chú</h2>
                <p>
                  Cô chú bấm Tiếp tục để đặt khám cho chính mình. Muốn đặt cho người thân, cô chú chọn thẻ <strong>Đặt cho người thân</strong> ở trên.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <h2>Hồ sơ người thân</h2>
                  <p>
                    Cô chú bấm chọn người thân đi khám. Đang có <strong>{relatives.length} hồ sơ người thân</strong> (mỗi tài khoản tối đa {max} hồ sơ).
                  </p>
                </div>
                {profiles.length < max && (
                  <button type="button" className="a-btn-primary" onClick={() => onAction('form', null)}>
                    <Icon name="userPlus" strokeWidth={1.75} />
                    Thêm hồ sơ người thân
                  </button>
                )}
              </>
            )}
          </div>

          <ProfileList items={who === 'self' ? [self] : relatives} patientId={patientId} onPick={setPatientId} onAction={onAction} />

          <p className="b-chosen" role="status">
            <Icon name="checkCircle" />
            <span>
              {patient ? (
                <>
                  Người đi khám: <strong>{patient.fullName}</strong>
                </>
              ) : (
                'Cô chú chưa chọn người đi khám.'
              )}
            </span>
          </p>
          <FieldErr>{error}</FieldErr>
          <Nav onBack={onBack} onNext={onNext} />
        </>
      )}
    </div>
  );
}
