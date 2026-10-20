import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Loading } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { fmtDateLong, shortTime } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { Crumbs } from '../../components/PublicLayout.tsx';
import { FlowHead, Spinner, UDialog, UError } from '../../components/uparts.tsx';
import { Ticket, statusGroup } from './Ticket.tsx';
import type { Appointment } from '@chuctu/shared/types.ts';

const REASONS = ['Bận việc đột xuất', 'Sức khoẻ không đi được', 'Đã khám ở nơi khác', 'Muốn đổi sang ngày giờ khác', 'Lý do khác'];

/** Chi tiết phiếu, huỷ phiếu (UC.6.6) và đặt lại phiếu đã huỷ (UC.6.7). Ngay sau khi đặt lịch là bước 4 "Phiếu khám". */
export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const justBooked = params.get('moi') === '1';
  useDocumentTitle(justBooked ? 'Phiếu khám' : 'Chi tiết phiếu khám');
  const { data, loading, error, setData } = useAsync(() => api.get<{ appointment: Appointment }>(`/me/appointments/${id}`), [id]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [cancelError, setCancelError] = useState<ApiError | null>(null);

  const appt = data?.appointment;
  const g = appt ? statusGroup(appt.status) : 'dat';

  const doCancel = async () => {
    setPending(true);
    setCancelError(null);
    try {
      const res = await api.post<{ appointment: Appointment }>(`/me/appointments/${id}/cancel`, { reason });
      setData({ appointment: { ...res.appointment, hasResult: false } });
      setCancelOpen(false);
    } catch (err) {
      setCancelError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Crumbs items={justBooked ? [{ label: 'Đặt lịch khám', to: '/dat-lich' }, { label: 'Phiếu khám' }] : [{ to: '/phieu-kham', label: 'Phiếu khám bệnh' }, { label: 'Chi tiết phiếu khám' }]} />
      <section className="u-section" style={{ paddingTop: 32 }}>
        <div className="u-wrap" style={{ maxWidth: 880 }}>
          <div className="u-flow">
            <FlowHead
              title={justBooked ? 'Phiếu khám' : 'Chi tiết phiếu khám'}
              step={justBooked ? 4 : undefined}
              backLabel="Quay lại danh sách phiếu khám"
              onBack={() => navigate('/phieu-kham')}
            />
            <div className="u-flow-body" style={{ gap: 24 }}>
              {loading && <Loading />}
              <UError>{error?.message}</UError>
              {appt && (
                <>
                  {justBooked && g === 'dat' && (
                    <div className="u-state ok">
                      <span className="u-state-ic" style={{ color: '#2e5b37' }}>
                        <Icon name="checkCircle" />
                      </span>
                      <div>
                        <p className="u-state-t u-green">Đặt lịch thành công — cô chú đã có phiếu khám</p>
                        <p className="u-text">Ngày khám, cô chú đưa phiếu khám này cho tiếp tân để check-in là xong. Không cần in, mở trên điện thoại cũng được.</p>
                      </div>
                    </div>
                  )}
                  {g === 'xong' && (
                    <div className="u-state ok">
                      <span className="u-state-ic" style={{ color: '#2e5b37' }}>
                        <Icon name="checkCircle" />
                      </span>
                      <div className="u-stack" style={{ gap: 12 }}>
                        <div>
                          <p className="u-state-t u-green">Buổi khám đã hoàn thành</p>
                          <p className="u-text">{appt.hasResult ? 'Cô chú xem kết quả buổi khám này ở trang kết quả.' : 'Phòng khám đang ghi nhận kết quả, cô chú quay lại xem sau nhé.'}</p>
                        </div>
                        {appt.hasResult && (
                          <Link to={`/phieu-kham/${appt.id}/ket-qua`} className="u-btn u-btn-primary" style={{ alignSelf: 'flex-start' }}>
                            <Icon name="clipboard" />
                            Xem kết quả khám
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                  {g === 'huy' && (
                    <div className="u-state bad">
                      <span className="u-state-ic" style={{ color: '#90372a' }}>
                        <Icon name="x" />
                      </span>
                      <div className="u-stack" style={{ gap: 12 }}>
                        <div>
                          <p className="u-state-t" style={{ color: '#90372a' }}>
                            Buổi khám đã được huỷ
                          </p>
                          <p className="u-text">Phiếu khám này không còn giá trị. Cô chú có thể đặt lại một buổi khám khác bất cứ lúc nào.</p>
                        </div>
                        <div className="u-row" style={{ gap: 12 }}>
                          <Link to={`/dat-lich?dat-lai=${appt.id}`} className="u-btn u-btn-primary">
                            <Icon name="refresh" />
                            Đặt lại buổi khám này
                          </Link>
                          <Link to="/dat-lich" className="u-btn u-btn-ghost">
                            Đặt lịch khám mới
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                  <Ticket appt={appt} />
                  {g === 'dat' && (
                    <>
                      <div className="u-row" style={{ gap: 14 }}>
                        <button type="button" className="u-btn u-btn-primary" onClick={() => window.print()}>
                          <Icon name="file" />
                          In phiếu khám
                        </button>
                        <Link to="/lien-he" className="u-btn u-btn-ghost">
                          <Icon name="pin" />
                          Xem đường đi
                        </Link>
                        <button type="button" className="u-btn u-btn-danger" style={{ marginLeft: 'auto' }} onClick={() => setCancelOpen(true)}>
                          <Icon name="x" />
                          Huỷ khám
                        </button>
                      </div>
                      <div className="u-arrive">
                        <span className="u-state-ic" style={{ width: 52, height: 52, color: '#8a6012' }}>
                          <Icon name="infoSoft" />
                        </span>
                        <div>
                          <h2 className="u-h3">Khi đến phòng khám</h2>
                          <ul>
                            <li>
                              <Icon name="check" size={20} />
                              Cô chú đưa mã phiếu khám cho tiếp tân để check-in.
                            </li>
                            <li>
                              <Icon name="check" size={20} />
                              Mang theo giấy tờ tuỳ thân và hồ sơ bệnh cũ nếu có.
                            </li>
                            <li>
                              <Icon name="check" size={20} />
                              <span>
                                Không đến được thì bấm <strong style={{ color: '#90372a' }}>Huỷ khám.</strong>
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {cancelOpen && appt && (
        <UDialog
          title="Cô chú muốn huỷ buổi khám này?"
          sub="Huỷ rồi thì phiếu khám này không dùng được nữa. Cô chú vẫn có thể đặt lại buổi khác sau."
          tone="red"
          width={640}
          onClose={() => setCancelOpen(false)}
        >
          <div className="u-check" style={{ cursor: 'default', flexDirection: 'column', gap: 10 }}>
            <span className="u-row" style={{ gap: 12 }}>
              <Icon name="calendar" size={22} />
              <span>
                <strong>{fmtDateLong(appt.slotDate)}</strong> · giờ khám dự kiến {shortTime(appt.slotStart)}
              </span>
            </span>
            <span className="u-row" style={{ gap: 12 }}>
              <Icon name="user" size={22} />
              {appt.patient?.fullName} · {appt.serviceLabel}
            </span>
            <span className="u-row" style={{ gap: 12 }}>
              <Icon name="ticket" size={22} />
              <span>
                Mã phiếu khám <strong>{appt.ticketCode}</strong>
              </span>
            </span>
          </div>
          <div className="u-field">
            <label className="u-label" htmlFor="ly-do-huy" style={{ fontSize: 18 }}>
              Lý do huỷ <span className="u-opt">(không bắt buộc)</span>
            </label>
            <select id="ly-do-huy" className="u-select u-select-md" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">— Chọn lý do —</option>
              {REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <p className="u-hint">Phòng khám chỉ dùng thông tin này để sắp lịch tốt hơn cho lần sau.</p>
          </div>
          <UError>{cancelError?.message}</UError>
          <div className="u-actions">
            <button type="button" className="u-btn u-btn-ghost u-btn-lg grow" onClick={() => setCancelOpen(false)}>
              Không, giữ lịch
            </button>
            <button type="button" className="u-btn u-btn-danger-solid u-btn-lg back" style={{ flexBasis: 240 }} disabled={pending} onClick={doCancel}>
              {pending ? <Spinner /> : <Icon name="x" />}
              Đồng ý huỷ khám
            </button>
          </div>
        </UDialog>
      )}
    </>
  );
}
