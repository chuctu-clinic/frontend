import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { api } from '../../../shared/lib/api.js';
import { fmtTime, todayVN } from '../../../shared/lib/format.js';
import { useDocumentTitle } from '../../../shared/lib/hooks.js';
import { longDay } from '../../components/appointments/time.js';
import './queueDisplay.css';

// Màn hình hàng đợi chiếu lên TV ở phòng chờ: chỉ xem, tự làm mới, không có thao tác nào.
// Mở từ trang Hàng đợi trên máy tiếp tân (phiên đăng nhập nội bộ), kéo cửa sổ sang màn hình thứ hai rồi bật toàn màn hình.

const POLL_MS = 5_000;
const NEXT_LIMIT = 10;
const HIGHLIGHT_MS = 10_000;

/** Họ tên đầy đủ, gom khoảng trắng thừa. */
function displayName(full) {
  const name = String(full || '').trim().replace(/\s+/g, ' ');
  return name || 'Bệnh nhân';
}

/** Tên dài thì thu nhỏ chữ ô lớn một bậc để vẫn hiện trọn, không cắt. */
const callSize = (name) => (name.length > 26 ? 'xl' : name.length > 18 ? 'lg' : '');

/** Người được mời gần nhất: ghế có giờ vào khám muộn nhất. */
function latestCalled(seats) {
  let best = null;
  for (const s of seats) {
    if (s.empty || !s.enteredAt) continue;
    if (!best || new Date(s.enteredAt) > new Date(best.enteredAt)) best = s;
  }
  return best;
}

/** Tiếng "ting – tong" bằng Web Audio, không cần file âm thanh. */
function chime(ctx) {
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  [
    [880, 0],
    [660, 0.45],
  ].forEach(([freq, at]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.4, now + at + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 1.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + at);
    osc.stop(now + at + 1.2);
  });
}

