import { Icon } from '../../../shared/ui/Icon.jsx';
import { fmtDate } from '../../../shared/lib/format.js';
import { fmtStamp } from '../../lib/format.js';
import { editState } from './recordForm.js';

/** Lịch sử khám: ngày, chẩn đoán, người ghi nhận, xem / sửa phiếu. */
export function HistoryTable({ records, locked, onView, onEdit, withVitals }) {
  const grid = { gridTemplateColumns: withVitals ? '200px minmax(0, 1fr) 150px 170px 190px' : '200px minmax(0, 1fr) 160px 190px', alignItems: 'start' };
  return (
    <div className="t-boxed t-scroll">
      <div role="table" aria-label="Lịch sử khám của hồ sơ" className="t-table">
        <div role="row" className="t-tr t-thead" style={{ ...grid, alignItems: 'center' }}>
          <div role="columnheader" className="t-th">
            Ngày khám
          </div>
          <div role="columnheader" className="t-th">
            Chẩn đoán
          </div>
          {withVitals && (
            <div role="columnheader" className="t-th">
              Mạch · H/A
            </div>
          )}
          <div role="columnheader" className="t-th">
            Người ghi nhận
          </div>
          <div role="columnheader" className="t-th">
            {withVitals ? 'Phiếu' : 'Phiếu kết quả'}
          </div>
        </div>
        <div role="rowgroup" className="t-tbody">
          {records.map((r) => {
            const st = editState(r, locked);
            return (
              <div key={r.id} role="row" className="t-tr" style={grid}>
                <div role="cell" className="t-td">
                  <span className="t-td-name">{fmtDate(r.visitDate)}</span>
                  <span className="t-td-sub">{r.appointment?.ticketCode}</span>
                </div>
                <div role="cell" className="t-td t-text">
                  {r.diagnosis || '—'}
                </div>
                {withVitals && (
                  <div role="cell" className="t-td t-text">
                    <span style={{ display: 'block' }}>{r.pulse ? `${String(r.pulse).replace(/\D/g, '')} lần/phút` : '—'}</span>
                    <span style={{ display: 'block' }}>{r.bloodPressure ? `${r.bloodPressure} mmHg` : '—'}</span>
                  </div>
                )}
                <div role="cell" className="t-td t-text">
                  {r.recordedByName || '—'}
                </div>
                <div role="cell" className="t-td" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                  <button type="button" className="t-btn t-btn-ghost t-btn-sm" aria-haspopup="dialog" onClick={() => onView(r)}>
                    <Icon name="eye" size={20} />
                    {withVitals ? 'Xem' : 'Xem phiếu'}
                  </button>
                  {st.editable && onEdit && (
                    <>
                      <button type="button" className="t-btn t-btn-gold t-btn-sm" aria-haspopup="dialog" onClick={() => onEdit(r)}>
                        <Icon name="edit" size={20} />
                        Sửa phiếu
                      </button>
                      <span className="t-text">Sửa được đến {fmtStamp(st.until).replace(' ngày ', ' ')}</span>
                    </>
                  )}
                  {withVitals && !st.editable && !locked && (
                    <span className="t-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="lock" size={18} />
                      Đã khoá sửa
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
