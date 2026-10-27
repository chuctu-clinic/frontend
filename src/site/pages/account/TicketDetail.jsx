import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert, Loading } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { fmtDate, shortTime, weekday } from '../../../shared/lib/format.js';
import { useSession } from '../../../shared/lib/session.jsx';
import { useAsync, useDocumentTitle } from '../../../shared/lib/hooks.js';
import { Dialog } from '../../components/Dialog.jsx';
import { Picker } from '../../components/Picker.jsx';
import { BookingCrumbs, BookingFrame } from '../booking/Booking.jsx';
import { Ticket } from './Ticket.jsx';
import './account.css';
import '../booking/booking.css';

// Theo màn "Đặt lịch 4 · Phiếu khám" của prototype (VeKham.dc.html)

const CANCEL_REASONS = ['Bận việc đột xuất', 'Sức khoẻ không đi được', 'Đã khám ở nơi khác', 'Muốn đổi sang ngày giờ khác', 'Lý do khác'];

function CancelDialog({ appt, onClose, onCancelled }) {
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const cancel = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await api.post(`/me/appointments/${appt.id}/cancel`, { reason: reason || null });
      onCancelled(res.appointment);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog
      title="Cô chú muốn huỷ buổi khám này?"
      tone="red"
      width={640}
      alert
      onClose={onClose}
      actions={
        <>
          <button type="button" className="a-btn-ghost a-grow" onClick={onClose} style={{ minHeight: 60, fontSize: 19, fontWeight: 700 }}>
            Không, giữ lịch khám
          </button>
          <button type="button" className="a-btn-danger" onClick={cancel} disabled={pending} aria-busy={pending || undefined} style={{ minHeight: 60, flexBasis: 240 }}>
            {pending ? <span className="spinner" aria-hidden="true" /> : <Icon name="x" size={22} />}
            Đồng ý huỷ khám
          </button>
        </>
      }
    >
      <p className="a-lead">Huỷ rồi thì phiếu khám này không dùng được nữa. Cô chú vẫn có thể đặt lại buổi khác sau.</p>
      <div className="bk-cancel-sum">
        <p>
          <Icon name="calendar" size={22} strokeWidth={1.75} />
          <span>
            <strong>
              {weekday(appt.slotDate)}, {fmtDate(appt.slotDate)}
            </strong>{' '}
            · giờ khám dự kiến {shortTime(appt.slotStart)}
          </span>
        </p>
        <p>
          <Icon name="user" size={22} strokeWidth={1.75} />
          {appt.patient?.fullName} · {appt.serviceLabel}
        </p>
        <p>
          <Icon name="ticket" size={22} strokeWidth={1.75} />
          <span>
            Mã phiếu khám <strong>{appt.ticketCode}</strong>
          </span>
        </p>
      </div>
      <div className="a-field">
        <label htmlFor="ly-do-huy" className="a-label">
          Lý do huỷ <span style={{ fontWeight: 400, color: 'var(--ink-500)' }}>(không bắt buộc)</span>
        </label>
        <Picker
          id="ly-do-huy"
          items={[{ value: '', label: 'Không nêu lý do', display: '' }, ...CANCEL_REASONS.map((r) => ({ value: r, label: r }))]}
          value={reason}
          onChange={setReason}
          aria-describedby="ly-do-huy-note"
        />
        <p id="ly-do-huy-note" className="a-hint">
          Phòng khám chỉ dùng thông tin này để sắp lịch tốt hơn cho lần sau.
        </p>
      </div>
      <ErrorAlert error={error} />
    </Dialog>
  );
}

