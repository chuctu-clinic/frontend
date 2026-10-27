import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon.jsx';
import { Loading } from '../../../shared/components/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { CLINIC, fmtDate, shortTime, weekday } from '../../../shared/lib/format.js';
import { useAsync, useDocumentTitle } from '../../../shared/lib/useAsync.js';
import '../auth/auth.css';
import './account.css';
import './records.css';

// Theo màn "Phiếu khám · Danh sách" của prototype (LichKhamCuaToi.dc.html)

const FILTERS = [
  ['', 'Tất cả phiếu khám'],
  ['BOOKED', 'Đã đặt'],
  ['COMPLETED', 'Đã khám'],
  ['CANCELLED', 'Đã huỷ'],
];

/** Nhãn và màu trạng thái người dùng thấy (BR.17). */
export const TICKET_STATUS = {
  BOOKED: ['Đã đặt lịch', ''],
  COMPLETED: ['Đã hoàn thành', 'r-status-done'],
  CANCELLED: ['Đã huỷ', 'r-status-off'],
};

function TicketCard({ a }) {
  const [label, cls] = TICKET_STATUS[a.status] || TICKET_STATUS.BOOKED;
  return (
    <article className="r-ticket">
      <div className="r-ticket-head">
        <div>
          <span className="r-code">
            Mã phiếu khám: <strong>{a.ticketCode}</strong>
          </span>
          <span className="r-name">{a.patient?.fullName}</span>
        </div>
        <span className={`r-status ${cls}`}>{label}</span>
      </div>
      <span className="r-dash" aria-hidden="true" />
      <div className="r-rows">
        <span className="r-clinic">
          <Icon name="pin" size={22} strokeWidth={1.75} />
          Phòng khám {CLINIC.short}
        </span>
        <span className="r-row">
          <span>Khám về:</span>
          <span>{a.serviceLabel}</span>
        </span>
        <span className="r-row">
          <span>Giờ khám dự kiến:</span>
          <span>
            {weekday(a.slotDate)}, {fmtDate(a.slotDate)} · {shortTime(a.slotStart)}
          </span>
        </span>
      </div>
      <div className="r-ticket-foot">
        {a.hasResult && (
          <span className="r-result-tag">
            <Icon name="clipboard" size={20} strokeWidth={1.75} />
            Đã có kết quả khám
          </span>
        )}
        {a.status === 'CANCELLED' && (
          <Link to={`/dat-lich?dat-lai=${a.id}`} className="r-rebook">
            <Icon name="refresh" size={20} strokeWidth={1.75} />
            Đặt lại
          </Link>
        )}
        <Link to={`/phieu-kham/${a.id}`} className="r-more" aria-label={`Xem chi tiết phiếu khám ${a.ticketCode} của ${a.patient?.fullName}, trạng thái ${label}`}>
          Xem chi tiết phiếu khám
          <Icon name="arrowRight" size={22} strokeWidth={1.75} />
        </Link>
      </div>
    </article>
  );
}

/** Phiếu khám của tôi và người thân, lọc theo trạng thái (UC.6.4). */
export default function MyTickets() {
  useDocumentTitle('Phiếu khám bệnh');
  const [params, setParams] = useSearchParams();
  const status = params.get('trang-thai') || '';
  // Tải hết một lần để đếm số phiếu của từng mục lọc
  const { data, loading } = useAsync(() => api.get('/me/appointments'), []);
  const all = data?.items || [];
  const count = (s) => (s ? all.filter((a) => a.status === s).length : all.length);
  const items = status ? all.filter((a) => a.status === status) : all;

  return (
    <div className="k-page a-vars">
      <div className="k-crumbs">
        <nav aria-label="Đường dẫn">
          <Link to="/">Trang chủ</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Phiếu khám bệnh</span>
        </nav>
      </div>

      <section className="k-main">
        <div className="k-wrap">
          <div className="k-head-row">
            <div>
              <h1 className="k-h1">Phiếu khám bệnh</h1>
              <p className="k-lead">Tất cả phiếu khám của cô chú và người thân. Bấm vào một phiếu khám để xem chi tiết.</p>
            </div>
            <Link to="/dat-lich" className="a-btn-primary k-btn" style={{ minHeight: 60, fontSize: 19 }}>
              <Icon name="calendarPlus" strokeWidth={1.75} />
              Đặt lịch khám mới
            </Link>
          </div>

          <div className="r-chips" role="group" aria-label="Lọc phiếu khám">
            {FILTERS.map(([value, label]) => (
              <button key={value} type="button" className="r-chip" aria-pressed={status === value} onClick={() => setParams(value ? { 'trang-thai': value } : {})}>
                {label}
                <span className="r-count">{data ? count(value) : '…'}</span>
              </button>
            ))}
          </div>

          {loading && <Loading />}
          {data && items.length > 0 && (
            <div className="r-list">
              {items.map((a) => (
                <TicketCard key={a.id} a={a} />
              ))}
            </div>
          )}
          {data && items.length === 0 && (
            <div className="r-empty">
              <span className="r-empty-icon">
                <Icon name="ticket" size={48} strokeWidth={1.5} />
              </span>
              <p className="r-empty-title">Chưa có phiếu khám nào ở mục này</p>
              <p>Cô chú thử chọn mục khác, hoặc đặt một lịch khám mới.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
