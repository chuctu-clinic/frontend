import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api, type ApiError } from '@chuctu/shared/lib/api.ts';
import { fmtDateLong, fmtTime, hhmm, shortTime, todayVN } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { QueueEntry, QueueState, SlotMapRow } from '@chuctu/shared/types.ts';
import { NbError, NbLoading, NbModal, NbOk } from '../../components/nb.tsx';

const endOf = (start: string) => `${String(Number(start.slice(0, 2)) + 1).padStart(2, '0')}${start.slice(2)}`;

/** Lý do xếp nhóm của người đang chờ, giống prototype. */
function waitNote(w: QueueEntry) {
  if (w.source === 'COUNTER' && w.priorityGroup === 'NORMAL') return 'Đến trực tiếp';
  if (!w.slotStart) return '';
  const slot = shortTime(w.slotStart);
  if (w.priorityGroup === 'PRIORITY') return `Đặt khung ${slot}`;
  return hhmm(new Date(w.checkInTime)) < w.slotStart ? `Đến sớm, xếp trước từ ${slot}` : `Đến sau khung ${slot}`;
}

/**
 * Sơ đồ ghế theo khung giờ: mỗi ô là một người đã check-in (UC.10.5).
 * compact: bản thu gọn trên trang Tổng quan.
 */
