import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api, cleanParams, qs } from '@chuctu/shared/lib/api.ts';
import { addDays, fmtDate, fmtDateLong, fmtTime, hhmm, slotLabel, todayVN } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { Appointment, AppointmentStatus, Patient } from '@chuctu/shared/types.ts';
import { NbActionMenu, NbEmpty, NbLoading, NbMonthCalendar, NbOk, NbPager, NbStatus, type MenuItem } from '../../components/nb.tsx';
import { AddAppointmentModal, CancelModal, CheckinModal, RescheduleModal, UndoCheckinModal } from './ApptActions.tsx';

type DayData = { date: string; items: Appointment[]; summary: Record<AppointmentStatus, number>; counterCount: number };
type ModalType = 'checkin' | 'undo' | 'reschedule' | 'cancel';

const CHIPS: { value: AppointmentStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'BOOKED', label: 'Chưa đến' },
  { value: 'CHECKED_IN', label: 'Đã check-in' },
  { value: 'IN_PROGRESS', label: 'Đã vào khám' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
];
const PAGE_SIZE = 10;

/** Ghi chú dưới nhãn trạng thái: đã qua khung giờ, đến sớm, đến muộn. */
function statusNote(a: Appointment, isToday: boolean) {
  const nowHM = hhmm(new Date());
  const end = `${String(Number(a.slotStart.slice(0, 2)) + 1).padStart(2, '0')}${a.slotStart.slice(2)}`;
  if (a.status === 'BOOKED' && isToday && nowHM >= end) return 'Đã qua khung giờ khám';
  if (a.status === 'CHECKED_IN' && a.source === 'ONLINE' && a.priorityGroup === 'NORMAL' && a.checkInTime) {
    return hhmm(new Date(a.checkInTime)) < a.slotStart ? `Đến sớm, ưu tiên từ ${a.slotStart}` : 'Đến sau khung đã đặt';
  }
  if (a.status === 'CHECKED_IN' && a.source === 'COUNTER' && a.priorityGroup === 'NORMAL') return 'Đến trực tiếp';
  return '';
}

