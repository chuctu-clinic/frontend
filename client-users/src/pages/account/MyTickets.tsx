import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Loading } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { fmtDateLong, shortTime } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { Crumbs } from '../../components/PublicLayout.tsx';
import { UError } from '../../components/uparts.tsx';
import { USER_STATUS, statusGroup } from './Ticket.tsx';
import type { Appointment } from '@chuctu/shared/types.ts';

const TABS = [
  { id: '', label: 'Tất cả phiếu khám' },
  { id: 'dat', label: 'Đã đặt' },
  { id: 'xong', label: 'Đã khám' },
  { id: 'huy', label: 'Đã huỷ' },
] as const;

/** Phiếu khám của tôi và người thân, lọc theo trạng thái (UC.6.4). */
export default function MyTickets() {
  useDocumentTitle('Phiếu khám bệnh');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('loc') || '';
  const { data, loading, error } = useAsync(() => api.get<{ items: Appointment[] }>('/me/appointments'), []);
  const all = data?.items || [];
  const count = (id: string) => (id ? all.filter((a) => statusGroup(a.status) === id).length : all.length);
  const items = tab ? all.filter((a) => statusGroup(a.status) === tab) : all;

  return (
    <>
      <Crumbs items={[{ label: 'Phiếu khám bệnh' }]} />
      <section className="u-section">
        <div className="u-wrap">
          <div className="u-head">
            <div>
              <h1 className="u-h1">Phiếu khám bệnh</h1>
              <p className="u-lead">Tất cả phiếu khám của cô chú và người thân. Bấm vào một phiếu khám để xem chi tiết.</p>
            </div>
            <Link to="/dat-lich" className="u-btn u-btn-primary u-btn-lg">
              <Icon name="calendarPlus" />
              Đặt lịch khám mới
            </Link>
          </div>
          <div className="u-tabs" role="group" aria-label="Lọc phiếu khám">
            {TABS.map((t) => (
              <button key={t.id} type="button" className="u-tab" aria-pressed={tab === t.id} onClick={() => setParams(t.id ? { loc: t.id } : {}, { replace: true })}>
                {t.label}
                <span className="u-tab-n">{count(t.id)}</span>
              </button>
            ))}
          </div>
          {loading && <Loading />}
          <UError>{error?.message}</UError>
          {data && items.length === 0 && (
            <div className="u-empty">
              <span className="u-empty-ic">
                <Icon name="ticket" size={44} strokeWidth={1.75} />
              </span>
              <p className="u-text u-ink" style={{ fontSize: 20, fontWeight: 600 }}>
                Chưa có phiếu khám nào ở mục này
              </p>
              <p className="u-text">Cô chú thử chọn mục khác, hoặc đặt một lịch khám mới.</p>
            </div>
          )}
          <div className="u-stack">
            {items.map((a) => {
              const g = statusGroup(a.status);
              return (
                <Link key={a.id} to={`/phieu-kham/${a.id}`} className="u-tcard" aria-label={`Phiếu khám ${a.ticketCode} của ${a.patient?.fullName}, ${USER_STATUS[g]}`}>
                  <span className="u-tcard-top">
                    <span>
                      <span className="u-muted" style={{ fontSize: 16 }}>
                        Mã phiếu khám: <strong className="u-ink" style={{ letterSpacing: '0.04em' }}>{a.ticketCode}</strong>
                      </span>
                      <span className="u-tcard-name">{a.patient?.fullName}</span>
                    </span>
                    <span className={`u-chip u-chip-${g}`} style={{ fontSize: 17, padding: '8px 18px' }}>
                      {USER_STATUS[g]}
                    </span>
                  </span>
                  <span className="u-dash" />
                  <span className="u-stack" style={{ gap: 12 }}>
                    <span className="u-tcard-clinic">
                      <Icon name="pin" size={22} />
                      PHÒNG KHÁM CHÚC TỪ
                    </span>
                    <span className="u-tcard-row">
                      <span>Khám về:</span>
                      <span>{a.serviceLabel}</span>
                    </span>
                    <span className="u-tcard-row">
                      <span>Giờ khám dự kiến:</span>
                      <span>
                        {fmtDateLong(a.slotDate)} · {shortTime(a.slotStart)}
                      </span>
                    </span>
                  </span>
                  <span className="u-tcard-foot">
                    {g === 'huy' && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="u-btn u-btn-primary u-btn-md"
                        style={{ minHeight: 48, fontSize: 17 }}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/dat-lich?dat-lai=${a.id}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/dat-lich?dat-lai=${a.id}`);
                          }
                        }}
                      >
                        <Icon name="refresh" size={20} />
                        Đặt lại
                      </span>
                    )}
                    {a.hasResult && (
                      <span className="u-tag" style={{ background: '#e4efe2', color: '#2e5b37' }}>
                        Đã có kết quả
                      </span>
                    )}
                    <span className="u-tcard-more">
                      Xem chi tiết phiếu khám
                      <Icon name="arrowRight" size={20} />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
