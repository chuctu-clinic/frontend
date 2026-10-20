import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { StatusBadge } from '@chuctu/shared/components/ui.jsx';
import { RELATIONSHIPS, fmtDateLong, slotLabel } from '@chuctu/shared/lib/format.js';

/** Phiếu khám: mã phiếu, giờ khám dự kiến, người đi khám, nội dung khám, trạng thái (UC.6.5). */
export function Ticket({ appt, forUser = true }) {
  return (
    <section className="ticket" aria-label={`Phiếu khám ${appt.ticketCode}`}>
      <div className="ticket-head">
        <div className="row" style={{ gap: 12 }}>
          <Icon name="ticket" size={32} />
          <h2>Phiếu khám bệnh</h2>
        </div>
        <StatusBadge status={appt.status} forUser={forUser} />
      </div>
      <dl className="ticket-body">
        <div className="span-2">
          <dt>Mã phiếu khám</dt>
          <dd className="ticket-code">{appt.ticketCode}</dd>
        </div>
        <div>
          <dt>Ngày khám</dt>
          <dd>{fmtDateLong(appt.slotDate)}</dd>
        </div>
        <div>
          <dt>Giờ khám dự kiến</dt>
          <dd>{slotLabel(appt.slotStart)}</dd>
        </div>
        <div>
          <dt>Người đi khám</dt>
          <dd>
            {appt.patient?.fullName}
            {appt.patient?.relationship && (
              <span className="caption" style={{ display: 'block' }}>
                {RELATIONSHIPS[appt.patient.relationship]} · {appt.patient.patientCode}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Nội dung khám</dt>
          <dd>{appt.serviceLabel}</dd>
        </div>
        {appt.status === 'CANCELLED' && appt.cancelReason && (
          <div className="span-2">
            <dt>Lý do huỷ</dt>
            <dd style={{ fontWeight: 500 }}>{appt.cancelReason}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
