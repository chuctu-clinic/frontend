import { useState } from 'react';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { fmtDate, fmtTime, shortTime, todayVN } from '../../../shared/lib/format.js';
import { useSession } from '../../../shared/lib/session.jsx';
import { Summary, TDialog } from '../dialogs.jsx';
import { nowMinutesVN, minutesOf, longDay } from './time.js';
import { TPicker } from '../fields.jsx';

// Check-in, hoàn tác check-in, huỷ phiếu khám

const CANCEL_REASONS = ['Bệnh nhân xin huỷ', 'Bệnh nhân không đến được', 'Đặt nhầm lịch', 'Lý do khác'];

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

export function apptSummary(a) {
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
          <TPicker id="hd-lydo" value={choice} onChange={setChoice} items={CANCEL_REASONS.map((r) => ({ value: r, label: r }))} />
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
