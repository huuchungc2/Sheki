-- 018_021_multi_shop_bundle_idempotent.sql
-- Gộp + chạy an toàn (idempotent) cho DB có thể đã lỡ chạy một phần.
-- Tương thích MySQL 5.7+ (dùng information_schema + prepared statements).
--
-- Chạy:
--   mysql -u root erp < migrations/018_021_multi_shop_bundle_idempotent.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- Helpers
-- =========================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_add_column_if_not_exists//
CREATE PROCEDURE sp_add_column_if_not_exists(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @s = p_alter_sql;
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DROP PROCEDURE IF EXISTS sp_add_index_if_not_exists//
CREATE PROCEDURE sp_add_index_if_not_exists(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index
    LIMIT 1
  ) THEN
    SET @s = p_alter_sql;
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DROP PROCEDURE IF EXISTS sp_drop_index_if_exists//
CREATE PROCEDURE sp_drop_index_if_exists(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_alter_sql TEXT
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index
    LIMIT 1
  ) THEN
    SET @s = p_alter_sql;
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DROP PROCEDURE IF EXISTS sp_add_fk_if_not_exists//
CREATE PROCEDURE sp_add_fk_if_not_exists(
  IN p_table VARCHAR(64),
  IN p_fk VARCHAR(64),
  IN p_alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND CONSTRAINT_NAME = p_fk
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    LIMIT 1
  ) THEN
    SET @s = p_alter_sql;
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

-- =========================================================
-- 018: multi-shop
-- =========================================================

CREATE TABLE IF NOT EXISTS `shops` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(32) NOT NULL COMMENT 'Mã shop (slug)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shops_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `shops` (`id`, `name`, `code`, `is_active`) VALUES (1, 'Sheki', 'sheki', 1)
  ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

CREATE TABLE IF NOT EXISTS `user_shops` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `shop_id` INT UNSIGNED NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_shop` (`user_id`, `shop_id`),
  KEY `idx_user_shops_shop` (`shop_id`),
  KEY `idx_user_shops_user` (`user_id`),
  CONSTRAINT `fk_user_shops_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_shops_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_shops_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `user_shops` (`user_id`, `shop_id`, `role_id`)
SELECT `id`, 1, `role_id` FROM `users`
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- Add shop_id columns
CALL sp_add_column_if_not_exists('categories', 'shop_id', 'ALTER TABLE `categories` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('categories', 'idx_categories_shop', 'ALTER TABLE `categories` ADD KEY `idx_categories_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('categories', 'fk_categories_shop', 'ALTER TABLE `categories` ADD CONSTRAINT `fk_categories_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('warehouses', 'shop_id', 'ALTER TABLE `warehouses` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('warehouses', 'idx_warehouses_shop', 'ALTER TABLE `warehouses` ADD KEY `idx_warehouses_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('warehouses', 'fk_warehouses_shop', 'ALTER TABLE `warehouses` ADD CONSTRAINT `fk_warehouses_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('groups', 'shop_id', 'ALTER TABLE `groups` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('groups', 'idx_groups_shop', 'ALTER TABLE `groups` ADD KEY `idx_groups_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('groups', 'fk_groups_shop', 'ALTER TABLE `groups` ADD CONSTRAINT `fk_groups_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('commission_tiers', 'shop_id', 'ALTER TABLE `commission_tiers` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('commission_tiers', 'idx_commission_tiers_shop', 'ALTER TABLE `commission_tiers` ADD KEY `idx_commission_tiers_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('commission_tiers', 'fk_commission_tiers_shop', 'ALTER TABLE `commission_tiers` ADD CONSTRAINT `fk_commission_tiers_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('products', 'shop_id', 'ALTER TABLE `products` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('products', 'idx_products_shop', 'ALTER TABLE `products` ADD KEY `idx_products_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('products', 'fk_products_shop', 'ALTER TABLE `products` ADD CONSTRAINT `fk_products_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('customers', 'shop_id', 'ALTER TABLE `customers` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('customers', 'idx_customers_shop', 'ALTER TABLE `customers` ADD KEY `idx_customers_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('customers', 'fk_customers_shop', 'ALTER TABLE `customers` ADD CONSTRAINT `fk_customers_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('collaborators', 'shop_id', 'ALTER TABLE `collaborators` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_drop_index_if_exists('collaborators', 'uk_sales_ctv', 'ALTER TABLE `collaborators` DROP INDEX `uk_sales_ctv`');
CALL sp_add_index_if_not_exists('collaborators', 'uk_collab_shop_sales_ctv', 'ALTER TABLE `collaborators` ADD UNIQUE KEY `uk_collab_shop_sales_ctv` (`shop_id`, `sales_id`, `ctv_id`)');
CALL sp_add_index_if_not_exists('collaborators', 'idx_collaborators_shop', 'ALTER TABLE `collaborators` ADD KEY `idx_collaborators_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('collaborators', 'fk_collaborators_shop', 'ALTER TABLE `collaborators` ADD CONSTRAINT `fk_collaborators_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE');

CALL sp_drop_index_if_exists('products', 'sku', 'ALTER TABLE `products` DROP INDEX `sku`');
CALL sp_add_index_if_not_exists('products', 'uk_products_shop_sku', 'ALTER TABLE `products` ADD UNIQUE KEY `uk_products_shop_sku` (`shop_id`, `sku`)');

CALL sp_add_column_if_not_exists('orders', 'shop_id', 'ALTER TABLE `orders` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('orders', 'idx_orders_shop', 'ALTER TABLE `orders` ADD KEY `idx_orders_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('orders', 'fk_orders_shop', 'ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');
CALL sp_drop_index_if_exists('orders', 'code', 'ALTER TABLE `orders` DROP INDEX `code`');
CALL sp_add_index_if_not_exists('orders', 'uk_orders_shop_code', 'ALTER TABLE `orders` ADD UNIQUE KEY `uk_orders_shop_code` (`shop_id`, `code`)');

CALL sp_add_column_if_not_exists('warehouse_stock', 'shop_id', 'ALTER TABLE `warehouse_stock` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('warehouse_stock', 'idx_warehouse_stock_shop', 'ALTER TABLE `warehouse_stock` ADD KEY `idx_warehouse_stock_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('warehouse_stock', 'fk_warehouse_stock_shop', 'ALTER TABLE `warehouse_stock` ADD CONSTRAINT `fk_warehouse_stock_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('stock_movements', 'shop_id', 'ALTER TABLE `stock_movements` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('stock_movements', 'idx_stock_movements_shop', 'ALTER TABLE `stock_movements` ADD KEY `idx_stock_movements_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('stock_movements', 'fk_stock_movements_shop', 'ALTER TABLE `stock_movements` ADD CONSTRAINT `fk_stock_movements_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('commissions', 'shop_id', 'ALTER TABLE `commissions` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('commissions', 'idx_commissions_shop', 'ALTER TABLE `commissions` ADD KEY `idx_commissions_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('commissions', 'fk_commissions_shop', 'ALTER TABLE `commissions` ADD CONSTRAINT `fk_commissions_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('loyalty_points', 'shop_id', 'ALTER TABLE `loyalty_points` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('loyalty_points', 'idx_loyalty_shop', 'ALTER TABLE `loyalty_points` ADD KEY `idx_loyalty_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('loyalty_points', 'fk_loyalty_shop', 'ALTER TABLE `loyalty_points` ADD CONSTRAINT `fk_loyalty_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('activity_logs', 'shop_id', 'ALTER TABLE `activity_logs` ADD COLUMN `shop_id` INT UNSIGNED NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('activity_logs', 'idx_logs_shop', 'ALTER TABLE `activity_logs` ADD KEY `idx_logs_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('activity_logs', 'fk_logs_shop', 'ALTER TABLE `activity_logs` ADD CONSTRAINT `fk_logs_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE SET NULL');

CALL sp_add_column_if_not_exists('return_requests', 'shop_id', 'ALTER TABLE `return_requests` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('return_requests', 'idx_return_requests_shop', 'ALTER TABLE `return_requests` ADD KEY `idx_return_requests_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('return_requests', 'fk_return_requests_shop', 'ALTER TABLE `return_requests` ADD CONSTRAINT `fk_return_requests_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('returns', 'shop_id', 'ALTER TABLE `returns` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('returns', 'idx_returns_shop', 'ALTER TABLE `returns` ADD KEY `idx_returns_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('returns', 'fk_returns_shop', 'ALTER TABLE `returns` ADD CONSTRAINT `fk_returns_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('commission_adjustments', 'shop_id', 'ALTER TABLE `commission_adjustments` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('commission_adjustments', 'idx_ca_shop', 'ALTER TABLE `commission_adjustments` ADD KEY `idx_ca_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('commission_adjustments', 'fk_ca_shop', 'ALTER TABLE `commission_adjustments` ADD CONSTRAINT `fk_ca_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('cash_transactions', 'shop_id', 'ALTER TABLE `cash_transactions` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('cash_transactions', 'idx_cash_tx_shop', 'ALTER TABLE `cash_transactions` ADD KEY `idx_cash_tx_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('cash_transactions', 'fk_cash_tx_shop', 'ALTER TABLE `cash_transactions` ADD CONSTRAINT `fk_cash_tx_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('role_permissions', 'shop_id', 'ALTER TABLE `role_permissions` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_drop_index_if_exists('role_permissions', 'uk_role_module_action', 'ALTER TABLE `role_permissions` DROP INDEX `uk_role_module_action`');
CALL sp_add_index_if_not_exists('role_permissions', 'uk_shop_role_module_action', 'ALTER TABLE `role_permissions` ADD UNIQUE KEY `uk_shop_role_module_action` (`shop_id`, `role`, `module`, `action`)');
CALL sp_add_index_if_not_exists('role_permissions', 'idx_role_permissions_shop', 'ALTER TABLE `role_permissions` ADD KEY `idx_role_permissions_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('role_permissions', 'fk_role_permissions_shop', 'ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permissions_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE');

-- =========================================================
-- 019: super admin
-- =========================================================
CALL sp_add_column_if_not_exists('users', 'is_super_admin', 'ALTER TABLE `users` ADD COLUMN `is_super_admin` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`');

INSERT INTO `users` (`full_name`, `username`, `email`, `password_hash`, `phone`, `role_id`, `commission_rate`, `is_active`, `is_super_admin`, `join_date`)
SELECT
  'Super Admin',
  'superadmin',
  'superadmin@sheki.vn',
  COALESCE(
    (SELECT u.password_hash FROM users u WHERE u.username = 'admin' OR u.email = 'admin@velocity.vn' ORDER BY u.id ASC LIMIT 1),
    '$2a$10$Zhz.v5UVYxRL/paZZa7VC.2Se3NpDgUcaOCUFd1QkNBx4gkohcuRu'
  ) AS password_hash,
  NULL,
  1,
  0.00,
  1,
  1,
  '2020-01-01'
FROM DUAL
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `is_super_admin` = 1,
  `is_active` = 1;

-- =========================================================
-- 020: shop valid_until
-- =========================================================
CALL sp_add_column_if_not_exists('shops', 'valid_until', 'ALTER TABLE `shops` ADD COLUMN `valid_until` DATE NULL DEFAULT NULL COMMENT ''Hết hạn dùng shop; NULL = không giới hạn'' AFTER `is_active`');

-- =========================================================
-- 021: role_permissions.role_id
-- =========================================================
CALL sp_add_column_if_not_exists('role_permissions', 'role_id', 'ALTER TABLE `role_permissions` ADD COLUMN `role_id` INT UNSIGNED NULL AFTER `shop_id`');

UPDATE `role_permissions` rp
JOIN `roles` r ON r.code = rp.role
SET rp.role_id = r.id
WHERE rp.role_id IS NULL;

UPDATE `role_permissions` rp
JOIN `roles` r ON r.code = 'sales'
SET rp.role_id = r.id
WHERE rp.role_id IS NULL;

CALL sp_drop_index_if_exists('role_permissions', 'uk_shop_role_module_action', 'ALTER TABLE `role_permissions` DROP INDEX `uk_shop_role_module_action`');
CALL sp_add_index_if_not_exists('role_permissions', 'uk_shop_roleId_module_action', 'ALTER TABLE `role_permissions` ADD UNIQUE KEY `uk_shop_roleId_module_action` (`shop_id`, `role_id`, `module`, `action`)');
CALL sp_add_index_if_not_exists('role_permissions', 'idx_role_permissions_role_id', 'ALTER TABLE `role_permissions` ADD KEY `idx_role_permissions_role_id` (`role_id`)');
CALL sp_add_fk_if_not_exists('role_permissions', 'fk_role_permissions_role', 'ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE');

SET FOREIGN_KEY_CHECKS = 1;

