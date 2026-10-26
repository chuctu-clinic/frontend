import { useEffect, useState } from 'react';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { ErrorAlert } from '@chuctu/shared/components/ui.jsx';
import { api, qs } from '@chuctu/shared/lib/api.js';
import { addDays, fmtDate, fmtTime, shortTime, todayVN, weekday } from '@chuctu/shared/lib/format.js';
import { useSession } from '@chuctu/shared/lib/session.jsx';
import { useAsync } from '@chuctu/shared/lib/useAsync.js';
import { FieldError, PhoneField, Summary, TDialog, normalizePhone, phoneError } from '../../components/t-ui.jsx';

// Hộp thoại của Lịch trong ngày (UC.7.3 – UC.7.7), theo prototype "TiepTan-LichTrongNgay".

const CANCEL_REASONS = ['Bệnh nhân xin huỷ', 'Bệnh nhân không đến được', 'Đặt nhầm lịch', 'Lý do khác'];

/** Phút trong ngày theo giờ Việt Nam. */
export function nowMinutesVN() {
  const vn = new Date(Date.now() + 7 * 3600_000);
  return vn.getUTCHours() * 60 + vn.getUTCMinutes();
}
const minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const ddmm = (iso) => fmtDate(iso).slice(0, 5);

/** "Thứ Năm, 15/10/2026" */
export const longDay = (iso) => `${weekday(iso)}, ${fmtDate(iso)}`;

/** Mô tả hồ sơ một dòng: mã · năm sinh · số điện thoại */
export const patientLine = (p) => [p.patientCode, p.birthYear, p.phone].filter(Boolean).join(' · ');

/** Nhóm hàng đợi dự kiến khi check-in bây giờ (giống quy tắc ở server, BR.28). */
function queueHint(appt, early) {
  const today = todayVN();
  const walkIn = appt.source === 'COUNTER' && appt.createdAt && fmtDate(appt.createdAt) === fmtDate(today);
  if (walkIn) return 'Khách đến trực tiếp, xếp vào nhóm thường.';
  const start = minutesOf(appt.slotStart);
  const now = nowMinutesVN();
  if (now >= start + 60) return 'Đến sau khung đã đặt, xếp vào nhóm thường.';
  if (now < start - early) return `Đến sớm hơn ${early} phút trước khung ${shortTime(appt.slotStart)}, xếp vào nhóm thường.`;
  return 'Phiếu đặt trước, xếp vào nhóm ưu tiên.';
}

function apptSummary(a) {
  return [
    ['Bệnh nhân', a.patient?.fullName, [a.patient?.patientCode, a.patient?.phone].filter(Boolean).join(' · ')],
    ['Mã phiếu khám', a.ticketCode],
    ['Giờ khám dự kiến', shortTime(a.slotStart), longDay(a.slotDate), false],
    ['Khám về việc', a.serviceLabel, null, false],
  ];
}

/** Xác nhận check-in. */
export function CheckinDialog({ appt, onClose, onDone }) {
  const { meta } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const hint = queueHint(appt, meta?.priorityEarlyMinutes ?? 0);
  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await api.post(`/staff/appointments/${appt.id}/checkin`);
      onDone(
        <>
          Đã check-in <span className="t-notice-name">{appt.patient?.fullName}</span> lúc {fmtTime(new Date()).replace(/^0/, '')} và ghi nhận thời điểm tiếp nhận. {hint}
        </>,
      );
    } catch (err) {
      setError(err);
      setPending(false);
    }
  };
  return (
    <TDialog title="Xác nhận check-in" onClose={onClose}>
      <div className="t-dialog-body">
        <Summary items={apptSummary(appt)} />
        <p className="t-text">
          Xác nhận bệnh nhân <strong className="t-strong">đã có mặt</strong> tại phòng khám. Hệ thống sẽ ghi nhận thời điểm tiếp nhận là{' '}
          <strong className="t-strong">{fmtTime(new Date()).replace(/^0/, '')}</strong>.
        </p>
        <div className="t-tint-gold" style={{ padding: '14px 20px', fontWeight: 600 }}>
          {hint}
        </div>
        <ErrorAlert error={error} />
        <div className="t-actions">
          <button type="button" className="t-btn t-btn-primary t-btn-bold t-btn-grow" disabled={pending} onClick={submit}>
            <Icon name="check" strokeWidth={2.25} />
            Xác nhận check-in
          </button>
          <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 28px' }} onClick={onClose}>
            Quay lại
          </button>
        </div>
      </div>
    </TDialog>
  );
}

