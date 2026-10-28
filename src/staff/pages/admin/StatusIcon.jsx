import { Icon } from '../../../shared/ui/Icon.jsx';

// Cột Trạng thái của các bảng quản trị chỉ hiện biểu tượng; ý nghĩa ghi ở dòng chú thích trên bảng.
// Mỗi trạng thái khác cả hình lẫn màu để không phải dựa vào màu mới phân biệt được.

/** Biểu tượng trạng thái trong ô tròn. labelled: đọc được tên trạng thái (trong bảng); bỏ đi khi chữ đã đứng cạnh (chú thích). */
export function StatusIcon({ icon, tone, label, labelled }) {
  return (
    <span className={`a-status-icon ${tone}`} title={labelled ? label : undefined}>
      <Icon name={icon} size={20} strokeWidth={2.25} label={labelled ? label : undefined} />
    </span>
  );
}

/** Dòng chú thích ý nghĩa biểu tượng, đặt ngay trên bảng. items = [{ icon, tone, label, note? }] */
export function StatusLegend({ items }) {
  return (
    <ul className="a-legend" aria-label="Chú thích cột Trạng thái">
      {items.map((it) => (
        <li key={it.label}>
          <StatusIcon icon={it.icon} tone={it.tone} label={it.label} />
          {it.note || it.label}
        </li>
      ))}
    </ul>
  );
}
