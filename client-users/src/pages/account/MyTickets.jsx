import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { ButtonLink, Empty, Loading, PageHeader, StatusBadge } from '@chuctu/shared/components/ui.jsx';
import { api, qs } from '@chuctu/shared/lib/api.js';
import { fmtDateLong, slotLabel } from '@chuctu/shared/lib/format.js';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { AccountShell } from './AccountShell.jsx';

const FILTERS = [
  ['', 'Tất cả'],
  ['BOOKED', 'Đã đặt lịch'],
  ['COMPLETED', 'Đã hoàn thành'],
  ['CANCELLED', 'Đã huỷ'],
];

/** Phiếu khám của tôi và người thân, lọc theo trạng thái (UC.6.4). */
export default function MyTickets() {
  useDocumentTitle('Phiếu khám bệnh');
  const [params, setParams] = useSearchParams();
  const status = params.get('trang-thai') || '';
  const { data, loading } = useAsync(() => api.get(`/me/appointments${qs({ status })}`), [status]);

  return (
    <AccountShell crumbs={[{ label: 'Phiếu khám bệnh' }]}>
      <PageHeader title="Phiếu khám bệnh" subtitle="Phiếu khám của cô chú và người thân." />
      <div className="tabs" role="group" aria-label="Lọc theo trạng thái">
        {FILTERS.map(([value, label]) => (
          <button key={value} type="button" className="tab" aria-pressed={status === value} onClick={() => setParams(value ? { 'trang-thai': value } : {})}>
            {label}
          </button>
        ))}
      </div>
      {loading && <Loading />}
      {data && data.items.length === 0 && (
        <Empty icon="ticket" title="Chưa có phiếu khám nào" action={<ButtonLink to="/dat-lich" icon="calendar">Đặt lịch khám</ButtonLink>}>
          Đặt lịch xong, phiếu khám sẽ hiện ở đây.
        </Empty>
      )}
      <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {data?.items.map((a) => (
          <li key={a.id}>
            <Link to={`/phieu-kham/${a.id}`} className="card card-link row-between">
              <div className="stack-sm" style={{ gap: 4 }}>
                <p className="mono" style={{ fontWeight: 700, color: 'var(--ink-900)', fontSize: 20 }}>
                  {a.ticketCode}
                </p>
                <p>
                  <strong>{a.patient?.fullName}</strong> · {a.serviceLabel}
                </p>
                <p className="small muted row" style={{ gap: 6 }}>
                  <Icon name="calendar" size={20} />
                  {fmtDateLong(a.slotDate)} · {slotLabel(a.slotStart)}
                </p>
              </div>
              <div className="row">
                {a.hasResult && (
                  <span className="badge badge-blue">
                    <Icon name="clipboard" size={18} />
                    Có kết quả
                  </span>
                )}
                <StatusBadge status={a.status} forUser />
                <Icon name="chevronRight" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </AccountShell>
  );
}
