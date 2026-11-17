// Tên che bớt trên màn hình phòng chờ (A13). Chạy: npm test.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicName } from '../src/staff/lib/publicName.js';

test('họ và tên đệm viết tắt, giữ tên gọi', () => {
  assert.equal(publicName('Nguyễn Văn An'), 'N. V. An');
  assert.equal(publicName('Trương Thị Mỹ'), 'T. T. Mỹ');
  assert.equal(publicName('Đặng Thị Ngọc Ánh'), 'Đ. T. N. Ánh');
});

test('gom khoảng trắng thừa, chữ thường ở họ vẫn viết hoa chữ cái đầu', () => {
  assert.equal(publicName('  lê   văn  bảy '), 'L. V. bảy');
});

test('tên một chữ giữ nguyên, trống thì là Bệnh nhân', () => {
  assert.equal(publicName('Mai'), 'Mai');
  assert.equal(publicName(''), 'Bệnh nhân');
  assert.equal(publicName(null), 'Bệnh nhân');
});
