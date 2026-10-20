import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, ButtonLink, Empty, ErrorAlert, Loading, Modal, PageHeader, Pagination } from '@chuctu/shared/components/ui.jsx';
import { api, qs } from '@chuctu/shared/lib/api.js';
import { fmtDate } from '@chuctu/shared/lib/format.js';
import { useSession } from '@chuctu/shared/lib/session.jsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';

/** Danh sách bài viết trong trang quản trị, gồm cả bản nháp (UC.5.4, UC.5.3). */
export default function Posts() {
  useDocumentTitle('Quản lý bài viết');
  const { meta } = useSession();
  const [params, setParams] = useSearchParams();
  const status = params.get('trang-thai') || '';
  const category = params.get('chuyen-muc') || '';
  const page = Number(params.get('trang') || 1);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, reload } = useAsync(() => api.get(`/admin/posts${qs({ status, category, q: query, page })}`), [status, category, query, page]);
  const set = (next) => {
    const merged = { 'trang-thai': status, 'chuyen-muc': category, trang: page, ...next };
    setParams(Object.fromEntries(Object.entries(merged).filter(([, v]) => v && v !== 1)));
  };

  const doDelete = async () => {
    setPending(true);
    setError(null);
    try {
      await api.del(`/admin/posts/${toDelete.id}`);
      setNotice(`Đã xoá bài viết "${toDelete.title}".`);
      setToDelete(null);
      reload({ silent: true });
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="stack">
      <PageHeader title="Quản lý bài viết" actions={<ButtonLink to="/quan-tri/bai-viet/moi" icon="plus">Viết bài mới</ButtonLink>} />
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: '1 1 280px' }}>
          <label className="field-label" htmlFor="tim-bv">
            Tìm theo tiêu đề
          </label>
          <input id="tim-bv" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="field" style={{ minWidth: 220 }}>
          <label className="field-label" htmlFor="cm">
            Chuyên mục
          </label>
          <select id="cm" className="select" value={category} onChange={(e) => set({ 'chuyen-muc': e.target.value, trang: 1 })}>
            <option value="">Tất cả</option>
            {meta?.postCategories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="tabs" role="group" aria-label="Lọc trạng thái">
          {[
            ['', 'Tất cả'],
            ['PUBLISHED', 'Đã đăng'],
            ['DRAFT', 'Bản nháp'],
          ].map(([v, label]) => (
            <button key={v} type="button" className="tab" aria-pressed={status === v} onClick={() => set({ 'trang-thai': v, trang: 1 })}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {notice && <Alert type="success">{notice}</Alert>}
      {loading && <Loading />}
      {data && data.items.length === 0 && <Empty icon="news" title="Chưa có bài viết phù hợp" />}
      {data && data.items.length > 0 && (
        <div className="table-wrap">
          <table className="table table-responsive">
            <thead>
              <tr>
                <th scope="col">Tiêu đề</th>
                <th scope="col">Chuyên mục</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Cập nhật</th>
                <th scope="col">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td data-label="Tiêu đề">
                    <Link to={`/quan-tri/bai-viet/${p.id}`} style={{ fontWeight: 600 }}>
                      {p.title || '(Chưa có tiêu đề)'}
                    </Link>
                    <span className="caption" style={{ display: 'block' }}>
                      {p.authorName}
                    </span>
                  </td>
                  <td data-label="Chuyên mục">{p.categoryLabel}</td>
                  <td data-label="Trạng thái">
                    {p.status === 'PUBLISHED' ? <Badge tone="green" icon="check">Đã đăng</Badge> : <Badge tone="gold" icon="edit">Bản nháp</Badge>}
                  </td>
                  <td data-label="Cập nhật">{fmtDate(p.updatedAt)}</td>
                  <td data-label="">
                    <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                      <ButtonLink to={`/quan-tri/bai-viet/${p.id}`} size="sm" variant="secondary" icon="edit">
                        Sửa
                      </ButtonLink>
                      {p.category !== 'TRANG' && (
                        <Button size="sm" variant="danger" icon="trash" onClick={() => setToDelete(p)}>
                          Xoá
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={page} total={data.total} limit={data.limit} onPage={(p) => set({ trang: p })} />}
      {toDelete && (
        <Modal
          title="Xoá bài viết?"
          onClose={() => setToDelete(null)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setToDelete(null)}>
                Không xoá
              </Button>
              <Button variant="danger-solid" icon="trash" loading={pending} onClick={doDelete}>
                Xoá vĩnh viễn
              </Button>
            </>
          }
        >
          <div className="stack-sm">
            <p>
              Bài viết <strong>“{toDelete.title}”</strong> sẽ bị xoá vĩnh viễn và không hiện trên website nữa. Thao tác này không hoàn tác được.
            </p>
            <ErrorAlert error={error} />
          </div>
        </Modal>
      )}
    </div>
  );
}
