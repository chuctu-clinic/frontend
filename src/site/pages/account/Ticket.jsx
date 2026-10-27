import { CLINIC, fmtDate, shortTime, weekday } from '../../../shared/lib/format.js';

// Phiếu khám theo màn "Đặt lịch 4 · Phiếu khám" của prototype (VeKham.dc.html)

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fromMin = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

/** Khoảng giờ check-in để được xếp ưu tiên: từ trước khung giờ X phút tới khi khung giờ kết thúc (BR.29). */
export function checkInWindow(start, { early = 15, length = 60 } = {}) {
  const s = toMin(start);
  return [fromMin(s - early), fromMin(s + length)];
}

const USER_STATUS = {
  BOOKED: ['Đã đặt lịch', ''],
  COMPLETED: ['Đã hoàn thành', 't-chip-done'],
  CANCELLED: ['Đã huỷ', 't-chip-off'],
};

/** Phiếu khám: mã phiếu, nội dung khám, giờ khám dự kiến thật to, thông tin người đi khám (UC.6.5). */
export function Ticket({ appt, meta }) {
  const cancelled = appt.status === 'CANCELLED';
  const [chip, chipClass] = USER_STATUS[appt.status] || USER_STATUS.BOOKED;
  const p = appt.patient || {};
  const [from, to] = checkInWindow(appt.slotStart, { early: meta?.priorityEarlyMinutes, length: meta?.slotMinutes });
  const rows = [
    ['Người đi khám', p.fullName],
    ['Mã bệnh nhân', p.patientCode],
    ['Ngày sinh', p.dob ? fmtDate(String(p.dob).slice(0, 10)) : p.birthYear ? `Năm ${p.birthYear}` : null],
    ['Số điện thoại', p.phone],
    ['Địa chỉ', p.address],
    ['Chi phí', 'Miễn phí'],
    ['Mã phiếu khám', appt.ticketCode],
  ];
  if (cancelled && appt.cancelReason) rows.push(['Lý do huỷ', appt.cancelReason]);

  return (
    <section className={`t-ticket ${cancelled ? 't-off' : ''}`} aria-label={`Phiếu khám ${appt.ticketCode}`}>
      <div className="t-top">
        <div className="t-brand">
          <img src="/logo-192.png" alt="" />
          <div>
            <p className="t-cap">Phiếu khám bệnh</p>
            <p className="t-name">{CLINIC.short}</p>
          </div>
        </div>
        <div className="t-code">
          <p className="t-cap">Mã phiếu khám</p>
          <p>{appt.ticketCode}</p>
        </div>
      </div>

      <div className="t-main">
        <div>
          <p className="t-clinic">Phòng khám {CLINIC.short}</p>
          <p className="t-addr">{CLINIC.address}</p>
        </div>
        <span className={`t-chip ${chipClass}`}>
          <span aria-hidden="true" />
          {chip}
        </span>
        <div>
          <p className="t-label">Nội dung khám</p>
          <p className="t-service">{appt.serviceLabel}</p>
        </div>
        <p className="t-cap t-gold">Giờ khám dự kiến</p>
        <div className="t-time">{shortTime(appt.slotStart)}</div>
        <p className="t-date">
          {weekday(appt.slotDate)}, {fmtDate(appt.slotDate)}
        </p>
        <p className="t-fine">Đây là giờ dự kiến. Thứ tự khám có thể thay đổi tuỳ số người đang chờ ở phòng khám.</p>
        {appt.status === 'BOOKED' && (
          <p className="t-remind">
            Cô chú đến check-in từ {from} đến trước {to} để được xếp ưu tiên trong khung đã đặt.
          </p>
        )}
      </div>

      <div className="t-cut" aria-hidden="true">
        <span />
        <span />
      </div>

      <div className="t-details">
        <dl className="a-dl">
          {rows.map(([dt, dd]) => (
            <div key={dt}>
              <dt>{dt}</dt>
              <dd className={dd ? '' : 'a-empty'}>{dd || 'Chưa cập nhật'}</dd>
            </div>
          ))}
        </dl>
        <p className="t-counter">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>
            Cô chú trình phiếu khám này tại <strong>quầy tiếp nhận</strong> để được hướng dẫn.
          </span>
        </p>
      </div>
    </section>
  );
}
