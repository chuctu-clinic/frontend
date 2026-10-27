import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../shared/components/Icon.jsx';
import '../pages/auth/auth.css';

/**
 * Hộp thoại theo prototype: thanh tiêu đề màu (xanh, hoặc đỏ khi xoá/huỷ), thân và hàng nút ở cuối.
 * Mở ra thì đặt con trỏ vào ô đầu tiên, Esc để đóng, phím Tab không chạy ra ngoài.
 * Gắn thẳng vào <body>: khung trang (.route-fade) có hiệu ứng transform nên position: fixed bên trong
 * sẽ bám theo khung trang thay vì màn hình, làm hộp thoại không nằm giữa màn hình.
 */
export function Dialog({ title, tone = 'green', width = 680, onClose, children, actions, alert }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const prev = document.activeElement;
    const first = ref.current?.querySelector('.a-dialog-body input, .a-dialog-body select, .a-dialog-body textarea') || ref.current?.querySelector('.a-dialog-close');
    first?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = ref.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, a[href]');
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

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
