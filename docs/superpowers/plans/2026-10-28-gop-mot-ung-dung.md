# Gộp một ứng dụng, một phiên: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gộp `client-users` + `client-admin` + `shared` thành một ứng dụng Vite, và backend chỉ còn một cookie phiên `ct_session`, phân quyền theo vai trò.

**Architecture:** Backend đổi trước, vẫn tương thích ngược (bỏ qua `X-App`, chuyển `ct_staff` thành `ct_session`). Frontend dời mã bằng `git mv` vào `src/{shared,site,staff}`. `src/App.jsx` lazy-load `SiteApp` ở `/*` và `StaffApp` ở `/noi-bo/*`, có một `SessionProvider` chung.

**Tech Stack:** React 18, Vite 6, React Router 6; backend Express + Mongoose, test bằng `node --test` + supertest.

**Spec:** `docs/superpowers/specs/2026-10-28-gop-mot-ung-dung-design.md`

## Global Constraints

- URL không đổi: khách ở `/…`, nội bộ ở `/noi-bo/…`, giữ redirect nginx `/quan-tri` → `/noi-bo/quan-tri`, giữ route `/noi-bo/dat-ho`.
- Một cookie: `ct_session`. Bỏ `ct_staff`, `COOKIE_OF`, `appOf`, `setApiApp`, header `X-App` (backend bỏ qua header này, không báo lỗi).
- Giữ nguyên `X-Session-User` / `SESSION_CHANGED` và logic `BroadcastChannel` trong `session.jsx`.
- Không thêm thư viện, không đổi giao diện, không chuyển TypeScript.
- Chunk trang chủ không được chứa tiptap, mammoth, firebase.
- Câu chữ tiếng Việt, xưng "cô chú" như các trang hiện có.
- Dùng `git mv` để giữ lịch sử. Repo backend làm trên nhánh `gop-mot-phien`, frontend trên nhánh `gop-mot-ung-dung` (đã có). Không push.

## Review Focus

1. Liên kết nội bộ thiếu tiền tố `/noi-bo`, đặc biệt `phieu-kham/:id/ket-qua` (trùng route của khách), sẽ lặng lẽ mở trang khách. Task 2, Step 4 rà bằng grep.
2. Nhân viên mở `/dat-lich` hoặc `/tai-khoan` sẽ bị chuyển vòng sang `/dang-nhap`. Task 3 thay bằng thông báo vai trò.
3. CSS trùng tên giữa hai khu (`.a-link`, `.a-panel`, `.t-actions`, `.t-chip`, `.t-chip-done`, `.t-label`, `.t-main`, `.t-ticket`) làm vỡ giao diện sau khi chuyển khu bằng `<Link>`. Task 4.
4. Nhân viên đang đăng nhập bằng cookie `ct_staff` cũ bị thoát khi triển khai. Task 1 có test chuyển đổi.
5. Mã nội bộ lọt vào chunk trang khách. Task 5 grep `dist/assets`.

---

### Task 1: Backend chỉ dùng một cookie phiên

Repo: `D:\chuctu-clinic\backend`. Tạo nhánh `gop-mot-phien` trước.

**Files:**
- Modify: `src/middleware/auth.js` (bỏ `STAFF_COOKIE` khỏi luồng chính, `COOKIE_OF`, `appOf`; sửa `setSession`, `clearSession`, `readSession`)
- Modify: `src/routes/auth.routes.js:4,107,130`
- Modify: `test/auth.test.js` (describe "Phiên trang người dùng và khu nội bộ độc lập" ở dòng ~137–158; bỏ `.set('X-App', …)` ở mọi chỗ)
- Kiểm tra: `grep -rn "appOf\|COOKIE_OF\|x-app\|X-App" src test` không còn kết quả, ngoại trừ một test cố ý gửi `X-App`.

**Interfaces:**
- Produces: `setSession(res, user, { remember = true } = {})`, `clearSession(res)` (xoá cả `ct_session` lẫn `ct_staff`), hằng `SESSION_COOKIE = 'ct_session'`. `LEGACY_STAFF_COOKIE = 'ct_staff'` chỉ dùng nội bộ trong `auth.js`.

