-- % chiết khấu dòng (CK) mặc định khi thêm sản phẩm — tách đơn giao / quầy
SET @has_od := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shops' AND COLUMN_NAME = 'order_default_discount_rate'
);
SET @sql_od := IF(
  @has_od > 0,
  'SELECT 1',
  'ALTER TABLE shops ADD COLUMN order_default_discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT ''% CK mặc định dòng mới (đơn giao)'' AFTER order_line_show_discount'
);
PREPARE stmt_od FROM @sql_od;
EXECUTE stmt_od;
DEALLOCATE PREPARE stmt_od;

SET @has_cd := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shops' AND COLUMN_NAME = 'counter_order_default_discount_rate'
);
SET @sql_cd := IF(
  @has_cd > 0,
  'SELECT 1',
  'ALTER TABLE shops ADD COLUMN counter_order_default_discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT ''% CK mặc định dòng mới (quầy)'' AFTER counter_order_line_show_discount'
);
PREPARE stmt_cd FROM @sql_cd;
EXECUTE stmt_cd;
DEALLOCATE PREPARE stmt_cd;
