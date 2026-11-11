import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert, Loading } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { GENDERS, fmtDate } from '../../../shared/lib/format.js';
import { TREATMENT_KINDS } from '../../../shared/domain/constants.js';
import { HISTORY_ITEMS, buildHistory, parseHistory } from '../../../shared/domain/medicalHistory.js';
import { useAsync, useDocumentTitle } from '../../../shared/lib/hooks.js';
import { FieldError } from '../../components/fields.jsx';
import { TDialog } from '../../components/dialogs.jsx';
import { ResultDialog } from '../../components/records/ResultSheet.jsx';
import { clock, kindLabels } from '../../components/visit/VisitSummary.jsx';

const NO_HISTORY = { lines: HISTORY_ITEMS.map(() => null), extra: [] };
const EMPTY = { symptoms: '', prelimDiagnosis: '', pulse: '', bpTop: '', bpBottom: '', history: NO_HISTORY, treatmentKinds: [], treatmentOther: '', treatmentOrder: '' };

const KIND_ICONS = { CHAM_CUU: 'needleSoft', XOA_BOP_BAM_HUYET: 'handSoft', VAT_LY_TRI_LIEU: 'physio', KHAC: 'plus' };

function fromVisit(v) {
  const [top = '', bottom = ''] = String(v.bloodPressure || '').split('/');
  return {
    symptoms: v.symptoms || '',
    prelimDiagnosis: v.prelimDiagnosis || '',
    pulse: v.pulse || '',
    bpTop: top,
    bpBottom: bottom,
    history: parseHistory(v.medicalHistory),
    treatmentKinds: v.treatmentKinds || [],
    treatmentOther: v.treatmentOther || '',
    treatmentOrder: v.treatmentOrder || '',
  };
}

function validate(f, needOrder) {
  const pulse = Number(f.pulse);
  const top = Number(f.bpTop);
  const bottom = Number(f.bpBottom);
  const bothOrNone = (f.bpTop === '') === (f.bpBottom === '');
  return {
    pulse: f.pulse === '' || (pulse >= 30 && pulse <= 220) ? null : 'Mạch từ 30 đến 220 lần/phút.',
    bp: !bothOrNone
      ? 'Nhập đủ hai số, ví dụ 130 và 80.'
      : f.bpTop === '' || (top >= 60 && top <= 260 && bottom >= 30 && bottom <= 160 && top > bottom)
        ? null
        : 'Huyết áp chưa hợp lý. Số trên từ 60 đến 260, số dưới từ 30 đến 160 và số trên phải lớn hơn số dưới.',
    treatmentKinds: needOrder && f.treatmentKinds.length === 0 ? 'Vui lòng chọn ít nhất một kỹ thuật điều trị.' : null,
    treatmentOther: needOrder && f.treatmentKinds.includes('KHAC') && !f.treatmentOther.trim() ? 'Vui lòng ghi rõ kỹ thuật khác.' : null,
  };
}

const v = (s) => (s && s.trim() ? s.trim() : null);
const bp = (f) => (f.bpTop && f.bpBottom ? `${f.bpTop}/${f.bpBottom}` : null);
const vitalsText = (r) => [r.pulse && `Mạch ${String(r.pulse).replace(/\D/g, '')}`, r.bloodPressure && `HA ${r.bloodPressure}`].filter(Boolean).join(' · ');