/** Hoàn tác check-in khi check-in nhầm (BR.27). */
export function UndoCheckinDialog({ appt, onClose, onDone }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await api.post(`/staff/appointments/${appt.id}/undo-checkin`);
      onDone(
        <>
          Đã hoàn tác check-in của <span className="t-notice-name">{appt.patient?.fullName}</span>. Phiếu khám trở về trạng thái Chưa đến.
        </>,
      );
    } catch (err) {
      setError(err);
      setPending(false);
    }
  };
  return (
    <TDialog title="Hoàn tác check-in" tone="gold" onClose={onClose}>
      <div className="t-dialog-body">
        <Summary items={apptSummary(appt)} />
        <div className="t-tint-gold t-iconrow">
          <Icon name="warning" size={26} strokeWidth={1.75} />
          <p className="t-text">
            Phiếu khám sẽ trở về trạng thái <strong className="t-strong">Chưa đến</strong> và xoá thời điểm tiếp nhận{' '}
            <strong className="t-strong">{fmtTime(appt.checkin?.checkInTime).replace(/^0/, '')}</strong>. Chỉ hoàn tác khi check-in nhầm người.
          </p>
        </div>
        <ErrorAlert error={error} />
        <div className="t-actions">
          <button type="button" className="t-btn t-btn-danger t-btn-grow" disabled={pending} onClick={submit}>
            <Icon name="undo" />
            Hoàn tác check-in
          </button>
          <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 28px' }} onClick={onClose}>
            Giữ nguyên
          </button>
        </div>
      </div>
    </TDialog>
  );
}

