import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon.jsx';
import { ErrorAlert, Loading } from '../../../shared/components/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { fmtTime, shortTime, slotLabel, todayVN } from '../../../shared/lib/format.js';
import { useAsync, useDocumentTitle } from '../../../shared/lib/useAsync.js';
import { Notice, Summary, TDialog } from '../../components/t-ui.jsx';
import { longDay, nowMinutesVN } from './ApptActions.jsx';

const clock = (value) => fmtTime(value).replace(/^0/, '');
const minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Ghi chú bên phải mỗi người trong hàng chờ. */
function waitNote(w) {
  if (w.priorityGroup === 'PRIORITY') return `Đặt khung ${shortTime(w.slotStart)}`;
  if (w.source === 'COUNTER') return 'Đến trực tiếp';
  return minutesOf(clock(w.checkInTime)) < minutesOf(w.slotStart) ? `Đến sớm trước khung ${shortTime(w.slotStart)}` : `Đến sau khung ${shortTime(w.slotStart)}`;
}

/** Sơ đồ ghế theo khung giờ: mỗi ô là một người đã check-in vào khung đó (UC.10.5). */
export function SlotMap({ slotMap, waiting = [] }) {
  const now = nowMinutesVN();
  const order = new Map(waiting.map((w, i) => [w.ticketCode, { no: i + 1, prio: w.priorityGroup === 'PRIORITY' }]));
  const rank = { COMPLETED: 0, IN_ROOM: 1, WAITING: 2 };
  return (
    <>
      <div className="t-slots">
        {slotMap.map((s) => {
          const start = minutesOf(s.start);
          const past = start + 60 <= now;
          const running = start <= now && now < start + 60;
          const people = [...s.checkins].sort((a, b) => rank[a.status] - rank[b.status] || (order.get(a.ticketCode)?.no ?? 0) - (order.get(b.ticketCode)?.no ?? 0));
          return (
            <div key={s.start} className={`t-slot ${running ? 'now' : ''}`}>
              <div className="t-slot-label">
                <p>{slotLabel(s.start)}</p>
                <p>{past ? 'Đã qua' : running ? 'Đang diễn ra' : 'Sắp tới'}</p>
              </div>
              <div role="group" aria-label={`Khung ${shortTime(s.start)}, ${people.length} người đã check-in`} className="t-slot-boxes">
                {people.length === 0 && <span style={{ fontSize: 15, lineHeight: '22px', color: 'var(--line-strong)' }}>Chưa có ai check-in</span>}
                {people.map((c) => {
                  const o = order.get(c.ticketCode);
                  const kind = c.status === 'COMPLETED' ? 'done' : c.status === 'IN_ROOM' ? 'in' : o?.prio ? 'prio' : 'wait';
                  const label = { done: 'đã hoàn thành', in: 'đang trong phòng khám', wait: 'đang chờ', prio: 'đang chờ (nền xanh dương)' }[kind];
                  const aria = `${c.fullName || 'Bệnh nhân'}, ${label}${o ? `, thứ tự ${o.no}` : ''}`;
                  return (
                    <span key={c.id} role="img" aria-label={aria} title={aria} className={`t-box ${kind}`}>
                      {kind === 'done' ? '✓' : kind === 'in' ? '▶' : o?.no}
                    </span>
                  );
                })}
              </div>
              <div className="t-slot-count">
                <p>{people.length} người</p>
                {s.notArrived > 0 && <p>{past ? `vắng ${s.notArrived}` : `chưa đến ${s.notArrived}`}</p>}
              </div>
            </div>
          );
        })}
      </div>
      <ul aria-label="Chú thích" className="t-key">
        <li>
          <span aria-hidden="true" className="t-box sm done">
            ✓
          </span>
          Đã hoàn thành
        </li>
        <li>
          <span aria-hidden="true" className="t-box sm in">
            ▶
          </span>
          Trong phòng khám
        </li>
        <li>
          <span aria-hidden="true" className="t-box sm wait">
            1
          </span>
          Đang chờ, số là thứ tự
        </li>
        <li>
          <span aria-hidden="true" className="t-box sm prio">
            1
          </span>
          Đang chờ, nền xanh dương
        </li>
      </ul>
    </>
  );
}

