import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert, Loading } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { useAsync, useDocumentTitle } from '../../../shared/lib/hooks.js';
import { isAdmin, useSession } from '../../../shared/lib/session.jsx';
import { NoticeDialog } from '../../components/dialogs.jsx';
import { StageChip, clock, kindLabels } from '../../components/visit/VisitSummary.jsx';
import { arrival, waitingGroups } from '../../lib/arrival.js';

const smallBtn = { padding: '0 16px', minHeight: 44 };

/** Cuộn mượt tới mục; người dùng bật giảm chuyển động thì nhảy thẳng. */
function scrollToSection(e, href) {
  const target = document.getElementById(href.slice(1));
  if (!target) return;
  e.preventDefault();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

/** Ô đếm nhanh ở đầu trang, bấm để cuộn tới mục tương ứng. */
function Stat({ href, tone, count, label, hot }) {
  return (
    <a href={href} onClick={(e) => scrollToSection(e, href)} className={`dk-stat ${tone} ${hot && count > 0 ? 'hot' : ''}`}>
      <b>{count}</b>
      <span>{label}</span>
    </a>
  );
}

/** Trang của bác sĩ: hàng chờ khám, bệnh nhân đang khám sơ bộ, đang điều trị và chờ kết luận. */
export default function DoctorQueue() {
  useDocumentTitle('Khám bệnh');
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, loading, error, reload, setData } = useAsync(() => api.get('/staff/queue'), []);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(location.state?.notice || null);
  const admin = isAdmin(user);

  // Tự làm mới để thấy người vừa check-in và báo cáo mới của kỹ thuật viên
  useEffect(() => {
    const t = setInterval(() => reload({ silent: true }), 10_000);
    return () => clearInterval(t);
  }, [reload]);

  // Thông báo truyền từ trang khám sơ bộ chỉ hiện một lần
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  // Bác sĩ thấy bệnh nhân của mình và lượt chưa gắn bác sĩ nào (dữ liệu trước khi có vai trò Bác sĩ); Quản trị viên thấy tất cả
  const mine = (v) => admin || !v.doctorId || v.doctorId === user.id;

  const act = async (fn) => {
    setBusy(true);
    setActionError(null);
    try {
      return await fn();
    } catch (err) {
      setActionError(err);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const callNext = () =>
    act(async () => {
      const next = await api.post('/staff/exam/call-next');
      setData(next);
      navigate(`/noi-bo/kham-benh/${next.calledId}`);
    });

  const callOne = (w) =>
    act(async () => {
      await api.post(`/staff/exam/${w.id}/call`);
      navigate(`/noi-bo/kham-benh/${w.id}`);
    });

  const undoOrder = (v) =>
    act(async () => {
      setData(await api.post(`/staff/exam/${v.id}/undo-order`));
      navigate(`/noi-bo/kham-benh/${v.id}`);
    });

  if (loading && !data) return <Loading />;

  const conclusion = data ? data.awaitingConclusion.filter(mine) : [];
  const examining = data ? data.examining.filter(mine) : [];
  const treating = data ? [...data.treatmentWaiting, ...data.seats.filter((s) => !s.empty)].filter(mine) : [];
  const waiting = data ? data.waiting : [];
  const first = waiting[0];
  const current = examining[0];
  const doctorTag = (v) => (admin && v.doctorName ? ` · BS ${v.doctorName}` : '');

  return (
    <>
      <div className="dk-headbar">
        <div>
          <h1 className="t-h1">Khám bệnh</h1>
        </div>
      </div>

      {notice && <NoticeDialog onClose={() => setNotice(null)}>{notice}</NoticeDialog>}
      <ErrorAlert error={error || actionError} />

      {data && (
        <>
          <nav className="dk-stats" aria-label="Tóm tắt">
            <Stat href="#bs-cho" tone="wait" count={data.waitingCount} label="Chờ khám" />
            <Stat href="#bs-dangkham" tone="exam" count={examining.length} label="Đang khám" />
            <Stat href="#bs-dieutri" tone="treat" count={treating.length} label="Đang điều trị" />
            <Stat href="#bs-ketluan" tone="concl" count={conclusion.length} label="Chờ kết luận" hot />
          </nav>

          {/* Chờ kết luận: việc quan trọng nhất, luôn ở đầu trang */}
          {conclusion.length === 0 ? (
            <p id="bs-ketluan" className="dk-concl-empty">
              <Icon name="check" size={18} />
              Chưa có ai chờ kết luận. Khi kỹ thuật viên gửi báo cáo, bệnh nhân hiện ở đây.
            </p>
          ) : (
            <section id="bs-ketluan" aria-labelledby="bs-ketluan-h" className="dk-concl">
              <div className="t-titlerow">
                <h2 id="bs-ketluan-h" className="t-h2">
                  Chờ kết luận
                </h2>
                <span className="t-count sand">{conclusion.length} người</span>
              </div>
              <ol className="dq-rows">
                {conclusion.map((v) => (
                  <li key={v.id} className="dk-concl-row">
                    <div className="dq-main">
                      <p className="dq-name">{v.patient?.fullName}</p>
                      <p className="dq-sub">
                        {v.ticketCode} · <span className="dq-nw">xong lúc {clock(v.treatedAt)}</span> · KTV {v.technicianName || '—'}
                        {doctorTag(v)}
                      </p>
                    </div>
                    <p className="dk-concl-kinds">{kindLabels(v.treatmentKinds, v.treatmentOther)}</p>
                    <Link to={`/noi-bo/phieu-kham/${v.appointmentId}/ket-qua`} state={{ back: '/noi-bo/kham-benh' }} className="t-btn t-btn-primary t-btn-bold">
                      <Icon name="file" size={20} />
                      Kết luận
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Việc tiếp theo: một nút lớn, luôn ở cùng một chỗ */}
          {current ? (
            <section id={examining.length > 1 ? undefined : 'bs-dangkham'} className="dk-next" aria-labelledby="bs-tiep">
              <div className="dk-next-main">
                <p className="dk-next-kicker" id="bs-tiep">
                  Đang khám
                </p>
                <p className="dk-next-name">{current.patient?.fullName}</p>
                <p className="dk-next-sub">
                  {current.ticketCode} · gọi vào lúc {clock(current.examStartedAt)}
                  {doctorTag(current)}
                </p>
              </div>
              <Link to={`/noi-bo/kham-benh/${current.id}`} className="t-btn t-btn-primary">
                Tiếp tục khám
                <Icon name="arrowRight" />
              </Link>
            </section>
          ) : first ? (
            <section id={examining.length > 1 ? undefined : 'bs-dangkham'} className="dk-next" aria-labelledby="bs-tiep">
              <div className="dk-next-main">
                <p className="dk-next-kicker" id="bs-tiep">
                  Người kế tiếp{first.priorityGroup === 'PRIORITY' ? ' · có hẹn trước' : ''}
                </p>
                <p className="dk-next-name">{first.patient?.fullName}</p>
                <p className="dk-next-sub">
                  {first.ticketCode} · check-in {clock(first.checkInTime)}
                </p>
              </div>
              <button type="button" className="t-btn t-btn-primary" disabled={busy} onClick={callNext}>
                <Icon name="arrowRight" />
                Gọi vào khám
              </button>
            </section>
          ) : (
            <section id="bs-dangkham" className="dk-next idle">
              <div className="dk-next-main">
                <p className="dk-next-kicker" style={{ color: 'var(--ink-500)' }}>
                  Không có ai chờ khám
                </p>
                <p className="dk-next-sub">Trang tự làm mới mỗi 10 giây. Người vừa check-in sẽ hiện ở đây.</p>
              </div>
            </section>
          )}

          <div className="dk-cols">
            <div className="dk-col">
              {examining.length > 1 && (
                <section id="bs-dangkham" aria-labelledby="bs-dangkham-h" className="t-card t-card-pad">
                  <div className="t-titlerow">
                    <h2 id="bs-dangkham-h" className="t-h2">
                      Đang khám sơ bộ
                    </h2>
                    <span className="t-count green">{examining.length} người</span>
                  </div>
                  <ol className="t-wait-list">
                    {examining.map((v) => (
                      <li key={v.id}>
                        <div className="t-wait">
                          <div className="t-wait-main">
                            <p className="t-wait-name">{v.patient?.fullName}</p>
                            <p className="t-wait-sub">
                              {v.ticketCode} · gọi vào lúc {clock(v.examStartedAt)}
                              {doctorTag(v)}
                            </p>
                          </div>
                          <Link to={`/noi-bo/kham-benh/${v.id}`} className="t-btn t-btn-primary">
                            Tiếp tục khám
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section id="bs-cho" aria-labelledby="bs-cho-h" className="t-card t-card-pad">
                <div className="dk-sectionhead">
                  <div className="t-titlerow">
                    <h2 id="bs-cho-h" className="t-h2">
                      Hàng chờ khám
                    </h2>
                    <span className="t-count sand">{data.waitingCount} người</span>
                  </div>
                  {current && data.waitingCount > 0 && (
                    <button type="button" className="t-btn t-btn-ghost t-btn-bold" style={smallBtn} disabled={busy} onClick={callNext}>
                      <Icon name="arrowRight" size={20} />
                      Gọi người kế tiếp
                    </button>
                  )}
                </div>
                {data.waitingCount === 0 ? (
                  <p className="t-dashed">Chưa có ai đang chờ khám.</p>
                ) : (
                  <div className="dq-list">
                    {waitingGroups(waiting).map(([label, list, offset, tone]) => (
                      <section key={label} aria-label={label}>
                        <p className={`dq-group ${tone}`}>
                          {label} · {list.length}
                        </p>
                        <ol className="dq-rows" start={offset + 1}>
                          {list.map((w, i) => {
                            const no = offset + i + 1;
                            const [kind, kindTone] = arrival(w);
                            return (
                              <li key={w.id} className={`dq-row ${no === 1 ? 'next' : ''}`}>
                                <span className={`hd-no ${tone}`} aria-hidden="true">
                                  {no}
                                </span>
                                <div className="dq-main">
                                  <p className="dq-name">{w.patient?.fullName}</p>
                                  <p className="dq-sub">
                                    {w.ticketCode} · <span className="dq-nw">check-in {clock(w.checkInTime)}</span>
                                  </p>
                                </div>
                                <span className={`hd-kind ${kindTone}`}>{kind}</span>
                                <div className="dq-act">
                                  {(no > 1 || current) && (
                                    <button type="button" className="t-btn t-btn-ghost t-btn-sm" disabled={busy} onClick={() => callOne(w)}>
                                      {no === 1 ? 'Gọi' : 'Gọi trước'}
                                    </button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      </section>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="dk-col">
              <section id="bs-dieutri" aria-labelledby="bs-dieutri-h" className="t-card t-card-pad">
                <div className="t-titlerow">
                  <h2 id="bs-dieutri-h" className="t-h2">
                    Đang điều trị
                  </h2>
                  <span className="t-count sand">{treating.length} người</span>
                </div>
                {treating.length === 0 ? (
                  <p className="dk-hint">Chưa có ai. Còn chờ chỗ thì bác sĩ vẫn sửa được chỉ định.</p>
                ) : (
                  <ol className="t-wait-list">
                    {treating.map((v) => (
                      <li key={v.id}>
                        <div className="t-wait">
                          <div className="t-wait-main">
                            <p className="t-wait-name">{v.patient?.fullName}</p>
                            <p className="t-wait-sub">
                              {v.ticketCode} · {kindLabels(v.treatmentKinds, v.treatmentOther)}
                              {v.status === 'IN_ROOM' ? ` · chỗ ${v.seatNo}` : ''}
                            </p>
                            <div style={{ marginTop: 6 }}>
                              <StageChip status={v.status} />
                            </div>
                          </div>
                          {v.status === 'WAITING_TREATMENT' && (
                            <button type="button" className="t-btn t-btn-ghost" style={smallBtn} disabled={busy} onClick={() => undoOrder(v)}>
                              <Icon name="edit" size={20} />
                              Sửa chỉ định
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </>
  );
}
