import { useEffect, useId, useState } from 'react';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert, Loading } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { useAsync, useDocumentTitle } from '../../../shared/lib/hooks.js';
import { FieldError } from '../../components/fields.jsx';
import { NoticeDialog, Summary, TDialog } from '../../components/dialogs.jsx';
import { clock, kindLabels } from '../../components/visit/VisitSummary.jsx';

/** Trang của kỹ thuật viên: 5 chỗ điều trị, hàng chờ điều trị, báo cáo điều trị gửi bác sĩ. */
export default function TreatmentRoom() {
  useDocumentTitle('Điều trị');
  const { data, loading, error, reload, setData } = useAsync(() => api.get('/staff/queue'), []);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [reportFor, setReportFor] = useState(null);
  const [undoTarget, setUndoTarget] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const t = setInterval(() => reload({ silent: true }), 10_000);
    return () => clearInterval(t);
  }, [reload]);

  const act = async (fn) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      return true;
    } catch (err) {
      setActionError(err);
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Loading />;

  const freeSeats = data ? data.capacity - data.inRoomCount : 0;
  const waiting = data?.treatmentWaiting || [];
  const now = Date.now();
  const minutesSince = (t) => (t ? Math.max(0, Math.floor((now - new Date(t).getTime()) / 60000)) : null);
  const seatPatient = (w) => act(async () => setData(await api.post(`/staff/treatment/${w.id}/seat`)));
  // Chỗ trống: server tự chọn người đầu hàng mới nhất (bỏ qua dòng hỏng, không trùng khi hai người cùng bấm)
  const inviteNext = () => act(async () => setData(await api.post('/staff/treatment/invite')));

  return (
    <>
      <div className="dk-headbar">
        <div>
          <h1 className="t-h1">Điều trị</h1>
        </div>
        {data && (
          <div className="dt-summary">
            <span>
              <b>{data.inRoomCount}</b>/{data.capacity} chỗ có người
            </span>
            <span>
              <b>{waiting.length}</b> người chờ
            </span>
          </div>
        )}
      </div>

      {notice && <NoticeDialog onClose={() => setNotice(null)}>{notice}</NoticeDialog>}
      <ErrorAlert error={error || (!reportFor && !undoTarget ? actionError : null)} />

      {data && (
        <>
          <section aria-labelledby="dt-ghe" className="t-card t-card-pad">
            <h2 id="dt-ghe" className="t-h2">
              Chỗ điều trị
            </h2>
            <ol className="dt-seats">
              {data.seats.map((s) => {
                if (s.empty) {
                  const firstEmpty = data.seats.find((x) => x.empty)?.seatNo === s.seatNo;
                  return (
                    <li key={s.seatNo} className="dt-seat empty">
                      <span className="dt-seat-no">{s.seatNo}</span>
                      <p className="dt-empty-text">Chỗ trống</p>
                      {firstEmpty && waiting.length > 0 && !data.autoInvite && (
                        <button type="button" className="t-btn t-btn-ghost dt-btn" disabled={busy} onClick={inviteNext}>
                          <Icon name="arrowRight" size={20} />
                          Mời {waiting[0].patient?.fullName}
                        </button>
                      )}
                    </li>
                  );
                }
                const mins = minutesSince(s.enteredAt);
                return (
                  <li key={s.seatNo} className="dt-seat">
                    <span className="dt-seat-no">{s.seatNo}</span>
                    <div className="dt-who">
                      <p className="dt-name">
                        {s.patient?.fullName}
                        {mins !== null && <span className="dt-mins">{mins} phút</span>}
                      </p>
                      <p className="dt-sub">
                        {s.ticketCode} · vào lúc {clock(s.enteredAt)}
                      </p>
                    </div>
                    <div className="dt-order">
                      <p className="dt-kinds">{kindLabels(s.treatmentKinds, s.treatmentOther) || '—'}</p>
                      {s.treatmentOrder && <p className="dt-note">{s.treatmentOrder}</p>}
                    </div>
                    <div className="dt-acts">
                      <button type="button" className="t-btn t-btn-primary t-btn-bold dt-btn" onClick={() => setReportFor(s)}>
                        Báo cáo điều trị
                      </button>
                      <button type="button" className="t-btn t-btn-ghost t-btn-icon" aria-label={`Hoàn tác vào chỗ của ${s.patient?.fullName}`} title="Hoàn tác" onClick={() => setUndoTarget(s)}>
                        <Icon name="undo" size={20} strokeWidth={1.75} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="dt-cho" className="t-card t-card-pad">
            <div className="dk-sectionhead">
              <div className="t-titlerow">
                <h2 id="dt-cho" className="t-h2">
                  Hàng chờ điều trị
                </h2>
                <span className="t-count sand">{waiting.length} người</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={data.autoInvite}
                className="dt-switch"
                disabled={busy}
                onClick={() => act(async () => setData(await api.put('/staff/queue/auto-invite', { enabled: !data.autoInvite })))}
              >
                <span className="dt-switch-track" aria-hidden="true">
                  <span className="dt-switch-knob" />
                </span>
                Tự động mời khi có chỗ trống
              </button>
            </div>
            {waiting.length === 0 ? (
              <p className="t-dashed">Chưa có ai chờ điều trị.</p>
            ) : (
              <ol className="dt-seats">
                {waiting.map((w, i) => (
                  <li key={w.id} className="dt-seat waiting">
                    <span className={`dt-seat-no ${i === 0 ? 'next' : ''}`} aria-label={`Thứ tự ${i + 1}`}>
                      {i + 1}
                    </span>
                    <div className="dt-who">
                      <p className="dt-name">{w.patient?.fullName}</p>
                      <p className="dt-sub">
                        {w.ticketCode} · chỉ định lúc {clock(w.orderedAt)}
                        {w.doctorName ? ` · BS ${w.doctorName}` : ''}
                      </p>
                    </div>
                    <div className="dt-order">
                      <p className="dt-kinds">{kindLabels(w.treatmentKinds, w.treatmentOther) || '—'}</p>
                      {w.treatmentOrder && <p className="dt-note">{w.treatmentOrder}</p>}
                    </div>
                    <div className="dt-acts">
                      {freeSeats > 0 && (i > 0 || !data.autoInvite) && (
                        <button type="button" className="t-btn t-btn-ghost dt-btn" disabled={busy} onClick={() => seatPatient(w)}>
                          {i > 0 ? 'Mời trước' : 'Mời vào chỗ'}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}

      {reportFor && (
        <ReportDialog
          target={reportFor}
          onClose={() => setReportFor(null)}
          onSaved={(next) => {
            setData(next);
            setNotice(
              <>
                Đã lưu báo cáo điều trị của <span className="t-notice-name">{reportFor.patient?.fullName}</span> và gửi tới bác sĩ. Chỗ {reportFor.seatNo} đã trống.
              </>,
            );
            setReportFor(null);
          }}
        />
      )}

      {undoTarget && (
        <TDialog title="Hoàn tác vào chỗ?" width={560} alert onClose={() => setUndoTarget(null)}>
          <div className="t-dialog-body" style={{ gap: 20 }}>
            <Summary
              items={[
                ['Bệnh nhân', undoTarget.patient?.fullName],
                ['Mã phiếu khám', undoTarget.ticketCode],
                ['Vào chỗ lúc', clock(undoTarget.enteredAt), null, false],
              ]}
            />
            <p className="t-text">
              Bệnh nhân trở lại <strong className="t-strong">hàng chờ điều trị</strong>, đúng vị trí theo giờ chỉ định.
              {data?.autoInvite && ' Chỗ vừa trống tự động nhận người kế tiếp.'}
            </p>
            <ErrorAlert error={actionError} />
            <div className="t-actions" style={{ gap: 12 }}>
              <button
                type="button"
                className="t-btn t-btn-primary t-btn-bold"
                style={{ flex: '1 1 220px', minHeight: 48 }}
                disabled={busy}
                onClick={async () => {
                  const ok = await act(async () => setData(await api.post(`/staff/treatment/${undoTarget.id}/undo-seat`)));
                  if (ok) setUndoTarget(null);
                }}
              >
                Xác nhận hoàn tác
              </button>
              <button type="button" className="t-btn t-btn-ghost" style={{ minHeight: 48 }} onClick={() => setUndoTarget(null)}>
                Quay lại
              </button>
            </div>
          </div>
        </TDialog>
      )}
    </>
  );
}

// Mỗi mục báo cáo ứng với một kỹ thuật bác sĩ có thể chỉ định
const REPORT_ITEMS = [
  { key: 'acupuncture', kinds: ['CHAM_CUU'], label: 'Châm cứu' },
  { key: 'acupressure', kinds: ['XOA_BOP_BAM_HUYET'], label: 'Xoa bóp — bấm huyệt' },
  { key: 'physio', kinds: ['VAT_LY_TRI_LIEU'], label: 'Vật lý trị liệu' },
  { key: 'other', kinds: ['KHAC'], label: 'Khác' },
];

/** Báo cáo điều trị: tích kỹ thuật đã làm và ghi chú từng kỹ thuật. Tích sẵn các kỹ thuật bác sĩ đã chỉ định. */
function ReportDialog({ target, onClose, onSaved }) {
  const uid = useId();
  const id = (k) => `${uid}-${k}`;
  const kinds = target.treatmentKinds || [];
  const [form, setForm] = useState({ acupuncture: '', acupressure: '', physio: '', other: '', note: '' });
  const [checked, setChecked] = useState(() => REPORT_ITEMS.filter((it) => it.kinds.some((k) => kinds.includes(k))).map((it) => it.key));
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const val = (s) => (s.trim() ? s.trim() : null);
  const toggle = (k) => setChecked((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  // Mỗi kỹ thuật đã tích phải ghi lại đã làm gì; không tích kỹ thuật nào thì chưa gửi được
  const missing = checked.filter((k) => !form[k].trim());
  const noneChecked = checked.length === 0;
  const invalid = noneChecked || missing.length > 0;

  const save = async () => {
    setTried(true);
    if (invalid || busy) return;
    setBusy(true);
    setError(null);
    try {
      onSaved(
        await api.post(`/staff/treatment/${target.id}/report`, {
          acupuncture: checked.includes('acupuncture') ? val(form.acupuncture) : null,
          acupressure: checked.includes('acupressure') ? val(form.acupressure) : null,
          physio: checked.includes('physio') ? val(form.physio) : null,
          other: checked.includes('other') ? val(form.other) : null,
          note: val(form.note),
        }),
      );
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TDialog title="Báo cáo điều trị" subtitle={`${target.patient?.fullName} · Chỗ ${target.seatNo} · vào chỗ lúc ${clock(target.enteredAt)}`} width={880} onClose={onClose}>
      <form
        className="t-dialog-body bc-body"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            save();
          }
        }}
      >
        <div className="bc-grid">
          {/* Chỉ định của bác sĩ: chỉ đọc */}
          <aside className="bc-order" aria-labelledby={id('cd')}>
            <h3 className="bc-order-title" id={id('cd')}>
              Chỉ định của bác sĩ
            </h3>
            <dl className="bc-dl">
              <dt>Kỹ thuật</dt>
              <dd>{kindLabels(kinds, target.treatmentOther) || '—'}</dd>
              {target.treatmentOrder && (
                <>
                  <dt>Ghi chú</dt>
                  <dd>{target.treatmentOrder}</dd>
                </>
              )}
              {target.prelimDiagnosis && (
                <>
                  <dt>Chẩn đoán</dt>
                  <dd>{target.prelimDiagnosis}</dd>
                </>
              )}
              {target.doctorName && (
                <>
                  <dt>Bác sĩ</dt>
                  <dd>{target.doctorName}</dd>
                </>
              )}
            </dl>
          </aside>

          {/* Những gì đã làm: tích kỹ thuật, ghi chú hiện bên dưới */}
          <div className="bc-fields">
            <fieldset className="bc-kinds" aria-describedby={id('loi')}>
              <legend className="t-label">Kỹ thuật đã làm</legend>
              {REPORT_ITEMS.map((it) => {
                const on = checked.includes(it.key);
                const err = tried && on && !form[it.key].trim();
                return (
                  <div key={it.key} className={`bc-kind ${on ? 'on' : ''}`}>
                    <button type="button" role="checkbox" aria-checked={on} className="bc-kind-head" onClick={() => toggle(it.key)}>
                      <span className={`t-check ${on ? 'on' : ''}`} aria-hidden="true">
                        {on && <Icon name="check" size={18} strokeWidth={3} />}
                      </span>
                      {it.label}
                    </button>
                    {on && (
                      <div className="bc-kind-body">
                        <textarea
                          id={id(it.key)}
                          rows={2}
                          className="t-textarea"
                          autoComplete="off"
                          aria-label={`Ghi chú ${it.label}`}
                          value={form[it.key]}
                          onChange={set(it.key)}
                          aria-invalid={err ? 'true' : 'false'}
                          aria-describedby={id(`${it.key}-loi`)}
                        />
                        <FieldError id={id(`${it.key}-loi`)}>{err ? `Ghi lại đã làm gì khi ${it.label.toLowerCase()}.` : null}</FieldError>
                      </div>
                    )}
                  </div>
                );
              })}
            </fieldset>
            <FieldError id={id('loi')}>{tried && noneChecked ? 'Vui lòng tích ít nhất một kỹ thuật đã làm.' : null}</FieldError>
            <div className="t-field bc-note">
              <label htmlFor={id('note')} className="t-label">
                Ghi chú cho bác sĩ
              </label>
              <textarea id={id('note')} rows={2} className="t-textarea" autoComplete="off" value={form.note} onChange={set('note')} />
            </div>
          </div>
        </div>

        <ErrorAlert error={error} />
        <div className="bc-actions">
          <button type="button" className="t-btn t-btn-ghost" style={{ minHeight: 48, padding: '0 22px' }} onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" className="t-btn t-btn-primary t-btn-bold" style={{ minHeight: 48, padding: '0 24px' }} disabled={busy}>
            <Icon name="check" strokeWidth={2.25} />
            Gửi báo cáo
          </button>
        </div>
      </form>
    </TDialog>
  );
}
