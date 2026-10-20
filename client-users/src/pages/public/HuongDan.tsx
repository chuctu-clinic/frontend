import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { CLINIC } from '@chuctu/shared/lib/format.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { PageHero, SectionHead, usePageMeta } from './infoParts.tsx';

// Theo màn "Khách · Hướng dẫn" của prototype (HuongDan.dc.html)

const VISIT_STEPS = [
  ['Tới phòng khám', 'Vào cổng, gửi xe trong sân rồi đi tới bàn tiếp đón. Buổi sáng đông, cô chú nên đi sớm.'],
  ['Khai thông tin, lập hồ sơ', 'Nhân viên ghi họ tên, ngày sinh, số điện thoại và tình trạng bệnh. Chưa có tài khoản trên web vẫn được lập hồ sơ bình thường.'],
  ['Ngồi chờ đến lượt', 'Có đặt lịch trước thì đưa phiếu khám cho tiếp tân, cô chú được gọi theo giờ khám dự kiến trên phiếu khám, đỡ phải chờ lâu.'],
  ['Bác sĩ xem mạch và chẩn đoán', 'Cô chú kể rõ chỗ đau, đau từ bao giờ và đang uống thuốc gì. Bác sĩ bắt mạch rồi giải thích hướng điều trị.'],
  ['Trị liệu nếu có chỉ định', 'Qua khu trị liệu để châm cứu, bấm huyệt, xoa bóp hoặc tác động cột sống. Mỗi buổi thường kéo dài khoảng nửa tiếng.'],
  ['Nhận thuốc và hẹn tái khám', 'Lấy thang thuốc tại quầy, nghe dặn cách sắc và cách uống. Cần theo đợt thì phòng khám hẹn ngày quay lại.'],
];

function Step({ n, title, children, action }: { n: number; title: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <li className="i-step">
      <span className="h-num" aria-hidden="true">
        {n}
      </span>
      <div className="i-step-body">
        <h3>
          <span className="sr-only">Bước {n}: </span>
          {title}
        </h3>
        {children}
      </div>
      {action}
    </li>
  );
}

