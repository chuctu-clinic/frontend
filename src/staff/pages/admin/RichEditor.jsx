import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { uploadImage } from './postHtml.js';
import { docxToHtml } from './wordImport.js';

// Trình soạn thảo bài viết dùng Tiptap (giấy phép MIT), theo prototype "Admin-SoanBaiViet": soạn trực tiếp như khi đọc.
// Trang soạn bài tải file này riêng (React.lazy) để các trang khác không phải tải trình soạn thảo.

const PLACEHOLDER = 'Viết bằng lời thường ngày, câu ngắn, tránh từ chuyên môn khó hiểu. Người đọc chính là người cao tuổi và người nhà bệnh nhân.';

const EXTENSIONS = [
  StarterKit.configure({
    // Bài chỉ có hai cỡ tiêu đề, giống trang hiển thị bài
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    strike: false,
    horizontalRule: false,
    // Liên kết mở ngay trong thẻ hiện tại: người cao tuổi dễ lạc khi trang tự mở thẻ mới
    link: { openOnClick: false, autolink: true, defaultProtocol: 'https', protocols: ['mailto', 'tel'], HTMLAttributes: { target: null, rel: 'noopener noreferrer' } },
  }),
  Image.configure({ allowBase64: false }),
  TableKit.configure({ table: { resizable: false } }),
  Placeholder.configure({ placeholder: PLACEHOLDER }),
];

const BLOCKS = [
  ['p', 'Đoạn văn'],
  ['h2', 'Tiêu đề lớn'],
  ['h3', 'Tiêu đề nhỏ'],
];

const TB = ({ label, onClick, active, disabled, children }) => (
  <button
    type="button"
    className={`ed-tb ${active ? 'is-on' : ''}`}
    aria-label={label}
    aria-pressed={active === undefined ? undefined : active}
    title={label}
    disabled={disabled}
    // Giữ vùng chọn trong khung soạn thảo khi bấm nút
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  </button>
);

const Sep = () => <span className="ed-sep" role="separator" aria-hidden="true" />;

