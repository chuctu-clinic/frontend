import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useEffect, useRef, useState } from 'react';

// Trình soạn thảo bài viết theo prototype "Admin-SoanBaiViet": soạn trực tiếp như khi đọc.
// Nội dung lưu dạng HTML; trang công khai hiển thị qua Markdown (marked + DOMPurify) nên HTML vẫn hiện đúng.
// Bài cũ viết bằng Markdown được chuyển sang HTML khi mở ra sửa.

/** Nội dung đã lưu → HTML cho trình soạn thảo. */
export function toEditorHtml(content) {
  const src = String(content || '').trim();
  if (!src) return '';
  return DOMPurify.sanitize(src.startsWith('<') ? src : marked.parse(src, { breaks: true, gfm: true }));
}

/** Bài có nội dung thật (chữ hoặc ảnh) hay chỉ là thẻ rỗng. */
export function hasContent(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return Boolean(div.textContent.trim() || div.querySelector('img'));
}

/** Đoạn chữ đầu tiên, dùng làm tóm tắt hiện ở danh sách bài viết. */
export function summaryFrom(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  const first = [...div.querySelectorAll('p')].map((p) => p.textContent.trim()).find(Boolean) || div.textContent.trim();
  return first.length > 300 ? `${first.slice(0, 297).trimEnd()}…` : first;
}

/** Thu nhỏ ảnh ở trình duyệt rồi tải lên; trả về đường dẫn ảnh. */
export async function uploadImage(file, maxSide = 1600) {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('Chỉ chọn ảnh JPG, PNG, WEBP hoặc GIF.');
  let blob = file;
  if (file.type !== 'image/gif') {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  }
  if (blob.size > 3 * 1024 * 1024) throw new Error('Ảnh quá lớn, vui lòng chọn ảnh dưới 3 MB.');
  const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/uploads`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': blob.type }, body: blob });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || 'Không tải được ảnh lên, vui lòng thử lại.');
  return body.url;
}

const TB = ({ label, onClick, children }) => (
  <button
    type="button"
    className="ed-tb"
    aria-label={label}
    title={label}
    // Giữ vùng chọn trong khung soạn thảo khi bấm nút
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  </button>
);

/**
 * Khung soạn thảo không điều khiển: nạp `initialHtml` một lần, mỗi lần sửa gọi `onChange(html)`.
 * Đổi `key` của component để nạp bài khác.
 */
export function RichEditor({ id, labelledBy, initialHtml, onChange, invalid, describedBy, onError }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const [block, setBlock] = useState('p');

  useEffect(() => {
    ref.current.innerHTML = initialHtml || '';
    // Chỉ nạp lần đầu; về sau nội dung do người soạn quyết định
  }, []);

  const emit = () => onChange(ref.current.innerHTML);
  const cmd = (name, value) => {
    ref.current.focus();
    document.execCommand(name, false, value);
    emit();
  };

  // Hiện đúng kiểu đoạn đang đặt con trỏ
  useEffect(() => {
    const sync = () => {
      const sel = document.getSelection();
      if (!sel?.anchorNode || !ref.current?.contains(sel.anchorNode)) return;
      const v = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
      setBlock(['h2', 'h3'].includes(v) ? v : 'p');
    };
    document.addEventListener('selectionchange', sync);
    return () => document.removeEventListener('selectionchange', sync);
  }, []);

  const insertImage = async (file) => {
    try {
      const url = await uploadImage(file);
      cmd('insertHTML', `<img src="${url}" alt="">`);
    } catch (err) {
      onError?.(err);
    }
  };

  return (
    <div className="ed-wrap" data-invalid={invalid ? 'true' : 'false'}>
      <div role="toolbar" aria-label="Định dạng nội dung" className="ed-toolbar">
        <select
          aria-label="Kiểu đoạn"
          value={block}
          onChange={(e) => {
            setBlock(e.target.value);
            cmd('formatBlock', `<${e.target.value}>`);
          }}
        >
          <option value="p">Đoạn văn</option>
          <option value="h2">Tiêu đề lớn</option>
          <option value="h3">Tiêu đề nhỏ</option>
        </select>
        <span className="ed-sep" role="separator" aria-hidden="true" />
        <TB label="Chữ đậm" onClick={() => cmd('bold')}>
          <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />
        </TB>
        <TB label="Chữ nghiêng" onClick={() => cmd('italic')}>
          <path d="M19 4h-9M14 20H5M15 4 9 20" />
        </TB>
        <TB label="Gạch chân" onClick={() => cmd('underline')}>
          <path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14" />
        </TB>
        <span className="ed-sep" role="separator" aria-hidden="true" />
        <TB label="Danh sách dấu chấm" onClick={() => cmd('insertUnorderedList')}>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <circle cx="4.5" cy="6" r="1" fill="currentColor" />
          <circle cx="4.5" cy="12" r="1" fill="currentColor" />
          <circle cx="4.5" cy="18" r="1" fill="currentColor" />
        </TB>
        <TB label="Danh sách đánh số" onClick={() => cmd('insertOrderedList')}>
          <path d="M10 6h10M10 12h10M10 18h10M4 4.5l1.5-1v5M4 13.5c0-1.2 2.6-1.2 2.6.2 0 1-2.6 1.8-2.6 3h2.8" />
        </TB>
        <TB label="Trích dẫn" onClick={() => cmd('formatBlock', '<blockquote>')}>
          <path d="M9 8C6.5 8.5 5 10 5 13v4h4v-4H7c0-2 .8-3 2-3zM19 8c-2.5.5-4 2-4 5v4h4v-4h-2c0-2 .8-3 2-3z" fill="currentColor" />
        </TB>
        <span className="ed-sep" role="separator" aria-hidden="true" />
        <TB
          label="Chèn liên kết"
          onClick={() => {
            const url = window.prompt('Dán địa chỉ liên kết (ví dụ https://...)');
            if (url && /^(https?:\/\/|\/|mailto:|tel:)/i.test(url.trim())) cmd('createLink', url.trim());
          }}
        >
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
        </TB>
        <TB label="Chèn ảnh" onClick={() => fileRef.current.click()}>
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m21 16-5-5-9 9" />
        </TB>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) insertImage(f);
          }}
        />
        <span className="ed-sep" role="separator" aria-hidden="true" />
        <TB label="Hoàn tác" onClick={() => cmd('undo')}>
          <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
        </TB>
        <TB label="Làm lại" onClick={() => cmd('redo')}>
          <path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />
        </TB>
      </div>
      <div
        id={id}
        ref={ref}
        className="ed"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-labelledby={labelledBy}
        aria-invalid={invalid ? 'true' : 'false'}
        aria-describedby={describedBy}
        data-ph="Viết bằng lời thường ngày, câu ngắn, tránh từ chuyên môn khó hiểu. Người đọc chính là người cao tuổi và người nhà bệnh nhân."
        onInput={emit}
        onPaste={(e) => {
          // Dán chữ thuần để không kéo theo định dạng lạ từ nơi khác
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        }}
      />
    </div>
  );
}