export function SlotMap({ slotMap, waiting, compact = false }: { slotMap: SlotMapRow[]; waiting: QueueEntry[]; compact?: boolean }) {
  const nowHM = hhmm(new Date());
  const order = new Map(waiting.map((w, i) => [w.id, { no: i + 1, prio: w.priorityGroup === 'PRIORITY' }]));
  const legend: [string, string, string][] = [
    ['done', '✓', 'Đã hoàn thành'],
    ['room', '▶', 'Trong phòng khám'],
    ['wait', '1', compact ? 'Đang chờ' : 'Đang chờ, số là thứ tự'],
    ['prio', '1', 'Đang chờ, nền xanh dương'],
  ];
  return (
    <>
      <div className="nb-slotmap">
        {slotMap.map((row) => {
          const end = endOf(row.start);
          const current = nowHM >= row.start && nowHM < end;
          const past = nowHM >= end;
          const people = row.checkins.filter((c) => c.status !== 'REVERTED');
          return (
            <div key={row.start} className={`nb-slotrow ${compact ? 'compact' : ''} ${current ? 'current' : ''}`}>
              <div>
                {compact ? (
                  shortTime(row.start)
                ) : (
                  <>
                    <p className="nb-strong" style={{ fontSize: 17 }}>
                      {shortTime(row.start)} – {shortTime(end)}
                    </p>
                    <p className="nb-muted" style={{ fontSize: 15 }}>
                      {past ? 'Đã qua' : current ? 'Đang diễn ra' : 'Sắp tới'}
                    </p>
                  </>
                )}
              </div>
              <div role="group" aria-label={`Khung ${shortTime(row.start)}, ${people.length} người đã check-in`}>
                {people.length === 0 && (
                  <span style={{ fontSize: 15, color: '#8C7B5E' }}>Chưa có ai check-in</span>
                )}
                {people.map((c) => {
                  const w = order.get(c.id);
                  const kind = c.status === 'COMPLETED' ? 'done' : c.status === 'IN_ROOM' ? 'room' : w?.prio ? 'prio' : 'wait';
                  const label = c.status === 'COMPLETED' ? 'Đã hoàn thành' : c.status === 'IN_ROOM' ? `Trong phòng khám, ghế ${c.seatNo}` : `Đang chờ, thứ tự ${w?.no ?? ''}`;
                  return (
                    <span key={c.id} className={`nb-cell ${kind} ${compact ? 'sm' : ''}`} role="img" aria-label={`${c.fullName}: ${label}`} title={`${c.fullName} · ${label}`}>
                      {kind === 'done' ? '✓' : kind === 'room' ? '▶' : (w?.no ?? '')}
                    </span>
                  );
                })}
              </div>
              <div>
                {compact ? (
                  `${people.length} người`
                ) : (
                  <>
                    <p className="nb-strong" style={{ fontSize: 17, color: '#2E5B37' }}>
                      {people.length} người
                    </p>
                    {row.notArrived > 0 && (
                      <p className="nb-muted" style={{ fontSize: 15 }}>
                        {past ? 'vắng' : 'chưa đến'} {row.notArrived}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ul className="nb-legend" aria-label="Chú thích">
        {legend.map(([kind, sym, text]) => (
          <li key={text}>
            <span className={`nb-cell sm ${kind}`} aria-hidden="true">
              {sym}
            </span>
            {text}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Hàng đợi khám: 5 ghế, hàng chờ Ưu tiên / Thường, hoàn tác vào khám, sơ đồ khung giờ (UC.10.1 – UC.10.5). */
export default function Queue() {
  useDocumentTitle('Hàng đợi khám');
  const { data, loading, error, reload, setData } = useAsync(() => api.get<QueueState>('/staff/queue'), []);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [undoTarget, setUndoTarget] = useState<QueueEntry | null>(null);

  // Tự làm mới để thấy người vừa check-in ở quầy khác
  useEffect(() => {
    const t = setInterval(() => reload({ silent: true }), 15_000);
    return () => clearInterval(t);
  }, [reload]);

  const run = async (fn: () => Promise<QueueState>, message?: (before: QueueState | null, after: QueueState) => string) => {
    setBusy(true);
    setActionError(null);
    try {
      const before = data;
      const after = await fn();
      setData(after);
      if (message) setNotice(message(before, after));
      return true;
    } catch (err) {
      setActionError(err as ApiError);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Người vừa được ghế trống nhận vào (so sánh trước và sau thao tác)
  const newlySeated = (before: QueueState | null, after: QueueState) => {
    const had = new Set((before?.seats || []).filter((s): s is QueueEntry => !('empty' in s)).map((s) => s.id));
    const names = after.seats.filter((s): s is QueueEntry => !('empty' in s) && !had.has(s.id)).map((s) => s.patient?.fullName);
    return names.length ? ` Ghế trống đã tự động nhận ${names.join(', ')} từ hàng chờ.` : '';
  };

  const confirmUndo = async () => {
    if (!undoTarget) return;
    const name = undoTarget.patient?.fullName;
    const ok = await run(() => api.post<QueueState>(`/staff/queue/${undoTarget.id}/undo-enter`), (b, a) => `Đã đưa ${name} trở lại hàng chờ.${newlySeated(b, a)}`);
    if (ok) setUndoTarget(null);
  };

  return (
    <>
      <div className="nb-pagehead">
        <div>
          <p className="nb-eyebrow">
            {fmtDateLong(todayVN())} · bây giờ {fmtTime(new Date())}
          </p>
          <h1 className="nb-h1">Hàng đợi khám</h1>
          <p className="nb-lead">
            Người đã check-in xếp hàng ở đây. Mỗi lượt {data?.capacity ?? 5} người vào khám, khoảng 30 phút. Ai có phiếu đặt trước và đến đúng khung giờ thì được xếp lên trước.
          </p>
        </div>
        <Link to="/lich-trong-ngay" className="nb-btn nb-btn-ghost">
          <Icon name="calendar" />
          Check-in ở Lịch trong ngày
        </Link>
      </div>

      {notice && <NbOk onClose={() => setNotice(null)}>{notice}</NbOk>}
      <NbError error={error || actionError} />
      {loading && !data && <NbLoading />}

      {data && (
        <>
          <section className="nb-card" aria-labelledby="hd-phong" style={{ gap: 18 }}>
            <div className="nb-stack-sm" style={{ gap: 6 }}>
              <div className="nb-row" style={{ gap: '10px 14px' }}>
                <h2 id="hd-phong" className="nb-h2">
                  Trong phòng khám
                </h2>
                <span className="nb-pill nb-pill-green" style={{ padding: '4px 12px' }}>
                  {data.inRoomCount}/{data.capacity} người
                </span>
              </div>
              <p>
                Bấm Ghi nhận lượt khám để điền phiếu kết quả. Lưu phiếu xong thì người đó chuyển sang Đã hoàn thành, rời hàng đợi và ghế trống để mời người kế tiếp.
              </p>
            </div>
            <div className="nb-seats">
              {data.seats.map((s) =>
                'empty' in s ? (
                  <div key={s.seatNo} className="nb-seat-empty">
                    <span className="nb-seat-no" style={{ color: '#6B5E4E' }}>
                      Ghế {s.seatNo}
                    </span>
                    <span className="nb-strong" style={{ fontSize: 17, color: '#4A3F33' }}>
                      Ghế trống
                    </span>
                    <span className="nb-muted" style={{ fontSize: 15, lineHeight: '22px' }}>
                      Mời người đầu hàng chờ vào khám
                    </span>
                  </div>
                ) : (
                  <div key={s.seatNo} className="nb-seat">
                    <span className="nb-seat-no">Ghế {s.seatNo}</span>
                    <div>
                      <p className="nb-strong" style={{ fontSize: 17 }}>
                        {s.patient?.fullName}
                      </p>
                      <p style={{ fontSize: 15, lineHeight: '22px' }}>{s.ticketCode}</p>
                      <p style={{ fontSize: 15, lineHeight: '22px' }}>Vào khám lúc {fmtTime(s.enteredAt)}</p>
                    </div>
                    <div className="nb-seat-actions">
                      <Link to={`/phieu-kham/${s.appointmentId}/ket-qua`} className="nb-btn nb-btn-primary" style={{ fontWeight: 700 }}>
                        Ghi nhận lượt khám
                      </Link>
                      <button type="button" className="nb-btn nb-btn-ghost" onClick={() => setUndoTarget(s)}>
                        Hoàn tác vào khám
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="nb-card" aria-labelledby="hd-cho">
            <div className="nb-row" style={{ gap: '14px 20px', justifyContent: 'space-between' }}>
              <div className="nb-row" style={{ gap: '10px 14px' }}>
                <h2 id="hd-cho" className="nb-h2">
                  Hàng chờ
                </h2>
                <span className="nb-pill nb-pill-sand">{data.waitingCount} người</span>
              </div>
              <div className="nb-row">
                {!data.autoInvite && data.waitingCount > 0 && data.inRoomCount < data.capacity && (
                  <button
                    type="button"
                    className="nb-btn nb-btn-primary"
                    disabled={busy}
                    onClick={() => run(() => api.post<QueueState>('/staff/queue/invite'), (b, a) => `Đã mời người kế tiếp vào khám.${newlySeated(b, a)}`)}
                  >
                    <Icon name="arrowRight" />
                    Mời người kế tiếp
                  </button>
                )}
                <label className="nb-switch">
                  <input
                    type="checkbox"
                    checked={data.autoInvite}
                    disabled={busy}
                    onChange={(e) => run(() => api.put<QueueState>('/staff/queue/auto-invite', { enabled: e.target.checked }))}
                  />
                  Tự động vào ghế trống
                </label>
              </div>
            </div>
            <p>
              Thứ tự tự xếp: người có phiếu đặt trước và đến đúng khung giờ (nền xanh dương) đứng trên, những người còn lại đứng dưới. Trong mỗi nhóm, ai check-in trước đứng trước.
              {data.autoInvite ? ' Khi phòng khám có ghế trống, người đầu Lượt kế tiếp tự động vào khám.' : ' Đang tắt tự động: bấm Mời người kế tiếp khi có ghế trống.'}
            </p>
            {data.waitingCount === 0 && (
              <p style={{ padding: '28px 20px', background: '#fff', border: '2px dashed #D5C7AC', borderRadius: 16, textAlign: 'center' }}>
                Chưa có ai đang chờ. Người được check-in ở Lịch trong ngày sẽ hiện ở đây.
              </p>
            )}
            <ol className="nb-qlist">
              {data.waiting.map((w, i) => {
                const prio = w.priorityGroup === 'PRIORITY';
                return (
                  <li key={w.id} className="nb-stack-sm">
                    {i % data.capacity === 0 && <p className="nb-caps">{i < data.capacity ? 'Lượt kế tiếp' : 'Lượt sau'}</p>}
                    <div className={`nb-qitem ${prio ? 'priority' : ''}`}>
                      <span className={`nb-qno ${prio ? 'priority' : i < data.capacity ? 'next' : ''}`}>{i + 1}</span>
                      <div>
                        <p className="nb-strong" style={{ fontSize: 17 }}>
                          {w.patient?.fullName}
                        </p>
                        <p style={{ fontSize: 15, lineHeight: '22px' }}>
                          {w.ticketCode} · check-in {fmtTime(w.checkInTime)} · đã chờ {w.waitedMinutes} phút
                        </p>
                      </div>
                      <div>
                        <span className={`nb-pill ${prio ? 'nb-pill-blue' : 'nb-pill-plain'}`}>{prio ? 'Ưu tiên' : 'Thường'}</span>
                        <span style={{ fontSize: 15, lineHeight: '22px' }}>{waitNote(w)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="nb-card" aria-labelledby="hd-khung" style={{ gap: 14 }}>
            <div className="nb-stack-sm" style={{ gap: 4 }}>
              <h2 id="hd-khung" className="nb-h2">
                Sơ đồ ghế theo khung giờ hôm nay
              </h2>
              <p>Mỗi ô là một người đã check-in vào khung giờ đó.</p>
            </div>
            <SlotMap slotMap={data.slotMap} waiting={data.waiting} />
          </section>
        </>
      )}

      {undoTarget && (
        <NbModal title="Hoàn tác vào khám?" onClose={() => setUndoTarget(null)} width={560}>
          <dl className="nb-infogrid">
            <div>
              <dt>Bệnh nhân</dt>
              <dd>{undoTarget.patient?.fullName}</dd>
            </div>
            <div>
              <dt>Mã phiếu khám</dt>
              <dd>{undoTarget.ticketCode}</dd>
            </div>
            <div>
              <dt>Vào khám lúc</dt>
              <dd style={{ fontWeight: 600 }}>{fmtTime(undoTarget.enteredAt)}</dd>
            </div>
          </dl>
          <p>
            Phiếu trở lại <strong className="nb-ink">hàng chờ</strong>, đúng vị trí theo giờ check-in. Ghế vừa trống tự động nhận người kế tiếp trong hàng chờ; người này sẽ vào ở ghế trống sau.
          </p>
          <NbError error={actionError} />
          <div className="nb-dialog-actions">
            <button type="button" className="nb-btn nb-btn-primary nb-btn-lg" style={{ flex: '1 1 220px' }} disabled={busy} onClick={confirmUndo}>
              Xác nhận hoàn tác
            </button>
            <button type="button" className="nb-btn nb-btn-ghost nb-btn-lg" onClick={() => setUndoTarget(null)}>
              Quay lại
            </button>
          </div>
        </NbModal>
      )}
    </>
  );
}
