import { Icon } from '../../../shared/ui/Icon.jsx';
import { CLINIC, fmtDate, weekday } from '../../../shared/lib/format.js';
import { HISTORY_ITEMS, parseHistory } from '../../../shared/domain/medicalHistory.js';

// Phiếu kết quả khám theo màn "Phiếu khám · Kết quả khám" của prototype (KetQuaKham.dc.html)

/** "2026-09-28" → "Ngày 28 tháng 09 năm 2026" (dòng ký tên cuối phiếu). */
const dateInWords = (iso) => {
  const [y, m, d] = iso.split('-');
  return `Ngày ${d} tháng ${m} năm ${y}`;
};

const dobText = (p) => (p?.dob ? fmtDate(String(p.dob).slice(0, 10)) : p?.birthYear ? `Năm ${p.birthYear}` : null);

/** Ghi chú điều trị: ô trống thì ghi "Không thực hiện." như phiếu giấy. */
function NoteRow({ label, value }) {
  return (
    <div className="r-full r-note-row">
      <dt>{label}</dt>
      <dd className={value ? '' : 'r-muted'}>{value || 'Không thực hiện.'}</dd>
    </div>
  );
}

export function ResultSheet({ record }) {
  const p = record.patient;
  const notes = record.treatmentNotes || {};
  const history = parseHistory(record.medicalHistory);
  return (
    <article className="r-sheet" aria-label={`Kết quả khám ngày ${fmtDate(record.visitDate)}`}>
      <div className="r-sheet-top">
        <div>
          <p>Phòng chẩn trị Y học cổ truyền từ thiện</p>
          <h2>CHÚC TỪ</h2>
          <p>
            {CLINIC.address}
            <br />
            Số điện thoại: {CLINIC.phone2} · Sư cô Chúc Từ
          </p>
        </div>
        <span className="r-verified">
          <Icon name="check" size={20} strokeWidth={2.25} />
          Phòng khám đã xác nhận
        </span>
      </div>

      <div className="r-sheet-body">
        <div className="r-sheet-title">
          <h3>Kết quả khám</h3>
          <p>
            {weekday(record.visitDate)}, {fmtDate(record.visitDate)}
          </p>
        </div>

        <section aria-labelledby="kq-bn">
          <h4 id="kq-bn">Thông tin bệnh nhân</h4>
          <dl className="r-grid">
            <div className="r-full">
              <dt>Họ và tên</dt>
              <dd>
                {p?.fullName} <small>· Mã bệnh nhân {p?.patientCode}</small>
              </dd>
            </div>
            <div>
              <dt>Ngày sinh</dt>
              <dd>{dobText(p) || '—'}</dd>
            </div>
            <div>
              <dt>Số điện thoại</dt>
              <dd>{p?.phone || '—'}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="kq-nd">
          <h4 id="kq-nd">Nội dung khám</h4>
          <dl className="r-grid">
            <div className="r-full">
              <dt>1. Chẩn đoán</dt>
              <dd className="r-text">{record.diagnosis || '—'}</dd>
            </div>
            <div>
              <dt>Mạch</dt>
              <dd>{record.pulse ? `${record.pulse} lần/phút` : '—'}</dd>
            </div>
            <div>
              <dt>H/A (huyết áp)</dt>
              <dd>{record.bloodPressure ? `${record.bloodPressure} mmHg` : '—'}</dd>
            </div>
            <div className="r-full r-sub">
              <dt>2. Ghi chú điều trị</dt>
            </div>
            <NoteRow label="Châm cứu" value={notes.acupuncture} />
            <NoteRow label="Bấm huyệt" value={notes.acupressure} />
            <NoteRow label="Khác" value={notes.other} />
          </dl>
        </section>

        <section aria-labelledby="kq-ts">
          <h4 id="kq-ts">Tiền sử bệnh</h4>
          <ul className="r-ts">
            {HISTORY_ITEMS.map((it, i) => {
              const line = history.lines[i];
              const detail = line && line.includes(':') ? line.slice(line.indexOf(':') + 1).trim() : '';
              return (
                <li key={it.label}>
                  <span aria-hidden="true" className={`r-box ${line ? 'on' : ''}`}>
                    {line && <Icon name="check" size={22} strokeWidth={3} />}
                  </span>
                  <span>
                    <span className="r-ts-name">
                      {i + 1}. {it.label}
                      <span className="sr-only">{line ? ': có' : ': không'}</span>
                    </span>
                    {detail && <span className="r-ts-detail">{detail}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          {history.extra.length > 0 && <p className="r-history">{history.extra.join('\n')}</p>}
        </section>

        <section aria-label="Lưu ý" className="r-warn">
          <Icon name="infoSoft" strokeWidth={1.75} />
          <div>
            <p>Lưu ý</p>
            <ul>
              <li>Khám và điều trị miễn phí.</li>
              <li>Bệnh nhân tự ý trao đổi với Y Bác sĩ để điều trị và mua thuốc thì phòng khám không chịu trách nhiệm.</li>
              <li>
                {record.followUpDate ? (
                  <strong>
                    Hẹn tái khám {weekday(record.followUpDate).toLowerCase()}, ngày {fmtDate(record.followUpDate)}.
                  </strong>
                ) : (
                  'Lần khám này bác sĩ không hẹn tái khám.'
                )}
              </li>
            </ul>
          </div>
        </section>

        <div className="r-sign">
          <div>
            <p>{dateInWords(record.visitDate)}</p>
            <p>Bác sĩ điều trị</p>
            <p>{record.doctorName || '—'}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
