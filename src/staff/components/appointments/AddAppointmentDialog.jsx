import { useEffect, useState } from 'react';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert } from '../../../shared/ui/ui.jsx';
import { api, qs } from '../../../shared/lib/api.js';
import { fmtDate, fmtTime, shortTime, todayVN } from '../../../shared/lib/format.js';
import { useSession } from '../../../shared/lib/session.jsx';
import { TDialog } from '../dialogs.jsx';
import { nowMinutesVN, minutesOf, longDay, patientLine } from './time.js';
import { DayCards, SlotChoices } from './RescheduleDialog.jsx';
import { NewPatientFields } from './NewPatientFields.jsx';

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
