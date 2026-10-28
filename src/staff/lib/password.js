// Khớp rules.minPasswordLength ở Backend
export const MIN_PASSWORD_LENGTH = 8;

/** Lỗi theo từng ô của biểu mẫu đổi mật khẩu (theo prototype "TaiKhoan"); {} nếu hợp lệ. */
export function passwordErrors({ currentPassword, newPassword, confirm }) {
  const fields = {};
  if (!currentPassword) fields.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
  if (newPassword.length < MIN_PASSWORD_LENGTH) fields.newPassword = `Mật khẩu mới cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  else if (currentPassword && newPassword === currentPassword) fields.newPassword = 'Mật khẩu mới cần khác mật khẩu hiện tại.';
  else if (confirm !== newPassword) fields.confirm = 'Hai mật khẩu mới chưa giống nhau.';
  return fields;
}
