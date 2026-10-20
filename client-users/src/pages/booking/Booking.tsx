import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useEffect, useId, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Loading } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { CLINIC, addDays, fmtDate, genderLabel, relationshipLabel, shortTime, todayVN, weekday } from '@chuctu/shared/lib/format.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { Crumbs } from '../../components/PublicLayout.tsx';
import { FlowHead, Spinner, UDialog, UError } from '../../components/uparts.tsx';
import { ProfileDialog } from '../account/ProfileForm.tsx';
import { RelTag, maskPhone } from '../account/Profiles.tsx';
import type { Patient, Appointment, ServiceType, Slot } from '@chuctu/shared/types.ts';

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const dayLabel = (d: string) => `${fmtDate(d)} · ${weekday(d)}`;

function Aside() {
  return (
    <aside>
      <div className="u-side-card">
        <h2>Thông tin phòng khám</h2>
        <div>
          <div className="u-row" style={{ gap: 14, flexWrap: 'nowrap' }}>
            <img src="/logo.png" alt="" width={52} height={52} />
            <p style={{ margin: 0, fontSize: 18, lineHeight: '27px', fontWeight: 700, color: '#2a2118' }}>Phòng chẩn trị YHCT từ thiện Chúc Từ</p>
          </div>
          <div className="u-side-item">
            <Icon name="pin" size={22} />
            <p className="u-text" style={{ fontSize: 17, lineHeight: '27px' }}>
              {CLINIC.address}
            </p>
          </div>
          <div className="u-side-item">
            <Icon name="clockSoft" size={22} />
            <p className="u-text" style={{ fontSize: 17, lineHeight: '27px' }}>
              {CLINIC.hours} tất cả các ngày,
              <br />
              kể cả Chủ Nhật
            </p>
          </div>
          <div className="u-side-item">
            <Icon name="phone" size={22} />
            <a href={CLINIC.phoneHref} style={{ fontSize: 18, fontWeight: 700, color: '#2e5b37' }}>
              {CLINIC.phone}
            </a>
          </div>
          <p className="u-side-free">
            <Icon name="heartSoft" size={22} />
            Khám, trị liệu và thuốc đều miễn phí — 0 đồng.
          </p>
        </div>
      </div>
      <div className="u-help">
        <h2>Thấy khó điền?</h2>
        <p className="u-text" style={{ fontSize: 17, lineHeight: '27px' }}>
          Cô chú cứ gọi điện, nhân viên phòng khám sẽ hỏi và ghi giúp từ đầu đến cuối.
        </p>
        <a href={CLINIC.phoneHref} className="u-btn u-btn-ghost">
          <Icon name="phone" />
          Gọi {CLINIC.phone}
        </a>
      </div>
    </aside>
  );
}

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Lịch tháng để chọn ngày khám ngoài ba ngày gần nhất. */
function CalendarDialog({ value, maxDays, onPick, onClose }: { value: string; maxDays: number; onPick: (d: string) => void; onClose: () => void }) {
  const today = todayVN();
  const last = addDays(today, maxDays);
  const [month, setMonth] = useState((value || today).slice(0, 7));
  const [y, m] = month.split('-').map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array<null>(firstDow).fill(null), ...Array.from({ length: daysIn }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
  const shift = (n: number) => setMonth(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7));
  const canPrev = month > today.slice(0, 7);
  const canNext = month < last.slice(0, 7);
  const navStyle = (on: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 10,
    background: on ? 'rgba(255,255,255,0.2)' : 'transparent',
    border: `2px solid ${on ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)'}`,
    color: on ? '#fff' : 'rgba(255,255,255,0.4)',
    cursor: on ? 'pointer' : 'not-allowed',
  });
  return (
    <UDialog title="Chọn ngày khám" onClose={onClose} width={620}>
      <p className="u-ok" style={{ fontWeight: 400, color: '#4a3f33', border: 0, padding: '16px 18px', fontSize: 17 }}>
        <Icon name="infoSoft" />
        <span>
          <strong className="u-ink">Phòng khám Chúc Từ</strong> nhận đặt lịch trước từ hôm nay đến {fmtDate(last)}.
        </span>
      </p>
      <div style={{ border: '1px solid #e0d3bc', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ background: '#3b7145', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" aria-label="Tháng trước" style={navStyle(canPrev)} disabled={!canPrev} onClick={() => shift(-1)}>
            <Icon name="chevronLeft" />
          </button>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
            Tháng {m}/{y}
          </span>
          <button type="button" aria-label="Tháng sau" style={navStyle(canNext)} disabled={!canNext} onClick={() => shift(1)}>
            <Icon name="chevronRight" />
          </button>
        </div>
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
          {DOW.map((d) => (
            <span key={d} style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#6b5e4e', padding: '4px 0' }}>
              {d}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const ok = d >= today && d <= last;
            const on = d === value;
            const isToday = d === today;
            return (
              <button
                key={d}
                type="button"
                aria-label={`Ngày ${fmtDate(d)}${ok ? '' : ' — không nhận lịch'}`}
                aria-pressed={on}
                disabled={!ok}
                onClick={() => onPick(d)}
                style={{
                  minHeight: 54,
                  borderRadius: 10,
                  font: 'inherit',
                  fontSize: 18,
                  fontWeight: 600,
                  border: `2px solid ${on || isToday ? '#2e5b37' : 'transparent'}`,
                  background: on ? '#3b7145' : isToday ? '#fffcf6' : ok ? '#e4efe2' : '#f4eadb',
                  color: on ? '#fff' : ok ? '#2e5b37' : '#8c7b5e',
                  cursor: ok ? 'pointer' : 'not-allowed',
                }}
              >
                {Number(d.slice(8))}
              </button>
            );
          })}
        </div>
      </div>
      <button type="button" className="u-btn u-btn-ghost u-btn-block" onClick={onClose}>
        Đóng
      </button>
    </UDialog>
  );
}

function SlotGrid({ label, slots, value, onPick }: { label: string; slots: Slot[]; value: string; onPick: (s: string) => void }) {
  if (!slots.length) return null;
  return (
    <div className="u-field" style={{ gap: 12 }}>
      <span className="u-label" style={{ color: '#6b5e4e' }}>
        {label}
      </span>
      <div className="u-slots" role="radiogroup" aria-label={`Khung giờ ${label.toLowerCase()}`}>
        {slots.map((s) => (
          <button key={s.start} type="button" className="u-slot" aria-pressed={value === s.start} disabled={!s.available} onClick={() => onPick(s.start)}>
            {shortTime(s.start)}
            {!s.available ? <small>{s.reason || 'Đã đủ chỗ'}</small> : s.remaining <= 2 ? <small>Còn {s.remaining} chỗ</small> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Đặt lịch khám theo từng bước, cấp phiếu khám ngay (UC.6.1 – UC.6.3, UC.6.7). */
export default function Booking() {
  useDocumentTitle('Đặt lịch khám');
  const { meta, user } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rebookFromId = params.get('dat-lai');
  const serviceId = useId();
  const today = todayVN();

  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState<ServiceType>('CHUA_RO');
  const [slotDate, setSlotDate] = useState(today);
  const [slotStart, setSlotStart] = useState('');
  const [patientId, setPatientId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [slotFull, setSlotFull] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);

  const profiles = useAsync(() => api.get<{ items: Patient[]; max: number }>('/me/patients'), []);
  const availability = useAsync(() => api.get<{ date: string; slots: Slot[] }>(`/me/availability?date=${slotDate}`), [slotDate]);

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

  // Mặc định chọn hồ sơ của chính mình
  useEffect(() => {
    if (patientId || !profiles.data) return;
    const own = profiles.data.items.find((p) => p.relationship === 'BAN_THAN' && !p.isLocked);
    if (own) setPatientId(own.id);
  }, [profiles.data, patientId]);

  // Đổi ngày thì khung giờ đã chọn có thể không còn hợp lệ
  useEffect(() => {
    if (!availability.data || !slotStart) return;
    const s = availability.data.slots.find((x) => x.start === slotStart);
    if (!s?.available) setSlotStart('');
  }, [availability.data, slotStart]);

  const profileList = profiles.data?.items || [];
  const patient = profileList.find((p) => p.id === patientId);
  const service = meta?.serviceTypes.find((s) => s.value === serviceType);
  const slots = availability.data?.slots || [];
  const near = [0, 1, 2].map((i) => addDays(today, i));
  const otherDay = !near.includes(slotDate);

  const go = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const goStep2 = () => {
    if (!slotStart) {
      setErrors({ slotStart: 'Cô chú vui lòng chọn giờ khám dự kiến.' });
      return;
    }
    setErrors({});
    setNotice(null);
    go(2);
  };

  const goStep3 = () => {
    if (!patient) {
      setErrors({ patientId: 'Cô chú vui lòng chọn người đi khám.' });
      return;
    }
    setErrors({});
    setConfirmed(false);
    go(3);
  };

  const submit = async () => {
    if (!confirmed) {
      setErrors({ confirm: 'Cô chú đánh dấu xác nhận thông tin để đặt lịch.' });
      return;
    }
    setErrors({});
    setPending(true);
    setSubmitError(null);
    setSlotFull(null);
    try {
      const res = await api.post<{ appointment: Appointment }>('/me/appointments', { patientId, serviceType, slotDate, slotStart, rebookFromId });
      navigate(`/phieu-kham/${res.appointment.id}?moi=1`, { replace: true });
    } catch (err) {
      // Khung giờ vừa đủ chỗ: báo ngay ở bước xác nhận, có nút chọn lại (BR.15)
      const apiErr = err as ApiError;
      if (apiErr.code === 'SLOT_FULL' || apiErr.code === 'SLOT_UNAVAILABLE') {
        setSlotFull(apiErr.message);
        availability.reload({ silent: true });
      } else {
        setSubmitError(apiErr);
      }
    } finally {
      setPending(false);
    }
  };

  if (!meta) return <Loading />;

  const titles = ['Chọn thông tin khám', 'Chọn hồ sơ người khám', 'Xác nhận thông tin'];
  const morning = slots.filter((s) => s.start < '12:00');
  const afternoon = slots.filter((s) => s.start >= '12:00');

  return (
    <>
      <Crumbs items={[{ label: 'Dịch vụ khám', to: '/dich-vu' }, { label: 'Đặt lịch khám' }]} />
      <section className="u-section" style={{ paddingTop: 32 }}>
        <div className="u-wrap u-book">
          <Aside />
          <div className="u-flow">
            <FlowHead title={titles[step - 1]} step={step} onBack={() => (step === 1 ? navigate(-1) : go(step - 1))} />
            {step === 1 && (
              <div className="u-flow-body" style={{ padding: 32, gap: 28 }}>
                {notice && (
                  <p className="u-ok" style={{ fontWeight: 600 }}>
                    <Icon name="refresh" />
                    {notice}
                  </p>
                )}
                <div className="u-field" style={{ gap: 10 }}>
                  <label className="u-label" htmlFor={serviceId}>
                    Khám về việc gì?<span className="u-req"> *</span>
                  </label>
                  <select id={serviceId} className="u-select" style={{ minHeight: 68, fontSize: 19 }} value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
                    {meta.serviceTypes.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="u-field" style={{ gap: 12 }}>
                  <span className="u-label">
                    Ngày khám<span className="u-req"> *</span>
                  </span>
                  <div className="u-day-cards" role="radiogroup" aria-label="Chọn ngày khám">
                    {near.map((d, i) => (
                      <button key={d} type="button" className="u-day" aria-pressed={slotDate === d} onClick={() => setSlotDate(d)}>
                        <b>{ddmm(d)}</b>
                        <small>{i === 0 ? `Hôm nay · ${weekday(d)}` : weekday(d)}</small>
                      </button>
                    ))}
                    <button type="button" className="u-day" aria-pressed={otherDay} onClick={() => setCalOpen(true)}>
                      {otherDay ? <b>{ddmm(slotDate)}</b> : <Icon name="calendar" size={26} />}
                      <small style={{ fontWeight: 600, color: '#2e5b37', fontSize: 17 }}>Ngày khác</small>
                    </button>
                  </div>
                  <p className="u-text" style={{ fontSize: 17 }}>
                    Đang chọn: <strong className="u-green">{dayLabel(slotDate)}</strong>
                  </p>
                </div>
                <div className="u-field" style={{ gap: 16 }}>
                  <span className="u-label">
                    Giờ khám dự kiến<span className="u-req"> *</span>
                  </span>
                  {availability.loading && !availability.data ? (
                    <Loading label="Đang xem khung giờ còn chỗ…" />
                  ) : (
                    <>
                      <SlotGrid label="Buổi sáng" slots={morning} value={slotStart} onPick={setSlotStart} />
                      <SlotGrid label="Buổi chiều" slots={afternoon} value={slotStart} onPick={setSlotStart} />
                    </>
                  )}
                  <UError>{errors.slotStart}</UError>
                  <p style={{ margin: 0, fontSize: 17, lineHeight: '27px', fontWeight: 600, color: '#8a6012' }}>
                    Phòng khám nhận bệnh {CLINIC.hours}, giờ Việt Nam (GMT+7). Cô chú chọn giờ dự kiến mình sẽ đến. Khung màu xám là khung đã đủ chỗ hoặc đã bắt đầu, cô chú chọn khung khác.
                  </p>
                </div>
                <div className="u-warn">
                  <Icon name="ticket" />
                  <p style={{ margin: 0 }}>
                    Đặt lịch xong là cô chú <strong className="u-green">có ngay phiếu khám</strong> kèm mã phiếu khám và giờ khám dự kiến. Ngày khám cô chú chỉ cần đưa phiếu khám cho tiếp tân.
                  </p>
                </div>
                <div className="u-stack" style={{ gap: 12, alignItems: 'center' }}>
                  <button type="button" className="u-btn u-btn-primary u-btn-xl u-btn-block" onClick={goStep2}>
                    {slotStart ? `Tiếp tục với khung ${shortTime(slotStart)}` : 'Tiếp tục'}
                    <Icon name="arrowRight" />
                  </button>
                  <Link to="/phieu-kham" className="u-link" style={{ fontSize: 18 }}>
                    Xem phiếu khám bệnh
                  </Link>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="u-flow-body">
                <div className="u-head">
                  <div>
                    <h2 className="u-h2" style={{ fontSize: 26, lineHeight: '36px' }}>
                      Danh sách hồ sơ
                    </h2>
                    <p className="u-text u-muted" style={{ fontSize: 17 }}>
                      Cô chú bấm chọn người đi khám. Đang có <strong className="u-ink">{profileList.length} hồ sơ</strong> trên tổng số {profiles.data?.max || 10}.
                    </p>
                  </div>
                  <button type="button" className="u-btn u-btn-primary u-btn-lg" disabled={profileList.length >= (profiles.data?.max || 10)} onClick={() => setProfileOpen(true)}>
                    <Icon name="plus" />
                    Thêm hồ sơ
                  </button>
                </div>
                {profiles.loading && <Loading />}
                <div className="u-pick-list" role="radiogroup" aria-label="Chọn người đi khám">
                  {profileList.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={patientId === p.id}
                      className="u-pick"
                      disabled={p.isLocked}
                      style={p.isLocked ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                      onClick={() => setPatientId(p.id)}
                    >
                      <span className="u-pick-dot" aria-hidden="true">
                        {patientId === p.id && <Icon name="check" size={18} strokeWidth={3} />}
                      </span>
                      <span className="u-pick-body">
                        <span className="u-row" style={{ gap: 10 }}>
                          <span>
                            Họ và tên: <strong className="u-pick-name">{p.fullName}</strong>
                          </span>
                          <RelTag p={p} />
                        </span>
                        <span>
                          Số điện thoại: <strong>{maskPhone(p.phone)}</strong>
                        </span>
                        <span>
                          Ngày sinh: <strong>{p.dob ? fmtDate(p.dob.slice(0, 10)) : p.birthYear || 'Chưa cập nhật'}</strong>
                        </span>
                        <span>
                          Địa chỉ: {p.address ? <strong>{p.address}</strong> : <em className="u-muted">Chưa cập nhật</em>}
                        </span>
                        {p.isLocked && <span style={{ color: '#90372a', fontWeight: 600 }}>Hồ sơ đang bị khoá, không đặt lịch được.</span>}
                      </span>
                    </button>
                  ))}
                </div>
                <UError>{errors.patientId}</UError>
                {patient && (
                  <p className="u-ok" role="status" style={{ border: 0, fontWeight: 400, padding: '16px 20px' }}>
                    <Icon name="checkCircle" />
                    <span>
                      Đang chọn người đi khám: <strong>{patient.fullName}</strong>
                    </span>
                  </p>
                )}
                <div className="u-actions">
                  <button type="button" className="u-btn u-btn-ghost u-btn-xl back" onClick={() => go(1)}>
                    <Icon name="arrowLeft" />
                    Quay lại
                  </button>
                  <button type="button" className="u-btn u-btn-primary u-btn-xl grow" onClick={goStep3}>
                    Tiếp tục
                    <Icon name="arrowRight" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && patient && (
              <div className="u-flow-body">
                <p className="u-text" style={{ fontSize: 19, lineHeight: '31px' }}>
                  Cô chú xem lại một lượt cho chắc. Chỗ nào chưa đúng thì bấm <strong className="u-green">Quay lại</strong> ở cuối trang để sửa.
                </p>
                <Summary
                  icon="calendar"
                  title="Buổi khám"
                  rows={[
                    ['Khám về việc gì', service?.label],
                    ['Ngày khám', dayLabel(slotDate)],
                    ['Giờ khám dự kiến', shortTime(slotStart)],
                    ['Nơi khám', `Phòng khám Chúc Từ — ${CLINIC.address}`],
                  ]}
                />
                <Summary
                  icon="user"
                  title="Người đi khám"
                  rows={[
                    ['Họ và tên', patient.fullName],
                    ['Số điện thoại', patient.phone || user?.phone],
                    ['Năm sinh · Giới tính', [patient.birthYear, genderLabel(patient.gender)].filter(Boolean).join(' · ')],
                    ['Hồ sơ', `${patient.relationship === 'BAN_THAN' ? 'Đặt cho mình' : `Đặt cho ${relationshipLabel(patient.relationship)?.toLowerCase() || 'người thân'}`} — hồ sơ ${patient.patientCode}`],
                  ]}
                />
                <Summary
                  icon="phone"
                  title="Người đặt — phòng khám gọi lại theo số này"
                  rows={[
                    ['Họ và tên', user?.fullName],
                    ['Số điện thoại', user?.phone],
                  ]}
                />
                <div className="u-warn">
                  <Icon name="ticket" />
                  <p style={{ margin: 0 }}>
                    Đặt xong, cô chú <strong className="u-green">có ngay phiếu khám</strong> kèm mã phiếu khám và giờ khám dự kiến. Cô chú muốn đổi ý thì huỷ phiếu khám ngay trong mục Phiếu khám bệnh.
                  </p>
                </div>
                <div className="u-field">
                  <label className="u-check">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                    <span>Tôi xác nhận những thông tin trên là đúng, và đồng ý để phòng khám dùng thông tin này cho việc khám chữa bệnh.</span>
                  </label>
                  <UError>{errors.confirm}</UError>
                </div>
                {slotFull && (
                  <div role="alert" className="u-alert" style={{ flexWrap: 'wrap', alignItems: 'center', background: '#f6e0dc', fontWeight: 400, color: '#2a2118' }}>
                    <p style={{ margin: 0, flex: '1 1 320px' }}>
                      <strong>
                        Khung {shortTime(slotStart)} ngày {fmtDate(slotDate)} vừa đủ người đặt.
                      </strong>{' '}
                      {slotFull} Cô chú vui lòng chọn lại ngày hoặc khung giờ khác.
                    </p>
                    <button
                      type="button"
                      className="u-btn u-btn-primary"
                      onClick={() => {
                        setSlotFull(null);
                        setSlotStart('');
                        go(1);
                      }}
                    >
                      Chọn lại ngày và giờ
                    </button>
                  </div>
                )}
                <UError>{submitError?.message}</UError>
                <div className="u-actions">
                  <button type="button" className="u-btn u-btn-ghost u-btn-xl back" onClick={() => go(2)}>
                    <Icon name="arrowLeft" />
                    Quay lại
                  </button>
                  <button type="button" className="u-btn u-btn-primary u-btn-xl grow" disabled={pending} onClick={submit}>
                    {pending ? <Spinner /> : <Icon name="check" />}
                    Đặt lịch khám
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {calOpen && (
        <CalendarDialog
          value={slotDate}
          maxDays={meta.userMaxDays}
          onClose={() => setCalOpen(false)}
          onPick={(d) => {
            setSlotDate(d);
            setCalOpen(false);
          }}
        />
      )}
      {profileOpen && (
        <ProfileDialog
          onClose={() => setProfileOpen(false)}
          onSaved={async (p) => {
            setProfileOpen(false);
            await profiles.reload({ silent: true });
            setPatientId(p.id);
          }}
        />
      )}
    </>
  );
}

function Summary({ icon, title, rows }: { icon: 'calendar' | 'user' | 'phone'; title: string; rows: [string, string | number | null | undefined][] }) {
  return (
    <div className="u-sum">
      <div className="u-sum-head">
        <span className="u-icon-dot" aria-hidden="true">
          <Icon name={icon} size={20} />
        </span>
        <h2>{title}</h2>
      </div>
      <dl className="u-dl" style={{ margin: 0 }}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v || 'Chưa cập nhật'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
