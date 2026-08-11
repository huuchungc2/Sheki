const test = require('node:test');
const assert = require('node:assert/strict');
const {
  allocateReturnAcrossLines,
  prorateLineCommission,
  resolveReturnAdjustment,
} = require('../utils/returnCommission');

test('hoàn một phần lấy đúng phần hoa hồng đã ghi nhận của dòng sản phẩm', () => {
  assert.equal(prorateLineCommission(70_000, 10, 4), 28_000);
});

test('hoàn toàn bộ lấy đúng toàn bộ hoa hồng của dòng sản phẩm', () => {
  assert.equal(prorateLineCommission(70_000, 10, 10), 70_000);
});

test('đơn nhiều mức 10% và 7% hoàn theo snapshot riêng của từng sản phẩm', () => {
  const productAt10Percent = prorateLineCommission(100_000, 1, 1);
  const productAt7Percent = prorateLineCommission(70_000, 1, 1);

  assert.equal(productAt10Percent + productAt7Percent, 170_000);
  assert.equal(prorateLineCommission(70_000, 1, 1), 70_000);
});

test('lần hoàn sau bỏ qua số lượng đã hoàn ở lần trước', () => {
  const first = { id: 1, qty: 2 };
  const second = { id: 2, qty: 3 };
  const allocations = allocateReturnAcrossLines([first, second], 2, 2);

  assert.deepEqual(allocations, [{ line: second, take: 2 }]);
});

test('hoàn hết phần còn lại quyết toán đúng hoa hồng gốc sau nhiều lần làm tròn', () => {
  assert.equal(resolveReturnAdjustment({
    calculatedAmount: 33.33,
    originalCommission: 100,
    alreadyAdjusted: 66.66,
    fullyReturned: true,
  }), 33.34);
});

test('hoàn một phần không được trừ vượt hoa hồng gốc còn lại', () => {
  assert.equal(resolveReturnAdjustment({
    calculatedAmount: 50,
    originalCommission: 100,
    alreadyAdjusted: 80,
  }), 20);
});
