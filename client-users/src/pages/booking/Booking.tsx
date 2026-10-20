import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Alert, Breadcrumb, Button, ErrorAlert, Loading } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { CLINIC, ageFrom, fmtDateLong, slotLabel, relationshipLabel } from '@chuctu/shared/lib/format.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { ProfileFields, profilePayload, type ProfileFormValues } from '../account/ProfileForm.tsx';
import { DatePicker, ServicePicker, SlotPicker } from '@chuctu/shared/components/pickers.tsx';
import type { Patient, Appointment, ServiceType, Slot } from '@chuctu/shared/types.ts';

const STEPS = ['Thông tin khám', 'Người đi khám', 'Xác nhận', 'Phiếu khám'];

export function BookingStepper({ current }: { current: number }) {
  return (
    <ol className="stepper" aria-label="Các bước đặt lịch">
      {STEPS.map((label, i) => {
        const n = i + 1;
        return (
          <li key={label} aria-current={n === current ? 'step' : undefined} className={n < current ? 'done' : ''}>
            <span className="dot">{n < current ? <Icon name="check" size={20} /> : n}</span>
            <span>
              <span className="sr-only">Bước {n}: </span>
              {label}
              {n < current && <span className="sr-only"> (đã xong)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function HelpCard() {
  return (
    <aside className="stack">
      <div className="card stack-sm">
        <h3>Thông tin phòng khám</h3>
        <p className="small row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <Icon name="map" size={20} />
          {CLINIC.address}
        </p>
        <p className="small row" style={{ gap: 8 }}>
          <Icon name="clock" size={20} />
          {CLINIC.hours} tất cả các ngày, kể cả Chủ Nhật
        </p>
        <p className="small row" style={{ gap: 8 }}>
          <Icon name="heart" size={20} />
          Khám, trị liệu và thuốc đều miễn phí — 0 đồng.
        </p>
      </div>
      <div className="card card-gold stack-sm">
        <h3>Thấy khó điền?</h3>
        <p className="small">Cô chú cứ gọi điện, nhân viên phòng khám sẽ hỏi và ghi giúp từ đầu đến cuối.</p>
        <a href={CLINIC.phoneHref} className="btn btn-secondary btn-block">
          <Icon name="phone" />
          Gọi {CLINIC.phone}
        </a>
      </div>
    </aside>
  );
}

/** Đặt lịch khám theo từng bước, cấp phiếu khám ngay (UC.6.1 – UC.6.3, UC.6.7). */
export default function Booking() {
  useDocumentTitle('Đặt lịch khám');
  const { meta } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rebookFromId = params.get('dat-lai');

  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');
  const [slotDate, setSlotDate] = useState('');
  const [slotStart, setSlotStart] = useState('');
  const [patientId, setPatientId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [newProfile, setNewProfile] = useState<ProfileFormValues | null>(null);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);

  const profiles = useAsync(() => api.get<{ items: Patient[]; max: number }>('/me/patients'), []);
  const availability = useAsync(() => (slotDate ? api.get<{ date: string; slots: Slot[] }>(`/me/availability?date=${slotDate}`) : Promise.resolve(null)), [slotDate]);

  // Đặt lại từ phiếu đã huỷ: điền sẵn nội dung khám và người đi khám
  useEffect(() => {
    if (!rebookFromId) return;
    api
      .get<{ appointment: Appointment }>(`/me/appointments/${rebookFromId}`)
      .then(({ appointment }) => {
        setServiceType(appointment.serviceType);
        setPatientId(appointment.patient?.id || '');
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

  const profileList = profiles.data?.items || [];
  const patient = profileList.find((p) => p.id === patientId);
  const service = meta?.serviceTypes.find((s) => s.value === serviceType);

  const goStep2 = () => {
    const e: Record<string, string> = {};
    if (!serviceType) e.serviceType = 'Cô chú vui lòng chọn nội dung khám.';
    if (!slotDate) e.slotDate = 'Cô chú vui lòng chọn ngày khám.';
    if (!slotStart) e.slotStart = 'Cô chú vui lòng chọn giờ khám.';
    setErrors(e);
    if (!Object.keys(e).length) {
      setStep(2);
      setNotice(null);
      window.scrollTo(0, 0);
    }
  };

  const goStep3 = async () => {
    if (newProfile) {
      setPending(true);
      setSubmitError(null);
      try {
        const res = await api.post<{ patient: Patient }>('/me/patients', profilePayload(newProfile));
        await profiles.reload({ silent: true });
        setPatientId(res.patient.id);
        setNewProfile(null);
        setStep(3);
      } catch (err) {
        setSubmitError(err as ApiError);
      } finally {
        setPending(false);
      }
      return;
    }
    if (!patientId) {
      setErrors({ patientId: 'Cô chú vui lòng chọn người đi khám.' });
      return;
    }
    setErrors({});
    setStep(3);
    window.scrollTo(0, 0);
  };

  const submit = async () => {
    setPending(true);
    setSubmitError(null);
    try {
      const res = await api.post<{ appointment: Appointment }>('/me/appointments', { patientId, serviceType, slotDate, slotStart, rebookFromId });
      navigate(`/phieu-kham/${res.appointment.id}?moi=1`, { replace: true });
    } catch (err) {
      // Khung giờ vừa đủ chỗ: quay về bước chọn giờ (BR.15)
      const apiErr = err as ApiError;
      if (apiErr.code === 'SLOT_FULL' || apiErr.code === 'SLOT_UNAVAILABLE') {
        setStep(1);
        setSlotStart('');
        setNotice(null);
        setErrors({ slotStart: apiErr.message });
        availability.reload();
      } else {
        setSubmitError(err as ApiError);
      }
    } finally {
      setPending(false);
    }
  };

  if (!meta) return <Loading />;

  return (
    <div className="page">
      <div className="container">
        <Breadcrumb items={[{ to: '/', label: 'Trang chủ' }, { to: '/dich-vu', label: 'Dịch vụ khám' }, { label: 'Đặt lịch khám' }]} />
        <div className="layout-aside">
          <div className="stack">
            <BookingStepper current={step} />
            {notice && <Alert type="info">{notice}</Alert>}

            {step === 1 && (
              <div className="card card-lg stack-lg">
                <h1 style={{ fontSize: 28, lineHeight: '38px' }}>Chọn thông tin khám</h1>
                <ServicePicker options={meta.serviceTypes} value={serviceType} onChange={setServiceType} error={errors.serviceType} />
                <div className="stack-sm">
                  <DatePicker value={slotDate} onChange={setSlotDate} maxDays={meta.userMaxDays} />
                  {errors.slotDate && (
                    <span className="field-error" role="alert">
                      <Icon name="alert" size={20} />
                      {errors.slotDate}
                    </span>
                  )}
                </div>
                {slotDate && (
                  <SlotPicker slots={availability.data?.slots} loading={availability.loading} value={slotStart} onChange={setSlotStart} error={errors.slotStart} />
                )}
                <Alert type="info">
                  Phòng khám nhận bệnh {CLINIC.hours}, giờ Việt Nam. Cô chú chọn giờ dự kiến mình sẽ đến. Khung màu xám là khung đã đủ chỗ hoặc đã bắt đầu.
                </Alert>
                <Button size="lg" onClick={goStep2} className="btn-mobile-block" style={{ alignSelf: 'flex-start' }}>
                  Tiếp theo: chọn người đi khám
                  <Icon name="arrowRight" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="card card-lg stack">
                <h1 style={{ fontSize: 28, lineHeight: '38px' }}>Ai đi khám?</h1>
                {profiles.loading && <Loading />}
                {!newProfile && (
                  <div className="choice-grid" role="radiogroup" aria-label="Người đi khám">
                    {profileList.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={patientId === p.id}
                        className="choice choice-left"
                        disabled={p.isLocked}
                        onClick={() => setPatientId(p.id)}
                      >
                        <Icon name={p.isLocked ? 'lock' : 'user'} />
                        <span className="stack-sm" style={{ gap: 2 }}>
                          <span>
                            {p.fullName} — {relationshipLabel(p.relationship) || 'Chưa khai quan hệ'}
                          </span>
                          <span className="choice-sub">
                            {p.isLocked ? 'Hồ sơ đang bị khoá, không đặt lịch được' : [p.birthYear && `${ageFrom(p.birthYear)} tuổi`, p.patientCode].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {errors.patientId && (
                  <span className="field-error" role="alert">
                    <Icon name="alert" size={20} />
                    {errors.patientId}
                  </span>
                )}
                {newProfile ? (
                  <div className="card card-tint stack">
                    <h3>Người khám mới</h3>
                    <ProfileFields form={newProfile} setForm={(u) => setNewProfile((f) => (f ? u(f) : f))} errors={submitError?.fields} />
                    <Button variant="ghost" onClick={() => setNewProfile(null)} style={{ alignSelf: 'flex-start' }}>
                      Thôi, chọn người có sẵn
                    </Button>
                  </div>
                ) : (
                  profileList.length < (meta.maxProfiles || 10) && (
                    <Button
                      variant="secondary"
                      icon="plus"
                      style={{ alignSelf: 'flex-start' }}
                      onClick={() => {
                        setPatientId('');
                        setNewProfile({ fullName: '', phone: '', dob: '', gender: '', relationship: '', address: '' });
                      }}
                    >
                      Thêm người khám mới
                    </Button>
                  )
                )}
                {submitError && !Object.keys(submitError.fields || {}).length && <ErrorAlert error={submitError} />}
                <div className="row">
                  <Button variant="ghost" icon="arrowLeft" onClick={() => setStep(1)}>
                    Quay lại
                  </Button>
                  <Button size="lg" loading={pending} onClick={goStep3}>
                    Tiếp theo: xem lại
                    <Icon name="arrowRight" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="card card-lg stack">
                <h1 style={{ fontSize: 28, lineHeight: '38px' }}>Xem lại trước khi đặt lịch</h1>
                <dl className="info">
                  <dt>Nội dung khám</dt>
                  <dd>{service?.label}</dd>
                  <dt>Ngày khám</dt>
                  <dd>{fmtDateLong(slotDate)}</dd>
                  <dt>Giờ khám dự kiến</dt>
                  <dd>{slotLabel(slotStart)}</dd>
                  <dt>Người đi khám</dt>
                  <dd>
                    {patient?.fullName} ({relationshipLabel(patient?.relationship)})
                  </dd>
                </dl>
                <Alert type="info">
                  Đặt lịch xong là cô chú có ngay phiếu khám kèm mã phiếu khám. Ngày khám chỉ cần đưa phiếu khám cho tiếp tân.
                </Alert>
                <ErrorAlert error={submitError} />
                <div className="row">
                  <Button variant="ghost" icon="arrowLeft" onClick={() => setStep(2)}>
                    Sửa lại
                  </Button>
                  <Button size="lg" icon="check" loading={pending} onClick={submit}>
                    Đặt lịch khám
                  </Button>
                </div>
              </div>
            )}
          </div>
          <HelpCard />
        </div>
      </div>
    </div>
  );
}
