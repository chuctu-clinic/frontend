import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Loading } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { fmtDate, genderLabel, relationshipLabel } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { Crumbs } from '../../components/PublicLayout.tsx';
import { Spinner, UDialog, UError } from '../../components/uparts.tsx';
import { ProfileDialog } from './ProfileForm.tsx';
import type { Patient } from '@chuctu/shared/types.ts';

const EMPTY = 'Chưa cập nhật';

/** "0912345678" → "091****678" như prototype. */
export const maskPhone = (v: string | null | undefined) => (v && v.length >= 7 ? `${v.slice(0, 3)}****${v.slice(-3)}` : v || EMPTY);

export function RelTag({ p }: { p: Pick<Patient, 'relationship'> }) {
  const self = p.relationship === 'BAN_THAN';
  return (
    <span className="u-tag" style={self ? { background: '#e4efe2', color: '#2e5b37' } : undefined}>
      {self ? 'Chính tôi' : relationshipLabel(p.relationship) || 'Chưa khai quan hệ'}
    </span>
  );
}

/** Hồ sơ khám của bản thân và người thân, tối đa 10 hồ sơ (UC.1.6 – UC.1.8). */
export default function Profiles() {
  useDocumentTitle('Hồ sơ khám bệnh');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, loading, reload } = useAsync(() => api.get<{ items: Patient[]; max: number }>('/me/patients'), []);
  const [viewing, setViewing] = useState<Patient | null>(null);
  const [toDelete, setToDelete] = useState<Patient | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const items = data?.items || [];
  const max = data?.max || 10;
  const full = items.length >= max;
  // Hộp thoại thêm / sửa mở theo ?them=1 hoặc ?sua=<id> để đường dẫn cũ vẫn dùng được
  const editId = params.get('sua');
  const editing = editId ? items.find((p) => p.id === editId) : null;
  const adding = params.get('them') === '1' && !full;
  const closeForm = () => setParams({}, { replace: true });

  const doDelete = async () => {
    if (!toDelete) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.del<{ deleted?: boolean; detached?: boolean }>(`/me/patients/${toDelete.id}`);
      setNotice(res.detached ? `Đã xoá hồ sơ ${toDelete.fullName} khỏi tài khoản. Phòng khám vẫn giữ lịch sử khám của hồ sơ này.` : `Đã xoá hồ sơ ${toDelete.fullName}.`);
      setToDelete(null);
      setViewing(null);
      reload();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Crumbs items={[{ label: 'Hồ sơ khám bệnh' }]} />
      <section className="u-section">
        <div className="u-wrap">
          <div className="u-head">
            <div>
              <h1 className="u-h1">Hồ sơ khám bệnh</h1>
              <p className="u-lead">
                Danh sách người mà cô chú đã lập hồ sơ ở phòng khám. Bấm vào một hồ sơ để xem đầy đủ. Tối đa <strong className="u-ink">{max} hồ sơ</strong>.
              </p>
            </div>
            <button type="button" className="u-btn u-btn-primary u-btn-lg" disabled={full} onClick={() => setParams({ them: '1' })}>
              <Icon name="plus" />
              Thêm hồ sơ mới
            </button>
          </div>
          {params.get('moi') && (
            <p className="u-ok">
              <Icon name="checkCircle" />
              Tạo tài khoản thành công. Hồ sơ khám của cô chú đã có sẵn; cô chú có thể thêm hồ sơ cho người thân để đặt lịch giúp.
            </p>
          )}
          {notice && (
            <p className="u-ok" role="status">
              <Icon name="checkCircle" />
              {notice}
            </p>
          )}
          {data && (
            <p className="u-text u-muted" style={{ fontSize: 17 }}>
              Đang có <strong className="u-ink">{items.length} hồ sơ</strong> trên tổng số {max}.{full && ' Muốn thêm, cô chú xoá bớt hồ sơ không dùng nữa.'}
            </p>
          )}
          {loading && <Loading />}
          <div className="u-profiles">
            {items.map((p) => (
              <div key={p.id} className="u-pcard">
                <button type="button" className="u-pcard-body" style={{ background: 'transparent', border: 0, textAlign: 'left', font: 'inherit', cursor: 'pointer' }} onClick={() => setViewing(p)}>
                  <span className="u-pcard-name">
                    <span className="u-avatar-lg" aria-hidden="true">
                      <Icon name="userSoft" size={24} strokeWidth={1.75} />
                    </span>
                    <span>{p.fullName}</span>
                    <RelTag p={p} />
                  </span>
                  <span className="u-pcard-line">
                    <Icon name="calendar" size={20} />
                    <span>
                      Ngày sinh: <strong>{p.dob ? fmtDate(p.dob.slice(0, 10)) : p.birthYear || EMPTY}</strong>
                      {p.gender && ` · ${genderLabel(p.gender)}`}
                    </span>
                  </span>
                  <span className="u-pcard-line">
                    <Icon name="phone" size={20} />
                    <span>
                      Điện thoại: <strong>{maskPhone(p.phone)}</strong>
                    </span>
                  </span>
                  <span className="u-pcard-line">
                    <Icon name="pin" size={20} />
                    <span>
                      Địa chỉ: {p.address ? <strong>{p.address}</strong> : <em className="u-muted">{EMPTY}</em>}
                    </span>
                  </span>
                  <span className="u-pcard-line u-muted">
                    <Icon name="file" size={20} />
                    Mã bệnh nhân: {p.patientCode}
                  </span>
                  {p.isLocked && (
                    <span className="u-warn" style={{ padding: '12px 16px', fontSize: 17 }}>
                      <Icon name="lock" size={20} />
                      Hồ sơ đang bị phòng khám khoá: không đặt lịch và không sửa được. Lịch sử khám vẫn xem được.
                    </span>
                  )}
                </button>
                <div className="u-pcard-foot">
                  {p.relationship !== 'BAN_THAN' && (
                    <button type="button" className="danger" onClick={() => setToDelete(p)}>
                      <Icon name="trash" size={20} />
                      Xoá hồ sơ
                    </button>
                  )}
                  {!p.isLocked && (
                    <button type="button" onClick={() => setParams({ sua: p.id })}>
                      <Icon name="edit" size={20} />
                      Sửa hồ sơ
                    </button>
                  )}
                  <button type="button" onClick={() => setViewing(p)}>
                    <Icon name="eye" size={20} />
                    Chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(adding || editing) && (
        <ProfileDialog
          patient={editing}
          onClose={closeForm}
          onSaved={(saved) => {
            setNotice(editing ? `Đã lưu thay đổi hồ sơ ${saved.fullName}.` : `Đã thêm hồ sơ ${saved.fullName}.`);
            closeForm();
            reload({ silent: true });
          }}
        />
      )}

      {viewing && !toDelete && (
        <UDialog title="Chi tiết hồ sơ" onClose={() => setViewing(null)} width={680}>
          <dl className="u-dl" style={{ margin: 0 }}>
            {[
              ['Họ và tên', viewing.fullName],
              ['Quan hệ', viewing.relationship === 'BAN_THAN' ? 'Chính tôi' : relationshipLabel(viewing.relationship)],
              ['Mã bệnh nhân', viewing.patientCode],
              ['Ngày sinh', viewing.dob ? fmtDate(viewing.dob.slice(0, 10)) : viewing.birthYear ? String(viewing.birthYear) : null],
              ['Giới tính', genderLabel(viewing.gender)],
              ['Số điện thoại', viewing.phone],
              ['Địa chỉ', viewing.address],
              ['Ngày lập hồ sơ', fmtDate(viewing.createdAt)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd style={v ? undefined : { fontWeight: 500, fontStyle: 'italic', color: '#6b5e4e' }}>{v || EMPTY}</dd>
              </div>
            ))}
          </dl>
          <div className="u-actions">
            {viewing.relationship !== 'BAN_THAN' && (
              <button type="button" className="u-btn u-btn-danger back" onClick={() => setToDelete(viewing)}>
                <Icon name="trash" />
                Xoá hồ sơ
              </button>
            )}
            <button type="button" className="u-btn u-btn-ghost back" onClick={() => navigate(`/lich-su-kham?ho-so=${viewing.id}`)}>
              <Icon name="clipboard" />
              Lịch sử khám
            </button>
            {!viewing.isLocked && (
              <button
                type="button"
                className="u-btn u-btn-primary grow"
                onClick={() => {
                  setParams({ sua: viewing.id });
                  setViewing(null);
                }}
              >
                <Icon name="edit" />
                Sửa hồ sơ
              </button>
            )}
          </div>
        </UDialog>
      )}

      {toDelete && (
        <UDialog title="Xoá hồ sơ này?" tone="danger" onClose={() => setToDelete(null)}>
          <div className="u-check" style={{ cursor: 'default', flexDirection: 'column', gap: 2 }}>
            <strong style={{ fontSize: 21, lineHeight: '30px' }}>{toDelete.fullName}</strong>
            <span className="u-muted" style={{ fontSize: 17 }}>
              {relationshipLabel(toDelete.relationship) || 'Chưa khai quan hệ'} · Ngày sinh {toDelete.dob ? fmtDate(toDelete.dob.slice(0, 10)) : toDelete.birthYear || EMPTY}
            </span>
          </div>
          <p className="u-text">
            Hồ sơ này sẽ bị xoá khỏi danh sách và cô chú <strong className="u-ink">không chọn được khi đặt lịch nữa</strong>. Nếu hồ sơ đã từng khám, phòng khám vẫn giữ lịch sử khám.
          </p>
          <UError>{error?.message}</UError>
          <div className="u-actions">
            <button type="button" className="u-btn u-btn-danger-solid grow" disabled={pending} onClick={doDelete}>
              {pending ? <Spinner /> : <Icon name="trash" />}
              Xoá hồ sơ
            </button>
            <button type="button" className="u-btn u-btn-ghost back" onClick={() => setToDelete(null)}>
              Giữ lại
            </button>
          </div>
        </UDialog>
      )}
    </>
  );
}
