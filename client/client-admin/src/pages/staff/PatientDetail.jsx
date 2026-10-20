import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Button, ButtonLink, Empty, ErrorAlert, Loading, Modal, PageHeader, SelectInput, StatusBadge, TextInput } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { GENDERS, RELATIONSHIPS, fmtDate, fmtDateLong, shortTime, todayVN } from '@chuctu/shared/lib/format.js';
import { isAdmin, useSession } from '@chuctu/shared/lib/session.jsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';

function EditPatient({ patient, onSaved, onCancel }) {
  const [form, setForm] = useState({
    fullName: patient.fullName,
    birthYear: patient.birthYear || '',
    dob: patient.dob ? patient.dob.slice(0, 10) : '',
    phone: patient.phone || '',
    gender: patient.gender || '',
    address: patient.address || '',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fe = error?.fields || {};

  const submit = async (e) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await api.patch(`/staff/patients/${patient.id}`, {
        ...form,
        dob: form.dob || null,
        gender: form.gender || null,
        address: form.address || null,
      });
      onSaved(res.patient);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="card card-lg stack" onSubmit={submit} noValidate>
      <div className="form-grid">
        <TextInput label="Họ và tên" required value={form.fullName} onChange={set('fullName')} error={fe.fullName} className="span-2" />
        <TextInput label="Năm sinh" required inputMode="numeric" value={form.birthYear} onChange={set('birthYear')} error={fe.birthYear} />
        <TextInput label="Ngày sinh" type="date" max={todayVN()} value={form.dob} onChange={set('dob')} error={fe.dob} />
        <TextInput label="Số điện thoại" required type="tel" value={form.phone} onChange={set('phone')} error={fe.phone} />
        <SelectInput label="Giới tính" placeholder="Không ghi" options={Object.entries(GENDERS).map(([value, label]) => ({ value, label }))} value={form.gender} onChange={set('gender')} />
        <TextInput label="Địa chỉ" value={form.address} onChange={set('address')} error={fe.address} className="span-2" />
      </div>
      {error && !Object.keys(fe).length && <ErrorAlert error={error} />}
      <div className="row">
        <Button type="submit" loading={pending}>
          Lưu thông tin
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Huỷ
        </Button>
      </div>
    </form>
  );
}

/** Hồ sơ chi tiết, lịch sử khám, khoá/mở khoá (UC.9.3, UC.9.5, UC.9.6, UC.9.8). */
export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useSession();
  const { data, loading, error, setData } = useAsync(() => api.get(`/staff/patients/${id}`), [id]);
  const [editing, setEditing] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [lockError, setLockError] = useState(null);
  const [notice, setNotice] = useState(null);
  useDocumentTitle(data?.patient?.fullName || 'Hồ sơ bệnh nhân');

  const p = data?.patient;

  const toggleLock = async () => {
    setPending(true);
    setLockError(null);
    try {
      const res = await api.post(`/admin/patients/${id}/${p.isLocked ? 'unlock' : 'lock'}`);
      setData((d) => ({ ...d, patient: res.patient }));
      setNotice(res.patient.isLocked ? 'Đã khoá hồ sơ.' : 'Đã mở khoá hồ sơ.');
      setLockOpen(false);
    } catch (err) {
      setLockError(err);
    } finally {
      setPending(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <div className="stack-lg">
      <div>
        <p className="small">
          <Link to="/benh-nhan">← Danh sách hồ sơ bệnh nhân</Link>
        </p>
        <PageHeader
          title={p.fullName}
          subtitle={<span className="mono">{p.patientCode}</span>}
          actions={
            <>
              {!p.isLocked && !editing && (
                <Button variant="secondary" icon="edit" onClick={() => setEditing(true)}>
                  Sửa thông tin
                </Button>
              )}
              {isAdmin(user) && (
                <Button variant={p.isLocked ? 'secondary' : 'danger'} icon={p.isLocked ? 'unlock' : 'lock'} onClick={() => setLockOpen(true)}>
                  {p.isLocked ? 'Mở khoá hồ sơ' : 'Khoá hồ sơ'}
                </Button>
              )}
              {!p.isLocked && (
                <ButtonLink to={`/dat-ho?benh-nhan=${p.id}`} icon="calendar">
                  Đặt lịch cho bệnh nhân này
                </ButtonLink>
              )}
            </>
          }
        />
      </div>
      {notice && <Alert type="success">{notice}</Alert>}
      {p.isLocked && (
        <Alert type="warning" title={`Hồ sơ đã khoá từ ${fmtDate(p.lockedAt)}`}>
          Không chọn được khi đặt lịch, không ghi nhận lượt khám mới và không sửa thông tin. Lịch sử khám vẫn xem được.
        </Alert>
      )}
      {editing ? (
        <EditPatient
          patient={p}
          onCancel={() => setEditing(false)}
          onSaved={(patient) => {
            setData((d) => ({ ...d, patient }));
            setEditing(false);
            setNotice('Đã lưu thông tin bệnh nhân.');
          }}
        />
      ) : (
        <div className="card card-lg">
          <dl className="info">
            <dt>Năm sinh</dt>
            <dd>{p.birthYear || '—'}</dd>
            <dt>Ngày sinh</dt>
            <dd>{fmtDate(p.dob)}</dd>
            <dt>Giới tính</dt>
            <dd>{GENDERS[p.gender] || '—'}</dd>
            <dt>Số điện thoại</dt>
            <dd className="mono">{p.phone || '—'}</dd>
            <dt>Địa chỉ</dt>
            <dd>{p.address || '—'}</dd>
            <dt>Tài khoản website</dt>
            <dd>{p.userId ? `Có — hồ sơ ${RELATIONSHIPS[p.relationship]?.toLowerCase() || ''} của chủ tài khoản` : 'Chưa có (bệnh nhân đến trực tiếp)'}</dd>
          </dl>
        </div>
      )}

      <section className="stack" aria-labelledby="lich-su">
        <h2 id="lich-su">Lịch sử khám và điều trị</h2>
        {data.records.length === 0 && <Empty icon="clipboard" title="Chưa có lượt khám nào được ghi nhận" />}
        <ol className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {data.records.map((r) => (
            <li key={r.id} className="card row-between">
              <div className="stack-sm" style={{ gap: 4 }}>
                <p style={{ fontWeight: 700, color: 'var(--ink-900)' }}>{fmtDateLong(r.visitDate)}</p>
                <p>Chẩn đoán: {r.diagnosis || '—'}</p>
                <p className="caption">
                  {r.appointment?.serviceLabel} · Bác sĩ {r.doctorName || '—'}
                  {r.editHistory.length > 0 && ` · đã sửa ${r.editHistory.length} lần`}
                </p>
              </div>
              <ButtonLink to={`/phieu-kham/${r.appointmentId}/ket-qua`} size="sm" variant="secondary">
                Xem phiếu kết quả
              </ButtonLink>
            </li>
          ))}
        </ol>
      </section>

      <section className="stack" aria-labelledby="phieu-kham">
        <h2 id="phieu-kham">Phiếu khám</h2>
        {data.appointments.length === 0 && <Empty icon="ticket" title="Chưa có phiếu khám" />}
        {data.appointments.length > 0 && (
          <div className="table-wrap">
            <table className="table table-responsive">
              <thead>
                <tr>
                  <th scope="col">Ngày</th>
                  <th scope="col">Giờ</th>
                  <th scope="col">Mã phiếu</th>
                  <th scope="col">Nội dung</th>
                  <th scope="col">Nguồn</th>
                  <th scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {data.appointments.map((a) => (
                  <tr key={a.id}>
                    <td data-label="Ngày">{fmtDate(a.slotDate)}</td>
                    <td data-label="Giờ">{shortTime(a.slotStart)}</td>
                    <td data-label="Mã phiếu" className="mono">
                      {a.ticketCode}
                    </td>
                    <td data-label="Nội dung">{a.serviceLabel}</td>
                    <td data-label="Nguồn">{a.source === 'COUNTER' ? 'Tại quầy' : 'Trực tuyến'}</td>
                    <td data-label="Trạng thái">
                      <StatusBadge status={a.status} />
                      {a.cancelReason && <span className="caption" style={{ display: 'block' }}>{a.cancelReason}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {lockOpen && (
        <Modal
          title={p.isLocked ? 'Mở khoá hồ sơ?' : 'Khoá hồ sơ bệnh nhân?'}
          onClose={() => setLockOpen(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setLockOpen(false)}>
                Quay lại
              </Button>
              <Button variant={p.isLocked ? 'primary' : 'danger-solid'} icon={p.isLocked ? 'unlock' : 'lock'} loading={pending} onClick={toggleLock}>
                {p.isLocked ? 'Mở khoá' : 'Khoá hồ sơ'}
              </Button>
            </>
          }
        >
          <div className="stack-sm">
            {p.isLocked ? (
              <p>Hồ sơ sẽ dùng lại được: đặt lịch, ghi nhận lượt khám và sửa thông tin.</p>
            ) : (
              <p>
                Sau khi khoá, hồ sơ <strong>không chọn được khi đặt lịch</strong>, <strong>không ghi nhận lượt khám mới</strong> và không sửa được. Các phiếu khám đã
                đặt vẫn giữ nguyên, lịch sử khám vẫn xem được.
              </p>
            )}
            <Badge tone="gray">{p.patientCode}</Badge>
            <ErrorAlert error={lockError} />
          </div>
        </Modal>
      )}
    </div>
  );
}
