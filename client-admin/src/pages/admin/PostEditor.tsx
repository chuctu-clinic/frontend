import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, ErrorAlert, Loading, PageHeader, SelectInput, TextArea, TextInput, type InputEvent } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { PostArticle } from '@chuctu/shared/components/PostArticle.tsx';
import type { Post, PostStatus } from '@chuctu/shared/types.ts';

interface PostForm {
  id?: string;
  title: string;
  category: string;
  summary: string;
  thumbnailUrl: string;
  authorName: string;
  content: string;
  status: PostStatus;
  slug: string | null;
  publishedAt?: string | null;
}

const EMPTY: PostForm = { title: '', category: 'TIN_TUC', summary: '', thumbnailUrl: '', authorName: '', content: '', status: 'DRAFT', slug: null };

const toForm = (post: Post): PostForm => ({ ...post, thumbnailUrl: post.thumbnailUrl || '', summary: post.summary || '', content: post.content ?? '' });

/** Tạo và sửa bài viết: lưu nháp, xem thử rồi mới đăng (UC.5.1, UC.5.2, UC.5.5). */
export default function PostEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { user, meta } = useSession();
  useDocumentTitle(isNew ? 'Viết bài mới' : 'Sửa bài viết');
  const [form, setForm] = useState<PostForm | null>(isNew ? { ...EMPTY, authorName: user?.fullName ?? '' } : null);
  const [preview, setPreview] = useState(false);
  const [pending, setPending] = useState<PostStatus | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    api
      .get<{ post: Post }>(`/admin/posts/${id}`)
      .then(({ post }) => setForm(toForm(post)))
      .catch(setError);
  }, [id, isNew]);

  const set = (k: keyof PostForm) => (e: InputEvent) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));
  const fe = error?.fields || {};
  const isPage = form?.category === 'TRANG';

  const save = async (status: PostStatus) => {
    if (!form) return;
    setPending(status);
    setError(null);
    setNotice(null);
    const payload = {
      title: form.title,
      category: form.category,
      summary: form.summary,
      thumbnailUrl: form.thumbnailUrl || null,
      authorName: form.authorName,
      content: form.content,
      status,
    };
    try {
      const res = isNew ? await api.post<{ post: Post }>('/admin/posts', payload) : await api.put<{ post: Post }>(`/admin/posts/${id}`, payload);
      setForm(toForm(res.post));
      setNotice(status === 'PUBLISHED' ? 'Đã đăng bài viết lên website.' : 'Đã lưu bản nháp. Bản nháp chỉ quản trị viên xem được.');
      if (isNew) navigate(`/quan-tri/bai-viet/${res.post.id}`, { replace: true });
    } catch (err) {
      setError(err as ApiError);
      setPreview(false);
    } finally {
      setPending(null);
    }
  };

  if (!form) return error ? <ErrorAlert error={error} /> : <Loading />;

  const publicUrl = form.slug ? `/${form.slug}` : form.id ? `/tin-tuc/${form.id}` : null;

  return (
    <div className="stack" style={{ maxWidth: 960 }}>
      <p className="small">
        <Link to="/quan-tri/bai-viet">← Quản lý bài viết</Link>
      </p>
      <PageHeader
        title={isNew ? 'Viết bài mới' : preview ? 'Xem thử bài viết' : 'Sửa bài viết'}
        subtitle={form.status === 'PUBLISHED' ? 'Bài viết đang hiện trên website.' : 'Bản nháp — chưa hiện trên website.'}
        actions={
          <Button variant="secondary" icon={preview ? 'edit' : 'eye'} onClick={() => setPreview((v) => !v)}>
            {preview ? 'Quay lại sửa' : 'Xem thử'}
          </Button>
        }
      />
      {notice && (
        <Alert type="success">
          {notice}{' '}
          {form.status === 'PUBLISHED' && publicUrl && (
            <Link to={publicUrl} target="_blank">
              Mở trên website
            </Link>
          )}
        </Alert>
      )}
      {error && <ErrorAlert error={error} />}

      {preview ? (
        <div className="card card-lg">
          <PostArticle post={{ ...form, categoryLabel: meta?.postCategories.find((c) => c.value === form.category)?.label, publishedAt: form.publishedAt || new Date().toISOString() }} />
        </div>
      ) : (
        <form className="card card-lg stack" onSubmit={(e) => e.preventDefault()} noValidate>
          {isPage && <Alert type="info">Đây là trang thông tin cố định ({publicUrl}). Chỉ sửa được nội dung, không đổi chuyên mục và không xoá.</Alert>}
          <TextInput label="Tiêu đề" required value={form.title} onChange={set('title')} error={fe.title} />
          <div className="form-grid">
            <SelectInput
              label="Chuyên mục"
              required
              disabled={isPage}
              options={(meta?.postCategories || []).filter((c) => isPage || c.value !== 'TRANG')}
              value={form.category}
              onChange={set('category')}
              error={fe.category}
            />
            <TextInput label="Tác giả" required value={form.authorName} onChange={set('authorName')} error={fe.authorName} />
          </div>
          <TextArea label="Tóm tắt" hint="Một hai câu hiện ở danh sách bài viết." rows={2} value={form.summary} onChange={set('summary')} error={fe.summary} />
          <TextInput
            label="Ảnh thu nhỏ (đường dẫn ảnh)"
            type="url"
            placeholder="https://…"
            hint="Dán đường dẫn ảnh đã tải lên nơi lưu trữ. Bỏ trống thì hiện biểu tượng lá."
            value={form.thumbnailUrl}
            onChange={set('thumbnailUrl')}
            error={fe.thumbnailUrl}
          />
          <TextArea
            label="Nội dung"
            required
            hint="Viết theo định dạng Markdown: ## Tiêu đề mục, **chữ đậm**, - gạch đầu dòng."
            rows={16}
            value={form.content}
            onChange={set('content')}
            error={fe.content}
          />
        </form>
      )}
      <div className="row">
        <Button variant="secondary" icon="file" loading={pending === 'DRAFT'} onClick={() => save('DRAFT')} disabled={isPage && form.status === 'PUBLISHED'}>
          {form.status === 'PUBLISHED' ? 'Chuyển về bản nháp' : 'Lưu bản nháp'}
        </Button>
        <Button icon="check" loading={pending === 'PUBLISHED'} onClick={() => save('PUBLISHED')}>
          {form.status === 'PUBLISHED' ? 'Lưu và cập nhật trên website' : 'Đăng bài viết'}
        </Button>
      </div>
    </div>
  );
}
