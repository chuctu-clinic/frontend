import { useEffect, useState } from 'react';
import { Icon } from '../../shared/ui/Icon.jsx';
import { todayVN } from '../../shared/lib/format.js';
import { longDay } from './appointments/time.js';

const timeFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

/** Dòng đầu trang Hàng đợi, Khám bệnh, Điều trị: thứ và ngày bên trái, đồng hồ số (giờ Việt Nam) chạy từng giây bên phải. */
export function TodayBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Canh theo đầu giây để đồng hồ nhảy đều
    let t;
    const tick = () => {
      setNow(new Date());
      t = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    t = setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => clearTimeout(t);
  }, []);
  const time = timeFmt.format(now);
  return (
    <div className="tb-bar">
      <p className="tb-item">
        <Icon name="calendar" size={20} strokeWidth={1.75} />
        {longDay(todayVN())}
      </p>
      <p className="tb-item tb-clock" role="timer" aria-label={`Bây giờ ${time.slice(0, 5)}`}>
        <Icon name="clock" size={20} strokeWidth={1.75} />
        <span aria-hidden="true">
          {time.slice(0, 5)}
          <span className="tb-sec">{time.slice(5)}</span>
        </span>
      </p>
    </div>
  );
}