- [ ] **Step 1: Viết test thất bại.** Thay describe cũ bằng `describe('Một phiên đăng nhập cho cả hai khu', …)` gồm:
  - `it('đăng nhập nội bộ thay phiên khách')`: `registerUser('0911000099')` → `GET /api/me/patients` 200 → `POST /api/auth/staff/login` (letan@chuctu.vn / ChucTu@2026) → `GET /api/auth/me` có `user.role === 'RECEPTIONIST'` → `GET /api/me/patients` 403 → `GET /api/staff/queue` 200.
  - `it('đăng xuất thoát phiên duy nhất')`: `staffAgent()` → `POST /api/auth/logout` → `GET /api/staff/queue` 401 → `GET /api/auth/me` có `user === null`.
  - `it('X-App bị bỏ qua')`: `staffAgent()` → `GET /api/auth/me` với `.set('X-App','users')` vẫn trả `role === 'RECEPTIONIST'`.
  - `it('cookie ct_staff cũ được chuyển thành ct_session')`: ký token bằng `jwt.sign({ sub: <id letan>, role: 'RECEPTIONIST' }, config.jwtSecret)` (import `jsonwebtoken`, `config` từ `../src/config.js`, lấy id bằng `User.findOne({ email: 'letan@chuctu.vn' })`), gửi `Cookie: ct_staff=<token>` tới `GET /api/staff/queue` → 200, header `set-cookie` có `ct_session=` và có `ct_staff=;` (đã xoá).
  - `it('ct_session hỏng thì xoá cả hai, không dùng ct_staff')`: `Cookie: ct_session=rac; ct_staff=<token hợp lệ>` → `GET /api/staff/queue` 401.
- [ ] **Step 2: Chạy** `npm test`. Kỳ vọng: các test mới FAIL (đăng nhập nội bộ vẫn giữ phiên khách nên `/api/me/patients` trả 200 thay vì 403).
- [ ] **Step 3: Cài đặt.** `readSession`: có `ct_session` thì verify; hỏng thì `clearSession` rồi return; hợp lệ mà còn `ct_staff` thì xoá `ct_staff`. Không có `ct_session` mà có `ct_staff` hợp lệ thì dùng nó, set `ct_session` (maxAge `rules.session.days`), xoá `ct_staff`. Tài khoản không còn hoặc bị khoá thì `clearSession`. Bỏ nhánh "phiên nội bộ cũ trong cookie chung". Cập nhật comment đầu tệp. Sửa `auth.routes.js`: `setSession(res, user)` ở `/staff/login`, `clearSession(res)` ở `/logout`, bỏ import `appOf`.
- [ ] **Step 4: Bỏ `.set('X-App', …)`** ở các test còn lại (`Nhiều tab…`, `Cập nhật thông tin tài khoản`…), trừ test "X-App bị bỏ qua". Chạy `npm test`. Kỳ vọng: tất cả PASS.
- [ ] **Step 5: Cập nhật README backend** (chỗ nào nhắc hai phiên, `ct_staff`, `X-App`), rồi commit: `git commit -m "Một phiên đăng nhập ct_session cho cả trang khách và khu nội bộ"`.

### Task 2: Dời mã vào một ứng dụng Vite

Repo: frontend, nhánh `gop-mot-ung-dung`.

**Files:**
- `git mv shared/src src/shared`, `git mv client-users/src src/site`, `git mv client-admin/src src/staff`
- `git mv src/site/App.jsx src/site/SiteApp.jsx`, `git mv src/staff/App.jsx src/staff/StaffApp.jsx`. Xoá `src/site/main.jsx` và `src/staff/main.jsx` (gộp vào `src/main.jsx`).
- `git mv client-users/index.html index.html`, `git mv client-users/public public` (đã có logo-64/192; bỏ `client-admin/public`)
- Create: `vite.config.js`, `src/main.jsx`, `src/App.jsx`
- Modify: `package.json` (bỏ `workspaces`, `concurrently`; gộp `dependencies`/`devDependencies` của ba gói, gồm dompurify, marked, firebase, tiptap, mammoth, react, react-dom, react-router-dom, vite, @vitejs/plugin-react; scripts `dev: vite`, `build: vite build`, `preview: vite preview`)
- Delete: `shared/`, `client-users/`, `client-admin/` (phần còn lại: package.json, vite.config, index.html), `src/shared/lib/apps.js`
- Regenerate: `package-lock.json` (`rm -rf node_modules package-lock.json && npm install`)

