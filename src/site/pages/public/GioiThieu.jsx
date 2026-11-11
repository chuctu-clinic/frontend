import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { CLINIC } from '../../../shared/lib/format.js';
import { GreenCta, PageHero, SectionHead, usePageMeta } from './infoParts.jsx';

// Theo màn "Khách · Giới thiệu" của prototype (GioiThieu.dc.html).
// Chỉ ghi những điều phòng khám đã công bố trên trang (giờ mở cửa, dịch vụ, cách khám); không thêm số liệu chưa kiểm chứng.

const FOR_WHOM = [
  'Ông bà, cô chú lớn tuổi sống một mình, không có người chăm sóc.',
  'Người lao động nghèo, làm thuê, buôn bán nhỏ, không dư dả tiền đi khám.',
  'Bà con có hoàn cảnh khó khăn, bệnh lâu năm mà ngại tốn kém nên cứ để đó.',
  'Ai đang đau nhức, mất ngủ, mệt mỏi và muốn thử chữa bằng y học cổ truyền.',
];

const SERVICES = [
  ['needleSoft', 'Châm cứu', 'Giảm đau vai gáy, đau lưng, đau thần kinh toạ, tê bì chân tay, mất ngủ.'],
  ['handSoft', 'Xoa bóp — bấm huyệt', 'Giảm mỏi cổ vai, co cứng cơ, chuột rút ban đêm, giúp ngủ ngon hơn.'],
  ['physio', 'Vật lý trị liệu', 'Tập phục hồi sau chấn thương, thoái hoá khớp, tập đi lại cho người yếu chân.'],
  ['leafSoft', 'Bốc thuốc Nam, thuốc Bắc', 'Bác sĩ bắt mạch rồi kê thang thuốc hợp với thể trạng, cân và gói ngay tại chỗ.'],
];

const VALUES = [
  ['heartSoft', 'Không thu phí', 'Khám, châm cứu, trị liệu và thang thuốc mang về đều không mất tiền. Cô chú không cần chuẩn bị tiền trước khi đến.'],
  ['chat', 'Nói cho dễ hiểu', 'Bác sĩ giải thích bệnh bằng lời thường ngày, không dùng chữ khó. Chỗ nào chưa rõ, cô chú cứ hỏi lại, bác sĩ nói lại đến khi hiểu thì thôi.'],
  ['usersSoft', 'Ưu tiên bà con khó khăn', 'Người lớn tuổi không quen dùng điện thoại thì nhân viên tiếp đón hướng dẫn tận nơi, ghi hộ đơn đăng ký qua điện thoại.'],
];

