import { useId, useState } from 'react';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { fmtDate } from '../../../shared/lib/format.js';
import { TSheet } from '../dialogs.jsx';
import { fmtLeft, fmtStamp } from '../../lib/format.js';
import { fromRecord, toPayload, validateRecord, editState } from './recordForm.js';
import { RecordFields } from './RecordFields.jsx';
import { ResultDialog } from './ResultSheet.jsx';

/**
 * Sửa phiếu kết quả trong hộp thoại: sửa → Lưu thay đổi → xem lại → Xác nhận (UC.9.9).
 * `onSaved(record)` nhận phiếu sau khi server lưu.
 */
export function EditRecordDialog({ record, patient, onClose, onSaved }) {
  const titleId = useId();
  const [form, setForm] = useState(() => fromRecord(record));
  const [tried, setTried] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const errs = validateRecord(form);
  const shown = tried ? errs : {};
  const st = editState(record, false);

  const review = () => {
    setTried(true);
    if (Object.values(errs).some(Boolean)) return;
    setReviewing(true);
  };

  const confirm = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await api.put(`/staff/records/${record.id}`, toPayload(form));
      onSaved(res.record);
    } catch (err) {
      setError(err);
      setReviewing(false);
    } finally {
      setPending(false);
    }
  };

  if (reviewing) {
    return (
      <ResultDialog
        draft={{ ...record, ...toPayload(form) }}
        patient={patient}
        pending={pending}
        onConfirm={confirm}
        onClose={() => setReviewing(false)}
      />
    );
  }

  return (
    <TSheet labelledBy={titleId} onClose={onClose}>
      <div className="t-sheet-head">
        <div className="t-sheet-title">
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId} className="t-h2">
              Sửa phiếu kết quả khám
            </h2>
            <p className="t-muted">
              Mã phiếu khám {record.appointment?.ticketCode} · Ngày khám {fmtDate(record.visitDate)}
            </p>
          </div>
          <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 20px' }} onClick={onClose}>
            <Icon name="x" size={20} />
            Huỷ sửa
          </button>
        </div>
        <p role="status" className="t-tint-gold-line t-iconrow" style={{ gap: 10, borderRadius: 12, padding: '12px 16px' }}>
          <Icon name="edit" size={22} />
          <span>
            <strong className="t-strong">Đang sửa phiếu đã xác nhận.</strong> Còn sửa được đến <strong className="t-strong">{fmtStamp(st.until)}</strong> (còn {fmtLeft(st.left)}).
            Bấm Lưu thay đổi để xem lại phiếu trước khi xác nhận.
          </span>
        </p>
      </div>
      <div className="t-sheet-body" style={{ padding: '24px 28px' }}>
        <RecordFields form={form} setForm={setForm} errors={shown} visitDate={record.visitDate} />
        <ErrorAlert error={error} />
      </div>
      <div className="t-sheet-foot">
        <button type="button" className="t-btn t-btn-primary t-btn-lg" onClick={review}>
          <Icon name="check" strokeWidth={2.25} />
          Lưu thay đổi
        </button>
        <button type="button" className="t-btn t-btn-ghost t-btn-lg" onClick={onClose}>
          Huỷ sửa
        </button>
      </div>
    </TSheet>
  );
}
