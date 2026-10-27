import { useId } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../shared/ui/Icon.jsx';
import { useModal } from '../../shared/lib/hooks.js';

// Hộp thoại của khu nội bộ. Gắn thẳng vào <body> để luôn nằm giữa màn hình; focus, Esc, Tab xử lý ở useModal.

function Backdrop({ onClose, style, children }) {
  return createPortal(
    <div className="t-dialog-backdrop t-vars t-app-portal" style={style} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>,
    document.body,
  );
}

/** Hộp thoại có thanh tiêu đề màu (xanh; vàng khi hoàn tác; đỏ khi huỷ). */
export function TDialog({ title, subtitle, tone = 'green', width = 700, onClose, children, alert }) {
  const titleId = useId();
  const { ref, onKeyDown } = useModal(onClose, ['.t-dialog-body input, .t-dialog-body select, .t-dialog-body textarea', '.t-dialog-close']);
  return (
    <Backdrop onClose={onClose}>
      <div
        className="t-dialog"
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
        onKeyDown={onKeyDown}
        style={{ maxWidth: width }}
      >
        <div className={`t-dialog-head ${tone}`}>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="t-dialog-close" onClick={onClose} aria-label="Đóng">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </Backdrop>
  );
}

/** Hộp thoại có phần đầu, thân cuộn và phần cuối cố định (phiếu kết quả). */
export function TSheet({ labelledBy, onClose, children }) {
  const { ref, onKeyDown } = useModal(onClose, ['button']);
  return (
    <Backdrop onClose={onClose} style={{ zIndex: 80 }}>
      <div className="t-sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={ref} onKeyDown={onKeyDown}>
        {children}
      </div>
    </Backdrop>
  );
}

/** Hộp thoại không có thanh tiêu đề màu (trang quản trị): thân tự trình bày. */
export function PlainDialog({ labelledBy, width = 560, alert, onClose, onSubmit, children }) {
  const { ref, onKeyDown } = useModal(onClose);
  const Tag = onSubmit ? 'form' : 'div';
  return (
    <Backdrop onClose={onClose}>
      <Tag
        ref={ref}
        className="a-modal"
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ maxWidth: width }}
        onKeyDown={onKeyDown}
        onSubmit={
          onSubmit &&
          ((e) => {
            e.preventDefault();
            onSubmit();
          })
        }
        noValidate={onSubmit ? true : undefined}
      >
        {children}
      </Tag>
    </Backdrop>
  );
}

/** Khối tóm tắt phiếu khám trong hộp thoại. */
export function Summary({ items }) {
  return (
    <div className="t-summary">
      {items.map(([label, value, sub, bold = true]) => (
        <div key={label}>
          <p>{label}</p>
          <p className={bold ? 't-v' : 't-v2'}>{value}</p>
          {sub && <p className="t-text">{sub}</p>}
        </div>
      ))}
    </div>
  );
}
