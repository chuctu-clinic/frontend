import { useId } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../shared/ui/Icon.jsx';
import { useModal } from '../../shared/lib/hooks.js';
import '../pages/auth/auth.css';

/**
 * Hộp thoại theo prototype: thanh tiêu đề màu (xanh, hoặc đỏ khi xoá/huỷ), thân và hàng nút ở cuối.
 * Mở ra thì đặt con trỏ vào ô đầu tiên, Esc để đóng, phím Tab không chạy ra ngoài (useModal).
 * Gắn thẳng vào <body>: khung trang (.route-fade) có hiệu ứng transform nên position: fixed bên trong
 * sẽ bám theo khung trang thay vì màn hình, làm hộp thoại không nằm giữa màn hình.
 */
export function Dialog({ title, tone = 'green', width = 680, onClose, children, actions, alert }) {
  const titleId = useId();
  const { ref, onKeyDown } = useModal(onClose, ['.a-dialog-body input, .a-dialog-body select, .a-dialog-body textarea', '.a-dialog-close']);

  return createPortal(
    <div className="a-dialog-backdrop a-vars" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="a-dialog"
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
        onKeyDown={onKeyDown}
        style={{ maxWidth: width }}
      >
        <div className={`a-dialog-head ${tone === 'red' ? 'a-dialog-head-red' : ''}`}>
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="a-dialog-close" onClick={onClose} aria-label="Đóng">
            <Icon name="x" />
          </button>
        </div>
        <div className="a-dialog-body">{children}</div>
        {actions && <div className="a-dialog-actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
