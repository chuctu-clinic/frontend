import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, ErrorAlert, Loading, PageHeader, StatusBadge, TextArea, TextInput } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { fmtDateTime, shortTime, todayVN } from '@chuctu/shared/lib/format.js';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { RecordSheet } from '@chuctu/shared/components/RecordSheet.jsx';

const EMPTY = {
  diagnosis: '',
  pulse: '',
  bloodPressure: '',
  acupuncture: '',
  acupressure: '',
  other: '',
  medicalHistory: '',
  followUpDate: '',
  doctorName: '',
};

const FIELD_LABELS = {
  diagnosis: 'Chẩn đoán',
  pulse: 'Mạch',
  bloodPressure: 'Huyết áp',
  'treatmentNotes.acupuncture': 'Châm cứu',
  'treatmentNotes.acupressure': 'Bấm huyệt',
  'treatmentNotes.other': 'Điều trị khác',
  medicalHistory: 'Tiền sử bệnh',
  followUpDate: 'Hẹn tái khám',
  doctorName: 'Bác sĩ điều trị',
};

function fromRecord(r) {
  return {
    diagnosis: r.diagnosis || '',
    pulse: r.pulse || '',
    bloodPressure: r.bloodPressure || '',
    acupuncture: r.treatmentNotes?.acupuncture || '',
    acupressure: r.treatmentNotes?.acupressure || '',
    other: r.treatmentNotes?.other || '',
    medicalHistory: r.medicalHistory || '',
    followUpDate: r.followUpDate || '',
    doctorName: r.doctorName || '',
  };
}

function toPayload(f) {
  const v = (s) => (s && s.trim() ? s.trim() : null);
  return {
    diagnosis: v(f.diagnosis),
    pulse: v(f.pulse),
    bloodPressure: v(f.bloodPressure),
    treatmentNotes: { acupuncture: v(f.acupuncture), acupressure: v(f.acupressure), other: v(f.other) },
    medicalHistory: v(f.medicalHistory),
    followUpDate: f.followUpDate || null,
    doctorName: v(f.doctorName),
  };
}

/** Lập và sửa phiếu kết quả khám (UC.9.7, UC.9.9, UC.10.4). */
export default function RecordForm() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, setData } = useAsync(() => api.get(`/staff/appointments/${appointmentId}`), [appointmentId]);
  const [form, setForm] = useState(null);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [notice, setNotice] = useState(null);
  useDocumentTitle('Phiếu kết quả khám');

  const appt = data?.appointment;
  const record = data?.record;
  const creating = appt && !record && appt.status === 'IN_PROGRESS';
  const editing = Boolean(form);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const current = form || (creating ? EMPTY : null);

  const submit = async (e) => {
    e.preventDefault();
    setPending(true);
    setSaveError(null);
    try {
      if (record) {
        const res = await api.put(`/staff/records/${record.id}`, toPayload(form));
        setData((d) => ({ ...d, record: res.record }));
        setForm(null);
        setNotice('Đã lưu thay đổi. Hệ thống đã ghi lại lịch sử sửa phiếu.');
      } else {
        await api.post(`/staff/appointments/${appointmentId}/record`, toPayload(current));
        navigate('/hang-doi', { replace: true });
      }
    } catch (err) {
      setSaveError(err);
    } finally {
      setPending(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <div className="stack" style={{ maxWidth: 960 }}>
      <p className="small">
        <Link to="/hang-doi">← Hàng đợi</Link> · <Link to={`/benh-nhan/${appt.patient.id}`}>Hồ sơ {appt.patient.fullName}</Link>
      </p>
      <PageHeader
        title={record ? 'Phiếu kết quả khám' : 'Ghi nhận lượt khám'}
        subtitle={`${appt.patient.fullName} · ${appt.ticketCode} · khung ${shortTime(appt.slotStart)}`}
        actions={<StatusBadge status={appt.status} />}
      />
      {notice && <Alert type="success">{notice}</Alert>}

      {!record && !creating && (
        <Alert type="info">Chỉ ghi nhận lượt khám cho người đang trong phòng khám. Phiếu này hiện ở trạng thái khác, chưa có phiếu kết quả.</Alert>
      )}

      {record && !editing && (
        <>
          <RecordSheet record={record} />
          {appt.patient.isLocked ? (
            <Alert type="warning">Hồ sơ đang bị khoá nên không sửa được phiếu kết quả.</Alert>
          ) : (
            <Button variant="secondary" icon="edit" onClick={() => setForm(fromRecord(record))} style={{ alignSelf: 'flex-start' }}>
              Sửa phiếu kết quả
            </Button>
          )}
          {record.editHistory.length > 0 && (
            <section className="card stack-sm" aria-labelledby="lich-su-sua">
              <h3 id="lich-su-sua">Lịch sử sửa phiếu</h3>
              <ol className="stack-sm" style={{ paddingLeft: 20, margin: 0 }}>
                {[...record.editHistory].reverse().map((h, i) => (
                  <li key={i}>
                    <strong>{h.editedByName}</strong> · {fmtDateTime(h.editedAt)}
                    <ul className="small" style={{ margin: '4px 0 0' }}>
                      {Object.entries(h.changes).map(([k, c]) => (
                        <li key={k}>
                          {FIELD_LABELS[k] || k}: “{c.from ?? '—'}” → “{c.to ?? '—'}”
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}

      {current && (
        <form className="card card-lg stack" onSubmit={submit} noValidate>
          <Alert type="info">
            Chỉ ghi kết quả đã được bác sĩ hoặc người có chuyên môn của phòng khám cung cấp, xác nhận. Tiếp tân không tự nhận xét kết quả khám.
          </Alert>
          <TextArea label="Chẩn đoán" rows={2} value={current.diagnosis} onChange={set('diagnosis')} />
          <div className="form-grid">
            <TextInput label="Mạch (lần/phút)" inputMode="numeric" value={current.pulse} onChange={set('pulse')} />
            <TextInput label="Huyết áp (mmHg)" placeholder="Ví dụ: 120/80" value={current.bloodPressure} onChange={set('bloodPressure')} />
          </div>
          <fieldset className="stack">
            <legend className="field-label" style={{ fontSize: 20, marginBottom: 8 }}>
              Ghi chú điều trị
            </legend>
            <TextArea label="Châm cứu" rows={2} value={current.acupuncture} onChange={set('acupuncture')} />
            <TextArea label="Bấm huyệt" rows={2} value={current.acupressure} onChange={set('acupressure')} />
            <TextArea label="Điều trị khác" rows={2} value={current.other} onChange={set('other')} />
          </fieldset>
          <TextArea label="Tiền sử bệnh" rows={2} value={current.medicalHistory} onChange={set('medicalHistory')} />
          <div className="form-grid">
            <TextInput label="Hẹn tái khám" type="date" min={todayVN()} value={current.followUpDate} onChange={set('followUpDate')} />
            <TextInput label="Bác sĩ điều trị" value={current.doctorName} onChange={set('doctorName')} />
          </div>
          <ErrorAlert error={saveError} />
          <div className="row">
            <Button type="submit" size="lg" icon="check" loading={pending}>
              {record ? 'Lưu thay đổi' : 'Lưu phiếu kết quả và hoàn tất lượt khám'}
            </Button>
            {record && (
              <Button variant="ghost" onClick={() => setForm(null)}>
                Huỷ sửa
              </Button>
            )}
          </div>
          {!record && <p className="small muted">Lưu xong, phiếu chuyển sang Đã hoàn thành, người khám rời hàng đợi và ghế trống mời người kế tiếp.</p>}
        </form>
      )}
    </div>
  );
}