/** Huỷ phiếu tại quầy: phải chọn lý do (UC.7.7). */
export function CancelDialog({ appt, onClose, onDone }) {
  const [choice, setChoice] = useState(CANCEL_REASONS[0]);
  const [other, setOther] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const reason = choice === 'Lý do khác' ? other.trim() : choice;

  const submit = async () => {
    if (!reason) {
      setError({ message: 'Vui lòng ghi rõ lý do huỷ.' });
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api.post(`/staff/appointments/${appt.id}/cancel`, { reason });
      onDone(
        <>
          Đã huỷ phiếu khám của <span className="t-notice-name">{appt.patient?.fullName}</span> ({appt.ticketCode}). Lý do: {reason}.
        </>,
      );
    } catch (err) {
      setError(err);
      setPending(false);
    }
  };

  return (
    <TDialog title="Huỷ phiếu khám" tone="red" onClose={onClose}>
      <div className="t-dialog-body">
        <Summary items={apptSummary(appt)} />
        <div className="t-field" style={{ gap: 10 }}>
          <label htmlFor="hd-lydo" className="t-label">
            Lý do huỷ
          </label>
          <select id="hd-lydo" className="t-select" value={choice} onChange={(e) => setChoice(e.target.value)}>
            {CANCEL_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        {choice === 'Lý do khác' && (
          <div className="t-field">
            <label htmlFor="hd-lydo-khac" className="t-label">
              Ghi rõ lý do <span className="t-req">*</span>
            </label>
            <input id="hd-lydo-khac" className="t-input" value={other} onChange={(e) => setOther(e.target.value)} maxLength={300} />
          </div>
        )}
        <div className="t-tint-red t-iconrow">
          <Icon name="warning" size={26} strokeWidth={1.75} />
          <p className="t-text">
            Phiếu khám đã huỷ <strong className="t-strong">không dùng để check-in được nữa</strong>. Bệnh nhân muốn khám thì phải đặt lịch mới.
          </p>
        </div>
        <ErrorAlert error={error} />
        <div className="t-actions">
          <button type="button" className="t-btn t-btn-danger t-btn-grow" disabled={pending} onClick={submit}>
            Huỷ phiếu khám
          </button>
          <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 28px' }} onClick={onClose}>
            Giữ lại phiếu khám
          </button>
        </div>
      </div>
    </TDialog>
  );
}

/** Ô chọn ngày: hôm nay đến `maxDays` ngày sau. */
export function DayCards({ value, onChange, maxDays, label }) {
  const today = todayVN();
  const days = Array.from({ length: maxDays + 1 }, (_, i) => addDays(today, i));
  return (
    <div role="radiogroup" aria-label={label} className="t-choices">
      {days.map((d, i) => (
        <button key={d} type="button" className="t-choice t-day" aria-pressed={d === value} aria-label={longDay(d)} onClick={() => onChange(d)}>
          <span className="t-day-top">{i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : weekday(d)}</span>
          <span className="t-day-bot">{ddmm(d)}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Khung giờ buổi sáng và buổi chiều. Khung đã hết giờ hoặc đã đủ 6 phiếu đặt trước thì xám;
 * khung đang diễn ra vẫn chọn được. `current` là khung đang hẹn (khi đổi giờ).
 */
export function SlotChoices({ date, value, onChange, current }) {
  const avail = useAsync(() => api.get(`/staff/availability${qs({ date })}`), [date]);
  const slots = avail.data?.slots || [];
  const today = date === todayVN();
  const now = nowMinutesVN();
  const render = (s) => {
    const off = !s.available || s.start === current;
    const running = today && minutesOf(s.start) <= now && now < minutesOf(s.end);
    const full = s.booked >= s.capacity;
    const isCurrent = s.start === current;
    const sub = full ? `Đã đủ ${s.capacity} phiếu đặt trước` : running ? 'Đang diễn ra' : null;
    return (
      <button
        key={s.start}
        type="button"
        className={`t-choice ${isCurrent && value !== s.start ? 't-choice-current' : ''}`}
        aria-pressed={value === s.start}
        aria-disabled={off && !isCurrent ? 'true' : undefined}
        onClick={() => !off && onChange(s.start)}
      >
        {shortTime(s.start)}
        {isCurrent ? ' (hiện tại)' : ''}
        {sub && <span className="t-choice-sub">{sub}</span>}
      </button>
    );
  };
  if (avail.loading && !avail.data) return <p className="t-muted">Đang tải khung giờ…</p>;
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="t-group-label">Buổi sáng</span>
        <div role="radiogroup" aria-label="Khung giờ buổi sáng" className="t-choices">
          {slots.filter((s) => minutesOf(s.start) < 12 * 60).map(render)}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="t-group-label">Buổi chiều</span>
        <div role="radiogroup" aria-label="Khung giờ buổi chiều" className="t-choices">
          {slots.filter((s) => minutesOf(s.start) >= 12 * 60).map(render)}
        </div>
      </div>
    </>
  );
}

/** Đổi giờ khám: tính như đặt mới vào khung mới, vẫn theo giới hạn 6 phiếu (UC.7.6). */
export function RescheduleDialog({ appt, onClose, onDone }) {
  const { meta } = useSession();
  const maxDays = meta?.counterMaxDays ?? 7;
  const inRange = appt.slotDate >= todayVN() && appt.slotDate <= addDays(todayVN(), maxDays);
  const [date, setDate] = useState(inRange ? appt.slotDate : todayVN());
  const [start, setStart] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const ready = Boolean(start);

  const submit = async () => {
    if (!ready) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.post(`/staff/appointments/${appt.id}/reschedule`, { slotDate: date, slotStart: start });
      const next = res.appointment;
      onDone(
        <>
          Đã đổi giờ khám của <span className="t-notice-name">{appt.patient?.fullName}</span> sang {shortTime(next.slotStart)}, {longDay(next.slotDate)}.{' '}
          {next.ticketCode === appt.ticketCode
            ? `Mã phiếu khám ${appt.ticketCode} giữ nguyên.`
            : `Mã phiếu khám đổi từ ${appt.ticketCode} thành ${next.ticketCode}, hãy báo mã mới cho bệnh nhân. Mã cũ không còn dùng.`}
        </>,
      );
    } catch (err) {
      setError(err);
      setPending(false);
    }
  };

  return (
    <TDialog title="Đổi giờ khám" onClose={onClose}>
      <div className="t-dialog-body" style={{ gap: 24 }}>
        <Summary items={apptSummary(appt)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="t-label">Ngày khám mới</span>
          <DayCards
            label="Chọn ngày khám mới"
            value={date}
            maxDays={maxDays}
            onChange={(d) => {
              setDate(d);
              setStart('');
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="t-label">Giờ khám mới</span>
          <SlotChoices date={date} value={start} onChange={setStart} current={date === appt.slotDate ? appt.slotStart : undefined} />
          <p className="t-text">
            Đổi giờ sẽ cấp phiếu khám mới với mã mới, mã cũ {appt.ticketCode} không còn dùng. Mỗi khung giờ tính cả tiếng (10:00 là từ 10:00 đến 11:00). Khung đã hết giờ hoặc đã
            đủ 6 phiếu đặt trước hiện màu xám; khung đang diễn ra luôn chọn được. Đổi giờ được tính như một lần đặt mới vào khung mới.
          </p>
        </div>
        <ErrorAlert error={error} />
        <div className="t-actions">
          <button type="button" className="t-btn t-btn-primary t-btn-bold t-btn-grow" aria-disabled={!ready} disabled={pending} onClick={submit}>
            <Icon name="check" strokeWidth={2.25} />
            {ready ? 'Xác nhận đổi giờ' : 'Chọn giờ mới để đổi'}
          </button>
          <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 28px' }} onClick={onClose}>
            Giữ giờ cũ
          </button>
        </div>
      </div>
    </TDialog>
  );
}

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

/** Tìm hồ sơ có sẵn theo họ tên, số điện thoại hoặc mã bệnh nhân. */
function usePatientSearch(q) {
  const [state, setState] = useState({ items: null, loading: false });
  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setState({ items: null, loading: false });
      return undefined;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      api
        .get(`/staff/patients${qs({ q: text, locked: 'false', limit: 6 })}`)
        .then((d) => alive && setState({ items: d.items, loading: false }))
        .catch(() => alive && setState({ items: [], loading: false }));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);
  return state;
}

/**
 * Thêm lịch khám (đặt hộ tại quầy, UC.7.5): 1. chọn hoặc tạo hồ sơ, 2. chọn nội dung, ngày, giờ, 3. phiếu khám.
 * `patient` có sẵn thì vào thẳng bước 2.
 */
export function AddAppointmentDialog({ patient: initialPatient, onClose, onBooked }) {
  const { meta } = useSession();
  const maxDays = meta?.counterMaxDays ?? 7;
  const services = meta?.serviceTypes || [];
  const [step, setStep] = useState(initialPatient ? 'lich' : 'bn');
  const [patient, setPatient] = useState(initialPatient || null);
  const [isNew, setIsNew] = useState(false);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [service, setService] = useState('');
  const [date, setDate] = useState(todayVN());
  const [start, setStart] = useState('');
  const [ticket, setTicket] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const search = usePatientSearch(q);

  useEffect(() => {
    if (!service && services.length) setService(services.find((s) => s.value === 'CHUA_RO')?.value || services[0].value);
  }, [services, service]);

  const choose = (p, fresh = false) => {
    setPatient(p);
    setIsNew(fresh);
    setStart('');
    setCreating(false);
    setStep('lich');
  };

  const book = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await api.post('/staff/appointments', { patientId: patient.id, serviceType: service, slotDate: date, slotStart: start });
      setTicket(res.appointment);
      setStep('ve');
      onBooked(null, res.appointment);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  const running = ticket && ticket.slotDate === todayVN() && minutesOf(ticket.slotStart) <= nowMinutesVN();
  const stepText = step === 'bn' ? 'Bước 1 / 2 · Chọn bệnh nhân' : step === 'lich' ? 'Bước 2 / 2 · Chọn ngày và giờ khám' : 'Hoàn tất · Phiếu khám';
  const serviceLabel = services.find((s) => s.value === service)?.label;

  return (
    <TDialog title="Thêm lịch khám" subtitle={stepText} width={780} onClose={onClose}>
      {step === 'bn' && (
        <div className="t-dialog-body">
          <div className="t-field">
            <label htmlFor="tl-tim" className="t-label">
              Bệnh nhân đã có hồ sơ
            </label>
            <input id="tl-tim" type="search" className="t-input" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
            <p className="t-muted">Gõ họ tên, số điện thoại hoặc mã bệnh nhân, ví dụ CT-BN-26-0004.</p>
          </div>
          {search.items?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {search.items.map((p) => (
                <button key={p.id} type="button" className="t-pick" onClick={() => choose(p)}>
                  <span className="t-pick-main">
                    <span>{p.fullName}</span>
                    <span>{patientLine(p)}</span>
                  </span>
                  <span className="t-pick-go">
                    Chọn
                    <Icon name="chevronRight" size={22} />
                  </span>
                </button>
              ))}
            </div>
          )}
          {search.items?.length === 0 && !search.loading && (
            <div role="status" className="t-tint-gold">
              <p className="t-text">
                <strong className="t-strong">Chưa có hồ sơ nào khớp.</strong> Nếu bệnh nhân đến lần đầu, bấm tạo hồ sơ mới ở bên dưới.
              </p>
            </div>
          )}
          <div className="t-split">
            {creating ? (
              <NewPatientFields
                idPrefix="tl"
                submitLabel="Tạo hồ sơ và tiếp tục"
                intro={<p className="t-strong">Hồ sơ mới — mã bệnh nhân được cấp tự động</p>}
                onCreated={(p) => choose(p, true)}
                onPickExisting={(p) => choose(p)}
                onCancel={() => setCreating(false)}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className="t-text">Bệnh nhân đến khám lần đầu thì tạo hồ sơ trước, chỉ cần họ tên, năm sinh và số điện thoại.</p>
                <button type="button" className="t-btn t-btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setCreating(true)}>
                  <Icon name="plus" strokeWidth={1.75} />
                  Bệnh nhân đến lần đầu — tạo hồ sơ mới
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'lich' && patient && (
        <div className="t-dialog-body" style={{ gap: 26 }}>
          <div className="t-chosen">
            <Icon name="user" size={32} strokeWidth={1.75} />
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <p className="t-chosen-name">{patient.fullName}</p>
              <p className="t-text">{patientLine(patient)}</p>
              {isNew && (
                <p className="t-text" style={{ marginTop: 2, fontWeight: 600, color: 'var(--green-700)' }}>
                  Hồ sơ vừa tạo xong
                </p>
              )}
            </div>
            <button
              type="button"
              className="t-btn t-btn-ghost"
              style={{ padding: '0 20px' }}
              onClick={() => {
                setPatient(null);
                setStep('bn');
              }}
            >
              Đổi bệnh nhân
            </button>
          </div>
          <div className="t-field" style={{ gap: 10 }}>
            <label htmlFor="tl-dv" className="t-label">
              Khám về việc gì? <span className="t-req">*</span>
            </label>
            <select id="tl-dv" className="t-select" value={service} onChange={(e) => setService(e.target.value)}>
              {services.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="t-label">
              Ngày khám <span className="t-req">*</span>
            </span>
            <DayCards
              label="Chọn ngày khám"
              value={date}
              maxDays={maxDays}
              onChange={(d) => {
                setDate(d);
                setStart('');
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span className="t-label">
              Giờ khám dự kiến <span className="t-req">*</span>
            </span>
            <SlotChoices date={date} value={start} onChange={setStart} />
            <p className="t-text" style={{ color: 'var(--gold-700)', fontWeight: 600 }}>
              Phòng khám nhận bệnh 8:00 – 16:30. Mỗi khung giờ tính cả tiếng (10:00 là từ 10:00 đến 11:00), khung đang diễn ra vẫn đặt được. Khung đã hết giờ trong hôm nay và
              khung đã đủ 6 phiếu đặt trước hiện màu xám. Đặt hộ được từ hôm nay đến {maxDays} ngày sau.
            </p>
          </div>
          <ErrorAlert error={error} />
          <div className="t-actions">
            <button type="button" className="t-btn t-btn-primary t-btn-bold" style={{ flex: '1 1 260px' }} aria-disabled={!start} disabled={pending} onClick={() => start && book()}>
              <Icon name="check" strokeWidth={2.25} />
              {start ? 'Đặt lịch hộ' : 'Chọn giờ khám để đặt lịch'}
            </button>
            <button type="button" className="t-btn t-btn-ghost" onClick={onClose}>
              Huỷ
            </button>
          </div>
        </div>
      )}

      {step === 've' && ticket && (
        <div className="t-dialog-body">
          <div role="status" className="t-iconrow" style={{ color: 'var(--green-700)' }}>
            <Icon name="checkCircle" size={34} />
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-700)' }}>
              Đã đặt lịch hộ cho <span className="t-strong">{patient.fullName}</span>
            </p>
          </div>
          <div className="t-ticket">
            <div className="t-ticket-top">
              <p>Mã phiếu khám</p>
              <p className="t-ticket-code">{ticket.ticketCode}</p>
            </div>
            <div className="t-ticket-grid">
              <div>
                <p>Bệnh nhân</p>
                <p className="t-v2">{patient.fullName}</p>
                <p className="t-text">{patientLine(patient)}</p>
              </div>
              <div>
                <p>Giờ khám dự kiến</p>
                <p className="t-v2">{shortTime(ticket.slotStart)}</p>
                <p className="t-text">{longDay(ticket.slotDate)}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p>Khám về việc</p>
                <p className="t-v2">{ticket.serviceLabel || serviceLabel}</p>
              </div>
            </div>
          </div>
          <p className="t-text">
            {running
              ? 'Khung giờ đang diễn ra nên đây là lượt đến trực tiếp: không tính vào 6 phiếu đặt trước, xếp vào nhóm thường.'
              : 'Đây là phiếu đặt trước: chiếm 1 trong 6 chỗ đặt trước của khung giờ này, được ưu tiên nếu check-in trước khi hết khung.'}
          </p>
          <p className="t-text">
            Đưa phiếu khám hoặc đọc mã phiếu khám cho bệnh nhân.{' '}
            {ticket.slotDate === todayVN() ? 'Bệnh nhân đang có mặt thì check-in ngay.' : `Phiếu khám sẽ hiện trong lịch ngày ${fmtDate(ticket.slotDate)}.`}
          </p>
          <ErrorAlert error={error} />
          <div className="t-actions">
            {ticket.slotDate === todayVN() && (
              <button
                type="button"
                className="t-btn t-btn-primary t-btn-grow"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  try {
                    await api.post(`/staff/appointments/${ticket.id}/checkin`);
                    onBooked(
                      <>
                        Đã check-in <span className="t-notice-name">{patient.fullName}</span> lúc {fmtTime(new Date()).replace(/^0/, '')} với phiếu khám {ticket.ticketCode}.
                      </>,
                      ticket,
                      true,
                    );
                  } catch (err) {
                    setError(err);
                    setPending(false);
                  }
                }}
              >
                <Icon name="check" strokeWidth={2.25} />
                Check-in ngay
              </button>
            )}
            <button type="button" className="t-btn t-btn-ghost" onClick={onClose}>
              Xong
            </button>
          </div>
        </div>
      )}
    </TDialog>
  );
}
