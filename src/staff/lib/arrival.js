import { clock } from '../components/visit/VisitSummary.jsx';

const minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Loại đến khám của một người trong hàng chờ khám: [nhãn, lớp màu hd-kind]. */
export function arrival(w) {
  if (w.priorityGroup === 'PRIORITY') return ['Đúng giờ', 'ontime'];
  if (w.source === 'COUNTER') return ['Không hẹn', 'walkin'];
  return minutesOf(clock(w.checkInTime)) < minutesOf(w.slotStart) ? ['Đến sớm', 'early'] : ['Đến muộn', 'late'];
}

/** Chia hàng chờ khám thành nhóm có hẹn đúng giờ (đứng trước) và còn lại, kèm số thứ tự bắt đầu của mỗi nhóm. */
export function waitingGroups(waiting) {
  const prio = waiting.filter((w) => w.priorityGroup === 'PRIORITY');
  const rest = waiting.filter((w) => w.priorityGroup !== 'PRIORITY');
  return [
    ['Có hẹn, đến đúng giờ', prio, 0, 'prio'],
    ['Còn lại', rest, prio.length, ''],
  ].filter(([, list]) => list.length > 0);
}
