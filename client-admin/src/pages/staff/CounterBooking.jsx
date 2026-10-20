import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Button, ButtonLink, ErrorAlert, Loading, PageHeader } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { fmtDateLong, shortTime, todayVN } from '@chuctu/shared/lib/format.js';
import { useSession } from '@chuctu/shared/lib/session.jsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { DatePicker, ServicePicker, SlotPicker } from '@chuctu/shared/components/pickers.jsx';
import { PatientPicker } from './PatientPicker.jsx';

/** Đặt hộ lịch khám tại quầy cho bệnh nhân đến trực tiếp (UC.7.5). */
export default function CounterBooking() {
  useDocumentTitle('Đặt hộ tại quầy');
  const { meta } = useSession();
  const [params] = useSearchParams();
  const [patient, setPatient] = useState(null);
  const [serviceType, setServiceType] = useState('CHUA_RO');
  const [slotDate, setSlotDate] = useState(todayVN());
  const [slotStart, setSlotStart] = useState('');
  const [checkInNow, setCheckInNow] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    const id = params.get('benh-nhan');
    if (id) api.get(`/staff/patients/${id}`).then((r) => setPatient(r.patient)).catch(() => {});
  }, [params]);

  const avail = useAsync(() => api.get(`/staff/availability?date=${slotDate}`), [slotDate]);
  const isToday = slotDate === todayVN();

  const submit = async () => {
    if (!slotStart) {
      setError({ message: 'Vui lòng chọn khung giờ.', fields: { slotStart: 'Vui lòng chọn khung giờ.' } });
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await api.post('/staff/appointments', { patientId: patient.id, serviceType, slotDate, slotStart, checkInNow: isToday && checkInNow });
      setCreated(res.appointment);
    } catch (err) {
      setError(err);
      avail.reload();
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setCreated(null);
    setPatient(null);
    setSlotStart('');
    setServiceType('CHUA_RO');
    setSlotDate(todayVN());
  };

  if (!meta) return <Loading />;

  if (created) {
    return (
      <div className="stack" style={{ maxWidth: 760 }}>
        <PageHeader title="Đã đặt hộ lịch khám" />
        <Alert type="success" title={`Mã phiếu khám ${created.ticketCode}`}>
          {created.patient.fullName} — {fmtDateLong(created.slotDate)}, khung {shortTime(created.slotStart)}.{' '}
          {created.status === 'CHECKED_IN' ? 'Đã check-in và xếp vào hàng đợi.' : 'Phiếu ở trạng thái Chưa đến.'}
        </Alert>
        <div className="row">
          <Button icon="plus" onClick={reset}>
            Đặt hộ cho người khác
          </Button>
          <ButtonLink to="/hang-doi" variant="secondary">
            Mở hàng đợi
          </ButtonLink>
          <ButtonLink to="/lich-trong-ngay" variant="ghost">
            Về lịch trong ngày
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 960 }}>
      <PageHeader title="Đặt hộ tại quầy" subtitle={`Đặt từ hôm nay đến ${meta.counterMaxDays} ngày tới. Phiếu được ghi nguồn là đặt tại quầy.`} />
      <section className="card card-lg stack" aria-labelledby="b1">
        <h2 id="b1" style={{ fontSize: 24 }}>
          1. Bệnh nhân
        </h2>
        {patient ? (
          <div className="row-between">
            <div>
              <p style={{ fontWeight: 700, color: 'var(--ink-900)', fontSize: 20 }}>{patient.fullName}</p>
              <p className="caption mono">{[patient.patientCode, patient.birthYear && `SN ${patient.birthYear}`, patient.phone].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="row">
              <Link to={`/benh-nhan/${patient.id}`}>Xem hồ sơ</Link>
              <Button variant="secondary" size="sm" onClick={() => setPatient(null)}>
                Chọn người khác
              </Button>
            </div>
          </div>
        ) : (
          <PatientPicker onPick={setPatient} />
        )}
      </section>
      {patient && (
        <section className="card card-lg stack-lg" aria-labelledby="b2">
          <h2 id="b2" style={{ fontSize: 24 }}>
            2. Nội dung và giờ khám
          </h2>
          <ServicePicker options={meta.serviceTypes} value={serviceType} onChange={setServiceType} />
          <DatePicker
            value={slotDate}
            onChange={(d) => {
              setSlotDate(d);
              setSlotStart('');
            }}
            maxDays={meta.counterMaxDays}
          />
          <SlotPicker slots={avail.data?.slots} loading={avail.loading} value={slotStart} onChange={setSlotStart} error={error?.fields?.slotStart} />
          {isToday && (
            <label className="check">
              <input type="checkbox" checked={checkInNow} onChange={(e) => setCheckInNow(e.target.checked)} />
              Check-in ngay (bệnh nhân đang có mặt tại phòng khám)
            </label>
          )}
          {error && !error.fields?.slotStart && <ErrorAlert error={error} />}
          <Button size="lg" icon="check" loading={pending} onClick={submit} style={{ alignSelf: 'flex-start' }}>
            Đặt lịch khám
          </Button>
        </section>
      )}
    </div>
  );
}
