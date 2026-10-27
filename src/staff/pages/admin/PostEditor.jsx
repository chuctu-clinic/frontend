import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon.jsx';
import { ErrorAlert, Loading } from '../../../shared/components/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { fmtDate, todayVN } from '../../../shared/lib/format.js';
import { useSession } from '../../../shared/lib/session.jsx';
import { useDocumentTitle } from '../../../shared/lib/useAsync.js';
import { FieldError, Notice } from '../../components/t-ui.jsx';
import { hasContent, toEditorHtml, uploadImage } from './postHtml.js';
import './admin.css';

// Trình soạn thảo khá nặng nên chỉ tải khi mở trang soạn bài
const RichEditor = lazy(() => import('./RichEditor.jsx').then((m) => ({ default: m.RichEditor })));

/** Tải trình soạn thảo lỗi (mất mạng, vừa cập nhật phiên bản…): báo lỗi ngay tại khung thay vì làm trắng cả trang. */
class EditorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="ed-wrap ed-failed" role="alert">
        <p>Không tải được khung soạn bài. Vui lòng tải lại trang.</p>
        <button type="button" className="ed-word" onClick={() => window.location.reload()}>
          Tải lại trang
        </button>
      </div>
    );
  }
}

const DEFAULT_AUTHOR = 'Phòng khám Chúc Từ';
const SUMMARY_MAX = 300;

/** Bản nháp đang sửa, giữ tạm khi mở trang Xem thử rồi quay lại. */
export const draftKey = (id) => `ct-post-draft:${id || 'new'}`;
export function readDraft(id) {
  try {
    return JSON.parse(sessionStorage.getItem(draftKey(id)) || 'null');
  } catch {
    return null;
  }
}
export function clearDraft(id) {
  try {
    sessionStorage.removeItem(draftKey(id));
  } catch {
    /* trình duyệt không cho lưu tạm */
  }
}

/** Ngày đăng (yyyy-mm-dd, giờ Việt Nam) → ISO; giữ nguyên giờ đăng cũ nếu cùng ngày. */
function publishedIso(date, previous) {
  if (!date) return null;
  if (previous && fmtDate(previous).split('/').reverse().join('-') === date) return previous;
  return new Date(`${date}T08:00:00+07:00`).toISOString();
}

export function toPayload(form, status) {
  return {
    title: form.title.trim(),
    category: form.category,
    authorName: form.authorName.trim(),
    thumbnailUrl: form.thumbnailUrl || null,
    content: form.content,
    summary: form.summary.trim(),
    publishedAt: publishedIso(form.date, form.publishedAt),
    status,
  };
}

/** Bắt buộc khi công khai: tiêu đề, mô tả, nội dung, tác giả, ngày đăng, ảnh thu nhỏ. Lưu nháp chỉ cần tiêu đề. */
export function checkPost(form, full) {
  const errs = { title: !form.title.trim() };
  if (full) {
    errs.summary = !form.summary.trim();
    errs.content = !hasContent(form.content);
    errs.authorName = !form.authorName.trim();
    errs.date = !form.date;
    errs.thumbnail = !form.thumbnailUrl;
  }
  return errs;
}

function fromPost(p) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary || '',
    category: p.category,
    authorName: p.authorName || DEFAULT_AUTHOR,
    thumbnailUrl: p.thumbnailUrl || '',
    content: toEditorHtml(p.content),
    status: p.status,
    publishedAt: p.publishedAt,
    date: p.publishedAt ? fmtDate(p.publishedAt).split('/').reverse().join('-') : todayVN(),
  };
}

const IDS = { title: 'bv-tieude', summary: 'bv-mota', content: 'bv-noidung', authorName: 'bv-tacgia', date: 'bv-thoigian', thumbnail: 'bv-anh-btn' };

