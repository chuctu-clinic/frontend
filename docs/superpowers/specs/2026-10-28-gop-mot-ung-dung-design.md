# Gộp client-users và client-admin thành một ứng dụng, một phiên đăng nhập

Ngày: 2026-10-28 · Repo liên quan: `frontend` (repo này) và `backend` (`D:\chuctu-clinic\backend`)

## Ý định

Hiện frontend là npm workspaces gồm ba gói: `shared` (`@chuctu/shared`), `client-users` (trang khách, ở `/`) và `client-admin` (tiếp tân và Admin, ở `/noi-bo/`). Chủ dự án thấy cách tổ chức này cồng kềnh: phải chạy hai dev server, giữ hai cấu hình Vite, dùng proxy `/noi-bo` từ 5173 sang 5174, đóng gói `shared` thành một gói riêng và giữ hai phiên đăng nhập. Mục tiêu là đưa về **một ứng dụng React/Vite duy nhất** với **một phiên đăng nhập**, và phân quyền theo **vai trò** (`USER`, `RECEPTIONIST`, `ADMIN`) qua route.

## Mục tiêu

- Một `package.json`, một `vite.config.js`, một `index.html`, một `dist`, một dev server ở cổng 5173.
- Bỏ npm workspaces và gói `@chuctu/shared`. Mã dùng chung thành thư mục thường trong `src`.
- Mọi URL hiện có giữ nguyên: trang khách ở `/…`, khu nội bộ ở `/noi-bo/…` (bookmark và liên kết cũ vẫn chạy, kể cả các redirect đang có: `/quan-tri` → `/noi-bo/quan-tri` trong nginx, `/noi-bo/dat-ho`).
- Backend chỉ dùng một cookie phiên `ct_session`, bỏ hẳn khái niệm "app" (`X-App`, `ct_staff`).
- Phân quyền trên frontend theo vai trò (`RequireUser`, `RequireStaff`, `RequireStaff admin`), như hiện nay. Quyền thật vẫn do backend kiểm tra (`requireUser`, `requireStaff`, `requireAdmin`, giữ nguyên).

## Không làm (non-goals)

- Không đổi giao diện, đường dẫn hay hành vi các trang, ngoài phần đăng nhập/đăng xuất nêu dưới.
- Không chuyển sang TypeScript, không đổi router, không thêm thư viện.
- Không xử lý chuyện `constants.js`/`phone.js` đang là bản chép của backend (để nguyên, chỉ di chuyển).

## Điều không được xảy ra (anti-goals)

- Khách tải trang chủ mà phải tải cả mã khu nội bộ (tiptap, mammoth, trang quản trị). Hai khu phải là các chunk lazy riêng.
- CSS của khu này làm vỡ giao diện khu kia.
- Một tài khoản đăng nhập thành công nhưng bị đẩy vào khu không dùng được, rồi kẹt trong vòng chuyển hướng.

## Cấu trúc mới (frontend)

```
index.html             gộp từ hai index.html (xem "index.html" dưới)
vite.config.js
package.json           gộp dependencies của ba gói; bỏ "workspaces" và concurrently
public/                gộp public của hai app (client-users đã có đủ logo-64/192)
src/
  main.jsx             BrowserRouter + SessionProvider + nạp shared/styles.css
  App.jsx              "/noi-bo/*" → lazy(staff/StaffApp), "/*" → lazy(site/SiteApp)
  shared/              nội dung shared/src (lib/, components/, constants.js, phone.js, medicalHistory.js, styles.css)
  site/                nội dung client-users/src (App.jsx đổi tên SiteApp.jsx, motion.css…)
  staff/               nội dung client-admin/src (App.jsx đổi tên StaffApp.jsx)
```