export default function HuongDan() {
  const meta = usePageMeta('huong-dan', {
    crumb: 'Hướng dẫn',
    title: 'Hướng dẫn đi khám',
    summary: 'Cô chú có thể đăng ký trước trên mạng cho đỡ phải chờ, hoặc cứ tới thẳng phòng khám trong giờ làm việc. Cách nào cũng được.',
  });
  const { user } = useSession();
  const loggedIn = user?.role === 'USER';

  return (
    <div className="info-page">
      <PageHero crumb="Hướng dẫn" title={meta.title} lead={meta.summary}>
        <nav className="i-anchors" aria-label="Các mục trong trang">
          <a className="i-anchor" href="#dang-ky-truc-tuyen">
            Đăng ký khám trực tuyến
          </a>
          <a className="i-anchor" href="#di-kham-truc-tiep">
            Quy trình đi khám trực tiếp
          </a>
          <a className="i-anchor" href="#luu-y">
            Lưu ý khi đi khám
          </a>
        </nav>
      </PageHero>

      <section id="dang-ky-truc-tuyen" className="i-section" style={{ scrollMarginTop: 100 }}>
        <div className="h-wrap i-stack">
          <SectionHead
            eyebrow="Cách thứ nhất"
            title="Hướng dẫn đăng ký khám trực tuyến"
            lead={
              <>
                Đăng ký trước trên trang web để giữ chỗ. Đặt lịch xong là cô chú <strong>có phiếu khám ngay</strong> — không cần chờ phòng khám xác nhận.
              </>
            }
          />
          <ol className="i-steps">
            <Step
              n={1}
              title="Tạo tài khoản — chỉ làm một lần"
              action={
                !loggedIn && (
                  <Link to="/dang-ky" className="h-btn h-btn-ghost i-step-btn">
                    Mở trang tạo tài khoản
                  </Link>
                )
              }
            >
              <p>
                Bấm <strong>Đăng nhập</strong> ở góc trên bên phải, rồi chọn <strong>Tạo tài khoản</strong>. Cô chú nhập họ tên, ngày sinh, địa chỉ và số điện
                thoại, rồi nhập mã 6 số mà phòng khám gửi về tin nhắn. Không cần đặt hay nhớ mật khẩu.
              </p>
            </Step>
            <Step n={2} title="Đăng nhập vào tài khoản">
              <p>
                Phải đăng nhập mới đặt được lịch. Cô chú nhập số điện thoại, chờ tin nhắn rồi nhập mã 6 số. Chọn giữ đăng nhập thì lần sau không cần nhập mã. Không
                nhận được tin nhắn, đổi số hoặc mất SIM thì cô chú gọi phòng khám, nhân viên sẽ xác minh và giúp.
              </p>
            </Step>
            <Step
              n={3}
              title="Đặt lịch khám"
              action={
                <Link to="/dat-lich" className="h-btn h-btn-primary i-step-btn">
                  {loggedIn ? 'Đặt lịch khám' : 'Đăng nhập để đặt lịch'}
                </Link>
              }
            >
              <p>
                Bấm <strong>Đặt lịch khám</strong>, chọn nội dung khám, ngày và giờ khám mong muốn, rồi chọn người đi khám. Xong thì bấm <strong>Đặt lịch khám</strong>{' '}
                ở bước cuối.
              </p>
            </Step>
            <Step n={4} title="Nhận phiếu khám ngay">
              <p style={{ marginBottom: 14 }}>
                Bấm đặt lịch xong, trang chuyển sang <strong>phiếu khám</strong> có mã phiếu khám và giờ khám dự kiến. Không cần chờ phòng khám xác nhận:
              </p>
              <span className="i-chip" style={{ fontSize: 17 }}>
                <Icon name="checkSoft" size={20} strokeWidth={1.75} />
                Đã đặt lịch — cô chú có phiếu khám
              </span>
            </Step>
            <Step
              n={5}
              title="Đến phòng khám đưa phiếu khám"
              action={
                <Link to="/phieu-kham" className="h-btn h-btn-ghost i-step-btn">
                  {loggedIn ? 'Xem phiếu khám bệnh' : 'Đăng nhập để xem phiếu khám bệnh'}
                </Link>
              }
            >
              <p>
                Cô chú xem lại phiếu khám trong mục <strong>Phiếu khám bệnh</strong>. Hôm đi khám, đưa phiếu khám cho tiếp tân check-in là xong.
              </p>
            </Step>
          </ol>
          <div className="i-tips-row">
            <div className="i-tip i-tip-gold">
              <Icon name="cancelSoft" strokeWidth={1.75} />
              <p>
                <strong>Muốn huỷ lịch?</strong> Cô chú mở phiếu khám trong mục <strong>Phiếu khám bệnh</strong> rồi bấm <strong>Huỷ phiếu khám</strong>.
              </p>
            </div>
            <div className="i-tip i-tip-green">
              <Icon name="phone" strokeWidth={1.75} />
              <p>
                <strong>Không rành điện thoại?</strong> Cô chú nhờ con cháu đăng ký giúp, hoặc gọi <a href={CLINIC.phoneHref}>{CLINIC.phone}</a> để nhân viên ghi hộ
                yêu cầu.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="di-kham-truc-tiep" className="i-section h-alt" style={{ scrollMarginTop: 100 }}>
        <div className="h-wrap i-stack">
          <SectionHead
            eyebrow="Cách thứ hai"
            title="Hướng dẫn quy trình đi khám trực tiếp"
            lead={
              <>
                Không đăng ký trước cô chú vẫn được khám. Cứ tới phòng khám trong giờ làm việc <strong>{CLINIC.hours}</strong>, tất cả các ngày kể cả Chủ Nhật.
              </>
            }
          />
          <ol className="h-grid-3" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 24 }}>
            {VISIT_STEPS.map(([title, text], i) => (
              <li key={title} className="i-visit">
                <span className="h-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>
                  <span className="sr-only">Bước {i + 1}: </span>
                  {title}
                </h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <div className="i-tip i-tip-card">
            <Icon name="heartSoft" strokeWidth={1.75} />
            <p>
              Cả quá trình — thăm khám, châm cứu, trị liệu và thuốc mang về — đều <strong style={{ color: 'var(--green-700)' }}>miễn phí hoàn toàn</strong>. Cô chú
              không phải chuẩn bị tiền, cũng không ai thu khoản nào.
            </p>
          </div>
        </div>
      </section>

      <section id="luu-y" className="i-section" style={{ scrollMarginTop: 100 }}>
        <div className="h-wrap i-stack">
          <SectionHead eyebrow="Trước khi đi" title="Lưu ý khi đi khám" />
          <div className="h-grid-2" style={{ gap: 20 }}>
            <div className="i-advice">
              <Icon name="phone" strokeWidth={1.75} />
              <p>
                <strong>Gọi điện hỏi trước</strong> — lịch của các bác sĩ có thể thay đổi, có ngày bệnh nhân quá đông. Gọi <a href={CLINIC.phoneHref}>{CLINIC.phone}</a>{' '}
                để hỏi khung giờ còn nhận bệnh.
              </p>
            </div>
            <div className="i-advice">
              <Icon name="sun" strokeWidth={1.75} />
              <p>
                <strong>Đi sớm đầu giờ sáng</strong> — buổi sáng rất đông, đi sớm vừa đỡ phải chờ vừa tránh hết số nhận bệnh trong ngày.
              </p>
            </div>
            <div className="i-advice">
              <Icon name="file" strokeWidth={1.75} />
              <p>
                <strong>Mang theo hồ sơ bệnh cũ</strong> — phim X-quang, MRI, đơn thuốc cũ từ bệnh viện Tây y. Giúp bác sĩ nắm rõ tổn thương để châm cứu, bấm huyệt
                chính xác và an toàn hơn.
              </p>
            </div>
            <div className="i-advice">
              <Icon name="medicine" strokeWidth={1.75} />
              <p>
                <strong>Nói rõ thuốc đang uống</strong> — kể cả thuốc huyết áp, tiểu đường hay thuốc Nam mua ngoài, để bác sĩ cân nhắc khi kê thang thuốc.
              </p>
            </div>
            <div className="i-advice">
              <Icon name="bowl" strokeWidth={1.75} />
              <p>
                <strong>Ăn nhẹ trước khi đi</strong> — đừng để bụng quá đói khi châm cứu, dễ bị “vựng châm” (chóng mặt, cồn cào, vã mồ hôi). Cũng đừng ăn quá no ngay
                trước giờ khám.
              </p>
            </div>
            <div className="i-advice">
              <Icon name="shirt" strokeWidth={1.75} />
              <p>
                <strong>Mặc quần áo rộng rãi</strong> — áo quần ống rộng hoặc cài nút, để bác sĩ dễ bộc lộ huyệt vị khi châm cứu, xoa bóp.
              </p>
            </div>
          </div>
          <div className="i-tip i-tip-red">
            <Icon name="warning" strokeWidth={1.75} />
            <p>
              <strong>Người cao tuổi, người đi lại khó khăn nên có người nhà đi cùng.</strong> Nếu cô chú đang sốt cao, đau dữ dội hoặc có dấu hiệu cấp cứu, xin tới
              bệnh viện trước — phòng khám là nơi điều trị bằng y học cổ truyền, không nhận cấp cứu.
            </p>
          </div>
          <div className="i-help">
            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
              <h3>Còn điều gì chưa rõ?</h3>
              <p>Cô chú gọi cho phòng khám, có người trực nghe máy trong giờ làm việc.</p>
            </div>
            <div className="h-actions" style={{ gap: 14 }}>
              <a href={CLINIC.phoneHref} className="h-btn h-btn-light" style={{ fontWeight: 700 }}>
                <Icon name="phone" strokeWidth={1.75} />
                {CLINIC.phone}
              </a>
              <Link to="/lien-he" className="h-btn h-btn-outline-light">
                Trang Liên hệ
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
