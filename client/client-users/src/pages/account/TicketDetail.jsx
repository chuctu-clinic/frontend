import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { Alert, Button, ButtonLink, ErrorAlert, Loading, Modal, PageHeader, TextArea } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { CLINIC } from '@chuctu/shared/lib/format.js';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { BookingStepper } from '../booking/Booking.jsx';
import { AccountShell } from './AccountShell.jsx';
import { Ticket } from './Ticket.jsx';

/** Chi tiết phiếu, huỷ phiếu (UC.6.6) và đặt lại phiếu đã huỷ (UC.6.7). */
export default function TicketDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const justBooked = params.get('moi') === '1';
  useDocumentTitle(justBooked ? 'Đặt lịch thành công' : 'Chi tiết phiếu khám');
  const { data, loading, error, setData } = useAsync(() => api.get(`/me/appointments/${id}`), [id]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [cancelled, setCancelled] = useState(false);

  const appt = data?.appointment;

  const doCancel = async () => {
    setPending(true);
    setCancelError(null);
    try {
      const res = await api.post(`/me/appointments/${id}/cancel`, { reason });
      setData({ appointment: { ...res.appointment, hasResult: false } });
      setCancelOpen(false);
      setCancelled(true);
    } catch (err) {
      setCancelError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <AccountShell crumbs={[{ to: '/phieu-kham', label: 'Phiếu khám bệnh' }, { label: appt?.ticketCode || 'Chi tiết' }]}>
      {justBooked && <BookingStepper current={4} />}
      <PageHeader title={justBooked ? 'Đặt lịch thành công' : 'Chi tiết phiếu khám'} />
      {loading && <Loading />}
      <ErrorAlert error={error} />
      {appt && (
        <>
          {justBooked && appt.status === 'BOOKED' && (
            <Alert type="success" title="Cô chú đã có phiếu khám">
              Ngày đi khám, cô chú đưa <strong>mã phiếu khám</strong> cho tiếp tân để check-in. Giờ trên phiếu là giờ dự kiến; thứ tự vào khám do hàng
              đợi tại phòng khám sắp xếp.
            </Alert>
          )}
          {cancelled && <Alert type="success" title="Đã huỷ phiếu khám">Phiếu này không còn giá trị. Cô chú có thể đặt lại khi cần.</Alert>}
          <Ticket appt={appt} />
          <div className="row">
            {appt.hasResult && (
              <ButtonLink to={`/phieu-kham/${appt.id}/ket-qua`} icon="clipboard">
                Xem kết quả khám
              </ButtonLink>
            )}
            {appt.status === 'BOOKED' && (
              <Button variant="danger" icon="x" onClick={() => setCancelOpen(true)}>
                Huỷ phiếu khám
              </Button>
            )}
            {appt.status === 'CANCELLED' && (
              <ButtonLink to={`/dat-lich?dat-lai=${appt.id}`} icon="refresh">
                Đặt lại
              </ButtonLink>
            )}
            <Button variant="ghost" icon="file" onClick={() => window.print()}>
              In phiếu khám
            </Button>
          </div>
          <p className="small muted row" style={{ gap: 8 }}>
            <Icon name="phone" size={20} />
            Muốn đổi giờ khám? Cô chú huỷ phiếu rồi đặt lại, hoặc gọi {CLINIC.phone} để tiếp tân đổi giúp.
          </p>
        </>
      )}
      {cancelOpen && (
        <Modal
          title="Huỷ phiếu khám này?"
          onClose={() => setCancelOpen(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setCancelOpen(false)}>
                Không huỷ
              </Button>
              <Button variant="danger-solid" icon="x" loading={pending} onClick={doCancel}>
                Huỷ phiếu khám
              </Button>
            </>
          }
        >
          <div className="stack">
            <p>
              Phiếu <strong className="mono">{appt.ticketCode}</strong> sẽ <strong>không còn giá trị</strong> và chỗ của cô chú được nhường cho người khác.
              Cô chú vẫn đặt lại được sau.
            </p>
            <TextArea label="Lý do huỷ" hint="Không bắt buộc." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            <ErrorAlert error={cancelError} />
          </div>
        </Modal>
      )}
    </AccountShell>
  );
}
