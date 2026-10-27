# Website Phòng khám Chúc Từ

Website quản lý tiếp nhận và đặt lịch khám cho Phòng chẩn trị Y học cổ truyền từ thiện Chúc Từ. Mã nguồn dựng theo bộ tài liệu **Phòng khám Chúc Từ ver 2** (Concept of Operations, Architecture Driver/Design, Database Analysis & Design, Function List, Business Rule) và giao diện theo prototype **Website Phòng khám Chúc Từ** cùng Design System của phòng khám.

| Phần | Công nghệ |
| --- | --- |
| Frontend | ReactJS 18 + Vite, React Router. Hai ứng dụng trong `client/`: `client-users` (khách) và `client-admin` (tiếp tân, Admin) |
| Backend | Node.js + Express, REST API |
| Cơ sở dữ liệu | MongoDB / MongoDB Atlas (Mongoose) |
| Kiểm thử API | `node:test` + Supertest + MongoDB trong bộ nhớ |

## Chạy thử

Yêu cầu Node.js 20 trở lên.

```bash
npm install
npm run dev
```

- Trang khách: http://localhost:5173
- Khu nội bộ (tiếp tân, Admin): http://localhost:5173/noi-bo/
- API: http://localhost:4000/api

`npm run dev` chạy 3 tiến trình: API (cổng 4000), `client-users` (5173) và `client-admin` (5174). Cổng 5173 chuyển tiếp `/noi-bo` sang 5174, nên mở mọi thứ qua 5173 là giống khi triển khai thật: chung một địa chỉ và chung cookie phiên.

Chưa đặt `MONGODB_URI` thì server tự chạy MongoDB trong bộ nhớ và nạp dữ liệu mẫu. Dữ liệu này mất khi tắt server. Lần chạy đầu tiên sẽ tải bộ cài MongoDB về máy, mất khoảng 1–2 phút.

Tài khoản mẫu:

| Vai trò | Đăng nhập |
| --- | --- |
| Admin | `admin@chuctu.vn` hoặc `0900000001`, mật khẩu `ChucTu@2026` (trang `/noi-bo/dang-nhap`) |
| Tiếp tân | `letan@chuctu.vn` hoặc `0900000002`, mật khẩu `ChucTu@2026` |
| Người dùng | Số điện thoại `0912345678` (trang `/dang-nhap`) |

Người dùng đăng nhập bằng số điện thoại, không dùng mật khẩu. Khi phát triển (`SMS_PROVIDER=console`), mã 6 số được in ra log server và hiện luôn trên màn hình nhập mã.

### Các lệnh khác

```bash
npm test          # chạy kiểm thử API (34 bài: tài khoản, đặt lịch, hàng đợi)
npm run build     # build client/client-users/dist và client/client-admin/dist
npm start         # chạy server; nếu đã build thì server phục vụ luôn: client-users ở /, client-admin ở /noi-bo/
npm run seed      # nạp tài khoản Admin, Tiếp tân và 4 trang thông tin vào MONGODB_URI
```

## Chạy bằng Docker

```bash
docker compose up --build
```

`docker-compose.yml` chạy 3 container:

| Container | Nội dung |
| --- | --- |
| `mongo` | MongoDB 7, dữ liệu lưu ở volume `mongo-data` (còn nguyên khi tắt container). |
| `server` | API (`server/Dockerfile`). Mỗi lần khởi động tự nạp tài khoản Admin, Tiếp tân và 4 trang thông tin nếu chưa có. Không nạp dữ liệu mẫu. |
| `client` | nginx phục vụ `client-users` ở `/` và `client-admin` ở `/noi-bo/`, chuyển `/api` sang `server` (`client/Dockerfile`, `client/nginx.conf`). |

Mở http://localhost:8080 (trang khách) và http://localhost:8080/noi-bo/ (tiếp tân, Admin).

- Server chạy chế độ production nên mã 6 số không hiện trên màn hình. Xem mã trong log: `docker compose logs -f server`.
- Đặt `JWT_SECRET` trong file `.env` cạnh `docker-compose.yml` trước khi chạy thật.
- Tài khoản Admin và Tiếp tân được tạo với mật khẩu mẫu `ChucTu@2026`. Đổi mật khẩu ngay sau lần đăng nhập đầu.
- Cookie phiên ở production có cờ `Secure`. Trình duyệt chấp nhận cookie này trên `http://localhost`, nhưng nếu mở bằng IP hoặc tên miền thì cần HTTPS.

## Cấu hình (`server/.env`)

Chép `server/.env.example` thành `server/.env`:

