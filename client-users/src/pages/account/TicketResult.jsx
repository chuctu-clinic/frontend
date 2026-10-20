import { useParams } from 'react-router-dom';
import { ErrorAlert, Loading, PageHeader } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { RecordSheet } from '@chuctu/shared/components/RecordSheet.jsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { AccountShell } from './AccountShell.jsx';

/** Kết quả khám của một phiếu, chỉ có sau khi phòng khám ghi nhận (UC.6.8). */
export default function TicketResult() {
  const { id } = useParams();
  useDocumentTitle('Kết quả khám');
  const { data, loading, error } = useAsync(() => api.get(`/me/appointments/${id}/result`), [id]);

  return (
    <AccountShell crumbs={[{ to: '/phieu-kham', label: 'Phiếu khám bệnh' }, { to: `/phieu-kham/${id}`, label: 'Chi tiết' }, { label: 'Kết quả khám' }]}>
      <PageHeader title="Kết quả khám" />
      {loading && <Loading />}
      <ErrorAlert error={error} />
      {data?.record && <RecordSheet record={data.record} />}
    </AccountShell>
  );
}
