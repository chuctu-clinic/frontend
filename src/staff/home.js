/** Trang đầu tiên của khu nội bộ hợp với tài khoản: đổi mật khẩu tạm, Tổng quan (Admin) hoặc Lịch trong ngày. */
export const homeFor = (user) =>
  user.mustChangePassword ? '/noi-bo/doi-mat-khau' : user.role === 'ADMIN' ? '/noi-bo/quan-tri' : '/noi-bo/lich-trong-ngay';