| Biến | Ý nghĩa |
| --- | --- |
| `MONGODB_URI` | Chuỗi kết nối MongoDB Atlas. Bắt buộc khi chạy production. |
| `JWT_SECRET` | Khoá ký phiên đăng nhập. Bắt buộc đổi khi chạy production. |
| `CLIENT_ORIGIN` | Địa chỉ frontend được gọi API (CORS); nhiều địa chỉ thì ngăn bằng dấu phẩy. |
| `SMS_PROVIDER` | `console` (in mã ra log) hoặc `firebase` (Firebase Phone Auth, xem mục *Gửi mã xác nhận qua Firebase*). |
| `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_APP_ID` | Cấu hình Web app Firebase (giá trị công khai), chỉ dùng khi `SMS_PROVIDER=firebase`. |
| `FIREBASE_AUTH_EMULATOR_HOST` | Ví dụ `127.0.0.1:9099`: dùng Firebase Auth Emulator, không gửi SMS thật. |

Hai ứng dụng frontend đọc các biến sau lúc build. Để trống thì dùng cùng địa chỉ với server:

| Biến | Ý nghĩa |
| --- | --- |
| `VITE_API_URL` | Địa chỉ API, khi frontend và backend là hai dịch vụ riêng trên Render. |
| `VITE_ADMIN_URL` | Địa chỉ khu nội bộ, mặc định `/noi-bo/`. Trang khách dùng để dẫn sang "Đăng nhập nội bộ" và "Khu nội bộ". |
| `VITE_USER_URL` | Địa chỉ trang khách, mặc định `/`. Khu nội bộ dùng cho liên kết "Về trang chủ". |

Nếu tách khu nội bộ ra tên miền riêng thì cookie phiên không còn dùng chung, và cần thêm địa chỉ đó vào `CLIENT_ORIGIN`.

## Cấu trúc mã nguồn

```
client/                  mã nguồn phía client
  client-users/src       ứng dụng khách, chạy ở /
    pages/public         Trang chủ, Giới thiệu, Dịch vụ, Hướng dẫn, Liên hệ, Tin tức
    pages/auth           Đăng nhập / đăng ký bằng số điện thoại + mã 6 số
    pages/account        Thông tin tài khoản, hồ sơ khám (tối đa 10), phiếu khám, kết quả, lịch sử
    pages/booking        Đặt lịch 4 bước
  client-admin/src       ứng dụng tiếp tân và Admin, chạy ở /noi-bo/
    pages/auth           Đăng nhập nội bộ, đổi mật khẩu
    pages/staff          Lịch trong ngày, đặt hộ tại quầy, hàng đợi, hồ sơ bệnh nhân, phiếu kết quả
    pages/admin          Tổng quan, quản lý tài khoản, quản lý bài viết
  Dockerfile, nginx.conf build hai ứng dụng và phục vụ bằng nginx
server/                  mã nguồn phía server
  src/models/            Mongoose: users, verificationCodes, trustedDevices, posts, patients,
                         appointments, checkins, medicalRecords (+ counters, slotCounters, settings)
  src/middleware/        xác thực phiên, phân quyền USER / RECEPTIONIST / ADMIN, xử lý lỗi
  src/services/          quy tắc nghiệp vụ: auth, patient, appointment, queue, medicalRecord, post, account
  src/routes/            /api/auth, /api/me (người dùng), /api/staff (tiếp tân + admin), /api/admin
  test/                  kiểm thử theo Business Rule
  Dockerfile
shared/src               gói @chuctu/shared
  constants.js           hằng số dùng chung giữa server và client: vai trò, trạng thái phiếu,
                         nội dung khám, giới tính, quan hệ
  lib/, components/      phần giao diện dùng chung cho hai ứng dụng client: gọi API, phiên đăng nhập,
                         định dạng, Icon, nút, ô nhập, hộp thoại, chọn ngày giờ, phiếu kết quả
  styles.css             CSS nền tảng theo Design System
docker-compose.yml       chạy đồng thời mongo, server, client
```

## Đối chiếu với tài liệu

Đã làm đủ 59 chức năng trong Function List (F.1.1 – F.10.5). Các quy tắc nghiệp vụ được kiểm tra ở Backend; giao diện ẩn hoặc hiện nút chỉ để hỗ trợ người dùng.

