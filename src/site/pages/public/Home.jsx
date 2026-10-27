import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { api } from '../../../shared/lib/api.js';
import { CLINIC, fmtDate } from '../../../shared/lib/format.js';
import { useSession } from '../../../shared/lib/session.jsx';
import { useAsync, useDocumentTitle } from '../../../shared/lib/hooks.js';
import './home.css';

// Bố cục theo màn "Khách · Trang chủ" của prototype (Main.dc.html)

const LOGIN_STEP = ['Đăng nhập', 'Chưa có tài khoản thì tạo một lần, lần sau khỏi nhập lại thông tin.'];
const LOGGED_IN_STEP = ['Đã đăng nhập', 'Cô chú đang đăng nhập rồi, không cần làm lại bước này.'];
const STEPS = [
  ['Đặt lịch', 'Chọn ngày giờ, người đi khám rồi bấm đặt lịch.'],
  ['Nhận phiếu khám', 'Có ngay phiếu khám kèm mã phiếu khám và giờ khám dự kiến, xem trong mục Phiếu khám bệnh.'],
  ['Đến khám', 'Đưa phiếu khám cho tiếp tân để check-in. Không đến được thì cô chú huỷ phiếu khám ngay trên trang.'],
];

const SERVICES = [
  ['needleSoft', 'Châm cứu', 'Giảm đau vai gáy, đau lưng, tê bì chân tay và di chứng sau tai biến.', 'cham-cuu'],
  ['physio', 'Vật lý trị liệu', 'Tập phục hồi vận động sau chấn thương, thoái hóa khớp và cứng khớp.', 'vat-ly-tri-lieu'],
  ['handSoft', 'Xoa bóp — bấm huyệt', 'Thư giãn cơ, giảm mỏi và hỗ trợ giấc ngủ, thường kết hợp cùng châm cứu.', 'xoa-bop'],
  ['leafSoft', 'Bốc thuốc', 'Bắt mạch, kê thang thuốc Nam – thuốc Bắc, cân và gói ngay tại phòng khám.', 'boc-thuoc'],
];

const HIGHLIGHTS = [
  ['heartSoft', 'Không thu phí'],
  ['usersSoft', 'Bác sĩ & nhân viên'],
  ['clockSoft', 'Ưu tiên bà con khó khăn'],
];

const SI = 1.75; // độ dày nét icon của prototype

/** Thẻ bài viết: ảnh trên, chuyên mục + ngày, tiêu đề, tóm tắt. Cả thẻ là một liên kết tới bài. */
export function NewsCard({ post }) {
  const gold = post.category === 'HUONG_DAN';
  return (
    <Link to={`/tin-tuc/${post.id}`} className="h-card h-news card-link">
      <span className="card-media">
        <img src={post.thumbnailUrl || '/mat-tien.jpg'} alt="" loading="lazy" />
      </span>
      <div className="h-news-body">
        <div className="h-news-meta">
          <span className={`h-chip ${gold ? 'h-chip-gold' : ''}`}>{post.categoryLabel}</span>
          <span>{fmtDate(post.publishedAt)}</span>
        </div>
        <h3>{post.title}</h3>
        {post.summary && <p>{post.summary}</p>}
      </div>
    </Link>
  );
}

function SectionTitle({ id, children }) {
  return (
    <div>
      <h2 id={id} className="h-h2">
        {children}
      </h2>
      <div className="h-rule" aria-hidden="true" />
    </div>
  );
}