**Interfaces:**
- Produces: `src/staff/StaffApp.jsx` export default `StaffApp`; `src/site/SiteApp.jsx` export default `SiteApp`; `homeFor(user)` (ở `src/staff/pages/auth/StaffLogin.jsx`) trả `'/noi-bo/doi-mat-khau' | '/noi-bo/quan-tri' | '/noi-bo/lich-trong-ngay'`; hằng `STAFF_BASE = '/noi-bo'` export từ `src/staff/StaffApp.jsx` nếu cần dùng lại.

- [ ] **Step 1: Dời tệp** bằng các lệnh `git mv` ở trên.
- [ ] **Step 2: Đổi import.** Thay mọi `'@chuctu/shared/…'` thành đường dẫn tương đối tới `src/shared/…` (khoảng 50 tệp, làm bằng script sed). Kiểm tra: `grep -rn "@chuctu/shared" src` không còn kết quả.
- [ ] **Step 3: Viết `src/main.jsx`.** Nạp `./shared/styles.css`, rồi `<StrictMode><BrowserRouter><SessionProvider><App/></SessionProvider></BrowserRouter></StrictMode>`. Không gọi `setApiApp` (Task 3 sẽ bỏ hàm này). `motion.css` chuyển sang import trong `SiteApp.jsx`, đặt sau các import trang. Viết `src/App.jsx`: `<Suspense fallback={<Loading/>}><Routes><Route path="noi-bo/*" element={<StaffApp/>}/><Route path="*" element={<SiteApp/>}/></Routes></Suspense>`, trong đó `StaffApp` và `SiteApp` là `lazy(() => import(...))`.
- [ ] **Step 4: Thêm tiền tố `/noi-bo` cho mọi đường dẫn tuyệt đối trong `src/staff`:** các `to="/…"`, `` to={`/…`} ``, `navigate('/…')`, `<Navigate to="/…">`, và `homeFor`. Danh sách hiện có nằm ở `StaffApp.jsx` (RequireStaff, CounterBookingRedirect, Start), `StaffLayout.jsx:42,175`, `Dashboard.jsx`, `PostEditor.jsx`, `PostPreview.jsx`, `Posts.jsx`, `ChangePassword.jsx`, `PatientDetail.jsx`, `Patients.jsx`, `Queue.jsx`, `RecordForm.jsx`; ngoài ra rà cả `NavLink` trong `StaffLayout.jsx`. Kiểm tra: `grep -rnP "(to=\{?['\"\`]|navigate\(['\"\`])/(?!noi-bo)" src/staff` không còn kết quả.
- [ ] **Step 5: Bỏ `apps.js`.** `PublicLayout.jsx`: `adminUrl(...)` đổi thành `<Link to={homeFor(user)}>` cho nút "Khu nội bộ" và `<Link to="/noi-bo/dang-nhap">` cho "Đăng nhập nội bộ". `StaffLogin.jsx`: `<a href={USER_URL}>` đổi thành `<Link to="/">`. Chuyển `useScrollTopOnSamePageLink` để nó chỉ chạy trong `SiteApp` (vẫn như cũ).
- [ ] **Step 6: Viết `vite.config.js`.** `plugins: [react()]`, `optimizeDeps.include` gộp từ hai config cũ (`firebase/app`, `firebase/auth`, các gói `@tiptap/*`, `mammoth`), `server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:4000' } }`. Không đặt `base`, không `dedupe`. Comment theo kiểu các config cũ.
- [ ] **Step 7: Cài lại và build.** `npm install`, rồi `npm run build`. Kỳ vọng: build thành công, `dist/index.html` và `dist/assets/*` có chunk `StaffApp-*.js` riêng.
- [ ] **Step 8: Chạy thử nhanh.** `npm run dev` (backend chạy sẵn ở 4000). Mở `/`, `/tin-tuc`, `/noi-bo/` (phải về `/noi-bo/dang-nhap`), đăng nhập letan@chuctu.vn, `/noi-bo/lich-trong-ngay`, bấm "Bệnh nhân" rồi mở một bệnh nhân. Không có lỗi console.
- [ ] **Step 9: Commit** `"Gộp client-users, client-admin, shared thành một ứng dụng Vite"`.

### Task 3: Một phiên trên frontend, xử lý theo vai trò