- **BR.02–BR.03**: mã 6 số lưu dạng băm, hết hạn sau 5 phút. Mỗi số điện thoại nhận tối đa 3 mã mỗi giờ. Gửi lại cùng loại mã phải chờ 60 giây. Nhập sai tối đa 5 lần. Thiết bị đã xác nhận được nhận diện qua cookie thiết bị.
- **BR.14–BR.15, QAs6**: mỗi khung giờ có tối đa 6 phiếu. Chỗ được giữ bằng một lệnh cập nhật nguyên tử trên `slotCounters`, nên nhiều người đặt cùng lúc cũng không vượt. Đã có bài kiểm thử 9 người đặt đồng thời: 6 người được nhận, 3 người bị báo "đã đủ chỗ".
- **BR.17**: người dùng chỉ thấy ba trạng thái Đã đặt lịch, Đã hoàn thành, Đã huỷ.
- **BR.28–BR.30**: hàng đợi có 5 ghế, nhóm Ưu tiên đứng trước nhóm Thường, trong mỗi nhóm xếp theo giờ check-in. Có thể bật tự động mời người kế tiếp vào ghế trống. Hoàn tác vào khám thì người đó quay lại hàng chờ, còn ghế trống được nhường cho người kế tiếp.
- **BR.32–BR.33**: mỗi yêu cầu đều tải lại tài khoản, nên khoá tài khoản hoặc đổi vai trò có hiệu lực ngay. Tài khoản nội bộ dùng mật khẩu tạm phải đổi mật khẩu trước khi làm việc.
- **BR.38**: hồ sơ đã có lịch sử khám không bị xoá cứng. Người dùng xoá hồ sơ như vậy thì hồ sơ chỉ được tách khỏi tài khoản.

### Cách hiểu tài liệu ở một số điểm chưa rõ

1. **Ngày được đặt trực tuyến**: BR.13 ghi "1 đến 30 ngày tới", nhưng prototype cho chọn cả hôm nay và BR.14 chỉ chặn "khung đã bắt đầu". Mã hiện cho đặt từ hôm nay đến 30 ngày tới, chỉ với các khung chưa bắt đầu. Chỉnh tại `rules.booking` trong `server/src/config.js`.
2. **"Đến đúng khung giờ"**: được tính là check-in từ 15 phút trước giờ bắt đầu đến hết khung (`rules.queue.priorityEarlyMinutes`). Khách đặt hộ ngay trong ngày được tính là khách đến trực tiếp, xếp nhóm Thường.
3. **Khung giờ**: 8:00, 9:00, 10:00, 11:00, 13:00, 14:00, 15:00, 16:00, giống prototype (nghỉ trưa 12:00).
4. **Trang Giới thiệu, Dịch vụ, Hướng dẫn, Liên hệ**: là bài viết thuộc chuyên mục "Trang thông tin", có đường dẫn cố định. Admin sửa được nội dung nhưng không xoá được.
5. **Thêm collection hỗ trợ**: `counters` để sinh mã bệnh nhân `CT-BN-26-0001` và mã phiếu `CT-PK-26-2010-001`, `slotCounters` để đếm chỗ trong khung giờ, `settings` để lưu cài đặt tự động mời. Ngoài ra `checkins` có thêm trường `visitDate`, `posts` có thêm `slug` và `summary`, `patients` có thêm `birthYear` (tiếp tân chỉ hỏi năm sinh).

### Gửi mã xác nhận qua Firebase

Đặt `SMS_PROVIDER=firebase`. Trình duyệt gửi và xác nhận mã bằng Firebase Phone Auth (kèm reCAPTCHA ẩn), rồi gửi ID token cho server; server kiểm token bằng `firebase-admin` (chỉ cần Project ID, không cần khoá service account), đối chiếu số điện thoại và lần xin mã, rồi cấp phiên đăng nhập như cũ. Giới hạn 3 mã mỗi giờ và chờ 60 giây (BR.03) vẫn do server giữ.

Cài đặt trên Firebase Console:

1. Tạo project, thêm **Web app**, chép các giá trị `apiKey`, `authDomain`, `projectId`, `appId` vào `server/.env`.
2. **Authentication → Sign-in method**: bật **Phone**.
3. **Authentication → Settings → Authorized domains**: thêm `localhost` và tên miền thật.
4. **SMS region policy**: cho phép Việt Nam.

Thử không tốn tiền, không gửi SMS thật:

- **Số điện thoại thử**: Authentication → Sign-in method → Phone → *Phone numbers for testing*, thêm số kèm mã cố định (ví dụ `+84 999 000 001` / `123456`). Số phải có đầu số di động hợp lệ (03, 05, 07, 08, 09).
- **Firebase Auth Emulator**: `npx firebase-tools emulators:start --only auth --project demo-chuctu`, đặt `FIREBASE_PROJECT_ID=demo-chuctu` và `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` (các biến web khác điền giá trị bất kỳ). Mã gửi đi xem ở `http://127.0.0.1:9099/emulator/v1/projects/demo-chuctu/verificationCodes`.

### Việc còn lại

- **Nhà cung cấp SMS khi chạy thật**: Firebase dùng để thử nghiệm. Khi chạy thật nên cân nhắc nhà cung cấp SMS trong nước có tên người gửi (brandname), chỉ cần thêm một provider trong `server/src/services/smsGateway.js`.
- **Triển khai lên Render**: chưa cấu hình.
- **Giới hạn số lần thử đăng nhập nội bộ**: chưa có.
