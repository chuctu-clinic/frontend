import { Link } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { fmtDateLong, fmtDateTime } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { DashboardOverview } from '@chuctu/shared/types.ts';
import { NbError, NbLoading, NbPageHead } from '../../components/nb.tsx';
import { SlotMap } from '../staff/Queue.tsx';

/** Tổng quan cho Admin: số liệu trong ngày, sơ đồ ghế, lối tắt, bài viết bản nháp (UC.2.3). */
export default function Dashboard() {
  useDocumentTitle('Tổng quan');
  const { data, loading, error } = useAsync(() => api.get<DashboardOverview>('/admin/dashboard'), []);

  if (loading) return <NbLoading />;
  if (error || !data) return <NbError error={error} />;

  const accounts = Object.values(data.accounts).reduce((a, b) => a + (b ?? 0), 0);
  const tiles = [
    { to: '/lich-trong-ngay', label: 'Lịch khám hôm nay', value: `${data.appointments.active} phiếu khám`, link: 'Xem lịch', green: true },
    { to: '/benh-nhan', label: 'Hồ sơ bệnh nhân', value: `${data.patients.total} hồ sơ`, link: 'Tra cứu' },
    { to: '/quan-tri/bai-viet', label: 'Bài viết', value: `${data.posts.published + data.posts.draft} bài viết`, link: 'Quản lý' },
    { to: '/quan-tri/tai-khoan', label: 'Tài khoản hệ thống', value: `${accounts} tài khoản`, link: 'Quản lý' },
  ];

  return (
    <>
      <NbPageHead eyebrow={fmtDateLong(data.date)} title="Tổng quan" lead="Quản trị viên có toàn quyền hệ thống, bao gồm tất cả chức năng của tiếp tân." />

      <div className="nb-tiles">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className={`nb-tile ${t.green ? 'nb-tile-green' : ''}`}>
            <span>{t.label}</span>
            <span>{t.value}</span>
            <span>{t.link}</span>
          </Link>
        ))}
      </div>

      <div className="nb-row" style={{ gap: 24, alignItems: 'flex-start' }}>
        <section className="nb-card nb-card-lg" style={{ flex: '999 1 460px', minWidth: 0, padding: '28px 32px' }} aria-labelledby="db-ghe">
          <div className="nb-between">
            <h2 id="db-ghe" className="nb-h2">
              Sơ đồ ghế theo khung giờ hôm nay
            </h2>
            <Link to="/hang-doi" className="nb-link">
              Mở hàng đợi
            </Link>
          </div>
          <SlotMap slotMap={data.queue.slotMap} waiting={data.queue.waiting} compact />
        </section>

        <section className="nb-card-gold" style={{ flex: '1 1 300px', borderRadius: 28, padding: 32 }} aria-labelledby="db-tat">
          <h2 id="db-tat" className="nb-h2">
            Lối tắt
          </h2>
          <Link to="/quan-tri/bai-viet/moi" className="nb-btn nb-btn-primary">
            <Icon name="plus" />
            Viết bài mới
          </Link>
          <Link to="/quan-tri/tai-khoan?them=1" className="nb-btn nb-btn-ghost">
            Thêm tài khoản
          </Link>
        </section>
      </div>

      <section className="nb-card nb-card-lg" style={{ padding: '28px 32px' }} aria-labelledby="db-nhap">
        <div className="nb-between">
          <h2 id="db-nhap" className="nb-h2">
            Bài viết bản nháp
          </h2>
          <Link to="/quan-tri/bai-viet" className="nb-link">
            Quản lý bài viết
          </Link>
        </div>
        {data.drafts.length === 0 && <p>Không có bài viết nào đang ở bản nháp.</p>}
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column' }}>
          {data.drafts.map((p) => (
            <li key={p.id} className="nb-row" style={{ gap: '8px 16px', padding: '14px 0', borderTop: '1px solid #E0D3BC' }}>
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                <p className="nb-strong" style={{ fontSize: 17 }}>
                  {p.title}
                </p>
                <p>
                  {p.categoryLabel} · lưu lần cuối {fmtDateTime(p.updatedAt)}
                </p>
              </div>
              <span className="nb-pill nb-pill-gold" style={{ padding: '4px 12px' }}>
                Bản nháp
              </span>
              <Link to={`/quan-tri/bai-viet/${p.id}`} className="nb-btn nb-btn-ghost" style={{ padding: '0 20px' }}>
                Sửa và công khai
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