**Files:**
- Modify: `src/shared/lib/api.js` (bỏ `APP`, `setApiApp`, `X-App` trong `appHeaders`)
- Modify: `src/site/SiteApp.jsx` (`RequireUser`)
- Create: `src/site/components/StaffOnSite.jsx` (thông báo nhân viên ở trang dành cho khách)
- Modify: `src/site/pages/auth/Login.jsx`, `src/site/pages/auth/Register.jsx`, `src/staff/pages/auth/StaffLogin.jsx` (dòng cảnh báo thay phiên)
- Modify: `src/staff/components/StaffLayout.jsx:42` (sau logout về `/noi-bo/dang-nhap`, nếu Task 2 chưa làm)

**Interfaces:**
- Consumes: `homeFor(user)` (Task 2), `useSession()` → `{ user, loading, logout }`, `isStaff(user)` từ `src/shared/lib/session.jsx`.
- Produces: `<StaffOnSite />`, không có props, tự đọc session.

- [ ] **Step 1: Bỏ `X-App`.** `appHeaders()` chỉ còn `X-Session-User`. Kiểm tra: `grep -rn "setApiApp\|X-App" src` không còn kết quả.
- [ ] **Step 2: `RequireUser`.** Đang tải thì trả `<Loading/>`. `isStaff(user)` thì trả `<StaffOnSite/>`. Chưa đăng nhập, hoặc vai trò khác `USER`, thì chuyển hướng như cũ. `StaffOnSite` dùng `Empty` từ `shared/components/ui.jsx` (hoặc khung tương tự trong PublicLayout), tiêu đề "Trang này dành cho tài khoản khách", nội dung "Cô chú đang đăng nhập tài khoản nội bộ {user.fullName}.", kèm hai nút: `<Link to={homeFor(user)}>Về khu nội bộ</Link>` và nút "Đăng xuất" (gọi `logout()`, sau đó ở lại trang hiện tại để `RequireUser` chuyển sang `/dang-nhap`).
- [ ] **Step 3: Cảnh báo thay phiên.** `Login.jsx` và `Register.jsx`: nếu `isStaff(user)` thì hiện một dòng phía trên form: "Cô chú đang đăng nhập tài khoản nội bộ {fullName}. Đăng nhập tài khoản khách sẽ đăng xuất tài khoản nội bộ." (với Register thì đổi chữ thành "Tạo tài khoản khách"). `StaffLogin.jsx`: nếu `user?.role === 'USER'` thì hiện "Cô chú đang đăng nhập tài khoản khách {fullName}. Đăng nhập nội bộ sẽ đăng xuất tài khoản này." Dùng lớp thông báo đã có trong `auth.css` / `staff-auth.css` (builder chọn). Giữ nguyên `Login.jsx:40`: tài khoản `USER` đã đăng nhập thì chuyển đi.
- [ ] **Step 4: Chạy thử** với `npm run dev` (backend nhánh `gop-mot-phien`):
  - Nhân viên mở `/dat-lich`: thấy thông báo, không bị chuyển hướng, "Về khu nội bộ" dẫn đúng trang.
  - Nhân viên mở `/dang-nhap` và `/dang-ky`: thấy dòng cảnh báo.
  - Khách mở `/noi-bo/lich-trong-ngay`: bị chuyển tới `/noi-bo/dang-nhap` và thấy dòng cảnh báo. Đăng nhập nội bộ xong thì `/tai-khoan` hiện `StaffOnSite`.
  - Đăng xuất ở khu nội bộ: về `/noi-bo/dang-nhap`. Đăng xuất ở khu khách: hành vi cũ.
  - Hai tab: đăng nhập tài khoản khác ở tab 2 thì tab 1 tự tải lại kèm thông báo.
- [ ] **Step 5: Commit** `"Một phiên đăng nhập: bỏ X-App, thông báo khi sai khu theo vai trò"`.

### Task 4: CSS hai khu không đè nhau; tiêu đề và noindex cho khu nội bộ