/** Lịch trong ngày: chọn ngày, tra cứu, lọc trạng thái, check-in, đổi giờ, huỷ, đặt hộ (UC.7.1 – UC.7.7). */
export default function DailySchedule() {
  useDocumentTitle('Lịch trong ngày');
  const [params, setParams] = useSearchParams();
  const today = todayVN();
  const date = params.get('ngay') || today;
  const status = (params.get('trang-thai') || '') as AppointmentStatus | '';
  const [q, setQ] = useState(params.get('tim') || '');
  const [query, setQuery] = useState(q);
  const [page, setPage] = useState(1);
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);
  const [modal, setModal] = useState<{ type: ModalType; appt: Appointment } | null>(null);
  const [adding, setAdding] = useState<{ patient: Patient | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isToday = date === today;

  const { data, loading, reload } = useAsync(() => api.get<DayData>(`/staff/appointments${qs({ date, status, q: query })}`), [date, status, query]);

  // Mở "Thêm lịch khám" từ trang hồ sơ bệnh nhân: ?them=1&benh-nhan=<id>
  useEffect(() => {
    if (params.get('them') !== '1') return;
    const id = params.get('benh-nhan');
    const next = new URLSearchParams(params);
    next.delete('them');
    next.delete('benh-nhan');
    setParams(next, { replace: true });
    if (!id) {
      setAdding({ patient: null });
      return;
    }
    api
      .get<{ patient: Patient }>(`/staff/patients/${id}`)
      .then((r) => setAdding({ patient: r.patient }))
      .catch(() => setAdding({ patient: null }));
  }, [params, setParams]);

  useEffect(() => setPage(1), [date, status, query]);

  useEffect(() => {
    if (!calOpen) return undefined;
    const close = (e: MouseEvent) => {
      if (!calRef.current?.contains(e.target as Node)) setCalOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [calOpen]);

  const update = (next: Record<string, string>) => {
    setParams(cleanParams({ ngay: date === today ? '' : date, 'trang-thai': status, ...next }));
  };
  const goDate = (d: string) => update({ ngay: d === today ? '' : d });

  const search = (e: FormEvent) => {
    e.preventDefault();
    setQuery(q.trim());
  };

  const done = (message: string) => {
    setModal(null);
    setAdding(null);
    setNotice(message);
    reload({ silent: true });
  };

  const summary = data?.summary;
  const total = summary ? Object.values(summary).reduce((a, b) => a + b, 0) : 0;
  const active = summary ? total - summary.CANCELLED : 0;
  const arrived = summary ? summary.CHECKED_IN + summary.IN_PROGRESS + summary.COMPLETED : 0;
  const items = data?.items ?? [];
  const shown = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const withOrder = status === 'CHECKED_IN';
  const cols = `${withOrder ? '104px ' : ''}220px minmax(0, 1.4fr) 120px minmax(0, 1.2fr) 110px`;

  const menuFor = (a: Appointment): MenuItem[] => {
    const m: MenuItem[] = [];
    const open = (type: ModalType) => () => setModal({ type, appt: a });
    if (a.status === 'BOOKED' && isToday) m.push({ label: 'Check-in', icon: 'check', tone: 'accent', onClick: open('checkin') });
    if (a.status === 'BOOKED') m.push({ label: 'Đổi giờ khám', icon: 'clock', onClick: open('reschedule') });
    if (a.status === 'IN_PROGRESS') m.push({ label: 'Ghi nhận lượt khám', icon: 'clipboard', tone: 'accent', to: `/phieu-kham/${a.id}/ket-qua` });
    if (a.status === 'COMPLETED') m.push({ label: 'Xem lượt khám', icon: 'file', to: `/phieu-kham/${a.id}/ket-qua` });
    if (a.patient) m.push({ label: 'Mở hồ sơ bệnh nhân', icon: 'user', to: `/benh-nhan/${a.patient.id}` });
    if (a.status === 'CHECKED_IN') m.push({ label: 'Hoàn tác check-in', icon: 'undo', onClick: open('undo') });
    if (a.status === 'BOOKED') m.push({ label: 'Huỷ phiếu khám', icon: 'x', tone: 'danger', onClick: open('cancel') });
    return m;
  };

  return (
    <>
      <div className="nb-stack" style={{ gap: 20 }}>
        <div className="nb-stack-sm">
          <h1 className="nb-h1">Lịch khám trong ngày</h1>
          <p className="nb-lead">Mỗi phiếu khám đã đặt hiện ở đây. Tiếp tân tìm theo mã phiếu khám rồi check-in cho bệnh nhân.</p>
        </div>
        <div className="nb-row" style={{ gap: 16, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div className="nb-stack-sm" style={{ flex: '1 1 420px' }}>
            <span className="nb-label">Xem ngày</span>
            <div className="nb-datebar" ref={calRef}>
              <button type="button" className="nb-btn nb-btn-ghost nb-btn-icon" aria-label="Xem ngày trước" onClick={() => goDate(addDays(date, -1))}>
                <Icon name="chevronLeft" />
              </button>
              <button type="button" className="nb-datebtn" aria-expanded={calOpen} aria-haspopup="dialog" onClick={() => setCalOpen((v) => !v)}>
                <Icon name="calendar" />
                {fmtDateLong(date)}
                {isToday ? ' (hôm nay)' : ''}
              </button>
              <button type="button" className="nb-btn nb-btn-ghost nb-btn-icon" aria-label="Xem ngày sau" onClick={() => goDate(addDays(date, 1))}>
                <Icon name="chevronRight" />
              </button>
              {!isToday && (
                <button type="button" className="nb-btn nb-btn-ghost" onClick={() => goDate(today)}>
                  Về hôm nay
                </button>
              )}
              {calOpen && (
                <div className="nb-cal" role="dialog" aria-label="Chọn ngày xem lịch">
                  <NbMonthCalendar
                    value={date}
                    onPick={(d) => {
                      goDate(d);
                      setCalOpen(false);
                    }}
                  />
                  <div className="nb-row" style={{ gap: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid #C9963F', background: '#F7EBD2' }} aria-hidden="true" />
                    Hôm nay
                  </div>
                  <div className="nb-dialog-actions">
                    <button
                      type="button"
                      className="nb-btn nb-btn-primary"
                      style={{ flex: '1 1 auto' }}
                      onClick={() => {
                        goDate(today);
                        setCalOpen(false);
                      }}
                    >
                      Chọn hôm nay
                    </button>
                    <button type="button" className="nb-btn nb-btn-ghost" onClick={() => setCalOpen(false)}>
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button type="button" className="nb-btn nb-btn-primary" style={{ fontWeight: 700, padding: '0 26px' }} onClick={() => setAdding({ patient: null })}>
            <Icon name="plus" />
            Thêm lịch khám
          </button>
        </div>
      </div>

      <form className="nb-card-gold" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }} onSubmit={search}>
        <div className="nb-field" style={{ flex: '999 1 320px' }}>
          <label className="nb-label" htmlFor="lt-ma">
            Tra cứu nhanh bằng mã phiếu khám hoặc tên bệnh nhân
          </label>
          <input id="lt-ma" type="search" className="nb-input" placeholder="Ví dụ: mã phiếu khám của bệnh nhân" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button type="submit" className="nb-btn nb-btn-primary" style={{ padding: '0 26px' }}>
          <Icon name="search" />
          Tra cứu
        </button>
      </form>

      <div className="nb-stats">
        <div className="nb-stat">
          <p>{isToday ? 'Phiếu khám hôm nay' : 'Phiếu khám trong ngày'}</p>
          <p>{active}</p>
        </div>
        <div className="nb-stat nb-stat-green">
          <p>Đã check-in</p>
          <p>{arrived}</p>
        </div>
        <div className="nb-stat nb-stat-gold">
          <p>Chưa đến</p>
          <p>{summary?.BOOKED ?? 0}</p>
        </div>
        <div className="nb-stat">
          <p>Đặt hộ tại quầy</p>
          <p>{data?.counterCount ?? 0}</p>
        </div>
      </div>

      {notice && <NbOk onClose={() => setNotice(null)}>{notice}</NbOk>}

      <div className="nb-card nb-card-flush">
        <p className="nb-card-title">
          Lịch khám {isToday ? 'hôm nay' : `ngày ${fmtDate(date)}`} — {items.length} lượt
        </p>
        <div className="nb-chips" role="group" aria-label="Lọc theo trạng thái" style={{ padding: '0 24px 18px' }}>
          {CHIPS.map((c) => (
            <button key={c.value} type="button" className="nb-chip" aria-pressed={status === c.value} onClick={() => update({ 'trang-thai': c.value })}>
              {c.label}
              <span className="nb-chip-n">{summary ? (c.value ? summary[c.value] : total) : 0}</span>
            </button>
          ))}
        </div>
        {loading && <NbLoading />}
        {!loading && items.length > 0 && (
          <div className="nb-table-wrap">
            <div className="nb-table" role="table" aria-label="Lịch khám trong ngày">
              <div className="nb-tr nb-thead" role="row" style={{ ['--cols' as string]: cols }}>
                {withOrder && (
                  <div className="nb-th" role="columnheader">
                    Thứ tự
                  </div>
                )}
                {['Mã phiếu khám', 'Bệnh nhân', 'Giờ khám dự kiến', 'Trạng thái', 'Thao tác'].map((h) => (
                  <div key={h} className="nb-th" role="columnheader">
                    {h}
                  </div>
                ))}
              </div>
              {shown.map((a) => {
                const note = statusNote(a, isToday);
                return (
                  <div
                    key={a.id}
                    className={`nb-tr ${a.status === 'CANCELLED' ? 'cancelled' : a.priorityGroup === 'PRIORITY' && a.status === 'CHECKED_IN' ? 'priority' : ''}`}
                    role="row"
                    style={{ ['--cols' as string]: cols }}
                  >
                    {withOrder && (
                      <div className="nb-td nb-queue-no" role="cell">
                        {a.queueNo ?? ''}
                      </div>
                    )}
                    <div className="nb-td" role="cell">
                      <span className="nb-strong">{a.ticketCode}</span>
                      {a.source === 'COUNTER' && <span className="nb-sub">Đặt hộ tại quầy</span>}
                    </div>
                    <div className="nb-td" role="cell">
                      <span className="nb-strong" style={{ fontWeight: 600 }}>
                        {a.patient?.fullName}
                      </span>
                      <span className="nb-sub">{a.patient?.phone}</span>
                    </div>
                    <div className="nb-td nb-nowrap" role="cell">
                      {slotLabel(a.slotStart)}
                    </div>
                    <div className="nb-td nb-stack-sm" role="cell" style={{ gap: 6, alignItems: 'flex-start' }}>
                      <NbStatus
                        status={a.status}
                        suffix={a.status === 'CHECKED_IN' && a.checkInTime ? fmtTime(a.checkInTime) : a.status === 'IN_PROGRESS' && a.enteredAt ? fmtTime(a.enteredAt) : undefined}
                      />
                      {note && <span className="nb-sub" style={{ lineHeight: '22px' }}>{note}</span>}
                    </div>
                    <div className="nb-td-action" role="cell">
                      <NbActionMenu
                        label={`Thao tác cho ${a.patient?.fullName ?? a.ticketCode}`}
                        items={menuFor(a)}
                        renderLink={(it, close) => (
                          <Link key={it.label} to={it.to!} role="menuitem" className={it.tone} onClick={close}>
                            <Icon name={it.icon} size={22} />
                            {it.label}
                          </Link>
                        )}
                      />
                    </div>
                    {a.status === 'CANCELLED' && a.cancelReason && (
                      <div className="nb-tr-note" role="cell">
                        <strong>Lý do huỷ:</strong> {a.cancelReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {!loading && items.length === 0 && (query || status) && (
          <NbEmpty title="Không tìm thấy lịch khám nào">
            Kiểm tra lại mã phiếu khám, tên bệnh nhân hoặc bộ lọc trạng thái. Bệnh nhân chưa có lịch thì bấm <strong>Thêm lịch khám</strong> để đặt hộ.
          </NbEmpty>
        )}
        {!loading && items.length === 0 && !query && !status && (
          <NbEmpty title="Ngày này chưa có lịch khám">
            Bệnh nhân muốn khám ngày này thì bấm <strong>Thêm lịch khám</strong> để đặt hộ.
          </NbEmpty>
        )}
        <NbPager page={page} total={items.length} limit={PAGE_SIZE} onPage={setPage} unit="lượt" />
      </div>

      {modal?.type === 'checkin' && <CheckinModal appt={modal.appt} onClose={() => setModal(null)} onDone={(a) => done(`Đã check-in cho ${a.patient?.fullName} lúc ${fmtTime(new Date())} và ghi nhận thời điểm tiếp nhận.`)} />}
      {modal?.type === 'undo' && <UndoCheckinModal appt={modal.appt} onClose={() => setModal(null)} onDone={(a) => done(`Đã hoàn tác check-in, phiếu ${a.ticketCode} trở về Chưa đến.`)} />}
      {modal?.type === 'cancel' && <CancelModal appt={modal.appt} onClose={() => setModal(null)} onDone={(a) => done(`Đã huỷ phiếu khám ${a.ticketCode}.`)} />}
      {modal?.type === 'reschedule' && (
        <RescheduleModal appt={modal.appt} onClose={() => setModal(null)} onDone={(a) => done(`Đã đổi giờ. Phiếu mới ${a.ticketCode}, ${slotLabel(a.slotStart)} ngày ${fmtDate(a.slotDate)}.`)} />
      )}
      {adding && <AddAppointmentModal initialPatient={adding.patient} onClose={() => setAdding(null)} onDone={(_, message) => done(message)} />}
    </>
  );
}
