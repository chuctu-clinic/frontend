// Nhãn và hằng số dùng chung trong giao diện; giá trị khớp với backend.

export const ROLE_LABELS = { USER: 'Người dùng', RECEPTIONIST: 'Tiếp tân', DOCTOR: 'Bác sĩ', TECHNICIAN: 'Kỹ thuật viên', ADMIN: 'Quản trị viên' };

// Kỹ thuật bác sĩ chỉ định cho kỹ thuật viên
export const TREATMENT_KINDS = {
  CHAM_CUU: 'Châm cứu',
  XOA_BOP_BAM_HUYET: 'Xoa bóp — bấm huyệt',
  VAT_LY_TRI_LIEU: 'Vật lý trị liệu',
  KHAC: 'Khác',
};

// Các bước của một lượt khám sau khi check-in
export const VISIT_STAGE_LABELS = {
  WAITING: 'Chờ khám',
  EXAMINING: 'Đang khám',
  WAITING_TREATMENT: 'Chờ điều trị',
  IN_ROOM: 'Đang điều trị',
  WAITING_CONCLUSION: 'Chờ kết luận',
  COMPLETED: 'Đã hoàn thành',
};

export const GENDERS = { NAM: 'Nam', NU: 'Nữ', KHAC: 'Khác' };

export const RELATIONSHIPS = {
  BAN_THAN: 'Bản thân',
  VO_CHONG: 'Vợ / chồng',
  CON: 'Con',
  CHA_ME: 'Cha / mẹ',
  ONG_BA: 'Ông / bà',
  ANH_CHI_EM: 'Anh / chị / em',
  KHAC: 'Khác',
};

// Giờ nhận bệnh (giờ Việt Nam), tất cả các ngày: chỉ check-in trong khoảng này, từ 16:30 là đóng cửa.
// Từ noShowCancel, phiếu trong ngày còn Chưa đến tự chuyển sang Đã huỷ.
export const RECEIVING_HOURS = { open: '08:00', close: '16:30', label: '8:00 – 16:30', noShowCancel: '17:00' };
