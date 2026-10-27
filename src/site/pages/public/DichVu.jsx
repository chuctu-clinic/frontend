import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon.jsx';
import { PageHero, usePageMeta } from './infoParts.jsx';

// Theo màn "Khách · Dịch vụ" của prototype (DichVu.dc.html)

const SERVICES = [
  {
    id: 'cham-cuu',
    icon: 'needleSoft',
    chip: 'Châm cứu',
    title: 'Châm cứu',
    text: 'Dùng kim châm vào các huyệt để giảm đau và lưu thông khí huyết. Bác sĩ khám mạch, hỏi bệnh rồi mới chọn huyệt cho từng người.',
    uses: ['Đau vai gáy, đau lưng, đau thần kinh toạ', 'Tê bì chân tay, mất ngủ kéo dài, đau đầu', 'Phục hồi di chứng sau tai biến'],
    duration: '30 phút/buổi',
    course: '2-3 buổi',
    alt: 'Khu châm cứu của phòng khám',
  },
  {
    id: 'vat-ly-tri-lieu',
    icon: 'physio',
    chip: 'Vật lý trị liệu',
    title: 'Vật lý trị liệu — phục hồi chức năng',
    text: 'Các bài tập và kỹ thuật phục hồi vận động, có kỹ thuật viên đi cùng suốt buổi tập để chỉnh tư thế và theo dõi sức chịu đựng.',
    uses: ['Thoái hóa khớp gối, cứng khớp vai', 'Phục hồi sau chấn thương, sau bó bột', 'Tập đi lại cho người cao tuổi yếu chân'],
    duration: '30 phút/buổi',
    course: '2-3 buổi',
    alt: 'Khu tập vật lý trị liệu',
  },
  {
    id: 'xoa-bop',
    icon: 'handSoft',
    chip: 'Xoa bóp — bấm huyệt',
    title: 'Xoa bóp — bấm huyệt',
    text: 'Tác động bằng tay lên cơ và huyệt đạo để giảm co cứng, giảm mỏi và giúp ngủ ngon hơn. Thường kết hợp cùng châm cứu.',
    uses: ['Mỏi cổ vai gáy do ngồi lâu', 'Co cứng cơ, chuột rút ban đêm', 'Khó ngủ, căng thẳng kéo dài'],
    duration: '30 phút/buổi',
    course: '3 buổi',
    alt: 'Phòng xoa bóp bấm huyệt',
  },
  {
    id: 'boc-thuoc',
    icon: 'leafSoft',
    chip: 'Bốc thuốc',
    title: 'Bốc thuốc — thuốc Nam, thuốc Bắc',
    text: 'Bác sĩ bắt mạch, chẩn đoán rồi kê thang thuốc thảo dược hợp với thể trạng từng người. Thuốc được cân và gói ngay tại phòng khám, cô chú mang về sắc uống theo lời dặn.',
    uses: ['Đau nhức xương khớp kéo dài, hay tái phát', 'Suy nhược cơ thể, ăn ngủ kém', 'Hỗ trợ hồi phục sau tai biến'],
    duration: '15 phút bắt mạch',
    course: '5-7 thang mỗi đợt',
    alt: 'Quầy bốc thuốc Nam, thuốc Bắc của phòng khám',
  },
];

function ServiceBlock({ s, index }) {
  const alt = index % 2 === 1;
  const media = (
    <div className="i-split-media">
      <img className="i-photo" style={{ height: 380 }} src="/mat-tien.jpg" alt={`${s.alt} (ảnh tạm)`} loading="lazy" />
    </div>
  );
  return (
    <section id={s.id} className={`i-section ${alt ? 'h-alt' : ''}`} aria-labelledby={`${s.id}-title`} style={{ scrollMarginTop: 120 }}>
      <div className={`h-wrap i-split ${alt ? 'i-split-rev' : ''}`}>
        {!alt && media}
        <div className="i-split-text">
          <span className={`i-chip ${alt ? 'i-chip-card' : ''}`}>
            <Icon name={s.icon} size={20} strokeWidth={1.75} />
            {s.chip}
          </span>
          <h2 id={`${s.id}-title`} className="i-h2" style={{ marginBottom: 0 }}>
            {s.title}
          </h2>
          <p>{s.text}</p>
          <div className="i-uses">
            <h3>Thường dùng cho</h3>
            <ul className="i-checks">
              {s.uses.map((u) => (
                <li key={u}>
                  <Icon name="checkSoft" size={22} strokeWidth={1.75} />
                  {u}
                </li>
              ))}
            </ul>
            <div className="i-facts">
              <span>
                <strong>Thời lượng:</strong> {s.duration}
              </span>
              <span>
                <strong>Liệu trình:</strong> {s.course}
              </span>
            </div>
          </div>
          <Link to="/dat-lich" className="h-btn h-btn-primary i-btn">
            Đặt lịch khám
          </Link>
        </div>
        {alt && media}
      </div>
    </section>
  );
}

export default function DichVu() {
  const meta = usePageMeta('dich-vu', {
    crumb: 'Dịch vụ',
    title: 'Dịch vụ khám và điều trị',
    summary:
      'Phòng khám chuyên điều trị và phục hồi chức năng bằng y học cổ truyền: bệnh cơ xương khớp, đau nhức, tai biến, mất ngủ, đau đầu. Bác sĩ xem mạch và chẩn đoán trước, rồi mới chọn phương pháp. Tất cả đều không thu phí.',
  });
  const { hash } = useLocation();

  // Mở /dich-vu#cham-cuu từ thẻ dịch vụ ở trang chủ thì cuộn tới đúng mục
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="info-page">
      <PageHero crumb="Dịch vụ" title={meta.title} lead={meta.summary} />

      {SERVICES.map((s, i) => (
        <ServiceBlock key={s.id} s={s} index={i} />
      ))}

      <section className="i-section" style={{ paddingBottom: 80 }} aria-labelledby="luu-y">
        <div className="h-wrap i-warn">
          <span className="h-dot">
            <Icon name="warning" size={32} strokeWidth={1.75} />
          </span>
          <div className="i-warn-body">
            <h2 id="luu-y">Những trường hợp cần nói trước với bác sĩ</h2>
            <p>Hãy báo với bác sĩ ngay khi đến nếu cô chú thuộc một trong những trường hợp dưới đây — phòng khám sẽ chọn cách điều trị khác an toàn hơn.</p>
            <ul className="i-bullets">
              <li>
                <span>
                  Phụ nữ <strong>đang mang thai</strong>.
                </span>
              </li>
              <li>
                <span>
                  Cô chú <strong>đang dùng thuốc chống đông máu</strong>.
                </span>
              </li>
              <li>
                <span>
                  Cô chú <strong>có máy tạo nhịp tim</strong>.
                </span>
              </li>
              <li>
                <span>
                  Cô chú <strong>đang sốt cao</strong>, hoặc có <strong>vết thương hở</strong> ở vùng cần điều trị.
                </span>
              </li>
              <li>
                <span>
                  Đừng để bụng quá đói khi đi châm cứu — dễ bị “vựng châm”, tức chóng mặt, cồn cào, vã mồ hôi. Nhưng cũng đừng ăn quá no ngay trước giờ khám.
                </span>
              </li>
            </ul>
            <p className="i-fine">Thông tin trên trang chỉ mang tính tham khảo và không thay thế chẩn đoán trực tiếp của thầy thuốc.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
