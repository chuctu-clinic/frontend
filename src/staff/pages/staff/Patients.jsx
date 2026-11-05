import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { Loading } from '../../../shared/ui/ui.jsx';
import { api, qs } from '../../../shared/lib/api.js';
import { fmtDate } from '../../../shared/lib/format.js';
import { useAsync, useDismiss, useDocumentTitle, useMenuPlacement } from '../../../shared/lib/hooks.js';
import { isAdmin, useSession } from '../../../shared/lib/session.jsx';
import { Pager } from '../../components/Pager.jsx';
import { NoticeDialog, TDialog } from '../../components/dialogs.jsx';
import { NewPatientFields } from '../../components/appointments/NewPatientFields.jsx';
import { TPicker } from '../../components/fields.jsx';
import { LockPatientDialog } from '../../components/patients/LockPatientDialog.jsx';

const PER_PAGE = 10;
const GRID = { gridTemplateColumns: '170px minmax(0, 2fr) minmax(0, 1.5fr) minmax(0, 1.3fr) 150px' };

/** Nút ⋮ ở cột Thao tác: Xem hồ sơ; Admin có thêm Khoá / Mở khoá hồ sơ. */
function RowMenu({ p, admin, open, onToggle, onLock }) {
  const ref = useDismiss(open, onToggle);
  const { menuRef, up } = useMenuPlacement(open, ref);
  return (
    <div className="t-menu-wrap" ref={ref}>
      <button type="button" className="t-kebab" aria-haspopup="menu" aria-expanded={open} aria-label={`Thao tác cho ${p.fullName}`} onClick={onToggle}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div ref={menuRef} role="menu" aria-label={`Thao tác cho ${p.fullName}`} className={`t-menu ${up ? 'up' : 'down'}`} style={{ width: 240 }}>
          <Link role="menuitem" className="t-menu-item" to={`/noi-bo/benh-nhan/${p.id}`}>
            <Icon name="user" size={22} />
            Xem hồ sơ
          </Link>
          {admin &&
            (p.isLocked ? (
              <button type="button" role="menuitem" className="t-menu-item green" onClick={onLock}>
                <Icon name="unlock" size={22} />
                Mở khoá hồ sơ
              </button>
            ) : (
              <button type="button" role="menuitem" className="t-menu-item danger" onClick={onLock}>
                <Icon name="lock" size={22} />
                Khoá hồ sơ
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/** Danh sách và tìm kiếm bệnh nhân; thêm hồ sơ mới (UC.9.1, UC.9.2, UC.9.4). */
export default function Patients() {
  useDocumentTitle('Hồ sơ bệnh nhân');
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('trang') || 1);
  const locked = params.get('khoa') || '';
  const [q, setQ] = useState(params.get('tim') || '');
  const [query, setQuery] = useState(q);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [menu, setMenu] = useState(null);
  const [lockTarget, setLockTarget] = useState(null);
  const [notice, setNotice] = useState(null);
  const { user } = useSession();
  const admin = isAdmin(user);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, reload } = useAsync(() => api.get(`/staff/patients${qs({ q: query, locked, page, limit: PER_PAGE })}`), [query, locked, page]);
  const set = (next) => {
    const merged = { tim: query, khoa: locked, trang: page, ...next };
    setParams(Object.fromEntries(Object.entries(merged).filter(([, v]) => v && v !== 1)), { replace: true });
  };
  // Tìm kiếm mới thì quay về trang 1
  useEffect(() => {
    if (query !== (params.get('tim') || '')) set({ tim: query, trang: 1 });
  }, [query]);

  return (
    <>
      <div className="t-pagehead" style={{ gap: 20 }}>
        <div>
          <h1 className="t-h1">Hồ sơ bệnh nhân</h1>
          <p className="t-lead">
            Hồ sơ tồn tại độc lập với tài khoản website. Bệnh nhân đến lần đầu chỉ cần cho biết họ tên, năm sinh và số điện thoại là tạo được hồ sơ, dù chưa có tài khoản.
          </p>
        </div>
        <button type="button" className="t-btn t-btn-primary" style={{ padding: '0 26px' }} onClick={() => setCreating(true)}>
          <Icon name="userPlus" strokeWidth={1.75} />
          Thêm hồ sơ mới
        </button>
      </div>

      {created && (
        <NoticeDialog
          title="Đã tạo hồ sơ"
          width={640}
          onClose={() => setCreated(null)}
          actions={
            <>
              <Link to={`/noi-bo/benh-nhan/${created.id}`} className="t-btn t-btn-ghost" style={{ padding: '0 20px' }}>
                Xem hồ sơ
              </Link>
              <Link to={`/noi-bo/lich-trong-ngay?dat=${created.id}`} className="t-btn t-btn-primary" style={{ padding: '0 22px' }}>
                <Icon name="calendarPlus" strokeWidth={1.75} />
                Đặt lịch khám cho bệnh nhân này
              </Link>
            </>
          }
        >
          <p>
            Đã tạo hồ sơ cho <strong className="t-strong">{created.fullName}</strong> — mã bệnh nhân <strong className="t-strong">{created.patientCode}</strong>.
          </p>
          {created.userId && (
            <p style={{ marginTop: 8 }}>Số điện thoại này đã có tài khoản website nên hồ sơ được nối vào tài khoản đó. Bệnh nhân sẽ thấy phiếu khám khi đăng nhập.</p>
          )}
          <p style={{ marginTop: 8 }}>Bước tiếp theo: đặt lịch khám cho bệnh nhân này để có mã phiếu khám và giờ khám dự kiến.</p>
        </NoticeDialog>
      )}

      <div className="t-card" style={{ padding: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <div className="t-field" style={{ flex: '999 1 300px' }}>
          <label htmlFor="bn-tim" className="t-label">
            Tìm theo mã bệnh nhân, họ tên hoặc số điện thoại
          </label>
          <input autoComplete="off" id="bn-tim" type="search" className="t-input" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="t-field" style={{ flex: '1 1 200px' }}>
          <label htmlFor="bn-trangthai" className="t-label">
            Trạng thái
          </label>
          <TPicker
            id="bn-trangthai"
            value={locked}
            onChange={(v) => set({ khoa: v, trang: 1 })}
            items={[
              { value: '', label: 'Tất cả' },
              { value: 'false', label: 'Đang hoạt động' },
              { value: 'true', label: 'Đã khoá' },
            ]}
          />
        </div>
      </div>

      <div className="t-card" style={{ overflow: 'hidden' }}>
        <p className="t-label" style={{ padding: '20px 12px 12px' }}>
          Danh sách hồ sơ — {data ? data.total : '…'} hồ sơ
        </p>
        {loading && !data && <Loading />}
        {data && data.items.length > 0 && (
          <div className="t-scroll">
            <div role="table" aria-label="Danh sách hồ sơ bệnh nhân" className="t-table">
              <div role="row" className="t-tr t-thead" style={GRID}>
                {['Mã bệnh nhân', 'Bệnh nhân', 'Trạng thái', 'Lần khám gần nhất', 'Thao tác'].map((h, i) => (
                  <div key={h} role="columnheader" className="t-th" style={{ padding: '14px 12px', textAlign: i >= 2 ? 'center' : undefined }}>
                    {h}
                  </div>
                ))}
              </div>
              <div role="rowgroup" className="t-tbody">
                {data.items.map((p) => (
                  <div key={p.id} role="row" className="t-tr" style={GRID}>
                    <div role="cell" className="t-td t-td-code" style={{ padding: '16px 12px' }}>
                      {p.patientCode}
                    </div>
                    <div role="cell" className="t-td" style={{ padding: '16px 12px' }}>
                      <span className="t-td-name">{p.fullName}</span>
                      <span className="t-td-sub" style={{ marginTop: 4 }}>
                        Năm sinh {p.birthYear || '—'} · {p.phone || '—'}
                      </span>
                    </div>
                    <div role="cell" className="t-td" style={{ padding: '16px 12px', textAlign: 'center' }}>
                      {p.isLocked ? (
                        <span className="t-chip t-chip-locked t-chip-sm">
                          <Icon name="lock" size={18} strokeWidth={2.25} />
                          Đã khoá
                        </span>
                      ) : (
                        <span className="t-chip t-chip-green" style={{ padding: '4px 12px' }}>
                          <Icon name="check" size={18} strokeWidth={2.25} />
                          Đang hoạt động
                        </span>
                      )}
                    </div>
                    <div role="cell" className="t-td t-text" style={{ padding: '16px 12px', textAlign: 'center' }}>
                      {p.lastVisitDate ? fmtDate(p.lastVisitDate) : 'Chưa khám'}
                    </div>
                    <div role="cell" className="t-td" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: menu === p.id ? 'relative' : undefined, zIndex: menu === p.id ? 30 : undefined }}>
                      <RowMenu
                        p={p}
                        admin={admin}
                        open={menu === p.id}
                        onToggle={() => setMenu((m) => (m === p.id ? null : p.id))}
                        onLock={() => {
                          setMenu(null);
                          setLockTarget(p);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {data && data.items.length === 0 && (
          <div className="t-empty">
            <p>Không tìm thấy hồ sơ nào</p>
            <p className="t-text">
              Kiểm tra lại mã, họ tên hoặc số điện thoại, hoặc đổi bộ lọc <strong>Trạng thái</strong>. Bệnh nhân đến lần đầu thì bấm <strong>Thêm hồ sơ mới</strong>.
            </p>
          </div>
        )}
        {data && <Pager page={page} total={data.total} perPage={PER_PAGE} unit="hồ sơ" onPage={(p) => set({ trang: p })} />}
      </div>

      {lockTarget && (
        <LockPatientDialog
          patient={lockTarget}
          onClose={() => setLockTarget(null)}
          onDone={(patient) => {
            setLockTarget(null);
            setNotice(patient.isLocked ? `Đã khoá hồ sơ ${patient.fullName} (${patient.patientCode}).` : `Đã mở khoá hồ sơ ${patient.fullName} (${patient.patientCode}).`);
            reload({ silent: true });
          }}
        />
      )}
      {notice && <NoticeDialog onClose={() => setNotice(null)}>{notice}</NoticeDialog>}

      {creating && (
        <TDialog title="Thêm hồ sơ mới" width={600} onClose={() => setCreating(false)}>
          <div className="t-dialog-body">
            <NewPatientFields
              idPrefix="tm"
              submitLabel="Tạo hồ sơ"
              intro={<p className="t-text">Hỏi bệnh nhân 3 thông tin dưới đây. Mã bệnh nhân được cấp tự động khi tạo hồ sơ.</p>}
              onCreated={(p) => {
                setCreating(false);
                setCreated(p);
                setQ('');
                set({ tim: '', khoa: '', trang: 1 });
                reload({ silent: true });
              }}
              onCancel={() => setCreating(false)}
            />
          </div>
        </TDialog>
      )}
    </>
  );
}
