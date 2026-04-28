-- Payroll periods (kỳ lương) — chốt tại thời điểm bất kỳ
-- Mục tiêu:
-- - Đơn hàng gắn cố định vào 1 kỳ lương khi tạo (orders.payroll_period_id)
-- - Chốt kỳ tạo snapshot, và mở kỳ mới ngay sau đó

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS payroll_periods (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id INT UNSIGNED NOT NULL,
  from_at DATETIME NOT NULL,
  to_at DATETIME DEFAULT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  closed_at DATETIME DEFAULT NULL,
  created_by INT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payroll_periods_shop (shop_id),
  KEY idx_payroll_periods_status (status),
  KEY idx_payroll_periods_from (from_at),
  CONSTRAINT fk_payroll_periods_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payroll_periods_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payroll_settlements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id INT UNSIGNED NOT NULL,
  payroll_period_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  direct_commission DECIMAL(12,2) NOT NULL DEFAULT 0,
  override_commission DECIMAL(12,2) NOT NULL DEFAULT 0,
  return_commission_abs DECIMAL(12,2) NOT NULL DEFAULT 0,
  ship_khach_tra DECIMAL(12,2) NOT NULL DEFAULT 0,
  nv_chiu DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_luong DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_settlement_period_user (payroll_period_id, user_id),
  KEY idx_settlement_shop (shop_id),
  KEY idx_settlement_period (payroll_period_id),
  CONSTRAINT fk_settlement_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT,
  CONSTRAINT fk_settlement_period FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE,
  CONSTRAINT fk_settlement_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Điều chỉnh lương phát sinh sau khi chốt kỳ (trừ/cộng vào kỳ đang mở)
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id INT UNSIGNED NOT NULL,
  from_period_id INT UNSIGNED DEFAULT NULL COMMENT 'kỳ bị ảnh hưởng (đã chốt)',
  to_period_id INT UNSIGNED NOT NULL COMMENT 'kỳ nhận điều chỉnh (thường là kỳ đang mở)',
  user_id INT UNSIGNED NOT NULL,
  order_id INT UNSIGNED DEFAULT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'âm = trừ lương',
  reason VARCHAR(255) DEFAULT NULL,
  created_by INT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_adj_shop (shop_id),
  KEY idx_adj_to_period (to_period_id),
  KEY idx_adj_user (user_id),
  KEY idx_adj_order (order_id),
  CONSTRAINT fk_adj_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT,
  CONSTRAINT fk_adj_from_period FOREIGN KEY (from_period_id) REFERENCES payroll_periods(id) ON DELETE SET NULL,
  CONSTRAINT fk_adj_to_period FOREIGN KEY (to_period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE,
  CONSTRAINT fk_adj_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_adj_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_adj_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- orders.payroll_period_id
SET @has_col := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'payroll_period_id'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE orders ADD COLUMN payroll_period_id INT UNSIGNED NULL DEFAULT NULL AFTER shop_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND INDEX_NAME = 'idx_orders_payroll_period'
);
SET @sql := IF(@has_idx = 0,
  'ALTER TABLE orders ADD KEY idx_orders_payroll_period (payroll_period_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_fk := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND CONSTRAINT_NAME = 'fk_orders_payroll_period'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk = 0,
  'ALTER TABLE orders ADD CONSTRAINT fk_orders_payroll_period FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

