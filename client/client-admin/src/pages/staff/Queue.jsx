import { useEffect, useState } from 'react';
import { Alert, Badge, Button, ButtonLink, Empty, ErrorAlert, Loading, Modal, PageHeader } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { fmtTime, shortTime, todayVN } from '@chuctu/shared/lib/format.js';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';

export function SlotMap({ slotMap }) {
  const nowHour = new Date(Date.now() + 7 * 3600_000).getUTCHours();
  return (
    <div className="slot-map">
      {slotMap.map((s) => {
        const current = Number(s.start.slice(0, 2)) === nowHour;
        return (
          <div key={s.start} className={`slot-col ${current ? 'current' : ''}`}>
            <p style={{ fontWeight: 700, color: 'var(--ink-900)' }}>
              {shortTime(s.start)}
              {current && <span className="sr-only"> (khung hiện tại)</span>}
            </p>
            <p className="caption">
              Đặt {s.booked}/{s.capacity} · chưa đến {s.notArrived}
            </p>
            {s.checkins.length === 0 && <p className="caption">Chưa có ai check-in</p>}
            {s.checkins.map((c) => (
              <span key={c.id} className={`slot-dot ${c.status}`} title={`${c.fullName} · ${c.ticketCode}`}>
                {c.status === 'IN_ROOM' ? `Ghế ${c.seatNo}` : c.status === 'WAITING' ? 'Chờ' : 'Xong'} · {c.fullName}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Hàng đợi khám: 5 ghế, hàng chờ Ưu tiên / Thường, mời vào, hoàn tác, hoàn tất (UC.10.1 – UC.10.5). */
export default function Queue() {
  useDocumentTitle('Hàng đợi khám');
  const { data, loading, error, reload, setData } = useAsync(() => api.get('/staff/queue'), []);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [undoTarget, setUndoTarget] = useState(null);

  // Tự làm mới để thấy người vừa check-in ở quầy khác
  useEffect(() => {
    const t = setInterval(() => reload({ silent: true }), 15_000);
    return () => clearInterval(t);
  }, [reload]);

  const run = async (key, fn) => {
    setBusy(key);
    setActionError(null);
    try {
      setData(await fn());
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(null);
    }
  };

  const freeSeats = data ? data.capacity - data.inRoomCount : 0;
  const groups = data
    ? [
        ['PRIORITY', 'Có phiếu đặt trước, đến đúng khung giờ', data.waiting.filter((w) => w.priorityGroup === 'PRIORITY')],
        ['NORMAL', 'Khách đến trực tiếp hoặc đến sau khung giờ', data.waiting.filter((w) => w.priorityGroup === 'NORMAL')],
      ]
    : [];

  return (
    <div className="stack-lg">
      <PageHeader
        title="Hàng đợi khám"
        subtitle={`Mỗi lượt ${data?.capacity ?? 5} người vào khám, khoảng 30 phút. Ai có phiếu đặt trước và đến đúng khung giờ được xếp lên trước.`}
        actions={
          <>
            <Button variant="ghost" icon="refresh" onClick={() => reload()}>
              Làm mới
            </Button>
            <ButtonLink to="/lich-trong-ngay" variant="secondary">
              Check-in ở Lịch trong ngày
            </ButtonLink>
          </>
        }
      />
      {loading && !data && <Loading />}
      <ErrorAlert error={error || actionError} />
      {data && (
        <>
          <section className="stack" aria-labelledby="trong-phong">
            <div className="row-between">
              <h2 id="trong-phong">
                Trong phòng khám{' '}
                <span className="mono">
                  {data.inRoomCount}/{data.capacity}
                </span>{' '}
                người
              </h2>
              <p className="caption">Đã hoàn thành hôm nay: {data.completedCount}</p>
            </div>
            <p className="small">Bấm "Ghi nhận lượt khám" để điền phiếu kết quả. Lưu phiếu xong thì người đó rời hàng đợi và ghế trống mời người kế tiếp.</p>
            <div className="seats">
              {data.seats.map((s) =>
                s.empty ? (
                  <div key={s.seatNo} className="seat seat-empty">
                    <span className="seat-no">Ghế {s.seatNo}</span>
                    <p className="muted">Ghế trống</p>
                  </div>
                ) : (
                  <div key={s.seatNo} className="seat">
                    <span className="seat-no">Ghế {s.seatNo}</span>
                    <p style={{ fontWeight: 700, color: 'var(--ink-900)', fontSize: 19, lineHeight: '26px' }}>{s.patient?.fullName}</p>
                    <p className="caption mono">{s.ticketCode}</p>
                    <p className="caption">Vào khám lúc {fmtTime(s.enteredAt)}</p>
                    <div className="stack-sm" style={{ marginTop: 'auto' }}>
                      <ButtonLink to={`/phieu-kham/${s.appointmentId}/ket-qua`} size="sm" icon="clipboard">
                        Ghi nhận lượt khám
                      </ButtonLink>
                      <Button size="sm" variant="ghost" icon="undo" onClick={() => setUndoTarget(s)}>
                        Hoàn tác vào khám
                      </Button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="card card-lg stack" aria-labelledby="hang-cho">
            <div className="row-between">
              <h2 id="hang-cho">
                Hàng chờ <span className="mono">{data.waitingCount}</span> người
              </h2>
              <div className="row">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={data.autoInvite}
                    disabled={busy === 'auto'}
                    onChange={(e) => run('auto', () => api.put('/staff/queue/auto-invite', { enabled: e.target.checked }))}
                  />
                  Tự động vào ghế trống
                </label>
                {!data.autoInvite && (
                  <Button
                    icon="arrowRight"
                    disabled={freeSeats === 0 || data.waitingCount === 0}
                    loading={busy === 'invite'}
                    onClick={() => run('invite', () => api.post('/staff/queue/invite'))}
                  >
                    Mời người đầu hàng chờ vào khám
                  </Button>
                )}
              </div>
            </div>
            <p className="small">
              Thứ tự tự xếp: người có phiếu đặt trước và đến đúng khung giờ (nền xanh dương, nhãn "Ưu tiên") đứng trên, những người còn lại đứng dưới. Trong mỗi
              nhóm, ai check-in trước đứng trước.
            </p>
            {data.waitingCount === 0 && <Empty icon="users" title="Chưa có ai đang chờ">Người được check-in ở Lịch trong ngày sẽ hiện ở đây.</Empty>}
            {groups.map(([key, label, list]) =>
              list.length === 0 ? null : (
                <div key={key} className="stack-sm">
                  <h3 style={{ fontSize: 20 }}>
                    {key === 'PRIORITY' ? 'Ưu tiên' : 'Thường'} — {label}
                  </h3>
                  <ol className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {list.map((w) => (
                      <li key={w.id} className={`queue-item ${w.priorityGroup === 'PRIORITY' ? 'priority' : ''}`}>
                        <span className="queue-no" aria-label={`Thứ tự ${data.waiting.indexOf(w) + 1}`}>
                          {data.waiting.indexOf(w) + 1}
                        </span>
                        <div>
                          <p style={{ fontWeight: 700, color: 'var(--ink-900)' }}>{w.patient?.fullName}</p>
                          <p className="caption">
                            <span className="mono">{w.ticketCode}</span> · khung {shortTime(w.slotStart)} · check-in {fmtTime(w.checkInTime)} · đã chờ {w.waitedMinutes} phút
                          </p>
                        </div>
                        <Badge tone={w.priorityGroup === 'PRIORITY' ? 'blue' : 'gray'} icon={w.priorityGroup === 'PRIORITY' ? 'ticket' : 'user'}>
                          {w.priorityGroup === 'PRIORITY' ? 'Ưu tiên' : 'Thường'}
                        </Badge>
                      </li>
                    ))}
                  </ol>
                </div>
              ),
            )}
          </section>

          <section className="stack" aria-labelledby="so-do">
            <h2 id="so-do">Sơ đồ ghế theo khung giờ hôm nay</h2>
            <p className="small">Mỗi ô là một người đã check-in vào khung giờ đó. Khung viền vàng là khung hiện tại.</p>
            <SlotMap slotMap={data.slotMap} />
          </section>
        </>
      )}
      {undoTarget && (
        <Modal
          title="Hoàn tác vào khám?"
          onClose={() => setUndoTarget(null)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setUndoTarget(null)}>
                Quay lại
              </Button>
              <Button
                icon="undo"
                loading={busy === 'undo'}
                onClick={async () => {
                  await run('undo', () => api.post(`/staff/queue/${undoTarget.id}/undo-enter`));
                  setUndoTarget(null);
                }}
              >
                Xác nhận hoàn tác
              </Button>
            </>
          }
        >
          <div className="stack-sm">
            <dl className="info">
              <dt>Bệnh nhân</dt>
              <dd>{undoTarget.patient?.fullName}</dd>
              <dt>Mã phiếu khám</dt>
              <dd className="mono">{undoTarget.ticketCode}</dd>
              <dt>Vào khám lúc</dt>
              <dd>{fmtTime(undoTarget.enteredAt)}</dd>
            </dl>
            <Alert type="info">
              Phiếu trở lại <strong>hàng chờ</strong>, đúng vị trí theo giờ check-in.
              {data?.autoInvite && ' Ghế vừa trống tự động nhận người kế tiếp; người này sẽ vào ở ghế trống sau.'}
            </Alert>
          </div>
        </Modal>
      )}
      <p className="caption">Ngày {todayVN().split('-').reverse().join('/')}. Trang tự làm mới mỗi 15 giây.</p>
    </div>
  );
}