/** Bác sĩ khám sơ bộ một bệnh nhân vừa gọi vào: ghi triệu chứng, chỉ số, chẩn đoán ban đầu rồi chỉ định điều trị. */
export default function ExamForm() {
  const { checkinId } = useParams();
  useDocumentTitle('Khám sơ bộ');
  const navigate = useNavigate();
  const uid = useId();
  const id = (k) => `${uid}-${k}`;
  const queue = useAsync(() => api.get('/staff/queue'), [checkinId]);
  const visit = queue.data?.examining.find((x) => x.id === checkinId);
  const patientId = visit?.patient?.id;
  const detail = useAsync(() => (patientId ? api.get(`/staff/patients/${patientId}`) : Promise.resolve(null)), [patientId]);
  const [form, setForm] = useState(null);
  const [tried, setTried] = useState(null); // 'order' | 'conclude'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [allHistory, setAllHistory] = useState(false);
  const bpBottomRef = useRef(null);
  const historySeeded = useRef(false);

  // Mở lại sau khi sửa chỉ định: điền sẵn những gì đã ghi
  useEffect(() => {
    if (visit && form === null) setForm(visit.orderedAt || visit.symptoms || visit.treatmentKinds?.length ? fromVisit(visit) : EMPTY);
  }, [visit, form]);

  // Lượt mới: điền sẵn tiền sử của lần khám gần nhất, bác sĩ hỏi lại và sửa nếu có thay đổi
  const lastHistory = (detail.data?.records || []).reduce((best, r) => (!best || String(r.visitDate) > String(best.visitDate) ? r : best), null)?.medicalHistory;
  useEffect(() => {
    if (historySeeded.current || !form || !detail.data) return;
    historySeeded.current = true;
    if (visit?.medicalHistory || !lastHistory) return;
    setForm((x) => (buildHistory(x.history) ? x : { ...x, history: parseHistory(lastHistory) }));
  }, [form, detail.data, visit, lastHistory]);

  if (queue.loading && !queue.data) return <Loading />;
  if (queue.error) return <ErrorAlert error={queue.error} />;
  if (!visit) {
    return (
      <>
        <Link to="/noi-bo/kham-benh" className="t-back">
          <Icon name="arrowLeft" size={22} />
          Về Khám bệnh
        </Link>
        <section className="t-panel">
          <h1 className="t-h2">Bệnh nhân không còn đang khám sơ bộ</h1>
          <p className="t-text">Lượt khám này đã được chỉ định điều trị, đã kết luận, hoặc đã trả về hàng chờ. Xem lại ở trang Khám bệnh.</p>
        </section>
      </>
    );
  }

  const f = form || EMPTY;
  const p = detail.data?.patient || visit.patient;
  const records = detail.data?.records || [];
  const errs = validate(f, tried === 'order');
  const shown = tried ? errs : {};
  const set = (k) => (e) => setForm((x) => ({ ...(x || EMPTY), [k]: e.target.value }));
  const digits = (e) => e.target.value.replace(/\D/g, '').slice(0, 3);
  const setNum = (k) => (e) => setForm((x) => ({ ...(x || EMPTY), [k]: digits(e) }));
  // Gõ đủ 3 số huyết áp trên thì tự sang ô số dưới
  const setBpTop = (e) => {
    const val = digits(e);
    setForm((x) => ({ ...(x || EMPTY), bpTop: val }));
    if (val.length === 3) bpBottomRef.current?.focus();
  };
  const toggleHistory = (i) =>
    setForm((x) => {
      const cur = (x || EMPTY).history;
      const lines = [...cur.lines];
      lines[i] = lines[i] ? null : HISTORY_ITEMS[i].label;
      return { ...(x || EMPTY), history: { ...cur, lines } };
    });
  const toggleKind = (k) =>
    setForm((x) => {
      const cur = (x || EMPTY).treatmentKinds;
      return { ...(x || EMPTY), treatmentKinds: cur.includes(k) ? cur.filter((y) => y !== k) : [...cur, k] };
    });

  const order = async () => {
    setTried('order');
    if (Object.values(validate(f, true)).some(Boolean)) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/staff/exam/${visit.id}/order`, {
        symptoms: v(f.symptoms),
        prelimDiagnosis: v(f.prelimDiagnosis),
        pulse: v(f.pulse),
        bloodPressure: bp(f),
        medicalHistory: buildHistory(f.history),
        treatmentKinds: f.treatmentKinds,
        treatmentOther: f.treatmentKinds.includes('KHAC') ? v(f.treatmentOther) : null,
        treatmentOrder: v(f.treatmentOrder),
      });
      navigate('/noi-bo/kham-benh', { state: { notice: `Đã chuyển ${visit.patient?.fullName} sang điều trị. Khi kỹ thuật viên lưu báo cáo, bệnh nhân hiện ở mục Chờ kết luận.` } });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  /** Không cần điều trị: sang phiếu kết quả, mang theo những gì đã ghi. */
  const concludeNow = () => {
    setTried('conclude');
    if (Object.values(validate(f, false)).some(Boolean)) return;
    navigate(`/noi-bo/phieu-kham/${visit.appointmentId}/ket-qua`, {
      state: { back: `/noi-bo/kham-benh/${visit.id}`, prefill: { diagnosis: v(f.prelimDiagnosis), pulse: v(f.pulse), bloodPressure: bp(f), medicalHistory: buildHistory(f.history) } },
    });
  };

  const undoCall = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/staff/exam/${visit.id}/undo-call`);
      navigate('/noi-bo/kham-benh', { state: { notice: `${visit.patient?.fullName} đã trở lại hàng chờ khám, đúng vị trí theo giờ check-in.` } });
    } catch (err) {
      setError(err);
      setConfirmUndo(false);
    } finally {
      setBusy(false);
    }
  };

  const age = p.birthYear ? new Date().getFullYear() - p.birthYear : null;
  const lastRecord = records.reduce((best, r) => (!best || String(r.visitDate) > String(best.visitDate) ? r : best), null);
  const historyCount = f.history.lines.filter(Boolean).length;

  return (
    <>
      <div className="dk-headbar">
        <Link to="/noi-bo/kham-benh" className="t-back" style={{ margin: 0 }}>
          <Icon name="arrowLeft" size={22} />
          Về Khám bệnh
        </Link>
        <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 16px', minHeight: 44 }} disabled={busy} onClick={() => setConfirmUndo(true)}>
          <Icon name="undo" size={20} />
          Gọi nhầm? Trả về hàng chờ
        </button>
      </div>

      {/* Bệnh nhân: một dải ngang, lịch sử khám mở khi cần */}
      <section className="ks-patient" aria-labelledby="ks-tieude">
        <div className="ks-patient-top">
          <span className="t-avatar" style={{ width: 60, height: 60 }}>
            <Icon name="user" size={30} strokeWidth={1.75} />
          </span>
          <div className="ks-patient-main">
            <p className="ks-kicker">
              Khám sơ bộ · {visit.ticketCode} · gọi vào {clock(visit.examStartedAt)}
            </p>
            <h1 id="ks-tieude" className="ks-name">
              {p.fullName}
            </h1>
            <ul className="ks-tags" aria-label="Thông tin bệnh nhân">
              <li>{p.patientCode}</li>
              <li>{age !== null ? `${age} tuổi (${p.birthYear})` : 'Chưa có năm sinh'}</li>
              <li>{GENDERS[p.gender] || 'Chưa rõ giới tính'}</li>
            </ul>
          </div>
          <div className="ks-last">
            <p className="ks-last-label">Lần khám gần nhất</p>
            {lastRecord ? (
              <>
                <p className="ks-last-date">{fmtDate(lastRecord.visitDate)}</p>
                <p className="ks-last-dx">{lastRecord.diagnosis || 'Chưa ghi chẩn đoán'}</p>
              </>
            ) : (
              <p className="ks-last-dx">{detail.loading ? 'Đang tải…' : 'Đây là lần khám đầu tiên'}</p>
            )}
            {records.length > 0 && (
              <button type="button" className="dk-linkbtn" aria-expanded={allHistory} aria-controls={id('ls')} onClick={() => setAllHistory((x) => !x)}>
                {allHistory ? 'Ẩn lịch sử khám' : `Xem lịch sử khám (${records.length} lần)`}
              </button>
            )}
          </div>
        </div>
        {allHistory && records.length > 0 && (
          <ul className="ks-hist" id={id('ls')} aria-label="Lịch sử khám">
            {records.map((r) => (
              <li key={r.id}>
                <div className="dk-hist-main">
                  <p className="dk-hist-date">{fmtDate(r.visitDate)}</p>
                  <p className="dk-hist-dx">{r.diagnosis || 'Chưa ghi chẩn đoán'}</p>
                  {vitalsText(r) && <p className="dk-hist-vit">{vitalsText(r)}</p>}
                </div>
                <button
                  type="button"
                  className="t-btn t-btn-ghost t-btn-icon"
                  aria-label={`Xem phiếu ngày ${fmtDate(r.visitDate)}`}
                  aria-haspopup="dialog"
                  onClick={() => setViewRecord(r)}
                >
                  <Icon name="eye" size={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        className="ks-form"
        noValidate
        aria-label="Phiếu khám sơ bộ"
        onSubmit={(e) => {
          e.preventDefault();
          order();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !busy) {
            e.preventDefault();
            order();
          }
        }}
      >
        {/* 1. Hỏi bệnh */}
        <fieldset className="ks-sec">
          <legend className="ks-sec-head">
            <span className="dk-step-no">1</span>
            <span>
              <span className="ks-sec-title">Hỏi bệnh</span>
            </span>
          </legend>
          <div className="ks-sec-body">
            <div className="t-field">
              <label htmlFor={id('tc')} className="t-label">
                Triệu chứng, lý do đến khám
              </label>
              <textarea
                id={id('tc')}
                rows={3}
                className="t-textarea ks-text"
                autoComplete="off"
                value={f.symptoms}
                onChange={set('symptoms')}
              />
            </div>
            <div className="t-field">
              <div className="ks-labelrow">
                <span className="t-label" id={id('ts')}>
                  Tiền sử bệnh
                </span>
                {lastHistory && !visit.medicalHistory && (
                  <span className="ks-note">
                    <Icon name="info" size={16} />
                    Đã điền sẵn theo lần khám gần nhất
                  </span>
                )}
                <span className="ks-meta" style={{ marginLeft: 'auto' }}>
                  {historyCount ? `Đã chọn ${historyCount}` : 'Chưa chọn mục nào'}
                </span>
              </div>
              <div className="dk-hx" role="group" aria-labelledby={id('ts')}>
                {HISTORY_ITEMS.map((it, i) => {
                  const on = Boolean(f.history.lines[i]);
                  return (
                    <button key={it.label} type="button" role="checkbox" aria-checked={on} className="dk-hx-item" onClick={() => toggleHistory(i)}>
                      <span className={`t-check ${on ? 'on' : ''}`} aria-hidden="true">
                        {on && <Icon name="check" size={18} strokeWidth={3} />}
                      </span>
                      {it.label}
                    </button>
                  );
                })}
              </div>
              {f.history.extra.length > 0 && (
                <p className="t-muted" style={{ whiteSpace: 'pre-line' }}>
                  Ghi chú tiền sử đã có (giữ nguyên): {f.history.extra.join('\n')}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {/* 2. Thăm khám */}
        <fieldset className="ks-sec">
          <legend className="ks-sec-head">
            <span className="dk-step-no">2</span>
            <span>
              <span className="ks-sec-title">Thăm khám</span>
            </span>
          </legend>
          <div className="ks-sec-body">
            <div className="ks-vitals">
              <div className="ks-vital">
                <label htmlFor={id('mach')} className="t-label">
                  Mạch
                </label>
                <div className="ks-numbox">
                  <input
                    id={id('mach')}
                    className="t-input ks-num"
                    inputMode="numeric"
                    maxLength={3}
                    autoComplete="off"
                    value={f.pulse}
                    onChange={setNum('pulse')}
                    aria-invalid={shown.pulse ? 'true' : 'false'}
                    aria-describedby={id('mach-loi')}
                  />
                  <span className="ks-unit">lần/phút</span>
                </div>
                <FieldError id={id('mach-loi')}>{shown.pulse}</FieldError>
              </div>
              <div className="ks-vital">
                <span className="t-label" id={id('ha')}>
                  Huyết áp
                </span>
                <div className="ks-numbox" role="group" aria-labelledby={id('ha')}>
                  <input
                    className="t-input ks-num"
                    inputMode="numeric"
                    maxLength={3}
                    aria-label="Huyết áp số trên"
                    autoComplete="off"
                    value={f.bpTop}
                    onChange={setBpTop}
                    aria-invalid={shown.bp ? 'true' : 'false'}
                    aria-describedby={id('ha-loi')}
                  />
                  <span className="ks-slash" aria-hidden="true">
                    /
                  </span>
                  <input
                    ref={bpBottomRef}
                    className="t-input ks-num"
                    inputMode="numeric"
                    maxLength={3}
                    aria-label="Huyết áp số dưới"
                    autoComplete="off"
                    value={f.bpBottom}
                    onChange={setNum('bpBottom')}
                    aria-invalid={shown.bp ? 'true' : 'false'}
                    aria-describedby={id('ha-loi')}
                  />
                  <span className="ks-unit">mmHg</span>
                </div>
                <FieldError id={id('ha-loi')}>{shown.bp}</FieldError>
              </div>
            </div>
            <div className="t-field">
              <label htmlFor={id('cd')} className="t-label">
                Chẩn đoán ban đầu
              </label>
              <textarea
                id={id('cd')}
                rows={2}
                className="t-textarea ks-text"
                autoComplete="off"
                value={f.prelimDiagnosis}
                onChange={set('prelimDiagnosis')}
              />
            </div>
          </div>
        </fieldset>

        {/* 3. Chỉ định */}
        <fieldset className="ks-sec">
          <legend className="ks-sec-head">
            <span className="dk-step-no">3</span>
            <span>
              <span className="ks-sec-title">Chỉ định điều trị</span>
            </span>
          </legend>
          <div className="ks-sec-body">
            <div className={`dk-kinds ${shown.treatmentKinds ? 'invalid' : ''}`} role="group" aria-label="Kỹ thuật điều trị" aria-describedby={id('kt-loi')}>
              {Object.entries(TREATMENT_KINDS).map(([k, label]) => {
                const on = f.treatmentKinds.includes(k);
                return (
                  <button key={k} type="button" role="checkbox" aria-checked={on} className="dk-kind" onClick={() => toggleKind(k)}>
                    <span className="dk-kind-ico">
                      <Icon name={KIND_ICONS[k] || 'plus'} size={22} />
                    </span>
                    {label}
                    {on && (
                      <span className="dk-kind-tick">
                        <Icon name="check" size={22} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <FieldError id={id('kt-loi')}>{shown.treatmentKinds}</FieldError>
            {f.treatmentKinds.includes('KHAC') && (
              <div className="t-field">
                <label htmlFor={id('khac')} className="t-label">
                  Kỹ thuật khác
                </label>
                <input
                  id={id('khac')}
                  className="t-input ks-text"
                  autoComplete="off"
                  value={f.treatmentOther}
                  onChange={set('treatmentOther')}
                  aria-invalid={shown.treatmentOther ? 'true' : 'false'}
                  aria-describedby={id('khac-loi')}
                />
                <FieldError id={id('khac-loi')}>{shown.treatmentOther}</FieldError>
              </div>
            )}
            <div className="t-field">
              <label htmlFor={id('cdinh')} className="t-label">
                Ghi chú cho kỹ thuật viên
              </label>
              <textarea
                id={id('cdinh')}
                rows={3}
                className="t-textarea ks-text"
                autoComplete="off"
                value={f.treatmentOrder}
                onChange={set('treatmentOrder')}
              />
            </div>
          </div>
        </fieldset>

        {error && (
          <div style={{ padding: '16px 28px 0' }}>
            <ErrorAlert error={error} />
          </div>
        )}

        <div className="ks-bar">
          <p className="ks-bar-sum" aria-live="polite">
            {f.treatmentKinds.length ? (
              <>
                <span className="ks-meta">Chỉ định:</span> <strong>{kindLabels(f.treatmentKinds, f.treatmentOther.trim())}</strong>
              </>
            ) : (
              <span className="ks-meta">Chưa chọn kỹ thuật điều trị</span>
            )}
          </p>
          <div className="ks-bar-btns">
            <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 18px' }} disabled={busy} onClick={concludeNow}>
              <Icon name="file" size={20} />
              Không cần điều trị, kết luận luôn
            </button>
            <button type="submit" className="t-btn t-btn-primary t-btn-bold" disabled={busy}>
              Chuyển sang điều trị
              <Icon name="arrowRight" />
            </button>
          </div>
        </div>
      </form>

      {viewRecord && <ResultDialog record={viewRecord} patient={p} locked onClose={() => setViewRecord(null)} />}

      {confirmUndo && (
        <TDialog title="Trả bệnh nhân về hàng chờ?" width={520} alert onClose={() => setConfirmUndo(false)}>
          <div className="t-dialog-body" style={{ gap: 20 }}>
            <p className="t-text">
              Dùng khi gọi nhầm người. <strong className="t-strong">{visit.patient?.fullName}</strong> trở lại hàng chờ khám, đúng vị trí theo giờ check-in. Những gì
              đang ghi ở trang này sẽ không được lưu.
            </p>
            <div className="t-actions" style={{ gap: 12 }}>
              <button type="button" className="t-btn t-btn-primary t-btn-bold" style={{ flex: '1 1 200px', minHeight: 48 }} disabled={busy} onClick={undoCall}>
                Trả về hàng chờ
              </button>
              <button type="button" className="t-btn t-btn-ghost" style={{ minHeight: 48 }} onClick={() => setConfirmUndo(false)}>
                Tiếp tục khám
              </button>
            </div>
          </div>
        </TDialog>
      )}
    </>
  );
}