**Files:**
- Modify: `src/staff/pages/admin/admin.css`: `.a-link` → `.ad-link`, `.a-panel` → `.ad-panel`, `.a-panel-head` → `.ad-panel-head` (đồng thời sửa các `className` trong `src/staff/pages/admin/*.jsx`)
- Modify: `src/site/pages/booking/booking.css`: `.t-ticket`, `.t-off`, `.t-main`, `.t-chip`, `.t-chip-done`, `.t-chip-off`, `.t-label`, `.t-actions` và mọi `.t-*` khác trong tệp này → `.bk-*` (đồng thời sửa `className` trong `src/site/**/*.jsx` đang dùng chúng). Lý do chọn đổi phía site: tiền tố `t-` là quy ước của toàn khu nội bộ (`t-ui.jsx`, `staff.css`). Đây là quyết định builder được giao.
- Modify: `src/site/motion.css`: nếu có selector chung (`button`, `a`, `*`…) thì giới hạn dưới class gốc của site (ví dụ `.site-root`, đặt trên phần tử gốc của `PublicLayout` và `AuthShell`)
- Create: `public/robots.txt` với nội dung `User-agent: *\nDisallow: /noi-bo/\n`
- Modify: `src/staff/StaffApp.jsx`: `useEffect` khi mount thì đặt `document.title = 'Khu vực nội bộ — Phòng khám Chúc Từ'` và thêm `<meta name="robots" content="noindex, nofollow">`; khi unmount thì trả lại tiêu đề cũ và gỡ thẻ meta.

- [ ] **Step 1: Đổi tên class** như trên. Kiểm tra trùng còn lại bằng lệnh so sánh tập class giữa `src/site` và `src/staff` (dùng `grep -ohE "^\s*\.[a-zA-Z][a-zA-Z0-9_-]*"` trên tệp `.css` của mỗi bên, rồi `comm -12`). Kỳ vọng: không còn class nào trùng mà khác nội dung.
- [ ] **Step 2: Rà `motion.css`** và giới hạn selector nếu cần.
- [ ] **Step 3: robots.txt** và tiêu đề, noindex.
- [ ] **Step 4: Chạy thử.** Khách đặt lịch tới bước phiếu khám (`/phieu-kham/:id`): phiếu hiển thị như trước. Nhân viên qua lại `/` ↔ `/noi-bo/hang-doi` ↔ `/noi-bo/quan-tri` bằng `<Link>`: giao diện hai khu không vỡ, tab hiện tiêu đề đúng từng khu. So sánh bằng ảnh chụp trước và sau ở trang Dashboard, Hàng đợi, Booking.
- [ ] **Step 5: Commit** `"Tách tên class CSS trùng giữa hai khu; noindex khu nội bộ"`.

### Task 5: Docker, nginx, README và kiểm tra cuối

**Files:**
- Modify: `Dockerfile` (một `COPY package.json package-lock.json`, `npm ci`, `COPY index.html vite.config.js public src`, `npm run build`, rồi `COPY --from=build /app/dist /usr/share/nginx/html`)
- Modify: `nginx.conf` (assets: `location /assets/`; `location /noi-bo/` dùng `try_files $uri /index.html`; giữ `/api/`, `= /noi-bo`, `/quan-tri`)
- Modify: `.dockerignore` nếu đang nhắc thư mục cũ
- Modify: `README.md` (bảng thành phần, chạy thử với một cổng, bỏ `VITE_ADMIN_URL`/`VITE_USER_URL`, phần cấu trúc mã nguồn mới, ghi chú "một phiên đăng nhập cho cả hai khu", ghi chú về khu nội bộ ở tên miền riêng không còn được hỗ trợ)

- [ ] **Step 1: Sửa** Dockerfile, nginx, README.
- [ ] **Step 2: Kiểm tra bundle.** Chạy `npm run build`, rồi `grep -l "tiptap\|mammoth\|firebase" dist/assets/*.js`. Kỳ vọng: không có tệp nào được `dist/index.html` nạp trực tiếp (so với các thẻ `<script>`/`modulepreload` trong `dist/index.html`).
- [ ] **Step 3: Kiểm tra Docker.** Chạy `docker compose build`, rồi `docker compose up`. Ở http://localhost:8080: `/`, `/noi-bo/` (redirect), `/quan-tri` (redirect sang `/noi-bo/quan-tri`), F5 ở `/noi-bo/benh-nhan`, `/robots.txt`.
- [ ] **Step 4: Chạy lại toàn bộ kịch bản trong spec** ("Kiểm tra xong việc"). Backend `npm test` xanh.
- [ ] **Step 5: Commit** `"Docker, nginx, README cho ứng dụng gộp"`.
