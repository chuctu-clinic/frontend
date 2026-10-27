import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { useDismiss } from '../../../shared/lib/hooks.js';
import { nowMinutesVN } from '../../components/appointments/time.js';
import { clock, minutesOf } from './DailySchedule.jsx';

// Thành phần của từng dòng trong Lịch trong ngày

export function StatusChip({ a }) {
  switch (a.status) {
    case 'BOOKED':
      return (
        <span className="t-chip t-chip-gold">
          <Icon name="clock" size={18} strokeWidth={2.25} />
          Chưa đến
        </span>
      );
    case 'CHECKED_IN':
      return (
        <span className="t-chip t-chip-green">
          <Icon name="checkCircle" size={18} strokeWidth={2.25} />
          Đã check-in {a.checkin ? clock(a.checkin.checkInTime) : ''}
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="t-chip t-chip-solid">
          <Icon name="arrowRight" size={18} strokeWidth={2.25} />
          Đã vào khám {a.checkin?.enteredAt ? clock(a.checkin.enteredAt) : ''}
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="t-chip t-chip-done t-chip-sm">
          <Icon name="check" size={18} strokeWidth={2.25} />
          Đã hoàn thành
        </span>
      );
    default:
      return (
        <span className="t-chip t-chip-cancel t-chip-sm">
          <Icon name="x" size={18} strokeWidth={2.25} />
          Đã huỷ
        </span>
      );
  }
}

/** Ghi chú dưới trạng thái: đến sau khung đã đặt, đã qua khung giờ. */
export function stateNote(a, isToday) {
  if (a.status === 'CHECKED_IN' && a.checkin && a.checkin.priorityGroup === 'NORMAL' && a.source !== 'COUNTER') {
    const checkInMin = minutesOf(clock(a.checkin.checkInTime));
    if (checkInMin >= minutesOf(a.slotStart) + 60) return 'Đến sau khung đã đặt';
    if (checkInMin < minutesOf(a.slotStart)) return `Đến sớm, xếp nhóm thường`;
  }
  if (a.status === 'BOOKED' && isToday && minutesOf(a.slotStart) + 60 <= nowMinutesVN()) return 'Đã qua khung giờ khám';
  return '';
}

export function RowMenu({ a, isToday, isPast, open, onToggle, up, act }) {
  const ref = useDismiss(open, onToggle);
  const name = a.patient?.fullName;
  const items = [];
  if (a.status === 'BOOKED' && isToday) items.push(['checkin', 'check', 'Check-in', 'green']);
  if (a.status === 'CHECKED_IN' && isToday) items.push(['enter', 'arrowRight', 'Vào khám', 'green']);
  if (a.status === 'BOOKED' && !isPast) items.push(['reschedule', 'clock', 'Đổi giờ khám']);
  if (a.status === 'IN_PROGRESS') items.push(['record', 'file', 'Ghi nhận lượt khám']);
  if (a.status === 'COMPLETED') items.push(['record', 'file', 'Xem lượt khám']);
  items.push(['patient', 'user', 'Mở hồ sơ bệnh nhân']);
  if (a.status === 'CHECKED_IN' && isToday) items.push(['undo-checkin', 'undo', 'Hoàn tác check-in']);
  if (a.status === 'IN_PROGRESS' && isToday) items.push(['undo-enter', 'undo', 'Hoàn tác vào khám']);
  if (a.status === 'BOOKED' && !isPast) items.push(['cancel', 'x', 'Huỷ phiếu khám', 'danger']);

  return (
    <div className="t-menu-wrap" ref={ref}>
      <button
        type="button"
        className="t-btn t-btn-ghost t-btn-icon"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Thao tác cho ${name}`}
        onClick={onToggle}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div role="menu" aria-label={`Thao tác cho ${name}`} className={`t-menu ${up ? 'up' : 'down'}`}>
          {items.map(([key, icon, label, tone]) =>
            key === 'record' || key === 'patient' ? (
              <Link
                key={key}
                role="menuitem"
                className="t-menu-item"
                to={key === 'record' ? `/noi-bo/phieu-kham/${a.id}/ket-qua` : `/noi-bo/benh-nhan/${a.patient?.id}`}
              >
                <Icon name={icon} size={22} />
                {label}
              </Link>
            ) : (
              <button key={key} type="button" role="menuitem" className={`t-menu-item ${tone || ''}`} onClick={() => act(key, a)}>
                <Icon name={icon} size={22} />
                {label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
