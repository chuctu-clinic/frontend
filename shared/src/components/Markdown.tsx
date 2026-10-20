import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useMemo } from 'react';

marked.setOptions({ breaks: true, gfm: true });

/** Hiển thị nội dung bài viết (Markdown) đã được làm sạch. */
export function Markdown({ source, className = 'prose' }: { source: string | null | undefined; className?: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(source || '', { async: false })), [source]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
