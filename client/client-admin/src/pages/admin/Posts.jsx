import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { ErrorAlert, Loading } from '@chuctu/shared/components/ui.jsx';
import { api, qs } from '@chuctu/shared/lib/api.js';
import { fmtDate, fmtTime } from '@chuctu/shared/lib/format.js';
import { useSession } from '@chuctu/shared/lib/session.jsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { Notice, Pager, PlainDialog, useDismiss } from '../../components/t-ui.jsx';
import './admin.css';

const PER_PAGE = 10;
const STATUSES = [
  ['PUBLISHED', 'Đã công khai'],
  ['DRAFT', 'Bản nháp'],
  ['HIDDEN', 'Đã ẩn'],
];
// Màu nhãn danh mục: xanh cho tin tức, thiện nguyện; vàng cho hướng dẫn, sự kiện
const GOLD_CATEGORIES = ['HUONG_DAN', 'SU_KIEN'];

export function PostStatusChip({ status }) {
  if (status === 'PUBLISHED')
    return (
      <span className="t-chip t-chip-green">
        <Icon name="checkCircle" size={18} strokeWidth={2.25} />
        Đã công khai
      </span>
    );
  if (status === 'HIDDEN')
    return (
      <span className="t-chip t-chip-gold">
        <Icon name="eye" size={18} strokeWidth={2.25} />
        Đã ẩn
      </span>
    );
  return (
    <span className="t-chip t-chip-done t-chip-sm">
      <Icon name="edit" size={18} strokeWidth={2.25} />
      Bản nháp
    </span>
  );
}

