import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Markdown } from '@chuctu/shared/components/Markdown.tsx';
import { api, type ApiError } from '@chuctu/shared/lib/api.ts';
import { CLINIC, fmtDate } from '@chuctu/shared/lib/format.ts';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { Post } from '@chuctu/shared/types.ts';
import { NbError, NbLoading } from '../../components/nb.tsx';
import { PREVIEW_KEY, postPayload, type PostForm } from './PostEditor.tsx';

type Shown = Pick<Post, 'title' | 'categoryLabel' | 'authorName' | 'summary' | 'thumbnailUrl' | 'content' | 'status'> & { publishedAt?: string | null };

/**
 * Xem thử bài viết như người đọc thấy trên website, kèm thanh xem thử để quay lại sửa hoặc công khai.
 * ?ban=1: bài đang soạn (chưa lưu) đọc từ sessionStorage; còn lại đọc bài đã lưu theo :id.
 */
export default function PostPreview() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const from = params.get('tu') || 'ds';
  const draftMode = params.get('ban') === '1';
  const editId = from.startsWith('sua-') ? from.slice(4) : id;
  const [post, setPost] = useState<Shown | null>(null);
  const [draft, setDraft] = useState<PostForm | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const [published, setPublished] = useState(false);
  useDocumentTitle('Xem thử bài viết');

  useEffect(() => {
    if (draftMode) {
      try {
        const raw = sessionStorage.getItem(PREVIEW_KEY);
        if (raw) {
          const d = JSON.parse(raw) as PostForm & { categoryLabel: string };
          setDraft(d);
          setPost({ ...d, thumbnailUrl: d.thumbnailUrl || null, publishedAt: d.publishDate });
          return;
        }
      } catch {
        // Không đọc được bản đang soạn thì đọc bài đã lưu bên dưới
      }
    }
    if (!editId) {
      setError(new Error('Không tìm thấy bài viết để xem thử. Quay lại trang soạn bài rồi bấm Xem thử lần nữa.') as ApiError);
      return;
    }
    api
      .get<{ post: Post }>(`/admin/posts/${editId}`)
      .then(({ post: p }) => setPost(p))
      .catch(setError);
  }, [draftMode, editId]);

  const publish = async () => {
    setPending(true);
    setError(null);
    try {
      if (draft) {
        const payload = postPayload(draft, 'PUBLISHED');
        if (editId) await api.put(`/admin/posts/${editId}`, payload);
        else await api.post('/admin/posts', payload);
      } else if (editId) {
        await api.put(`/admin/posts/${editId}`, { status: 'PUBLISHED' });
      }
      setPublished(true);
      setPost((p) => (p ? { ...p, status: 'PUBLISHED' } : p));
      try {
        sessionStorage.removeItem(PREVIEW_KEY);
      } catch {
        // bỏ qua
      }
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  const back = from === 'soan' ? { to: '/quan-tri/bai-viet/moi', label: 'Quay lại sửa bài' } : from.startsWith('sua-') ? { to: `/quan-tri/bai-viet/${editId}`, label: 'Quay lại sửa bài' } : { to: '/quan-tri/bai-viet', label: 'Quay lại danh sách' };

  return (
    <div className="nb-page">
      <div className="nb-previewbar" role="region" aria-label="Thanh xem thử">
        <div>
          <span className="badge">
            <Icon name="eye" size={20} />
            Đang xem thử
          </span>
          {published ? (
            <p role="status">Đã công khai bài viết. Người đọc đã xem được bài này trên website.</p>
          ) : (
            <p style={{ fontWeight: 500 }}>Đây là cách người đọc thấy bài viết trên website.</p>
          )}
          <div className="nb-row">
            {!published && (
              <Link to={back.to} className="nb-btn-dark">
                <Icon name="arrowLeft" size={20} />
                {back.label}
              </Link>
            )}
            {!published && post && post.status !== 'PUBLISHED' && (
              <button type="button" className="nb-btn nb-btn-goldsolid" disabled={pending} onClick={publish}>
                <Icon name="checkCircle" size={20} />
                Công khai bài viết
              </button>
            )}
            {(published || post?.status === 'PUBLISHED') && (
              <Link to="/quan-tri/bai-viet" className="nb-btn nb-btn-goldsolid">
                Về danh sách bài viết
              </Link>
            )}
          </div>
        </div>
      </div>

      <header className="nb-auth-header">
        <div>
          <span className="nb-row" style={{ gap: 12 }}>
            <img src={`${import.meta.env.BASE_URL}logo-192.png`} alt="" width={52} height={52} />
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span className="brand-t">Chúc Từ</span>
              <span className="nb-muted" style={{ fontSize: 14 }}>
                Y học cổ truyền từ thiện
              </span>
            </span>
          </span>
        </div>
      </header>

      {error && (
        <div style={{ maxWidth: 820, margin: '24px auto', padding: '0 24px' }}>
          <NbError error={error} />
        </div>
      )}
      {!post && !error && <NbLoading />}
      {post && (
        <>
          <section className="nb-preview-hero">
            <div>
              <nav aria-label="Đường dẫn" className="nb-muted">
                Trang chủ <span style={{ padding: '0 8px' }}>›</span> Bài viết <span style={{ padding: '0 8px' }}>›</span> {post.categoryLabel}
              </nav>
              <span className="nb-pill nb-pill-green" style={{ alignSelf: 'flex-start', fontWeight: 600, padding: '7px 16px' }}>
                {post.categoryLabel}
              </span>
              <h1>{post.title || 'Bài viết chưa có tiêu đề'}</h1>
              <div className="nb-row nb-muted" style={{ gap: 20, fontSize: 17 }}>
                <span className="nb-row" style={{ gap: 8 }}>
                  <Icon name="user" size={20} />
                  {post.authorName}
                </span>
                <span className="nb-row" style={{ gap: 8 }}>
                  <Icon name="calendar" size={20} />
                  Đăng ngày {fmtDate(post.publishedAt || new Date().toISOString())}
                </span>
              </div>
            </div>
          </section>
          <article className="nb-preview-article">
            <div>
              {post.thumbnailUrl && <img className="cover" src={post.thumbnailUrl} alt="" />}
              {post.summary && <p className="lead">{post.summary}</p>}
              <Markdown source={post.content} />
              <div className="nb-row" style={{ background: '#E4EFE2', borderRadius: 28, padding: 32, gap: 24, justifyContent: 'space-between' }}>
                <div style={{ flex: '1 1 320px' }}>
                  <h2 className="nb-h2" style={{ fontSize: 26, lineHeight: '36px' }}>
                    Cô chú cần đi khám?
                  </h2>
                  <p style={{ fontSize: 18, lineHeight: '29px' }}>Đăng nhập rồi đặt lịch, có ngay phiếu khám. Hoặc gọi {CLINIC.phone}.</p>
                </div>
                <span className="nb-btn nb-btn-primary" style={{ minHeight: 56, fontSize: 19 }} aria-disabled="true">
                  <Icon name="calendarPlus" />
                  Đặt lịch khám
                </span>
              </div>
            </div>
          </article>
        </>
      )}
    </div>
  );
}