/** Phiếu khám vừa đặt (bước 4) hoặc mở lại từ danh sách; huỷ phiếu (UC.6.6), đặt lại phiếu đã huỷ (UC.6.7). */
export default function TicketDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const justBooked = params.get('moi') === '1';
  useDocumentTitle(justBooked ? 'Đặt lịch thành công' : 'Chi tiết phiếu khám');
  const { meta } = useSession();
  const { data, loading, error, setData } = useAsync(() => api.get(`/me/appointments/${id}`), [id]);
  const [cancelOpen, setCancelOpen] = useState(false);

  const appt = data?.appointment;
  const booked = appt?.status === 'BOOKED';
  const cancelled = appt?.status === 'CANCELLED';

  const completed = appt?.status === 'COMPLETED';

  return (
    <div className="k-page a-vars">
      {justBooked ? (
        <BookingCrumbs current="Phiếu khám" />
      ) : (
        <div className="k-crumbs">
          <nav aria-label="Đường dẫn">
            <Link to="/">Trang chủ</Link>
            <span aria-hidden="true">›</span>
            <Link to="/phieu-kham">Phiếu khám bệnh</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">Chi tiết phiếu khám</span>
          </nav>
        </div>
      )}
      <section className="k-main k-main-tight">
        <div className="bk-wrap">
          <BookingFrame
            step={justBooked ? 4 : 0}
            title={justBooked ? 'Phiếu khám' : 'Chi tiết phiếu khám'}
            backTo="/phieu-kham"
            backLabel="Quay lại danh sách phiếu khám"
            className="b-panel-solo"
          >
            <div className="b-body b-body-tight" style={{ gap: 24 }}>
              {loading && <Loading />}
              <ErrorAlert error={error} />
              {appt && (
                <>
                  {booked && justBooked && (
                    <div className="bk-banner">
                      <span className="bk-banner-dot">
                        <Icon name="check" size={26} />
                      </span>
                      <div>
                        <h2>Đặt lịch thành công — cô chú đã có phiếu khám</h2>
                        <p>Ngày khám, cô chú đưa phiếu khám này cho tiếp tân để check-in là xong. Không cần in, mở trên điện thoại cũng được.</p>
                      </div>
                    </div>
                  )}
                  {completed && (
                    <div className="bk-banner">
                      <span className="bk-banner-dot">
                        <Icon name="checkCircle" size={26} />
                      </span>
                      <div>
                        <h2>Buổi khám đã hoàn thành</h2>
                        <p>
                          {appt.hasResult
                            ? 'Cô chú xem kết quả buổi khám này ở trang kết quả.'
                            : 'Phòng khám đang hoàn tất kết quả khám, cô chú quay lại xem sau nhé.'}
                        </p>
                        {appt.hasResult && (
                          <Link to={`/phieu-kham/${appt.id}/ket-qua`} className="a-btn-primary">
                            <Icon name="clipboard" strokeWidth={1.75} />
                            Xem kết quả khám
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                  {cancelled && (
                    <div className="bk-banner bk-banner-off">
                      <span className="bk-banner-dot">
                        <Icon name="x" size={26} />
                      </span>
                      <div>
                        <h2>Buổi khám đã được huỷ</h2>
                        <p>Phiếu khám này không còn giá trị. Cô chú có thể đặt lại một buổi khám khác bất cứ lúc nào.</p>
                        <Link to={`/dat-lich?dat-lai=${appt.id}`} className="a-btn-primary">
                          <Icon name="calendarPlus" strokeWidth={1.75} />
                          Đặt lịch khám mới
                        </Link>
                      </div>
                    </div>
                  )}

                  <Ticket appt={appt} meta={meta} />

                  {booked && (
                    <div className="bk-actions">
                      <button type="button" className="a-btn-primary" onClick={() => window.print()}>
                        <Icon name="file" strokeWidth={1.75} />
                        In phiếu khám
                      </button>
                      <Link to="/lien-he" className="a-btn-ghost">
                        <Icon name="pin" strokeWidth={1.75} />
                        Xem đường đi
                      </Link>
                      <button type="button" className="a-btn-danger-ghost" onClick={() => setCancelOpen(true)}>
                        <Icon name="x" strokeWidth={1.75} />
                        Huỷ khám
                      </button>
                    </div>
                  )}

                  {booked && (
                    <div className="bk-tips">
                      <span className="bk-tips-dot">
                        <Icon name="infoSoft" size={26} strokeWidth={1.75} />
                      </span>
                      <div>
                        <h2>Khi đến phòng khám</h2>
                        <ul>
                          <li>
                            <Icon name="check" />
                            Cô chú đưa mã phiếu khám cho tiếp tân để check-in.
                          </li>
                          <li>
                            <Icon name="check" />
                            Mang theo giấy tờ tuỳ thân và hồ sơ bệnh cũ nếu có.
                          </li>
                          <li>
                            <Icon name="check" />
                            <span>
                              Không đến được thì bấm <strong>Huỷ khám</strong>.
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </BookingFrame>
        </div>
      </section>

      {cancelOpen && appt && (
        <CancelDialog
          appt={appt}
          onClose={() => setCancelOpen(false)}
          onCancelled={(a) => {
            setData({ appointment: { ...appt, ...a, patient: { ...appt.patient, ...a.patient }, hasResult: false } });
            setCancelOpen(false);
          }}
        />
      )}
    </div>
  );
}
