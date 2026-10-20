import { fmtDate } from '../lib/format.js';
import { Markdown } from './Markdown.jsx';

export function PostArticle({ post }) {
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
