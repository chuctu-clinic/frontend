import { Link } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import './home.css';
import './info.css';

/**
 * Tiêu đề và đoạn giới thiệu của trang thông tin lấy từ bài viết cùng slug (Admin sửa được),
 * thiếu thì dùng chữ của prototype.
 */
export function usePageMeta(slug, fallback) {
  const { data } = useAsync(() => api.get(`/posts/${slug}`).catch(() => null), [slug]);
  const post = data?.post;
  const meta = { title: post?.title || fallback.title, summary: post?.summary || fallback.summary };
  useDocumentTitle(fallback.crumb);
  return meta;
}

/** Dải đầu trang nền be: đường dẫn, tiêu đề, đoạn giới thiệu. */
export function PageHero({ crumb, title, lead, children, aside }) {
  return (
    <section className="i-hero">
      <div className={`h-wrap ${aside ? 'i-hero-split' : 'i-hero-col'}`}>
        <div className="i-hero-text">
          <nav aria-label="Đường dẫn" className="i-crumb">
            <Link to="/">Trang chủ</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{crumb}</span>
          </nav>
          <h1 className="i-h1">{title}</h1>
          {lead && <p className="i-lead">{lead}</p>}
          {children}
        </div>
        {aside}
      </div>
    </section>
  );
}

export function SectionHead({ id, eyebrow, title, lead, size }) {
  return (
    <div>
      {eyebrow && <p className="i-eyebrow">{eyebrow}</p>}
      <h2 id={id} className={`i-h2 ${size === 'sm' ? 'i-h2-sm' : ''}`}>
        {title}
      </h2>
      <div className="h-rule" aria-hidden="true" />
      {lead && <p className="i-sub">{lead}</p>}
    </div>
  );
}

/** Dải xanh mời đặt lịch ở cuối trang. */
export function GreenCta({ title, text }) {
  return (
    <section className="h-cta">
      <div className="h-wrap h-cta-row">
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <h2 className="i-cta-title">{title}</h2>
          {text && <p>{text}</p>}
        </div>
        <Link to="/dat-lich" className="h-btn h-btn-light">
          <Icon name="calendarPlus" strokeWidth={1.75} />
          Đặt lịch khám
        </Link>
      </div>
    </section>
  );
}
