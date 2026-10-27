import { useState } from 'react';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert } from '../../../shared/ui/ui.jsx';
import { api, qs } from '../../../shared/lib/api.js';
import { addDays, shortTime, todayVN, weekday } from '../../../shared/lib/format.js';
import { useSession } from '../../../shared/lib/session.jsx';
import { useAsync } from '../../../shared/lib/hooks.js';
import { Summary, TDialog } from '../dialogs.jsx';
import { nowMinutesVN, minutesOf, ddmm, longDay } from './time.js';
import { apptSummary } from './StatusDialogs.jsx';

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
