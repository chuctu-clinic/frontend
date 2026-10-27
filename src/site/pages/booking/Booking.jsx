import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert, Loading } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { CLINIC, GENDERS, RELATIONSHIPS, addDays, fmtDate, shortTime, weekday } from '../../../shared/lib/format.js';
import { useSession } from '../../../shared/lib/session.jsx';
import { useAsync, useDocumentTitle } from '../../../shared/lib/hooks.js';
import { Dialog } from '../../components/Dialog.jsx';
import { Picker } from '../../components/Picker.jsx';
import { ProfileDeleteDialog, ProfileDetailDialog, ProfileFormDialog } from '../account/ProfileDialogs.jsx';
import { PatientStep } from './PatientStep.jsx';
import '../account/account.css';
import './booking.css';

// Theo các màn "Đặt lịch 1–3" của prototype (DatLich-GuiYeuCau, DatLich-NguoiKham-Minh/ThanNhan-ChuaCo/DaCo, DatLich-XacNhan).
// Bước 4 (phiếu khám) là trang /phieu-kham/:id?moi=1.

const STEPS = ['Thông tin khám', 'Người đi khám', 'Xác nhận', 'Phiếu khám'];
const CLINIC_NAME = `Phòng khám ${CLINIC.short}`;

/** Khung phiếu đặt lịch: thanh tiêu đề xanh có nút quay lại và các bước. */
export function BookingFrame({ step, title, onBack, backTo, backLabel = 'Quay lại', children, className = '' }) {
  const back = backTo ? (
    <Link to={backTo} className="b-back" aria-label={backLabel}>
      <Icon name="arrowLeft" strokeWidth={1.75} />
    </Link>
  ) : (
    <button type="button" className="b-back" aria-label={backLabel} onClick={onBack}>
      <Icon name="arrowLeft" strokeWidth={1.75} />
    </button>
  );
  return (
    <div className={`b-panel ${className}`}>
      <div className="b-head">
        <div className="b-head-row">
          {back}
          <h1>{title}</h1>
          <span className="b-spacer" />
        </div>
        {step > 0 && <ol className="b-steps" aria-label="Các bước đặt lịch">
          {STEPS.map((label, i) => (
            <li key={label} className={i + 1 <= step ? 'reached' : ''} aria-current={i + 1 === step ? 'step' : undefined}>
              <span className="b-dot">{i + 1}</span>
              <span>
                <span className="sr-only">Bước {i + 1}: </span>
                {label}
                {i + 1 < step && <span className="sr-only"> (đã xong)</span>}
              </span>
            </li>
          ))}
        </ol>}
      </div>
      {children}
    </div>
  );
}

export function BookingCrumbs({ current }) {
  return (
    <div className="k-crumbs">
      <nav aria-label="Đường dẫn">
        <Link to="/">Trang chủ</Link>
        <span aria-hidden="true">›</span>
        {current === 'Đặt lịch khám' ? (
          <>
            <Link to="/dich-vu">Dịch vụ khám</Link>
            <span aria-hidden="true">›</span>
          </>
        ) : (
          <>
            <Link to="/dat-lich">Đặt lịch khám</Link>
            <span aria-hidden="true">›</span>
          </>
        )}
        <span aria-current="page">{current}</span>
      </nav>
    </div>
  );
}

function HelpBox() {
  return (
    <div className="b-box b-box-plain">
      <h2>Thấy khó điền?</h2>
      <p>Cô chú cứ gọi điện, nhân viên phòng khám sẽ hỏi và ghi giúp từ đầu đến cuối.</p>
      <a href={CLINIC.phoneHref} className="a-btn-ghost b-call">
        <Icon name="phone" strokeWidth={1.75} />
        Gọi {CLINIC.phone}
      </a>
    </div>
  );
}

const FreeLine = () => (
  <p className="b-free">
    <Icon name="checkSoft" size={22} strokeWidth={2} />
    Khám, trị liệu và thuốc đều miễn phí — 0 đồng.
  </p>
);

