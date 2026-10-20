import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Loading } from '@chuctu/shared/components/ui.tsx';
import { api, qs, cleanParams } from '@chuctu/shared/lib/api.ts';
import { fmtDate } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { Paged, Post } from '@chuctu/shared/types.ts';

const CATEGORIES = [
  ['', 'Tất cả'],
  ['TIN_TUC', 'Tin tức'],
  ['HUONG_DAN', 'Hướng dẫn'],
  ['THIEN_NGUYEN', 'Thiện nguyện'],
  ['SU_KIEN', 'Sự kiện'],
];

/** Nhãn chuyên mục: hướng dẫn màu vàng, còn lại màu xanh như prototype. */
export function CategoryTag({ post }: { post: Pick<Post, 'category' | 'categoryLabel'> }) {
  return (
    <span className="u-tag" style={post.category === 'HUONG_DAN' ? undefined : { background: '#e4efe2', color: '#2e5b37' }}>
      {post.categoryLabel}
    </span>
  );
}

/** Thẻ bài viết; bài chưa có ảnh dùng ảnh mặt tiền phòng khám. */
export function PostCard({ post, showSummary = true }: { post: Post; showSummary?: boolean }) {
  return (
    <article className="u-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <img src={post.thumbnailUrl || '/mat-tien.jpg'} alt="" loading="lazy" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div className="u-row" style={{ gap: 10 }}>
          <CategoryTag post={post} />
          <span className="u-muted" style={{ fontSize: 15 }}>
            {fmtDate(post.publishedAt)}
          </span>
        </div>
        <h3 style={{ margin: 0, fontSize: 21, lineHeight: '30px', fontWeight: 600, color: '#2a2118' }}>{post.title}</h3>
        {showSummary && post.summary && (
          <p className="u-text" style={{ fontSize: 17, lineHeight: '27px' }}>
            {post.summary}
          </p>
        )}
        <Link to={`/tin-tuc/${post.id}`} className="u-link" style={{ fontSize: 17, marginTop: 'auto' }} aria-label={`Đọc thêm: ${post.title}`}>
          Đọc thêm
        </Link>
      </div>
    </article>
  );
}

export default function PostList() {
  useDocumentTitle('Bài viết');
  const [params, setParams] = useSearchParams();
  const category = params.get('chuyen-muc') || '';
  const page = Number(params.get('trang') || 1);
  const { data, loading } = useAsync(() => api.get<Paged<Post>>(`/posts${qs({ category, page, limit: 7 })}`), [category, page]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const set = (next: { 'chuyen-muc'?: string; trang?: number }) => setParams(cleanParams({ 'chuyen-muc': category, trang: page, ...next }));
  const [featured, ...rest] = data?.items || [];
  const currentLabel = CATEGORIES.find(([v]) => v === category)?.[1];

  return (
    <>
      <section className="u-band" style={{ padding: '40px 24px 56px' }}>
        <div className="u-wrap" style={{ gap: 16 }}>
          <nav aria-label="Đường dẫn" style={{ fontSize: 16, color: '#6b5e4e' }}>
            <Link to="/" style={{ color: '#4a3f33' }}>
              Trang chủ
            </Link>
            <span className="u-crumbs-sep">›</span>
            <span>Bài viết</span>
          </nav>
          <h1 className="u-h1" style={{ fontSize: 44, lineHeight: '56px' }}>
            Bài viết của phòng khám
          </h1>
          <p className="u-lead" style={{ fontSize: 20, lineHeight: '32px' }}>
            Thông báo, hướng dẫn, giới thiệu dịch vụ và hoạt động thiện nguyện. Cô chú đọc được mà không cần đăng nhập.
          </p>
        </div>
      </section>
      <section style={{ padding: '40px 24px 0' }}>
        <div className="u-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: '#2a2118' }}>Lọc theo chuyên mục</h2>
          <div className="u-filter" role="group" aria-label="Lọc bài viết theo chuyên mục">
            {CATEGORIES.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={category === value} onClick={() => set({ 'chuyen-muc': value, trang: 1 })}>
                {category === value && <Icon name="check" size={18} />}
                {label}
              </button>
            ))}
          </div>
          {data && (
            <p className="u-muted" style={{ margin: 0, fontSize: 17 }}>
              Đang xem chuyên mục: <strong className="u-ink">{currentLabel}</strong> · {data.total} bài viết
            </p>
          )}
        </div>
      </section>
      <section className="u-section" style={{ paddingTop: 32 }}>
        <div className="u-wrap">
          {loading && <Loading />}
          {data && data.items.length === 0 && (
            <div className="u-empty">
              <span className="u-empty-ic">
                <Icon name="news" size={44} />
              </span>
              <p className="u-text u-ink" style={{ fontSize: 20, fontWeight: 600 }}>
                Chưa có bài viết trong chuyên mục này
              </p>
            </div>
          )}
          {featured && page === 1 ? (
            <article className="u-feature" style={{ borderRadius: 28 }}>
              <img src={featured.thumbnailUrl || '/mat-tien.jpg'} alt="" style={{ height: 340, minHeight: 0 }} />
              <div style={{ padding: 36, gap: 16 }}>
                <div className="u-row" style={{ gap: 12 }}>
                  <CategoryTag post={featured} />
                  <span className="u-muted" style={{ fontSize: 16 }}>
                    {fmtDate(featured.publishedAt)} · {featured.authorName}
                  </span>
                </div>
                <h2 className="u-h2" style={{ fontSize: 30, lineHeight: '40px' }}>
                  {featured.title}
                </h2>
                {featured.summary && (
                  <p className="u-text" style={{ maxWidth: '58ch' }}>
                    {featured.summary}
                  </p>
                )}
                <Link to={`/tin-tuc/${featured.id}`} className="u-link" style={{ fontSize: 19, display: 'inline-flex', gap: 8, alignItems: 'center' }} aria-label={`Đọc thêm: ${featured.title}`}>
                  Đọc thêm
                  <Icon name="arrowRight" size={20} />
                </Link>
              </div>
            </article>
          ) : null}
          {data && data.items.length > 0 && (
            <div className="u-news-grid" style={{ gap: 28 }}>
              {(page === 1 ? rest : data.items).map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
          {pages > 1 && (
            <nav className="u-pager" aria-label="Phân trang">
              <button type="button" disabled={page <= 1} onClick={() => set({ trang: page - 1 })}>
                <Icon name="arrowLeft" size={20} />
                Trang trước
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" aria-current={n === page ? 'page' : undefined} onClick={() => set({ trang: n })}>
                  {n}
                </button>
              ))}
              <button type="button" disabled={page >= pages} onClick={() => set({ trang: page + 1 })}>
                Trang sau
                <Icon name="arrowRight" size={20} />
              </button>
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