/** Soạn và sửa bài viết (UC.5.1, UC.5.2, UC.5.5), theo prototype "Admin-SoanBaiViet", "Admin-SuaBaiViet". */
export default function PostEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();
  const { meta } = useSession();
  useDocumentTitle(isNew ? 'Soạn bài viết' : 'Sửa bài viết');
  const [form, setForm] = useState(null);
  const [errs, setErrs] = useState({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(location.state?.notice || null);
  const [editorKey, setEditorKey] = useState(0);
  const thumbRef = useRef(null);

  // Vừa tạo bài xong: trang chuyển từ /moi sang /:id nhưng vẫn là component này, nên nhận thông báo ở đây
  useEffect(() => {
    if (location.state?.notice) setNotice(location.state.notice);
  }, [location.state]);

  useEffect(() => {
    // Quay lại từ trang Xem thử: dùng bản đang sửa dở
    const draft = readDraft(id);
    clearDraft(id);
    if (draft) {
      // Bản nháp lưu từ trước khi có ô Mô tả
      setForm({ summary: '', ...draft });
      return;
    }
    if (isNew) {
      setForm({ title: '', summary: '', category: 'TIN_TUC', authorName: DEFAULT_AUTHOR, thumbnailUrl: '', content: '', status: 'DRAFT', date: todayVN(), publishedAt: null });
      return;
    }
    api
      .get(`/admin/posts/${id}`)
      .then(({ post }) => setForm(fromPost(post)))
      .catch(setError);
  }, [id, isNew]);

  if (!form) return error ? <ErrorAlert error={error} /> : <Loading />;

  const fixedPage = Boolean(form.slug);
  const contentLabel = (
    <span id="bv-nd-lb" className="t-label">
      Nội dung <span className="t-req">*</span>
    </span>
  );
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errs[k]) setErrs((e) => ({ ...e, [k]: false }));
  };

  const fail = (found) => {
    setErrs(found);
    setNotice(null);
    const first = Object.keys(IDS).find((k) => found[k]);
    document.getElementById(IDS[first])?.focus();
  };

  const save = async (status) => {
    const found = checkPost(form, status === 'PUBLISHED');
    if (Object.values(found).some(Boolean)) return fail(found);
    setPending(true);
    setError(null);
    try {
      const payload = toPayload(form, status);
      const res = isNew ? await api.post('/admin/posts', payload) : await api.put(`/admin/posts/${id}`, payload);
      const message =
        status === 'PUBLISHED' && form.status !== 'PUBLISHED'
          ? 'Đã công khai bài viết. Bài này giờ hiển thị trên website trong danh mục đã chọn.'
          : status === 'DRAFT'
            ? 'Đã lưu bản nháp.'
            : 'Đã lưu thay đổi.';
      setErrs({});
      if (isNew) {
        navigate(`/noi-bo/quan-tri/bai-viet/${res.post.id}`, { replace: true, state: { notice: message } });
        return;
      }
      setForm(fromPost(res.post));
      setEditorKey((k) => k + 1);
      setNotice(message);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  const pickThumb = async (file) => {
    setError(null);
    try {
      setErrs((e) => ({ ...e, thumbnail: false }));
      const url = await uploadImage(file, 1200);
      setForm((f) => ({ ...f, thumbnailUrl: url }));
    } catch (err) {
      setError(err);
    }
  };

  const preview = () => {
    try {
      sessionStorage.setItem(draftKey(id), JSON.stringify(form));
    } catch {
      /* trình duyệt không cho lưu tạm: vẫn xem thử bản đã lưu */
    }
    navigate(isNew ? '/noi-bo/quan-tri/bai-viet/xem-thu' : `/noi-bo/quan-tri/bai-viet/${id}/xem-thu`, { state: { from: 'editor' } });
  };

  const categories = (meta?.postCategories || []).filter((c) => fixedPage || c.value !== 'TRANG');
  const statusChip =
    form.status === 'PUBLISHED' ? (
      <span className="a-status-chip green">
        <Icon name="checkCircle" size={20} />
        Đã công khai
      </span>
    ) : form.status === 'HIDDEN' ? (
      <span className="a-status-chip gold">
        <Icon name="eye" size={20} />
        Đã ẩn
      </span>
    ) : (
      <span className="a-status-chip">
        <Icon name="edit" size={20} />
        Đang ở bản nháp
      </span>
    );

  return (
    <>
      <Link to="/noi-bo/quan-tri/bai-viet" className="t-back">
        <Icon name="arrowLeft" size={22} />
        Quay lại danh sách bài viết
      </Link>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="t-h1">{isNew ? 'Soạn bài viết' : 'Sửa bài viết'}</h1>
        {statusChip}
      </div>
      {notice && <Notice onClose={() => setNotice(null)}>{notice}</Notice>}
      <ErrorAlert error={error} />

      <div className="a-editor-grid">
        <form className="a-editor-main" noValidate onSubmit={(e) => e.preventDefault()}>
          <div className="t-field">
            <label htmlFor="bv-tieude" className="t-label">
              Tiêu đề <span className="t-req">*</span>
            </label>
            <input
              id="bv-tieude"
              className="t-input a-title-input"
              placeholder="Viết ngắn gọn, nói rõ bài này về việc gì"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              aria-invalid={errs.title ? 'true' : 'false'}
              aria-describedby="bv-tieude-loi"
            />
            <FieldError id="bv-tieude-loi">{errs.title && 'Vui lòng nhập tiêu đề.'}</FieldError>
          </div>
          <div className="t-field">
            <label htmlFor="bv-mota" className="t-label">
              Mô tả <span className="t-req">*</span>
            </label>
            <textarea
              id="bv-mota"
              className="t-input a-desc-input"
              rows={3}
              maxLength={SUMMARY_MAX}
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              aria-invalid={errs.summary ? 'true' : 'false'}
              aria-describedby="bv-mota-loi bv-mota-note"
            />
            <FieldError id="bv-mota-loi">{errs.summary && 'Vui lòng nhập mô tả.'}</FieldError>
            <p id="bv-mota-note" className="t-muted a-desc-note">
              <span>Hai, ba câu nói bài này về việc gì. Hiện dưới tiêu đề ở trang bài viết và trên thẻ bài ở trang chủ, trang tin tức.</span>
              <span aria-live="polite">
                {form.summary.length}/{SUMMARY_MAX}
              </span>
            </p>
          </div>
          <div className="t-field">
            <EditorBoundary>
              <Suspense
                fallback={
                  <>
                    <div className="ed-head">{contentLabel}</div>
                    <div className="ed-wrap ed-loading">
                      <Loading />
                    </div>
                  </>
                }
              >
                <RichEditor
                  label={contentLabel}
                  key={editorKey}
                  id="bv-noidung"
                  labelledBy="bv-nd-lb"
                  describedBy="bv-noidung-loi"
                  initialHtml={form.content}
                  invalid={errs.content}
                  onChange={(html) => set('content', html)}
                  onError={setError}
                  onNotice={(m) => {
                    setError(null);
                    setNotice(m);
                  }}
                />
              </Suspense>
            </EditorBoundary>
            <FieldError id="bv-noidung-loi">{errs.content && 'Vui lòng nhập nội dung bài viết.'}</FieldError>
            <p className="t-muted">Bài phải có đủ tiêu đề, mô tả, danh mục, tác giả, thời gian, ảnh thu nhỏ và nội dung trước khi công khai.</p>
          </div>
        </form>

        <aside className="a-editor-side">
          <div className="a-side-card">
            <h2 className="t-h2">Thông tin bài viết</h2>
            <div className="t-field">
              <label htmlFor="bv-cm" className="t-label">
                Danh mục <span className="t-req">*</span>
              </label>
              <select id="bv-cm" className="t-select" value={form.category} disabled={fixedPage} onChange={(e) => set('category', e.target.value)}>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="t-muted">
                {fixedPage ? 'Đây là trang thông tin cố định của website, không đổi được danh mục và không xoá được.' : 'Danh mục quyết định bài hiện ở mục nào trên menu.'}
              </p>
            </div>
            <div className="t-field">
              <label htmlFor="bv-tacgia" className="t-label">
                Tác giả <span className="t-req">*</span>
              </label>
              <input
                id="bv-tacgia"
                className="t-input"
                value={form.authorName}
                onChange={(e) => set('authorName', e.target.value)}
                aria-invalid={errs.authorName ? 'true' : 'false'}
                aria-describedby="bv-tacgia-loi"
              />
              <FieldError id="bv-tacgia-loi">{errs.authorName && 'Vui lòng nhập tên tác giả.'}</FieldError>
            </div>
            <div className="t-field">
              <label htmlFor="bv-thoigian" className="t-label">
                Thời gian đăng <span className="t-req">*</span>
              </label>
              <input
                id="bv-thoigian"
                type="date"
                className="t-input"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                aria-invalid={errs.date ? 'true' : 'false'}
                aria-describedby="bv-thoigian-ghichu bv-thoigian-loi"
              />
              {isNew && (
                <p id="bv-thoigian-ghichu" className="t-muted">
                  Mặc định là hôm nay ({fmtDate(todayVN())}). Chọn ngày khác nếu cần.
                </p>
              )}
              <FieldError id="bv-thoigian-loi">{errs.date && 'Vui lòng chọn ngày đăng.'}</FieldError>
            </div>
          </div>

          <div className="a-side-card" style={{ gap: 16 }}>
            <h2 className="t-h2">
              Ảnh thu nhỏ <span className="t-req">*</span>
            </h2>
            <div className="a-thumb-box">
              {form.thumbnailUrl ? (
                <img src={form.thumbnailUrl} alt="Ảnh thu nhỏ hiện tại của bài viết" />
              ) : (
                <div role="img" aria-label="Bài chưa có ảnh thu nhỏ" className={`a-thumb-none ${errs.thumbnail ? 'invalid' : ''}`}>
                  <Icon name="file" size={32} strokeWidth={1.5} />
                  Chưa có ảnh thu nhỏ
                </div>
              )}
              <button
                id="bv-anh-btn"
                type="button"
                className="a-thumb-btn"
                aria-label={form.thumbnailUrl ? 'Đổi ảnh thu nhỏ' : 'Chọn ảnh thu nhỏ'}
                title={form.thumbnailUrl ? 'Đổi ảnh thu nhỏ' : 'Chọn ảnh thu nhỏ'}
                aria-describedby="bv-anh-loi"
                onClick={() => thumbRef.current.click()}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
              </button>
              <input
                ref={thumbRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) pickThumb(f);
                }}
              />
            </div>
            <FieldError id="bv-anh-loi">{errs.thumbnail && 'Vui lòng chọn ảnh thu nhỏ.'}</FieldError>
          </div>

          <div className="a-side-actions">
            {form.status === 'DRAFT' && (
              <>
                <button type="button" className="t-btn t-btn-primary" disabled={pending} onClick={() => save('PUBLISHED')}>
                  <Icon name="checkCircle" />
                  Công khai bài viết
                </button>
                <button type="button" className="t-btn t-btn-ghost" disabled={pending} onClick={() => save('DRAFT')}>
                  <Icon name="file" />
                  Lưu bản nháp
                </button>
              </>
            )}
            {form.status !== 'DRAFT' && (
              <button type="button" className="t-btn t-btn-primary" disabled={pending} onClick={() => save(form.status)}>
                <Icon name="check" />
                Lưu thay đổi
              </button>
            )}
            {form.status === 'HIDDEN' && (
              <button type="button" className="t-btn t-btn-ghost" disabled={pending} onClick={() => save('PUBLISHED')}>
                <Icon name="checkCircle" />
                Công khai bài viết
              </button>
            )}
            <button type="button" className="t-btn" style={{ background: 'transparent', color: 'var(--green-700)', textDecoration: 'underline' }} onClick={preview}>
              <Icon name="eye" />
              Xem thử như người đọc
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
