import { Icon, type IconName } from '@chuctu/shared/components/Icon.tsx';
import { GreenCta, PageHero, SectionHead, usePageMeta } from './infoParts.tsx';

// Theo màn "Khách · Giới thiệu" của prototype (GioiThieu.dc.html)

const VALUES: [IconName, string, string][] = [
  ['heartSoft', 'Không thu phí', 'Khám, châm cứu và trị liệu đều miễn phí. Bà con không phải chuẩn bị tiền trước khi đến.'],
  ['chat', 'Nói cho dễ hiểu', 'Bác sĩ giải thích bệnh và cách điều trị bằng lời thường ngày, hỏi lại đến khi cô chú thật sự hiểu.'],
  ['usersSoft', 'Ưu tiên bà con khó khăn', 'Nhân viên tiếp đón, hướng dẫn và sẵn lòng ghi hộ đơn đăng ký qua điện thoại cho người cao tuổi.'],
];

// Danh sách theo prototype; ảnh chân dung là ảnh tạm, cần thay bằng ảnh thật của từng người
const TEAM = [
  ['Trần Long', 'Châm cứu, vật lý trị liệu và hỗ trợ bốc thuốc'],
  ['Nguyễn Văn Hậu', 'Bắt mạch, kê đơn và bốc thuốc Nam – thuốc Bắc'],
  ['Trần Thị Mai', 'Nhân viên tiếp đón · Phát số, ghi hộ đơn đăng ký'],
];

export default function GioiThieu() {
  const meta = usePageMeta('gioi-thieu', {
    crumb: 'Giới thiệu',
    title: 'Về Phòng khám Chúc Từ',
    summary:
      'Phòng Chẩn Trị Y Học Cổ Truyền Từ Thiện Chúc Từ — khám bệnh, trị liệu và bốc thuốc hoàn toàn miễn phí cho người già neo đơn, người lao động nghèo và bà con có hoàn cảnh khó khăn. Phòng khám mở cửa tất cả các ngày trong tuần, kể cả Chủ Nhật, từ 8:00 đến 16:30.',
  });

  return (
    <div className="info-page">
      <PageHero crumb="Giới thiệu" title={meta.title} lead={meta.summary} />

      <section className="i-section-80" aria-labelledby="tu-bi">
        <div className="h-wrap i-split">
          <div className="i-split-media">
            <img
              className="i-photo i-photo-gold"
              style={{ height: 440 }}
              src="/mat-tien.jpg"
              alt="Mặt tiền Phòng khám Chúc Từ với hai chữ Từ Bi và Trí Tuệ trên hai cột"
            />
          </div>
          <div className="i-split-text" style={{ gap: 20 }}>
            <div>
              <h2 id="tu-bi" className="i-h2">
                Từ bi — Trí tuệ
              </h2>
              <div className="h-rule" aria-hidden="true" />
            </div>
            <p>
              Nằm lặng lẽ trong một con ngõ nhỏ trên đường Điện Biên Phủ, phòng khám từ lâu đã là chỗ dựa quen thuộc của bà con quanh vùng — nơi tình thương
              khơi nguồn, nơi nỗi đau được xoa dịu.
            </p>
            <p>
              Phòng khám khai trương ngày <strong>08/11/2025</strong> (19/09 Âm lịch), do <strong>Sư cô Chúc Từ</strong> sáng lập và phụ trách, với một tâm
              nguyện duy nhất: dùng y học cổ truyền chữa bệnh cứu người, không mưu cầu danh lợi.
            </p>
            <p>
              Hai chữ khắc trên hai cột trước cửa cũng là cách phòng khám làm việc mỗi ngày: thăm khám cẩn thận, giải thích rõ ràng bằng lời dễ hiểu, và không để
              ai phải ngại vì hoàn cảnh của mình.
            </p>
            <p>
              Thăm khám, trị liệu và cả thang thuốc mang về đều <strong style={{ color: 'var(--green-700)' }}>0 đồng</strong>, nhờ tấm lòng y đức của các y bác sĩ
              tình nguyện và sự chung tay của các Mạnh Thường Quân.
            </p>
            <div className="i-notes">
              <div className="i-note-card">
                <h3>Mái ấm Chúc Từ</h3>
                <p>Cưu mang những mảnh đời cơ nhỡ, được phòng khám chăm sóc sức khoẻ thường xuyên.</p>
              </div>
              <div className="i-note-card">
                <h3>Bếp ăn tình thương</h3>
                <p>Bữa cơm ấm lòng cho bà con tới khám, hoạt động song song với phòng khám.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="i-section-80 h-alt" aria-labelledby="ba-dieu">
        <div className="h-wrap i-stack-40">
          <SectionHead id="ba-dieu" title="Phòng khám làm việc theo ba điều" />
          <div className="h-grid-3">
            {VALUES.map(([icon, title, text]) => (
              <div key={title} className="i-value">
                <span className="h-dot">
                  <Icon name={icon} size={32} strokeWidth={1.75} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="i-section-80" aria-labelledby="doi-ngu">
        <div className="h-wrap i-stack-40">
          <SectionHead id="doi-ngu" title="Đội ngũ phòng khám" lead="Bác sĩ và nhân viên làm việc tại phòng khám theo lịch cố định trong tuần." />
          <div className="h-grid-3">
            {TEAM.map(([name, role]) => (
              <article key={name} className="i-person">
                <img src="/mat-tien.jpg" alt="" loading="lazy" />
                <div>
                  <h3>{name}</h3>
                  <p>{role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <GreenCta title="Cô chú đã sẵn sàng đặt lịch khám?" />
    </div>
  );
}
