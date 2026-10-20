import { Link } from 'react-router-dom';
import { CLINIC } from '../lib/format.ts';

export function Brand({ tag = 'Y học cổ truyền từ thiện', to = '/' }: { tag?: string; to?: string }) {
  return (
    <Link to={to} className="brand" aria-label="Về trang chủ Phòng khám Chúc Từ">
      <img src={`${import.meta.env.BASE_URL}logo-192.png`} alt="" width="52" height="52" />
      <span>
        <span className="brand-name">{CLINIC.short}</span>
        <span className="brand-tag">{tag}</span>
      </span>
    </Link>
  );
}