- Import `@chuctu/shared/...` đổi thành đường dẫn tương đối tới `src/shared/...` (khoảng 50 tệp). Có thể thay bằng alias Vite `@shared` nếu builder thấy gọn hơn (builder chọn).
- `StaffApp` giữ nguyên các path tương đối của nó (`dang-nhap`, `quan-tri`…), vì nằm dưới route `/noi-bo/*`. Mọi `<Navigate to="/…">` và `<Link to="/…">` tuyệt đối trong khu nội bộ trước đây tính từ basename `/noi-bo`, nên **phải đổi** thành `/noi-bo/…` hoặc thành đường dẫn tương đối. Builder rà toàn bộ `to=`, `navigate(`, `href=` trong `src/staff`. **Bẫy:** `phieu-kham/:id/ket-qua` có ở cả hai khu, nên liên kết nội bộ thiếu `/noi-bo` sẽ lặng lẽ mở trang của khách thay vì báo lỗi. Hàm `homeFor` cũng phải trả về đường dẫn có `/noi-bo`.
- `shared/lib/apps.js` bỏ đi. `adminUrl('x')` đổi thành `/noi-bo/x`, `USER_URL` đổi thành `/`. Liên kết qua lại giữa hai khu chuyển từ `<a>` sang `<Link>` (không cần tải lại trang nữa). Bỏ biến `VITE_ADMIN_URL` / `VITE_USER_URL`.
- `useScrollTopOnSamePageLink` hiện chỉ áp cho trang khách, giữ nguyên phạm vi đó (gọi trong `SiteApp`).
- `vite.config.js`: bỏ `base`, gộp `optimizeDeps.include` (firebase và tiptap/mammoth), chỉ proxy `/api` sang `localhost:4000`. Bỏ `resolve.dedupe`, vì không còn gói workspace.

### index.html

Dùng bản của client-users. Khu nội bộ cần `noindex` và tiêu đề riêng: khi mount, `StaffApp` đặt `document.title = 'Khu vực nội bộ — Phòng khám Chúc Từ'` và thêm `<meta name="robots" content="noindex, nofollow">`, rồi gỡ ra khi unmount. Ngoài ra thêm `Disallow: /noi-bo/` vào `public/robots.txt` (tạo mới).

### CSS

Hiện mỗi app nạp `shared/styles.css` trước, rồi tới CSS riêng của từng trang. Sau khi gộp:
- `src/main.jsx` nạp `shared/styles.css`.
- CSS của mỗi khu nằm trong chunk lazy của khu đó. Vì giờ chuyển khu không tải lại trang, CSS khu kia có thể đã nằm sẵn trong trang. Builder kiểm tra trùng tên class giữa `site/**.css` và `staff/**.css` (ví dụ `.layout`, `.page`, `.card`…). Chỗ nào trùng mà khác nội dung thì đổi tên phía `staff` (thêm tiền tố `staff-` hoặc gói dưới một class gốc như `.staff-root`). `motion.css` của site ghi đè transition: kiểm tra nó không ảnh hưởng khu nội bộ, nếu có thì giới hạn selector lại.

### Docker / nginx / scripts

- `Dockerfile`: một bước `npm ci` và `npm run build`, copy `dist` vào `/usr/share/nginx/html`.
- `nginx.conf`: giữ `/api/`, giữ redirect `/quan-tri`, giữ `location = /noi-bo` → `/noi-bo/`. `/noi-bo/` và `/` đều `try_files $uri /index.html`. Cache `assets/` chỉ còn một đường dẫn.
- `package.json` scripts: `dev`, `build`, `preview` gọi thẳng `vite`.
- README: cập nhật phần chạy thử, biến môi trường và cấu trúc mã nguồn.

## Một phiên đăng nhập

### Backend (`src/middleware/auth.js`, `src/routes/auth.routes.js`, test)

- Chỉ còn cookie `ct_session` (`SESSION_COOKIE`). Bỏ `STAFF_COOKIE`, `COOKIE_OF`, `appOf`, tham số `app` của `setSession`/`clearSession`.
- `readSession`: đọc `ct_session`. **Chuyển tiếp phiên cũ:** nếu không có `ct_session` mà có `ct_staff` hợp lệ, dùng nó, ghi lại thành `ct_session` và xoá `ct_staff`, để nhân viên đang đăng nhập không bị thoát khi triển khai. Cookie hỏng hoặc tài khoản bị khoá thì xoá cả hai cookie.
- Khi `readSession` thấy cả `ct_session` lẫn `ct_staff`, dùng `ct_session` và xoá `ct_staff`. Nếu `ct_session` hỏng hay không hợp lệ thì xoá cả hai, không quay sang dùng `ct_staff` (quyết định của Claude, chỉ ảnh hưởng lúc chuyển đổi).
- `/auth/logout` xoá cả `ct_session` và `ct_staff`.
- `/auth/staff/login` gọi `setSession(res, user)` như các đăng nhập khác.
- Header `X-App` bị bỏ qua, không lỗi (frontend cũ còn cache vẫn gọi được).
- `X-Session-User` / `SESSION_CHANGED` giữ nguyên: một trình duyệt giờ chỉ có một tài khoản, cơ chế báo "tab khác vừa đổi tài khoản" vẫn đúng.
- Test: sửa `test/auth.test.js`. Bỏ các test "hai phiên song song" (dòng ~142–154), thay bằng test: đăng nhập khách rồi đăng nhập nhân viên thì phiên thay thế phiên khách; logout xoá phiên; có `ct_staff` cũ thì được chuyển thành `ct_session`. Toàn bộ test backend phải xanh.

