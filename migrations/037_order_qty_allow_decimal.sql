-- 037_order_qty_allow_decimal.sql
-- Thêm cấu hình SL: cho nhập lẻ (DECIMAL) hoặc chỉ số nguyên

ALTER TABLE shops
  ADD COLUMN order_qty_allow_decimal TINYINT(1) NOT NULL DEFAULT 1 AFTER order_default_discount_rate,
  ADD COLUMN counter_order_qty_allow_decimal TINYINT(1) NOT NULL DEFAULT 1 AFTER counter_order_default_discount_rate;

