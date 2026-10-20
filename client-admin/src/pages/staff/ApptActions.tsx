import { useEffect, useState } from 'react';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api, clientError, qs, type ApiError } from '@chuctu/shared/lib/api.ts';
import { fmtDate, fmtDateLong, fmtTime, slotLabel, todayVN } from '@chuctu/shared/lib/format.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { useAsync } from '@chuctu/shared/lib/useAsync.ts';
import type { Appointment, Paged, Patient, ServiceType, Slot } from '@chuctu/shared/types.ts';
import { NbDayCards, NbError, NbField, NbModal, NbPhone, NbSlotPicker } from '../../components/nb.tsx';

interface ApptModalProps {
  appt: Appointment;
  onClose: () => void;
  onDone: (appt: Appointment) => void;
}

/** Bệnh nhân, mã phiếu, giờ khám, nội dung khám của một phiếu. */
export function ApptInfo({ appt }: { appt: Appointment }) {
  return (
    <dl className="nb-infogrid">
      <div>
        <dt>Bệnh nhân</dt>
        <dd>{appt.patient?.fullName}</dd>
        <dd>
          {[appt.patient?.patientCode, appt.patient?.birthYear && `Năm sinh ${appt.patient.birthYear}`].filter(Boolean).join(' · ')}
        </dd>
      </div>
      <div>
        <dt>Mã phiếu khám</dt>
        <dd>{appt.ticketCode}</dd>
      </div>
      <div>
        <dt>Giờ khám dự kiến</dt>
        <dd style={{ fontWeight: 600 }}>{slotLabel(appt.slotStart)}</dd>
        <dd>{fmtDateLong(appt.slotDate)}</dd>
      </div>
      <div>
        <dt>Khám về việc</dt>
        <dd style={{ fontWeight: 600 }}>{appt.serviceLabel}</dd>
      </div>
    </dl>
  );
}

/** Chạy một lời gọi API với trạng thái đang xử lý và lỗi. */
function useSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };
  return { pending, error, setError, run };
}

/** Xác nhận bệnh nhân đã có mặt; ghi nhận thời điểm tiếp nhận (UC.7.3). */
export function CheckinModal({ appt, onClose, onDone }: ApptModalProps) {
  const { pending, error, run } = useSubmit();
  const now = fmtTime(new Date());
  return (
    <NbModal title="Check-in cho bệnh nhân" onClose={onClose} width={700}>
      <ApptInfo appt={appt} />
      <p>
        Xác nhận bệnh nhân <strong className="nb-ink">đã có mặt</strong> tại phòng khám. Hệ thống sẽ ghi nhận thời điểm tiếp nhận là{' '}
        <strong className="nb-ink">{now}</strong>.
      </p>
      <NbError error={error} />
      <div className="nb-dialog-actions">
        <button
          type="button"
          className="nb-btn nb-btn-primary nb-btn-grow"
          style={{ fontWeight: 700 }}
          disabled={pending}
          onClick={() =>
            run(async () => {
              await api.post(`/staff/appointments/${appt.id}/checkin`);
              onDone(appt);
            })
          }
        >
          <Icon name="check" />
          Xác nhận check-in
        </button>
        <button type="button" className="nb-btn nb-btn-ghost" onClick={onClose}>
          Quay lại
        </button>
      </div>
    </NbModal>
  );
}

/** Hoàn tác check-in khi check-in nhầm người (UC.7.4). */
export function UndoCheckinModal({ appt, onClose, onDone }: ApptModalProps) {
  const { pending, error, run } = useSubmit();
  return (
    <NbModal title="Hoàn tác check-in?" onClose={onClose} width={700} tone="red">
      <ApptInfo appt={appt} />
      <div className="nb-warn">
        <Icon name="alert" />
        <p>
          Phiếu khám sẽ trở về trạng thái <strong>Chưa đến</strong> và xoá thời điểm tiếp nhận
          {appt.checkInTime ? <strong> {fmtTime(appt.checkInTime)}</strong> : null}. Chỉ hoàn tác khi check-in nhầm người.
        </p>
      </div>
      <NbError error={error} />
      <div className="nb-dialog-actions">
        <button
          type="button"
          className="nb-btn nb-btn-danger nb-btn-grow"
          disabled={pending}
          onClick={() =>
            run(async () => {
              await api.post(`/staff/appointments/${appt.id}/undo-checkin`);
              onDone(appt);
            })
          }
        >
          <Icon name="undo" />
          Hoàn tác check-in
        </button>
        <button type="button" className="nb-btn nb-btn-ghost" onClick={onClose}>
          Giữ nguyên
        </button>
      </div>
    </NbModal>
  );
}

