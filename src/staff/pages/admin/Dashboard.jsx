import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert, Loading } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { fmtDate, fmtTime, todayVN } from '../../../shared/lib/format.js';
import { useAsync, useDocumentTitle } from '../../../shared/lib/hooks.js';
import { longDay } from '../../components/appointments/time.js';
import './admin.css';

const clock = (value) => fmtTime(value).replace(/^0/, '');

/** Số phiếu hôm nay theo trạng thái; bấm một ô thì mở Lịch trong ngày đã lọc sẵn trạng thái đó. */
function TodayStats({ appointments, queue }) {
  const by = appointments.byStatus || {};
  const stats = [
    ['BOOKED', 'Chưa đến', by.BOOKED || 0, 'gold'],
    ['CHECKED_IN', 'Đang chờ', by.CHECKED_IN || 0, 'gold'],
    ['IN_PROGRESS', 'Đang khám', `${queue.inRoomCount}/${queue.capacity}`, 'green', 'ghế'],
    ['COMPLETED', 'Đã khám xong', by.COMPLETED || 0, 'green'],
    ['CANCELLED', 'Đã huỷ', by.CANCELLED || 0, 'muted'],
  ];
  return (
    <section className="db-panel" aria-labelledby="db-homnay">
      <div className="db-panel-head">
        <h2 id="db-homnay" className="t-h2">
          Hôm nay tại phòng khám
        </h2>
        <span className="t-text">
          {appointments.total} phiếu khám, {appointments.active} còn hiệu lực
        </span>
      </div>
      <div className="db-stats">
        {stats.map(([key, label, value, tone, unit]) => (
          <Link key={key} to={`/noi-bo/lich-trong-ngay?loc=${key}`} className={`db-stat ${tone}`}>
            <span className="db-stat-label">{label}</span>
            <span className="db-stat-value">
              {value}
              {unit && <small> {unit}</small>}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Hàng đợi thu nhỏ: các ghế đang khám và vài người kế tiếp. */
function QueueNow({ queue }) {
  const next = queue.waiting.slice(0, 3);
  return (
    <section className="db-panel" style={{ flex: '999 1 460px', minWidth: 0 }} aria-labelledby="db-hangdoi">
      <div className="db-panel-head">
        <h2 id="db-hangdoi" className="t-h2">
          Hàng đợi lúc này
        </h2>
        <span className="t-text">
          {queue.inRoomCount}/{queue.capacity} ghế · {queue.waitingCount} người đang chờ
        </span>
      </div>
      <div className="db-queue">
        <div>
          <p className="t-eyebrow db-queue-title">Đang khám</p>
          <ul className="db-seats">
            {queue.seats.map((s) => (
              <li key={s.seatNo} className={s.empty ? 'empty' : ''}>
                <span className="db-seat-no">Ghế {s.seatNo}</span>
                {s.empty ? (
                  <span className="db-seat-name">Trống</span>
                ) : (
                  <>
                    <span className="db-seat-name">{s.patient?.fullName}</span>
                    <span className="db-seat-sub">vào lúc {clock(s.enteredAt)}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="t-eyebrow db-queue-title">Kế tiếp</p>
          {next.length === 0 ? (
            <p className="t-text">Chưa có ai đang chờ.</p>
          ) : (
            <ol className="db-next">
              {next.map((w, i) => (
                <li key={w.id}>
                  <span className={`db-next-no ${w.priorityGroup === 'PRIORITY' ? 'prio' : ''}`}>{i + 1}</span>
                  <span className="db-seat-name">{w.patient?.fullName}</span>
                  <span className="db-seat-sub">chờ {w.waitedMinutes} phút</span>
                </li>
              ))}
            </ol>
          )}
          {queue.waitingCount > next.length && <p className="t-text" style={{ marginTop: 8 }}>và {queue.waitingCount - next.length} người nữa</p>}
        </div>
      </div>
      <div className="t-actions" style={{ gap: 12 }}>
        <Link to="/noi-bo/hang-doi" className="t-btn t-btn-primary" style={{ padding: '0 22px' }}>
          Mở hàng đợi
        </Link>
        <Link to="/noi-bo/man-hinh-cho" target="_blank" rel="noopener" className="t-btn t-btn-ghost" style={{ padding: '0 20px' }}>
          <Icon name="external" strokeWidth={1.75} />
          Mở màn hình chờ
        </Link>
      </div>
    </section>
  );
}

/** Tổng quan trong ngày cho Admin (UC.2.3), theo prototype "Admin-Dashboard". */
export default function Dashboard() {
  useDocumentTitle('Tổng quan');
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/dashboard'), []);
  const queue = useAsync(() => api.get('/staff/queue'), []);
  const reloadQueue = queue.reload;

  // Tự làm mới như trang Hàng đợi, để số liệu hôm nay không bị cũ
  useEffect(() => {
    const t = setInterval(() => {
      reload({ silent: true });
      reloadQueue({ silent: true });
    }, 30_000);
    return () => clearInterval(t);
  }, [reload, reloadQueue]);

  if (loading) return <Loading />;
  if (error) return <ErrorAlert error={error} />;

  const postTotal = data.posts.published + data.posts.draft + (data.posts.hidden || 0);
  const accountTotal = Object.values(data.accounts).reduce((a, b) => a + b, 0);
  const tiles = [
    ['/noi-bo/lich-trong-ngay', 'Lịch khám hôm nay', `${data.appointments.active} phiếu khám`, 'Xem lịch', true],
    ['/noi-bo/benh-nhan', 'Hồ sơ bệnh nhân', `${data.patients.total} hồ sơ`, 'Tra cứu'],
    ['/noi-bo/quan-tri/bai-viet', 'Bài viết', `${postTotal} bài viết`, 'Quản lý'],
    ['/noi-bo/quan-tri/tai-khoan', 'Tài khoản hệ thống', `${accountTotal} tài khoản`, 'Quản lý'],
  ];

  return (
    <>
      <div>
        <p className="t-muted" style={{ marginBottom: 6, fontWeight: 600 }}>
          {longDay(todayVN())}
        </p>
        <h1 className="t-h1" style={{ marginBottom: 10 }}>
          Tổng quan
        </h1>
        <p className="t-lead">Quản trị viên có toàn quyền hệ thống, bao gồm tất cả chức năng của tiếp tân.</p>
      </div>

      <TodayStats appointments={data.appointments} queue={data.queue} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        {queue.data && <QueueNow queue={queue.data} />}
        <section className="a-shortcuts" aria-labelledby="db-loi-tat">
          <h2 id="db-loi-tat" className="t-h2">
            Lối tắt
          </h2>
          <Link to="/noi-bo/quan-tri/bai-viet/moi" className="t-btn t-btn-primary">
            <Icon name="edit" strokeWidth={1.75} />
            Viết bài mới
          </Link>
          <Link to="/noi-bo/quan-tri/tai-khoan?them=1" className="t-btn t-btn-ghost">
            <Icon name="userPlus" strokeWidth={1.75} />
            Thêm tài khoản
          </Link>
        </section>
      </div>

      <h2 className="t-h2" style={{ marginBottom: -8 }}>
        Hệ thống
      </h2>
      <div className="a-tiles">
        {tiles.map(([to, label, value, go, green]) => (
          <Link key={to} to={to} className={`a-tile ${green ? 'green' : ''}`}>
            <span className="a-tile-label">{label}</span>
            <span className="a-tile-value">{value}</span>
            <span className="a-tile-go">{go}</span>
          </Link>
        ))}
      </div>

      {data.drafts.length > 0 && (
        <section className="db-panel" aria-labelledby="db-nhap">
          <div className="db-panel-head">
            <h2 id="db-nhap" className="t-h2">
              Bài viết bản nháp
            </h2>
            <Link to="/noi-bo/quan-tri/bai-viet" className="db-link">
              Quản lý bài viết
            </Link>
          </div>
          <ul className="a-drafts">
            {data.drafts.map((p) => (
              <li key={p.id}>
                <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                  <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink-900)' }}>{p.title}</p>
                  <p className="t-text">
                    {p.categoryLabel} · lưu lần cuối {fmtTime(p.updatedAt).replace(/^0/, '')}, {fmtDate(p.updatedAt)}
                  </p>
                </div>
                <span className="t-chip t-chip-gold" style={{ padding: '4px 12px' }}>
                  Bản nháp
                </span>
                <Link to={`/noi-bo/quan-tri/bai-viet/${p.id}`} className="t-btn t-btn-ghost" style={{ padding: '0 20px' }}>
                  Sửa và công khai
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
