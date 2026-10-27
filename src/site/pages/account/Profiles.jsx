import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon.jsx';
import { Loading } from '../../../shared/components/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { GENDERS } from '../../../shared/lib/format.js';
import { useAsync, useDocumentTitle } from '../../../shared/lib/useAsync.js';
import { EMPTY_TEXT, ProfileDeleteDialog, ProfileDetailDialog, ProfileFormDialog, dobText, maskPhone, relationLabel } from './ProfileDialogs.jsx';
import './account.css';

// Theo màn "Tài khoản · Hồ sơ khám bệnh" của prototype (HoSoKhamBenh.dc.html)

/** Thẻ hồ sơ: tên, quan hệ, ngày sinh, điện thoại, địa chỉ, mã bệnh nhân. */
export function ProfileLines({ p }) {
  return (
    <span className="k-lines">
      <span className="k-line">
        <Icon name="calendar" size={20} strokeWidth={1.75} />
        <span>
          Ngày sinh: {dobText(p) ? <strong>{dobText(p)}</strong> : <span className="k-empty">{EMPTY_TEXT}</span>}
          {p.gender && ` · ${GENDERS[p.gender]}`}
        </span>
      </span>
      <span className="k-line">
        <Icon name="phone" size={20} strokeWidth={1.75} />
        <span>Điện thoại: {p.phone ? <strong>{maskPhone(p.phone)}</strong> : <span className="k-empty">{EMPTY_TEXT}</span>}</span>
      </span>
      <span className="k-line">
        <Icon name="pin" size={20} strokeWidth={1.75} />
        <span style={{ minWidth: 0 }}>Địa chỉ: {p.address ? <strong>{p.address}</strong> : <span className="k-empty">{EMPTY_TEXT}</span>}</span>
      </span>
    </span>
  );
}

export function ProfileChip({ p }) {
  return <span className={`k-chip ${p.relationship === 'BAN_THAN' ? 'k-chip-green' : ''}`}>{relationLabel(p)}</span>;
}

/** Hồ sơ khám của bản thân và người thân, tối đa 10 hồ sơ (UC.1.6 – UC.1.8). */
export default function Profiles() {
  useDocumentTitle('Hồ sơ khám bệnh');
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data, loading, reload } = useAsync(() => api.get('/me/patients'), []);
  const [notice, setNotice] = useState(params.get('moi') ? 'Tạo tài khoản thành công. Hồ sơ khám của cô chú đã có sẵn, cô chú có thể thêm hồ sơ cho người thân để đặt lịch giúp.' : null);
  // Hộp thoại đang mở: { type: 'form' | 'detail' | 'delete', profile }
  // /tai-khoan/ho-so/moi và /tai-khoan/ho-so/:id mở sẵn hộp thoại thêm / sửa
  const [dialog, setDialog] = useState(() => (id ? { type: 'form', id } : null));
  const items = data?.items || [];
  const max = data?.max || 10;
  const full = items.length >= max;

  const open = (type, profile = null) => setDialog({ type, profile });
  const close = () => {
    setDialog(null);
    if (id) navigate('/tai-khoan/ho-so', { replace: true });
  };

  // Hồ sơ mở từ đường dẫn: chờ danh sách tải xong
  const current = dialog?.id && dialog.id !== 'moi' ? items.find((p) => p.id === dialog.id) : dialog?.profile;
  if (dialog?.id && dialog.id !== 'moi' && data && !current) setDialog(null);

  const saved = (patient) => {
    setNotice(current ? `Đã lưu thay đổi hồ sơ ${patient.fullName}.` : `Đã thêm hồ sơ ${patient.fullName}.`);
    close();
    reload({ silent: true });
  };
  const deleted = (res) => {
    const name = current.fullName;
    setNotice(res.detached ? `Đã xoá hồ sơ ${name} khỏi tài khoản. Phòng khám vẫn giữ lịch sử khám của hồ sơ này.` : `Đã xoá hồ sơ ${name}.`);
    close();
    reload({ silent: true });
  };

  return (
    <div className="k-page a-vars">
      <div className="k-crumbs">
        <nav aria-label="Đường dẫn">
          <Link to="/">Trang chủ</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Hồ sơ khám bệnh</span>
        </nav>
      </div>

      <section className="k-main">
        <div className="k-wrap">
          <div className="k-head-row">
            <div>
              <h1 className="k-h1">Hồ sơ khám bệnh</h1>
              <p className="k-lead">
                Danh sách người mà cô chú đã lập hồ sơ ở phòng khám. Bấm vào một hồ sơ để xem đầy đủ. Tối đa <strong>{max} hồ sơ</strong>.
              </p>
            </div>
            <button type="button" className="a-btn-primary k-btn" onClick={() => open('form')} disabled={full} title={full ? 'Đã đủ số hồ sơ tối đa' : undefined}>
              <Icon name="userPlus" strokeWidth={1.75} />
              Thêm hồ sơ mới
            </button>
          </div>

          {notice && (
            <div className="k-success" role="status">
              <Icon name="checkCircle" size={28} />
              {notice}
            </div>
          )}

          {data && (
            <p className="k-muted">
              Đang có <strong>{items.length} hồ sơ</strong> trên tổng số {max}.
              {full && ' Muốn thêm, cô chú xoá bớt hồ sơ không dùng nữa.'}
            </p>
          )}
          {loading && <Loading />}

          <div className="k-grid2">
            {items.map((p) => (
              <div key={p.id} className="k-pcard">
                <button type="button" className="k-pcard-main" onClick={() => open('detail', p)} aria-label={`Xem chi tiết hồ sơ ${p.fullName}`}>
                  <span className="k-pcard-title">
                    <span className="k-avatar">
                      <Icon name="user" strokeWidth={1.75} />
                    </span>
                    <span className="k-pname">{p.fullName}</span>
                    <ProfileChip p={p} />
                    {p.isLocked && (
                      <span className="k-chip k-chip-lock">
                        <Icon name="lock" size={16} />
                        Đang khoá
                      </span>
                    )}
                  </span>
                  <ProfileLines p={p} />
                  <span className="k-line k-line-muted">
                    <Icon name="clipboard" size={20} strokeWidth={1.75} />
                    Mã bệnh nhân: {p.patientCode}
                  </span>
                </button>
                <div className="k-pcard-actions">
                  {p.relationship !== 'BAN_THAN' && (
                    <button type="button" className="k-act-del" onClick={() => open('delete', p)}>
                      <Icon name="trash" size={22} strokeWidth={1.75} />
                      Xoá hồ sơ
                    </button>
                  )}
                  {!p.isLocked && (
                    <button type="button" className="k-act-edit" onClick={() => open('form', p)}>
                      <Icon name="edit" size={22} strokeWidth={1.75} />
                      Sửa hồ sơ
                    </button>
                  )}
                  <button type="button" onClick={() => open('detail', p)}>
                    <Icon name="eye" size={22} strokeWidth={1.75} />
                    Chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {dialog?.type === 'form' && (dialog.id === 'moi' || !dialog.id || current) && <ProfileFormDialog profile={current} onClose={close} onSaved={saved} />}
      {dialog?.type === 'detail' && (
        <ProfileDetailDialog profile={current} onClose={close} onEdit={() => open('form', current)} onDelete={() => open('delete', current)} />
      )}
      {dialog?.type === 'delete' && <ProfileDeleteDialog profile={current} onClose={close} onDeleted={deleted} />}
    </div>
  );
}
