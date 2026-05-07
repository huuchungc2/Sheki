-- Cấu hình cột CK%/HH% riêng cho bán tại quầy (CounterSale) vs đơn giao (OrderForm).
-- An toàn khi DB đã có 032 nhưng CHƯA chạy 034 (thiếu order_line_show_discount).

-- 1) Đảm bảo có order_line_show_discount (giống 034) — tránh #1054 khi 035 REFERENCES cột này
SET @has_disc := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shops' AND COLUMN_NAME = 'order_line_show_discount'
);
SET @sql_disc := IF(
  @has_disc > 0,
  'SELECT 1',
  'ALTER TABLE shops ADD COLUMN order_line_show_discount TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''1=hiện cột CK% đơn giao'' AFTER order_default_commission_rate'
);
PREPARE stmt_disc FROM @sql_disc;
EXECUTE stmt_disc;
DEALLOCATE PREPARE stmt_disc;

-- 2) Thêm cột counter (idempotent từng cột)
SET @has_c_comm := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shops' AND COLUMN_NAME = 'counter_order_line_show_commission'
);
SET @sql_c_comm := IF(
  @has_c_comm > 0,
  'SELECT 1',
  'ALTER TABLE shops ADD COLUMN counter_order_line_show_commission TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''1=hiện cột HH bán tại quầy'' AFTER order_line_show_discount'
);
PREPARE stmt_c_comm FROM @sql_c_comm;
EXECUTE stmt_c_comm;
DEALLOCATE PREPARE stmt_c_comm;

SET @has_c_disc := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shops' AND COLUMN_NAME = 'counter_order_line_show_discount'
);
SET @sql_c_disc := IF(
  @has_c_disc > 0,
  'SELECT 1',
  'ALTER TABLE shops ADD COLUMN counter_order_line_show_discount TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''1=hiện cột CK% bán tại quầy'' AFTER counter_order_line_show_commission'
);
PREPARE stmt_c_disc FROM @sql_c_disc;
EXECUTE stmt_c_disc;
DEALLOCATE PREPARE stmt_c_disc;

SET @has_c_rate := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shops' AND COLUMN_NAME = 'counter_order_default_commission_rate'
);
SET @sql_c_rate := IF(
  @has_c_rate > 0,
  'SELECT 1',
  'ALTER TABLE shops ADD COLUMN counter_order_default_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00 COMMENT ''% HH mặc định dòng mới (quầy)'' AFTER counter_order_line_show_discount'
);
PREPARE stmt_c_rate FROM @sql_c_rate;
EXECUTE stmt_c_rate;
DEALLOCATE PREPARE stmt_c_rate;

-- 3) Đồng bộ giá trị ban đầu từ cột đơn giao (cần đã có 032: order_line_show_commission, order_default_commission_rate)
UPDATE shops SET
  counter_order_line_show_commission = order_line_show_commission,
  counter_order_line_show_discount = order_line_show_discount,
  counter_order_default_commission_rate = order_default_commission_rate;
