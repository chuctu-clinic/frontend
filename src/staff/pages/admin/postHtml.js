import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { API_BASE, appHeaders } from '../../../shared/lib/api.js';

// Xử lý nội dung bài viết, tách khỏi RichEditor.jsx để trang xem trước và danh sách không phải tải CKEditor.
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

/** Thu nhỏ ảnh ở trình duyệt rồi tải lên; trả về đường dẫn ảnh. */
export async function uploadImage(file, maxSide = 1600) {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('Chỉ chọn ảnh JPG, PNG, WEBP hoặc GIF.');
  let blob = file;
  if (file.type !== 'image/gif') {
    const bitmap = await createImageBitmap(file).catch(() => {
      throw new Error('Không đọc được ảnh này, vui lòng chọn ảnh khác.');
    });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  }
  if (blob.size > 3 * 1024 * 1024) throw new Error('Ảnh quá lớn, vui lòng chọn ảnh dưới 3 MB.');
  const res = await fetch(`${API_BASE}/api/admin/uploads`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...appHeaders(), 'Content-Type': blob.type },
    body: blob,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error?.message || body.message || 'Không tải được ảnh lên, vui lòng thử lại.');
  return body.url;
}