export default function Home() {
  useDocumentTitle('');
  const { user } = useSession();
  const loggedIn = user?.role === 'USER';
  const posts = useAsync(() => api.get('/posts?limit=3'), []);
  const bookTo = '/dat-lich';

  return (
    <div className="home">
      {/* Hero */}
      <section className="h-hero">
        <div className="h-wrap h-hero-grid">
          <div className="h-hero-text">
            <span className="h-pill">
              <Icon name="leafSoft" size={20} strokeWidth={SI} />
              Phòng chẩn trị Y học cổ truyền từ thiện
            </span>
            <h1 className="h-h1">Chúc Từ — chăm sóc sức khỏe bằng tấm lòng</h1>
            <p className="h-lead">
              Châm cứu, bấm huyệt, xoa bóp và thuốc y học cổ truyền cho bệnh cơ xương khớp, đau nhức, tai biến, mất ngủ, đau đầu. Hoàn toàn miễn phí. Đặt lịch
              ngay trên trang này, cô chú nhận được phiếu khám liền.
            </p>
            <div className="h-actions">
              <Link to={bookTo} className="h-btn h-btn-primary">
                <Icon name="calendarPlus" strokeWidth={SI} />
                Đặt lịch khám
              </Link>
              <Link to="/huong-dan" className="h-btn h-btn-ghost">
                <Icon name="helpCircle" strokeWidth={SI} />
                Xem hướng dẫn đi khám
              </Link>
            </div>
            {!loggedIn && (
              <p className="h-note">
                <Icon name="lockSoft" size={22} strokeWidth={SI} />
                <span>
                  Cần <Link to="/dang-nhap?tiep=%2Fdat-lich">đăng nhập tài khoản</Link> trước khi đặt lịch.
                </span>
              </p>
            )}
            <ul className="h-highlights">
              {HIGHLIGHTS.map(([icon, label]) => (
                <li key={label}>
                  <span className="h-dot">
                    <Icon name={icon} strokeWidth={SI} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <div className="h-hero-media">
            <img src="/mat-tien.jpg" alt="Mặt tiền Phòng khám Chúc Từ, 57/8-10 Điện Biên Phủ" width="618" height="620" />
            <div className="h-hours-float">
              <span className="h-dot h-dot-gold">
                <Icon name="clockSoft" size={26} strokeWidth={SI} />
              </span>
              <span>
                <span className="h-hours-label">Giờ khám hôm nay</span>
                <span className="h-hours-value">{CLINIC.hours}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Quy trình đặt lịch */}
      <section className="h-section h-alt" aria-labelledby="quy-trinh">
        <div className="h-wrap h-stack">
          <div style={{ maxWidth: '68ch' }}>
            <SectionTitle id="quy-trinh">Đặt lịch khám diễn ra thế nào?</SectionTitle>
            <p className="h-lead" style={{ marginTop: 16 }}>
              Đặt lịch xong là <strong>có phiếu khám ngay</strong>. Ngày đi khám cô chú chỉ cần đưa phiếu khám cho tiếp tân.
            </p>
          </div>
          <ol className="h-grid-4">
            {[loggedIn ? LOGGED_IN_STEP : LOGIN_STEP, ...STEPS].map(([title, text], i) => (
              <li key={title} className="h-card h-step">
                <span className="h-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>
                  <span className="sr-only">Bước {i + 1}: </span>
                  {title}
                </h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Dịch vụ */}
      <section className="h-section" aria-labelledby="dich-vu">
        <div className="h-wrap h-stack">
          <div className="h-head-row">
            <SectionTitle id="dich-vu">Phòng khám giúp được gì cho cô chú?</SectionTitle>
            <Link to="/dich-vu" className="h-link h-link-lg">
              Xem tất cả dịch vụ
              <Icon name="arrowSoft" size={22} strokeWidth={SI} />
            </Link>
          </div>
          <div className="h-grid-4">
            {SERVICES.map(([icon, title, text, anchor]) => (
              <Link key={title} to={`/dich-vu#${anchor}`} className="h-card h-service" aria-label={`Xem chi tiết ${title.toLowerCase()}`}>
                <span className="h-dot h-dot-lg">
                  <Icon name={icon} size={32} strokeWidth={SI} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="h-dot h-arrow" aria-hidden="true">
                  <Icon name="arrowSoft" />
                </span>
              </Link>
            ))}
          </div>
          <div className="h-card h-strip">
            <span className="h-dot h-dot-gold h-dot-56">
              <Icon name="medicine" size={28} strokeWidth={SI} />
            </span>
            <p>
              <strong>Kê toa thuốc y học cổ truyền và phục hồi chức năng.</strong> Tuỳ tình trạng, bác sĩ kê thuốc nam, thuốc bắc hoặc thuốc đã bào chế sẵn. Cô
              chú nhận thuốc tại chỗ, cũng không mất tiền.
            </p>
          </div>
        </div>
      </section>

      {/* Giờ khám và địa chỉ */}
      <section className="h-section h-section-tail">
        <div className="h-wrap h-grid-2">
          <div className="h-panel h-panel-gold">
            <h2 className="h-h3">
              <Icon name="clockSoft" size={30} strokeWidth={SI} />
              Giờ khám
            </h2>
            <dl>
              <dt>Tất cả các ngày trong tuần</dt>
              <dd className="h-big-hours">{CLINIC.hours}</dd>
            </dl>
            <p className="h-note h-note-ink">
              <Icon name="infoSoft" size={22} strokeWidth={SI} />
              <span>
                Buổi sáng thường rất đông. Cô chú nên đến sớm đầu giờ sáng để khỏi phải chờ lâu, hoặc gọi trước để hỏi phòng khám còn nhận số không.
              </span>
            </p>
          </div>
          <div className="h-panel">
            <h2 className="h-h3">
              <Icon name="pin" size={30} strokeWidth={SI} />
              Địa chỉ &amp; liên hệ
            </h2>
            <p className="h-panel-text">{CLINIC.address}</p>
            <p className="h-panel-text">
              Điện thoại:{' '}
              <a href={CLINIC.phoneHref} className="h-tel">
                {CLINIC.phone}
              </a>
            </p>
            <div className="h-actions" style={{ marginTop: 'auto' }}>
              <a className="h-btn h-btn-ghost h-btn-sm" href={CLINIC.mapUrl} target="_blank" rel="noreferrer">
                Xem đường đi
              </a>
              <Link className="h-btn h-btn-ghost h-btn-sm" to="/lien-he">
                Trang liên hệ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tin tức */}
      {posts.data?.items?.length > 0 && (
        <section className="h-section h-alt" aria-labelledby="tin-tuc">
          <div className="h-wrap h-stack">
            <div className="h-head-row">
              <SectionTitle id="tin-tuc">Tin tức</SectionTitle>
              <Link to="/tin-tuc" className="h-link h-link-lg">
                Xem tất cả bài viết
                <Icon name="arrowSoft" size={22} strokeWidth={SI} />
              </Link>
            </div>
            <div className="h-grid-3">
              {posts.data.items.map((p) => (
                <NewsCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Kêu gọi đặt lịch */}
      <section className="h-cta">
        <div className="h-wrap h-cta-row">
          <div style={{ flex: '1 1 420px', minWidth: 0 }}>
            <h2>Cô chú muốn đặt lịch khám?</h2>
            <p>
              {loggedIn ? 'Đặt lịch chỉ mất vài phút.' : 'Đăng nhập rồi đặt lịch, chỉ mất vài phút.'} Nếu thấy khó, cô chú cứ gọi điện cho phòng khám.
            </p>
          </div>
          <div className="h-actions">
            <Link to={bookTo} className="h-btn h-btn-light">
              <Icon name="calendarPlus" strokeWidth={SI} />
              Đặt lịch khám
            </Link>
            <a href={CLINIC.phoneHref} className="h-btn h-btn-outline-light">
              <Icon name="phone" strokeWidth={SI} />
              Gọi {CLINIC.phone}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