/** Nút chữ trên thanh sửa bảng. */
const Chip = ({ danger, onClick, children }) => (
  <button type="button" className={`ed-chip ${danger ? 'ed-chip-danger' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
    {children}
  </button>
);

/**
 * Khung soạn thảo không điều khiển: nạp `initialHtml` một lần, mỗi lần sửa gọi `onChange(html)`.
 * Đổi `key` của component để nạp bài khác. Lỗi gọi `onError(err)`, thông báo gọi `onNotice(message)`.
 */
export function RichEditor({ id, label, labelledBy, initialHtml, onChange, invalid, describedBy, onError, onNotice }) {
  const fileRef = useRef(null);
  const wordRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const attributes = {
    id,
    class: 'ed',
    role: 'textbox',
    'aria-multiline': 'true',
    ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    'aria-invalid': invalid ? 'true' : 'false',
  };

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: initialHtml || '',
    editorProps: { attributes },
    onUpdate: ({ editor: ed }) => onChangeRef.current(ed.isEmpty ? '' : ed.getHTML()),
  });

  // Trạng thái lỗi, nhãn đổi theo props
  useEffect(() => {
    editor?.setOptions({ editorProps: { attributes } });
  }, [editor, invalid, id, labelledBy, describedBy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nút nào đang bật, con trỏ đang ở kiểu đoạn nào, có đang trong bảng không
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) =>
      ed && {
        block: ed.isActive('heading', { level: 2 }) ? 'h2' : ed.isActive('heading', { level: 3 }) ? 'h3' : 'p',
        bold: ed.isActive('bold'),
        italic: ed.isActive('italic'),
        underline: ed.isActive('underline'),
        bulletList: ed.isActive('bulletList'),
        orderedList: ed.isActive('orderedList'),
        blockquote: ed.isActive('blockquote'),
        link: ed.isActive('link'),
        table: ed.isActive('table'),
        canUndo: ed.can().undo(),
        canRedo: ed.can().redo(),
      },
  });

  if (!editor || !state)
    return (
      <>
        <div className="ed-head">{label}</div>
        <div className="ed-wrap ed-loading" />
      </>
    );
  const run = () => editor.chain().focus();

  const setBlock = (b) => (b === 'p' ? run().setParagraph().run() : run().setHeading({ level: Number(b[1]) }).run());

  const editLink = () => {
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Dán địa chỉ liên kết (ví dụ https://...). Để trống để bỏ liên kết.', prev);
    if (url === null) return;
    const v = url.trim();
    if (!v) return run().extendMarkRange('link').unsetLink().run();
    if (!/^(https?:\/\/|\/|mailto:|tel:)/i.test(v)) return onError?.(new Error('Liên kết cần bắt đầu bằng https://, /, mailto: hoặc tel:.'));
    run().extendMarkRange('link').setLink({ href: v }).run();
  };

  const insertImage = async (file) => {
    try {
      const url = await uploadImage(file);
      run().setImage({ src: url, alt: '' }).run();
      // Ảnh vừa chèn đang được chọn: đưa con trỏ xuống đoạn bên dưới (tạo mới nếu chưa có),
      // nếu không thứ chèn tiếp theo sẽ thay mất ảnh
      const { selection, doc } = editor.state;
      if (selection.node) {
        const after = selection.to;
        if (!doc.nodeAt(after)?.isTextblock) editor.commands.insertContentAt(after, { type: 'paragraph' });
        editor.chain().focus().setTextSelection(after + 1).run();
      }
    } catch (err) {
      onError?.(err);
    }
  };

  const importWord = async (file) => {
    setImporting(true);
    try {
      const { html, skippedImages } = await docxToHtml(file);
      run().insertContent(html).run();
      onNotice?.(
        `Đã nhập nội dung từ "${file.name}". Phông chữ, cỡ chữ và màu chữ của Word được bỏ để bài hiển thị thống nhất, vui lòng đọc lại trước khi lưu.` +
          (skippedImages ? ` Có ${skippedImages} ảnh không nhập được (định dạng không hỗ trợ), vui lòng chèn lại bằng nút Chèn ảnh.` : ''),
      );
    } catch (err) {
      onError?.(err);
    } finally {
      setImporting(false);
    }
  };

  const onPick = (handle) => (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) handle(f);
  };

  return (
    <>
      {/* Nhập từ Word nạp nội dung cho cả bài, không phải nút định dạng: để cạnh nhãn "Nội dung", ngoài thanh công cụ */}
      <div className="ed-head">
        {label}
        <button
          type="button"
          className="ed-word"
          disabled={importing}
          aria-busy={importing || undefined}
          aria-describedby="ed-word-note"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wordRef.current.click()}
        >
          {importing ? (
            <span className="spinner" aria-hidden="true" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5M12 11v6M9 14l3 3 3-3" />
            </svg>
          )}
          {importing ? 'Đang nhập nội dung…' : 'Nhập nội dung từ file Word'}
        </button>
        <span id="ed-word-note" className="sr-only">
          Chọn file .docx, nội dung được chèn vào chỗ con trỏ trong khung soạn.
        </span>
        <input ref={wordRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={onPick(importWord)} />
      </div>
      <div className="ed-wrap" data-invalid={invalid ? 'true' : 'false'}>
        <div role="toolbar" aria-label="Định dạng nội dung" className="ed-toolbar">
          <select aria-label="Kiểu đoạn" value={state.block} onChange={(e) => setBlock(e.target.value)}>
            {BLOCKS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <Sep />
          <TB label="Chữ đậm" active={state.bold} onClick={() => run().toggleBold().run()}>
            <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />
          </TB>
          <TB label="Chữ nghiêng" active={state.italic} onClick={() => run().toggleItalic().run()}>
            <path d="M19 4h-9M14 20H5M15 4 9 20" />
          </TB>
          <TB label="Gạch chân" active={state.underline} onClick={() => run().toggleUnderline().run()}>
            <path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14" />
          </TB>
          <Sep />
          <TB label="Danh sách dấu chấm" active={state.bulletList} onClick={() => run().toggleBulletList().run()}>
            <path d="M9 6h11M9 12h11M9 18h11" />
            <circle cx="4.5" cy="6" r="1" fill="currentColor" />
            <circle cx="4.5" cy="12" r="1" fill="currentColor" />
            <circle cx="4.5" cy="18" r="1" fill="currentColor" />
          </TB>
          <TB label="Danh sách đánh số" active={state.orderedList} onClick={() => run().toggleOrderedList().run()}>
            <path d="M10 6h10M10 12h10M10 18h10M4 4.5l1.5-1v5M4 13.5c0-1.2 2.6-1.2 2.6.2 0 1-2.6 1.8-2.6 3h2.8" />
          </TB>
          <TB label="Trích dẫn" active={state.blockquote} onClick={() => run().toggleBlockquote().run()}>
            <path d="M9 8C6.5 8.5 5 10 5 13v4h4v-4H7c0-2 .8-3 2-3zM19 8c-2.5.5-4 2-4 5v4h4v-4h-2c0-2 .8-3 2-3z" fill="currentColor" />
          </TB>
          <TB label="Chèn bảng" active={state.table} onClick={() => run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 10h18M3 15h18M9 4v16M15 4v16" />
          </TB>
          <Sep />
          <TB label="Chèn liên kết" active={state.link} onClick={editLink}>
            <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
          </TB>
          <TB label="Chèn ảnh" onClick={() => fileRef.current.click()}>
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <circle cx="9" cy="10" r="1.5" />
            <path d="m21 16-5-5-9 9" />
          </TB>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onPick(insertImage)} />
          <Sep />
          <TB label="Hoàn tác" disabled={!state.canUndo} onClick={() => run().undo().run()}>
            <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
          </TB>
          <TB label="Làm lại" disabled={!state.canRedo} onClick={() => run().redo().run()}>
            <path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />
          </TB>
        </div>

        {/* Sửa bảng: chỉ hiện khi con trỏ đang ở trong bảng */}
        {state.table && (
          <div role="toolbar" aria-label="Sửa bảng" className="ed-toolbar ed-toolbar-table">
            <span className="ed-toolbar-title">Bảng:</span>
            <Chip onClick={() => run().addRowAfter().run()}>Thêm hàng</Chip>
            <Chip onClick={() => run().addColumnAfter().run()}>Thêm cột</Chip>
            <Chip onClick={() => run().deleteRow().run()}>Xoá hàng</Chip>
            <Chip onClick={() => run().deleteColumn().run()}>Xoá cột</Chip>
            <Chip onClick={() => run().toggleHeaderRow().run()}>Hàng tiêu đề</Chip>
            <Chip danger onClick={() => run().deleteTable().run()}>
              Xoá bảng
            </Chip>
          </div>
        )}

        <EditorContent editor={editor} />
      </div>
    </>
  );
}
