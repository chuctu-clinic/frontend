import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { CLINIC, fmtDate, fmtDateLong, shortTime } from '@chuctu/shared/lib/format.ts';
import type { Appointment, AppointmentStatus } from '@chuctu/shared/types.ts';

/** Nhãn trạng thái phía người dùng chỉ có ba loại (BR.17). */
export const USER_STATUS: Record<'dat' | 'xong' | 'huy', string> = { dat: 'Đã đặt lịch', xong: 'Đã hoàn thành', huy: 'Đã huỷ' };
export const statusGroup = (s: AppointmentStatus) => (s === 'COMPLETED' ? 'xong' : s === 'CANCELLED' ? 'huy' : 'dat');

/** "09:00" → "9:15": giờ muộn nhất nên check-in để được khám trong khung đã đặt. */
const checkInBy = (start: string) => {
  const [h, m] = start.split(':').map(Number);
  const t = h * 60 + m + 15;
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

/** Phiếu khám dạng vé: mã phiếu, giờ khám dự kiến, người đi khám (UC.6.5, prototype: Phiếu khám). */
export function Ticket({ appt }: { appt: Appointment }) {
  const g = statusGroup(appt.status);
  const p = appt.patient;
  const [weekdayName, date] = fmtDateLong(appt.slotDate).split(', ');
  const rows: [string, string | null | undefined][] = [
    ['Người đi khám', p?.fullName],
    ['Mã bệnh nhân', p?.patientCode],
    ['Ngày sinh', p?.dob ? fmtDate(p.dob) : p?.birthYear ? String(p.birthYear) : null],
    ['Số điện thoại', p?.phone],
    ['Địa chỉ', p?.address],
    ['Chi phí', 'Miễn phí'],
    ...(g === 'huy' && appt.cancelReason ? ([['Lý do huỷ', appt.cancelReason]] as [string, string][]) : []),
    ['Mã phiếu khám', appt.ticketCode],
  ];
  return (
    <section className={`u-ticket${g === 'huy' ? ' cancelled' : ''}`} aria-label={`Phiếu khám ${appt.ticketCode}`}>
      <div className="u-ticket-top">
        <div className="u-row" style={{ gap: 14 }}>
          <img src="/logo.png" alt="" />
          <div>
            <p className="u-ticket-cap">Phiếu khám bệnh</p>
            <p style={{ fontFamily: "'Noto Serif', Georgia, serif", fontSize: 22, lineHeight: '30px', fontWeight: 700 }}>Chúc Từ</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="u-ticket-cap">Mã phiếu khám</p>
          <p style={{ fontSize: 20, lineHeight: '30px', fontWeight: 700, letterSpacing: '0.5px' }}>{appt.ticketCode}</p>
        </div>
      </div>
      <div className="u-ticket-mid">
        <div>
          <p style={{ fontFamily: "'Noto Serif', Georgia, serif", fontSize: 25, lineHeight: '35px', fontWeight: 700, color: '#2a2118' }}>Phòng khám Chúc Từ</p>
          <p style={{ fontSize: 17, lineHeight: '27px', color: '#4a3f33' }}>{CLINIC.address}</p>
        </div>
        <span className={`u-ticket-chip ${g}`}>{USER_STATUS[g]}</span>
        <div>
          <p style={{ fontSize: 17, lineHeight: '26px', color: '#6b5e4e' }}>Nội dung khám</p>
          <p style={{ fontSize: 24, lineHeight: '34px', fontWeight: 700, color: '#2e5b37' }}>{appt.serviceLabel}</p>
        </div>
        <p className="u-ticket-gold" style={{ fontSize: 16, lineHeight: '24px' }}>
          Giờ khám dự kiến
        </p>
        <div className="u-ticket-time">{shortTime(appt.slotStart)}</div>
        <p className="u-ticket-gold" style={{ fontSize: 19, lineHeight: '28px', letterSpacing: '0.04em' }}>
          {weekdayName}, {date}
        </p>
        <p style={{ maxWidth: '46ch', fontSize: 16, lineHeight: '25px', color: '#6b5e4e' }}>
          Đây là giờ dự kiến. Thứ tự khám có thể thay đổi tuỳ số người đang chờ ở phòng khám.
        </p>
        {g === 'dat' && (
          <p style={{ maxWidth: '46ch', fontSize: 18, lineHeight: '28px', fontWeight: 700, color: '#2e5b37' }}>
            Cô chú đến và check-in trước {checkInBy(appt.slotStart)} để được khám trong khung đã đặt.
          </p>
        )}
      </div>
      <div className="u-ticket-cut" aria-hidden="true" />
      <div className="u-ticket-info">
        <dl>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd style={v ? undefined : { fontWeight: 500, fontStyle: 'italic', color: '#6b5e4e' }}>{v || 'Chưa cập nhật'}</dd>
            </div>
          ))}
        </dl>
        <p className="u-ticket-note">
          <Icon name="infoSoft" size={22} />
          <span>
            Cô chú trình phiếu khám này tại <strong>quầy tiếp nhận</strong> để được hướng dẫn.
          </span>
        </p>
      </div>
    </section>
  );
}