function RowMenu({ p, open, up, onToggle, onHide, onPublish, onDelete }) {
  const ref = useDismiss(open, onToggle);
  const fixedPage = Boolean(p.slug);
  return (
    <div className="t-menu-wrap" ref={ref}>
      <button type="button" className="t-btn t-btn-ghost t-btn-icon" aria-haspopup="menu" aria-expanded={open} aria-label={`Thao tác cho bài ${p.title}`} onClick={onToggle}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div role="menu" aria-label={`Thao tác cho bài ${p.title}`} className={`t-menu ${up ? 'up' : 'down'}`} style={{ width: 240 }}>
          <Link role="menuitem" className="t-menu-item" to={`/quan-tri/bai-viet/${p.id}/xem-thu`} state={{ from: 'list' }}>
            <Icon name="eye" size={22} />
            Xem bài viết
          </Link>
          <Link role="menuitem" className="t-menu-item" to={`/quan-tri/bai-viet/${p.id}`}>
            <Icon name="edit" size={22} />
            Sửa bài viết
          </Link>
          {p.status === 'PUBLISHED' && !fixedPage && (
            <button type="button" role="menuitem" className="t-menu-item" onClick={onHide}>
              <Icon name="lock" size={22} />
              Ẩn bài viết
            </button>
          )}
          {p.status === 'HIDDEN' && (
            <button type="button" role="menuitem" className="t-menu-item green" onClick={onPublish}>
              <Icon name="checkCircle" size={22} />
              Công khai bài viết
            </button>
          )}
          {!fixedPage && (
            <button type="button" role="menuitem" className="t-menu-item danger" onClick={onDelete}>
              <Icon name="trash" size={22} />
              Xoá bài viết
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Quản lý bài viết: lọc, ẩn, công khai lại, xoá (UC.5.3 – UC.5.5). */
export default function Posts() {
  useDocumentTitle('Quản lý bài viết');
  const { meta } = useSession();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const delTitle = useId();

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, reload } = useAsync(() => api.get(`/admin/posts${qs({ q: query, category, status, page, limit: PER_PAGE })}`), [query, category, status, page]);
  const counts = data?.statusCounts || { PUBLISHED: 0, DRAFT: 0, HIDDEN: 0 };
  const all = counts.PUBLISHED + counts.DRAFT + counts.HIDDEN;
  const filtered = Boolean(query || category || status);

  const setPostStatus = async (p, next, message) => {
    setMenu(null);
    setError(null);
    try {
      await api.put(`/admin/posts/${p.id}`, { status: next });
      setNotice(message);
      reload({ silent: true });
    } catch (err) {
      setError(err);
    }
  };

  const remove = async () => {
    setError(null);
    try {
      await api.delete(`/admin/posts/${delTarget.id}`);
      setNotice(`Đã xoá bài viết “${delTarget.title}” khỏi hệ thống.`);
      reload({ silent: true });
    } catch (err) {
      setError(err);
    } finally {
      setDelTarget(null);
    }
  };

  return (
    <>
      <div className="t-pagehead" style={{ gap: 20 }}>
        <div>
          <h1 className="t-h1">Quản lý bài viết</h1>
          <p className="t-lead">
            Chỉ bài viết ở trạng thái <strong className="t-strong">Đã công khai</strong> mới hiển thị trên website.
          </p>
        </div>
        <Link to="/quan-tri/bai-viet/moi" className="t-btn t-btn-primary" style={{ padding: '0 26px' }}>
          <Icon name="edit" strokeWidth={1.75} />
          Viết bài mới
        </Link>
      </div>

      {notice && <Notice onClose={() => setNotice(null)}>{notice}</Notice>}
      <ErrorAlert error={error} />

      <div className="t-card" style={{ padding: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
        <div className="t-field" style={{ flex: '999 1 300px' }}>
          <label htmlFor="bv-tim" className="t-label">
            Tìm theo tiêu đề
          </label>
          <input id="bv-tim" type="search" className="t-input" placeholder="Nhập để lọc danh sách" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="t-field" style={{ flex: '1 1 180px' }}>
          <label htmlFor="bv-chuyenmuc" className="t-label">
            Danh mục
          </label>
          <select
            id="bv-chuyenmuc"
            className="t-select"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {(meta?.postCategories || []).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="t-field" style={{ flex: '1 1 180px' }}>
          <label htmlFor="bv-trangthai" className="t-label">
            Trạng thái
          </label>
          <select
            id="bv-trangthai"
            className="t-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {STATUSES.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="t-card">
        <p className="t-label" style={{ padding: '20px 24px 14px' }}>
          Bài viết trong hệ thống — {data ? `${filtered ? `${data.total} trên ${all}` : all} bài · ${counts.PUBLISHED} đã công khai · ${counts.DRAFT} bản nháp · ${counts.HIDDEN} đã ẩn` : '…'}
        </p>
        {loading && !data && <Loading />}
        {data && data.items.length > 0 && (
          <div className="t-scroll">
            <div role="table" aria-label="Danh sách bài viết" className="t-table a-posts">
              <div role="row" className="t-tr t-thead" style={{ borderTop: '1px solid var(--line-soft)' }}>
                {['Bài viết', 'Danh mục', 'Tác giả', 'Trạng thái', 'Cập nhật', 'Thao tác'].map((h) => (
                  <div key={h} role="columnheader" className="t-th">
                    {h}
                  </div>
                ))}
              </div>
              <div role="rowgroup" className="t-tbody">
                {data.items.map((p, i) => (
                  <div key={p.id} role="row" className="t-tr" style={menu === p.id ? { position: 'relative', zIndex: 30 } : undefined}>
                    <div role="cell" className="t-td" style={{ paddingLeft: 16 }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        {p.thumbnailUrl ? (
                          <img src={p.thumbnailUrl} alt="" className="a-thumb" />
                        ) : (
                          <span className="a-thumb-empty" aria-hidden="true">
                            <Icon name="file" size={22} />
                          </span>
                        )}
                        <span className="t-td-name" style={{ minWidth: 0 }}>
                          {p.title}
                        </span>
                      </div>
                    </div>
                    <div role="cell" className="t-td">
                      <span className={`a-cat ${GOLD_CATEGORIES.includes(p.category) ? 'gold' : p.category === 'TRANG' ? 'sand' : ''}`}>{p.categoryLabel}</span>
                    </div>
                    <div role="cell" className="t-td t-text">
                      {p.authorName}
                    </div>
                    <div role="cell" className="t-td">
                      <PostStatusChip status={p.status} />
                    </div>
                    <div role="cell" className="t-td t-text">
                      <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{fmtDate(p.updatedAt)}</span>
                      <span style={{ display: 'block', color: 'var(--ink-500)' }}>{fmtTime(p.updatedAt)}</span>
                    </div>
                    <div role="cell" className="t-td">
                      <RowMenu
                        p={p}
                        open={menu === p.id}
                        up={data.items.length >= 4 && i >= data.items.length - 2}
                        onToggle={() => setMenu((m) => (m === p.id ? null : p.id))}
                        onHide={() =>
                          setPostStatus(p, 'HIDDEN', `Đã ẩn bài “${p.title}”. Bài không còn hiển thị trên website, vẫn được giữ lại để công khai lại sau.`)
                        }
                        onPublish={() => setPostStatus(p, 'PUBLISHED', `Đã công khai bài “${p.title}”. Bài hiển thị trên website trở lại.`)}
                        onDelete={() => {
                          setMenu(null);
                          setDelTarget(p);
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
            <p>Không tìm thấy bài viết nào</p>
            <p className="t-text">
              Kiểm tra lại tiêu đề hoặc chọn <strong>Tất cả</strong> ở danh mục và trạng thái.
            </p>
          </div>
        )}
        {data && <Pager page={page} total={data.total} perPage={PER_PAGE} unit="bài viết" onPage={setPage} />}
      </div>

      {delTarget && (
        <PlainDialog labelledBy={delTitle} width={600} onClose={() => setDelTarget(null)}>
          <div className="a-modal-head">
            <span className="a-modal-icon red">
              <Icon name="trash" size={30} strokeWidth={1.75} />
            </span>
            <div style={{ minWidth: 0 }}>
              <h2 id={delTitle} className="t-h2" style={{ marginBottom: 10 }}>
                Xoá bài “{delTarget.title}”?
              </h2>
              <p className="t-text">
                Bài viết sẽ bị gỡ khỏi website và <strong style={{ color: 'var(--alert-700)' }}>không khôi phục lại được</strong>. Nếu chỉ muốn tạm ẩn, hãy chọn{' '}
                <strong className="t-strong">Ẩn bài viết</strong>.
              </p>
            </div>
          </div>
          <div className="a-modal-actions">
            <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 28px' }} onClick={() => setDelTarget(null)}>
              Giữ bài viết
            </button>
            <button type="button" className="t-btn t-btn-danger" style={{ padding: '0 28px' }} onClick={remove}>
              <Icon name="trash" />
              Xoá bài viết
            </button>
          </div>
        </PlainDialog>
      )}
    </>
  );
}
