import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Breadcrumb, Empty, Loading, PageHeader, Pagination } from '@chuctu/shared/components/ui.tsx';
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

export function PostCard({ post }: { post: Post }) {
  return (
    <Link to={`/tin-tuc/${post.id}`} className="card card-link stack-sm">
      <div className="post-thumb">
        {post.thumbnailUrl ? <img src={post.thumbnailUrl} alt="" loading="lazy" /> : <Icon name="leaf" size={44} />}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <span className="badge badge-gold">{post.categoryLabel}</span>
        <span className="caption">{fmtDate(post.publishedAt)}</span>
      </div>
      <h3>{post.title}</h3>
      {post.summary && <p className="small">{post.summary}</p>}
      <span className="row" style={{ gap: 6, color: 'var(--green-700)', fontWeight: 600 }}>
        Đọc thêm <Icon name="arrowRight" size={20} />
      </span>
    </Link>
  );
}

export default function PostList() {
  useDocumentTitle('Tin tức');
  const [params, setParams] = useSearchParams();
  const category = params.get('chuyen-muc') || '';
  const page = Number(params.get('trang') || 1);
  const { data, loading } = useAsync(() => api.get<Paged<Post>>(`/posts${qs({ category, page, limit: 9 })}`), [category, page]);

  const set = (next: { 'chuyen-muc'?: string; trang?: number }) =>
    setParams(cleanParams({ 'chuyen-muc': category, trang: page, ...next }));

  return (
    <div className="page">
      <div className="container stack">
        <Breadcrumb items={[{ to: '/', label: 'Trang chủ' }, { label: 'Tin tức' }]} />
        <PageHeader title="Tin tức và bài viết" subtitle="Thông báo, hướng dẫn và hoạt động thiện nguyện của phòng khám." />
        <div className="tabs" role="group" aria-label="Chuyên mục">
          {CATEGORIES.map(([value, label]) => (
            <button key={value} type="button" className="tab" aria-pressed={category === value} onClick={() => set({ 'chuyen-muc': value, trang: 1 })}>
              {label}
            </button>
          ))}
        </div>
        {loading && <Loading />}
        {data && data.items.length === 0 && <Empty icon="news" title="Chưa có bài viết trong chuyên mục này" />}
        {data && data.items.length > 0 && (
          <>
            <div className="grid-3">
              {data.items.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
            <Pagination page={page} total={data.total} limit={data.limit} onPage={(p) => set({ trang: p })} />
          </>
        )}
      </div>
    </div>
  );
}
