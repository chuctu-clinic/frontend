import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { Loading } from '../../../shared/ui/ui.jsx';
import { api, qs } from '../../../shared/lib/api.js';
import { fmtDate } from '../../../shared/lib/format.js';
import { useAsync, useDocumentTitle } from '../../../shared/lib/hooks.js';
import { Pager } from '../../components/Pager.jsx';
import { TDialog } from '../../components/dialogs.jsx';
import { NewPatientFields } from '../../components/appointments/NewPatientFields.jsx';

const PER_PAGE = 10;
const GRID = { gridTemplateColumns: '170px minmax(0, 2fr) minmax(0, 1.5fr) minmax(0, 1.3fr) 150px' };

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
        <div role="status" className="t-notice" style={{ padding: '22px 24px', flexWrap: 'wrap', alignItems: 'center', gap: '18px 20px', fontWeight: 400 }}>
          <div style={{ flex: '999 1 320px', minWidth: 0 }}>
            <p style={{ fontWeight: 700 }}>
              Đã tạo hồ sơ cho <span className="t-notice-name">{created.fullName}</span> — mã bệnh nhân <span className="t-notice-name">{created.patientCode}</span>
            </p>
            <p className="t-text" style={{ marginTop: 4 }}>
              Bước tiếp theo: đặt lịch khám cho bệnh nhân này để có mã phiếu khám và giờ khám dự kiến.
            </p>
          </div>
          <div className="t-actions" style={{ gap: 12 }}>
            <Link to={`/noi-bo/lich-trong-ngay?dat=${created.id}`} className="t-btn t-btn-primary" style={{ padding: '0 22px' }}>
              <Icon name="calendarPlus" strokeWidth={1.75} />
              Đặt lịch khám cho bệnh nhân này
            </Link>
            <Link to={`/noi-bo/benh-nhan/${created.id}`} className="t-btn t-btn-ghost" style={{ padding: '0 20px' }}>
              Xem hồ sơ
            </Link>
          </div>
        </div>
      )}

      <div className="t-card" style={{ padding: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <div className="t-field" style={{ flex: '999 1 300px' }}>
          <label htmlFor="bn-tim" className="t-label">
            Tìm theo mã bệnh nhân, họ tên hoặc số điện thoại
          </label>
          <input id="bn-tim" type="search" className="t-input" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="t-field" style={{ flex: '1 1 200px' }}>
          <label htmlFor="bn-trangthai" className="t-label">
            Trạng thái
          </label>
          <select id="bn-trangthai" className="t-select" value={locked} onChange={(e) => set({ khoa: e.target.value, trang: 1 })}>
            <option value="">Tất cả</option>
            <option value="false">Đang hoạt động</option>
            <option value="true">Đã khoá</option>
          </select>
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
                {['Mã bệnh nhân', 'Bệnh nhân', 'Trạng thái', 'Lần khám gần nhất', 'Thao tác'].map((h) => (
                  <div key={h} role="columnheader" className="t-th" style={{ padding: '14px 12px' }}>
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
                    <div role="cell" className="t-td" style={{ padding: '16px 12px' }}>
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
                    <div role="cell" className="t-td t-text" style={{ padding: '16px 12px' }}>
                      {p.lastVisitDate ? fmtDate(p.lastVisitDate) : 'Chưa khám'}
                    </div>
                    <div role="cell" className="t-td" style={{ padding: '16px 12px' }}>
                      <Link to={`/noi-bo/benh-nhan/${p.id}`} className="t-btn t-btn-ghost t-btn-sm">
                        Xem hồ sơ
                      </Link>
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
