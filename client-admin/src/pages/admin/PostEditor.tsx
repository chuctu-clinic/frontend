import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon, type IconName } from '@chuctu/shared/components/Icon.tsx';
import { api, type ApiError } from '@chuctu/shared/lib/api.ts';
import { fmtDate, todayVN } from '@chuctu/shared/lib/format.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { Post, PostStatus } from '@chuctu/shared/types.ts';
import { NbError, NbField, NbLoading, NbOk } from '../../components/nb.tsx';
import { PostStatusPill } from './Posts.tsx';

export interface PostForm {
  id?: string;
  title: string;
  category: string;
  summary: string;
  thumbnailUrl: string;
  authorName: string;
  content: string;
  status: PostStatus;
  slug: string | null;
  /** Ngày đăng YYYY-MM-DD. */
  publishDate: string;
  publishedAt?: string | null;
}

const toForm = (post: Post): PostForm => ({
  ...post,
  thumbnailUrl: post.thumbnailUrl || '',
  summary: post.summary || '',
  content: post.content ?? '',
  publishDate: (post.publishedAt || new Date(Date.now() + 7 * 3600_000).toISOString()).slice(0, 10),
});

/** Ngày đăng thành thời điểm gửi lên API: hôm nay là bây giờ, ngày khác là 8:00 sáng ngày đó. */
const publishedAtOf = (date: string) => (date === todayVN() ? new Date().toISOString() : `${date}T08:00:00+07:00`);

/** Dữ liệu gửi lên API khi lưu bài. */
export function postPayload(form: PostForm, status: PostStatus) {
  return {
    title: form.title.trim(),
    category: form.category,
    summary: form.summary,
    thumbnailUrl: form.thumbnailUrl.trim() || null,
    authorName: form.authorName,
    content: form.content,
    status,
    publishedAt: status === 'PUBLISHED' && form.publishDate ? publishedAtOf(form.publishDate) : undefined,
  };
}

/** Khoá lưu tạm bài đang soạn để trang Xem thử đọc lại. */
export const PREVIEW_KEY = 'ct-xem-thu-bai';

type Tool = { icon?: IconName; text?: string; label: string; before: string; after?: string; line?: boolean };
const TOOLS: (Tool | '|')[] = [
  { text: 'B', label: 'Chữ đậm', before: '**', after: '**' },
  { text: 'I', label: 'Chữ nghiêng', before: '_', after: '_' },
  '|',
  { icon: 'list', label: 'Danh sách dấu chấm', before: '- ', line: true },
  { text: '1.', label: 'Danh sách đánh số', before: '1. ', line: true },
  { icon: 'chat', label: 'Trích dẫn', before: '> ', line: true },
  '|',
  { icon: 'external', label: 'Chèn liên kết', before: '[', after: '](https://)' },
  { icon: 'file', label: 'Chèn ảnh', before: '![Mô tả ảnh](', after: ')' },
];

