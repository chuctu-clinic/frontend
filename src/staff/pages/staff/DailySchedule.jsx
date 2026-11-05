import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert, Loading } from '../../../shared/ui/ui.jsx';
import { api, qs } from '../../../shared/lib/api.js';
import { addDays, fmtDate, fmtTime, shortTime, todayVN, weekday } from '../../../shared/lib/format.js';
import { useAsync, useDismiss, useDocumentTitle } from '../../../shared/lib/hooks.js';
import { MonthGrid } from '../../components/MonthGrid.jsx';
import { NoticeDialog } from '../../components/dialogs.jsx';
import { Pager } from '../../components/Pager.jsx';
import { AddAppointmentDialog } from '../../components/appointments/AddAppointmentDialog.jsx';
import { CancelDialog, CheckinDialog, UndoCheckinDialog } from '../../components/appointments/StatusDialogs.jsx';
import { RescheduleDialog } from '../../components/appointments/RescheduleDialog.jsx';
import { StatusChip, stateNote, RowMenu } from './scheduleParts.jsx';

const PER_PAGE = 10;

const FILTERS = [
  ['all', 'Tất cả'],
  ['BOOKED', 'Chưa đến'],
  ['CHECKED_IN', 'Đã check-in'],
  ['IN_PROGRESS', 'Đã vào khám'],
  ['COMPLETED', 'Đã hoàn thành'],
  ['CANCELLED', 'Đã huỷ'],
];

export const clock = (value) => fmtTime(value).replace(/^0/, '');

export const minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Bỏ dấu, chữ thường, chỉ giữ chữ và số để tìm kiếm. */
const norm = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');

