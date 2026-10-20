import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api, cleanParams, qs, type ApiError } from '@chuctu/shared/lib/api.ts';
import { fmtDate, fmtTime } from '@chuctu/shared/lib/format.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { Paged, Post } from '@chuctu/shared/types.ts';
import { NbActionMenu, NbEmpty, NbError, NbLoading, NbModal, NbOk, NbPageHead, NbPager, type MenuItem } from '../../components/nb.tsx';

const COLS = 'minmax(250px, 1fr) 152px 176px 160px 116px 100px';

/** Bài đã công khai rồi chuyển về nháp thì gọi là "Đã ẩn". */
export function PostStatusPill({ post }: { post: { status: Post['status']; publishedAt?: string | null } }) {
  if (post.status === 'PUBLISHED')
    return (
      <span className="nb-pill nb-pill-green">
        <Icon name="checkCircle" size={18} />
        Đã công khai
      </span>
    );
  if (post.publishedAt)
    return (
      <span className="nb-pill nb-pill-gold">
        <Icon name="eye" size={18} />
        Đã ẩn
      </span>
    );
  return (
    <span className="nb-pill nb-pill-done">
      <Icon name="edit" size={18} />
      Bản nháp
    </span>
  );
}

/** Quản lý bài viết: lọc, xem, sửa, ẩn, công khai, xoá (UC.5.1 – UC.5.5). */
export default function Posts() {
  useDocumentTitle('Quản lý bài viết');
  const { meta } = useSession();
  const [params, setParams] = useSearchParams();
  const status = params.get('trang-thai') || '';
  const category = params.get('chuyen-muc') || '';
  const page = Number(params.get('trang') || 1);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState<Post | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, reload } = useAsync(() => api.get<Paged<Post>>(`/admin/posts${qs({ status, category, q: query, page })}`), [status, category, query, page]);
  const set = (next: Record<string, string | number>) => setParams(cleanParams({ 'trang-thai': status, 'chuyen-muc': category, trang: page, ...next }));

  const act = async (fn: () => Promise<unknown>, message: string) => {
    setPending(true);
    setError(null);
    try {
      await fn();
      setNotice(message);
      setToDelete(null);
      reload({ silent: true });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  const menuFor = (p: Post): MenuItem[] => [
    { label: 'Xem bài viết', icon: 'eye', to: `/quan-tri/bai-viet/${p.id}/xem-thu?tu=ds` },
    { label: 'Sửa bài viết', icon: 'edit', to: `/quan-tri/bai-viet/${p.id}` },
    p.status === 'PUBLISHED'
      ? { label: 'Ẩn bài viết', icon: 'lock', onClick: () => act(() => api.put(`/admin/posts/${p.id}`, { status: 'DRAFT' }), `Đã ẩn bài "${p.title}". Người đọc không còn thấy bài này trên website.`) }
      : { label: 'Công khai bài viết', icon: 'checkCircle', tone: 'accent', onClick: () => act(() => api.put(`/admin/posts/${p.id}`, { status: 'PUBLISHED' }), `Đã công khai bài "${p.title}".`) },
    { label: 'Xoá bài viết', icon: 'trash', tone: 'danger', onClick: () => setToDelete(p) },
  ];

  return (
    <>
      <NbPageHead
        title="Quản lý bài viết"
        lead={
          <>
            Chỉ bài viết ở trạng thái <strong className="nb-ink">Đã công khai</strong> mới hiển thị trên website.
          </>
        }
        actions={
          <Link to="/quan-tri/bai-viet/moi" className="nb-btn nb-btn-primary" style={{ padding: '0 26px' }}>
            <Icon name="plus" />
            Viết bài mới
          </Link>
        }
      />
      {notice && <NbOk onClose={() => setNotice(null)}>{notice}</NbOk>}
      {!toDelete && <NbError error={error} />}

      <div className="nb-card nb-filters" style={{ flexDirection: 'row', padding: 20 }}>
        <div className="nb-field grow">
          <label className="nb-label" htmlFor="bv-tim">
            Tìm theo tiêu đề
          </label>
          <input
            id="bv-tim"
            type="search"
            className="nb-input"
            placeholder="Nhập để lọc danh sách"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (page !== 1) set({ trang: 1 });
            }}
          />
        </div>
        <div className="nb-field" style={{ flexBasis: 180 }}>
          <label className="nb-label" htmlFor="bv-chuyenmuc">
            Danh mục
          </label>
          <select id="bv-chuyenmuc" className="nb-select" value={category} onChange={(e) => set({ 'chuyen-muc': e.target.value, trang: 1 })}>
            <option value="">Tất cả</option>
            {(meta?.postCategories || []).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="nb-field" style={{ flexBasis: 180 }}>
          <label className="nb-label" htmlFor="bv-trangthai">
            Trạng thái
          </label>
          <select id="bv-trangthai" className="nb-select" value={status} onChange={(e) => set({ 'trang-thai': e.target.value, trang: 1 })}>
            <option value="">Tất cả</option>
            <option value="PUBLISHED">Đã công khai</option>
            <option value="DRAFT">Bản nháp hoặc đã ẩn</option>
          </select>
        </div>
      </div>

      <div className="nb-card nb-card-flush">
        <p className="nb-card-title" style={{ paddingBottom: 14 }}>
          Bài viết trong hệ thống — {data?.total ?? 0} bài viết
        </p>
        {loading && <NbLoading />}
        {!loading && data && data.items.length > 0 && (
          <div className="nb-table-wrap">
            <div className="nb-table" role="table" aria-label="Danh sách bài viết">
              <div className="nb-tr nb-thead" role="row" style={{ ['--cols' as string]: COLS }}>
                {['Bài viết', 'Danh mục', 'Tác giả', 'Trạng thái', 'Cập nhật', 'Thao tác'].map((h) => (
                  <div key={h} className="nb-th" role="columnheader" style={{ padding: '14px 12px' }}>
                    {h}
                  </div>
                ))}
              </div>
              {data.items.map((p) => (
                <div key={p.id} className="nb-tr" role="row" style={{ ['--cols' as string]: COLS }}>
                  <div className="nb-td" role="cell" style={{ padding: '14px 12px 14px 16px' }}>
                    <div className="nb-row" style={{ gap: 14, flexWrap: 'nowrap' }}>
                      {p.thumbnailUrl ? (
                        <img className="nb-thumb" src={p.thumbnailUrl} alt="" />
                      ) : (
                        <span className="nb-thumb-empty" aria-hidden="true">
                          <Icon name="file" size={22} />
                        </span>
                      )}
                      <span className="nb-strong" style={{ fontWeight: 600 }}>
                        {p.title}
                      </span>
                    </div>
                  </div>
                  <div className="nb-td" role="cell" style={{ padding: '14px 12px' }}>
                    <span className="nb-pill nb-pill-plain">{p.categoryLabel}</span>
                  </div>
                  <div className="nb-td" role="cell" style={{ padding: '14px 12px' }}>
                    {p.authorName}
                  </div>
                  <div className="nb-td" role="cell" style={{ padding: '14px 12px' }}>
                    <PostStatusPill post={p} />
                  </div>
                  <div className="nb-td" role="cell" style={{ padding: '14px 12px' }}>
                    <span style={{ display: 'block' }}>{fmtDate(p.updatedAt)}</span>
                    <span className="nb-sub">{fmtTime(p.updatedAt)}</span>
                  </div>
                  <div className="nb-td-action" role="cell">
                    <NbActionMenu
                      label={`Thao tác cho bài ${p.title}`}
                      items={menuFor(p)}
                      renderLink={(it, close) => (
                        <Link key={it.label} to={it.to!} role="menuitem" onClick={close}>
                          <Icon name={it.icon} size={22} />
                          {it.label}
                        </Link>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && data && data.items.length === 0 && (
          <NbEmpty title="Không tìm thấy bài viết nào">
            Kiểm tra lại tiêu đề hoặc chọn <strong>Tất cả</strong> ở danh mục và trạng thái.
          </NbEmpty>
        )}
        {data && <NbPager page={page} total={data.total} limit={data.limit} onPage={(p) => set({ trang: p })} unit="bài viết" />}
      </div>

      {toDelete && (
        <NbModal
          plain
          icon="trash"
          tone="red"
          title={`Xoá bài “${toDelete.title}”?`}
          subtitle={
            <p>
              Bài viết sẽ bị gỡ khỏi website và <strong style={{ color: '#90372A' }}>không khôi phục lại được</strong>. Nếu chỉ muốn tạm ẩn, hãy chọn <strong className="nb-ink">Ẩn bài viết</strong>.
            </p>
          }
          onClose={() => setToDelete(null)}
          width={600}
        >
          <NbError error={error} />
          <div className="nb-dialog-actions">
            <button type="button" className="nb-btn nb-btn-ghost" onClick={() => setToDelete(null)}>
              Giữ bài viết
            </button>
            <button
              type="button"
              className="nb-btn nb-btn-danger"
              disabled={pending}
              onClick={() => act(() => api.del(`/admin/posts/${toDelete.id}`), `Đã xoá bài "${toDelete.title}".`)}
            >
              <Icon name="trash" />
              Xoá bài viết
            </button>
          </div>
        </NbModal>
      )}
    </>
  );
}
