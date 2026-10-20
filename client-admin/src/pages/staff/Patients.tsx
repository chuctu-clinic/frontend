import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api, cleanParams, qs, type ApiError } from '@chuctu/shared/lib/api.ts';
import { fmtDate } from '@chuctu/shared/lib/format.ts';
import { useAsync, useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { Paged, Patient } from '@chuctu/shared/types.ts';
import { NbEmpty, NbError, NbLoading, NbModal, NbPageHead, NbPager } from '../../components/nb.tsx';
import { NewPatientFields, checkNewPatient } from './ApptActions.tsx';

const COLS = '170px minmax(0, 2fr) minmax(0, 1.5fr) minmax(0, 1.3fr) 150px';

/** Tạo hồ sơ tại quầy: họ tên, năm sinh, số điện thoại; cảnh báo trùng số điện thoại (BR.25, BR.35). */
function NewPatientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Patient) => void }) {
  const [form, setForm] = useState({ fullName: '', birthYear: '', phone: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [duplicate, setDuplicate] = useState<Patient | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (confirmDuplicate = false) => {
    const e = checkNewPatient(form);
    setFields(e);
    if (Object.keys(e).length) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.post<{ patient: Patient }>('/staff/patients', {
        fullName: form.fullName.trim(),
        birthYear: Number(form.birthYear),
        phone: form.phone,
        confirmDuplicate,
      });
      onCreated(res.patient);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === 'DUPLICATE_PHONE') setDuplicate((apiErr.data.duplicates as Patient[])[0] ?? null);
      else {
        setFields(apiErr.fields);
        setError(apiErr);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <NbModal title="Thêm hồ sơ mới" onClose={onClose} width={600}>
      <form
        className="nb-stack"
        style={{ gap: 22 }}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
      >
        <p>Hỏi bệnh nhân 3 thông tin dưới đây. Hệ thống tự cấp mã bệnh nhân khi tạo hồ sơ.</p>
        <NewPatientFields form={form} setForm={setForm} fields={fields} />
        {duplicate && (
          <div className="nb-warn" role="alert" style={{ flexDirection: 'column' }}>
            <p>
              Số điện thoại này đã có hồ sơ: <strong>{duplicate.fullName}</strong>, mã <strong>{duplicate.patientCode}</strong>. Nếu đúng người này thì mở hồ sơ có sẵn; nếu là người khác dùng chung số
              điện thoại thì vẫn tạo hồ sơ mới.
            </p>
            <div className="nb-row">
              <Link to={`/benh-nhan/${duplicate.id}`} className="nb-btn nb-btn-ghost">
                Mở hồ sơ có sẵn
              </Link>
              <button type="button" className="nb-btn nb-btn-ghost" disabled={pending} onClick={() => submit(true)}>
                Vẫn tạo hồ sơ mới
              </button>
            </div>
          </div>
        )}
        <NbError error={error && !Object.keys(fields).length ? error : null} />
        <div className="nb-dialog-actions">
          <button type="submit" className="nb-btn nb-btn-primary" style={{ flex: '1 1 220px' }} disabled={pending}>
            <Icon name="check" />
            Tạo hồ sơ
          </button>
          <button type="button" className="nb-btn nb-btn-ghost" onClick={onClose}>
            Huỷ
          </button>
        </div>
      </form>
    </NbModal>
  );
}

/** Danh sách và tìm kiếm bệnh nhân; thêm hồ sơ mới (UC.9.1, UC.9.2, UC.9.4). */
export default function Patients() {
  useDocumentTitle('Hồ sơ bệnh nhân');
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('trang') || 1);
  const locked = params.get('khoa') || '';
  const [q, setQ] = useState(params.get('tim') || '');
  const [query, setQuery] = useState(q);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Patient | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, reload } = useAsync(() => api.get<Paged<Patient>>(`/staff/patients${qs({ q: query, locked, page })}`), [query, locked, page]);
  const set = (next: Record<string, string | number>) => setParams(cleanParams({ tim: query, khoa: locked, trang: page, ...next }));

  return (
    <>
      <NbPageHead
        title="Hồ sơ bệnh nhân"
        lead="Hồ sơ tồn tại độc lập với tài khoản website. Bệnh nhân đến lần đầu chỉ cần cho biết họ tên, năm sinh và số điện thoại là tạo được hồ sơ, dù chưa có tài khoản."
        actions={
          <button type="button" className="nb-btn nb-btn-primary" style={{ padding: '0 26px' }} onClick={() => setCreating(true)}>
            <Icon name="plus" />
            Thêm hồ sơ mới
          </button>
        }
      />

      {created && (
        <div className="nb-ok" role="status" style={{ padding: '22px 24px', gap: '18px 20px' }}>
          <div style={{ flex: '999 1 320px' }}>
            <p style={{ fontWeight: 700 }}>
              Đã tạo hồ sơ cho <span className="nb-ink">{created.fullName}</span> — mã bệnh nhân <span className="nb-ink">{created.patientCode}</span>
            </p>
            <p style={{ color: '#4A3F33' }}>Bước tiếp theo: đặt lịch khám cho bệnh nhân này để có mã phiếu khám và giờ khám dự kiến.</p>
          </div>
          <div className="nb-row">
            <Link to={`/lich-trong-ngay?them=1&benh-nhan=${created.id}`} className="nb-btn nb-btn-primary">
              <Icon name="calendarPlus" />
              Đặt lịch khám cho bệnh nhân này
            </Link>
            <Link to={`/benh-nhan/${created.id}`} className="nb-btn nb-btn-ghost">
              Xem hồ sơ
            </Link>
          </div>
        </div>
      )}

      <div className="nb-card nb-filters" style={{ flexDirection: 'row', padding: 20 }}>
        <div className="nb-field grow">
          <label className="nb-label" htmlFor="bn-tim">
            Tìm theo mã bệnh nhân, họ tên hoặc số điện thoại
          </label>
          <input
            id="bn-tim"
            type="search"
            className="nb-input"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (page !== 1) set({ trang: 1 });
            }}
          />
        </div>
        <div className="nb-field">
          <label className="nb-label" htmlFor="bn-trangthai">
            Trạng thái
          </label>
          <select id="bn-trangthai" className="nb-select" value={locked} onChange={(e) => set({ khoa: e.target.value, trang: 1 })}>
            <option value="">Tất cả</option>
            <option value="false">Đang hoạt động</option>
            <option value="true">Đã khoá</option>
          </select>
        </div>
      </div>

      <div className="nb-card nb-card-flush">
        <p className="nb-card-title" style={{ paddingLeft: 12 }}>
          Danh sách hồ sơ — {data?.total ?? 0} hồ sơ
        </p>
        {loading && <NbLoading />}
        {!loading && data && data.items.length > 0 && (
          <div className="nb-table-wrap">
            <div className="nb-table" role="table" aria-label="Danh sách hồ sơ bệnh nhân">
              <div className="nb-tr nb-thead" role="row" style={{ ['--cols' as string]: COLS }}>
                {['Mã bệnh nhân', 'Bệnh nhân', 'Trạng thái', 'Lần khám gần nhất', 'Thao tác'].map((h) => (
                  <div key={h} className="nb-th" role="columnheader" style={{ padding: '14px 12px' }}>
                    {h}
                  </div>
                ))}
              </div>
              {data.items.map((p) => (
                <div key={p.id} className="nb-tr" role="row" style={{ ['--cols' as string]: COLS }}>
                  <div className="nb-td nb-strong" role="cell" style={{ padding: '16px 12px' }}>
                    {p.patientCode}
                  </div>
                  <div className="nb-td" role="cell" style={{ padding: '16px 12px' }}>
                    <span className="nb-strong" style={{ fontWeight: 600 }}>
                      {p.fullName}
                    </span>
                    <span className="nb-sub">{[p.birthYear && `Năm sinh ${p.birthYear}`, p.phone].filter(Boolean).join(' · ')}</span>
                  </div>
                  <div className="nb-td" role="cell" style={{ padding: '16px 12px' }}>
                    {p.isLocked ? (
                      <span className="nb-pill nb-pill-done" style={{ background: '#FFFCF6', color: '#6B5E4E', padding: '2px 10px' }}>
                        <Icon name="lock" size={18} />
                        Đã khoá
                      </span>
                    ) : (
                      <span className="nb-pill nb-pill-green" style={{ padding: '4px 12px' }}>
                        <Icon name="check" size={18} />
                        Đang hoạt động
                      </span>
                    )}
                  </div>
                  <div className="nb-td" role="cell" style={{ padding: '16px 12px' }}>
                    {p.lastVisit ? fmtDate(p.lastVisit) : 'Chưa khám lần nào'}
                  </div>
                  <div className="nb-td" role="cell" style={{ padding: '16px 12px' }}>
                    <Link to={`/benh-nhan/${p.id}`} className="nb-btn nb-btn-ghost nb-btn-sm">
                      Xem hồ sơ
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && data && data.items.length === 0 && (
          <NbEmpty title="Không tìm thấy hồ sơ nào">
            Kiểm tra lại mã, họ tên hoặc số điện thoại, hoặc đổi bộ lọc <strong>Trạng thái</strong>. Bệnh nhân đến lần đầu thì bấm <strong>Thêm hồ sơ mới</strong>.
          </NbEmpty>
        )}
        {data && <NbPager page={page} total={data.total} limit={data.limit} onPage={(p) => set({ trang: p })} unit="hồ sơ" />}
      </div>

      {creating && (
        <NewPatientModal
          onClose={() => setCreating(false)}
          onCreated={(p) => {
            setCreating(false);
            setCreated(p);
            reload({ silent: true });
          }}
        />
      )}
    </>
  );
}
