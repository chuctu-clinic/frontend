// Gửi và xác nhận mã qua Firebase Phone Auth, dùng khi server báo meta.otp.provider === 'firebase'.
// Firebase chỉ chứng minh người dùng giữ số điện thoại: sau khi xác nhận, ID token được gửi cho server
// để đổi lấy phiên đăng nhập của phòng khám, rồi đăng xuất khỏi Firebase ngay.

let authPromise = null;

/** Khởi tạo Firebase Auth một lần (tải thư viện khi cần, không làm nặng các trang khác). */
function firebaseAuth(cfg) {
  authPromise ??= (async () => {
    const { getApps, initializeApp } = await import('firebase/app');
    const { connectAuthEmulator, getAuth } = await import('firebase/auth');
    const app = getApps()[0] || initializeApp({ apiKey: cfg.apiKey, authDomain: cfg.authDomain, projectId: cfg.projectId, appId: cfg.appId });
    const auth = getAuth(app);
    // Tin nhắn mã xác nhận bằng tiếng Việt
    auth.languageCode = 'vi';
    if (cfg.emulatorUrl) connectAuthEmulator(auth, cfg.emulatorUrl, { disableWarnings: true });
    // Chế độ thử: chỉ số thử trên Firebase Console mới nhận mã, không cần reCAPTCHA
    if (cfg.testNumbersOnly) auth.settings.appVerificationDisabledForTesting = true;
    return auth;
  })();
  return authPromise;
}

/** "0912345678" → "+84912345678" */
const toE164 = (phone) => `+84${phone.replace(/^0/, '')}`;

/**
 * Gửi mã tới số điện thoại. `holder` là một phần tử trống trong trang để gắn reCAPTCHA ẩn.
 * Trả về đối tượng dùng để xác nhận mã và hàm dọn reCAPTCHA.
 */
export async function sendFirebaseCode(cfg, phone, holder) {
  const auth = await firebaseAuth(cfg);
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
  // Mỗi lần gửi dùng một reCAPTCHA mới trên một phần tử mới (reCAPTCHA cũ không dùng lại được)
  holder.replaceChildren();
  const box = document.createElement('div');
  holder.append(box);
  const verifier = new RecaptchaVerifier(auth, box, { size: 'invisible' });
  try {
    const confirmation = await signInWithPhoneNumber(auth, toE164(phone), verifier);
    return { confirmation, clear: () => verifier.clear() };
  } catch (err) {
    verifier.clear();
    throw friendlyError(err);
  }
}

/** Mã 6 số người dùng nhập → ID token để gửi cho server. */
export async function confirmFirebaseCode(cfg, sent, code) {
  try {
    const cred = await sent.confirmation.confirm(code);
    const idToken = await cred.user.getIdToken();
    const auth = await firebaseAuth(cfg);
    const { signOut } = await import('firebase/auth');
    await signOut(auth).catch(() => {});
    return idToken;
  } catch (err) {
    throw friendlyError(err);
  }
}

const MESSAGES = {
  'auth/invalid-verification-code': ['Mã xác nhận chưa đúng. Cô chú xem lại tin nhắn rồi nhập lại.', true],
  'auth/missing-verification-code': ['Mã xác nhận gồm 6 chữ số.', true],
  'auth/code-expired': ['Mã xác nhận đã hết hạn. Cô chú bấm "Gửi lại mã" để nhận mã mới.'],
  'auth/too-many-requests': ['Số này đã nhận quá nhiều mã. Cô chú thử lại sau ít phút hoặc gọi phòng khám để được giúp.'],
  'auth/quota-exceeded': ['Phòng khám tạm thời không gửi được thêm tin nhắn. Cô chú thử lại sau hoặc gọi phòng khám.'],
  'auth/invalid-phone-number': ['Số điện thoại chưa đúng. Cô chú kiểm tra lại.'],
  'auth/network-request-failed': ['Không kết nối được. Cô chú kiểm tra mạng rồi thử lại.'],
  'auth/captcha-check-failed': ['Chưa xác minh được trình duyệt. Cô chú tải lại trang rồi thử lại.'],
  'auth/invalid-app-credential': ['Chưa xác minh được trình duyệt. Cô chú tải lại trang rồi thử lại.'],
  'auth/operation-not-allowed': ['Phòng khám chưa bật gửi mã qua tin nhắn. Cô chú gọi phòng khám để được giúp.'],
  // Project Firebase ở gói miễn phí: không gửi được SMS tới số thật (số thử vẫn dùng được)
  'auth/billing-not-enabled': ['Phòng khám tạm thời chưa gửi được tin nhắn. Cô chú gọi phòng khám để được giúp.'],
  'auth/configuration-not-found': ['Phòng khám chưa bật gửi mã qua tin nhắn. Cô chú gọi phòng khám để được giúp.'],
};

/** Lỗi Firebase → lỗi có câu tiếng Việt (cùng dạng lỗi API: message, fields). */
function friendlyError(err) {
  if (import.meta.env.DEV) console.warn('[Firebase]', err?.code, err?.message);
  const [message, isCodeField] = MESSAGES[err?.code] || ['Chưa gửi được mã xác nhận. Cô chú thử lại sau ít phút hoặc gọi phòng khám.'];
  const out = new Error(message);
  out.code = err?.code;
  out.fields = isCodeField ? { code: message } : {};
  return out;
}