function ClinicBox() {
  return (
    <div className="b-box">
      <h2>Thông tin phòng khám</h2>
      <div className="b-box-body">
        <div className="b-brand">
          <img src="/logo-192.png" alt="" />
          Phòng chẩn trị YHCT từ thiện {CLINIC.short}
        </div>
        <div className="b-info">
          <Icon name="pin" size={22} strokeWidth={1.75} />
          {CLINIC.address}
        </div>
        <div className="b-info">
          <Icon name="clockSoft" size={22} strokeWidth={1.75} />
          <span>
            {CLINIC.hours} tất cả các ngày,
            <br />
            kể cả Chủ Nhật
          </span>
        </div>
        <div className="b-info">
          <Icon name="phone" size={22} strokeWidth={1.75} />
          <a href={CLINIC.phoneHref}>{CLINIC.phone}</a>
        </div>
        <FreeLine />
      </div>
    </div>
  );
}

const dayLabel = (d) => `${fmtDate(d)} · ${weekday(d)}`;

/** Tóm tắt buổi khám đã chọn, hiện ở cột trái từ bước 2. */
function SummaryBox({ service, slotDate, slotStart }) {
  return (
    <div className="b-box">
      <h2>Thông tin đặt khám</h2>
      <div className="b-box-body">
        <div className="b-info">
          <Icon name="needleSoft" size={22} strokeWidth={1.75} />
          <div>
            <small>Khám về việc gì</small>
            <strong>{service?.label}</strong>
          </div>
        </div>
        <div className="b-info">
          <Icon name="calendar" size={22} strokeWidth={1.75} />
          <div>
            <small>Ngày và giờ khám dự kiến</small>
            <strong>
              {dayLabel(slotDate)}
              <br />
              {shortTime(slotStart)}
            </strong>
          </div>
        </div>
        <div className="b-info">
          <Icon name="pin" size={22} strokeWidth={1.75} />
          <div>
            <small>Nơi khám</small>
            <strong>
              {CLINIC_NAME}
              <br />
              {CLINIC.address}
            </strong>
          </div>
        </div>
        <FreeLine />
      </div>
    </div>
  );
}

