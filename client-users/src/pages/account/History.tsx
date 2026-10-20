import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Loading } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { CLINIC, fmtDate, relationshipLabel } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { Patient, MedicalRecord } from '@chuctu/shared/types.ts';

/** Tóm tắt một lượt khám: chẩn đoán, điều trị, huyết áp. */
const summary = (r: MedicalRecord) =>
  [
    r.diagnosis,
    [r.treatmentNotes?.acupuncture && `Châm cứu: ${r.treatmentNotes.acupuncture}`, r.treatmentNotes?.acupressure && `Bấm huyệt: ${r.treatmentNotes.acupressure}`, r.treatmentNotes?.other]
      .filter(Boolean)
      .join('. '),
    r.bloodPressure && `Huyết áp ${r.bloodPressure} mmHg`,
  ]
    .filter(Boolean)
    .join('. ') || 'Phòng khám đã ghi nhận kết quả.';

/** Lịch sử khám / điều trị theo từng hồ sơ của bản thân và người thân (UC.6.9). */
export default function History() {
  useDocumentTitle('Lịch sử khám');
  const [params, setParams] = useSearchParams();
  const profiles = useAsync(() => api.get<{ items: Patient[]; max: number }>('/me/patients'), []);
  // Lấy hết một lần để đếm số lượt khám của từng hồ sơ
  const { data, loading } = useAsync(() => api.get<{ items: MedicalRecord[] }>('/me/history'), []);
  const list = profiles.data?.items || [];
  const records = data?.items || [];
  const current = list.find((p) => p.id === params.get('ho-so')) || list.find((p) => p.relationship === 'BAN_THAN') || list[0];
  const visits = records.filter((r) => r.patientId === current?.id);
  const count = (id: string) => records.filter((r) => r.patientId === id).length;

  return (
    <>
      <section className="u-band">
        <div className="u-wrap">
          <h1 className="u-h1">Lịch sử khám</h1>
          <p className="u-lead" style={{ maxWidth: '70ch' }}>
            Các lượt khám và điều trị trước đây của cô chú và của người thân đã tạo hồ sơ trong tài khoản này. Chỉ cô chú xem được phần này.
          </p>
        </div>
      </section>
      <section className="u-section">
        <div className="u-wrap">
          {(loading || profiles.loading) && <Loading />}
          {list.length > 0 && (
            <div className="u-field" role="group" aria-label="Chọn hồ sơ để xem lịch sử khám" style={{ gap: 12 }}>
              <span className="u-label" style={{ fontSize: 18 }}>
                Xem lịch sử khám của
              </span>
              <div className="u-tabs">
                {list.map((p) => (
                  <button key={p.id} type="button" className="u-tab" aria-pressed={current?.id === p.id} onClick={() => setParams({ 'ho-so': p.id }, { replace: true })}>
                    {p.fullName}
                    <span className="u-tab-sub">{p.relationship === 'BAN_THAN' ? 'Chính tôi' : relationshipLabel(p.relationship)}</span>
                    <span className="u-tab-n">{count(p.id)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {current && data && (
            <div className="u-stack" style={{ gap: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <h2 className="u-h2">{current.fullName}</h2>
                <p className="u-text u-muted" style={{ fontSize: 17 }}>
                  Hồ sơ {current.patientCode}
                  {current.dob ? ` · Sinh ngày ${fmtDate(current.dob.slice(0, 10))}` : current.birthYear ? ` · Sinh năm ${current.birthYear}` : ''}
                </p>
                <div className="u-rule" style={{ marginTop: 6 }} />
              </div>
              {visits.map((r) => (
                <div key={r.id} className="u-visit">
                  <div className="u-visit-date" aria-label={`Ngày ${fmtDate(r.visitDate)}`}>
                    <span>Th.{r.visitDate.slice(5, 7)}</span>
                    <span>{Number(r.visitDate.slice(8, 10))}</span>
                  </div>
                  <div>
                    <h3>
                      {r.appointment?.serviceLabel || 'Khám bệnh'}{' '}
                      <span className="u-muted" style={{ fontSize: 17, fontWeight: 500 }}>
                        · {fmtDate(r.visitDate)}
                      </span>
                    </h3>
                    <p>{summary(r)}</p>
                  </div>
                  <Link to={`/phieu-kham/${r.appointmentId}/ket-qua`} className="u-btn u-btn-ghost" style={{ minHeight: 52, fontSize: 18 }}>
                    Xem kết quả
                    <Icon name="arrowRight" size={20} />
                  </Link>
                </div>
              ))}
              {visits.length === 0 && (
                <div className="u-card u-card-pad u-stack" style={{ padding: 32, gap: 14 }}>
                  <h3 className="u-h3" style={{ fontSize: 24 }}>
                    Chưa có lượt khám nào
                  </h3>
                  <p className="u-text">Hồ sơ của {current.fullName} chưa có lượt khám nào ở phòng khám. Sau khi khám xong, kết quả sẽ hiện ở đây.</p>
                  <Link to="/dat-lich" className="u-btn u-btn-primary" style={{ alignSelf: 'flex-start' }}>
                    <Icon name="calendarPlus" />
                    Đặt lịch khám
                  </Link>
                </div>
              )}
              <p className="u-text">
                Chỉ các lượt khám thuộc hồ sơ trong tài khoản của cô chú mới hiện ở đây. Thấy thiếu hoặc sai, cô chú báo cho phòng khám qua số{' '}
                <a href={CLINIC.phoneHref} className="u-link">
                  {CLINIC.phone}
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
