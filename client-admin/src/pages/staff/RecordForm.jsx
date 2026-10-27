import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { ErrorAlert, Loading } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { GENDERS, fmtDate, shortTime, todayVN } from '@chuctu/shared/lib/format.js';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { fmtLeft, fmtStamp } from '../../components/t-ui.jsx';
import { EMPTY_FORM, EditRecordDialog, HistoryTable, RecordFields, ResultDialog, editState, fromRecord, toPayload, validateRecord } from './RecordParts.jsx';

/** Lập và sửa phiếu kết quả khám (UC.9.7, UC.9.9, UC.10.4), theo prototype "TiepTan-HoSoChiTiet". */
export default function RecordForm() {
  const { appointmentId } = useParams();
  useDocumentTitle('Phiếu kết quả khám');
  const appt = useAsync(() => api.get(`/staff/appointments/${appointmentId}`), [appointmentId]);
  const patientId = appt.data?.appointment.patient.id;
  const detail = useAsync(() => (patientId ? api.get(`/staff/patients/${patientId}`) : Promise.resolve(null)), [patientId]);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [tried, setTried] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [saved, setSaved] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  if (appt.loading || (patientId && detail.loading && !detail.data)) return <Loading />;
  if (appt.error) return <ErrorAlert error={appt.error} />;

  const a = appt.data.appointment;
  const record = appt.data.record;
  const p = detail.data?.patient || a.patient;
  const records = detail.data?.records || [];
  const creating = !record && a.status === 'IN_PROGRESS' && !p.isLocked;
  const showForm = creating || editing;
  const current = form || (record && editing ? fromRecord(record) : EMPTY_FORM);
  const errs = validateRecord(current);
  const visitDate = record?.visitDate || todayVN();
  const st = record ? editState(record, p.isLocked) : null;
  const setCurrent = (fn) => setForm((f) => fn(f || current));

  const review = () => {
    setTried(true);
    if (Object.values(errs).some(Boolean)) return;
    setDialog({
      type: 'confirm',
      draft: { ...(record || {}), ...toPayload(current), visitDate, appointment: { ticketCode: a.ticketCode } },
    });
  };

  const confirm = async () => {
    setPending(true);
    setError(null);
    try {
      const res = record ? await api.put(`/staff/records/${record.id}`, toPayload(current)) : await api.post(`/staff/appointments/${appointmentId}/record`, toPayload(current));
      appt.setData((d) => ({ ...d, record: res.record, appointment: { ...d.appointment, status: 'COMPLETED' } }));
      detail.reload({ silent: true });
      setSaved({ fresh: !record, record: res.record });
      setEditing(false);
      setForm(null);
      setTried(false);
      setDialog(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err);
      setDialog(null);
    } finally {
      setPending(false);
    }
  };

  const startEdit = () => {
    setForm(fromRecord(record));
    setEditing(true);
    setTried(false);
    setDialog(null);
  };

  const savedState = saved ? editState(saved.record, p.isLocked) : null;

  return (
    <>
      <Link to={`/benh-nhan/${p.id}`} className="t-back">
        <Icon name="arrowLeft" size={22} />
        Quay lại hồ sơ bệnh nhân
      </Link>

      {saved && (
        <div role="status" className="t-notice" style={{ padding: '18px 22px', flexWrap: 'wrap', alignItems: 'center', gap: '14px 18px', fontWeight: 400 }}>
          <div style={{ flex: '999 1 320px', minWidth: 0 }}>
            <p style={{ fontWeight: 600 }}>
              {saved.fresh ? (
                <>
                  Đã xác nhận và lưu phiếu kết quả khám cho phiếu khám <span className="t-notice-name">{a.ticketCode}</span>. Phiếu khám chuyển sang{' '}
                  <span className="t-notice-name">Đã hoàn thành</span>. Bệnh nhân sẽ thấy phiếu này trong tài khoản website.
                </>
              ) : (
                <>
                  Đã cập nhật phiếu kết quả khám cho phiếu khám <span className="t-notice-name">{a.ticketCode}</span>. Bệnh nhân sẽ thấy nội dung mới trong tài khoản website.
                </>
              )}
            </p>
            <p className="t-text" style={{ marginTop: 4 }}>
              Tiếp tân còn sửa được phiếu này đến <strong className="t-strong">{fmtStamp(savedState.until)}</strong> (24 giờ kể từ lúc xác nhận).
            </p>
          </div>
          <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 20px' }} onClick={() => setDialog({ type: 'view', record: saved.record })}>
            Xem phiếu kết quả
          </button>
          {savedState.editable && (
            <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 20px' }} onClick={startEdit}>
              Sửa phiếu
            </button>
          )}
          <Link to="/lich-trong-ngay" className="t-btn t-btn-primary" style={{ padding: '0 20px' }}>
            Về Lịch trong ngày
          </Link>
        </div>
      )}

      <section aria-labelledby="bn-tieude" className="t-panel" style={{ gap: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
          <span className="t-avatar">
            <Icon name="user" size={36} strokeWidth={1.75} />
          </span>
          <div style={{ flex: '999 1 300px', minWidth: 0 }}>
            <p className="t-muted" style={{ marginBottom: 2, fontWeight: 600 }}>
              Thông tin bệnh nhân
            </p>
            <h1 id="bn-tieude" className="t-h1">
              {p.fullName}
            </h1>
          </div>
          {p.isLocked ? (
            <span className="t-chip t-chip-done" style={{ padding: '6px 16px' }}>
              <Icon name="lock" size={20} />
              Hồ sơ đã khoá
            </span>
          ) : (
            <span className="t-chip t-chip-green" style={{ padding: '8px 16px', gap: 8 }}>
              <Icon name="checkCircle" size={20} />
              Hồ sơ đang hoạt động
            </span>
          )}
        </div>
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '16px 24px', paddingTop: 18, borderTop: '1px solid var(--line-soft)' }}>
          {[
            ['Mã bệnh nhân', <strong key="m">{p.patientCode}</strong>],
            ['Năm sinh · Giới tính', `${p.birthYear || '—'} · ${GENDERS[p.gender] || 'Chưa cập nhật'}`],
            ['Số điện thoại', p.phone || '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="t-label" style={{ color: 'var(--ink-500)' }}>
                {label}
              </dt>
              <dd style={{ marginTop: 2, color: 'var(--ink-900)' }}>{value}</dd>
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1' }}>
            <dt className="t-label" style={{ color: 'var(--ink-500)' }}>
              Địa chỉ
            </dt>
            <dd style={{ marginTop: 2, color: 'var(--ink-900)' }}>{p.address || 'Chưa cập nhật'}</dd>
          </div>
        </dl>
      </section>

      {record && !editing && !saved && (
        <section aria-labelledby="dc-tieude" className="t-panel" style={{ gap: 18 }}>
          <h2 id="dc-tieude" className="t-h2">
            Phiếu kết quả khám
          </h2>
          <p className="t-text">
            Phiếu khám <strong className="t-strong">{a.ticketCode}</strong> đã có phiếu kết quả, mỗi phiếu khám chỉ có một phiếu kết quả.
          </p>
          <p className={`${st.editable ? 't-tint-green' : 't-tint-sand'} t-iconrow`} style={{ gap: 10 }}>
            <Icon name={st.editable ? 'clock' : 'lock'} size={22} />
            <span>
              {st.editable
                ? `Phiếu này còn sửa được đến ${fmtStamp(st.until)} (còn ${fmtLeft(st.left)}).`
                : p.isLocked
                  ? 'Hồ sơ đã khoá nên không sửa được phiếu kết quả.'
                  : `Phiếu đã khoá: đã quá 24 giờ kể từ lúc xác nhận (${fmtStamp(record.createdAt)}), không sửa được nữa.`}
            </span>
          </p>
          <div className="t-actions" style={{ gap: 12 }}>
            <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 20px' }} onClick={() => setDialog({ type: 'view', record })}>
              <Icon name="eye" size={20} />
              Xem phiếu kết quả
            </button>
            {st.editable && (
              <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 20px' }} onClick={startEdit}>
                <Icon name="edit" size={20} />
                Sửa phiếu
              </button>
            )}
          </div>
        </section>
      )}

      {!record && !creating && (
        <section className="t-panel">
          <h2 className="t-h2">Phiếu kết quả khám</h2>
          <p className="t-text">
            {p.isLocked
              ? 'Hồ sơ đang bị khoá nên không ghi nhận lượt khám mới.'
              : a.status === 'CHECKED_IN'
                ? 'Bệnh nhân đã check-in nhưng chưa vào khám. Bấm Vào khám ở Lịch trong ngày, hoặc chờ đến lượt ở Hàng đợi, rồi mới ghi nhận lượt khám.'
                : 'Chỉ ghi nhận lượt khám cho người đang trong phòng khám. Phiếu khám này hiện ở trạng thái khác, chưa có phiếu kết quả.'}
          </p>
        </section>
      )}

      {showForm && (
        <form
          className="t-panel"
          style={{ gap: 28 }}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            review();
          }}
        >
          <h2 className="t-h2">Phiếu kết quả khám</h2>
          <div className="t-tint-gold" style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: '6px 28px' }}>
            <span>
              <strong className="t-strong">Mã phiếu khám:</strong> {a.ticketCode}
            </span>
            <span>
              <strong className="t-strong">{record ? 'Ngày khám:' : 'Giờ hẹn:'}</strong> {record ? fmtDate(record.visitDate) : `${shortTime(a.slotStart)}, ${fmtDate(a.slotDate)}`}
            </span>
          </div>
          {editing && (
            <div role="status" className="t-tint-gold-line t-iconrow" style={{ gap: 12 }}>
              <Icon name="edit" size={22} />
              <p className="t-text">
                <strong className="t-strong">Đang sửa phiếu kết quả khám đã xác nhận.</strong> Còn sửa được đến <strong className="t-strong">{fmtStamp(st.until)}</strong> (còn{' '}
                {fmtLeft(st.left)}).
              </p>
            </div>
          )}
          <RecordFields form={current} setForm={setCurrent} errors={tried ? errs : {}} visitDate={visitDate} />
          <ErrorAlert error={error} />
          <div className="t-actions" style={{ alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>
            <button type="submit" className="t-btn t-btn-primary">
              <Icon name="check" strokeWidth={2.25} />
              {record ? 'Lưu thay đổi' : 'Lưu phiếu kết quả khám'}
            </button>
            {editing && (
              <button
                type="button"
                className="t-btn t-btn-ghost"
                style={{ padding: '0 20px' }}
                onClick={() => {
                  setEditing(false);
                  setForm(null);
                }}
              >
                Huỷ sửa
              </button>
            )}
          </div>
        </form>
      )}

      <section aria-labelledby="ls-tieude" className="t-panel" style={{ gap: 18 }}>
        <h2 id="ls-tieude" className="t-h2">
          Lịch sử khám của hồ sơ này
        </h2>
        {records.length > 0 ? (
          <HistoryTable
            withVitals
            records={records}
            locked={p.isLocked}
            onView={(r) => setDialog({ type: 'view', record: r })}
            onEdit={(r) => (r.id === record?.id ? startEdit() : setDialog({ type: 'editOther', record: r }))}
          />
        ) : (
          <div className="t-boxed" style={{ padding: '22px 20px' }}>
            <p className="t-text">Hồ sơ này chưa có lượt khám nào.</p>
          </div>
        )}
        <p className="t-iconrow t-text" style={{ gap: 10 }}>
          <Icon name="lock" size={22} />
          Chỉ hiển thị các lượt khám thuộc hồ sơ đang mở. Dữ liệu bệnh nhân, lượt khám và kết quả không bao giờ hiển thị công khai trên website.
        </p>
      </section>

      {dialog?.type === 'confirm' && <ResultDialog draft={dialog.draft} patient={p} pending={pending} onConfirm={confirm} onClose={() => setDialog(null)} />}
      {dialog?.type === 'editOther' && (
        <EditRecordDialog
          record={dialog.record}
          patient={p}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            detail.reload({ silent: true });
          }}
        />
      )}
      {dialog?.type === 'view' && (
        <ResultDialog
          record={dialog.record}
          patient={p}
          locked={p.isLocked}
          onClose={() => setDialog(null)}
          onEdit={dialog.record.id === record?.id ? startEdit : () => setDialog({ type: 'editOther', record: dialog.record })}
        />
      )}
    </>
  );
}
