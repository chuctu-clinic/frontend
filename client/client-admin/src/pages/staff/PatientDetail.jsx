import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { ErrorAlert, Loading } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { GENDERS, ageFrom, fmtDate, shortTime, todayVN } from '@chuctu/shared/lib/format.js';
import { isAdmin, useSession } from '@chuctu/shared/lib/session.jsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { FieldError, Notice, PhoneField, TDialog, normalizePhone, phoneError } from '../../components/t-ui.jsx';
import { EditRecordDialog, HistoryTable, ResultDialog } from './RecordParts.jsx';

/** Sửa thông tin hồ sơ: mã bệnh nhân không đổi (UC.9.5). */
function EditPatientDialog({ patient, onClose, onSaved }) {
  const [form, setForm] = useState({
    fullName: patient.fullName,
    birthYear: String(patient.birthYear || ''),
    phone: String(patient.phone || '').replace(/^0/, ''),
    gender: patient.gender || '',
    address: patient.address || '',
  });
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const year = Number(form.birthYear);
  const errs = {
    fullName: form.fullName.trim().length >= 2 ? null : 'Vui lòng nhập họ và tên (ít nhất 2 ký tự).',
    birthYear: /^(19|20)\d{2}$/.test(form.birthYear) && year <= Number(todayVN().slice(0, 4)) ? null : 'Nhập năm sinh gồm 4 chữ số, ví dụ 1952.',
    phone: phoneError(form.phone),
  };
  const fe = { ...(tried ? errs : {}), ...(error?.fields || {}) };

  const submit = async (e) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(errs).some(Boolean)) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.patch(`/staff/patients/${patient.id}`, {
        fullName: form.fullName.trim(),
        birthYear: form.birthYear,
        phone: normalizePhone(form.phone),
        gender: form.gender || null,
        address: form.address.trim() || null,
      });
      onSaved(res.patient);
    } catch (err) {
      setError(err);
      setPending(false);
    }
  };

  return (
    <TDialog title="Sửa thông tin hồ sơ" width={640} onClose={onClose}>
      <form className="t-dialog-body" style={{ padding: '24px 28px 28px', gap: 18 }} onSubmit={submit} noValidate>
        <p className="t-text">
          Mã bệnh nhân <strong className="t-strong">{patient.patientCode}</strong> được cấp một lần và không đổi.
        </p>
        <div className="t-field">
          <label htmlFor="sua-ten" className="t-label">
            Họ và tên <span className="t-req">*</span>
          </label>
          <input id="sua-ten" className="t-input" autoComplete="off" value={form.fullName} onChange={set('fullName')} aria-invalid={fe.fullName ? 'true' : 'false'} />
          <FieldError>{fe.fullName}</FieldError>
        </div>
        <div className="t-row">
          <div className="t-field" style={{ flex: '1 1 180px' }}>
            <label htmlFor="sua-nam" className="t-label">
              Năm sinh <span className="t-req">*</span>
            </label>
            <input
              id="sua-nam"
              className="t-input"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              value={form.birthYear}
              onChange={(e) => setForm((f) => ({ ...f, birthYear: e.target.value.replace(/\D/g, '') }))}
              aria-invalid={fe.birthYear ? 'true' : 'false'}
            />
            <FieldError>{fe.birthYear}</FieldError>
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <PhoneField id="sua-sdt" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} error={fe.phone} />
          </div>
        </div>
        <div className="t-row">
          <div className="t-field" style={{ flex: '1 1 180px' }}>
            <label htmlFor="sua-gt" className="t-label">
              Giới tính
            </label>
            <select id="sua-gt" className="t-select" value={form.gender} onChange={set('gender')}>
              <option value="">Chưa cập nhật</option>
              <option value="NU">Nữ</option>
              <option value="NAM">Nam</option>
              {form.gender === 'KHAC' && <option value="KHAC">Khác</option>}
            </select>
          </div>
          <div className="t-field" style={{ flex: '1 1 240px' }}>
            <label htmlFor="sua-dc" className="t-label">
              Địa chỉ
            </label>
            <input id="sua-dc" className="t-input" autoComplete="off" value={form.address} onChange={set('address')} />
            <FieldError>{fe.address}</FieldError>
          </div>
        </div>
        {error && !error.fields && <ErrorAlert error={error} />}
        <div className="t-actions" style={{ paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>
          <button type="submit" className="t-btn t-btn-primary" style={{ padding: '0 26px' }} disabled={pending}>
            Lưu thay đổi
          </button>
          <button type="button" className="t-btn t-btn-ghost" onClick={onClose}>
            Huỷ
          </button>
        </div>
      </form>
    </TDialog>
  );
}

