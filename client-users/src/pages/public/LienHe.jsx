import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { CLINIC } from '@chuctu/shared/lib/format.js';
import { GreenCta, PageHero, SectionHead, usePageMeta } from './infoParts.jsx';

// Theo màn "Khách · Liên hệ" của prototype (LienHe.dc.html)

const MAP_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(`Phòng khám Chúc Từ, ${CLINIC.address}`)}&output=embed`;

const FACTS = [
  ['Giờ khám', CLINIC.hours, 'Buổi sáng rất đông, cô chú nên đi sớm.'],
  ['Ngày làm việc', 'Cả 7 ngày', 'Thứ Hai đến Chủ Nhật, không nghỉ cuối tuần.'],
  ['Chi phí', '0 đồng', 'Khám, trị liệu và thuốc mang về đều miễn phí.'],
];

const TRANSPORT = [
  ['bike', 'Đi xe máy', 'Gửi xe ngay trong sân phòng khám, nhân viên trông giúp và không thu phí.'],
  ['bus', 'Đi xe buýt', 'Các tuyến chạy dọc Điện Biên Phủ, xuống trạm gần số 57 rồi đi bộ chừng 3 phút vào hẻm.'],
  ['car', 'Đi taxi hoặc xe công nghệ', `Đọc cho tài xế: “Phòng khám Chúc Từ, ${CLINIC.address}”.`],
];

const FAQ = [
  ['Gọi lúc nào thì có người nghe?', `Trong giờ làm việc ${CLINIC.hours}, tất cả các ngày. Ngoài giờ cô chú để lại tin nhắn, phòng khám gọi lại sau.`],
  ['Không rành điện thoại thì sao?', 'Cô chú nhờ con cháu đăng ký giúp, hoặc gọi điện để nhân viên đặt lịch hộ.'],
  ['Có phải trả khoản nào không?', 'Không. Thăm khám, châm cứu, trị liệu và thuốc mang về đều miễn phí hoàn toàn.'],
];

export default function LienHe() {
  const meta = usePageMeta('lien-he', {
    crumb: 'Liên hệ',
    title: 'Liên hệ phòng khám',
    summary: 'Gọi điện là cách nhanh nhất — có người trực nghe máy trong giờ làm việc. Cô chú cũng có thể tới thẳng phòng khám, không cần hẹn trước.',
  });

  return (
    <div className="info-page">
      <PageHero
        crumb="Liên hệ"
        title={meta.title}
        lead={meta.summary}
        aside={
          <div className="i-split-media">
            <img
              className="i-photo i-photo-gold"
              style={{ height: 320 }}
              src="/mat-tien.jpg"
              alt="Mặt tiền Phòng khám Chúc Từ, có hai chữ Từ Bi và Trí Tuệ trên hai cột"
            />
          </div>
        }
      >
        <div className="i-notes" style={{ gap: 12 }}>
          <span className="i-chip">
            <Icon name="clockSoft" size={20} strokeWidth={1.75} />
            Mở cửa tất cả các ngày, kể cả Chủ Nhật
          </span>
          <span className="i-chip i-chip-gold">
            <Icon name="heartSoft" size={20} strokeWidth={1.75} />
            Khám và bốc thuốc không thu phí
          </span>
        </div>
      </PageHero>

      <section className="i-section" style={{ paddingBottom: 0 }} aria-labelledby="cach-lien-he">
        <div className="h-wrap i-stack">
          <SectionHead id="cach-lien-he" title="Cô chú liên hệ bằng cách nào cũng được" />
          <div className="h-grid-2">
            <div className="i-way i-way-gold">
              <span className="h-dot">
                <Icon name="phone" size={32} strokeWidth={1.75} />
              </span>
              <h3>Gọi cho phòng khám</h3>
              <p>Hỏi gì cũng được: hôm nay còn nhận số không, đường đi thế nào, hay nhờ đặt lịch giúp.</p>
              <a href={CLINIC.phoneHref} className="i-call-big">
                <Icon name="phone" size={28} strokeWidth={1.75} />
                {CLINIC.phone}
              </a>
              <div className="i-second">
                <p>Máy bận thì cô chú gọi số thứ hai:</p>
                <a href="tel:0835555115">{CLINIC.phone2}</a>
                <p className="f-muted">Sư cô Chúc Từ</p>
              </div>
            </div>
            <div className="i-way i-way-green">
              <span className="h-dot">
                <Icon name="pin" size={32} strokeWidth={1.75} />
              </span>
              <h3>Đến thẳng phòng khám</h3>
              <p>Không có hẹn trước cô chú vẫn được tiếp đón. Nhân viên sẽ sắp xếp lượt khám cho cô chú.</p>
              <p style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{CLINIC.address}</p>
              <a className="h-btn h-btn-ghost" href="#tim-duong">
                <Icon name="map" strokeWidth={1.75} />
                Xem hướng dẫn đường đi
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="i-section" style={{ paddingTop: 40, paddingBottom: 0 }} aria-label="Thông tin nhanh">
        <div className="h-wrap h-grid-3" style={{ gap: 20 }}>
          {FACTS.map(([label, value, note]) => (
            <div key={label} className="i-fact">
              <p className="i-fact-label">{label}</p>
              <p className="i-fact-value">{value}</p>
              <p className="i-fact-note">{note}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="tim-duong" className="i-section" style={{ scrollMarginTop: 100 }} aria-labelledby="tim-duong-title">
        <div className="h-wrap i-stack">
          <SectionHead id="tim-duong-title" title="Tìm đường tới phòng khám" />
          <div className="i-map-row">
            <div className="i-map">
              <iframe title={`Bản đồ đường tới Phòng khám Chúc Từ, ${CLINIC.address}`} src={MAP_EMBED} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              <div className="i-map-foot">
                <p>Cô chú đưa địa chỉ này cho tài xế xe ôm hoặc taxi là tới nơi.</p>
                <a className="h-btn h-btn-ghost" href={CLINIC.mapUrl} target="_blank" rel="noreferrer">
                  Mở bản đồ
                  <Icon name="external" size={20} strokeWidth={1.75} />
                  <span className="sr-only">(mở trang mới)</span>
                </a>
              </div>
            </div>
            <div className="i-landmarks">
              <h3>Mốc nhận đường</h3>
              <ol>
                <li>
                  <span className="h-num" aria-hidden="true">
                    1
                  </span>
                  <p>
                    Đi dọc đường <strong>Điện Biên Phủ</strong>.
                  </p>
                </li>
                <li>
                  <span className="h-num" aria-hidden="true">
                    2
                  </span>
                  <p>
                    Rẽ vào <strong>hẻm 57</strong>, đi thêm một đoạn ngắn.
                  </p>
                </li>
                <li>
                  <span className="h-num" aria-hidden="true">
                    3
                  </span>
                  <p>
                    Phòng khám ở số <strong>8-10</strong>, bên phải lối vào.
                  </p>
                </li>
              </ol>
              <div className="i-lost">
                Lạc đường thì cô chú cứ gọi <a href={CLINIC.phoneHref}>{CLINIC.phone}</a>, phòng khám chỉ đường cho.
              </div>
            </div>
          </div>

          <div className="h-grid-3" style={{ gap: 20 }}>
            {TRANSPORT.map(([icon, title, text]) => (
              <div key={title} className="i-transport">
                <span className="h-dot">
                  <Icon name={icon} size={26} strokeWidth={1.75} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="i-recognize">
            <div>
              <h3>Nhận biết phòng khám</h3>
              <p>Cổng màu vàng, mái ngói đỏ, hai cột trước cửa khắc chữ “Từ Bi” và “Trí Tuệ”. Bảng hiệu ghi “Phòng Chẩn Trị Y Học Cổ Truyền Từ Thiện Chúc Từ”.</p>
            </div>
            <div>
              <h3>Tới nơi thì làm gì</h3>
              <p>
                Nhân viên tiếp đón, ghi thông tin và xếp lượt khám. Cô chú đợi tới lượt gặp bác sĩ xem mạch, qua khu trị liệu nếu có chỉ định, cuối cùng nhận thuốc rồi
                ra về.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="i-section" style={{ paddingTop: 0 }} aria-labelledby="hoi-dap">
        <div className="h-wrap i-stack" style={{ gap: 28 }}>
          <h2 id="hoi-dap" className="i-h2 i-h2-sm" style={{ marginBottom: 0 }}>
            Mấy điều bà con hay hỏi
          </h2>
          <div className="h-grid-3" style={{ gap: 24 }}>
            {FAQ.map(([q, a]) => (
              <div key={q} className="i-faq">
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GreenCta title="Muốn giữ chỗ trước cho đỡ phải chờ?" text="Cô chú đăng nhập rồi đặt lịch, có ngay phiếu khám kèm giờ khám dự kiến." />
    </div>
  );
}
