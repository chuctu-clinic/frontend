import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Alert, Badge, Button, ButtonLink, ErrorAlert, Loading, Modal, PageHeader } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { ageFrom, relationshipLabel, genderLabel } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { AccountShell } from './AccountShell.tsx';
import type { Patient } from '@chuctu/shared/types.ts';

/** Hồ sơ khám của bản thân và người thân, tối đa 10 hồ sơ (UC.1.6, UC.1.8). */
export default function Profiles() {
  useDocumentTitle('Hồ sơ khám bệnh');
  const [params] = useSearchParams();
  const { data, loading, reload } = useAsync(() => api.get<{ items: Patient[]; max: number }>('/me/patients'), []);
  const [toDelete, setToDelete] = useState<Patient | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const full = data && data.items.length >= data.max;

  const doDelete = async () => {
    if (!toDelete) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.del<{ deleted?: boolean; detached?: boolean }>(`/me/patients/${toDelete.id}`);
      setNotice(
        res.detached
          ? `Đã xoá hồ sơ ${toDelete.fullName} khỏi tài khoản. Phòng khám vẫn giữ lịch sử khám của hồ sơ này.`
          : `Đã xoá hồ sơ ${toDelete.fullName}.`,
      );
      setToDelete(null);
      reload();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  return (
    <AccountShell crumbs={[{ label: 'Hồ sơ khám bệnh' }]}>
      <PageHeader
        title="Hồ sơ khám bệnh"
        subtitle={data ? `Hồ sơ của cô chú và người thân: ${data.items.length}/${data.max} hồ sơ.` : null}
        actions={
          <ButtonLink to="/tai-khoan/ho-so/moi" icon="plus" aria-disabled={full || undefined} onClick={(e) => full && e.preventDefault()}>
            Thêm hồ sơ người thân
          </ButtonLink>
        }
      />
      {params.get('moi') && <Alert type="success" title="Tạo tài khoản thành công">Hồ sơ khám của cô chú đã có sẵn. Cô chú có thể thêm hồ sơ cho người thân để đặt lịch giúp.</Alert>}
      {notice && <Alert type="success">{notice}</Alert>}
      {full && <Alert type="info">Tài khoản đã đủ {data.max} hồ sơ. Muốn thêm, cô chú xoá bớt hồ sơ không dùng nữa.</Alert>}
      {loading && <Loading />}
      <div className="grid-2">
        {data?.items.map((p) => (
          <div key={p.id} className="card stack-sm">
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <div className="stack-sm" style={{ gap: 4 }}>
                <h3>{p.fullName}</h3>
                <p className="caption mono">{p.patientCode}</p>
              </div>
              <Badge tone={p.relationship === 'BAN_THAN' ? 'green' : 'gold'}>{relationshipLabel(p.relationship) || 'Chưa khai quan hệ'}</Badge>
            </div>
            <p className="small">
              {[genderLabel(p.gender), p.birthYear && `${ageFrom(p.birthYear)} tuổi (sinh năm ${p.birthYear})`, p.phone].filter(Boolean).join(' · ')}
            </p>
            {p.isLocked && (
              <Alert type="warning">
                Hồ sơ đang bị phòng khám khoá: không đặt lịch và không sửa được. Lịch sử khám vẫn xem được.
              </Alert>
            )}
            <div className="row">
              {!p.isLocked && (
                <Link to={`/tai-khoan/ho-so/${p.id}`} className="btn btn-secondary btn-sm">
                  <Icon name="edit" size={20} />
                  Sửa
                </Link>
              )}
              <Link to={`/lich-su-kham?ho-so=${p.id}`} className="btn btn-ghost btn-sm">
                Lịch sử khám
              </Link>
              {p.relationship !== 'BAN_THAN' && (
                <Button variant="ghost" size="sm" icon="trash" onClick={() => setToDelete(p)} style={{ color: 'var(--alert-700)' }}>
                  Xoá
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      {toDelete && (
        <Modal
          title={`Xoá hồ sơ ${toDelete.fullName}?`}
          onClose={() => setToDelete(null)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setToDelete(null)}>
                Không xoá
              </Button>
              <Button variant="danger-solid" icon="trash" loading={pending} onClick={doDelete}>
                Xoá hồ sơ
              </Button>
            </>
          }
        >
          <div className="stack-sm">
            <p>Sau khi xoá, cô chú không chọn được hồ sơ này khi đặt lịch nữa. Nếu hồ sơ đã từng khám, phòng khám vẫn giữ lịch sử khám.</p>
            <ErrorAlert error={error} />
          </div>
        </Modal>
      )}
    </AccountShell>
  );
}
