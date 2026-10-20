// Hai ứng dụng chạy chung một tên miền: trang khách ở "/" và khu nội bộ ở "/noi-bo/".
// Chuyển qua lại giữa hai ứng dụng phải tải lại trang (thẻ <a>), không dùng <Link>.
export const USER_URL = import.meta.env.VITE_USER_URL || '/';
export const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || '/noi-bo/';

/** Đường dẫn tới một trang của khu nội bộ, ví dụ adminUrl('dang-nhap'). */
export const adminUrl = (p = '') => ADMIN_URL + p.replace(/^\//, '');
