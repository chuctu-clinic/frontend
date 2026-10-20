import { Link, useParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Loading } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { CLINIC, fmtDate, fmtDateLong } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { UError } from '../../components/uparts.tsx';
import type { MedicalRecord, Patient } from '@chuctu/shared/types.ts';

/** "2026-10-21" → "Ngày 21 tháng 10 năm 2026" như chữ ký trên phiếu giấy. */
const dateInWords = (d: string) => `Ngày ${Number(d.slice(8, 10))} tháng ${Number(d.slice(5, 7))} năm ${d.slice(0, 4)}`;

/** Kết quả khám của một phiếu, chỉ có sau khi phòng khám ghi nhận (UC.6.8). */
export default function TicketResult() {
  const { id } = useParams();
  useDocumentTitle('Kết quả khám');
  const { data, loading, error } = useAsync(() => api.get<{ record: MedicalRecord }>(`/me/appointments/${id}/result`), [id]);
  // Ngày sinh và số điện thoại lấy từ hồ sơ khám của tài khoản
  const profiles = useAsync(() => api.get<{ items: Patient[] }>('/me/patients'), []);
  const r = data?.record;
  const p = profiles.data?.items.find((x) => x.id === r?.patientId);
  const notes = r?.treatmentNotes;
  const empty = <em className="u-muted" style={{ fontWeight: 400 }}>Không ghi</em>;

  return (
    <>
      <section className="u-band">
        <div className="u-wrap">
          <h1 className="u-h1">Kết quả khám</h1>
          <p className="u-lead" style={{ maxWidth: '70ch' }}>
            {r
              ? `Kết quả buổi khám ${fmtDateLong(r.visitDate)} của ${r.patient?.fullName}, do phòng khám ghi nhận và xác nhận.`
              : 'Kết quả buổi khám do phòng khám ghi nhận và xác nhận.'}
          </p>
        </div>
      </section>
      <section className="u-section">
        <div className="u-wrap">
          <nav aria-label="Quay lại" style={{ display: 'flex' }}>
            <Link to="/lich-su-kham" className="u-pill-back">
              <Icon name="arrowLeft" />
              Lịch sử khám
            </Link>
          </nav>
          {loading && <Loading />}
          <UError>{error?.message}</UError>
          {r && (
            <article className="u-result">
              <div className="u-result-head">
                <div style={{ flex: '1 1 380px' }}>
                  <p>Phòng chẩn trị Y học cổ truyền từ thiện</p>
                  <h2>CHÚC TỪ</h2>
                  <p>
                    {CLINIC.address}
                    <br />
                    Số điện thoại: {CLINIC.phone2} · Sư cô Chúc Từ
                  </p>
                </div>
                <span className="u-result-ok">
                  <Icon name="checkCircle" size={20} />
                  Phòng khám đã xác nhận
                </span>
              </div>
              <div className="u-result-body">
                <div className="u-row" style={{ justifyContent: 'space-between', gap: '8px 16px', alignItems: 'baseline' }}>
                  <h3 className="u-h2">Kết quả khám</h3>
                  <p className="u-text u-ink" style={{ fontSize: 19, fontWeight: 600 }}>
                    {fmtDateLong(r.visitDate)}
                    {r.appointment && ` · ${r.appointment.serviceLabel}`}
                  </p>
                </div>
                <section aria-labelledby="kq-bn">
                  <h4 id="kq-bn">Thông tin bệnh nhân</h4>
                  <dl className="u-result-grid">
                    <div>
                      <dt>Họ và tên</dt>
                      <dd style={{ fontSize: 21 }}>
                        {r.patient?.fullName}{' '}
                        <span className="u-muted" style={{ fontSize: 17, fontWeight: 500 }}>
                          · Mã bệnh nhân {r.patient?.patientCode}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Ngày sinh</dt>
                      <dd>{p?.dob ? fmtDate(p.dob.slice(0, 10)) : p?.birthYear || '—'}</dd>
                    </div>
                    <div>
                      <dt>Số điện thoại</dt>
                      <dd>{p?.phone || '—'}</dd>
                    </div>
                  </dl>
                </section>
                <section aria-labelledby="kq-nd">
                  <h4 id="kq-nd">Nội dung khám</h4>
                  <dl className="u-result-grid">
                    <div style={{ gridColumn: '1 / -1', paddingTop: 16 }}>
                      <dt>1. Chẩn đoán</dt>
                      <dd className="text">{r.diagnosis || empty}</dd>
                    </div>
                    <div>
                      <dt>Mạch</dt>
                      <dd>{r.pulse ? `${r.pulse} lần/phút` : empty}</dd>
                    </div>
                    <div>
                      <dt>H/A (huyết áp)</dt>
                      <dd>{r.bloodPressure ? `${r.bloodPressure} mmHg` : empty}</dd>
                    </div>
                  </dl>
                  <dl style={{ margin: 0 }}>
                    <div style={{ padding: '16px 0 6px' }}>
                      <dt style={{ fontSize: 16, color: '#6b5e4e' }}>2. Ghi chú điều trị</dt>
                    </div>
                    {(
                      [
                        ['Châm cứu', notes?.acupuncture],
                        ['Bấm huyệt', notes?.acupressure],
                        ['Khác', notes?.other],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k} className="u-result-row">
                        <dt>{k}</dt>
                        <dd>{v || empty}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <section aria-labelledby="kq-ts">
                  <h4 id="kq-ts">Tiền sử bệnh</h4>
                  <p className="u-text" style={{ padding: '14px 0', fontSize: 19, lineHeight: '31px', whiteSpace: 'pre-line', color: '#2a2118' }}>
                    {r.medicalHistory || 'Không ghi nhận tiền sử bệnh.'}
                  </p>
                </section>
                <section aria-label="Lưu ý">
                  <div className="u-warn" style={{ background: '#f7ebd2' }}>
                    <span style={{ color: "#8a6012", display: "inline-flex" }}><Icon name="infoSoft" /></span>
                    <div>
                      <p style={{ margin: 0, fontSize: 17, lineHeight: '27px', fontWeight: 700, color: '#8a6012', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lưu ý</p>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 22, fontSize: 18, lineHeight: '30px' }}>
                        <li>Khám và điều trị miễn phí.</li>
                        <li>Bệnh nhân tự ý trao đổi với Y Bác sĩ để điều trị và mua thuốc thì phòng khám không chịu trách nhiệm.</li>
                        {r.followUpDate && (
                          <li>
                            <strong className="u-ink">Hẹn tái khám ngày {fmtDate(r.followUpDate.slice(0, 10))}.</strong>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </section>
                <div className="u-result-sign">
                  <p className="u-text">{dateInWords(r.visitDate)}</p>
                  <p style={{ fontSize: 17, lineHeight: '26px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2a2118' }}>Bác sĩ điều trị</p>
                  <p style={{ fontFamily: "'Noto Serif', Georgia, serif", fontSize: 22, lineHeight: '30px', fontWeight: 700, color: '#2e5b37' }}>{r.doctorName || '—'}</p>
                </div>
              </div>
            </article>
          )}
        </div>
      </section>
    </>
  );
}
