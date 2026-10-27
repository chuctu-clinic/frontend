import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon.jsx';
import { Loading } from '../../../shared/components/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { CLINIC, RELATIONSHIPS, fmtDate } from '../../../shared/lib/format.js';
import { useAsync, useDocumentTitle } from '../../../shared/lib/useAsync.js';
import { dobText } from './ProfileDialogs.jsx';
import '../auth/auth.css';
import './account.css';
import './records.css';

// Theo màn "Phiếu khám · Lịch sử khám" của prototype (LichSuKham.dc.html)

/** Tóm tắt một lượt khám cho thẻ trong danh sách: chẩn đoán, rồi các ghi chú điều trị. */
function summary(r) {
  const n = r.treatmentNotes || {};
  return [r.diagnosis, n.acupuncture, n.acupressure, n.other].filter(Boolean).join(' ') || 'Phòng khám đã ghi nhận kết quả khám.';
}

/** Lịch sử khám/điều trị của bản thân và người thân, xem theo từng hồ sơ (UC.6.9). */
export default function History() {
  useDocumentTitle('Lịch sử khám');
  const [params, setParams] = useSearchParams();
  const profiles = useAsync(() => api.get('/me/patients'), []);
  const history = useAsync(() => api.get('/me/history'), []);

  const list = profiles.data?.items || [];
  const records = history.data?.items || [];
  const countFor = (id) => records.filter((r) => r.patientId === id).length;
  // Mặc định xem hồ sơ chính chủ
  const selectedId = params.get('ho-so') || list.find((p) => p.relationship === 'BAN_THAN')?.id || list[0]?.id;
  const current = list.find((p) => p.id === selectedId);
  const visits = records.filter((r) => r.patientId === selectedId);

  return (
    <div className="k-page a-vars">
      <section className="k-titleband">
        <div className="k-wrap" style={{ gap: 0 }}>
          <h1>Lịch sử khám</h1>
          <p className="k-hero-p">
            Các lượt khám và điều trị trước đây của cô chú và của người thân đã tạo hồ sơ trong tài khoản này. Chỉ cô chú xem được phần này.
          </p>
        </div>
      </section>

      <section className="k-main">
        <div className="k-wrap">
          {(profiles.loading || history.loading) && <Loading />}

          {profiles.data && history.data && (
            <>
              <div className="r-picker" role="group" aria-labelledby="ls-chon">
                <span id="ls-chon">Xem lịch sử khám của</span>
                <div className="r-chips">
                  {list.map((p) => (
                    <button key={p.id} type="button" className="r-chip r-chip-lg" aria-pressed={p.id === selectedId} onClick={() => setParams({ 'ho-so': p.id })}>
                      {p.fullName}
                      <span className="r-rel">{RELATIONSHIPS[p.relationship] || 'Khác'}</span>
                      <span className="r-count" aria-label={`${countFor(p.id)} lượt khám`}>
                        {countFor(p.id)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {current && (
                <div className="k-wrap" style={{ gap: 18, width: '100%' }}>
                  <div className="r-who">
                    <h2>{current.fullName}</h2>
                    <p>
                      Hồ sơ {current.patientCode}
                      {dobText(current) && ` · Sinh ngày ${dobText(current)}`}
                    </p>
                    <div className="h-rule" aria-hidden="true" />
                  </div>

                  {visits.map((r) => {
                    const [, m, d] = r.visitDate.split('-');
                    return (
                      <div key={r.id} className="r-visit">
                        <div className="r-day" aria-label={`Ngày ${fmtDate(r.visitDate)}`}>
                          <span>Th.{m}</span>
                          <span>{Number(d)}</span>
                        </div>
                        <div>
                          <h3>{r.appointment?.serviceLabel || 'Khám bệnh'}</h3>
                          <p>{summary(r)}</p>
                        </div>
                        <Link to={`/phieu-kham/${r.appointmentId}/ket-qua`} className="a-btn-ghost" aria-label={`Xem kết quả khám ngày ${fmtDate(r.visitDate)}`}>
                          Xem kết quả
                          <Icon name="arrowRight" size={22} strokeWidth={1.75} />
                        </Link>
                      </div>
                    );
                  })}

                  {visits.length === 0 && (
                    <div className="r-none">
                      <h3>Chưa có lượt khám nào</h3>
                      <p>Hồ sơ của {current.fullName} chưa có lượt khám nào ở phòng khám. Sau khi khám xong, kết quả sẽ hiện ở đây.</p>
                      <Link to="/dat-lich" className="a-btn-primary">
                        Đặt lịch khám
                      </Link>
                    </div>
                  )}

                  <p className="r-note">
                    Chỉ các lượt khám thuộc hồ sơ trong tài khoản của cô chú mới hiện ở đây. Thấy thiếu hoặc sai, cô chú báo cho phòng khám qua số{' '}
                    <a href={CLINIC.phoneHref}>{CLINIC.phone}</a>.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
