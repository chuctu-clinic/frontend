import { useState } from 'react';
import { Alert, Button, ErrorAlert, Modal, TextInput } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { slotLabel } from '@chuctu/shared/lib/format.js';
import { useSession } from '@chuctu/shared/lib/session.jsx';
import { useAsync } from '@chuctu/shared/lib/useAsync.js';
import { DatePicker, SlotPicker } from '@chuctu/shared/components/pickers.jsx';

/** Huỷ phiếu tại quầy: phải chọn lý do (UC.7.7). */
export function CancelModal({ appt, onClose, onDone }) {
  const { meta } = useSession();
  const [choice, setChoice] = useState('');
  const [other, setOther] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const reason = choice === 'Khác' ? other.trim() : choice;

  const submit = async () => {
    if (!reason) {
      setError({ message: choice === 'Khác' ? 'Vui lòng ghi lý do huỷ.' : 'Vui lòng chọn lý do huỷ.' });
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await api.post(`/staff/appointments/${appt.id}/cancel`, { reason });
      onDone(res.appointment);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      title={`Huỷ phiếu ${appt.ticketCode}?`}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Không huỷ
          </Button>
          <Button variant="danger-solid" icon="x" loading={pending} onClick={submit}>
            Huỷ phiếu
          </Button>
        </>
      }
    >
      <div className="stack">
        <p>
          Phiếu của <strong>{appt.patient?.fullName}</strong> sẽ không còn giá trị và không check-in được nữa. Chỗ trong khung giờ được trả lại.
        </p>
        <fieldset className="stack-sm">
          <legend className="field-label">Lý do huỷ</legend>
          {(meta?.cancelReasons || []).map((r) => (
            <label key={r} className="check">
              <input type="radio" name="reason" value={r} checked={choice === r} onChange={() => setChoice(r)} />
              {r}
            </label>
          ))}
        </fieldset>
        {choice === 'Khác' && <TextInput label="Ghi rõ lý do" required value={other} onChange={(e) => setOther(e.target.value)} />}
        <ErrorAlert error={error} />
      </div>
    </Modal>
  );
}

/** Đổi giờ khám: tính như đặt mới vào khung mới, vẫn theo giới hạn 6 phiếu (UC.7.6). */
export function RescheduleModal({ appt, onClose, onDone }) {
  const { meta } = useSession();
  const [date, setDate] = useState(appt.slotDate);
  const [start, setStart] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const avail = useAsync(() => api.get(`/staff/availability?date=${date}`), [date]);

  const submit = async () => {
    if (!start) {
      setError({ message: 'Vui lòng chọn khung giờ mới.' });
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await api.post(`/staff/appointments/${appt.id}/reschedule`, { slotDate: date, slotStart: start });
      onDone(res.appointment);
    } catch (err) {
      setError(err);
      avail.reload();
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      wide
      title="Đổi giờ khám"
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Quay lại
          </Button>
          <Button icon="check" loading={pending} onClick={submit}>
            Đổi sang giờ mới
          </Button>
        </>
      }
    >
      <div className="stack">
        <Alert type="info">
          {appt.patient?.fullName} — đang hẹn {slotLabel(appt.slotStart)}. Đổi giờ sẽ huỷ phiếu cũ và cấp phiếu mới với mã mới.
        </Alert>
        <DatePicker
          value={date}
          onChange={(d) => {
            setDate(d);
            setStart('');
          }}
          maxDays={meta?.counterMaxDays ?? 7}
        />
        <SlotPicker slots={avail.data?.slots} loading={avail.loading} value={start} onChange={setStart} />
        <ErrorAlert error={error} />
      </div>
    </Modal>
  );
}
