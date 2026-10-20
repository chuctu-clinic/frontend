import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api, type ApiError } from '@chuctu/shared/lib/api.ts';
import { GENDERS, ageFrom, fmtDate, fmtDateLong, genderLabel, slotLabel } from '@chuctu/shared/lib/format.ts';
import { isAdmin, useSession } from '@chuctu/shared/lib/session.tsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { Appointment, MedicalRecord, Patient } from '@chuctu/shared/types.ts';
import { NbError, NbField, NbLoading, NbModal, NbOk, NbPhone, NbStatus } from '../../components/nb.tsx';
import { RecordSheetView } from '../../components/RecordSheet.tsx';

type Detail = { patient: Patient; appointments: Appointment[]; records: MedicalRecord[] };

/** Sửa thông tin hồ sơ; mã bệnh nhân không đổi (UC.9.5). */
function EditPatientModal({ patient, onClose, onSaved }: { patient: Patient; onClose: () => void; onSaved: (p: Patient) => void }) {
  const [form, setForm] = useState({
    fullName: patient.fullName,
    birthYear: patient.birthYear ? String(patient.birthYear) : '',
    phone: patient.phone || '',
    gender: patient.gender || '',
    address: patient.address || '',
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (form.fullName.trim().length < 2) fe.fullName = 'Vui lòng nhập họ và tên (ít nhất 2 ký tự).';
    if (!/^\d{4}$/.test(form.birthYear)) fe.birthYear = 'Nhập năm sinh gồm 4 chữ số, ví dụ 1952.';
    if (!/^0\d{9}$/.test(form.phone)) fe.phone = 'Số điện thoại gồm 9 số sau +84.';
    setFields(fe);
    if (Object.keys(fe).length) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.patch<{ patient: Patient }>(`/staff/patients/${patient.id}`, {
        fullName: form.fullName.trim(),
        birthYear: Number(form.birthYear),
        phone: form.phone,
        gender: form.gender || null,
        address: form.address || null,
      });
      onSaved(res.patient);
    } catch (err) {
      const apiErr = err as ApiError;
      setFields(apiErr.fields);
      setError(apiErr);
    } finally {
      setPending(false);
    }
  };

  return (
    <NbModal title="Sửa thông tin hồ sơ" onClose={onClose} width={640}>
      <form className="nb-stack" style={{ gap: 20 }} onSubmit={submit} noValidate>
        <p>
          Mã bệnh nhân <strong className="nb-ink">{patient.patientCode}</strong> được cấp một lần và không đổi.
        </p>
        <NbField label="Họ và tên" required error={fields.fullName}>
          {(a) => <input className="nb-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} {...a} />}
        </NbField>
        <div className="nb-form-row">
          <NbField label="Năm sinh" required error={fields.birthYear}>
            {(a) => <input className="nb-input" inputMode="numeric" maxLength={4} value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value.replace(/\D/g, '') })} {...a} />}
          </NbField>
          <NbField label="Số điện thoại" required error={fields.phone}>
            {(a) => <NbPhone value={form.phone} onChange={(phone) => setForm({ ...form, phone })} {...a} />}
          </NbField>
        </div>
        <div className="nb-form-row">
          <NbField label="Giới tính" error={fields.gender}>
            {(a) => (
              <select className="nb-select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} {...a}>
                <option value="">Chưa cập nhật</option>
                {Object.entries(GENDERS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            )}
          </NbField>
          <NbField label="Địa chỉ" error={fields.address}>
            {(a) => <input className="nb-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} {...a} />}
          </NbField>
        </div>
        <NbError error={error && !Object.keys(error.fields).length ? error : null} />
        <div className="nb-dialog-actions">
          <button type="submit" className="nb-btn nb-btn-primary" style={{ padding: '0 26px' }} disabled={pending}>
            Lưu thay đổi
          </button>
          <button type="button" className="nb-btn nb-btn-ghost" onClick={onClose}>
            Huỷ
          </button>
        </div>
      </form>
    </NbModal>
  );
}

/** Dữ liệu phiếu in từ phiếu kết quả đã lưu. */
export function sheetFrom(r: MedicalRecord, p: Pick<Patient, 'fullName' | 'patientCode' | 'birthYear' | 'phone'> | null) {
  return {
    visitDate: r.visitDate,
    patientName: r.patient?.fullName ?? p?.fullName ?? '',
    patientCode: r.patient?.patientCode ?? p?.patientCode,
    birthYear: p?.birthYear,
    phone: p?.phone,
    diagnosis: r.diagnosis,
    pulse: r.pulse,
    bloodPressure: r.bloodPressure,
    acupuncture: r.treatmentNotes.acupuncture,
    acupressure: r.treatmentNotes.acupressure,
    other: r.treatmentNotes.other,
    medicalHistory: r.medicalHistory,
    followUpDate: r.followUpDate,
    doctorName: r.doctorName,
  };
}

const ACTIVE = new Set(['BOOKED', 'CHECKED_IN', 'IN_PROGRESS']);

/** Hồ sơ chi tiết, phiếu khám đang chờ, lịch sử khám, khoá/mở khoá (UC.9.3, UC.9.5, UC.9.6, UC.9.8). */
export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useSession();
  const { data, loading, error, setData } = useAsync(() => api.get<Detail>(`/staff/patients/${id}`), [id]);
  const [editing, setEditing] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [viewing, setViewing] = useState<MedicalRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [lockError, setLockError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useDocumentTitle(data?.patient?.fullName || 'Hồ sơ bệnh nhân');

  const p = data?.patient;

  const toggleLock = async () => {
    if (!p) return;
    setPending(true);
    setLockError(null);
    try {
      const res = await api.post<{ patient: Patient }>(`/admin/patients/${p.id}/${p.isLocked ? 'unlock' : 'lock'}`);
      setData((d) => (d ? { ...d, patient: res.patient } : d));
      setNotice(res.patient.isLocked ? 'Đã khoá hồ sơ.' : 'Đã mở khoá hồ sơ.');
      setLockOpen(false);
    } catch (err) {
      setLockError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  if (loading) return <NbLoading />;
  if (error || !data || !p) return <NbError error={error} />;

  const upcoming = data.appointments.filter((a) => ACTIVE.has(a.status)).sort((a, b) => (a.slotDate + a.slotStart).localeCompare(b.slotDate + b.slotStart));
  const lastVisit = data.records[0]?.visitDate;

  return (
    <>
      <Link to="/benh-nhan" className="nb-link" style={{ alignSelf: 'flex-start' }}>
        <Icon name="arrowLeft" size={20} />
        Quay lại danh sách hồ sơ
      </Link>
      {notice && <NbOk onClose={() => setNotice(null)}>{notice}</NbOk>}

      <div className="nb-card nb-card-lg nb-profile">
        <span className="nb-avatar">
          <Icon name="user" size={36} />
        </span>
        <div>
          <p className="nb-eyebrow">Hồ sơ bệnh nhân {p.patientCode}</p>
          <h1 className="nb-h1">{p.fullName}</h1>
          <div className="nb-row" style={{ gap: 10 }}>
            {p.isLocked ? (
              <span className="nb-pill nb-pill-done" style={{ padding: '2px 12px' }}>
                <Icon name="lock" size={18} />
                Hồ sơ đã khoá
              </span>
            ) : (
              <span className="nb-pill nb-pill-green" style={{ padding: '4px 12px' }}>
                <Icon name="check" size={18} />
                Hồ sơ đang hoạt động
              </span>
            )}
          </div>
        </div>
        <div className="nb-row" style={{ flex: '0 1 auto' }}>
          {!p.isLocked && (
            <>
              <Link to={`/lich-trong-ngay?them=1&benh-nhan=${p.id}`} className="nb-btn nb-btn-primary" style={{ padding: '0 18px' }}>
                <Icon name="calendarPlus" />
                Đặt lịch khám
              </Link>
              <button type="button" className="nb-btn nb-btn-ghost" style={{ padding: '0 18px' }} onClick={() => setEditing(true)}>
                <Icon name="edit" />
                Sửa thông tin
              </button>
            </>
          )}
          {isAdmin(user) && (
            <button type="button" className={`nb-btn ${p.isLocked ? 'nb-btn-ghost' : 'nb-btn-gold'}`} style={{ padding: '0 18px' }} onClick={() => setLockOpen(true)}>
              <Icon name={p.isLocked ? 'unlock' : 'lock'} />
              {p.isLocked ? 'Mở khoá hồ sơ' : 'Khoá hồ sơ'}
            </button>
          )}
        </div>
      </div>

      {p.isLocked && (
        <div className="nb-note" role="note">
          <Icon name="lock" />
          <div className="nb-stack-sm" style={{ gap: 4 }}>
            <p className="nb-h3">Hồ sơ này đã khoá</p>
            <p>
              Không chọn được khi đặt lịch khám, không ghi nhận lượt khám mới, không sửa thông tin và không sửa phiếu kết quả. Lịch sử khám vẫn xem được.
              {isAdmin(user) ? ' Bấm Mở khoá hồ sơ để dùng lại.' : (
                <>
                  {' '}
                  Hồ sơ do Admin khoá, muốn dùng lại thì liên hệ <strong>Admin</strong> để mở khoá.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      <section className="nb-card nb-card-lg" aria-labelledby="tt-tieude" style={{ gap: 14 }}>
        <h2 id="tt-tieude" className="nb-h2">
          Thông tin hồ sơ
        </h2>
        <dl className="nb-dl">
          <div>
            <dt>Mã bệnh nhân</dt>
            <dd style={{ fontWeight: 700 }}>{p.patientCode}</dd>
          </div>
          <div>
            <dt>Họ và tên</dt>
            <dd>{p.fullName}</dd>
          </div>
          <div>
            <dt>Năm sinh</dt>
            <dd>
              {p.birthYear ?? '—'} {p.birthYear && <span className="nb-muted">({ageFrom(p.birthYear)} tuổi)</span>}
            </dd>
          </div>
          <div>
            <dt>Giới tính</dt>
            <dd>{genderLabel(p.gender) || 'Chưa cập nhật'}</dd>
          </div>
          <div>
            <dt>Số điện thoại</dt>
            <dd>{p.phone || '—'}</dd>
          </div>
          <div>
            <dt>Địa chỉ</dt>
            <dd>{p.address || 'Chưa cập nhật'}</dd>
          </div>
          <div>
            <dt>Hồ sơ tạo ngày</dt>
            <dd>{fmtDate(p.createdAt)}</dd>
          </div>
          <div>
            <dt>Lần khám gần nhất</dt>
            <dd>{lastVisit ? fmtDateLong(lastVisit) : 'Chưa khám lần nào'}</dd>
          </div>
        </dl>
      </section>

      <section className="nb-card nb-card-lg" aria-labelledby="ve-tieude">
        <h2 id="ve-tieude" className="nb-h2">
          Phiếu khám hôm nay và sắp tới
        </h2>
        {upcoming.length === 0 ? (
          <p>Hồ sơ này chưa có phiếu khám nào đang chờ.</p>
        ) : (
          <div className="nb-inner-table nb-table-wrap">
            <div className="nb-table" role="table" aria-label="Phiếu khám chưa hoàn thành">
              <div className="nb-tr nb-thead" role="row" style={{ ['--cols' as string]: 'minmax(0, 1fr) 190px 210px', borderTop: 0 }}>
                {['Mã phiếu khám', 'Trạng thái', 'Thao tác'].map((h) => (
                  <div key={h} className="nb-th" role="columnheader" style={{ padding: '12px 16px' }}>
                    {h}
                  </div>
                ))}
              </div>
              {upcoming.map((a) => (
                <div key={a.id} className="nb-tr" role="row" style={{ ['--cols' as string]: 'minmax(0, 1fr) 190px 210px' }}>
                  <div className="nb-td" role="cell" style={{ padding: '14px 16px' }}>
                    <span className="nb-strong">{a.ticketCode}</span>
                    <span className="nb-sub">
                      {slotLabel(a.slotStart)}, {fmtDateLong(a.slotDate)} · {a.serviceLabel}
                    </span>
                  </div>
                  <div className="nb-td" role="cell" style={{ padding: '14px 16px' }}>
                    <NbStatus status={a.status} />
                  </div>
                  <div className="nb-td" role="cell" style={{ padding: '10px 16px' }}>
                    {a.status === 'IN_PROGRESS' ? (
                      <Link to={`/phieu-kham/${a.id}/ket-qua`} className="nb-btn nb-btn-primary nb-btn-sm">
                        Ghi nhận lượt khám
                      </Link>
                    ) : a.status === 'CHECKED_IN' ? (
                      <span className="nb-muted">Chờ vào phòng khám</span>
                    ) : (
                      <span className="nb-muted">Chờ bệnh nhân đến</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="nb-card nb-card-lg" aria-labelledby="ls-tieude">
        <h2 id="ls-tieude" className="nb-h2">
          Lịch sử khám
        </h2>
        {data.records.length === 0 ? (
          <p>Hồ sơ này chưa có lượt khám nào.</p>
        ) : (
          <div className="nb-inner-table nb-table-wrap">
            <div className="nb-table" role="table" aria-label="Lịch sử khám của hồ sơ">
              <div className="nb-tr nb-thead" role="row" style={{ ['--cols' as string]: '200px minmax(0, 1fr) 160px 230px', borderTop: 0 }}>
                {['Ngày khám', 'Chẩn đoán', 'Người ghi nhận', 'Phiếu kết quả'].map((h) => (
                  <div key={h} className="nb-th" role="columnheader" style={{ padding: '12px 16px' }}>
                    {h}
                  </div>
                ))}
              </div>
              {data.records.map((r) => (
                <div key={r.id} className="nb-tr" role="row" style={{ ['--cols' as string]: '200px minmax(0, 1fr) 160px 230px' }}>
                  <div className="nb-td" role="cell" style={{ padding: '14px 16px' }}>
                    <span className="nb-strong" style={{ fontWeight: 600 }}>
                      {fmtDate(r.visitDate)}
                    </span>
                    <span className="nb-sub">{r.appointment?.ticketCode}</span>
                  </div>
                  <div className="nb-td" role="cell" style={{ padding: '14px 16px' }}>
                    {r.diagnosis || '—'}
                  </div>
                  <div className="nb-td" role="cell" style={{ padding: '14px 16px' }}>
                    {r.recordedByName || '—'}
                  </div>
                  <div className="nb-td-action" role="cell">
                    <button type="button" className="nb-btn nb-btn-ghost nb-btn-sm" onClick={() => setViewing(r)}>
                      <Icon name="eye" size={20} />
                      Xem phiếu
                    </button>
                    {!p.isLocked && r.appointment && (
                      <Link to={`/phieu-kham/${r.appointment.id}/ket-qua?sua=1`} className="nb-btn nb-btn-gold nb-btn-sm">
                        <Icon name="edit" size={20} />
                        Sửa phiếu
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="nb-row" style={{ gap: 10, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <Icon name="lock" size={20} />
          Dữ liệu bệnh nhân, lượt khám và kết quả không bao giờ hiển thị công khai trên website.
        </p>
      </section>

      {editing && (
        <EditPatientModal
          patient={p}
          onClose={() => setEditing(false)}
          onSaved={(patient) => {
            setData((d) => (d ? { ...d, patient } : d));
            setEditing(false);
            setNotice('Đã lưu thông tin hồ sơ.');
          }}
        />
      )}

      {viewing && (
        <NbModal title="Phiếu kết quả khám" subtitle={`Mã phiếu khám ${viewing.appointment?.ticketCode ?? ''} · Ngày khám ${fmtDate(viewing.visitDate)}`} onClose={() => setViewing(null)} width={860}>
          <RecordSheetView data={sheetFrom(viewing, p)} confirmed />
          {!!viewing.editHistory?.length && <p className="nb-muted">Phiếu đã được sửa {viewing.editHistory.length} lần. Xem lịch sử sửa ở trang phiếu kết quả.</p>}
          <div className="nb-dialog-actions">
            <button type="button" className="nb-btn nb-btn-ghost" onClick={() => window.print()}>
              <Icon name="file" />
              In phiếu
            </button>
            <button type="button" className="nb-btn nb-btn-ghost" onClick={() => setViewing(null)}>
              Đóng
            </button>
          </div>
        </NbModal>
      )}

      {lockOpen && (
        <NbModal
          plain
          icon={p.isLocked ? 'unlock' : 'lock'}
          tone={p.isLocked ? 'green' : 'red'}
          title={p.isLocked ? `Mở khoá hồ sơ ${p.fullName}?` : `Khoá hồ sơ ${p.fullName}?`}
          subtitle={
            <p>
              {p.isLocked
                ? 'Hồ sơ sẽ dùng lại được: đặt lịch, ghi nhận lượt khám và sửa thông tin.'
                : 'Hồ sơ sẽ không chọn được khi đặt lịch, không ghi nhận lượt khám mới và không sửa được. Lịch sử khám vẫn giữ nguyên.'}
            </p>
          }
          onClose={() => setLockOpen(false)}
          width={600}
        >
          <NbError error={lockError} />
          <div className="nb-dialog-actions">
            <button type="button" className="nb-btn nb-btn-ghost" onClick={() => setLockOpen(false)}>
              Quay lại
            </button>
            <button type="button" className={`nb-btn ${p.isLocked ? 'nb-btn-primary' : 'nb-btn-danger'}`} disabled={pending} onClick={toggleLock}>
              <Icon name={p.isLocked ? 'unlock' : 'lock'} />
              {p.isLocked ? 'Mở khoá hồ sơ' : 'Khoá hồ sơ'}
            </button>
          </div>
        </NbModal>
      )}
    </>
  );
}