/** Admin khoá hoặc mở khoá hồ sơ (UC.9.8). */
function LockDialog({ patient, onClose, onDone }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const locking = !patient.isLocked;
  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await api.post(`/admin/patients/${patient.id}/${locking ? 'lock' : 'unlock'}`);
      onDone(res.patient);
    } catch (err) {
      setError(err);
      setPending(false);
    }
  };
  return (
    <TDialog title={locking ? 'Khoá hồ sơ bệnh nhân?' : 'Mở khoá hồ sơ?'} tone={locking ? 'red' : 'green'} width={600} onClose={onClose}>
      <div className="t-dialog-body">
        <p className="t-text">
          {locking ? (
            <>
              Sau khi khoá, hồ sơ <strong className="t-strong">không chọn được khi đặt lịch</strong>, <strong className="t-strong">không ghi nhận lượt khám mới</strong> và không sửa được.
              Các phiếu khám đã đặt vẫn giữ nguyên, lịch sử khám vẫn xem được.
            </>
          ) : (
            'Hồ sơ sẽ dùng lại được: đặt lịch, ghi nhận lượt khám và sửa thông tin.'
          )}
        </p>
        <ErrorAlert error={error} />
        <div className="t-actions">
          <button type="button" className={`t-btn ${locking ? 't-btn-danger' : 't-btn-primary'} t-btn-grow`} disabled={pending} onClick={submit}>
            <Icon name={locking ? 'lock' : 'unlock'} />
            {locking ? 'Khoá hồ sơ' : 'Mở khoá'}
          </button>
          <button type="button" className="t-btn t-btn-ghost" onClick={onClose}>
            Quay lại
          </button>
        </div>
      </div>
    </TDialog>
  );
}

