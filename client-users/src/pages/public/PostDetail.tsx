import { Link, useParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Markdown } from '@chuctu/shared/components/Markdown.tsx';
import { Loading } from '@chuctu/shared/components/ui.tsx';
import { api, qs } from '@chuctu/shared/lib/api.ts';
import { fmtDate } from '@chuctu/shared/lib/format.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { CategoryTag, PostCard } from './PostList.tsx';
import type { Paged, Post } from '@chuctu/shared/types.ts';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useSession();
  const { data, loading, error } = useAsync(() => api.get<{ post: Post }>(`/posts/${id}`), [id]);
  const post = data?.post;
  const related = useAsync(
    () => (post ? api.get<Paged<Post>>(`/posts${qs({ category: post.category, limit: 4 })}`) : Promise.resolve(null)),
    [post?.id],
  );
  useDocumentTitle(post?.title || 'Bài viết');
  const others = (related.data?.items || []).filter((p) => p.id !== post?.id).slice(0, 3);

  return (
    <>
      <section className="u-band" style={{ padding: '36px 24px 48px' }}>
        <div className="u-wrap" style={{ maxWidth: 820, gap: 16 }}>
          <nav aria-label="Đường dẫn" style={{ fontSize: 16, color: '#6b5e4e' }}>
            <Link to="/" style={{ color: '#4a3f33' }}>
              Trang chủ
            </Link>
            <span className="u-crumbs-sep">›</span>
            <Link to="/tin-tuc" style={{ color: '#4a3f33' }}>
              Bài viết
            </Link>
            {post && (
              <>
                <span className="u-crumbs-sep">›</span>
                <span>{post.categoryLabel}</span>
              </>
            )}
          </nav>
          {post && (
            <>
              <span style={{ alignSelf: 'flex-start' }}>
                <CategoryTag post={post} />
              </span>
              <h1 className="u-h1" style={{ fontSize: 42, lineHeight: '54px' }}>
                {post.title}
              </h1>
              <div className="u-row u-muted" style={{ gap: 20, fontSize: 17 }}>
                <span className="u-row" style={{ gap: 8 }}>
                  <Icon name="user" size={20} />
                  {post.authorName}
                </span>
                <span className="u-row" style={{ gap: 8 }}>
                  <Icon name="calendar" size={20} />
                  Đăng ngày {fmtDate(post.publishedAt || post.updatedAt)}
                </span>
              </div>
            </>
          )}
          {!post && !loading && <h1 className="u-h1">Không tìm thấy bài viết</h1>}
        </div>
      </section>
      <article style={{ padding: '48px 24px 72px' }}>
        <div className="u-article">
          {loading && <Loading />}
          {error && (
            <div className="u-stack" style={{ alignItems: 'flex-start' }}>
              <p className="u-text">Bài viết không tồn tại hoặc chưa được đăng.</p>
              <Link to="/tin-tuc" className="u-btn u-btn-ghost">
                Xem các bài viết khác
              </Link>
            </div>
          )}
          {post && (
            <>
              <img className="cover" src={post.thumbnailUrl || '/mat-tien.jpg'} alt="" />
              <div className="prose">
                {post.summary && <p>{post.summary}</p>}
                <Markdown source={post.content} />
              </div>
              <div className="u-cta">
                <div style={{ flex: '1 1 320px' }}>
                  <h2 className="u-h2" style={{ fontSize: 26, lineHeight: '36px' }}>
                    Cô chú cần đi khám?
                  </h2>
                  <p className="u-text">{user ? 'Chọn ngày giờ rồi đặt lịch, có ngay phiếu khám.' : 'Đăng nhập rồi đặt lịch, có ngay phiếu khám.'}</p>
                </div>
                <Link to="/dat-lich" className="u-btn u-btn-primary" style={{ padding: '0 28px' }}>
                  <Icon name="calendarPlus" />
                  Đặt lịch khám
                </Link>
              </div>
            </>
          )}
        </div>
      </article>
      {post && (
        <section style={{ padding: '72px 24px', background: '#f4eadb' }}>
          <div className="u-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 className="u-h2" style={{ fontSize: 32, lineHeight: '42px' }}>
                Bài viết cùng chuyên mục
              </h2>
              <div className="u-rule" />
            </div>
            {others.length > 0 ? (
              <div className="u-news-grid" style={{ gap: 28 }}>
                {others.map((p) => (
                  <PostCard key={p.id} post={p} showSummary={false} />
                ))}
              </div>
            ) : (
              <p className="u-text">Chuyên mục này chưa có bài viết khác.</p>
            )}
            <Link to="/tin-tuc" className="u-link" style={{ fontSize: 19, display: 'inline-flex', gap: 8, alignItems: 'center', alignSelf: 'flex-start' }}>
              <Icon name="arrowLeft" size={20} />
              Quay lại danh sách bài viết
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
