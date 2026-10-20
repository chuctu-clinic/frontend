import { useParams } from 'react-router-dom';
import { PostArticle } from '@chuctu/shared/components/PostArticle.tsx';
import { Breadcrumb, ButtonLink, Empty, Loading } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { Post } from '@chuctu/shared/types.ts';

export default function PostDetail() {
  const { id } = useParams();
  const { data, loading, error } = useAsync(() => api.get<{ post: Post }>(`/posts/${id}`), [id]);
  useDocumentTitle(data?.post?.title || 'Bài viết');

  return (
    <div className="page">
      <div className="container container-narrow">
        <Breadcrumb items={[{ to: '/', label: 'Trang chủ' }, { to: '/tin-tuc', label: 'Tin tức' }, { label: data?.post?.title || 'Bài viết' }]} />
        {loading && <Loading />}
        {error && (
          <Empty icon="news" title="Không tìm thấy bài viết" action={<ButtonLink to="/tin-tuc" variant="secondary">Xem các bài viết khác</ButtonLink>}>
            Bài viết không tồn tại hoặc chưa được đăng.
          </Empty>
        )}
        {data?.post && <PostArticle post={data.post} />}
      </div>
    </div>
  );
}
