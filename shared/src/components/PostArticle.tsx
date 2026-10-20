import { fmtDate } from '../lib/format.ts';
import type { Post } from '../types.ts';
import { Markdown } from './Markdown.tsx';

export function PostArticle({ post }: { post: Pick<Post, 'authorName' | 'title' | 'summary' | 'thumbnailUrl' | 'content'> & Partial<Pick<Post, 'categoryLabel' | 'publishedAt' | 'updatedAt'>> }) {
  return (
    <article className="stack">
      <div className="row" style={{ gap: 8 }}>
        <span className="badge badge-gold">{post.categoryLabel}</span>
        <span className="caption">
          {post.authorName} · {fmtDate(post.publishedAt || post.updatedAt)}
        </span>
      </div>
      <h1>{post.title}</h1>
      {post.summary && <p className="lead">{post.summary}</p>}
      {post.thumbnailUrl && (
        <img src={post.thumbnailUrl} alt="" style={{ borderRadius: 'var(--radius-xl)', width: '100%', maxHeight: 460, objectFit: 'cover' }} />
      )}
      <Markdown source={post.content} />
    </article>
  );
}