/** Soạn và sửa bài viết: lưu nháp, xem thử rồi mới công khai (UC.5.1, UC.5.2, UC.5.5). */
export default function PostEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { user, meta } = useSession();
  useDocumentTitle(isNew ? 'Soạn bài viết' : 'Sửa bài viết');
  const [form, setForm] = useState<PostForm | null>(
    isNew ? { title: '', category: 'TIN_TUC', summary: '', thumbnailUrl: '', authorName: 'Phòng khám Chúc Từ', content: '', status: 'DRAFT', slug: null, publishDate: todayVN() } : null,
  );
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<PostStatus | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isNew) return;
    api
      .get<{ post: Post }>(`/admin/posts/${id}`)
      .then(({ post }) => setForm(toForm(post)))
      .catch(setError);
  }, [id, isNew]);

  const set = (k: keyof PostForm, value: string) => setForm((f) => (f ? { ...f, [k]: value } : f));

  /** Chèn cú pháp Markdown quanh đoạn đang chọn, hoặc đầu mỗi dòng cho danh sách và trích dẫn. */
  const format = (t: Tool) => {
    const el = textRef.current;
    if (!el || !form) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const picked = value.slice(s, e);
    const insert = t.line ? (picked || 'Nội dung').split('\n').map((l) => t.before + l).join('\n') : `${t.before}${picked || 'chữ'}${t.after ?? ''}`;
    const prefix = t.line && s > 0 && value[s - 1] !== '\n' ? '\n' : '';
    const next = value.slice(0, s) + prefix + insert + value.slice(e);
    set('content', next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + prefix.length, s + prefix.length + insert.length);
    });
  };
  const heading = (level: string) => {
    if (level === 'p') return;
    format({ label: level, before: level === 'h2' ? '## ' : '### ', line: true });
  };

  const validate = (status: PostStatus) => {
    if (!form) return false;
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Vui lòng nhập tiêu đề.';
    if (!form.authorName.trim()) e.authorName = 'Vui lòng nhập tên tác giả.';
    if (status === 'PUBLISHED') {
      if (!form.content.trim()) e.content = 'Vui lòng nhập nội dung bài viết.';
      if (!form.publishDate) e.publishDate = 'Vui lòng chọn ngày đăng.';
    }
    setFields(e);
    return !Object.keys(e).length;
  };

  const save = async (status: PostStatus) => {
    if (!form || !validate(status)) return null;
    setPending(status);
    setError(null);
    setNotice(null);
    try {
      const payload = postPayload(form, status);
      const res = isNew ? await api.post<{ post: Post }>('/admin/posts', payload) : await api.put<{ post: Post }>(`/admin/posts/${id}`, payload);
      setForm(toForm(res.post));
      setNotice(status === 'PUBLISHED' ? 'Đã công khai bài viết. Người đọc đã xem được bài này trên website.' : 'Đã lưu bản nháp. Bản nháp chỉ quản trị viên xem được.');
      if (isNew) navigate(`/quan-tri/bai-viet/${res.post.id}`, { replace: true });
      return res.post;
    } catch (err) {
      const apiErr = err as ApiError;
      setFields(apiErr.fields);
      setError(apiErr);
      return null;
    } finally {
      setPending(null);
    }
  };

  const preview = () => {
    if (!form) return;
    try {
      sessionStorage.setItem(PREVIEW_KEY, JSON.stringify({ ...form, categoryLabel: meta?.postCategories.find((c) => c.value === form.category)?.label ?? '' }));
    } catch {
      // Trình duyệt chặn lưu tạm thì vẫn xem thử bài đã lưu
    }
    navigate(`/quan-tri/bai-viet/xem-thu?ban=1&tu=${isNew ? 'soan' : `sua-${id}`}`);
  };

  if (!form) return error ? <NbError error={error} /> : <NbLoading />;
  const isPage = form.category === 'TRANG';

  return (
    <div className="nb-solo nb-solo-wide">
      <Link to="/quan-tri/bai-viet" className="nb-link" style={{ alignSelf: 'flex-start' }}>
        <Icon name="arrowLeft" size={20} />
        Quay lại danh sách bài viết
      </Link>
      <div className="nb-row" style={{ gap: 20 }}>
        <h1 className="nb-h1">{isNew ? 'Soạn bài viết' : 'Sửa bài viết'}</h1>
        {isNew ? (
          <span className="nb-pill nb-pill-done" style={{ padding: '6px 14px' }}>
            <Icon name="edit" size={18} />
            Đang ở bản nháp
          </span>
        ) : (
          <PostStatusPill post={form} />
        )}
      </div>
      {notice && <NbOk onClose={() => setNotice(null)}>{notice}</NbOk>}
      <NbError error={error && !Object.keys(error.fields).length ? error : null} />
      {isPage && (
        <div className="nb-note">
          <Icon name="info" />
          <p>Đây là trang thông tin cố định của website (/{form.slug}). Chỉ sửa được nội dung, không đổi danh mục và không xoá được.</p>
        </div>
      )}

      <div className="nb-editor-layout">
        <form
          className="nb-card nb-card-lg"
          style={{ padding: 32, gap: 24 }}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save('DRAFT');
          }}
        >
          <NbField label="Tiêu đề" required error={fields.title}>
            {(a) => <input className="nb-input" placeholder="Viết ngắn gọn, nói rõ bài này về việc gì" value={form.title} onChange={(e) => set('title', e.target.value)} {...a} />}
          </NbField>
          <div className="nb-field">
            <span className="nb-label" id="bv-nd-lb">
              Nội dung<span className="nb-req"> *</span>
            </span>
            <div className="nb-editor">
              <div className="nb-toolbar" role="toolbar" aria-label="Định dạng nội dung">
                <select aria-label="Kiểu đoạn" value="p" onChange={(e) => heading(e.target.value)}>
                  <option value="p">Đoạn văn</option>
                  <option value="h2">Tiêu đề lớn</option>
                  <option value="h3">Tiêu đề nhỏ</option>
                </select>
                <span role="separator" />
                {TOOLS.map((t, i) =>
                  t === '|' ? (
                    <span key={`s${i}`} role="separator" />
                  ) : (
                    <button key={t.label} type="button" aria-label={t.label} title={t.label} onClick={() => format(t)}>
                      {t.icon ? <Icon name={t.icon} size={22} /> : <strong style={{ fontStyle: t.text === 'I' ? 'italic' : 'normal', fontSize: 18 }}>{t.text}</strong>}
                    </button>
                  ),
                )}
              </div>
              <textarea ref={textRef} id="bv-noidung" aria-labelledby="bv-nd-lb" aria-invalid={fields.content ? 'true' : undefined} value={form.content} onChange={(e) => set('content', e.target.value)} />
            </div>
            {fields.content && (
              <p className="nb-error" role="alert">
                <Icon name="alert" size={20} />
                {fields.content}
              </p>
            )}
            <p className="nb-hint">Bài phải có đủ tiêu đề, danh mục, tác giả, thời gian và nội dung trước khi công khai. Nên có ảnh thu nhỏ để bài hiện đẹp ở trang Tin tức.</p>
          </div>
        </form>

        <aside>
          <div className="nb-card nb-card-lg" style={{ gap: 20 }}>
            <h2 className="nb-h2">Thông tin bài viết</h2>
            <NbField label="Danh mục" required hint="Danh mục quyết định bài hiện ở mục nào trên website." error={fields.category}>
              {(a) => (
                <select className="nb-select" value={form.category} disabled={isPage} onChange={(e) => set('category', e.target.value)} {...a}>
                  {(meta?.postCategories || []).filter((c) => isPage || c.value !== 'TRANG').map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}
            </NbField>
            <NbField label="Tác giả" required error={fields.authorName}>
              {(a) => <input className="nb-input" value={form.authorName} placeholder={user?.fullName} onChange={(e) => set('authorName', e.target.value)} {...a} />}
            </NbField>
            <NbField label="Thời gian đăng" required hint={`Mặc định là hôm nay (${fmtDate(todayVN())}). Chọn ngày khác nếu cần.`} error={fields.publishDate || fields.publishedAt}>
              {(a) => <input className="nb-input" type="date" value={form.publishDate} onChange={(e) => set('publishDate', e.target.value)} {...a} />}
            </NbField>
            <NbField label="Tóm tắt" optional hint="Một hai câu hiện ở danh sách bài viết." error={fields.summary}>
              {(a) => <textarea className="nb-textarea" rows={3} value={form.summary} onChange={(e) => set('summary', e.target.value)} {...a} />}
            </NbField>
          </div>

          <div className="nb-card nb-card-lg" style={{ gap: 16 }}>
            <h2 className="nb-h2">Ảnh thu nhỏ</h2>
            {form.thumbnailUrl ? (
              <img className="nb-cover" src={form.thumbnailUrl} alt="Ảnh thu nhỏ của bài viết" />
            ) : (
              <div className="nb-cover-empty" role="img" aria-label="Bài chưa có ảnh thu nhỏ">
                <Icon name="file" size={32} />
                Chưa có ảnh thu nhỏ
              </div>
            )}
            <NbField label="Đường dẫn ảnh" hint="Dán đường dẫn ảnh bắt đầu bằng https://" error={fields.thumbnailUrl}>
              {(a) => <input className="nb-input" type="url" value={form.thumbnailUrl} onChange={(e) => set('thumbnailUrl', e.target.value)} {...a} />}
            </NbField>
          </div>

          <div className="nb-card-gold" style={{ borderRadius: 28, padding: 28, gap: 14 }}>
            <button type="button" className="nb-btn nb-btn-primary" disabled={!!pending} onClick={() => save('PUBLISHED')}>
              <Icon name="checkCircle" />
              {form.status === 'PUBLISHED' ? 'Lưu và giữ công khai' : 'Công khai bài viết'}
            </button>
            <button type="button" className="nb-btn nb-btn-ghost" disabled={!!pending} onClick={() => save('DRAFT')}>
              <Icon name="file" />
              {form.status === 'PUBLISHED' ? 'Ẩn và lưu bản nháp' : 'Lưu bản nháp'}
            </button>
            <button type="button" className="nb-link" style={{ justifyContent: 'center' }} onClick={preview}>
              <Icon name="eye" size={20} />
              Xem thử như người đọc
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