### Frontend

- Bỏ `setApiApp` và header `X-App` trong `shared/lib/api.js`. `main.jsx` dùng một `SessionProvider` duy nhất bao toàn ứng dụng.
- Trang đăng nhập vẫn tách hai nơi vì hai cách đăng nhập khác nhau: `/dang-nhap` (khách, số điện thoại + mã) và `/noi-bo/dang-nhap` (nhân viên, mật khẩu).
- Hành vi theo vai trò:
  - **Nhân viên vào khu khách**: xem trang công khai bình thường. `PublicLayout` hiện đã hiện nút "Khu nội bộ" cho nhân viên, giữ nguyên. Vào trang cần `RequireUser` (đặt lịch, tài khoản…) thì **không** chuyển tới `/dang-nhap` (sẽ thay mất phiên nhân viên), mà hiện thông báo "Trang này dành cho tài khoản khách. Bạn đang đăng nhập tài khoản nội bộ." kèm hai nút: "Về khu nội bộ" và "Đăng xuất".
  - **Khách vào `/noi-bo/…`**: `RequireStaff` chuyển tới `/noi-bo/dang-nhap`. Trang đăng nhập nội bộ, nếu đang có phiên khách, hiện một dòng "Bạn đang đăng nhập tài khoản khách <tên>. Đăng nhập nội bộ sẽ đăng xuất tài khoản này." rồi vẫn cho đăng nhập.
  - **`/dang-nhap` và `/dang-ky` khi đã đăng nhập nhân viên**: hiện thông báo tương tự (đăng nhập hay đăng ký tài khoản khách sẽ thoát phiên nội bộ), vẫn cho làm tiếp.
  - Nút "Về khu nội bộ" dẫn tới `homeFor(user)` (đã thêm tiền tố `/noi-bo`).
  - Ngoài ra không có `Navigate` tự động nào giữa hai khu theo vai trò, để tránh vòng chuyển hướng.
- `logout()` sau khi đăng xuất: ở khu nội bộ thì về `/noi-bo/dang-nhap`, ở khu khách thì giữ hành vi hiện tại.
- Logic `BroadcastChannel`/tải lại khi phiên đổi ở tab khác (`session.jsx`) giữ nguyên.

## Thứ tự và triển khai

1. Backend trước: một cookie, có chuyển tiếp `ct_staff`, vẫn chịu được `X-App`. Frontend cũ vẫn chạy được với backend mới (chỉ là hai app dùng chung một phiên).
2. Frontend sau: gộp ứng dụng.
3. Mỗi repo một nhánh và commit riêng. Không push nếu chủ dự án chưa đồng ý.

## Kiểm tra xong việc

- Backend: `npm test` xanh.
- Frontend: `npm run build` thành công. `dist` có chunk riêng cho site và staff, và chunk của trang chủ không chứa tiptap/mammoth/firebase (kiểm tra bằng output build hoặc grep trong `dist/assets`).
- Chạy thử với backend thật (`npm run dev` hai bên), đi qua: trang chủ; đăng nhập khách và đặt lịch; vào `/noi-bo/` khi là khách; đăng nhập nhân viên; lịch trong ngày; quản trị bài viết (mở trình soạn); xem thử bài; đổi mật khẩu tạm; vào `/dat-lich` khi là nhân viên; đăng xuất ở từng khu. Không có lỗi console, CSS hai khu không vỡ.
- `docker compose build` thành công.

## Để builder tự quyết

- Dùng alias `@shared` hay đường dẫn tương đối.
- Cách đổi tên class CSS bị trùng.
- Câu chữ của các thông báo vai trò (giọng văn theo các trang hiện có, xưng "cô chú").
- Dùng `git mv` để giữ lịch sử tệp (nên dùng).
