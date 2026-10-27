import { ButtonLink, Empty } from '../../../shared/ui/ui.jsx';
import { useDocumentTitle } from '../../../shared/lib/hooks.js';

export default function NotFound() {
  useDocumentTitle('Không tìm thấy trang');
  return (
    <div className="page">
      <div className="container container-narrow">
        <Empty icon="question" title="Không tìm thấy trang này" action={<ButtonLink to="/">Về trang chủ</ButtonLink>}>
          Đường dẫn có thể đã thay đổi. Cô chú bấm nút bên dưới để quay về trang chủ.
        </Empty>
      </div>
    </div>
  );
}
