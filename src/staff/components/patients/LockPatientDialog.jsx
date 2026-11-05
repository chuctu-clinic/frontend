import { useState } from 'react';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { ErrorAlert } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { TDialog } from '../dialogs.jsx';

/** Admin khoá hoặc mở khoá hồ sơ (UC.9.8). */
export function LockPatientDialog({ patient, onClose, onDone }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const locking = !patient.isLocked;
  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await api.post(`/admin/patients/${patient.id}/${locking ? 'lock' : 'unlock'}`);
      onDone(res.patient);
    } catch (err) {
      setError(err);
      setPending(false);
    }
  };
  return (
    <TDialog title={locking ? 'Khoá hồ sơ bệnh nhân?' : 'Mở khoá hồ sơ?'} tone={locking ? 'red' : 'green'} width={600} onClose={onClose}>
      <div className="t-dialog-body">
        <p className="t-text">
          {locking ? (
            <>
              Sau khi khoá, hồ sơ <strong className="t-strong">không chọn được khi đặt lịch</strong>, <strong className="t-strong">không ghi nhận lượt khám mới</strong> và không sửa được.
              Các phiếu khám đã đặt vẫn giữ nguyên, lịch sử khám vẫn xem được.
            </>
          ) : (
            'Hồ sơ sẽ dùng lại được: đặt lịch, ghi nhận lượt khám và sửa thông tin.'
          )}
        </p>
        <ErrorAlert error={error} />
        <div className="t-actions">
          <button type="button" className={`t-btn ${locking ? 't-btn-danger' : 't-btn-primary'} t-btn-grow`} disabled={pending} onClick={submit}>
            <Icon name={locking ? 'lock' : 'unlock'} />
            {locking ? 'Khoá hồ sơ' : 'Mở khoá'}
          </button>
          <button type="button" className="t-btn t-btn-ghost" onClick={onClose}>
            Quay lại
          </button>
        </div>
      </div>
    </TDialog>
  );
}
