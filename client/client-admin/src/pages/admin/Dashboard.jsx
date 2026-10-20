import { Link } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { ButtonLink, ErrorAlert, Loading, PageHeader } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { STATUS, fmtDate } from '@chuctu/shared/lib/format.js';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { SlotMap } from '../staff/Queue.jsx';

function StatCard({ icon, value, label, to }) {
  return (
    <Link to={to} className="card card-link row" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
      <span className="icon-circle">
        <Icon name={icon} />
      </span>
      <span className="stat">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </span>
    </Link>
  );
}

/** Tổng quan trong ngày (UC.2.3). */
export default function Dashboard() {
  useDocumentTitle('Tổng quan');
  const { data, loading, error } = useAsync(() => api.get('/admin/dashboard'), []);

  if (loading) return <Loading />;
  if (error) return <ErrorAlert error={error} />;

  const accounts = data.accounts;
  return (
    <div className="stack-lg">
      <PageHeader
        title="Tổng quan hôm nay"
        actions={
          <>
            <ButtonLink to="/dat-ho" icon="plus" variant="secondary">
              Đặt hộ tại quầy
            </ButtonLink>
            <ButtonLink to="/quan-tri/bai-viet/moi" icon="edit">
              Viết bài mới
            </ButtonLink>
          </>
        }
      />
      <div className="grid-4">
        <StatCard icon="ticket" value={data.appointments.active} label="Phiếu khám hôm nay" to="/lich-trong-ngay" />
        <StatCard icon="users" value={data.patients.total} label="Hồ sơ bệnh nhân" to="/benh-nhan" />
        <StatCard icon="news" value={data.posts.published} label={`Bài viết đã đăng · ${data.posts.draft} bản nháp`} to="/quan-tri/bai-viet" />
        <StatCard
          icon="shield"
          value={(accounts.USER || 0) + (accounts.RECEPTIONIST || 0) + (accounts.ADMIN || 0)}
          label={`Tài khoản · ${accounts.RECEPTIONIST || 0} tiếp tân`}
          to="/quan-tri/tai-khoan"
        />
      </div>

      <div className="grid-2">
        <section className="card card-lg stack-sm" aria-labelledby="trang-thai">
          <h2 id="trang-thai" style={{ fontSize: 24 }}>
            Phiếu khám theo trạng thái
          </h2>
          <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {Object.entries(STATUS).map(([key, s]) => (
              <li key={key} className="row-between">
                <Link to={`/lich-trong-ngay?trang-thai=${key}`}>{s.label}</Link>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--ink-900)' }}>
                  {data.appointments.byStatus[key] || 0}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card card-lg stack-sm" aria-labelledby="hang-doi">
          <h2 id="hang-doi" style={{ fontSize: 24 }}>
            Hàng đợi
          </h2>
          <div className="grid-3" style={{ gap: 12 }}>
            <div className="stat">
              <span className="stat-value">
                {data.queue.inRoomCount}/{data.queue.capacity}
              </span>
              <span className="stat-label">Trong phòng</span>
            </div>
            <div className="stat">
              <span className="stat-value">{data.queue.waitingCount}</span>
              <span className="stat-label">Đang chờ</span>
            </div>
            <div className="stat">
              <span className="stat-value">{data.queue.completedCount}</span>
              <span className="stat-label">Đã khám xong</span>
            </div>
          </div>
          <ButtonLink to="/hang-doi" variant="secondary" style={{ alignSelf: 'flex-start' }}>
            Mở hàng đợi
          </ButtonLink>
        </section>
      </div>

      <section className="stack" aria-labelledby="so-do">
        <h2 id="so-do">Sơ đồ ghế theo khung giờ</h2>
        <SlotMap slotMap={data.queue.slotMap} />
      </section>

      <section className="card card-lg stack-sm" aria-labelledby="ban-nhap">
        <h2 id="ban-nhap" style={{ fontSize: 24 }}>
          Bài viết bản nháp
        </h2>
        {data.drafts.length === 0 && <p className="muted">Không có bản nháp nào.</p>}
        <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {data.drafts.map((p) => (
            <li key={p.id} className="row-between">
              <Link to={`/quan-tri/bai-viet/${p.id}`}>{p.title || '(Chưa có tiêu đề)'}</Link>
              <span className="caption">Sửa lần cuối {fmtDate(p.updatedAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