const STEPS = [
  ['Đến phòng khám', 'Cô chú đặt lịch trước trên trang này, hoặc cứ đến thẳng trong giờ mở cửa. Đưa phiếu khám hoặc nói tên cho tiếp tân là được.'],
  ['Chờ bác sĩ gọi', 'Ai có hẹn và đến đúng giờ thì được gọi trước. Người đến sau ngồi chờ theo thứ tự, màn hình ở phòng chờ sẽ hiện tên khi đến lượt.'],
  ['Bác sĩ khám', 'Bác sĩ hỏi chỗ đau, đau từ bao giờ, đo mạch, đo huyết áp. Xong thì nói rõ cô chú bị gì và nên chữa thế nào.'],
  ['Điều trị', 'Nếu cần châm cứu, xoa bóp hay vật lý trị liệu, cô chú sang khu điều trị. Kỹ thuật viên làm theo đúng chỉ định của bác sĩ.'],
  ['Nhận kết quả', 'Bác sĩ ghi lại kết quả, dặn dò cách tự chăm sóc ở nhà và hẹn ngày tái khám nếu cần. Có tài khoản thì cô chú xem lại kết quả trên trang này bất cứ lúc nào.'],
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

      {/* Câu chuyện phòng khám */}
      <section className="i-section-80" aria-labelledby="tu-bi">
        <div className="h-wrap i-split">
          <div className="i-split-media">
            <img
              className="i-photo i-photo-gold"
              style={{ height: 480 }}
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
            <p>Đi vào một con ngõ nhỏ trên đường Điện Biên Phủ, cô chú sẽ thấy phòng khám Chúc Từ.</p>
            <p>
              Không bảng hiệu rực rỡ, không quầy thu tiền. Chỉ có hai chữ <strong>Từ Bi</strong> và <strong>Trí Tuệ</strong> khắc trên hai cột trước cửa,
              như một lời hứa với người tới khám.
            </p>
            <p>
              Phòng khám mở cửa ngày <strong>08/11/2025</strong>, tức ngày 19 tháng 9 Âm lịch. Người sáng lập và phụ trách là <strong>Sư cô Chúc Từ</strong>.
            </p>
            <p>
              Tâm nguyện của Sư cô rất giản dị: dùng y học cổ truyền để chữa bệnh, cứu người. Không mong danh, không cầu lợi.
            </p>
            <p>
              Từ bi là thương người bệnh như thương người nhà. Trí tuệ là khám cho kỹ, chữa cho đúng, nói cho rõ. Hai điều đó là cách phòng khám làm việc mỗi ngày.
            </p>
          </div>
        </div>
      </section>

      {/* Dành cho ai */}
      <section className="i-section-80 h-alt" aria-labelledby="danh-cho-ai">
        <div className="h-wrap i-split i-split-rev">
          <div className="i-split-text" style={{ gap: 20 }}>
            <div>
              <h2 id="danh-cho-ai" className="i-h2">
                Phòng khám dành cho ai?
              </h2>
              <div className="h-rule" aria-hidden="true" />
            </div>
            <p>Phòng khám mở ra trước hết là vì những người khó khăn, bệnh mà không dám đi khám vì sợ tốn tiền:</p>
            <ul className="i-bullets">
              {FOR_WHOM.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p>Cô chú cứ đến, kể bệnh cho bác sĩ nghe là được.</p>
          </div>
          <div className="i-split-text i-note-col" style={{ gap: 16 }}>
            <div className="i-note-card">
              <h3>Mở cửa tất cả các ngày</h3>
              <p>
                Từ {CLINIC.hours}, kể cả thứ Bảy và Chủ Nhật. Buổi sáng thường đông, cô chú đi sớm hoặc đặt lịch trước để đỡ phải chờ.
              </p>
            </div>
            <div className="i-note-card">
              <h3>Cần hỏi gì, cứ gọi</h3>
              <p>
                Gọi <a href={CLINIC.phoneHref}>{CLINIC.phone}</a>, nhân viên sẽ chỉ đường, giải đáp và ghi hộ lịch khám cho cô chú.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ở đây chữa những gì */}
      <section className="i-section-80" aria-labelledby="chua-gi">
        <div className="h-wrap i-stack-40">
          <SectionHead
            id="chua-gi"
            title="Ở đây chữa những gì?"
            lead="Phòng khám chữa bằng y học cổ truyền, nhẹ nhàng, không dao kéo. Mỗi người được bác sĩ khám rồi mới chọn cách chữa cho hợp."
          />
          <div className="h-grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))' }}>
            {SERVICES.map(([icon, title, text]) => (
              <div key={title} className="i-value">
                <span className="h-dot">
                  <Icon name={icon} size={32} strokeWidth={1.75} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <p>
            <Link to="/dich-vu" className="i-anchor">
              Xem chi tiết từng dịch vụ
              <Icon name="arrowRight" size={20} />
            </Link>
          </p>
        </div>
      </section>

      {/* Ba điều */}
      <section className="i-section-80 h-alt" aria-labelledby="ba-dieu">
        <div className="h-wrap i-stack-40">
          <SectionHead id="ba-dieu" title="Ba điều phòng khám luôn giữ" />
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

      {/* Một buổi khám */}
      <section className="i-section-80" aria-labelledby="buoi-kham">
        <div className="h-wrap i-stack-40">
          <SectionHead id="buoi-kham" title="Một buổi khám ở Chúc Từ" lead="Cô chú không phải lo mình làm sai thủ tục. Mọi việc diễn ra đơn giản như sau." />
          <ol className="i-steps">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="i-step">
                <span className="h-num" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="i-step-body">
                  <h3>
                    <span className="sr-only">Bước {i + 1}: </span>
                    {title}
                  </h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Nhờ đâu mà miễn phí */}
      <section className="i-section-80 h-alt" aria-labelledby="mien-phi">
        <div className="h-wrap i-split">
          <div className="i-split-text" style={{ gap: 20 }}>
            <div>
              <h2 id="mien-phi" className="i-h2">
                Nhờ đâu mà miễn phí?
              </h2>
              <div className="h-rule" aria-hidden="true" />
            </div>
            <p>Nhiều cô chú hỏi: khám không lấy tiền, thuốc cũng không lấy tiền, vậy phòng khám lấy đâu ra mà làm?</p>
            <p>
              Câu trả lời là nhờ <strong>tấm lòng của nhiều người</strong>. Các y bác sĩ tình nguyện bớt thời gian đến khám. Các Mạnh Thường Quân góp
              thuốc, góp công, góp của.
            </p>
            <p>
              Mỗi thang thuốc cô chú cầm về là phần góp của rất nhiều người. Phòng khám chỉ là nơi gom những tấm lòng ấy lại, rồi trao tận tay người đang cần.
            </p>
            <p>
              Thăm khám, trị liệu và cả thang thuốc mang về đều <strong style={{ color: 'var(--green-700)' }}>0 đồng</strong>.
            </p>
          </div>
          <div className="i-split-text i-note-col" style={{ gap: 16 }}>
            <div className="i-note-card">
              <h3>Bếp ăn tình thương</h3>
              <p>Hoạt động song song với phòng khám, lo bữa cơm ấm lòng cho bà con tới khám.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Đội ngũ */}
      <section className="i-section-80" aria-labelledby="doi-ngu">
        <div className="h-wrap i-stack-40">
          <SectionHead
            id="doi-ngu"
            title="Những người làm việc ở phòng khám"
            lead="Bác sĩ, kỹ thuật viên và nhân viên tiếp đón làm việc tại phòng khám theo lịch cố định trong tuần."
          />
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

      {/* Lời nhắn */}
      <section className="i-section-80 h-alt" aria-labelledby="loi-nhan">
        <div className="h-wrap i-split">
          <div className="i-split-text" style={{ gap: 20 }}>
            <div>
              <h2 id="loi-nhan" className="i-h2">
                Lời nhắn của phòng khám
              </h2>
              <div className="h-rule" aria-hidden="true" />
            </div>
            <p>Bệnh để lâu thường khó chữa hơn. Đau ít mà chữa sớm thì nhẹ người, đỡ tốn công.</p>
            <p>Cô chú đừng ngại vì mình nghèo, vì mình già, hay vì nghĩ bệnh mình nhỏ không đáng đi khám.</p>
            <p>
              Cánh cửa phòng khám Chúc Từ luôn mở. Cô chú cứ đến, phòng khám ở đây để lắng nghe và chữa bệnh cho cô chú.
            </p>
          </div>
        </div>
      </section>

      <GreenCta title="Cô chú đã sẵn sàng đặt lịch khám?" />
    </div>
  );
}
