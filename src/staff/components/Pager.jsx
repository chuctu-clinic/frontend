import { Icon } from '../../shared/ui/Icon.jsx';

/** Phân trang tối đa 10 dòng một trang. */
export function Pager({ page, total, perPage = 10, unit, onPage }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const go = (p) => p >= 1 && p <= pages && p !== page && onPage(p);
  return (
    <nav className="t-pager" aria-label="Phân trang">
      <p className="t-text" aria-live="polite">
        Hiển thị {from}–{to} trong {total} {unit}
      </p>
      <div className="t-pager-btns">
        <button type="button" className="t-pg" aria-disabled={page <= 1} aria-label="Trang trước" onClick={() => go(page - 1)}>
          <Icon name="chevronLeft" size={20} />
          Trước
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            className="t-pg"
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Trang ${p}${p === page ? ', trang hiện tại' : ''}`}
            onClick={() => go(p)}
          >
            {p}
          </button>
        ))}
        <button type="button" className="t-pg" aria-disabled={page >= pages} aria-label="Trang sau" onClick={() => go(page + 1)}>
          Sau
          <Icon name="chevronRight" size={20} />
        </button>
      </div>
    </nav>
  );
}
