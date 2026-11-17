import { shortTime } from '../../shared/lib/format.js';

/**
 * Sơ đồ khung giờ trong ngày (UC.10.5): mỗi khung hiện số phiếu đã đặt trên sức chứa, số người đã check-in và số người
 * chưa đến. Khung đã đủ chỗ được đánh dấu "Đã đầy". Dữ liệu là slotMap của /staff/queue hoặc /admin/dashboard.
 */
export function SlotMap({ slots, headingId = 'slotmap-title' }) {
  if (!slots?.length) return null;
  return (
    <section className="t-card t-slotmap" aria-labelledby={headingId}>
      <h2 id={headingId} className="t-h2">
        Sơ đồ khung giờ
      </h2>
      <ul className="t-slotmap-grid">
        {slots.map((s) => {
          const full = s.booked >= s.capacity;
          const checkedIn = s.checkins?.length || 0;
          return (
            <li key={s.start} className={`t-slotmap-cell ${full ? 'full' : ''}`}>
              <span className="t-slotmap-time">{shortTime(s.start)}</span>
              <span className="t-slotmap-booked">
                Đã đặt {s.booked}/{s.capacity}
              </span>
              <span className="t-slotmap-sub">
                Đã check-in {checkedIn} · Chưa đến {s.notArrived}
              </span>
              {full ? <span className="t-slotmap-tag">Đã đầy</span> : <span className="t-slotmap-sub">Còn {s.capacity - s.booked} chỗ</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
