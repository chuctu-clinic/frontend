# Phòng khám Chúc Từ – Frontend

Giao diện website đặt lịch và tiếp nhận bệnh nhân của **Phòng chẩn trị Y học cổ truyền từ thiện Chúc Từ**.
API (server) nằm ở thư mục [`../backend`](../backend).

Website có hai khu dùng chung một ứng dụng:

| Khu | Địa chỉ | Dành cho |
| --- | --- | --- |
| **Trang khách** | `/` | Người bệnh: xem thông tin, đăng ký, đặt lịch, xem phiếu khám và kết quả |
| **Khu nội bộ** | `/noi-bo/` | Tiếp tân và Admin: lịch trong ngày, hàng đợi, hồ sơ, kết quả khám, bài viết, tài khoản |

| | |
| --- | --- |
| **Công nghệ** | React 18, Vite, React Router |
| **Soạn bài viết** | Tiptap, nhập nội dung từ file Word bằng mammoth |
| **Đăng nhập bằng SMS** | Firebase Phone Auth (khi backend bật) |

---

## Mục lục

1. [Chạy thử trên máy](#1-chạy-thử-trên-máy)
2. [Cấu hình `.env`](#2-cấu-hình-env)
3. [Chạy bằng Docker](#3-chạy-bằng-docker)
4. [Đưa lên mạng (triển khai)](#4-đưa-lên-mạng-triển-khai)
5. [Cấu trúc mã nguồn](#5-cấu-trúc-mã-nguồn)
6. [Quy ước khi viết code](#6-quy-ước-khi-viết-code)

---

## 1. Chạy thử trên máy

### Cần cài sẵn

- **Node.js 20** trở lên
- **Backend đang chạy** ở cổng 4000 (xem README của [`../backend`](../backend))

### Các bước

```bash
npm install      # chỉ cần lần đầu, hoặc khi package.json thay đổi
npm run dev
```

Mở trình duyệt:

- Trang khách: http://localhost:5173
- Khu nội bộ: http://localhost:5173/noi-bo/

Khi chạy `npm run dev`, Vite tự chuyển mọi yêu cầu `/api` sang backend ở `localhost:4000`. Trình duyệt chỉ thấy một địa chỉ nên cookie đăng nhập hoạt động giống như khi chạy thật.

Tài khoản để đăng nhập thử có trong README của backend (mục *Tài khoản mẫu*).

### Build bản chạy thật

```bash
npm run build      # tạo thư mục dist/
npm run preview    # xem thử bản build
```

---

## 2. Cấu hình `.env`

Chép `.env.example` thành `.env` nếu cần đổi gì. Mọi biến đều có giá trị mặc định, không tạo `.env` cũng chạy được.

| Biến | Dùng khi | Ý nghĩa | Mặc định |
| --- | --- | --- | --- |
| `DEV_PORT` | `npm run dev` | Cổng của Vite | `5173` |
| `DEV_API_TARGET` | `npm run dev` | Backend mà Vite chuyển `/api` tới | `http://localhost:4000` |
| `VITE_API_URL` | `npm run build` | Địa chỉ backend khi frontend và backend ở **hai tên miền khác nhau**. Để trống thì gọi `/api` trên cùng địa chỉ (khuyên dùng). | trống |
| `API_UPSTREAM` | chạy Docker | Backend mà nginx chuyển `/api` tới | `http://host.docker.internal:4000` |

> `VITE_API_URL` được ghi thẳng vào mã chạy trên trình duyệt, ai cũng xem được. Không đặt thông tin bí mật ở đây.

---

## 3. Chạy bằng Docker

```bash
docker compose up --build
```

Mở http://localhost:8080 (trang khách) và http://localhost:8080/noi-bo/ (khu nội bộ).

nginx phục vụ giao diện và chuyển `/api` sang backend theo biến `API_UPSTREAM`. Mặc định đó là backend chạy trên cùng máy ở cổng 4000.

---

## 4. Đưa lên mạng (triển khai)

### Cách khuyên dùng: frontend và backend chung một địa chỉ

Trình duyệt chỉ thấy một tên miền, còn `/api` được chuyển ngầm sang backend. Cookie đăng nhập là cookie cùng trang nên đơn giản và an toàn.

**Trên Vercel** (đã có sẵn `vercel.json`):

1. Trong `vercel.json`, sửa `destination` của dòng `/api/:path*` thành địa chỉ backend.

   > Hiện dòng này vẫn trỏ về backend Node.js cũ trên Render (`backend-az4x.onrender.com`). Cần đổi sang địa chỉ backend Spring Boot mới khi đưa lên mạng.

2. Để trống `VITE_API_URL`.
3. Bên backend, thêm địa chỉ Vercel vào `CLIENT_ORIGIN`. **Bắt buộc**: thiếu thì server từ chối mọi thao tác (lỗi 403) để chống giả mạo yêu cầu.
4. Trên Firebase Console, thêm tên miền Vercel vào **Authorized domains**.

**Bằng Docker:** chạy image của thư mục này với `API_UPSTREAM` là địa chỉ backend, ví dụ `API_UPSTREAM=https://api.chuctu.vn`.

### Cách khác: frontend và backend ở hai tên miền khác nhau

- Build với `VITE_API_URL=https://dia-chi-backend`.
- Đặt `CLIENT_ORIGIN` bên backend là địa chỉ frontend.
- Cả hai bên phải dùng **HTTPS**, vì cookie đăng nhập khi đó là `SameSite=None; Secure`.
- Trang tĩnh phải chuyển mọi đường dẫn về `index.html`, giống `nginx.conf`.

---

## 5. Cấu trúc mã nguồn

```
src/
  main.jsx, App.jsx     điểm khởi động; /noi-bo/* tải khu nội bộ, còn lại tải trang khách

  shared/               dùng chung cho cả hai khu
    lib/                api (gọi server), session (phiên đăng nhập), format (ngày giờ),
                        hooks (useAsync, useDismiss, useModal, useMenuPlacement...)
    ui/                 Icon, logo, nút, ô nhập, thông báo
    domain/             hằng số nghiệp vụ, kiểm tra số điện thoại, danh mục tiền sử bệnh
    styles.css          CSS nền tảng theo Design System

  site/                 trang khách, chạy ở /
    pages/public/       Trang chủ, Giới thiệu, Dịch vụ, Hướng dẫn, Liên hệ, Tin tức
    pages/auth/         Đăng ký, đăng nhập bằng số điện thoại và mã 6 số
    pages/booking/      Đặt lịch 4 bước
    pages/account/      Tài khoản, hồ sơ khám (tối đa 10), phiếu khám, kết quả, lịch sử
    components/         khung trang, hộp thoại, ô nhập dùng chung

  staff/                khu nội bộ, chạy ở /noi-bo/
    pages/auth/         Đăng nhập nội bộ, quên và đổi mật khẩu
    pages/staff/        Lịch trong ngày, hàng đợi, hồ sơ bệnh nhân, phiếu kết quả
    pages/admin/        Tổng quan, quản lý tài khoản, quản lý bài viết
    components/         khung khu nội bộ, hộp thoại, lịch tháng, phân trang
      appointments/     check-in, huỷ, đổi giờ, thêm lịch khám
      records/          biểu mẫu và bản xem phiếu kết quả khám

public/                 logo, ảnh mặt tiền, robots.txt
Dockerfile, nginx.conf  build và phục vụ bằng nginx
vercel.json             cấu hình khi đưa lên Vercel
```

---

## 6. Quy ước khi viết code

- **Hằng số nghiệp vụ phải khớp với backend.** Các file trong `src/shared/domain/` là bản chép phía giao diện của các quy tắc ở backend:

  | Frontend | Backend |
  | --- | --- |
  | `constants.js` | `common/Constants.java` |
  | `phone.js` | `common/Phones.java` |
  | `medicalHistory.js` | `record/` |

  Sửa bên nào thì sửa luôn bên kia.

- **Quy tắc luôn được kiểm tra ở backend.** Giao diện ẩn hay hiện nút chỉ để người dùng dễ thao tác, không thay cho việc kiểm tra ở server.

- **Mỗi trang có file CSS riêng.** Tên class có tiền tố theo khu để không đè nhau:

  | Tiền tố | Dùng cho |
  | --- | --- |
  | `t-` | khu nội bộ (`staff.css`) |
  | `ad-`, `pv-` | quản trị |
  | `s-` | đăng nhập nội bộ |
  | `a-` | biểu mẫu trang khách |
  | `b-`, `bk-` | đặt lịch |
  | `r-` | phiếu kết quả |
  | `h-` | trang chủ |
  | `i-` | trang thông tin |
  | `p-` | tin tức |

- **Một phiên đăng nhập cho cả hai khu.** Khách và nhân viên dùng chung cookie `ct_session`. Trang nào dùng được do vai trò tài khoản quyết định. Một trình duyệt chỉ đăng nhập một tài khoản tại một thời điểm.

- **Menu thao tác trên bảng** dùng hook `useMenuPlacement` để tự chọn mở lên hay mở xuống theo chỗ trống thật, kể cả khi bảng nằm trong khung cuộn trên màn hình hẹp.
