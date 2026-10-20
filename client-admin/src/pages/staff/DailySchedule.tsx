import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MiniQueue } from '../../components/StaffLayout.tsx';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Alert, Button, ButtonLink, Empty, ErrorAlert, Loading, PageHeader, StatusBadge } from '@chuctu/shared/components/ui.tsx';
import { api, qs, cleanParams } from '@chuctu/shared/lib/api.ts';
import { STATUS, fmtDateLong, shortTime, todayVN } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { CancelModal, RescheduleModal } from './ApptActions.tsx';
import type { Appointment, AppointmentStatus } from '@chuctu/shared/types.ts';

const FILTERS: (AppointmentStatus | '')[] = ['', 'BOOKED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

/** Lịch trong ngày: lọc trạng thái, tra cứu, check-in, đổi giờ, huỷ, hoàn tác (UC.7.1 – UC.7.7). */
export default function DailySchedule() {
  useDocumentTitle('Lịch trong ngày');
  const [params, setParams] = useSearchParams();
  const date = params.get('ngay') || todayVN();
  const status = params.get('trang-thai') || '';
  const [q, setQ] = useState(params.get('tim') || '');
  const [query, setQuery] = useState(q);
  const [modal, setModal] = useState<{ type: 'cancel' | 'reschedule'; appt: Appointment } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, reload } = useAsync(() => api.get<{ date: string; items: Appointment[]; summary: Record<AppointmentStatus, number> }>(`/staff/appointments${qs({ date, status, q: query })}`), [date, status, query]);
  const isToday = date === todayVN();

  const update = (next: Record<string, string>) => {
    const merged = { ngay: date === todayVN() ? '' : date, 'trang-thai': status, ...next };
    setParams(cleanParams(merged));
  };

  const act = async (appt: Appointment, action: 'checkin' | 'undo-checkin', label: string) => {
    setBusy(appt.id + action);
    setError(null);
    try {
      await api.post(`/staff/appointments/${appt.id}/${action}`);
      setNotice(`${label}: ${appt.patient?.fullName} (${appt.ticketCode}).`);
      reload({ silent: true });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(null);
    }
  };

  const done = (message: string) => {
    setModal(null);
    setNotice(message);
    reload({ silent: true });
  };

  return (
    <div className="staff-layout">
      <div className="stack">
        <PageHeader
          title="Lịch trong ngày"
          subtitle={fmtDateLong(date)}
          actions={
            <ButtonLink to="/dat-ho" icon="plus">
              Đặt hộ tại quầy
            </ButtonLink>
          }
        />
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ maxWidth: 220 }}>
            <label className="field-label" htmlFor="ngay">
              Ngày
            </label>
            <input id="ngay" type="date" className="input" value={date} onChange={(e) => update({ ngay: e.target.value })} />
          </div>
          <div className="field" style={{ flex: '1 1 320px' }}>
            <label className="field-label" htmlFor="tim">
              Tra cứu mã phiếu khám hoặc tên bệnh nhân
            </label>
            <input id="tim" type="search" className="input" placeholder="Ví dụ: CT-PK-26-2010-004 hoặc Nguyễn Thị Hoa" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {!isToday && (
            <Button variant="secondary" onClick={() => update({ ngay: '' })}>
              Về hôm nay
            </Button>
          )}
        </div>
        <div className="tabs" role="group" aria-label="Lọc theo trạng thái">
          {FILTERS.map((s) => (
            <button key={s} type="button" className="tab" aria-pressed={status === s} onClick={() => update({ 'trang-thai': s })}>
              {s ? STATUS[s].label : 'Tất cả'}
              {data && (
                <span className="count">
                  ({s ? data.summary[s] : Object.values(data.summary).reduce((a, b) => a + b, 0)})
                </span>
              )}
            </button>
          ))}
        </div>
        {notice && <Alert type="success">{notice}</Alert>}
        <ErrorAlert error={error} />
        {loading && <Loading />}
        {data && data.items.length === 0 && (
          <Empty icon="calendar" title={query ? 'Không tìm thấy phiếu khám phù hợp' : 'Chưa có phiếu khám nào'}>
            {query ? 'Kiểm tra lại mã phiếu hoặc tên bệnh nhân.' : 'Bệnh nhân đến trực tiếp thì bấm "Đặt hộ tại quầy".'}
          </Empty>
        )}
        {data && data.items.length > 0 && (
          <div className="table-wrap">
            <table className="table table-responsive">
              <thead>
                <tr>
                  <th scope="col">Giờ</th>
                  <th scope="col">Mã phiếu</th>
                  <th scope="col">Bệnh nhân</th>
                  <th scope="col">Nội dung</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id}>
                    <td data-label="Giờ" className="mono" style={{ fontWeight: 700 }}>
                      {shortTime(a.slotStart)}
                    </td>
                    <td data-label="Mã phiếu" className="mono">
                      {a.ticketCode}
                      {a.source === 'COUNTER' && <span className="caption" style={{ display: 'block' }}>Đặt tại quầy</span>}
                    </td>
                    <td data-label="Bệnh nhân">
                      <Link to={`/benh-nhan/${a.patient?.id}`} style={{ fontWeight: 600 }}>
                        {a.patient?.fullName}
                      </Link>
                      <span className="caption" style={{ display: 'block' }}>
                        {[a.patient?.birthYear && `SN ${a.patient.birthYear}`, a.patient?.phone].filter(Boolean).join(' · ')}
                      </span>
                    </td>
                    <td data-label="Nội dung">{a.serviceLabel}</td>
                    <td data-label="Trạng thái">
                      <StatusBadge status={a.status} />
                    </td>
                    <td data-label="">
                      <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                        {a.status === 'BOOKED' && isToday && (
                          <Button size="sm" icon="check" loading={busy === `${a.id}checkin`} onClick={() => act(a, 'checkin', 'Đã check-in')}>
                            Check-in
                          </Button>
                        )}
                        {a.status === 'BOOKED' && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => setModal({ type: 'reschedule', appt: a })}>
                              Đổi giờ
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setModal({ type: 'cancel', appt: a })}>
                              Huỷ
                            </Button>
                          </>
                        )}
                        {a.status === 'CHECKED_IN' && (
                          <Button size="sm" variant="secondary" icon="undo" loading={busy === `${a.id}undo-checkin`} onClick={() => act(a, 'undo-checkin', 'Đã hoàn tác check-in')}>
                            Hoàn tác check-in
                          </Button>
                        )}
                        {a.status === 'IN_PROGRESS' && (
                          <ButtonLink size="sm" to={`/phieu-kham/${a.id}/ket-qua`} icon="clipboard">
                            Ghi nhận lượt khám
                          </ButtonLink>
                        )}
                        {a.status === 'COMPLETED' && (
                          <ButtonLink size="sm" variant="ghost" to={`/phieu-kham/${a.id}/ket-qua`}>
                            Xem kết quả
                          </ButtonLink>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted row" style={{ gap: 8 }}>
          <Icon name="info" size={20} />
          Check-in nhầm thì bấm "Hoàn tác check-in" để đưa phiếu về Chưa đến. Phiếu đã huỷ không check-in được.
        </p>
      </div>
      <MiniQueue />
      {modal?.type === 'cancel' && <CancelModal appt={modal.appt} onClose={() => setModal(null)} onDone={(a) => done(`Đã huỷ phiếu ${a.ticketCode}.`)} />}
      {modal?.type === 'reschedule' && (
        <RescheduleModal appt={modal.appt} onClose={() => setModal(null)} onDone={(a) => done(`Đã đổi giờ. Phiếu mới ${a.ticketCode}, ${shortTime(a.slotStart)} ngày ${a.slotDate.split('-').reverse().join('/')}.`)} />
      )}
    </div>
  );
}
