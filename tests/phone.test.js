// Kiểm tra quy tắc số điện thoại ở trình duyệt (chạy: npm test). Câu báo lỗi phải khớp backend common/Phones.java.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { phoneDigits, phoneInputError, toPhone } from '../src/shared/domain/phone.js';

const MISSING_ONE = 'Số điện thoại còn thiếu 1 chữ số. Số di động gồm 10 chữ số.';

test('A2: 9 chữ số bắt đầu bằng 0 báo thiếu 1 chữ số, không thêm số 0 thứ hai', () => {
  assert.equal(toPhone('091234567'), '091234567');
  assert.equal(phoneInputError('091234567'), MISSING_ONE);
});

test('9 chữ số sau +84 thì thêm số 0 ở đầu và hợp lệ', () => {
  assert.equal(toPhone('912345678'), '0912345678');
  assert.equal(phoneInputError('912345678'), null);
});

test('10 chữ số dạng 0xxx giữ nguyên và hợp lệ', () => {
  assert.equal(toPhone('0912345678'), '0912345678');
  assert.equal(phoneInputError('0912345678'), null);
});

test('8 chữ số không có 0 báo thiếu 1 chữ số', () => {
  assert.equal(phoneInputError('91234567'), MISSING_ONE);
});

test('dán +84912345678 vào ô bỏ phần 84', () => {
  assert.equal(phoneDigits('+84912345678'), '912345678');
  assert.equal(phoneInputError(phoneDigits('+84912345678')), null);
});

test('đầu số sai vẫn báo đầu số', () => {
  assert.equal(phoneInputError('0212345678'),
    'Đầu số 02 không phải đầu số di động. Số di động bắt đầu bằng 03, 05, 07, 08 hoặc 09.');
});

test('ô không bắt buộc để trống thì không lỗi', () => {
  assert.equal(phoneInputError('', { required: false }), null);
});
