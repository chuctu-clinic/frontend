import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon.jsx';
import { ErrorAlert, Loading } from '../../../shared/components/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { fmtDate } from '../../../shared/lib/format.js';
import { useAsync, useDocumentTitle } from '../../../shared/lib/useAsync.js';
import { ResultSheet } from './ResultSheet.jsx';
import '../auth/auth.css';
import './account.css';
import './records.css';

// Theo màn "Phiếu khám · Kết quả khám" của prototype (KetQuaKham.dc.html)

/** Kết quả khám của một phiếu, chỉ có sau khi phòng khám ghi nhận (UC.6.8). */
export default function TicketResult() {
  const { id } = useParams();
  useDocumentTitle('Kết quả khám');
  const { data, loading, error } = useAsync(() => api.get(`/me/appointments/${id}/result`), [id]);
  const record = data?.record;

  return (
    <div className="k-page a-vars">
      <section className="k-titleband">
        <div className="k-wrap" style={{ gap: 0 }}>
          <h1>Kết quả khám</h1>
          <p className="k-hero-p">
            {record
              ? `Kết quả khám ngày ${fmtDate(record.visitDate)} của ${record.patient?.fullName} (hồ sơ ${record.patient?.patientCode}). Chỉ cô chú xem được phần này.`
              : 'Kết quả do phòng khám ghi nhận sau buổi khám. Chỉ cô chú xem được phần này.'}
          </p>
        </div>
      </section>

      <section className="k-main">
        <div className="k-wrap">
          <nav aria-label="Quay lại" style={{ display: 'flex' }}>
            <Link to={record ? `/lich-su-kham?ho-so=${record.patientId}` : '/lich-su-kham'} className="r-back">
              <Icon name="arrowLeft" size={22} strokeWidth={1.75} />
              Lịch sử khám
            </Link>
          </nav>
          {loading && <Loading />}
          <ErrorAlert error={error} />
          {record && (
            <>
              <ResultSheet record={record} />
              <div className="r-actions">
                <button type="button" className="a-btn-ghost" onClick={() => window.print()}>
                  <Icon name="file" strokeWidth={1.75} />
                  In kết quả khám
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
