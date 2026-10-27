import DOMPurify from 'dompurify';
import { uploadImage } from './postHtml.js';

// Nhập file Word (.docx) vào bài viết bằng mammoth.js (giấy phép BSD-2-Clause, miễn phí).
// mammoth giữ cấu trúc (tiêu đề, đậm, nghiêng, danh sách, bảng, liên kết, ảnh) và cố ý bỏ phông, cỡ, màu chữ
// để bài nào cũng hiển thị thống nhất, dễ đọc.

const MAX_SIZE = 20 * 1024 * 1024;

// Kiểu đoạn trong Word → thẻ của bài viết. Bài chỉ có hai cỡ tiêu đề nên Tiêu đề 1 thành h2, các cấp nhỏ hơn thành h3.
// Tên kiểu trong file .docx luôn là tên gốc tiếng Anh, kể cả khi Word đang dùng tiếng Việt.
const STYLE_MAP = [
  "p[style-name='Title'] => h2:fresh",
  "p[style-name='Subtitle'] => h3:fresh",
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='heading 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h3:fresh",
  "p[style-name='heading 2'] => h3:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h3:fresh",
  "p[style-name='heading 4'] => h3:fresh",
  "p[style-name='Quote'] => blockquote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote > p:fresh",
  'u => u',
];

/**
 * File .docx → { html, skippedImages }. Ảnh trong file được thu nhỏ và tải lên như khi chèn bằng tay;
 * ảnh không tải được (ví dụ định dạng EMF, WMF của Word) thì bỏ qua và đếm lại để báo cho người soạn.
 */
export async function docxToHtml(file) {
  if (!/\.docx$/i.test(file.name)) {
    throw new Error('Chỉ nhập được file .docx. Nếu là file .doc cũ, vui lòng mở bằng Word rồi chọn Lưu thành (Save As) định dạng .docx.');
  }
  if (file.size > MAX_SIZE) throw new Error('File Word quá lớn (trên 20 MB). Vui lòng bớt ảnh hoặc chia thành nhiều bài.');

  const { default: mammoth } = await import('mammoth');
  let skippedImages = 0;
  const convertImage = mammoth.images.imgElement(async (image) => {
    try {
      const type = image.contentType;
      const blob = new Blob([await image.readAsArrayBuffer()], { type });
      return { src: await uploadImage(new File([blob], 'anh-tu-word', { type })) };
    } catch {
      skippedImages += 1;
      return { src: '' };
    }
  });

  let result;
  try {
    result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { styleMap: STYLE_MAP, convertImage });
  } catch {
    throw new Error('Không đọc được file Word này. Vui lòng kiểm tra file có mở được bằng Word không rồi thử lại.');
  }

  // Bỏ ảnh không tải được và đoạn trống, lọc mã lạ trước khi đưa vào khung soạn
  const div = document.createElement('div');
  div.innerHTML = DOMPurify.sanitize(result.value);
  div.querySelectorAll('img:not([src]), img[src=""]').forEach((img) => img.remove());
  div.querySelectorAll('p').forEach((p) => !p.textContent.trim() && !p.querySelector('img') && p.remove());
  const html = div.innerHTML.trim();
  if (!html) throw new Error('File Word này không có nội dung để nhập.');
  return { html, skippedImages };
}