/** Hồ sơ chi tiết, phiếu khám đang chờ, lịch sử khám, khoá/mở khoá (UC.9.3, UC.9.5, UC.9.6, UC.9.8). */
export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useSession();
  const { data, loading, error, setData } = useAsync(() => api.get(`/staff/patients/${id}`), [id]);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);
  useDocumentTitle(data?.patient?.fullName || 'Hồ sơ bệnh nhân');

  if (loading) return <Loading />;
  if (error) return <ErrorAlert error={error} />;

  const p = data.patient;
  const today = todayVN();
  const upcoming = data.appointments
    .filter((a) => ['BOOKED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status) && a.slotDate >= today)
    .sort((a, b) => (a.slotDate + a.slotStart).localeCompare(b.slotDate + b.slotStart));
  const last = data.records[0]?.visitDate;
  const age = ageFrom(p.birthYear);
  const info = [
    ['Mã bệnh nhân', <strong key="m">{p.patientCode}</strong>],
    ['Họ và tên', p.fullName],
    [
      'Năm sinh',
      <>
        {p.birthYear || '—'} {age > 0 && <span style={{ color: 'var(--ink-500)' }}>({age} tuổi)</span>}
      </>,
    ],
    ['Giới tính', GENDERS[p.gender] || 'Chưa cập nhật'],
    ['Số điện thoại', p.phone || '—'],
    ['Địa chỉ', p.address || 'Chưa cập nhật'],
    ['Hồ sơ tạo ngày', fmtDate(p.createdAt)],
    ['Lần khám gần nhất', last ? fmtDate(last) : 'Chưa khám'],
  ];

  const replaceRecord = (rec) => setData((d) => ({ ...d, records: d.records.map((r) => (r.id === rec.id ? { ...r, ...rec } : r)) }));

  return (
    <>
      <Link to="/benh-nhan" className="t-back">
        <Icon name="arrowLeft" size={22} />
        Quay lại danh sách hồ sơ
      </Link>
      {notice && <Notice onClose={() => setNotice(null)}>{notice}</Notice>}

      <div className="t-panel" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '20px 24px', alignItems: 'center' }}>
        <span className="t-avatar">
          <Icon name="user" size={36} strokeWidth={1.75} />
        </span>
        <div style={{ flex: '999 1 280px', minWidth: 0 }}>
          <p className="t-muted" style={{ marginBottom: 2, fontWeight: 600 }}>
            Hồ sơ bệnh nhân {p.patientCode}
          </p>
          <h1 className="t-h1" style={{ marginBottom: 10 }}>
            {p.fullName}
          </h1>
          {p.isLocked ? (
            <span className="t-chip t-chip-done t-chip-sm" style={{ padding: '2px 12px' }}>
              <Icon name="lock" size={18} strokeWidth={2.25} />
              Hồ sơ đã khoá
            </span>
          ) : (
            <span className="t-chip t-chip-green" style={{ padding: '4px 12px' }}>
              <Icon name="check" size={18} strokeWidth={2.25} />
              Hồ sơ đang hoạt động
            </span>
          )}
        </div>
        <div className="t-actions" style={{ flex: '0 1 auto', gap: 12, alignItems: 'center' }}>
          {!p.isLocked && (
            <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 18px' }} onClick={() => setDialog({ type: 'edit' })}>
              <Icon name="edit" size={20} />
              Sửa thông tin
            </button>
          )}
          {isAdmin(user) && (
            <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 18px' }} onClick={() => setDialog({ type: 'lock' })}>
              <Icon name={p.isLocked ? 'unlock' : 'lock'} size={20} />
              {p.isLocked ? 'Mở khoá hồ sơ' : 'Khoá hồ sơ'}
            </button>
          )}
        </div>
      </div>

      {p.isLocked && (
        <div role="note" className="t-iconrow" style={{ background: 'var(--surface-200)', border: '2px solid var(--line-strong)', borderRadius: 20, padding: '18px 22px' }}>
          <Icon name="lock" size={28} strokeWidth={1.75} />
          <div>
            <p className="t-legend" style={{ marginBottom: 4 }}>
              Hồ sơ này đã khoá
            </p>
            <p style={{ lineHeight: '26px', color: 'var(--ink-900)' }}>
              Không chọn được khi đặt lịch khám, không ghi nhận lượt khám mới, không sửa thông tin và không sửa phiếu kết quả. Lịch sử khám vẫn xem được.{' '}
              {isAdmin(user) ? (
                'Bấm Mở khoá hồ sơ để dùng lại.'
              ) : (
                <>
                  Hồ sơ do Admin khoá, muốn dùng lại thì liên hệ <strong>Admin</strong> để mở khoá.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      <section aria-labelledby="tt-tieude" className="t-panel" style={{ gap: 14 }}>
        <h2 id="tt-tieude" className="t-h2">
          Thông tin hồ sơ
        </h2>
        <dl className="t-dl">
          {info.map(([label, value]) => (
            <div key={label} className="t-dl-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {!p.isLocked && (
        <section aria-labelledby="ve-tieude" className="t-panel">
          <h2 id="ve-tieude" className="t-h2">
            Phiếu khám hôm nay và sắp tới
          </h2>
          {upcoming.length > 0 ? (
            <div className="t-boxed t-scroll">
              <div role="table" aria-label="Phiếu khám chưa hoàn thành" className="t-table">
                <div role="row" className="t-tr t-thead" style={{ gridTemplateColumns: 'minmax(0, 1fr) 170px 210px' }}>
                  <div role="columnheader" className="t-th">
                    Mã phiếu khám
                  </div>
                  <div role="columnheader" className="t-th">
                    Trạng thái
                  </div>
                  <div role="columnheader" className="t-th">
                    Thao tác
                  </div>
                </div>
                <div role="rowgroup" className="t-tbody">
                  {upcoming.map((a) => (
                    <div key={a.id} role="row" className="t-tr" style={{ gridTemplateColumns: 'minmax(0, 1fr) 170px 210px' }}>
                      <div role="cell" className="t-td">
                        <span className="t-td-code">{a.ticketCode}</span>
                        <span className="t-td-sub">
                          {a.slotDate === today ? 'Hôm nay ' : ''}
                          {fmtDate(a.slotDate)}, {shortTime(a.slotStart)}
                        </span>
                      </div>
                      <div role="cell" className="t-td">
                        {a.status === 'BOOKED' ? (
                          <span className="t-chip t-chip-done t-chip-sm">Chưa đến</span>
                        ) : a.status === 'CHECKED_IN' ? (
                          <span className="t-chip t-chip-green" style={{ padding: '4px 12px' }}>
                            Đã check-in
                          </span>
                        ) : (
                          <span className="t-chip t-chip-solid" style={{ padding: '4px 12px' }}>
                            Đã vào khám
                          </span>
                        )}
                      </div>
                      <div role="cell" className="t-td" style={{ padding: '10px 16px' }}>
                        {a.status === 'IN_PROGRESS' ? (
                          <Link to={`/phieu-kham/${a.id}/ket-qua`} className="t-btn t-btn-primary" style={{ padding: '0 14px' }}>
                            Ghi nhận lượt khám
                          </Link>
                        ) : (
                          <span className="t-muted">{a.status === 'CHECKED_IN' ? 'Đang chờ vào khám' : 'Chờ bệnh nhân đến'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="t-text">Hồ sơ này chưa có phiếu khám nào đang chờ.</p>
          )}
          <Link to={`/lich-trong-ngay?dat=${p.id}`} className="t-btn t-btn-ghost" style={{ alignSelf: 'flex-start' }}>
            <Icon name="calendarPlus" strokeWidth={1.75} />
            Đặt lịch khám cho bệnh nhân này
          </Link>
        </section>
      )}

      <section aria-labelledby="ls-tieude" className="t-panel">
        <h2 id="ls-tieude" className="t-h2">
          Lịch sử khám
        </h2>
        {data.records.length > 0 ? (
          <HistoryTable
            records={data.records}
            locked={p.isLocked}
            onView={(r) => setDialog({ type: 'view', record: r })}
            onEdit={p.isLocked ? null : (r) => setDialog({ type: 'editRecord', record: r })}
          />
        ) : (
          <p className="t-text">Hồ sơ này chưa có lượt khám nào.</p>
        )}
        <p className="t-iconrow t-text" style={{ gap: 10 }}>
          <Icon name="lock" size={22} />
          Dữ liệu bệnh nhân, lượt khám và kết quả không bao giờ hiển thị công khai trên website.
        </p>
      </section>

      {dialog?.type === 'edit' && (
        <EditPatientDialog
          patient={p}
          onClose={() => setDialog(null)}
          onSaved={(patient) => {
            setData((d) => ({ ...d, patient }));
            setDialog(null);
            setNotice('Đã lưu thông tin hồ sơ.');
          }}
        />
      )}
      {dialog?.type === 'lock' && (
        <LockDialog
          patient={p}
          onClose={() => setDialog(null)}
          onDone={(patient) => {
            setData((d) => ({ ...d, patient }));
            setDialog(null);
            setNotice(patient.isLocked ? 'Đã khoá hồ sơ.' : 'Đã mở khoá hồ sơ.');
          }}
        />
      )}
      {dialog?.type === 'view' && (
        <ResultDialog
          record={dialog.record}
          patient={p}
          locked={p.isLocked}
          onClose={() => setDialog(null)}
          onEdit={() => setDialog({ type: 'editRecord', record: dialog.record })}
        />
      )}
      {dialog?.type === 'editRecord' && (
        <EditRecordDialog
          record={dialog.record}
          patient={p}
          onClose={() => setDialog(null)}
          onSaved={(rec) => {
            replaceRecord(rec);
            setDialog(null);
            setNotice(`Đã cập nhật phiếu kết quả khám cho phiếu khám ${rec.appointment?.ticketCode}. Bệnh nhân sẽ thấy nội dung mới trong tài khoản website.`);
          }}
        />
      )}
    </>
  );
}
