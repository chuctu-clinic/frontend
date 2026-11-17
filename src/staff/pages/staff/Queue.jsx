import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert, Loading } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { shortTime } from '../../../shared/lib/format.js';
import { useAsync, useDocumentTitle } from '../../../shared/lib/hooks.js';
import { clock } from '../../components/visit/VisitSummary.jsx';
import { arrival, waitingGroups } from '../../lib/arrival.js';
import { SlotMap } from '../../components/SlotMap.jsx';
import { CancelDialog } from '../../components/appointments/StatusDialogs.jsx';
import { NoticeDialog } from '../../components/dialogs.jsx';
import { can, useSession } from '../../../shared/lib/session.jsx';

const ageOf = (birthYear) => (birthYear ? `${new Date().getFullYear() - birthYear} tuổi` : null);

/** Bảng chờ khám: nhóm có hẹn đúng giờ đứng trước, trong mỗi nhóm ai check-in trước đứng trước. */
function WaitingTable({ waiting, onCancel }) {
  const groups = waitingGroups(waiting);

  if (waiting.length === 0) return <p className="t-dashed">Chưa có ai đang chờ khám.</p>;

  return (
    <section aria-label="Danh sách chờ khám" className="t-card" style={{ overflow: 'hidden' }}>
      <div className="t-scroll">
        <div role="table" aria-label="Danh sách chờ khám" className={`t-table hd-table ${onCancel ? 'hd-actions' : ''}`}>
          <div role="row" className="t-tr t-thead">
            <div role="columnheader" className="t-th t-c">
              STT
            </div>
            <div role="columnheader" className="t-th">
              Bệnh nhân
            </div>
            <div role="columnheader" className="t-th">
              Mã phiếu khám
            </div>
            <div role="columnheader" className="t-th t-c">
              Giờ hẹn
            </div>
            <div role="columnheader" className="t-th t-c">
              Check-in
            </div>
            <div role="columnheader" className="t-th t-c">
              Đã chờ
            </div>
            <div role="columnheader" className="t-th t-c">
              Loại
            </div>
            {onCancel && (
              <div role="columnheader" className="t-th t-c">
                Thao tác
              </div>
            )}
          </div>
          {groups.map(([label, list, offset, tone]) => (
            <div role="rowgroup" key={label} className="t-tbody">
              <div role="row" className={`hd-group ${tone}`}>
                <div role="cell">
                  {label} · {list.length}
                </div>
              </div>
              {list.map((w, i) => {
                const no = offset + i + 1;
                const [kind, kindTone] = arrival(w);
                const sub = [w.patient?.patientCode, ageOf(w.patient?.birthYear)].filter(Boolean).join(' · ');
                return (
                  <div role="row" key={w.id} className={`t-tr ${no === 1 ? 'hd-next' : ''}`}>
                    <div role="cell" className="t-td t-c">
                      <span className={`hd-no ${tone}`}>{no}</span>
                    </div>
                    <div role="cell" className="t-td">
                      <span className="t-td-name">{w.patient?.fullName}</span>
                      {sub && <span className="t-td-sub">{sub}</span>}
                    </div>
                    <div role="cell" className="t-td">
                      <span className="t-td-code">{w.ticketCode}</span>
                    </div>
                    <div role="cell" className="t-td t-c hd-num">
                      {w.source === 'COUNTER' ? '—' : shortTime(w.slotStart)}
                    </div>
                    <div role="cell" className="t-td t-c hd-num">
                      {clock(w.checkInTime)}
                    </div>
                    <div role="cell" className="t-td t-c hd-num">
                      {w.waitedMinutes != null ? `${w.waitedMinutes} phút` : '—'}
                    </div>
                    <div role="cell" className="t-td t-c">
                      <span className={`hd-kind ${kindTone}`}>{kind}</span>
                    </div>
                    {onCancel && (
                      <div role="cell" className="t-td t-c">
                        <button type="button" className="t-btn t-btn-ghost hd-cancel" aria-label={`Huỷ phiếu khám của ${w.patient?.fullName}`} onClick={() => onCancel(w)}>
                          Huỷ phiếu
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Hàng đợi: những người đã check-in đang chờ bác sĩ gọi vào khám. Tiếp tân huỷ được phiếu ở đây; mời khám nằm ở trang Khám bệnh. */
export default function Queue() {
  useDocumentTitle('Hàng đợi');
  const { meta, user } = useSession();
  // Chỉ Tiếp tân (và Admin) huỷ được phiếu; bác sĩ, kỹ thuật viên xem hàng đợi thì không có cột Thao tác
  const canCancel = can(user, 'RECEPTIONIST');
  const { data, loading, error, reload } = useAsync(() => api.get('/staff/queue'), []);
  const [cancelling, setCancelling] = useState(null);
  const [notice, setNotice] = useState(null);

  // Hộp huỷ phiếu dùng dạng phiếu khám: dựng từ lượt check-in đang chờ
  const openCancel = (w) =>
    setCancelling({
      id: w.appointmentId,
      ticketCode: w.ticketCode,
      slotStart: w.slotStart,
      slotDate: data.date,
      serviceLabel: meta?.serviceTypes?.find((s) => s.value === w.serviceType)?.label,
      patient: w.patient,
      status: 'CHECKED_IN',
    });

  useEffect(() => {
    const t = setInterval(() => reload({ silent: true }), 15_000);
    return () => clearInterval(t);
  }, [reload]);

  return (
    <>
      <div className="t-pagehead">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="t-h1" style={{ margin: 0 }}>
              Hàng đợi
            </h1>
            {data && <span className="t-count sand">{data.waiting.length} người</span>}
            <Link
              to="/noi-bo/man-hinh-cho"
              target="_blank"
              rel="noopener"
              className="t-btn t-btn-icon hd-open"
              aria-label="Mở màn hình chờ (tab mới)"
              title="Mở màn hình chờ"
            >
              <Icon name="external" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </div>

      {notice && <NoticeDialog onClose={() => setNotice(null)}>{notice}</NoticeDialog>}
      <ErrorAlert error={error} />
      {loading && !data && <Loading />}
      {data && <WaitingTable waiting={data.waiting} onCancel={canCancel ? openCancel : null} />}
      {data && <SlotMap slots={data.slotMap} headingId="hd-slotmap" />}
      {cancelling && (
        <CancelDialog
          appt={cancelling}
          onClose={() => setCancelling(null)}
          onDone={(message) => {
            setCancelling(null);
            setNotice(message);
            reload({ silent: true });
          }}
        />
      )}
    </>
  );
}
