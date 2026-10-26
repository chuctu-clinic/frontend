import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { Loading } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { CLINIC, fmtDate } from '@chuctu/shared/lib/format.js';
import { useSession } from '@chuctu/shared/lib/session.jsx';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { checkPost, clearDraft, readDraft, toPayload } from './PostEditor.jsx';
import { toEditorHtml } from './RichEditor.jsx';
import '../../components/staff.css';
import './admin.css';

const NAV = ['Giới thiệu', 'Dịch vụ', 'Tin tức', 'Hướng dẫn', 'Liên hệ'];

/**
 * Xem thử bài viết đúng như người đọc thấy trên website, kèm thanh xem thử chỉ quản trị viên thấy
 * (prototype "Admin-XemThuBaiViet"). Mở từ trang soạn bài (bản đang sửa) hoặc từ danh sách (bản đã lưu).
 */
export default function PostPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { meta } = useSession();
  const [post, setPost] = useState(null);
  const [fromEditor, setFromEditor] = useState(false);
  const [published, setPublished] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  useDocumentTitle(post ? `Xem thử: ${post.title || 'Bài viết'}` : 'Xem thử bài viết');

  useEffect(() => {
    const draft = location.state?.from === 'editor' ? readDraft(id) : null;
    if (draft) {
      setPost(draft);
      setFromEditor(true);
      return;
    }
    if (!id) {
      navigate('/quan-tri/bai-viet/moi', { replace: true });
      return;
    }
    api
      .get(`/admin/posts/${id}`)
      .then(({ post: p }) => setPost({ ...p, date: p.publishedAt ? fmtDate(p.publishedAt).split('/').reverse().join('-') : null }))
      .catch((err) => setError(err.message));
  }, [id, location.state, navigate]);

  if (!post) return error ? <p style={{ padding: 24 }}>{error}</p> : <Loading />;

  const back = () => {
    if (fromEditor) navigate(id ? `/quan-tri/bai-viet/${id}` : '/quan-tri/bai-viet/moi');
    else navigate('/quan-tri/bai-viet');
  };

  const publish = async () => {
    setError(null);
    if (fromEditor) {
      const missing = checkPost(post, true);
      if (Object.values(missing).some(Boolean)) {
        setError('Bài còn thiếu thông tin bắt buộc nên chưa công khai được. Bấm Quay lại sửa bài để bổ sung.');
        return;
      }
    }
    setPending(true);
    try {
      if (fromEditor) {
        const payload = toPayload(post, 'PUBLISHED');
        if (id) await api.put(`/admin/posts/${id}`, payload);
        else await api.post('/admin/posts', payload);
        clearDraft(id);
      } else {
        await api.put(`/admin/posts/${id}`, { status: 'PUBLISHED' });
      }
      setPublished(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  const categoryLabel = post.categoryLabel || meta?.postCategories.find((c) => c.value === post.category)?.label || '';
  const date = post.date ? fmtDate(post.date) : fmtDate(new Date());
  const canPublish = post.status !== 'PUBLISHED' && !published;

  return (
    <div className="pv t-vars">
      <div role="region" aria-label="Thanh xem thử" className="pv-bar">
        <div className="pv-bar-row">
          <span className="pv-badge">
            <Icon name="eye" size={20} />
            Đang xem thử
          </span>
          {published && (
            <p role="status" style={{ flex: '1 1 320px', fontWeight: 600, color: '#fff', lineHeight: '24px' }}>
              Đã công khai bài viết. Người đọc đã xem được bài này trên website.
            </p>
          )}
          {error && (
            <p role="alert" style={{ flex: '1 1 320px', fontWeight: 600, color: '#f7ebd2', lineHeight: '24px' }}>
              {error}
            </p>
          )}
          <div className="pv-bar-acts">
            {!published && (
              <button type="button" className="pv-back" onClick={back}>
                <Icon name="arrowLeft" size={20} />
                {fromEditor ? 'Quay lại sửa bài' : 'Quay lại danh sách'}
              </button>
            )}
            {canPublish && (
              <button type="button" className="pv-pub" disabled={pending} onClick={publish}>
                <Icon name="checkCircle" size={20} />
                Công khai bài viết
              </button>
            )}
            {published && (
              <button type="button" className="pv-pub" onClick={() => navigate('/quan-tri/bai-viet')}>
                Về danh sách bài viết
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Phần dưới đây giống hệt trang công khai; các liên kết chỉ để minh hoạ nên không bấm được */}
      <header className="pv-header" aria-hidden="true">
        <div className="pv-header-row">
          <span className="pv-logo">
            <img src={`${import.meta.env.BASE_URL}logo-192.png`} alt="" />
            <span>
              <span className="pv-logo-name">Chúc Từ</span>
              <span className="pv-logo-tag">Y học cổ truyền từ thiện</span>
            </span>
          </span>
          <span className="pv-nav">
            {NAV.map((n) => (
              <span key={n} className={n === 'Tin tức' ? 'on' : ''}>
                {n}
              </span>
            ))}
          </span>
        </div>
      </header>

      <main>
        <section className="pv-hero">
          <div className="pv-wrap">
            <p className="pv-crumb">
              <span>Trang chủ</span>
              <span>Bài viết</span>
              <span>{categoryLabel}</span>
            </p>
            <span className="pv-cat">{categoryLabel}</span>
            <h1 className="pv-title">{post.title || 'Chưa có tiêu đề'}</h1>
            <div className="pv-meta">
              <span>
                <Icon name="user" size={20} strokeWidth={1.75} />
                {post.authorName}
              </span>
              <span>
                <Icon name="calendar" size={20} strokeWidth={1.75} />
                Đăng ngày {date}
              </span>
            </div>
          </div>
        </section>
        <article className="pv-article">
          <div className="pv-wrap">
            {post.thumbnailUrl && <img src={post.thumbnailUrl} alt="" className="pv-cover" />}
            <div className="pv-body" dangerouslySetInnerHTML={{ __html: toEditorHtml(post.content) }} />
            <div className="pv-cta" aria-hidden="true">
              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                <h2>Cô chú cần đi khám?</h2>
                <p style={{ fontSize: 18, lineHeight: '29px' }}>Đăng nhập rồi đặt lịch, có ngay phiếu khám.</p>
              </div>
              <span className="pv-cta-btn">
                <Icon name="calendarPlus" />
                Đặt lịch khám
              </span>
            </div>
          </div>
        </article>
      </main>

      <footer className="pv-footer" aria-hidden="true">
        <div className="pv-foot-cards">
          <div className="pv-foot-card">
            <span>
              <Icon name="map" />
            </span>
            <div>
              <h3>Địa chỉ phòng khám</h3>
              <p>{CLINIC.address}</p>
            </div>
          </div>
          <div className="pv-foot-card">
            <span>
              <Icon name="clock" />
            </span>
            <div>
              <h3>Giờ khám</h3>
              <p>
                Tất cả các ngày trong tuần,
                <br />
                kể cả Chủ Nhật: <strong>{CLINIC.hours}</strong>
              </p>
            </div>
          </div>
          <div className="pv-foot-card">
            <span>
              <Icon name="phone" />
            </span>
            <div>
              <h3>Gọi cho phòng khám</h3>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--green-700)' }}>{CLINIC.phone}</p>
            </div>
          </div>
        </div>
        <div className="pv-foot-bottom">
          <div>
            <p>© {new Date().getFullYear()} Phòng chẩn trị Y học cổ truyền từ thiện Chúc Từ.</p>
            <p style={{ maxWidth: '60ch' }}>Thông tin trên trang chỉ mang tính tham khảo, không thay thế chẩn đoán của thầy thuốc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
