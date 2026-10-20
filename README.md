# Phòng khám Chúc Từ – Frontend

Giao diện website quản lý tiếp nhận và đặt lịch khám của Phòng chẩn trị Y học cổ truyền từ thiện Chúc Từ, theo prototype **Website Phòng khám Chúc Từ** cùng Design System của phòng khám.

API nằm ở repo [chuctu-clinic/backend](https://github.com/chuctu-clinic/backend).

| Phần | Công nghệ |
| --- | --- |
| Frontend | ReactJS 18 + Vite + TypeScript, React Router |
| Ứng dụng | `client-users` (khách, chạy ở `/`) và `client-admin` (tiếp tân, Admin, chạy ở `/noi-bo/`) |
| Mã dùng chung | gói `@chuctu/shared` trong `shared/` |

## Chạy thử

Yêu cầu Node.js 20 trở lên. Chạy backend trước (`npm run dev` ở repo backend, API ở cổng 4000), rồi:

```bash
npm install
npm run dev
```

- Trang khách: http://localhost:5173
- Khu nội bộ (tiếp tân, Admin): http://localhost:5173/noi-bo/

`npm run dev` chạy 2 tiến trình: `client-users` (5173) và `client-admin` (5174). Cổng 5173 chuyển tiếp `/noi-bo` sang 5174 và `/api` sang backend ở `http://localhost:4000`, nên mở mọi thứ qua 5173 là giống khi triển khai thật: chung một địa chỉ và chung cookie phiên.

Backend chạy ở địa chỉ khác thì đặt biến `API_TARGET`, ví dụ `API_TARGET=http://localhost:4100 npm run dev`.

Tài khoản mẫu (backend tự nạp khi chạy với MongoDB trong bộ nhớ):

| Vai trò | Đăng nhập |
| --- | --- |
| Admin | `admin@chuctu.vn` hoặc `0900000001`, mật khẩu `ChucTu@2026` (trang `/noi-bo/dang-nhap`) |
| Tiếp tân | `letan@chuctu.vn` hoặc `0900000002`, mật khẩu `ChucTu@2026` |
| Người dùng | Số điện thoại `0912345678` (trang `/dang-nhap`) |

### Build

```bash
npm run typecheck # kiểm tra kiểu bằng tsc (chế độ strict) cho shared, client-users, client-admin
npm run build     # kiểm tra kiểu rồi build client-users/dist và client-admin/dist
```

Mỗi lời gọi API ghi rõ kiểu dữ liệu trả về, ví dụ `api.get<{ user: User }>('/auth/me')`. Các kiểu nằm ở `shared/src/types.ts` và phải khớp với dữ liệu backend trả về (các hàm `*View` và `toPublic()` ở repo backend).

## Chạy bằng Docker

Chạy backend bằng Docker trước (`docker compose up --build` ở repo backend), rồi:

```bash
docker compose up --build
```

Mở http://localhost:8080 (trang khách) và http://localhost:8080/noi-bo/ (tiếp tân, Admin).

Container dùng nginx phục vụ `client-users` ở `/`, `client-admin` ở `/noi-bo/`, và chuyển `/api` sang địa chỉ trong biến `API_UPSTREAM` (mặc định `http://host.docker.internal:4000`, tức backend chạy trên cùng máy). Đổi địa chỉ backend:

```bash
API_UPSTREAM=http://10.0.0.5:4000 docker compose up --build
```

## Triển khai (CI/CD lên Render)

`.github/workflows/ci-cd.yml`:

| Sự kiện | Việc chạy |
| --- | --- |
| Pull request | `npm run build` (gồm kiểm tra kiểu), thử build image (không đẩy) |
| Push lên `main` | `npm run build` (gồm kiểm tra kiểu) → build image → đẩy lên `ghcr.io/chuctu-clinic/frontend` (tag `latest` và mã commit) → gọi Render Deploy Hook kèm đúng image vừa build |

Trên Render, nginx phục vụ giao diện và chuyển `/api` sang backend (`API_UPSTREAM`, mặc định `https://chuctu-backend.onrender.com`). Trình duyệt chỉ thấy một địa chỉ nên cookie phiên hoạt động bình thường, không cần `VITE_API_URL`.

Thiết lập một lần (làm backend trước, xem README repo backend):

1. **Cho Render kéo image từ GHCR.** Đặt package `frontend` của tổ chức `chuctu-clinic` ở chế độ Public rồi xoá khối `creds` trong `render.yaml`, hoặc dùng chung credential `ghcr-chuctu` đã tạo cho backend.
2. **Tạo dịch vụ.** Trên Render chọn **New → Blueprint**, trỏ vào repo này. Nếu backend có địa chỉ khác `chuctu-backend.onrender.com`, sửa `API_UPSTREAM`.
3. **Nối GitHub với Render.** Chép URL ở **Settings → Deploy Hook** của dịch vụ `chuctu-frontend`, thêm vào secret `RENDER_DEPLOY_HOOK` của repo này trên GitHub.

Sau đó kiểm tra `CLIENT_ORIGIN` của backend trùng với địa chỉ frontend (mặc định `https://chuctu-frontend.onrender.com`).

## Cấu hình lúc build

Hai ứng dụng đọc các biến sau lúc build. Để trống thì gọi API cùng địa chỉ với trang (qua proxy của Vite hoặc nginx):

| Biến | Ý nghĩa |
| --- | --- |
| `VITE_API_URL` | Địa chỉ API, khi frontend và backend là hai dịch vụ riêng (ví dụ trên Render). Khi đó cần thêm địa chỉ frontend vào `CLIENT_ORIGIN` của backend. |
| `VITE_ADMIN_URL` | Địa chỉ khu nội bộ, mặc định `/noi-bo/`. Trang khách dùng để dẫn sang "Đăng nhập nội bộ" và "Khu nội bộ". |
| `VITE_USER_URL` | Địa chỉ trang khách, mặc định `/`. Khu nội bộ dùng cho liên kết "Về trang chủ". |

Nếu tách khu nội bộ ra tên miền riêng thì cookie phiên không còn dùng chung, và cần thêm địa chỉ đó vào `CLIENT_ORIGIN` của backend.

## Cấu trúc mã nguồn

```
client-users/src       ứng dụng khách, chạy ở /
  pages/public         Trang chủ, Giới thiệu, Dịch vụ, Hướng dẫn, Liên hệ, Tin tức
  pages/auth           Đăng nhập / đăng ký bằng số điện thoại + mã 6 số
  pages/account        Thông tin tài khoản, hồ sơ khám (tối đa 10), phiếu khám, kết quả, lịch sử
  pages/booking        Đặt lịch 4 bước
client-admin/src       ứng dụng tiếp tân và Admin, chạy ở /noi-bo/
  pages/auth           Đăng nhập nội bộ, đổi mật khẩu
  pages/staff          Lịch trong ngày, đặt hộ tại quầy, hàng đợi, hồ sơ bệnh nhân, phiếu kết quả
  pages/admin          Tổng quan, quản lý tài khoản, quản lý bài viết
shared/src             gói @chuctu/shared
  constants.ts         vai trò, trạng thái phiếu, nội dung khám, giới tính, quan hệ.
                       Repo backend có bản giống hệt ở src/shared/constants.ts, sửa thì sửa cả hai.
  types.ts             kiểu dữ liệu API trả về (User, Patient, Appointment, MedicalRecord, Post, ...)
  lib/, components/    phần dùng chung cho hai ứng dụng: gọi API, phiên đăng nhập, định dạng,
                       Icon, nút, ô nhập, hộp thoại, chọn ngày giờ, phiếu kết quả
  styles.css           CSS nền tảng theo Design System
tsconfig.json          cấu hình kiểm tra kiểu cho cả ba thư mục
Dockerfile, nginx.conf build hai ứng dụng và phục vụ bằng nginx
docker-compose.yml
render.yaml            Render Blueprint (dịch vụ chạy từ image GHCR)
.github/workflows      CI/CD: build, build image, triển khai lên Render
```

## Việc còn lại

- **Ảnh bài viết**: hiện nhập bằng đường dẫn ảnh, chưa có chức năng tải ảnh lên.
