import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Empty, Loading, PageHeader, Pagination } from '@chuctu/shared/components/ui.tsx';
import { api, qs, cleanParams } from '@chuctu/shared/lib/api.ts';
import { fmtDate, genderLabel } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { NewPatientForm } from './PatientPicker.tsx';
import type { Patient, Paged } from '@chuctu/shared/types.ts';

/** Danh sách và tìm kiếm bệnh nhân; thêm hồ sơ mới (UC.9.1, UC.9.2, UC.9.4). */
export default function Patients() {
  useDocumentTitle('Hồ sơ bệnh nhân');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('trang') || 1);
  const locked = params.get('khoa') || '';
  const [q, setQ] = useState(params.get('tim') || '');
  const [query, setQuery] = useState(q);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading } = useAsync(() => api.get<Paged<Patient>>(`/staff/patients${qs({ q: query, locked, page })}`), [query, locked, page]);
  const set = (next: Record<string, string | number>) => {
    const merged = { tim: query, khoa: locked, trang: page, ...next };
    setParams(cleanParams(merged));
  };

  return (
    <div className="stack">
      <PageHeader
        title="Hồ sơ bệnh nhân"
        subtitle={data ? `${data.total} hồ sơ` : null}
        actions={
          !creating && (
            <Button icon="plus" onClick={() => setCreating(true)}>
              Thêm hồ sơ bệnh nhân
            </Button>
          )
        }
      />
      {creating && (
        <section className="card card-lg stack" aria-labelledby="tao-ho-so">
          <h2 id="tao-ho-so" style={{ fontSize: 24 }}>
            Hồ sơ bệnh nhân mới
          </h2>
          <p className="small">Hệ thống tự sinh mã bệnh nhân và cảnh báo nếu số điện thoại đã có hồ sơ.</p>
          <NewPatientForm onCreated={(p) => navigate(`/benh-nhan/${p.id}`)} onCancel={() => setCreating(false)} />
        </section>
      )}
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: '1 1 360px' }}>
          <label className="field-label" htmlFor="tim-bn">
            Tìm theo họ tên, số điện thoại hoặc mã bệnh nhân
          </label>
          <input id="tim-bn" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="tabs" role="group" aria-label="Lọc trạng thái hồ sơ">
          {[
            ['', 'Tất cả'],
            ['false', 'Đang dùng'],
            ['true', 'Đã khoá'],
          ].map(([v, label]) => (
            <button key={v} type="button" className="tab" aria-pressed={locked === v} onClick={() => set({ khoa: v, trang: 1 })}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {loading && <Loading />}
      {data && data.items.length === 0 && <Empty icon="users" title="Không tìm thấy hồ sơ phù hợp" />}
      {data && data.items.length > 0 && (
        <div className="table-wrap">
          <table className="table table-responsive">
            <thead>
              <tr>
                <th scope="col">Mã bệnh nhân</th>
                <th scope="col">Họ và tên</th>
                <th scope="col">Năm sinh</th>
                <th scope="col">Giới tính</th>
                <th scope="col">Số điện thoại</th>
                <th scope="col">Tạo ngày</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td data-label="Mã" className="mono">
                    {p.patientCode}
                  </td>
                  <td data-label="Họ tên">
                    <Link to={`/benh-nhan/${p.id}`} style={{ fontWeight: 600 }}>
                      {p.fullName}
                    </Link>
                  </td>
                  <td data-label="Năm sinh">{p.birthYear || '—'}</td>
                  <td data-label="Giới tính">{genderLabel(p.gender) || '—'}</td>
                  <td data-label="Điện thoại" className="mono">
                    {p.phone || '—'}
                  </td>
                  <td data-label="Tạo ngày">{fmtDate(p.createdAt)}</td>
                  <td data-label="Trạng thái">
                    {p.isLocked ? <Badge tone="red" icon="lock">Đã khoá</Badge> : <Badge tone="green" icon="check">Đang dùng</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={page} total={data.total} limit={data.limit} onPage={(p) => set({ trang: p })} />}
    </div>
  );
}
