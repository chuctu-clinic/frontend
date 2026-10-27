import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon.jsx';
import { Markdown } from '../../../shared/components/Markdown.jsx';
import { Empty, Loading } from '../../../shared/components/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { fmtDate } from '../../../shared/lib/format.js';
import { useSession } from '../../../shared/lib/session.jsx';
import { useAsync, useDocumentTitle } from '../../../shared/lib/useAsync.js';
import { PostCard, PostTag } from './PostList.jsx';
import './home.css';
import './info.css';
import './posts.css';

// Theo màn "Bài viết · Chi tiết" của prototype (BaiViet-ChiTiet.dc.html)

/**
 * Bài cũ lấy đoạn đầu làm mô tả. Khi đó không hiện mô tả dưới tiêu đề (sẽ lặp đoạn đầu),
 * mà tô đoạn đầu thành đoạn mở đầu.
 */
function summaryRepeatsContent(post) {
  const text = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const summary = text(post.summary).replace(/…$/, '');
  return Boolean(summary) && text(post.content).startsWith(summary);
}

function Crumbs({ post }) {
  return (
    <nav aria-label="Đường dẫn" className="i-crumb">
      <Link to="/">Trang chủ</Link>
      <span aria-hidden="true">›</span>
      <Link to="/tin-tuc">Bài viết</Link>
      {post && (
        <>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{post.categoryLabel}</span>
        </>
      )}
    </nav>
  );
}

/** Tối đa 3 bài khác cùng chuyên mục. */
function Related({ post }) {
  const { data } = useAsync(() => api.get(`/posts?category=${post.category}&limit=4`), [post.category]);
  const items = (data?.items || []).filter((p) => p.id !== post.id).slice(0, 3);
  return (
    <section className="p-related" aria-labelledby="bai-lien-quan">
      <div className="h-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div>
          <h2 id="bai-lien-quan" className="p-related-title">
            Bài viết cùng chuyên mục
          </h2>
          <div className="h-rule" aria-hidden="true" />
        </div>
        {items.length > 0 && (
          <div className="p-grid">
            {items.map((p) => (
              <PostCard key={p.id} post={p} compact />
            ))}
          </div>
        )}
        <Link to="/tin-tuc" className="p-back">
          <Icon name="arrowLeft" size={22} strokeWidth={1.75} />
          Quay lại danh sách bài viết
        </Link>
      </div>
    </section>
  );
}

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useSession();
  const loggedIn = user?.role === 'USER';
  const { data, loading, error } = useAsync(() => api.get(`/posts/${id}`), [id]);
  const post = data?.post;
  useDocumentTitle(post?.title || 'Bài viết');

  if (loading || error) {
    return (
      <div className="info-page posts">
        <section className="p-head">
          <div className="p-narrow">
            <Crumbs />
          </div>
        </section>
        <section className="p-article">
          <div className="p-narrow">
            {loading ? (
              <Loading />
            ) : (
              <Empty
                icon="news"
                title="Không tìm thấy bài viết"
                action={
                  <Link to="/tin-tuc" className="h-btn h-btn-ghost">
                    Xem các bài viết khác
                  </Link>
                }
              >
                Bài viết không tồn tại hoặc chưa được đăng.
              </Empty>
            )}
          </div>
        </section>
      </div>
    );
  }

  const showDesc = Boolean(post.summary) && !summaryRepeatsContent(post);
  return (
    <div className="info-page posts">
      <section className="p-head">
        <div className="p-narrow">
          <Crumbs post={post} />
          <PostTag post={post} />
          <h1 className="p-title">{post.title}</h1>
          {showDesc && <p className="p-desc">{post.summary}</p>}
          <div className="p-byline">
            <span>
              <Icon name="user" size={20} strokeWidth={1.75} />
              {post.authorName}
            </span>
            <span>
              <Icon name="calendar" size={20} strokeWidth={1.75} />
              Đăng ngày {fmtDate(post.publishedAt)}
            </span>
          </div>
        </div>
      </section>

      <article className="p-article">
        <div className="p-narrow">
          {post.thumbnailUrl && <img className="p-cover" src={post.thumbnailUrl} alt="" />}
          <Markdown source={post.content} className={`p-prose ${post.summary && !showDesc ? 'p-prose-lead' : ''}`} />

          <div className="p-action">
            <div>
              <h2>Cô chú cần đi khám?</h2>
              <p>{loggedIn ? 'Đặt lịch xong là có ngay phiếu khám.' : 'Đăng nhập rồi đặt lịch, có ngay phiếu khám.'}</p>
            </div>
            <Link to="/dat-lich" className="h-btn h-btn-primary">
              <Icon name="calendarPlus" strokeWidth={1.75} />
              Đặt lịch khám
            </Link>
          </div>
        </div>
      </article>

      <Related post={post} />
    </div>
  );
}