/** Hàng đợi khám: 5 ghế, hàng chờ Ưu tiên / Thường, hoàn tác vào khám (UC.10.1 – UC.10.5). */
export default function Queue() {
  useDocumentTitle('Hàng đợi khám');
  const { data, loading, error, reload, setData } = useAsync(() => api.get('/staff/queue'), []);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [undoTarget, setUndoTarget] = useState(null);
  const [notice, setNotice] = useState(null);

  // Tự làm mới để thấy người vừa check-in ở quầy khác
  useEffect(() => {
    const t = setInterval(() => reload({ silent: true }), 15_000);
    return () => clearInterval(t);
  }, [reload]);

  /** Tên những người vừa được ghế trống tự nhận. */
  const newlySeated = (before, after) => {
    const had = new Set(before.seats.filter((s) => !s.empty).map((s) => s.id));
    return after.seats.filter((s) => !s.empty && !had.has(s.id)).map((s) => s.patient?.fullName);
  };

  const undo = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const next = await api.post(`/staff/queue/${undoTarget.id}/undo-enter`);
      const seated = newlySeated(data, next).filter((n) => n !== undoTarget.patient?.fullName);
      setData(next);
      setNotice(
        <>
          Đã hoàn tác vào khám của <span className="t-notice-name">{undoTarget.patient?.fullName}</span>. Phiếu trở lại hàng chờ, đúng vị trí theo giờ check-in.
          {seated.length > 0 && ` Ghế trống đã tự động nhận ${seated.join(', ')} từ hàng chờ.`}
        </>,
      );
      setUndoTarget(null);
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  };

  const invite = async () => {
    setBusy(true);
    setActionError(null);
    try {
      setData(await api.post('/staff/queue/invite'));
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  };

  const freeSeats = data ? data.capacity - data.inRoomCount : 0;

  return (
    <>
      <div className="t-pagehead">
        <div>
          <p className="t-muted" style={{ marginBottom: 6, fontWeight: 600 }}>
            {longDay(todayVN())} · bây giờ {clock(new Date())}
          </p>
          <h1 className="t-h1">Hàng đợi khám</h1>
          <p className="t-lead">
            Người đã check-in xếp hàng ở đây. Mỗi lượt {data?.capacity ?? 5} người vào khám, khoảng 30 phút. Ai có phiếu đặt trước và đến đúng khung giờ thì được xếp lên trước.
          </p>
        </div>
        <Link to="/noi-bo/lich-trong-ngay" className="t-btn t-btn-ghost" style={{ padding: '0 20px' }}>
          <Icon name="calendar" strokeWidth={1.75} />
          Check-in ở Lịch trong ngày
        </Link>
      </div>

      {notice && <Notice onClose={() => setNotice(null)}>{notice}</Notice>}
      <ErrorAlert error={error || actionError} />
      {loading && !data && <Loading />}

      {data && (
        <>
          <section aria-labelledby="hd-phong" className="t-card t-card-pad" style={{ gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="t-titlerow">
                <h2 id="hd-phong" className="t-h2">
                  Trong phòng khám
                </h2>
                <span className="t-count green">
                  {data.inRoomCount}/{data.capacity} người
                </span>
              </div>
              <p className="t-text">
                Bấm Ghi nhận lượt khám để điền phiếu kết quả. Lưu phiếu xong thì người đó chuyển sang Đã hoàn thành, rời hàng đợi và ghế trống để mời người kế tiếp.
              </p>
            </div>
            <div className="t-seats">
              {data.seats.map((s) =>
                s.empty ? (
                  <div key={s.seatNo} className="t-seat-empty">
                    <span>Ghế {s.seatNo}</span>
                    <span>Ghế trống</span>
                    <span>Mời người đầu hàng chờ vào khám</span>
                  </div>
                ) : (
                  <div key={s.seatNo} className="t-seat">
                    <span className="t-seat-no">Ghế {s.seatNo}</span>
                    <div>
                      <p className="t-seat-name">{s.patient?.fullName}</p>
                      <p className="t-seat-sub">{s.ticketCode}</p>
                      <p className="t-seat-sub">Vào khám lúc {clock(s.enteredAt)}</p>
                    </div>
                    <div className="t-seat-acts">
                      <Link to={`/noi-bo/phieu-kham/${s.appointmentId}/ket-qua`} className="t-btn t-btn-primary t-btn-bold">
                        Ghi nhận lượt khám
                      </Link>
                      <button type="button" className="t-btn t-btn-ghost" onClick={() => setUndoTarget(s)}>
                        Hoàn tác vào khám
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <section aria-labelledby="hd-cho" className="t-card t-card-pad">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 20px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="t-titlerow">
                <h2 id="hd-cho" className="t-h2">
                  Hàng chờ
                </h2>
                <span className="t-count sand">{data.waitingCount} người</span>
              </div>
              {!data.autoInvite && (
                <button type="button" className="t-btn t-btn-primary" disabled={busy || freeSeats === 0 || data.waitingCount === 0} onClick={invite}>
                  <Icon name="arrowRight" />
                  Mời người đầu hàng chờ vào khám
                </button>
              )}
            </div>
            <p className="t-text">
              Thứ tự tự xếp: người có phiếu đặt trước và đến đúng khung giờ (nền xanh dương) đứng trên, những người còn lại đứng dưới. Trong mỗi nhóm, ai check-in trước đứng trước.
              {data.autoInvite && ' Khi phòng khám có ghế trống, người đầu Lượt kế tiếp tự động vào khám.'}
            </p>
            {data.waitingCount === 0 && <p className="t-dashed">Chưa có ai đang chờ. Người được check-in ở Lịch trong ngày sẽ hiện ở đây.</p>}
            <ol className="t-wait-list">
              {data.waiting.map((w, i) => {
                const prio = w.priorityGroup === 'PRIORITY';
                return (
                  <li key={w.id}>
                    {i % data.capacity === 0 && <p className="t-eyebrow t-wait-group">{i < data.capacity ? 'Lượt kế tiếp' : 'Lượt sau'}</p>}
                    <div className={`t-wait ${prio ? 'prio' : ''}`}>
                      <span className={`t-wait-no ${prio ? 'prio' : i < data.capacity ? 'next' : ''}`} aria-label={`Thứ tự ${i + 1}`}>
                        {i + 1}
                      </span>
                      <div className="t-wait-main">
                        <p className="t-wait-name">{w.patient?.fullName}</p>
                        <p className="t-wait-sub">
                          {w.ticketCode} · check-in {clock(w.checkInTime)} · đã chờ {w.waitedMinutes} phút
                        </p>
                      </div>
                      <p className="t-wait-note">{waitNote(w)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="hd-khung" className="t-card t-card-pad" style={{ gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h2 id="hd-khung" className="t-h2">
                Sơ đồ ghế theo khung giờ hôm nay
              </h2>
              <p className="t-text">Mỗi ô là một người đã check-in vào khung giờ đó.</p>
            </div>
            <SlotMap slotMap={data.slotMap} waiting={data.waiting} />
          </section>
        </>
      )}

      {undoTarget && (
        <TDialog title="Hoàn tác vào khám?" width={560} alert onClose={() => setUndoTarget(null)}>
          <div className="t-dialog-body" style={{ gap: 20 }}>
            <Summary
              items={[
                ['Bệnh nhân', undoTarget.patient?.fullName],
                ['Mã phiếu khám', undoTarget.ticketCode],
                ['Vào khám lúc', clock(undoTarget.enteredAt), null, false],
              ]}
            />
            <p className="t-text">
              Phiếu trở lại <strong className="t-strong">hàng chờ</strong>, đúng vị trí theo giờ check-in.
              {data?.autoInvite && ' Ghế vừa trống tự động nhận người kế tiếp trong hàng chờ; người này sẽ vào ở ghế trống sau.'}
            </p>
            <ErrorAlert error={actionError} />
            <div className="t-actions" style={{ gap: 12 }}>
              <button type="button" className="t-btn t-btn-primary t-btn-bold" style={{ flex: '1 1 220px', minHeight: 48 }} disabled={busy} onClick={undo}>
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
