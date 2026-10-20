// Kiểu dữ liệu API trả về. Khớp với các hàm *View và toPublic() ở backend (src/services, src/models).
// Ngày giờ đi qua JSON nên là chuỗi: ngày khám dạng "YYYY-MM-DD", thời điểm dạng ISO.
import type { AppointmentStatus, Gender, Relationship, Role, ServiceType, UserStatus } from './constants.ts';

export type { AppointmentStatus, Gender, Relationship, Role, ServiceType, UserStatus };

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface User {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  dob: string | null;
  gender: Gender | null;
  address: string | null;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Patient {
  id: string;
  patientCode: string;
  userId: string | null;
  relationship: Relationship | null;
  fullName: string;
  dob: string | null;
  birthYear: number | null;
  gender: Gender | null;
  phone: string | null;
  address: string | null;
  isLocked: boolean;
  lockedAt: string | null;
  createdAt: string;
  /** Chỉ có trong danh sách hồ sơ của tiếp tân: ngày khám gần nhất. */
  lastVisit?: string | null;
}

export type AppointmentSource = 'ONLINE' | 'COUNTER';

export interface Appointment {
  id: string;
  ticketCode: string;
  serviceType: ServiceType;
  serviceLabel: string;
  slotDate: string;
  slotStart: string;
  expectedTime: string;
  /** Người dùng chỉ nhận ba trạng thái của UserStatus (BR.17). */
  status: AppointmentStatus;
  source: AppointmentSource;
  cancelReason: string | null;
  cancelledAt: string | null;
  rescheduledFromId: string | null;
  createdAt: string;
  patient: {
    id: string;
    patientCode: string;
    fullName: string;
    relationship: Relationship | null;
    birthYear: number | null;
    phone?: string | null;
    isLocked: boolean;
  } | null;
  /** Chỉ có ở API của người dùng. */
  hasResult?: boolean;
  /** Chỉ có ở Lịch trong ngày của tiếp tân. */
  checkInTime?: string | null;
  enteredAt?: string | null;
  priorityGroup?: 'PRIORITY' | 'NORMAL' | null;
  /** Thứ tự trong hàng chờ, nếu đang chờ. */
  queueNo?: number | null;
}

export type TreatmentKey = 'acupuncture' | 'acupressure' | 'other';

export interface RecordEdit {
  editedByName: string;
  editedAt: string;
  changes: Record<string, { from: string | null; to: string | null }>;
}

export interface MedicalRecord {
  id: string;
  /** Người lập phiếu kết quả. */
  recordedByName: string | null;
  appointmentId: string;
  patientId: string;
  visitDate: string;
  diagnosis: string | null;
  pulse: string | null;
  bloodPressure: string | null;
  treatmentNotes: Record<TreatmentKey, string | null>;
  medicalHistory: string | null;
  followUpDate: string | null;
  doctorName: string | null;
  /** Không có ở API của người dùng. */
  editHistory?: RecordEdit[];
  createdAt: string;
  updatedAt: string;
  appointment: { id: string; ticketCode: string; slotStart: string; serviceType: ServiceType; serviceLabel: string } | null;
  patient: { id: string; fullName: string; patientCode: string } | null;
}

export type PostStatus = 'DRAFT' | 'PUBLISHED';

export interface Post {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  categoryLabel: string;
  summary: string;
  thumbnailUrl: string | null;
  authorName: string;
  status: PostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Chỉ có khi xem một bài, không có trong danh sách. */
  content?: string;
}

export interface Slot {
  start: string;
  end: string;
  booked: number;
  capacity: number;
  remaining: number;
  available: boolean;
  reason: string | null;
}

export interface Meta {
  today: string;
  serviceTypes: Option<ServiceType>[];
  slots: string[];
  slotCapacity: number;
  userMaxDays: number;
  counterMaxDays: number;
  seats: number;
  maxProfiles: number;
  relationships: Record<Relationship, string>;
  statusLabels: Record<AppointmentStatus, string>;
  cancelReasons: string[];
  postCategories: Option[];
}

/** Kết quả gửi mã xác nhận; devCode chỉ có khi phát triển. */
export interface OtpInfo {
  sent: boolean;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  devCode?: string;
}

export type CheckinStatus = 'WAITING' | 'IN_ROOM' | 'COMPLETED' | 'REVERTED';

export interface QueueEntry {
  id: string;
  appointmentId: string;
  ticketCode?: string;
  slotStart?: string;
  serviceType?: ServiceType;
  source?: AppointmentSource;
  patient: { id: string; fullName: string; patientCode: string; birthYear?: number | null } | null;
  priorityGroup: 'PRIORITY' | 'NORMAL';
  status: CheckinStatus;
  seatNo: number | null;
  checkInTime: string;
  enteredAt: string | null;
  waitedMinutes: number;
}

export interface EmptySeat {
  seatNo: number;
  empty: true;
}

export interface SlotMapRow {
  start: string;
  startMinutes: number;
  booked: number;
  capacity: number;
  notArrived: number;
  checkins: { id: string; fullName?: string; ticketCode?: string; status: CheckinStatus; seatNo: number | null }[];
}

export interface QueueState {
  date: string;
  capacity: number;
  autoInvite: boolean;
  seats: (QueueEntry | EmptySeat)[];
  inRoomCount: number;
  waiting: QueueEntry[];
  waitingCount: number;
  completedCount: number;
  slotMap: SlotMapRow[];
}

export interface MiniQueue {
  date: string;
  inRoom: number;
  waiting: number;
  capacity: number;
  /** Những người kế tiếp trong hàng chờ (tối đa bằng số ghế). */
  next: { id: string; fullName: string; priority: boolean }[];
}

export interface DashboardOverview {
  date: string;
  appointments: { total: number; active: number; byStatus: Partial<Record<AppointmentStatus, number>> };
  patients: { total: number };
  posts: { published: number; draft: number };
  accounts: Partial<Record<Role, number>>;
  drafts: Post[];
  queue: Pick<QueueState, 'inRoomCount' | 'waitingCount' | 'completedCount' | 'capacity' | 'slotMap'>;
}
