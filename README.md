# Phòng khám Chúc Từ – Frontend

Giao diện website quản lý tiếp nhận và đặt lịch khám của Phòng chẩn trị Y học cổ truyền từ thiện Chúc Từ, dựng theo prototype **Website Phòng khám Chúc Từ** cùng Design System của phòng khám. API nằm ở repo [chuctu-clinic/backend](https://github.com/chuctu-clinic/backend).

| Phần | Nội dung |
| --- | --- |
| `src/site` | Trang khách, chạy ở `/`: trang thông tin, đăng nhập bằng số điện thoại, đặt lịch, phiếu khám, tài khoản |
| `src/staff` | Khu tiếp tân và Admin, chạy ở `/noi-bo/` |
| `src/shared` | Gọi API, phiên đăng nhập, định dạng, component và CSS dùng chung |
| Công nghệ | ReactJS 18 + Vite, React Router |

## Chạy thử

Yêu cầu Node.js 20 trở lên. Chạy backend trước (repo backend: `npm run dev`, API ở cổng 4000), rồi:

```bash
npm install
npm run dev
```

- Trang khách: http://localhost:5173
- Khu nội bộ (tiếp tân, Admin): http://localhost:5173/noi-bo/

`npm run dev` chạy Vite ở cổng 5173 và chuyển `/api` sang backend ở `localhost:4000`, giống khi triển khai thật: chung một địa chỉ và chung cookie phiên. Tài khoản mẫu xem ở README của backend.

```bash
npm run build      # build ra dist/
```

## Chạy bằng Docker

```bash
docker compose up --build
```

Mở http://localhost:8080 (trang khách) và http://localhost:8080/noi-bo/ (tiếp tân, Admin). nginx phục vụ ứng dụng (cả `/` lẫn `/noi-bo/`) và chuyển `/api` sang backend theo biến `API_UPSTREAM`. Mặc định là backend chạy trên cùng máy ở cổng 4000 (repo backend: `docker compose up`).

## Triển khai

Có hai cách nối với backend:

1. **Cùng địa chỉ** (khuyên dùng): chạy image Docker của repo này với `API_UPSTREAM` là địa chỉ backend, ví dụ `API_UPSTREAM=https://api.chuctu.vn`. Trình duyệt chỉ thấy một địa chỉ, cookie phiên là cookie cùng trang.
2. **Khác địa chỉ** (ví dụ frontend tĩnh trên Vercel/Netlify): build với `VITE_API_URL=https://dia-chi-backend` và đặt `CLIENT_ORIGIN` bên backend là địa chỉ frontend. Cả hai bên phải dùng HTTPS vì cookie phiên là `SameSite=None; Secure`. Trang tĩnh cần cấu hình chuyển mọi đường dẫn về `index.html` giống `nginx.conf`.

| Biến | Lúc | Ý nghĩa |
| --- | --- | --- |
| `API_UPSTREAM` | chạy container | Địa chỉ backend mà nginx chuyển `/api` tới. |
| `VITE_API_URL` | build | Địa chỉ API khi frontend và backend ở hai địa chỉ khác nhau. Để trống thì gọi `/api` cùng địa chỉ. |

Khách và nhân viên dùng chung một phiên đăng nhập (cookie `ct_session`); trang nào dùng được do vai trò của tài khoản quyết định. Một trình duyệt chỉ đăng nhập được một tài khoản tại một thời điểm.

## Cấu trúc mã nguồn

```
src/
  main.jsx, App.jsx     điểm vào; "/noi-bo/*" tải khu nội bộ, còn lại tải trang khách (hai phần tải riêng)
  site/                 trang khách, chạy ở /
    pages/public        Trang chủ, Giới thiệu, Dịch vụ, Hướng dẫn, Liên hệ, Tin tức
    pages/auth          Đăng nhập / đăng ký bằng số điện thoại + mã 6 số (console hoặc Firebase)
    pages/account       Thông tin tài khoản, hồ sơ khám (tối đa 10), phiếu khám, kết quả, lịch sử
    pages/booking       Đặt lịch 4 bước
  staff/                khu tiếp tân và Admin, chạy ở /noi-bo/
    pages/auth          Đăng nhập nội bộ, đổi mật khẩu
    pages/staff         Lịch trong ngày, đặt hộ tại quầy, hàng đợi, hồ sơ bệnh nhân, phiếu kết quả
    pages/admin         Tổng quan, quản lý tài khoản, quản lý bài viết (trình soạn Tiptap)
  shared/               mã dùng chung cho hai khu
    constants.js, phone.js  BẢN CHÉP: repo backend có một bản ở src/shared/. Sửa bên nào thì chép sang bên kia.
    lib/, components/   gọi API, phiên đăng nhập, định dạng, Icon, nút, ô nhập, hộp thoại,
                        chọn ngày giờ, phiếu kết quả
    styles.css          CSS nền tảng theo Design System
Dockerfile, nginx.conf  build ứng dụng và phục vụ bằng nginx

## Việc còn lại

- **Nơi triển khai**: chưa chọn, chưa có CI/CD.