const MONTHS_CAP = (y, m) => `Tháng ${m} - ${y}`;
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Lịch tháng chọn ngày khám trong khoảng hôm nay tới maxDays ngày tới. */
function CalendarDialog({ today, maxDays, value, onPick, onClose }) {
  const last = addDays(today, maxDays);
  const [ty, tm] = today.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);
  const start = value || today;
  const [month, setMonth] = useState(() => {
    const [y, m] = start.split('-').map(Number);
    return { y, m };
  });
  const atFirst = month.y === ty && month.m === tm;
  const atLast = month.y === ly && month.m === lm;
  const shift = (n) => setMonth(({ y, m }) => (m + n > 12 ? { y: y + 1, m: 1 } : m + n < 1 ? { y: y - 1, m: 12 } : { y, m: m + n }));

  const firstDow = new Date(Date.UTC(month.y, month.m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(month.y, month.m, 0)).getUTCDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => `${month.y}-${String(month.m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)];

  return (
    <Dialog
      title="Chọn ngày khám"
      width={620}
      onClose={onClose}
      actions={
        <button type="button" className="a-btn-ghost" onClick={onClose} style={{ minHeight: 56, fontSize: 19 }}>
          Đóng
        </button>
      }
    >
      <p className="b-cal-info">
        <Icon name="infoSoft" strokeWidth={1.75} />
        <span>
          <strong>{CLINIC_NAME}</strong> nhận đặt lịch từ hôm nay tới {maxDays} ngày tới (đến hết ngày {fmtDate(last)}).
        </span>
      </p>
      <div className="b-cal">
        <div className="b-cal-head">
          <button type="button" className="b-cal-nav" aria-label="Tháng trước" disabled={atFirst} onClick={() => shift(-1)}>
            <Icon name="chevronLeft" size={22} />
          </button>
          <span aria-live="polite">{MONTHS_CAP(month.y, month.m)}</span>
          <button type="button" className="b-cal-nav" aria-label="Tháng sau" disabled={atLast} onClick={() => shift(1)}>
            <Icon name="chevronRight" size={22} />
          </button>
        </div>
        <div className="b-cal-grid">
          {WEEKDAY_SHORT.map((w) => (
            <span key={w} className="b-cal-wd" aria-hidden="true">
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`x${i}`} className="b-cal-cell out" aria-hidden="true" />;
            const ok = d >= today && d <= last;
            return (
              <button
                key={d}
                type="button"
                className={`b-cal-cell ${d === today ? 'today' : ''}`}
                disabled={!ok}
                aria-pressed={d === value}
                aria-label={`${dayLabel(d)}${ok ? '' : ' — không nhận lịch'}`}
                onClick={() => onPick(d)}
              >
                {Number(d.slice(8))}
              </button>
            );
          })}
        </div>
      </div>
      <div className="b-legend" aria-hidden="true">
        <span>
          <i style={{ background: 'var(--surface-card)', border: '2px solid var(--green-700)' }} />
          Ngày hiện tại
        </span>
        <span>
          <i style={{ background: 'var(--green-100)' }} />
          Ngày có lịch
        </span>
        <span>
          <i style={{ background: 'var(--surface-200)' }} />
          Ngày không có lịch
        </span>
        <span>
          <i style={{ background: 'var(--green-600)' }} />
          Ngày đã chọn
        </span>
      </div>
    </Dialog>
  );
}

function SlotGroup({ label, slots, value, onPick }) {
  if (!slots.length) return null;
  return (
    <div className="b-section">
      <span className="b-sub">{label}</span>
      <div className="b-slots" role="radiogroup" aria-label={`Khung giờ ${label.toLowerCase()}`}>
        {slots.map((s) => (
          <button
            key={s.start}
            type="button"
            className="b-slot"
            aria-pressed={value === s.start}
            aria-disabled={!s.available}
            onClick={() => s.available && onPick(s.start)}
          >
            {shortTime(s.start)}
            {!s.available && <small>{s.reason || 'Không chọn được'}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

function FieldErr({ children }) {
  if (!children) return null;
  return (
    <p className="a-error" role="alert">
      <Icon name="alert" size={22} />
      {children}
    </p>
  );
}

/** Đặt lịch khám theo từng bước, cấp phiếu khám ngay (UC.6.1 – UC.6.3, UC.6.7). */
export default function Booking() {
  useDocumentTitle('Đặt lịch khám');
  const { meta, user } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rebookFromId = params.get('dat-lai');

  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState('CHUA_RO');
  const [slotDate, setSlotDate] = useState('');
  const [slotStart, setSlotStart] = useState('');
  const [patientId, setPatientId] = useState('');
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [calOpen, setCalOpen] = useState(false);
  const [who, setWho] = useState('self');
  const [dialog, setDialog] = useState(null);
  const [agree, setAgree] = useState(false);
  const [slotFull, setSlotFull] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [pending, setPending] = useState(false);
  const topRef = useRef(null);

  const profiles = useAsync(() => api.get('/me/patients'), []);
  const availability = useAsync(() => (slotDate ? api.get(`/me/availability?date=${slotDate}`) : Promise.resolve(null)), [slotDate]);

  // Mặc định chọn hôm nay
  useEffect(() => {
    if (meta?.today && !slotDate) setSlotDate(meta.today);
  }, [meta, slotDate]);

  // Đặt lại từ phiếu đã huỷ: điền sẵn nội dung khám và người đi khám
  useEffect(() => {
    if (!rebookFromId) return;
    api
      .get(`/me/appointments/${rebookFromId}`)
      .then(({ appointment }) => {
        setServiceType(appointment.serviceType);
        setPatientId(appointment.patient?.id || '');
        setWho(appointment.patient?.relationship === 'BAN_THAN' ? 'self' : 'relative');
        setNotice(`Đặt lại cho ${appointment.patient?.fullName}. Cô chú chọn ngày và giờ khám mới.`);
      })
      .catch(() => {});
  }, [rebookFromId]);

  // Đổi ngày thì khung giờ đã chọn có thể không còn hợp lệ
  useEffect(() => {
    if (!availability.data || !slotStart) return;
    const s = availability.data.slots.find((x) => x.start === slotStart);
    if (!s?.available) setSlotStart('');
  }, [availability.data, slotStart]);

  // Thẻ "Đặt cho mình" chọn sẵn hồ sơ chính chủ
  const profileList = profiles.data?.items || [];
  useEffect(() => {
    if (patientId || who !== 'self' || !profileList.length) return;
    const self = profileList.find((p) => p.relationship === 'BAN_THAN' && !p.isLocked);
    if (self) setPatientId(self.id);
  }, [profileList, patientId, who]);

  if (!meta || !user) return <Loading />;

  const today = meta.today;
  const quickDays = [0, 1, 2].map((n) => addDays(today, n));
  const otherDay = slotDate && !quickDays.includes(slotDate) ? slotDate : null;
  const patient = profileList.find((p) => p.id === patientId);
  const service = meta.serviceTypes.find((s) => s.value === serviceType);
  const slots = availability.data?.slots || [];
  const max = profiles.data?.max || meta.maxProfiles || 10;

  const go = (n) => {
    setStep(n);
    setErrors({});
    topRef.current?.scrollIntoView({ block: 'start' });
  };

  const goStep2 = () => {
    const e = {};
    if (!serviceType) e.serviceType = 'Cô chú vui lòng chọn nội dung khám.';
    if (!slotDate) e.slotDate = 'Cô chú vui lòng chọn ngày khám.';
    if (!slotStart) e.slotStart = 'Cô chú vui lòng chọn giờ khám.';
    setErrors(e);
    if (!Object.keys(e).length) {
      setNotice(null);
      go(2);
    }
  };

  const goStep3 = () => {
    if (!patient || patient.isLocked) {
      setErrors({ patientId: 'Cô chú vui lòng chọn người đi khám.' });
      return;
    }
    setAgree(false);
    setSlotFull(null);
    setSubmitError(null);
    go(3);
  };

  const submit = async () => {
    if (!agree) {
      setErrors({ agree: 'Cô chú đánh dấu ô xác nhận ở trên rồi bấm Đặt lịch khám.' });
      return;
    }
    setPending(true);
    setErrors({});
    setSubmitError(null);
    try {
      const res = await api.post('/me/appointments', { patientId, serviceType, slotDate, slotStart, rebookFromId });
      navigate(`/phieu-kham/${res.appointment.id}?moi=1`, { replace: true });
    } catch (err) {
      // Khung giờ vừa đủ chỗ: báo và cho chọn lại (BR.15)
      if (err.code === 'SLOT_FULL' || err.code === 'SLOT_UNAVAILABLE') {
        setSlotFull({ slotDate, slotStart });
        availability.reload();
      } else {
        setSubmitError(err);
      }
    } finally {
      setPending(false);
    }
  };

  const reloadProfiles = () => profiles.reload({ silent: true });
  const closeDialog = () => setDialog(null);
  const dialogProfile = dialog?.profile;

  // ---------- Bước 1 ----------
  const step1 = (
    <BookingFrame step={1} title="Chọn thông tin khám" backTo="/" backLabel="Về trang chủ">
      <div className="b-body">
        {notice && (
          <div className="k-success" role="status">
            <Icon name="refresh" size={26} />
            {notice}
          </div>
        )}
        <div className="a-field" style={{ gap: 10 }}>
          <label htmlFor="dl-noidung" className="a-label">
            Khám về việc gì? <span className="a-req">*</span>
          </label>
          <Picker id="dl-noidung" className="b-service" items={meta.serviceTypes} value={serviceType} onChange={setServiceType} />
          <FieldErr>{errors.serviceType}</FieldErr>
        </div>

        <div className="b-section">
          <span className="a-label" id="dl-ngay">
            Ngày khám <span className="a-req">*</span>
          </span>
          <div className="b-days" role="group" aria-labelledby="dl-ngay">
            {quickDays.map((d, i) => (
              <button key={d} type="button" className="b-day" aria-pressed={slotDate === d} onClick={() => setSlotDate(d)}>
                <span className="b-day-top">{fmtDate(d).slice(0, 5)}</span>
                <span className="b-day-bot">{i === 0 ? `Hôm nay · ${weekday(d)}` : weekday(d)}</span>
              </button>
            ))}
            <button type="button" className="b-day b-day-other" aria-pressed={Boolean(otherDay)} aria-haspopup="dialog" onClick={() => setCalOpen(true)}>
              {otherDay ? <span className="b-day-top">{fmtDate(otherDay).slice(0, 5)}</span> : <Icon name="calendar" strokeWidth={1.75} />}
              <span className="b-day-bot">Ngày khác</span>
            </button>
          </div>
          <p className="b-picked" aria-live="polite">
            Đang chọn: <strong>{slotDate ? dayLabel(slotDate) : 'chưa chọn ngày'}</strong>
          </p>
          <FieldErr>{errors.slotDate}</FieldErr>
        </div>

        <div className="b-section" style={{ gap: 16 }}>
          <span className="a-label">
            Giờ khám dự kiến <span className="a-req">*</span>
          </span>
          {availability.loading && <Loading label="Đang xem các khung giờ còn chỗ…" />}
          {!availability.loading && (
            <>
              <SlotGroup label="Buổi sáng" slots={slots.filter((s) => s.start < '12:00')} value={slotStart} onPick={setSlotStart} />
              <SlotGroup label="Buổi chiều" slots={slots.filter((s) => s.start >= '12:00')} value={slotStart} onPick={setSlotStart} />
            </>
          )}
          <FieldErr>{errors.slotStart}</FieldErr>
          <p className="b-warn">
            Phòng khám nhận bệnh {CLINIC.hours}, giờ Việt Nam (GMT+7). Cô chú chọn giờ dự kiến mình sẽ đến. Khung màu xám là khung đã đủ chỗ hoặc đã bắt đầu, cô chú
            vui lòng chọn khung khác.
          </p>
        </div>

        <div className="k-note">
          <Icon name="infoSoft" size={26} strokeWidth={1.75} />
          <p>
            Đặt lịch xong là cô chú <strong>có ngay phiếu khám</strong> kèm mã phiếu khám và giờ khám dự kiến. Ngày khám cô chú chỉ cần đưa phiếu khám cho tiếp tân.
          </p>
        </div>

        <div className="b-section">
          <button type="button" className="a-btn-primary b-next" onClick={goStep2}>
            Tiếp tục
            <Icon name="arrowRight" strokeWidth={1.75} />
          </button>
          <Link to="/phieu-kham" className="b-link">
            Xem phiếu khám bệnh
          </Link>
        </div>
      </div>
    </BookingFrame>
  );

  // ---------- Bước 2 ----------
  const step2 = (
    <BookingFrame step={2} title={who === 'self' ? 'Đặt khám cho mình' : 'Đặt khám cho người thân'} onBack={() => go(1)}>
      <PatientStep
        loading={profiles.loading}
        profiles={profileList}
        max={max}
        user={user}
        who={who}
        setWho={setWho}
        patientId={patientId}
        setPatientId={(id) => {
          setPatientId(id);
          setErrors({});
        }}
        error={errors.patientId}
        onBack={() => go(1)}
        onNext={goStep3}
        onCreated={async (created) => {
          setPatientId(created.id);
          await profiles.reload({ silent: true });
          setAgree(false);
          setSlotFull(null);
          setSubmitError(null);
          go(3);
        }}
        onAction={(type, profile) => setDialog({ type, profile })}
      />
    </BookingFrame>
  );

  // ---------- Bước 3 ----------
  const review = (icon, title, rows) => (
    <div className="b-review">
      <div className="b-review-head">
        <span className="b-icon-dot">
          <Icon name={icon} size={22} strokeWidth={1.75} />
        </span>
        <h2>{title}</h2>
      </div>
      <dl className="a-dl">
        {rows.map(([dt, dd]) => (
          <div key={dt}>
            <dt>{dt}</dt>
            <dd>{dd}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
  const step3 = patient && (
    <BookingFrame step={3} title="Xác nhận thông tin" onBack={() => go(2)}>
      <div className="b-body b-body-tight">
        <p className="k-lead">
          Cô chú xem lại một lượt cho chắc. Chỗ nào chưa đúng thì bấm <strong style={{ color: 'var(--green-700)' }}>Quay lại</strong> ở cuối trang để sửa.
        </p>
        {review('calendar', 'Buổi khám', [
          ['Khám về việc gì', service?.label],
          ['Ngày khám', dayLabel(slotDate)],
          ['Giờ khám dự kiến', shortTime(slotStart)],
          ['Nơi khám', `${CLINIC_NAME} — ${CLINIC.address}`],
        ])}
        {review('user', 'Người đi khám', [
          ['Họ và tên', patient.fullName],
          ['Số điện thoại', patient.phone || `Dùng số của người đặt (${user.phone})`],
          ['Năm sinh · Giới tính', [patient.birthYear, GENDERS[patient.gender]].filter(Boolean).join(' · ') || '—'],
          [
            'Hồ sơ',
            patient.relationship === 'BAN_THAN'
              ? `Đặt cho mình — hồ sơ ${patient.patientCode}`
              : `Đặt cho người thân (${RELATIONSHIPS[patient.relationship] || 'Khác'}) — hồ sơ ${patient.patientCode}`,
          ],
        ])}
        {review('phone', 'Người đặt — phòng khám gọi lại theo số này', [
          ['Họ và tên', user.fullName],
          ['Số điện thoại', user.phone],
        ])}

        <div className="k-note">
          <Icon name="infoSoft" size={26} strokeWidth={1.75} />
          <p>
            Đặt xong, cô chú <strong>có ngay phiếu khám</strong> kèm mã phiếu khám và giờ khám dự kiến. Cô chú muốn đổi ý thì huỷ phiếu khám ngay trong mục Phiếu khám
            bệnh.
          </p>
        </div>

        <div className="a-field">
          <label className={`a-check a-check-box ${errors.agree ? 'a-check-invalid' : ''}`}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => {
                setAgree(e.target.checked);
                setErrors({});
              }}
            />
            <span>Tôi xác nhận những thông tin trên là đúng, và đồng ý để phòng khám dùng thông tin này cho việc khám chữa bệnh.</span>
          </label>
          <FieldErr>{errors.agree}</FieldErr>
        </div>

        {slotFull && (
          <div className="b-full" role="alert">
            <Icon name="alert" size={30} strokeWidth={1.75} />
            <p>
              <strong>
                Khung {shortTime(slotFull.slotStart)} ngày {fmtDate(slotFull.slotDate)} vừa đủ người đặt.
              </strong>{' '}
              Phòng khám chưa đặt lịch cho cô chú được. Cô chú vui lòng chọn lại ngày hoặc khung giờ khác.
            </p>
            <button
              type="button"
              className="a-btn-primary"
              onClick={() => {
                setSlotStart('');
                go(1);
              }}
            >
              Chọn lại ngày và giờ
            </button>
          </div>
        )}
        <ErrorAlert error={submitError} />

        <div className="b-nav">
          <button type="button" className="a-btn-ghost" onClick={() => go(2)}>
            Quay lại
          </button>
          <button type="button" className="a-btn-primary" onClick={submit} disabled={pending} aria-busy={pending || undefined}>
            {pending && <span className="spinner" aria-hidden="true" />}
            Đặt lịch khám
            {!pending && <Icon name="arrowRight" strokeWidth={1.75} />}
          </button>
        </div>
      </div>
    </BookingFrame>
  );

  return (
    <div className="k-page a-vars" ref={topRef} style={{ scrollMarginTop: 80 }}>
      <BookingCrumbs current={step === 1 ? 'Đặt lịch khám' : step === 2 ? (who === 'self' ? 'Đặt cho mình' : 'Đặt cho người thân') : 'Xác nhận'} />
      <section className="k-main k-main-tight">
        <div className="b-layout">
          <aside className="b-aside">
            {step === 1 ? <ClinicBox /> : <SummaryBox service={service} slotDate={slotDate} slotStart={slotStart} />}
            <HelpBox />
          </aside>
          {step === 1 && step1}
          {step === 2 && step2}
          {step === 3 && step3}
        </div>
      </section>

      {calOpen && (
        <CalendarDialog
          today={today}
          maxDays={meta.userMaxDays}
          value={slotDate}
          onClose={() => setCalOpen(false)}
          onPick={(d) => {
            setSlotDate(d);
            setCalOpen(false);
          }}
        />
      )}
      {dialog?.type === 'form' && (
        <ProfileFormDialog
          profile={dialogProfile}
          onClose={closeDialog}
          onSaved={(saved) => {
            closeDialog();
            if (!saved.isLocked) setPatientId(saved.id);
            reloadProfiles();
          }}
        />
      )}
      {dialog?.type === 'detail' && (
        <ProfileDetailDialog
          profile={dialogProfile}
          onClose={closeDialog}
          onEdit={() => setDialog({ type: 'form', profile: dialogProfile })}
          onDelete={() => setDialog({ type: 'delete', profile: dialogProfile })}
        />
      )}
      {dialog?.type === 'delete' && (
        <ProfileDeleteDialog
          profile={dialogProfile}
          onClose={closeDialog}
          onDeleted={() => {
            if (patientId === dialogProfile.id) setPatientId('');
            closeDialog();
            reloadProfiles();
          }}
        />
      )}
    </div>
  );
}