/** Huỷ phiếu tại quầy: phải chọn lý do (UC.7.7). */
export function CancelModal({ appt, onClose, onDone }: ApptModalProps) {
  const { meta } = useSession();
  const reasons = meta?.cancelReasons || [];
  const [choice, setChoice] = useState(reasons[0] || '');
  const [other, setOther] = useState('');
  const { pending, error, setError, run } = useSubmit();
  const reason = choice === 'Khác' ? other.trim() : choice;

  const submit = () => {
    if (!reason) {
      setError(clientError(choice === 'Khác' ? 'Vui lòng ghi lý do huỷ.' : 'Vui lòng chọn lý do huỷ.'));
      return;
    }
    run(async () => {
      const res = await api.post<{ appointment: Appointment }>(`/staff/appointments/${appt.id}/cancel`, { reason });
      onDone(res.appointment);
    });
  };

  return (
    <NbModal title="Huỷ phiếu khám?" onClose={onClose} width={700} tone="red">
      <ApptInfo appt={appt} />
      <NbField label="Lý do huỷ">
        {(a) => (
          <select className="nb-select" value={choice} onChange={(e) => setChoice(e.target.value)} {...a}>
            {reasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
      </NbField>
      {choice === 'Khác' && (
        <NbField label="Ghi rõ lý do" required>
          {(a) => <input className="nb-input" value={other} onChange={(e) => setOther(e.target.value)} {...a} />}
        </NbField>
      )}
      <div className="nb-danger-box">
        <Icon name="alert" />
        <p>
          Phiếu khám đã huỷ <strong>không dùng để check-in được nữa</strong>. Bệnh nhân muốn khám thì phải đặt lịch mới.
        </p>
      </div>
      <NbError error={error} />
      <div className="nb-dialog-actions">
        <button type="button" className="nb-btn nb-btn-danger nb-btn-grow" disabled={pending} onClick={submit}>
          Huỷ phiếu khám
        </button>
        <button type="button" className="nb-btn nb-btn-ghost" onClick={onClose}>
          Giữ lại phiếu khám
        </button>
      </div>
    </NbModal>
  );
}

const SLOT_NOTE =
  'Mỗi khung giờ tính cả tiếng (10:00 là từ 10:00 đến 11:00), khung đang diễn ra vẫn đặt được. Khung đã hết giờ hoặc đã đủ 6 phiếu đặt trước hiện màu xám.';

/** Đổi giờ khám: tính như đặt mới vào khung mới, vẫn theo giới hạn 6 phiếu (UC.7.6). */
export function RescheduleModal({ appt, onClose, onDone }: ApptModalProps) {
  const { meta } = useSession();
  const [date, setDate] = useState(appt.slotDate < todayVN() ? todayVN() : appt.slotDate);
  const [start, setStart] = useState('');
  const { pending, error, run } = useSubmit();
  const avail = useAsync(() => api.get<{ date: string; slots: Slot[] }>(`/staff/availability?date=${date}`), [date]);

  return (
    <NbModal title="Đổi giờ khám" onClose={onClose} width={700}>
      <ApptInfo appt={appt} />
      <NbDayCards
        label="Ngày khám mới"
        value={date}
        maxDays={meta?.counterMaxDays ?? 7}
        onChange={(d) => {
          setDate(d);
          setStart('');
        }}
      />
      <NbSlotPicker label="Giờ khám mới" slots={avail.data?.slots} loading={avail.loading} value={start} onChange={setStart} />
      <p>
        Phiếu mới sẽ có mã mới, phiếu {appt.ticketCode} được huỷ. {SLOT_NOTE} Đổi giờ được tính như một lần đặt mới vào khung mới.
      </p>
      <NbError error={error} />
      <div className="nb-dialog-actions">
        <button
          type="button"
          className="nb-btn nb-btn-primary nb-btn-grow"
          style={{ fontWeight: 700 }}
          disabled={pending || !start}
          onClick={() =>
            run(async () => {
              const res = await api.post<{ appointment: Appointment }>(`/staff/appointments/${appt.id}/reschedule`, { slotDate: date, slotStart: start });
              onDone(res.appointment);
            }).then(() => avail.reload({ silent: true }))
          }
        >
          <Icon name="check" />
          {start ? `Đổi sang ${slotLabel(start)}, ${fmtDate(date)}` : 'Chọn giờ khám mới'}
        </button>
        <button type="button" className="nb-btn nb-btn-ghost" onClick={onClose}>
          Giữ giờ cũ
        </button>
      </div>
    </NbModal>
  );
}

// ---------- Thêm lịch khám (đặt hộ tại quầy, UC.7.5) ----------

/** Họ tên, năm sinh, số điện thoại bắt buộc khi tạo hồ sơ tại quầy (BR.25). */
export function NewPatientFields({
  form,
  setForm,
  fields,
}: {
  form: { fullName: string; birthYear: string; phone: string };
  setForm: (f: { fullName: string; birthYear: string; phone: string }) => void;
  fields: Record<string, string>;
}) {
  return (
    <>
      <NbField label="Họ và tên" required error={fields.fullName}>
        {(a) => <input className="nb-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} {...a} />}
      </NbField>
      <div className="nb-form-row">
        <NbField label="Năm sinh" required error={fields.birthYear} className="" >
          {(a) => (
            <input className="nb-input" inputMode="numeric" maxLength={4} value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value.replace(/\D/g, '') })} {...a} />
          )}
        </NbField>
        <NbField label="Số điện thoại" required error={fields.phone}>
          {(a) => <NbPhone value={form.phone} onChange={(phone) => setForm({ ...form, phone })} {...a} />}
        </NbField>
      </div>
    </>
  );
}

/** Kiểm tra nhanh trước khi gửi, câu báo lỗi giống prototype. */
export function checkNewPatient(form: { fullName: string; birthYear: string; phone: string }) {
  const e: Record<string, string> = {};
  if (form.fullName.trim().length < 2) e.fullName = 'Vui lòng nhập họ và tên bệnh nhân.';
  if (!/^\d{4}$/.test(form.birthYear)) e.birthYear = 'Nhập năm sinh gồm 4 chữ số, ví dụ 1952.';
  if (!/^0\d{9}$/.test(form.phone)) e.phone = 'Nhập số điện thoại 9 số sau +84, ví dụ 912345678.';
  return e;
}

const patientSub = (p: Patient) => [p.patientCode, p.birthYear && `Năm sinh ${p.birthYear}`, p.phone].filter(Boolean).join(' · ');

export function AddAppointmentModal({
  initialPatient,
  onClose,
  onDone,
}: {
  initialPatient?: Patient | null;
  onClose: () => void;
  /** Đặt xong (và có thể đã check-in ngay); trả về phiếu để trang tải lại lịch. */
  onDone: (appt: Appointment, message: string) => void;
}) {
  const { meta } = useSession();
  const [step, setStep] = useState<'patient' | 'schedule' | 'ticket'>(initialPatient ? 'schedule' : 'patient');
  const [patient, setPatient] = useState<Patient | null>(initialPatient ?? null);
  const [isNew, setIsNew] = useState(false);

  // Bước 1: tìm hoặc tạo hồ sơ
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Patient[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ fullName: '', birthYear: '', phone: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [duplicate, setDuplicate] = useState<Patient | null>(null);

  // Bước 2: lịch khám
  const [serviceType, setServiceType] = useState<ServiceType>('CHUA_RO');
  const [date, setDate] = useState(todayVN());
  const [start, setStart] = useState('');
  const avail = useAsync(
    () => (step === 'schedule' ? api.get<{ date: string; slots: Slot[] }>(`/staff/availability?date=${date}`) : Promise.resolve(null)),
    [date, step],
  );

  // Bước 3: phiếu đã đặt
  const [ticket, setTicket] = useState<Appointment | null>(null);
  const { pending, error, setError, run } = useSubmit();

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setResults(null);
      return undefined;
    }
    const t = setTimeout(() => {
      api
        .get<Paged<Patient>>(`/staff/patients${qs({ q: text, limit: 6 })}`)
        .then((r) => setResults(r.items))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const choose = (p: Patient, fresh = false) => {
    if (p.isLocked) {
      setError(clientError(`Hồ sơ ${p.fullName} đang bị khoá nên không đặt lịch được.`));
      return;
    }
    setPatient(p);
    setIsNew(fresh);
    setError(null);
    setStep('schedule');
  };

  const createPatient = () => {
    const e = checkNewPatient(form);
    setFields(e);
    setDuplicate(null);
    if (Object.keys(e).length) return;
    run(async () => {
      try {
        const res = await api.post<{ patient: Patient }>('/staff/patients', { fullName: form.fullName.trim(), birthYear: Number(form.birthYear), phone: form.phone });
        choose(res.patient, true);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.code === 'DUPLICATE_PHONE') {
          setDuplicate((apiErr.data.duplicates as Patient[])[0] ?? null);
          return;
        }
        setFields(apiErr.fields);
        throw err;
      }
    });
  };

  const book = (checkInNow = false) => {
    if (!patient) return;
    run(async () => {
      const res = await api.post<{ appointment: Appointment }>('/staff/appointments', { patientId: patient.id, serviceType, slotDate: date, slotStart: start, checkInNow });
      setTicket(res.appointment);
      setStep('ticket');
    }).then(() => avail.reload({ silent: true }));
  };

  const checkInTicket = () => {
    if (!ticket) return;
    run(async () => {
      await api.post(`/staff/appointments/${ticket.id}/checkin`);
      onDone(ticket, `Đã đặt lịch và check-in cho ${ticket.patient?.fullName}, mã phiếu ${ticket.ticketCode}.`);
    });
  };

  const subtitle = step === 'patient' ? 'Bước 1/2 · Chọn bệnh nhân' : step === 'schedule' ? 'Bước 2/2 · Chọn lịch khám' : 'Đã đặt lịch xong';
  const isToday = date === todayVN();
  const slot = avail.data?.slots.find((s) => s.start === start);

  return (
    <NbModal title="Thêm lịch khám" subtitle={subtitle} onClose={onClose} width={780}>
      {step === 'patient' && (
        <>
          <NbField label="Bệnh nhân đã có hồ sơ" hint="Gõ họ tên, số điện thoại hoặc mã bệnh nhân, ví dụ CT-BN-26-0004.">
            {(a) => <input className="nb-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} {...a} />}
          </NbField>
          {results && results.length > 0 && (
            <div className="nb-stack-sm" style={{ gap: 10 }}>
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="nb-btn nb-btn-ghost"
                  style={{ justifyContent: 'space-between', minHeight: 60, padding: '12px 18px', borderRadius: 16, background: '#fff', whiteSpace: 'normal', textAlign: 'left' }}
                  onClick={() => choose(p)}
                >
                  <span>
                    <span className="nb-strong">
                      {p.fullName}
                      {p.isLocked ? ' (hồ sơ đã khoá)' : ''}
                    </span>
                    <span className="nb-sub" style={{ color: '#4A3F33' }}>
                      {patientSub(p)}
                    </span>
                  </span>
                  <span className="nb-row" style={{ gap: 6, color: '#2E5B37' }}>
                    Chọn
                    <Icon name="chevronRight" size={20} />
                  </span>
                </button>
              ))}
            </div>
          )}
          {results && results.length === 0 && (
            <div className="nb-warn" role="status">
              <p>
                <strong>Chưa có hồ sơ nào khớp.</strong> Nếu bệnh nhân đến lần đầu, bấm tạo hồ sơ mới ở bên dưới.
              </p>
            </div>
          )}
          <div className="nb-stack" style={{ borderTop: '2px solid #E0D3BC', paddingTop: 20, gap: 18 }}>
            {!creating ? (
              <div className="nb-stack-sm" style={{ gap: 10 }}>
                <p>Bệnh nhân đến khám lần đầu thì tạo hồ sơ trước, chỉ cần họ tên, năm sinh và số điện thoại.</p>
                <button type="button" className="nb-btn nb-btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setCreating(true)}>
                  <Icon name="plus" />
                  Bệnh nhân đến lần đầu — tạo hồ sơ mới
                </button>
              </div>
            ) : (
              <form
                className="nb-stack"
                style={{ gap: 20 }}
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  createPatient();
                }}
              >
                <p className="nb-strong">Hồ sơ mới</p>
                <NewPatientFields form={form} setForm={setForm} fields={fields} />
                {duplicate && (
                  <div className="nb-warn" role="alert" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    <p style={{ flex: '1 1 300px' }}>
                      Số điện thoại này đã có hồ sơ: <strong>{duplicate.fullName}</strong>, mã <strong>{duplicate.patientCode}</strong>. Kiểm tra lại, nếu đúng người thì chọn hồ sơ này.
                    </p>
                    <button type="button" className="nb-btn nb-btn-ghost" onClick={() => choose(duplicate)}>
                      Chọn hồ sơ này
                    </button>
                  </div>
                )}
                <div className="nb-dialog-actions">
                  <button type="submit" className="nb-btn nb-btn-primary" style={{ flex: '1 1 260px' }} disabled={pending}>
                    <Icon name="check" />
                    Tạo hồ sơ và tiếp tục
                  </button>
                  <button type="button" className="nb-btn nb-btn-ghost" onClick={() => setCreating(false)}>
                    Huỷ
                  </button>
                </div>
              </form>
            )}
          </div>
          <NbError error={error} />
        </>
      )}

      {step === 'schedule' && patient && (
        <>
          <div className="nb-row" style={{ background: '#E4EFE2', borderRadius: 16, padding: '16px 20px', gap: '12px 16px' }}>
            <Icon name="user" />
            <div style={{ flex: '1 1 260px' }}>
              <p className="nb-strong" style={{ fontSize: 18 }}>
                {patient.fullName}
              </p>
              <p>{patientSub(patient)}</p>
              {isNew && <p style={{ fontWeight: 600, color: '#2E5B37' }}>Hồ sơ vừa tạo xong</p>}
            </div>
            {!initialPatient && (
              <button
                type="button"
                className="nb-btn nb-btn-ghost"
                onClick={() => {
                  setStep('patient');
                  setPatient(null);
                }}
              >
                Đổi bệnh nhân
              </button>
            )}
          </div>
          <NbField label="Khám về việc gì?" required>
            {(a) => (
              <select className="nb-select" value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)} {...a}>
                {(meta?.serviceTypes || []).map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
          </NbField>
          <NbDayCards
            label="Ngày khám"
            value={date}
            maxDays={meta?.counterMaxDays ?? 7}
            onChange={(d) => {
              setDate(d);
              setStart('');
            }}
          />
          <NbSlotPicker label="Giờ khám dự kiến" slots={avail.data?.slots} loading={avail.loading} value={start} onChange={setStart} />
          <p className="nb-gold-text">Phòng khám nhận bệnh 8:00 – 16:30. {SLOT_NOTE} Đặt hộ được từ hôm nay đến {meta?.counterMaxDays ?? 7} ngày sau.</p>
          <NbError error={error} />
          <div className="nb-dialog-actions">
            <button type="button" className="nb-btn nb-btn-primary" style={{ flex: '1 1 260px', fontWeight: 700 }} disabled={pending || !slot?.available} onClick={() => book(false)}>
              <Icon name="calendarPlus" />
              {start ? 'Đặt lịch hộ' : 'Chọn giờ khám để đặt lịch'}
            </button>
            <button type="button" className="nb-btn nb-btn-ghost" onClick={onClose}>
              Huỷ
            </button>
          </div>
        </>
      )}

      {step === 'ticket' && ticket && (
        <>
          <p className="nb-row" role="status" style={{ fontSize: 18, fontWeight: 700, color: '#2E5B37', gap: 14 }}>
            <Icon name="checkCircle" />
            <span>
              Đã đặt lịch hộ cho <span className="nb-ink">{ticket.patient?.fullName}</span>
            </span>
          </p>
          <div style={{ background: '#fff', border: '2px solid #2E5B37', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', background: '#E4EFE2' }}>
              <p style={{ color: '#2E5B37', fontWeight: 600 }}>Mã phiếu khám</p>
              <p className="nb-h1">{ticket.ticketCode}</p>
            </div>
            <dl className="nb-dl-flat" style={{ padding: '18px 24px', border: 0 }}>
              <div>
                <dt>Bệnh nhân</dt>
                <dd style={{ fontWeight: 600 }}>{ticket.patient?.fullName}</dd>
                <dd>{ticket.patient?.patientCode}</dd>
              </div>
              <div>
                <dt>Giờ khám dự kiến</dt>
                <dd style={{ fontWeight: 600 }}>{slotLabel(ticket.slotStart)}</dd>
                <dd>{fmtDateLong(ticket.slotDate)}</dd>
              </div>
              <div>
                <dt>Khám về việc</dt>
                <dd style={{ fontWeight: 600 }}>{ticket.serviceLabel}</dd>
              </div>
            </dl>
          </div>
          <p>
            Đưa phiếu khám hoặc đọc mã phiếu khám cho bệnh nhân.{' '}
            {ticket.slotDate === todayVN() ? 'Bệnh nhân đang có mặt thì check-in ngay.' : `Phiếu khám sẽ hiện trong lịch ngày ${fmtDate(ticket.slotDate)}.`}
          </p>
          <NbError error={error} />
          <div className="nb-dialog-actions">
            {ticket.slotDate === todayVN() && isToday && (
              <button type="button" className="nb-btn nb-btn-primary nb-btn-grow" disabled={pending} onClick={checkInTicket}>
                <Icon name="check" />
                Check-in ngay
              </button>
            )}
            <button type="button" className="nb-btn nb-btn-ghost" onClick={() => onDone(ticket, `Đã đặt lịch hộ cho ${ticket.patient?.fullName}, mã phiếu ${ticket.ticketCode}.`)}>
              Xong
            </button>
          </div>
        </>
      )}
    </NbModal>
  );
}
