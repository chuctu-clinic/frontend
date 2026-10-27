import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon.jsx';
import { ErrorAlert, Loading } from '../../../shared/components/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { fmtDate, fmtTime, shortTime, todayVN } from '../../../shared/lib/format.js';
import { useAsync, useDocumentTitle } from '../../../shared/lib/useAsync.js';
import { longDay, nowMinutesVN } from '../staff/ApptActions.jsx';
import './admin.css';

const RANK = { COMPLETED: 0, IN_ROOM: 1, WAITING: 2 };

/** Sơ đồ ghế thu gọn: mỗi khung giờ một dòng, mỗi người đã check-in một ô. */
function MiniSlotMap({ slotMap, waiting }) {
  const order = new Map(waiting.map((w, i) => [w.ticketCode, { no: i + 1, prio: w.priorityGroup === 'PRIORITY' }]));
  const now = nowMinutesVN();
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {slotMap.map((s) => {
          const start = s.startMinutes;
          const people = [...s.checkins].sort((a, b) => RANK[a.status] - RANK[b.status] || (order.get(a.ticketCode)?.no ?? 0) - (order.get(b.ticketCode)?.no ?? 0));
          return (
            <div key={s.start} className={`a-slot ${start <= now && now < start + 60 ? 'now' : ''}`}>
              <span className="a-slot-time">{shortTime(s.start)}</span>
              <div role="group" aria-label={`Khung ${shortTime(s.start)}, ${people.length} người đã check-in`} className="a-slot-boxes">
                {people.length === 0 && <span style={{ fontSize: 15, color: 'var(--line-strong)' }}>Chưa có ai check-in</span>}
                {people.map((c) => {
                  const o = order.get(c.ticketCode);
                  const kind = c.status === 'COMPLETED' ? 'done' : c.status === 'IN_ROOM' ? 'in' : o?.prio ? 'prio' : 'wait';
                  const label = { done: 'Đã hoàn thành', in: 'Trong phòng khám', wait: 'Đang chờ', prio: 'Đang chờ, nền xanh dương' }[kind];
                  const aria = `${label}${o ? `, thứ tự ${o.no}` : ''}`;
                  return (
                    <span key={c.id} role="img" aria-label={aria} title={aria} className={`t-box sm ${kind}`}>
                      {kind === 'done' ? '✓' : kind === 'in' ? '▶' : o?.no}
                    </span>
                  );
                })}
              </div>
              <span className="a-slot-count">{people.length} người</span>
            </div>
          );
        })}
      </div>
      <ul aria-label="Chú thích" className="t-key" style={{ paddingTop: 12, gap: '8px 22px' }}>
        {[
          ['done', '✓', 'Đã hoàn thành'],
          ['in', '▶', 'Trong phòng khám'],
          ['wait', '1', 'Đang chờ'],
          ['prio', '1', 'Đang chờ, nền xanh dương'],
        ].map(([k, ky, label]) => (
          <li key={k} style={{ fontSize: 15, gap: 8 }}>
            <span aria-hidden="true" className={`t-box sm ${k}`}>
              {ky}
            </span>
            {label}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Tổng quan trong ngày cho Admin (UC.2.3), theo prototype "Admin-Dashboard". */
export default function Dashboard() {
  useDocumentTitle('Tổng quan');
  const { data, loading, error } = useAsync(() => api.get('/admin/dashboard'), []);

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

      <div className="a-tiles">
        {tiles.map(([to, label, value, go, green]) => (
          <Link key={to} to={to} className={`a-tile ${green ? 'green' : ''}`}>
            <span className="a-tile-label">{label}</span>
            <span className="a-tile-value">{value}</span>
            <span className="a-tile-go">{go}</span>
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        <section className="ad-panel" style={{ flex: '999 1 460px', minWidth: 0 }} aria-labelledby="db-so-do">
          <div className="ad-panel-head">
            <h2 id="db-so-do" className="t-h2">
              Sơ đồ ghế theo khung giờ hôm nay
            </h2>
            <Link to="/noi-bo/hang-doi" className="ad-link">
              Mở hàng đợi
            </Link>
          </div>
          <MiniSlotMap slotMap={data.queue.slotMap} waiting={data.queue.waiting || []} />
        </section>
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

      <section className="ad-panel" aria-labelledby="db-nhap">
        <div className="ad-panel-head">
          <h2 id="db-nhap" className="t-h2">
            Bài viết bản nháp
          </h2>
          <Link to="/noi-bo/quan-tri/bai-viet" className="ad-link">
            Quản lý bài viết
          </Link>
        </div>
        {data.drafts.length === 0 ? (
          <p className="t-text" style={{ paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
            Không có bài viết nào đang ở bản nháp.
          </p>
        ) : (
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
        )}
      </section>
    </>
  );
}
