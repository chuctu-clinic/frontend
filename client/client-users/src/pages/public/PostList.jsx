import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { Empty, Loading } from '@chuctu/shared/components/ui.jsx';
import { api, qs } from '@chuctu/shared/lib/api.js';
import { fmtDate } from '@chuctu/shared/lib/format.js';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { PageHero } from './infoParts.jsx';
import './posts.css';

// Theo màn "Bài viết · Danh sách" của prototype (BaiViet-DanhSach.dc.html)

const CATEGORIES = [
  ['', 'Tất cả'],
  ['TIN_TUC', 'Tin tức'],
  ['HUONG_DAN', 'Hướng dẫn'],
  ['THIEN_NGUYEN', 'Thiện nguyện'],
  ['SU_KIEN', 'Sự kiện'],
];

const GOLD_CATEGORIES = ['HUONG_DAN', 'SU_KIEN'];

export function PostTag({ post }) {
  return <span className={`p-tag ${GOLD_CATEGORIES.includes(post.category) ? 'p-tag-gold' : ''}`}>{post.categoryLabel}</span>;
}

/** Ảnh đại diện bài viết; chưa có thì dùng ảnh mặt tiền phòng khám. */
export function PostImage({ post, className }) {
  return <img className={className} src={post.thumbnailUrl || '/mat-tien.jpg'} alt="" loading="lazy" />;
}

export function PostCard({ post, compact }) {
  return (
    <article className="p-card">
      <PostImage post={post} />
      <div className="p-card-body">
        {compact ? (
          <PostTag post={post} />
        ) : (
          <div className="p-meta">
            <PostTag post={post} />
            <span>{fmtDate(post.publishedAt)}</span>
          </div>
        )}
        <h3>{post.title}</h3>
        {!compact && post.summary && <p>{post.summary}</p>}
        <Link to={`/tin-tuc/${post.id}`} className="p-more" aria-label={`Đọc thêm: ${post.title}`}>
          Đọc thêm
        </Link>
      </div>
    </article>
  );
}

function FeaturedPost({ post }) {
  return (
    <article className="p-card p-featured">
      <PostImage post={post} />
      <div className="p-card-body">
        <div className="p-meta">
          <PostTag post={post} />
          <span>{fmtDate(post.publishedAt)}</span>
          <span>· {post.authorName}</span>
        </div>
        <h2>{post.title}</h2>
        {post.summary && <p>{post.summary}</p>}
        <Link to={`/tin-tuc/${post.id}`} className="p-more" aria-label={`Đọc thêm: ${post.title}`}>
          Đọc thêm
          <Icon name="arrowRight" size={22} strokeWidth={1.75} />
        </Link>
      </div>
    </article>
  );
}

function Pages({ page, total, limit, onPage }) {
  const count = Math.max(1, Math.ceil(total / limit));
  if (count <= 1) return null;
  return (
    <nav className="p-pages" aria-label="Phân trang">
      <button type="button" className="p-page p-page-wide" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <Icon name="arrowLeft" size={22} strokeWidth={1.75} />
        Trang trước
      </button>
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" className="p-page" aria-current={n === page ? 'page' : undefined} aria-label={`Trang ${n}`} onClick={() => onPage(n)}>
          {n}
        </button>
      ))}
      <button type="button" className="p-page p-page-wide" disabled={page >= count} onClick={() => onPage(page + 1)}>
        Trang sau
        <Icon name="arrowRight" size={22} strokeWidth={1.75} />
      </button>
    </nav>
  );
}

export default function PostList() {
  useDocumentTitle('Bài viết');
  const [params, setParams] = useSearchParams();
  const category = params.get('chuyen-muc') || '';
  const page = Number(params.get('trang') || 1);
  const { data, loading } = useAsync(() => api.get(`/posts${qs({ category, page, limit: 9 })}`), [category, page]);

  const set = (next) => setParams(Object.fromEntries(Object.entries({ 'chuyen-muc': category, trang: page, ...next }).filter(([, v]) => v && v !== 1)));
  const goPage = (p) => {
    set({ trang: p });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const items = data?.items || [];
  // Trang đầu: bài mới nhất làm bài nổi bật
  const featured = page === 1 ? items[0] : null;
  const rest = featured ? items.slice(1) : items;
  const currentLabel = CATEGORIES.find(([v]) => v === category)?.[1] || 'Tất cả';

  return (
    <div className="info-page posts">
      <PageHero
        crumb="Bài viết"
        title="Bài viết của phòng khám"
        lead="Thông báo, hướng dẫn, giới thiệu dịch vụ và hoạt động thiện nguyện. Cô chú đọc được mà không cần đăng nhập."
      />

      <section className="p-filter">
        <div className="h-wrap">
          <h2 id="loc-chuyen-muc">Lọc theo chuyên mục</h2>
          <div className="p-chips" role="group" aria-labelledby="loc-chuyen-muc">
            {CATEGORIES.map(([value, label]) => (
              <button key={value} type="button" className="p-chip" aria-pressed={category === value} onClick={() => set({ 'chuyen-muc': value, trang: 1 })}>
                {category === value && <Icon name="check" size={22} />}
                {label}
              </button>
            ))}
          </div>
          <p className="p-count" aria-live="polite">
            Đang xem chuyên mục: <strong>{currentLabel}</strong>
            {data && ` · ${data.total} bài viết`}
          </p>
        </div>
      </section>

      {loading && (
        <div className="h-wrap">
          <Loading />
        </div>
      )}
      {data && items.length === 0 && (
        <section className="i-section">
          <div className="h-wrap">
            <Empty icon="news" title="Chưa có bài viết trong chuyên mục này" />
          </div>
        </section>
      )}

      {featured && (
        <section style={{ padding: '32px 24px 0' }}>
          <div className="h-wrap">
            <FeaturedPost post={featured} />
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section style={{ padding: '32px 24px 72px' }}>
          <div className="h-wrap p-grid">
            {rest.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}

      {data && (
        <section style={{ padding: rest.length ? '0 24px 72px' : '32px 24px 72px' }}>
          <div className="h-wrap">
            <Pages page={page} total={data.total} limit={data.limit} onPage={goPage} />
          </div>
        </section>
      )}
    </div>
  );
}
