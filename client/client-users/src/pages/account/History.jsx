import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { Empty, Loading, PageHeader, SelectInput } from '@chuctu/shared/components/ui.jsx';
import { api, qs } from '@chuctu/shared/lib/api.js';
import { fmtDateLong } from '@chuctu/shared/lib/format.js';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { AccountShell } from './AccountShell.jsx';

/** Lịch sử khám/điều trị của bản thân và người thân (UC.6.9). */
export default function History() {
  useDocumentTitle('Lịch sử khám');
  const [params, setParams] = useSearchParams();
  const patientId = params.get('ho-so') || '';
  const profiles = useAsync(() => api.get('/me/patients'), []);
  const { data, loading } = useAsync(() => api.get(`/me/history${qs({ patientId })}`), [patientId]);

  return (
    <AccountShell crumbs={[{ label: 'Lịch sử khám' }]}>
      <PageHeader title="Lịch sử khám" subtitle="Các lần khám và điều trị đã được phòng khám ghi nhận." />
      {profiles.data && (
        <div style={{ maxWidth: 420 }}>
          <SelectInput
            label="Xem lịch sử của"
            options={[{ value: '', label: 'Tất cả hồ sơ' }, ...profiles.data.items.map((p) => ({ value: p.id, label: p.fullName }))]}
            value={patientId}
            onChange={(e) => setParams(e.target.value ? { 'ho-so': e.target.value } : {})}
          />
        </div>
      )}
      {loading && <Loading />}
      {data && data.items.length === 0 && <Empty icon="clipboard" title="Chưa có lần khám nào được ghi nhận" />}
      <ol className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {data?.items.map((r) => (
          <li key={r.id}>
            <Link to={`/phieu-kham/${r.appointmentId}/ket-qua`} className="card card-link row-between">
              <div className="stack-sm" style={{ gap: 4 }}>
                <p style={{ fontWeight: 700, color: 'var(--ink-900)' }}>{fmtDateLong(r.visitDate)}</p>
                <p>
                  <strong>{r.patient?.fullName}</strong> · {r.appointment?.serviceLabel}
                </p>
                <p className="small">Chẩn đoán: {r.diagnosis || '—'}</p>
              </div>
              <span className="row" style={{ gap: 6, color: 'var(--green-700)', fontWeight: 600 }}>
                Xem kết quả <Icon name="chevronRight" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </AccountShell>
  );
}
