const HOME = {
  ADMIN: '/noi-bo/quan-tri',
  DOCTOR: '/noi-bo/kham-benh',
  TECHNICIAN: '/noi-bo/dieu-tri',
  RECEPTIONIST: '/noi-bo/lich-trong-ngay',
};

/** Trang đầu tiên của khu nội bộ hợp với tài khoản: đổi mật khẩu tạm, hoặc trang chính của vai trò. */
export const homeFor = (user) => (user.mustChangePassword ? '/noi-bo/doi-mat-khau' : HOME[user.role] || '/noi-bo/lich-trong-ngay');
