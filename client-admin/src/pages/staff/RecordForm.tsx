import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api, type ApiError } from '@chuctu/shared/lib/api.ts';
import { addDays, fmtDate, fmtDateLong, fmtDateTime, genderLabel, slotLabel, todayVN, weekday } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { Appointment, MedicalRecord, Patient } from '@chuctu/shared/types.ts';
import { NbError, NbField, NbLoading, NbModal, NbMonthCalendar } from '../../components/nb.tsx';
import { RecordSheetView, type SheetData } from '../../components/RecordSheet.tsx';
import { sheetFrom } from './PatientDetail.tsx';

interface Form {
  diagnosis: string;
  pulse: string;
  bpTop: string;
  bpBottom: string;
  acupuncture: string;
  acupressure: string;
  other: string;
  medicalHistory: string;
  followUpDate: string;
  doctorName: string;
}

const EMPTY: Form = { diagnosis: '', pulse: '', bpTop: '', bpBottom: '', acupuncture: '', acupressure: '', other: '', medicalHistory: '', followUpDate: '', doctorName: '' };

const FIELD_LABELS: Record<string, string> = {
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

function fromRecord(r: MedicalRecord): Form {
  const [bpTop = '', bpBottom = ''] = (r.bloodPressure || '').split('/');
  return {
    diagnosis: r.diagnosis || '',
    pulse: r.pulse || '',
    bpTop,
    bpBottom,
    acupuncture: r.treatmentNotes.acupuncture || '',
    acupressure: r.treatmentNotes.acupressure || '',
    other: r.treatmentNotes.other || '',
    medicalHistory: r.medicalHistory || '',
    followUpDate: r.followUpDate || '',
    doctorName: r.doctorName || '',
  };
}

const v = (s: string) => (s.trim() ? s.trim() : null);

function toPayload(f: Form) {
  return {
    diagnosis: v(f.diagnosis),
    pulse: v(f.pulse),
    bloodPressure: f.bpTop.trim() && f.bpBottom.trim() ? `${f.bpTop.trim()}/${f.bpBottom.trim()}` : null,
    treatmentNotes: { acupuncture: v(f.acupuncture), acupressure: v(f.acupressure), other: v(f.other) },
    medicalHistory: v(f.medicalHistory),
    followUpDate: f.followUpDate || null,
    doctorName: v(f.doctorName),
  };
}

/** Kiểm tra trước khi xem lại, câu báo lỗi theo prototype. */
function validate(f: Form) {
  const e: Record<string, string> = {};
  if (!f.diagnosis.trim()) e.diagnosis = 'Vui lòng nhập chẩn đoán.';
  if (f.pulse.trim()) {
    const n = Number(f.pulse);
    if (!Number.isInteger(n) || n < 30 || n > 220) e.pulse = 'Mạch từ 30 đến 220 lần/phút.';
  }
  const top = f.bpTop.trim();
  const bottom = f.bpBottom.trim();
  if (top || bottom) {
    if (!/^\d{2,3}$/.test(top) || !/^\d{2,3}$/.test(bottom)) e.bloodPressure = 'Nhập đủ hai số huyết áp, ví dụ 120 / 80.';
    else if (Number(top) <= Number(bottom)) e.bloodPressure = 'Số trên (tâm thu) phải lớn hơn số dưới (tâm trương).';
  }
  return e;
}

/** Lập và sửa phiếu kết quả khám, xem lại trước khi xác nhận (UC.9.7, UC.9.9, UC.10.4). */
export default function RecordForm() {
  const { appointmentId } = useParams();
  const [params] = useSearchParams();
  useDocumentTitle('Phiếu kết quả khám');
  const { data, loading, error, setData } = useAsync(
    () => api.get<{ appointment: Appointment; record: MedicalRecord | null }>(`/staff/appointments/${appointmentId}`),
    [appointmentId],
  );
  const patientId = data?.appointment.patient?.id;
  const detail = useAsync(
    () => (patientId ? api.get<{ patient: Patient; records: MedicalRecord[] }>(`/staff/patients/${patientId}`) : Promise.resolve(null)),
    [patientId],
  );

  const [form, setForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const [viewing, setViewing] = useState<MedicalRecord | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState<'new' | 'edit' | null>(null);

  const appt = data?.appointment;
  const record = data?.record ?? null;
  const patient = detail.data?.patient ?? null;
  const creating = !!appt && !record && appt.status === 'IN_PROGRESS';
  const current = form ?? (creating ? EMPTY : null);
  const visitDate = record?.visitDate ?? todayVN();

  // Từ trang hồ sơ bấm "Sửa phiếu" thì mở ngay biểu mẫu sửa
  useEffect(() => {
    if (record && params.get('sua') === '1' && !appt?.patient?.isLocked) setForm(fromRecord(record));
  }, [record, params, appt?.patient?.isLocked]);

  useEffect(() => {
    if (!calOpen) return undefined;
    const close = (e: MouseEvent) => {
      if (!calRef.current?.contains(e.target as Node)) setCalOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [calOpen]);

  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...(f ?? EMPTY), [k]: e.target.value }));
  const setVal = (k: keyof Form, value: string) => setForm((f) => ({ ...(f ?? EMPTY), [k]: value }));

  const openPreview = () => {
    if (!current) return;
    const e = validate(current);
    setFields(e);
    if (Object.keys(e).length) return;
    setSaveError(null);
    setPreview(true);
  };

  const confirm = async () => {
    if (!current || !appt) return;
    setPending(true);
    setSaveError(null);
    try {
      if (record) {
        const res = await api.put<{ record: MedicalRecord }>(`/staff/records/${record.id}`, toPayload(current));
        setData((d) => (d ? { ...d, record: res.record } : d));
        setSaved('edit');
      } else {
        const res = await api.post<{ record: MedicalRecord }>(`/staff/appointments/${appt.id}/record`, toPayload(current));
        setData((d) => (d ? { appointment: { ...d.appointment, status: 'COMPLETED' }, record: res.record } : d));
        setSaved('new');
      }
      setForm(null);
      setPreview(false);
      detail.reload({ silent: true });
      window.scrollTo(0, 0);
    } catch (err) {
      const apiErr = err as ApiError;
      setSaveError(apiErr);
      if (Object.keys(apiErr.fields).length) {
        setFields(apiErr.fields);
        setPreview(false);
      }
    } finally {
      setPending(false);
    }
  };

  if (loading) return <NbLoading />;
  if (error || !appt) return <NbError error={error} />;

  const locked = !!appt.patient?.isLocked;
  const previewData: SheetData | null = current
    ? {
        visitDate,
        patientName: appt.patient?.fullName ?? '',
        patientCode: appt.patient?.patientCode,
        birthYear: appt.patient?.birthYear,
        phone: patient?.phone ?? appt.patient?.phone,
        ...toPayload(current),
        acupuncture: v(current.acupuncture),
        acupressure: v(current.acupressure),
        other: v(current.other),
      }
    : null;

  return (
    <div className="nb-solo">
      <Link to={appt.patient ? `/benh-nhan/${appt.patient.id}` : '/hang-doi'} className="nb-link" style={{ alignSelf: 'flex-start' }}>
        <Icon name="arrowLeft" size={20} />
        Quay lại hồ sơ bệnh nhân
      </Link>

      {saved && record && (
        <div className="nb-ok" role="status" style={{ padding: '18px 22px' }}>
          <div style={{ flex: '999 1 320px' }}>
            <p style={{ fontWeight: 600 }}>
              {saved === 'new' ? (
                <>
                  Đã xác nhận và lưu phiếu kết quả khám cho phiếu khám <span className="nb-ink">{appt.ticketCode}</span>. Phiếu khám chuyển sang <span className="nb-ink">Đã hoàn thành</span>. Bệnh nhân sẽ
                  thấy phiếu này trong tài khoản website.
                </>
              ) : (
                <>
                  Đã cập nhật phiếu kết quả khám cho phiếu khám <span className="nb-ink">{appt.ticketCode}</span>. Bệnh nhân sẽ thấy nội dung mới trong tài khoản website.
                </>
              )}
            </p>
          </div>
          <button type="button" className="nb-btn nb-btn-ghost" onClick={() => setViewing(record)}>
            Xem phiếu kết quả
          </button>
          <Link to={saved === 'new' ? '/hang-doi' : '/lich-trong-ngay'} className="nb-btn nb-btn-primary">
            {saved === 'new' ? 'Về Hàng đợi' : 'Về Lịch trong ngày'}
          </Link>
        </div>
      )}

      <section className="nb-card nb-card-lg" aria-labelledby="bn-tieude" style={{ gap: 20 }}>
        <div className="nb-profile">
          <span className="nb-avatar">
            <Icon name="user" size={36} />
          </span>
          <div>
            <p className="nb-eyebrow">Thông tin bệnh nhân</p>
            <h1 id="bn-tieude" className="nb-h1">
              {appt.patient?.fullName}
            </h1>
          </div>
          {locked ? (
            <span className="nb-pill nb-pill-done" style={{ padding: '6px 16px' }}>
              <Icon name="lock" size={18} />
              Hồ sơ đã khoá
            </span>
          ) : (
            <span className="nb-pill nb-pill-green" style={{ padding: '8px 16px' }}>
              <Icon name="check" size={18} />
              Hồ sơ đang hoạt động
            </span>
          )}
        </div>
        <dl className="nb-dl-flat">
          <div>
            <dt>Mã bệnh nhân</dt>
            <dd style={{ fontWeight: 700 }}>{appt.patient?.patientCode}</dd>
          </div>
          <div>
            <dt>Năm sinh · Giới tính</dt>
            <dd>
              {appt.patient?.birthYear ?? '—'} · {genderLabel(patient?.gender) || 'Chưa cập nhật'}
            </dd>
          </div>
          <div>
            <dt>Số điện thoại</dt>
            <dd>{patient?.phone ?? appt.patient?.phone ?? '—'}</dd>
          </div>
          <div>
            <dt>Địa chỉ</dt>
            <dd>{patient?.address || 'Chưa cập nhật'}</dd>
          </div>
        </dl>
      </section>

      {record && !form && (
        <section className="nb-card nb-card-lg" aria-labelledby="dc-tieude" style={{ gap: 18 }}>
          <h2 id="dc-tieude" className="nb-h2">
            Phiếu kết quả khám
          </h2>
          <p>
            Phiếu khám <strong className="nb-ink">{appt.ticketCode}</strong> đã có phiếu kết quả, mỗi phiếu khám chỉ có một phiếu kết quả.
          </p>
          {locked ? (
            <p className="nb-row" style={{ background: '#F4EADB', borderRadius: 12, padding: '12px 16px', flexWrap: 'nowrap' }}>
              <Icon name="lock" />
              Hồ sơ đang bị khoá nên không sửa được phiếu kết quả.
            </p>
          ) : (
            <p className="nb-row" style={{ background: '#E4EFE2', borderRadius: 12, padding: '12px 16px', flexWrap: 'nowrap' }}>
              <Icon name="info" />
              Lưu lần cuối {fmtDateTime(record.updatedAt)}{record.recordedByName ? `, người ghi nhận ${record.recordedByName}` : ''}. Mỗi lần sửa đều được ghi lại.
            </p>
          )}
          <div className="nb-row">
            <button type="button" className="nb-btn nb-btn-ghost" onClick={() => setViewing(record)}>
              <Icon name="eye" />
              Xem phiếu kết quả
            </button>
            {!locked && (
              <button type="button" className="nb-btn nb-btn-ghost" onClick={() => setForm(fromRecord(record))}>
                <Icon name="edit" />
                Sửa phiếu
              </button>
            )}
          </div>
          {!!record.editHistory?.length && (
            <div className="nb-stack-sm" style={{ borderTop: '1px solid #E0D3BC', paddingTop: 16 }}>
              <h3 className="nb-h3">Lịch sử sửa phiếu</h3>
              <ol className="nb-stack-sm" style={{ paddingLeft: 20 }}>
                {[...record.editHistory].reverse().map((h, i) => (
                  <li key={i}>
                    <strong className="nb-ink">{h.editedByName}</strong> · {fmtDateTime(h.editedAt)}
                    <ul style={{ margin: '4px 0 0' }}>
                      {Object.entries(h.changes).map(([k, c]) => (
                        <li key={k}>
                          {FIELD_LABELS[k] || k}: “{c.from ?? '—'}” → “{c.to ?? '—'}”
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {!record && !creating && (
        <div className="nb-note" role="note">
          <Icon name="info" />
          <p>Chỉ ghi nhận lượt khám cho người đang trong phòng khám. Phiếu khám này đang ở trạng thái khác nên chưa lập được phiếu kết quả.</p>
        </div>
      )}

      {current && !locked && (
        <form
          className="nb-card nb-card-lg"
          style={{ gap: 28 }}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            openPreview();
          }}
        >
          <h2 className="nb-h2">Phiếu kết quả khám</h2>
          <div className="nb-row" style={{ background: '#F7EBD2', borderRadius: 16, padding: '14px 18px', gap: '6px 28px' }}>
            <span>
              <strong className="nb-ink">Mã phiếu khám:</strong> {appt.ticketCode}
            </span>
            <span>
              <strong className="nb-ink">Giờ khám dự kiến:</strong> {slotLabel(appt.slotStart)}, {fmtDate(appt.slotDate)}
            </span>
          </div>
          {record && (
            <div className="nb-warn-line" role="status">
              <Icon name="edit" />
              <p>
                <strong>Đang sửa phiếu kết quả khám đã xác nhận.</strong> Mỗi thay đổi được ghi lại cùng tên người sửa và thời điểm sửa.
              </p>
            </div>
          )}

          <fieldset className="nb-fieldset">
            <legend>Nội dung khám</legend>
            <NbField label="1. Chẩn đoán" required error={fields.diagnosis}>
              {(a) => <textarea className="nb-textarea" rows={3} value={current.diagnosis} onChange={set('diagnosis')} {...a} />}
            </NbField>
            <div className="nb-row" style={{ gap: '18px 32px', alignItems: 'flex-start' }}>
              <NbField label="Mạch" error={fields.pulse}>
                {(a) => (
                  <div className="nb-row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                    <input className="nb-input nb-input-short" inputMode="numeric" value={current.pulse} onChange={set('pulse')} {...a} />
                    <span>lần/phút</span>
                  </div>
                )}
              </NbField>
              <div className="nb-field">
                <label className="nb-label" htmlFor="ha-tt">
                  H/A (huyết áp)
                </label>
                <div className="nb-row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                  <input id="ha-tt" className="nb-input nb-input-short" inputMode="numeric" aria-label="Huyết áp số trên (tâm thu)" aria-invalid={fields.bloodPressure ? 'true' : undefined} value={current.bpTop} onChange={set('bpTop')} />
                  <span style={{ fontSize: 20, color: '#6B5E4E' }}>/</span>
                  <input className="nb-input nb-input-short" inputMode="numeric" aria-label="Huyết áp số dưới (tâm trương)" aria-invalid={fields.bloodPressure ? 'true' : undefined} value={current.bpBottom} onChange={set('bpBottom')} />
                  <span>mmHg</span>
                </div>
                {fields.bloodPressure && (
                  <p className="nb-error" role="alert">
                    <Icon name="alert" size={20} />
                    {fields.bloodPressure}
                  </p>
                )}
              </div>
            </div>
            <p className="nb-label">2. Ghi chú điều trị</p>
            <div className="nb-form-row" style={{ gap: '18px 20px' }}>
              <NbField label="Châm cứu" error={fields['treatmentNotes.acupuncture']}>
                {(a) => <textarea className="nb-textarea" rows={3} placeholder="Để trống nếu không thực hiện" value={current.acupuncture} onChange={set('acupuncture')} {...a} />}
              </NbField>
              <NbField label="Bấm huyệt" error={fields['treatmentNotes.acupressure']}>
                {(a) => <textarea className="nb-textarea" rows={3} placeholder="Để trống nếu không thực hiện" value={current.acupressure} onChange={set('acupressure')} {...a} />}
              </NbField>
            </div>
            <NbField label="Khác" error={fields['treatmentNotes.other']}>
              {(a) => <textarea className="nb-textarea" rows={3} placeholder="Thuốc Nam, xông, dặn dò tại nhà…" value={current.other} onChange={set('other')} {...a} />}
            </NbField>
            <p className="nb-gold-text nb-row" style={{ gap: 10, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <Icon name="info" />
              Tiếp tân không tự nhận xét chuyên môn. Chỉ ghi lại nội dung đã được bác sĩ hoặc người có chuyên môn của phòng khám xác nhận.
            </p>
          </fieldset>

          <fieldset className="nb-fieldset">
            <legend>Tiền sử bệnh</legend>
            <NbField label="Những bệnh bệnh nhân đã có" hint="Ví dụ: tăng huyết áp, tiểu đường, đau dạ dày. Mỗi phiếu giữ tiền sử tại thời điểm khám." error={fields.medicalHistory}>
              {(a) => <textarea className="nb-textarea" rows={3} value={current.medicalHistory} onChange={set('medicalHistory')} {...a} />}
            </NbField>
          </fieldset>

          <fieldset className="nb-fieldset">
            <legend>Hoàn tất phiếu</legend>
            <div className="nb-row" style={{ gap: '18px 20px', alignItems: 'flex-start' }}>
              <div className="nb-field" style={{ flex: '1 1 200px' }}>
                <span className="nb-label">Ngày khám</span>
                <div className="nb-row" style={{ minHeight: 44, padding: '0 14px', background: '#F4EADB', border: '2px solid #E0D3BC', borderRadius: 12, fontWeight: 600, color: '#2A2118' }}>
                  <Icon name="calendar" size={20} />
                  {fmtDate(visitDate)}
                </div>
              </div>
              <div className="nb-field" style={{ flex: '1.5 1 340px', position: 'relative' }} ref={calRef}>
                <span className="nb-label" id="tk-nhan">
                  Hẹn ngày tái khám
                </span>
                <div className="nb-row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                  <button type="button" className="nb-datebtn" aria-labelledby="tk-nhan" aria-expanded={calOpen} onClick={() => setCalOpen((o) => !o)} style={{ fontWeight: 600 }}>
                    <Icon name="calendar" />
                    <span style={{ flex: '1 1 auto', textAlign: 'left' }}>
                      {current.followUpDate ? `${weekday(current.followUpDate)}, ${fmtDate(current.followUpDate)}` : 'Chọn ngày tái khám'}
                    </span>
                  </button>
                  <button type="button" className="nb-chip" aria-pressed={!current.followUpDate} onClick={() => setVal('followUpDate', '')}>
                    Không hẹn
                  </button>
                </div>
                {calOpen && (
                  <div className="nb-cal" role="dialog" aria-label="Chọn ngày tái khám" style={{ width: 360 }}>
                    <NbMonthCalendar
                      value={current.followUpDate || null}
                      min={addDays(visitDate, 1)}
                      onPick={(d) => {
                        setVal('followUpDate', d);
                        setCalOpen(false);
                      }}
                    />
                    <p className="nb-hint">Chỉ chọn được ngày sau ngày khám {fmtDate(visitDate)}.</p>
                  </div>
                )}
              </div>
              <NbField label="Bác sĩ điều trị" className="" error={fields.doctorName}>
                {(a) => <input className="nb-input" value={current.doctorName} onChange={set('doctorName')} {...a} style={{ minWidth: 240 }} />}
              </NbField>
            </div>
          </fieldset>

          <NbError error={saveError && !preview ? saveError : null} />
          <div className="nb-row" style={{ gap: 14 }}>
            <button type="submit" className="nb-btn nb-btn-primary" style={{ fontWeight: 700 }}>
              <Icon name="eye" />
              Xem lại và xác nhận
            </button>
            {record && (
              <button
                type="button"
                className="nb-btn nb-btn-ghost"
                onClick={() => {
                  setForm(null);
                  setFields({});
                }}
              >
                Huỷ sửa
              </button>
            )}
          </div>
        </form>
      )}

      <section className="nb-card nb-card-lg" aria-labelledby="ls-tieude" style={{ gap: 18 }}>
        <h2 id="ls-tieude" className="nb-h2">
          Lịch sử khám của hồ sơ này
        </h2>
        {detail.loading && <NbLoading />}
        {detail.data && detail.data.records.length === 0 && <p>Hồ sơ này chưa có lượt khám nào.</p>}
        {detail.data && detail.data.records.length > 0 && (
          <div className="nb-inner-table nb-table-wrap">
            <div className="nb-table" role="table" aria-label="Lịch sử khám">
              <div className="nb-tr nb-thead" role="row" style={{ ['--cols' as string]: '170px minmax(0, 2fr) minmax(0, 1.2fr) 150px 110px', borderTop: 0 }}>
                {['Ngày khám', 'Chẩn đoán', 'Mạch · H/A', 'Người ghi nhận', 'Phiếu'].map((h) => (
                  <div key={h} className="nb-th" role="columnheader" style={{ padding: '12px 16px' }}>
                    {h}
                  </div>
                ))}
              </div>
              {detail.data.records.map((r) => (
                <div key={r.id} className="nb-tr" role="row" style={{ ['--cols' as string]: '170px minmax(0, 2fr) minmax(0, 1.2fr) 150px 110px' }}>
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
                    <span style={{ display: 'block' }}>{r.pulse ? `${r.pulse} lần/phút` : '—'}</span>
                    <span className="nb-sub">{r.bloodPressure ? `${r.bloodPressure} mmHg` : ''}</span>
                  </div>
                  <div className="nb-td" role="cell" style={{ padding: '14px 16px' }}>
                    {r.recordedByName || '—'}
                  </div>
                  <div className="nb-td-action" role="cell">
                    <button type="button" className="nb-btn nb-btn-ghost nb-btn-sm" onClick={() => setViewing(r)}>
                      Xem
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="nb-muted">
          Chỉ hiển thị các lượt khám thuộc hồ sơ đang mở. Dữ liệu bệnh nhân, lượt khám và kết quả không bao giờ hiển thị công khai trên website.
        </p>
      </section>

      {preview && previewData && (
        <NbModal title="Kiểm tra lại thông tin trước khi xác nhận" subtitle={`Mã phiếu khám ${appt.ticketCode} · Ngày khám ${fmtDateLong(visitDate)}`} onClose={() => setPreview(false)} width={860}>
          <div className="nb-warn-line">
            <Icon name="info" />
            <p>
              Đây là phiếu bệnh nhân sẽ thấy trong tài khoản website. Nếu đúng hết, bấm <strong>Xác nhận</strong>. Nếu có chỗ sai, bấm <strong>Huỷ</strong> để quay lại sửa.
            </p>
          </div>
          <RecordSheetView data={previewData} confirmed={false} />
          <NbError error={saveError} />
          <div className="nb-dialog-actions">
            <button type="button" className="nb-btn nb-btn-primary nb-btn-lg" disabled={pending} onClick={confirm}>
              <Icon name="check" />
              Xác nhận
            </button>
            <button type="button" className="nb-btn nb-btn-ghost nb-btn-lg" onClick={() => setPreview(false)}>
              Huỷ
            </button>
          </div>
        </NbModal>
      )}

      {viewing && (
        <NbModal title="Phiếu kết quả khám" subtitle={`Mã phiếu khám ${viewing.appointment?.ticketCode ?? ''} · Ngày khám ${fmtDate(viewing.visitDate)}`} onClose={() => setViewing(null)} width={860}>
          <RecordSheetView data={sheetFrom(viewing, patient)} confirmed />
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
    </div>
  );
}