export default function QueueDisplay() {
  useDocumentTitle('Màn hình hàng đợi');
  const [data, setData] = useState(null);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [flash, setFlash] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [idle, setIdle] = useState(false);
  const [isFull, setIsFull] = useState(() => Boolean(document.fullscreenElement));
  const audioRef = useRef(null);
  const lastCallRef = useRef(undefined);

  // Làm mới hàng đợi; lỗi mạng thì giữ dữ liệu cũ và báo nhỏ ở góc
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const next = await api.get('/staff/queue');
        if (!alive) return;
        setData(next);
        setOffline(false);
      } catch {
        if (alive) setOffline(true);
      }
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Đồng hồ
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(t);
  }, []);

  // Có người mới được mời: nhấp nháy và kêu chuông (lần nạp đầu thì không)
  const called = data ? latestCalled(data.seats) : null;
  const callKey = called ? `${called.id}@${called.enteredAt}` : null;
  useEffect(() => {
    if (!data) return undefined;
    const prev = lastCallRef.current;
    lastCallRef.current = callKey;
    if (prev === undefined || !callKey || prev === callKey) return undefined;
    setFlash(true);
    chime(audioRef.current);
    const t = setTimeout(() => setFlash(false), HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [callKey, data]);

  // Giữ màn hình luôn sáng (trình duyệt hỗ trợ thì dùng)
  useEffect(() => {
    let lock = null;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request('screen');
      } catch {
        /* không hỗ trợ hoặc bị từ chối: bỏ qua */
      }
    };
    request();
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release?.().catch(() => {});
    };
  }, []);

  // Biểu tượng toàn màn hình đổi theo trạng thái (kể cả khi thoát bằng phím Esc)
  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Ẩn con trỏ chuột khi không động tới
  useEffect(() => {
    let t = setTimeout(() => setIdle(true), 4_000);
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), 4_000);
    };
    window.addEventListener('mousemove', wake);
    window.addEventListener('keydown', wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  const enableSound = async () => {
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      await audioRef.current.resume();
      setSoundOn(true);
      chime(audioRef.current);
    } catch {
      setSoundOn(false);
    }
  };

  const toggleSound = () => {
    if (soundOn) {
      audioRef.current?.suspend();
      setSoundOn(false);
    } else enableSound();
  };

  const fullscreen = async () => {
    if (!soundOn) enableSound();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* trình duyệt không cho: bỏ qua */
    }
  };

  const next = data ? data.waiting.slice(0, NEXT_LIMIT) : [];
  const more = data ? Math.max(0, data.waitingCount - next.length) : 0;

  return (
    <div className={`qd ${idle ? 'idle' : ''}`}>
      <header className="qd-head">
        <div className="qd-brand">
          <img src={`${import.meta.env.BASE_URL}logo-192.png`} alt="" />
          <div>
            <p className="qd-brand-sub">Phòng chẩn trị Y học cổ truyền từ thiện</p>
            <p className="qd-brand-name">Chúc Từ</p>
          </div>
        </div>
        <div className="qd-head-right">
          <div className="qd-clock">
            <p className="qd-time">{fmtTime(now)}</p>
            <p className="qd-date">{longDay(todayVN())}</p>
          </div>
          <div className="qd-controls">
            <button type="button" onClick={toggleSound} aria-label={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'} title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}>
              <Icon name={soundOn ? 'volume' : 'volumeOff'} strokeWidth={1.75} />
            </button>
            <button type="button" onClick={fullscreen} aria-label={isFull ? 'Thoát toàn màn hình' : 'Toàn màn hình'} title={isFull ? 'Thoát toàn màn hình' : 'Toàn màn hình'}>
              <Icon name={isFull ? 'minimize' : 'maximize'} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      <main className="qd-main">
        <section className="qd-left">
          <div className={`qd-call ${flash ? 'flash' : ''} ${called ? '' : 'none'}`} aria-live="assertive">
            <p className="qd-label">Đang mời vào khám</p>
            {called ? (
              <>
                <p className={`qd-call-name ${callSize(displayName(called.patient?.fullName))}`}>{displayName(called.patient?.fullName)}</p>
                <p className="qd-call-seat">
                  Xin mời vào <strong>Ghế số {called.seatNo}</strong>
                </p>
              </>
            ) : (
              <p className="qd-call-wait">Phòng khám sẽ mời bệnh nhân đầu tiên trong ít phút</p>
            )}
          </div>

          <div className="qd-seats-wrap">
            <p className="qd-label dark">Đang khám</p>
            <div className="qd-seats">
              {(data?.seats || []).map((s) => (
                <div key={s.seatNo} className={`qd-seat ${s.empty ? 'empty' : ''} ${called && s.id === called.id ? 'current' : ''}`}>
                  <p className="qd-seat-no">Ghế {s.seatNo}</p>
                  <p className="qd-seat-name">{s.empty ? 'Trống' : displayName(s.patient?.fullName)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="qd-right">
          <p className="qd-label dark">Lượt tiếp theo</p>
          {data && next.length === 0 && <p className="qd-empty">Hiện chưa có ai đang chờ</p>}
          <ol className="qd-next">
            {next.map((w, i) => (
              <li key={w.id} className={w.priorityGroup === 'PRIORITY' ? 'prio' : ''}>
                <span className="qd-no">{i + 1}</span>
                <span className="qd-next-name">{displayName(w.patient?.fullName)}</span>
                {w.priorityGroup === 'PRIORITY' && <span className="qd-tag">Đặt trước</span>}
              </li>
            ))}
          </ol>
          <p className="qd-total">
            {data ? (
              <>
                Đang chờ: <strong>{data.waitingCount}</strong> người{more > 0 && ` (còn ${more} người sau)`}
              </>
            ) : (
              'Đang tải hàng đợi…'
            )}
          </p>
        </section>
      </main>

      <footer className="qd-foot">
        <div className="qd-marquee">
          <span>
            Cô chú vui lòng ngồi chờ, khi màn hình hiện tên mình xin mời vào đúng số ghế · Người có phiếu đặt trước và đến đúng khung giờ được xếp lên trước · Cần hỗ trợ xin
            hỏi quầy tiếp tân
          </span>
        </div>
      </footer>

      {offline && <p className="qd-offline">Mất kết nối, đang thử lại…</p>}
    </div>
  );
}
