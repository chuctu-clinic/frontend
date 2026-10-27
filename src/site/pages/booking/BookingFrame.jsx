import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { CLINIC, fmtDate, shortTime, weekday } from '../../../shared/lib/format.js';
import './booking.css';

// Khung các bước đặt lịch: thanh bước, đường dẫn, hộp trợ giúp, thông tin phòng khám, tóm tắt lịch đã chọn

const STEPS = ['Thông tin khám', 'Người đi khám', 'Xác nhận', 'Phiếu khám'];

export const CLINIC_NAME = `Phòng khám ${CLINIC.short}`;

/** Khung phiếu đặt lịch: thanh tiêu đề xanh có nút quay lại và các bước. */
export function BookingFrame({ step, title, onBack, backTo, backLabel = 'Quay lại', children, className = '' }) {
  const back = backTo ? (
    <Link to={backTo} className="b-back" aria-label={backLabel}>
      <Icon name="arrowLeft" strokeWidth={1.75} />
    </Link>
  ) : (
    <button type="button" className="b-back" aria-label={backLabel} onClick={onBack}>
      <Icon name="arrowLeft" strokeWidth={1.75} />
    </button>
  );
  return (
    <div className={`b-panel ${className}`}>
      <div className="b-head">
        <div className="b-head-row">
          {back}
          <h1>{title}</h1>
          <span className="b-spacer" />
        </div>
        {step > 0 && <ol className="b-steps" aria-label="Các bước đặt lịch">
          {STEPS.map((label, i) => (
            <li key={label} className={i + 1 <= step ? 'reached' : ''} aria-current={i + 1 === step ? 'step' : undefined}>
              <span className="b-dot">{i + 1}</span>
              <span>
                <span className="sr-only">Bước {i + 1}: </span>
                {label}
                {i + 1 < step && <span className="sr-only"> (đã xong)</span>}
              </span>
            </li>
          ))}
        </ol>}
      </div>
      {children}
    </div>
  );
}

export function BookingCrumbs({ current }) {
  return (
    <div className="k-crumbs">
      <nav aria-label="Đường dẫn">
        <Link to="/">Trang chủ</Link>
        <span aria-hidden="true">›</span>
        {current === 'Đặt lịch khám' ? (
          <>
            <Link to="/dich-vu">Dịch vụ khám</Link>
            <span aria-hidden="true">›</span>
          </>
        ) : (
          <>
            <Link to="/dat-lich">Đặt lịch khám</Link>
            <span aria-hidden="true">›</span>
          </>
        )}
        <span aria-current="page">{current}</span>
      </nav>
    </div>
  );
}

export function HelpBox() {
  return (
    <div className="b-box b-box-plain">
      <h2>Thấy khó điền?</h2>
      <p>Cô chú cứ gọi điện, nhân viên phòng khám sẽ hỏi và ghi giúp từ đầu đến cuối.</p>
      <a href={CLINIC.phoneHref} className="a-btn-ghost b-call">
        <Icon name="phone" strokeWidth={1.75} />
        Gọi {CLINIC.phone}
      </a>
    </div>
  );
}

const FreeLine = () => (
  <p className="b-free">
    <Icon name="checkSoft" size={22} strokeWidth={2} />
    Khám, trị liệu và thuốc đều miễn phí — 0 đồng.
  </p>
);

export function ClinicBox() {
  return (
    <div className="b-box">
      <h2>Thông tin phòng khám</h2>
      <div className="b-box-body">
        <div className="b-brand">
          <img src="/logo-192.png" alt="" />
          Phòng chẩn trị YHCT từ thiện {CLINIC.short}
        </div>
        <div className="b-info">
          <Icon name="pin" size={22} strokeWidth={1.75} />
          {CLINIC.address}
        </div>
        <div className="b-info">
          <Icon name="clockSoft" size={22} strokeWidth={1.75} />
          <span>
            {CLINIC.hours} tất cả các ngày,
            <br />
            kể cả Chủ Nhật
          </span>
        </div>
        <div className="b-info">
          <Icon name="phone" size={22} strokeWidth={1.75} />
          <a href={CLINIC.phoneHref}>{CLINIC.phone}</a>
        </div>
        <FreeLine />
      </div>
    </div>
  );
}

export const dayLabel = (d) => `${fmtDate(d)} · ${weekday(d)}`;

/** Tóm tắt buổi khám đã chọn, hiện ở cột trái từ bước 2. */
export function SummaryBox({ service, slotDate, slotStart }) {
  return (
    <div className="b-box">
      <h2>Thông tin đặt khám</h2>
      <div className="b-box-body">
        <div className="b-info">
          <Icon name="needleSoft" size={22} strokeWidth={1.75} />
          <div>
            <small>Khám về việc gì</small>
            <strong>{service?.label}</strong>
          </div>
        </div>
        <div className="b-info">
          <Icon name="calendar" size={22} strokeWidth={1.75} />
          <div>
            <small>Ngày và giờ khám dự kiến</small>
            <strong>
              {dayLabel(slotDate)}
              <br />
              {shortTime(slotStart)}
            </strong>
          </div>
        </div>
        <div className="b-info">
          <Icon name="pin" size={22} strokeWidth={1.75} />
          <div>
            <small>Nơi khám</small>
            <strong>
              {CLINIC_NAME}
              <br />
              {CLINIC.address}
            </strong>
          </div>
        </div>
        <FreeLine />
      </div>
    </div>
  );
}