/** Lịch trong ngày: lọc trạng thái, tra cứu, check-in, đổi giờ, huỷ, hoàn tác check-in (mời vào khám ở trang Hàng đợi) (UC.7.1 – UC.7.7). */
export default function DailySchedule() {
  useDocumentTitle('Lịch trong ngày');
  const [params, setParams] = useSearchParams();
  const today = todayVN();
  const date = params.get('ngay') || today;
  const isToday = date === today;
  const isPast = date < today;
  // ?loc=<trạng thái>: mở sẵn bộ lọc (bấm từ ô số liệu ở Tổng quan)
  const [filter, setFilter] = useState(() => (FILTERS.some(([k]) => k === params.get('loc')) ? params.get('loc') : 'all'));
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [lookupMsg, setLookupMsg] = useState(null);
  const [calOpen, setCalOpen] = useState(false);
  const [marked, setMarked] = useState(() => new Set());
  const calRef = useDismiss(calOpen, () => setCalOpen(false));

  const { data, loading, error: loadError, reload } = useAsync(() => api.get(`/staff/appointments${qs({ date })}`), [date]);

  // Mở sẵn hộp thoại Thêm lịch khám: ?them=1, hoặc ?dat=<mã hồ sơ> để vào thẳng bước chọn giờ
  useEffect(() => {
    const pid = params.get('dat');
    if (params.get('them')) setDialog({ type: 'add' });
    else if (pid) {
      api
        .get(`/staff/patients/${pid}`)
        .then((d) => setDialog({ type: 'add', patient: d.patient }))
        .catch(setError);
    } else return;
    const next = new URLSearchParams(params);
    next.delete('them');
    next.delete('dat');
    setParams(next, { replace: true });
  }, [params, setParams]);

  const goDate = (d) => {
    setParams(d === today ? {} : { ngay: d });
    setCalOpen(false);
    setNotice(null);
    setQ('');
    setLookupMsg(null);
    setPage(1);
    setMenu(null);
  };

  const onMonth = useCallback((ym) => {
    api
      .get(`/staff/appointments/dates${qs({ month: ym })}`)
      .then((d) => setMarked((s) => new Set([...s, ...d.dates])))
      .catch(() => {});
  }, []);

  const all = data?.items || [];
  const active = all.filter((a) => a.status !== 'CANCELLED');
  const count = (s) => all.filter((a) => a.status === s).length;
  const qn = norm(q);
  const rows = useMemo(() => {
    // Tất cả: gồm cả phiếu đã huỷ, xếp xuống cuối để phiếu còn hiệu lực luôn ở trên
    let list = filter === 'all' ? [...all.filter((a) => a.status !== 'CANCELLED'), ...all.filter((a) => a.status === 'CANCELLED')] : all.filter((a) => a.status === filter);
    if (qn) list = list.filter((a) => norm(`${a.ticketCode}${a.patient?.fullName}${a.patient?.patientCode}${a.patient?.phone}`).includes(qn));
    if (filter === 'CHECKED_IN') list = [...list].sort((x, y) => (x.checkin?.queueNo ?? 999) - (y.checkin?.queueNo ?? 999));
    return list;
  }, [all, filter, qn]);
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const withNo = filter === 'CHECKED_IN';

  const showResults = () => document.getElementById('lt-ketqua')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const lookup = async () => {
    const text = q.trim();
    setLookupMsg(null);
    if (!text) {
      setLookupMsg('Nhập mã phiếu khám, tên, mã bệnh nhân hoặc số điện thoại để tra cứu.');
      document.getElementById('lt-ma')?.focus();
      return;
    }
    // Danh sách đã lọc ngay khi gõ: có kết quả thì chỉ cần đưa người dùng tới bảng
    if (rows.length > 0) return showResults();
    // Có trong ngày nhưng bị bộ lọc trạng thái che: chuyển về Tất cả
    const hidden = all.find((a) => norm(`${a.ticketCode}${a.patient?.fullName}${a.patient?.patientCode}${a.patient?.phone}`).includes(qn));
    if (hidden) {
      setFilter('all');
      setPage(1);
      return showResults();
    }
    // Không có trong ngày đang xem: tra mã phiếu ở mọi ngày rồi chuyển sang ngày đó
    if (!/^CT-PK-/i.test(text)) {
      setLookupMsg(`Ngày đang xem không có lịch khám nào khớp với “${text}”. Tìm theo tên hay số điện thoại chỉ áp dụng cho ngày đang xem; nhập đủ mã phiếu khám (dạng CT-PK-…) để tìm ở mọi ngày.`);
      return;
    }
    try {
      const res = await api.get(`/staff/appointments/lookup${qs({ code: text.toUpperCase() })}`);
      const found = res.appointment;
      if (!found) {
        setLookupMsg(`Không tìm thấy phiếu khám mã “${text}”. Kiểm tra lại mã trên phiếu của bệnh nhân.`);
        return;
      }
      setParams(found.slotDate === today ? {} : { ngay: found.slotDate });
      setFilter('all');
      setPage(1);
      setLookupMsg(found.slotDate === date ? null : `Phiếu ${found.ticketCode} thuộc ngày ${fmtDate(found.slotDate)}, đã chuyển sang ngày đó.`);
      showResults();
    } catch (err) {
      setError(err);
    }
  };

  const done = (message) => {
    setDialog(null);
    if (message) setNotice(message);
    reload({ silent: true });
  };

  const act = (key, a) => {
    setMenu(null);
    setError(null);
    if (key === 'checkin') return setDialog({ type: 'checkin', appt: a });
    if (key === 'undo-checkin') return setDialog({ type: 'undo', appt: a });
    if (key === 'reschedule') return setDialog({ type: 'reschedule', appt: a });
    if (key === 'cancel') return setDialog({ type: 'cancel', appt: a });
  };

  const dayLabel = isToday ? 'hôm nay' : `ngày ${fmtDate(date)}`;

  return (
    <>
      <div className="t-pagehead" style={{ gap: 20 }}>
        <div>
          <h1 className="t-h1">Lịch khám trong ngày</h1>
          <p className="t-text">Mỗi phiếu khám đã đặt hiện ở đây. Tiếp tân tìm theo mã phiếu khám rồi check-in cho bệnh nhân.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div className="t-datebar" ref={calRef}>
            <span className="t-label">Xem ngày</span>
            <div className="t-datebar-row">
              <button type="button" className="t-btn t-btn-ghost t-btn-icon" aria-label="Xem ngày trước" onClick={() => goDate(addDays(date, -1))}>
                <Icon name="chevronLeft" size={26} />
              </button>
              <button type="button" className="t-btn t-btn-ghost t-datebtn" aria-haspopup="dialog" aria-expanded={calOpen} onClick={() => setCalOpen((v) => !v)}>
                <Icon name="calendar" size={26} strokeWidth={1.75} />
                {isToday ? 'Hôm nay' : weekday(date)} · {fmtDate(date)}
              </button>
              <button type="button" className="t-btn t-btn-ghost t-btn-icon" aria-label="Xem ngày sau" onClick={() => goDate(addDays(date, 1))}>
                <Icon name="chevronRight" size={26} />
              </button>
              {!isToday && (
                <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 20px' }} onClick={() => goDate(today)}>
                  Về hôm nay
                </button>
              )}
            </div>
            {calOpen && (
              <div className="t-cal-pop" role="dialog" aria-label="Chọn ngày xem lịch" style={{ top: 'calc(100% + 10px)', left: 0, width: 440, maxWidth: 'calc(100vw - 48px)' }}>
                <MonthGrid value={date} onPick={goDate} marked={(iso) => marked.has(iso)} onMonth={onMonth} />
                <div className="t-cal-legend">
                  <span>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green-600)' }} />
                    Ngày có lịch khám
                  </span>
                  <span>
                    <span style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid var(--gold-500)', background: 'var(--gold-100)' }} />
                    Hôm nay
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button type="button" className="t-btn t-btn-primary" style={{ flex: '1 1 auto' }} onClick={() => goDate(today)}>
                    Chọn hôm nay
                  </button>
                  <button type="button" className="t-btn t-btn-ghost" onClick={() => setCalOpen(false)}>
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
          <button type="button" className="t-btn t-btn-primary t-btn-bold" style={{ padding: '0 26px' }} onClick={() => setDialog({ type: 'add' })}>
            <Icon name="calendarPlus" size={26} strokeWidth={1.75} />
            Thêm lịch khám
          </button>
        </div>
      </div>

      <form
        className="t-lookup"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          lookup();
        }}
      >
        <div className="t-field">
          <label htmlFor="lt-ma" className="t-label">
            Tra cứu nhanh bằng mã phiếu khám hoặc tên bệnh nhân
          </label>
          <input
            autoComplete="off"
            id="lt-ma"
            type="search"
            className="t-input"
            placeholder="Ví dụ: mã phiếu khám của bệnh nhân"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
              setLookupMsg(null);
            }}
          />
        </div>
        <button type="submit" className="t-btn t-btn-primary" style={{ padding: '0 26px' }}>
          <Icon name="search" strokeWidth={1.75} />
          Tra cứu
        </button>
        {lookupMsg && (
          <p role="status" className="t-text" style={{ flexBasis: '100%', fontWeight: 600 }}>
            {lookupMsg}
          </p>
        )}
      </form>

      <div className="t-stats">
        <div className="t-stat">
          <p>{isToday ? 'Tổng lịch hôm nay' : `Tổng lịch ngày ${fmtDate(date).slice(0, 5)}`}</p>
          <p>{active.length}</p>
        </div>
        <div className="t-stat green">
          <p>Đã check-in</p>
          <p>{count('CHECKED_IN') + count('IN_PROGRESS') + count('COMPLETED')}</p>
        </div>
        <div className="t-stat gold">
          <p>Chưa đến</p>
          <p>{count('BOOKED')}</p>
        </div>
        <div className="t-stat">
          <p>Đặt hộ tại quầy</p>
          <p>{active.filter((a) => a.source === 'COUNTER').length}</p>
        </div>
      </div>

      {notice && <NoticeDialog onClose={() => setNotice(null)}>{notice}</NoticeDialog>}
      <ErrorAlert error={error || loadError} />

      <div className="t-card" id="lt-ketqua" style={{ scrollMarginTop: 24 }}>
        <p className="t-label" style={{ padding: '20px 24px 12px' }}>
          Lịch khám {dayLabel} — {rows.length} lượt
        </p>
        <div role="group" aria-label="Lọc theo trạng thái" className="t-filters" style={{ padding: '0 24px 18px' }}>
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="t-filter"
              aria-pressed={filter === key}
              onClick={() => {
                setFilter(key);
                setPage(1);
              }}
            >
              {label}
              <span className="t-filter-n">{key === 'all' ? all.length : count(key)}</span>
            </button>
          ))}
        </div>
        {loading && !data && <Loading />}
        {data && all.length > 0 && rows.length > 0 && (
          <div className="t-scroll">
            <div role="table" aria-label="Lịch khám trong ngày" className={`t-table t-sched ${withNo ? 'with-no' : ''}`}>
              <div role="row" className="t-tr t-thead">
                {withNo && (
                  <div role="columnheader" className="t-th">
                    Thứ tự
                  </div>
                )}
                <div role="columnheader" className="t-th">
                  Mã phiếu khám
                </div>
                <div role="columnheader" className="t-th">
                  Bệnh nhân
                </div>
                <div role="columnheader" className="t-th">
                  Giờ khám dự kiến
                </div>
                <div role="columnheader" className="t-th">
                  Trạng thái
                </div>
                <div role="columnheader" className="t-th">
                  Thao tác
                </div>
              </div>
              <div role="rowgroup" className="t-tbody">
                {shown.map((a) => {
                  const note = stateNote(a, isToday);
                  const prio = a.status === 'CHECKED_IN' && a.checkin?.priorityGroup === 'PRIORITY';
                  return (
                    <div
                      key={a.id}
                      role="row"
                      className={`t-tr ${a.status === 'CANCELLED' ? 'cancel' : prio ? 'prio' : ''}`}
                      style={menu === a.id ? { position: 'relative', zIndex: 30 } : undefined}
                    >
                      {withNo && (
                        <div role="cell" className="t-td t-queue-no">
                          {a.checkin?.queueNo ?? ''}
                        </div>
                      )}
                      <div role="cell" className="t-td">
                        <span className="t-td-code">{a.ticketCode}</span>
                        {a.source === 'COUNTER' && <span className="t-td-sub">Đặt hộ tại quầy</span>}
                      </div>
                      <div role="cell" className="t-td">
                        <span className="t-td-name">{a.patient?.fullName}</span>
                        <span className="t-td-sub">{a.patient?.phone}</span>
                      </div>
                      <div role="cell" className="t-td t-text">
                        {shortTime(a.slotStart)}
                      </div>
                      <div role="cell" className="t-td">
                        <StatusChip a={a} />
                        {note && <span className="t-state-note">{note}</span>}
                      </div>
                      <div role="cell" className="t-td t-td-act">
                        <RowMenu
                          a={a}
                          isToday={isToday}
                          isPast={isPast}
                          open={menu === a.id}
                          onToggle={() => setMenu((m) => (m === a.id ? null : a.id))}
                          act={act}
                        />
                      </div>
                      {a.status === 'CANCELLED' && (
                        <div role="cell" className="t-cancel-reason">
                          <strong>Lý do huỷ:</strong> {a.cancelReason || 'Không ghi'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {data && all.length > 0 && rows.length === 0 && (
          <div className="t-empty">
            <p>Không tìm thấy lịch khám nào</p>
            <p className="t-text">
              Kiểm tra lại mã phiếu khám, tên bệnh nhân hoặc bộ lọc trạng thái. Bệnh nhân chưa có lịch thì bấm <strong>Thêm lịch khám</strong> để đặt hộ.
            </p>
          </div>
        )}
        {data && all.length === 0 && (
          <div className="t-empty">
            <p>Ngày này chưa có lịch khám</p>
            <p className="t-text">
              Bệnh nhân muốn khám ngày này thì bấm <strong>Thêm lịch khám</strong> để đặt hộ.
            </p>
          </div>
        )}
        <Pager page={current} total={rows.length} unit="lượt khám" onPage={setPage} />
      </div>

      {dialog?.type === 'add' && (
        <AddAppointmentDialog
          patient={dialog.patient}
          onClose={() => setDialog(null)}
          onBooked={(message, appt, finished) => {
            reload({ silent: true });
            if (message) setNotice(message);
            if (finished) setDialog(null);
            if (appt && appt.slotDate !== date && !message) setParams(appt.slotDate === today ? {} : { ngay: appt.slotDate });
          }}
        />
      )}
      {dialog?.type === 'checkin' && <CheckinDialog appt={dialog.appt} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.type === 'undo' && <UndoCheckinDialog appt={dialog.appt} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.type === 'reschedule' && <RescheduleDialog appt={dialog.appt} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.type === 'cancel' && <CancelDialog appt={dialog.appt} onClose={() => setDialog(null)} onDone={done} />}
    </>
  );
}
