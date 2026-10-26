import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';

// Ô chọn tự vẽ thay cho <select>: danh sách luôn mở sát dưới (hoặc trên) ô, chữ to, có ô tìm cho danh sách dài

/** Bỏ dấu để gõ "binh thanh" vẫn tìm ra "Bình Thạnh". */
const fold = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const POP_HEIGHT = 380;
const GAP = 8;

/**
 * items = [{ value, label, group?, display? }]; display là chữ hiện trên ô sau khi chọn (mặc định là label). Các mục cùng group đứng liền nhau và có tiêu đề nhóm.
 * onChange nhận thẳng giá trị đã chọn.
 */
export function Picker({ id, value, onChange, items, disabled, searchable = items.length > 20, busy, ...aria }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const popRef = useRef(null);

  const q = fold(query.trim());
  const shown = q ? items.filter((it) => fold(it.label).includes(q) || (it.group && fold(it.group).includes(q))) : items;
  const selected = items.find((it) => it.value === value);

  const show = () => {
    if (disabled) return;
    setQuery('');
    setActive(Math.max(0, items.findIndex((it) => it.value === value)));
    setOpen(true);
  };
  const hide = (focusButton = true) => {
    setOpen(false);
    if (focusButton) btnRef.current?.focus();
  };
  const pick = (it) => {
    if (!it) return;
    onChange(it.value);
    hide();
  };

  // Danh sách gắn vào <body> (để hộp thoại không cắt mất), nên tự bám theo vị trí ô khi cuộn hay đổi cỡ cửa sổ
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - GAP * 2;
      const above = r.top - GAP * 2;
      const up = below < POP_HEIGHT && above > below;
      setPos({ left: r.left, width: r.width, up, maxHeight: Math.min(POP_HEIGHT, Math.max(up ? above : below, 160)), ...(up ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  // Mở ra thì đưa con trỏ vào ô tìm (hoặc danh sách) và cuộn tới mục đang chọn
  useEffect(() => {
    if (!open) return;
    (searchRef.current || listRef.current)?.focus();
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' });
    const outside = (e) => !rootRef.current?.contains(e.target) && !popRef.current?.contains(e.target) && hide(false);
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) document.getElementById(`${id}-o-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);

  const onListKey = (e) => {
    const last = shown.length - 1;
    const keys = {
      ArrowDown: () => setActive((i) => Math.min(last, i + 1)),
      ArrowUp: () => setActive((i) => Math.max(0, i - 1)),
      PageDown: () => setActive((i) => Math.min(last, i + 8)),
      PageUp: () => setActive((i) => Math.max(0, i - 8)),
      Enter: () => pick(shown[active]),
      Escape: () => hide(),
      Tab: () => hide(false),
    };
    if (!searchable) Object.assign(keys, { Home: () => setActive(0), End: () => setActive(last), ' ': keys.Enter });
    if (!keys[e.key]) return;
    if (e.key !== 'Tab') e.preventDefault();
    keys[e.key]();
  };

  const onButtonKey = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      show();
    }
  };

  let lastGroup = null;
  return (
    <div className={`a-pick ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        ref={btnRef}
        id={id}
        type="button"
        className="a-input a-pick-btn"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-ds`}
        aria-busy={busy || undefined}
        disabled={disabled}
        onClick={() => (open ? hide() : show())}
        onKeyDown={onButtonKey}
        {...aria}
      >
        <span className="a-pick-value">{selected?.display ?? selected?.label ?? value ?? ''}</span>
        <span className="a-pick-chev" aria-hidden="true">
          {busy ? <span className="spinner" /> : <Icon name="chevronDown" size={22} strokeWidth={2.5} />}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            className={`a-pick-pop a-vars ${pos?.up ? 'a-pick-up' : ''}`}
            style={pos ? { left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight } : { opacity: 0 }}
          >
            {searchable && (
              <div className="a-pick-search">
                <Icon name="search" size={20} strokeWidth={2} />
                <input
                  ref={searchRef}
                  type="text"
                  aria-label="Gõ để tìm nhanh"
                  aria-controls={`${id}-ds`}
                  aria-activedescendant={shown[active] ? `${id}-o-${active}` : undefined}
                  autoComplete="off"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onListKey}
                />
              </div>
            )}
            <ul
              ref={listRef}
              id={`${id}-ds`}
              role="listbox"
              className="a-pick-list"
              tabIndex={searchable ? undefined : -1}
              aria-labelledby={aria['aria-labelledby']}
              aria-activedescendant={!searchable && shown[active] ? `${id}-o-${active}` : undefined}
              onKeyDown={searchable ? undefined : onListKey}
            >
              {shown.map((it, i) => {
                const header = it.group && it.group !== lastGroup;
                lastGroup = it.group;
                const isSel = it.value === value;
                return [
                  header && (
                    <li key={`g-${it.group}`} role="presentation" className="a-pick-group">
                      {it.group}
                    </li>
                  ),
                  <li
                    key={it.value}
                    id={`${id}-o-${i}`}
                    role="option"
                    aria-selected={isSel}
                    className={`a-pick-opt ${i === active ? 'is-active' : ''}`}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(it)}
                  >
                    <span>{it.label}</span>
                    {isSel && <Icon name="check" size={20} strokeWidth={2.5} />}
                  </li>,
                ];
              })}
              {!shown.length && <li className="a-pick-empty">Không tìm thấy. Cô chú thử gõ ít chữ hơn.</li>}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
