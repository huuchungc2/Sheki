-- 999_final_multishop_rbac.sql
-- Final bundle: MULTI-SHOP + RBAC/SCOPES + Payroll (031) + Order line shop config (032–037) + counter-sale flag
-- Safe to run on a DB backup from server (idempotent as much as possible).
--
-- MySQL 5.7+
-- Run:
--   mysql -u root erp < migrations/999_final_multishop_rbac.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- Helpers (idempotent DDL/DML guards)
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

DROP PROCEDURE IF EXISTS sp_exec_if_table_exists//
CREATE PROCEDURE sp_exec_if_table_exists(
  IN p_table VARCHAR(64),
  IN p_sql TEXT
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
    LIMIT 1
  ) THEN
    SET @s = p_sql;
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

-- =========================================================
-- A) MULTI-SHOP core (018..021) - idempotent
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

CALL sp_add_column_if_not_exists('shops', 'valid_until', 'ALTER TABLE `shops` ADD COLUMN `valid_until` DATE NULL DEFAULT NULL COMMENT ''Hết hạn dùng shop; NULL = không giới hạn'' AFTER `is_active`');

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

-- Add shop_id columns for business tables (no-op if exists)
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
CALL sp_drop_index_if_exists('products', 'sku', 'ALTER TABLE `products` DROP INDEX `sku`');
CALL sp_add_index_if_not_exists('products', 'uk_products_shop_sku', 'ALTER TABLE `products` ADD UNIQUE KEY `uk_products_shop_sku` (`shop_id`, `sku`)');

CALL sp_add_column_if_not_exists('customers', 'shop_id', 'ALTER TABLE `customers` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_index_if_not_exists('customers', 'idx_customers_shop', 'ALTER TABLE `customers` ADD KEY `idx_customers_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('customers', 'fk_customers_shop', 'ALTER TABLE `customers` ADD CONSTRAINT `fk_customers_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT');

CALL sp_add_column_if_not_exists('collaborators', 'shop_id', 'ALTER TABLE `collaborators` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_drop_index_if_exists('collaborators', 'uk_sales_ctv', 'ALTER TABLE `collaborators` DROP INDEX `uk_sales_ctv`');
CALL sp_add_index_if_not_exists('collaborators', 'uk_collab_shop_sales_ctv', 'ALTER TABLE `collaborators` ADD UNIQUE KEY `uk_collab_shop_sales_ctv` (`shop_id`, `sales_id`, `ctv_id`)');
CALL sp_add_index_if_not_exists('collaborators', 'idx_collaborators_shop', 'ALTER TABLE `collaborators` ADD KEY `idx_collaborators_shop` (`shop_id`)');
CALL sp_add_fk_if_not_exists('collaborators', 'fk_collaborators_shop', 'ALTER TABLE `collaborators` ADD CONSTRAINT `fk_collaborators_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE');

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

-- role_permissions shop_id + role_id (kept for compatibility)
CALL sp_add_column_if_not_exists('role_permissions', 'shop_id', 'ALTER TABLE `role_permissions` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`');
CALL sp_add_column_if_not_exists('role_permissions', 'role_id', 'ALTER TABLE `role_permissions` ADD COLUMN `role_id` INT UNSIGNED NULL AFTER `shop_id`');

CALL sp_drop_index_if_exists('role_permissions', 'uk_role_module_action', 'ALTER TABLE `role_permissions` DROP INDEX `uk_role_module_action`');
CALL sp_drop_index_if_exists('role_permissions', 'uk_shop_role_module_action', 'ALTER TABLE `role_permissions` DROP INDEX `uk_shop_role_module_action`');

CALL sp_add_index_if_not_exists('role_permissions', 'idx_role_permissions_shop', 'ALTER TABLE `role_permissions` ADD KEY `idx_role_permissions_shop` (`shop_id`)');
CALL sp_add_index_if_not_exists('role_permissions', 'idx_role_permissions_role_id', 'ALTER TABLE `role_permissions` ADD KEY `idx_role_permissions_role_id` (`role_id`)');

-- Backfill role_id from roles.code, then enforce unique by (shop_id, role_id, module, action)
UPDATE `role_permissions` rp
JOIN `roles` r ON r.code = rp.role
SET rp.role_id = r.id
WHERE rp.role_id IS NULL;

UPDATE `role_permissions` rp
JOIN `roles` r ON r.code = 'sales'
SET rp.role_id = r.id
WHERE rp.role_id IS NULL;

CALL sp_add_index_if_not_exists('role_permissions', 'uk_shop_roleId_module_action', 'ALTER TABLE `role_permissions` ADD UNIQUE KEY `uk_shop_roleId_module_action` (`shop_id`, `role_id`, `module`, `action`)');
CALL sp_add_fk_if_not_exists('role_permissions', 'fk_role_permissions_shop', 'ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permissions_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE');
CALL sp_add_fk_if_not_exists('role_permissions', 'fk_role_permissions_role', 'ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE');

-- super admin user
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
-- B) ROLES scoped by shop (022 + 023) - idempotent
-- =========================================================

CALL sp_add_column_if_not_exists('roles', 'shop_id', 'ALTER TABLE `roles` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `id`');

-- Move existing non-system roles into shop 1 by default (legacy DB had global roles)
UPDATE `roles`
SET `shop_id` = 1
WHERE COALESCE(`is_system`, 0) = 0
  AND (COALESCE(`shop_id`, 0) = 0 OR `shop_id` IS NULL);

-- Ensure system roles stay global
UPDATE `roles`
SET `shop_id` = 0
WHERE COALESCE(`is_system`, 0) = 1
   OR `code` IN ('admin', 'sales');

-- Drop legacy UNIQUE(code) only if it exists and uk_roles_shop_code not yet present
SET @has_uk_shop_code := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS s
  WHERE s.TABLE_SCHEMA = DATABASE()
    AND s.TABLE_NAME = 'roles'
    AND s.INDEX_NAME = 'uk_roles_shop_code'
);

SET @idx_to_drop := (
  SELECT s.INDEX_NAME
  FROM information_schema.STATISTICS s
  WHERE s.TABLE_SCHEMA = DATABASE()
    AND s.TABLE_NAME = 'roles'
    AND s.NON_UNIQUE = 0
    AND s.INDEX_NAME IN ('code', 'uk_roles_code')
  ORDER BY FIELD(s.INDEX_NAME, 'code', 'uk_roles_code')
  LIMIT 1
);

SET @drop_sql := IF(
  @has_uk_shop_code > 0 OR @idx_to_drop IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE `roles` DROP INDEX `', REPLACE(@idx_to_drop, '`', ''), '`')
);
PREPARE stmt_drop_roles_idx FROM @drop_sql;
EXECUTE stmt_drop_roles_idx;
DEALLOCATE PREPARE stmt_drop_roles_idx;

SET @sql_add_uk_shop_code := IF(
  @has_uk_shop_code = 0,
  'ALTER TABLE `roles` ADD UNIQUE KEY `uk_roles_shop_code` (`shop_id`, `code`), ADD KEY `idx_roles_shop` (`shop_id`)',
  'SELECT 1'
);
PREPARE stmt_add_uk_shop_code FROM @sql_add_uk_shop_code;
EXECUTE stmt_add_uk_shop_code;
DEALLOCATE PREPARE stmt_add_uk_shop_code;

-- Optional backfill: move custom roles back to the shop where they are used most (only roles defaulted to shop_id=1)
DROP TEMPORARY TABLE IF EXISTS tmp_role_shop_usage;
CREATE TEMPORARY TABLE tmp_role_shop_usage AS
SELECT
  us.role_id,
  us.shop_id,
  COUNT(*) AS c
FROM user_shops us
GROUP BY us.role_id, us.shop_id;

DROP TEMPORARY TABLE IF EXISTS tmp_role_shop_max;
CREATE TEMPORARY TABLE tmp_role_shop_max AS
SELECT role_id, MAX(c) AS max_c
FROM tmp_role_shop_usage
GROUP BY role_id;

DROP TEMPORARY TABLE IF EXISTS tmp_role_shop_pick;
CREATE TEMPORARY TABLE tmp_role_shop_pick AS
SELECT u.role_id, u.shop_id
FROM tmp_role_shop_usage u
JOIN tmp_role_shop_max m ON m.role_id = u.role_id AND m.max_c = u.c
GROUP BY u.role_id, u.shop_id
HAVING COUNT(*) = 1;

UPDATE roles r
JOIN tmp_role_shop_pick p ON p.role_id = r.id
SET r.shop_id = p.shop_id
WHERE COALESCE(r.is_system, 0) = 0
  AND r.shop_id = 1
  AND r.code NOT IN ('admin', 'sales');

-- =========================================================
-- C) Scope tables (025 + 028) + seeds
-- =========================================================

CREATE TABLE IF NOT EXISTS `role_module_scopes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shop_id` INT UNSIGNED NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  `module` VARCHAR(32) NOT NULL,
  `scope` ENUM('own', 'shop') NOT NULL DEFAULT 'own',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_scope_shop_role_module` (`shop_id`, `role_id`, `module`),
  KEY `idx_scope_shop` (`shop_id`),
  KEY `idx_scope_role` (`role_id`),
  CONSTRAINT `fk_scope_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_scope_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO role_module_scopes (shop_id, role_id, module, scope)
SELECT
  us.shop_id,
  us.role_id,
  m.module,
  CASE
    WHEN COALESCE(r.can_access_admin, 0) = 1 THEN 'shop'
    WHEN COALESCE(r.scope_own_data, 0) = 1 THEN 'own'
    ELSE 'shop'
  END AS scope
FROM user_shops us
JOIN roles r ON r.id = us.role_id
JOIN (
  SELECT 'orders' AS module
  UNION ALL SELECT 'customers'
  UNION ALL SELECT 'reports'
) m
GROUP BY us.shop_id, us.role_id, m.module
ON DUPLICATE KEY UPDATE scope = VALUES(scope);

CREATE TABLE IF NOT EXISTS `role_scopes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shop_id` INT UNSIGNED NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  `target` VARCHAR(32) NOT NULL,
  `scope` ENUM('own', 'group', 'shop') NOT NULL DEFAULT 'own',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_scopes_shop_role_target` (`shop_id`, `role_id`, `target`),
  KEY `idx_role_scopes_shop` (`shop_id`),
  KEY `idx_role_scopes_role` (`role_id`),
  CONSTRAINT `fk_role_scopes_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_scopes_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- D) Feature permissions table (027) + fixes (029)
-- =========================================================

CREATE TABLE IF NOT EXISTS `role_feature_permissions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shop_id` INT UNSIGNED NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  `feature_key` VARCHAR(128) NOT NULL,
  `allowed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rfp_shop_role_feature` (`shop_id`, `role_id`, `feature_key`),
  KEY `idx_rfp_shop` (`shop_id`),
  KEY `idx_rfp_role` (`role_id`),
  KEY `idx_rfp_feature` (`feature_key`),
  CONSTRAINT `fk_rfp_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rfp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure customers.view exists when customers.list is allowed (migration 029)
INSERT INTO role_feature_permissions (shop_id, role_id, feature_key, allowed)
SELECT
  rfp.shop_id,
  rfp.role_id,
  'customers.view' AS feature_key,
  1 AS allowed
FROM role_feature_permissions rfp
WHERE rfp.feature_key = 'customers.list'
  AND COALESCE(rfp.allowed, 0) = 1
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);

-- =========================================================
-- E) Fix Sales default scope own (030) - guarded updates
-- =========================================================

UPDATE roles
SET scope_own_data = 1
WHERE LOWER(TRIM(code)) = 'sales';

CALL sp_exec_if_table_exists(
  'role_module_scopes',
  'UPDATE role_module_scopes rms
   JOIN roles r ON r.id = rms.role_id
   SET rms.scope = ''own''
   WHERE LOWER(TRIM(r.code)) = ''sales''
     AND rms.module IN (''orders'', ''customers'', ''reports'')'
);

CALL sp_exec_if_table_exists(
  'role_scopes',
  'UPDATE role_scopes rs
   JOIN roles r ON r.id = rs.role_id
   SET rs.scope = ''own''
   WHERE LOWER(TRIM(r.code)) = ''sales''
     AND rs.target IN (''orders'', ''customers'', ''reports'')'
);

-- =========================================================
-- F) Payroll periods (031) — kỳ lương + orders.payroll_period_id
-- =========================================================

CREATE TABLE IF NOT EXISTS `payroll_periods` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shop_id` INT UNSIGNED NOT NULL,
  `from_at` DATETIME NOT NULL,
  `to_at` DATETIME DEFAULT NULL,
  `status` ENUM('open','closed') NOT NULL DEFAULT 'open',
  `closed_at` DATETIME DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payroll_periods_shop` (`shop_id`),
  KEY `idx_payroll_periods_status` (`status`),
  KEY `idx_payroll_periods_from` (`from_at`),
  CONSTRAINT `fk_payroll_periods_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_payroll_periods_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payroll_settlements` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shop_id` INT UNSIGNED NOT NULL,
  `payroll_period_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `direct_commission` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `override_commission` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `return_commission_abs` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `ship_khach_tra` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `nv_chiu` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `total_luong` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_settlement_period_user` (`payroll_period_id`, `user_id`),
  KEY `idx_settlement_shop` (`shop_id`),
  KEY `idx_settlement_period` (`payroll_period_id`),
  CONSTRAINT `fk_settlement_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_settlement_period` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_settlement_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payroll_adjustments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shop_id` INT UNSIGNED NOT NULL,
  `from_period_id` INT UNSIGNED DEFAULT NULL COMMENT 'kỳ bị ảnh hưởng (đã chốt)',
  `to_period_id` INT UNSIGNED NOT NULL COMMENT 'kỳ nhận điều chỉnh (thường là kỳ đang mở)',
  `user_id` INT UNSIGNED NOT NULL,
  `order_id` INT UNSIGNED DEFAULT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'âm = trừ lương',
  `reason` VARCHAR(255) DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_adj_shop` (`shop_id`),
  KEY `idx_adj_to_period` (`to_period_id`),
  KEY `idx_adj_user` (`user_id`),
  KEY `idx_adj_order` (`order_id`),
  CONSTRAINT `fk_adj_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_adj_from_period` FOREIGN KEY (`from_period_id`) REFERENCES `payroll_periods` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_adj_to_period` FOREIGN KEY (`to_period_id`) REFERENCES `payroll_periods` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_adj_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_adj_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_adj_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL sp_add_column_if_not_exists('orders', 'payroll_period_id', 'ALTER TABLE `orders` ADD COLUMN `payroll_period_id` INT UNSIGNED NULL DEFAULT NULL AFTER `shop_id`');
CALL sp_add_index_if_not_exists('orders', 'idx_orders_payroll_period', 'ALTER TABLE `orders` ADD KEY `idx_orders_payroll_period` (`payroll_period_id`)');
CALL sp_add_fk_if_not_exists('orders', 'fk_orders_payroll_period', 'ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_payroll_period` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`id`) ON DELETE SET NULL');

-- =========================================================
-- G) shops: OrderForm / Counter line (032–037) + orders.is_counter_sale (033)
-- Thứ tự ALTER khớp migration gốc (035 rồi 036) để cột nằm đúng vị trí.
-- =========================================================

CALL sp_add_column_if_not_exists('shops', 'order_line_show_commission', 'ALTER TABLE `shops` ADD COLUMN `order_line_show_commission` TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''1=hiện cột HH trên OrderForm'' AFTER `valid_until`');
CALL sp_add_column_if_not_exists('shops', 'order_default_commission_rate', 'ALTER TABLE `shops` ADD COLUMN `order_default_commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 10.00 COMMENT ''% HH mặc định dòng mới'' AFTER `order_line_show_commission`');
CALL sp_add_column_if_not_exists('shops', 'order_line_show_discount', 'ALTER TABLE `shops` ADD COLUMN `order_line_show_discount` TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''1=hiện cột CK% đơn giao'' AFTER `order_default_commission_rate`');
CALL sp_add_column_if_not_exists('shops', 'counter_order_line_show_commission', 'ALTER TABLE `shops` ADD COLUMN `counter_order_line_show_commission` TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''1=hiện cột HH bán tại quầy'' AFTER `order_line_show_discount`');
CALL sp_add_column_if_not_exists('shops', 'counter_order_line_show_discount', 'ALTER TABLE `shops` ADD COLUMN `counter_order_line_show_discount` TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''1=hiện cột CK% bán tại quầy'' AFTER `counter_order_line_show_commission`');
CALL sp_add_column_if_not_exists('shops', 'counter_order_default_commission_rate', 'ALTER TABLE `shops` ADD COLUMN `counter_order_default_commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 10.00 COMMENT ''% HH mặc định dòng mới (quầy)'' AFTER `counter_order_line_show_discount`');
CALL sp_add_column_if_not_exists('shops', 'order_default_discount_rate', 'ALTER TABLE `shops` ADD COLUMN `order_default_discount_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT ''% CK mặc định dòng mới (đơn giao)'' AFTER `order_line_show_discount`');
CALL sp_add_column_if_not_exists('shops', 'counter_order_default_discount_rate', 'ALTER TABLE `shops` ADD COLUMN `counter_order_default_discount_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT ''% CK mặc định dòng mới (quầy)'' AFTER `counter_order_line_show_discount`');
CALL sp_add_column_if_not_exists('shops', 'order_qty_allow_decimal', 'ALTER TABLE `shops` ADD COLUMN `order_qty_allow_decimal` TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''1=cho SL lẻ bước 0.1 (đơn giao)'' AFTER `order_default_discount_rate`');
CALL sp_add_column_if_not_exists('shops', 'counter_order_qty_allow_decimal', 'ALTER TABLE `shops` ADD COLUMN `counter_order_qty_allow_decimal` TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''1=cho SL lẻ bước 0.1 (quầy)'' AFTER `counter_order_default_discount_rate`');

-- Đồng bộ lần đầu (giống 035); chạy lại bundle có thể ghi đè chỉnh tay cột counter — tránh chạy 999 nhiều lần trên DB production đã cấu hình.
UPDATE `shops` SET
  `counter_order_line_show_commission` = `order_line_show_commission`,
  `counter_order_line_show_discount` = `order_line_show_discount`,
  `counter_order_default_commission_rate` = `order_default_commission_rate`;

CALL sp_add_column_if_not_exists('orders', 'is_counter_sale', 'ALTER TABLE `orders` ADD COLUMN `is_counter_sale` TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1=đơn bán tại quầy'' AFTER `collaborator_user_id`');
CALL sp_add_index_if_not_exists('orders', 'idx_orders_counter_sale', 'ALTER TABLE `orders` ADD KEY `idx_orders_counter_sale` (`is_counter_sale`)');

-- Bổ sung cột thuế (schema hiện tại) nếu DB backup cũ thiếu
CALL sp_add_column_if_not_exists('orders', 'tax_amount', 'ALTER TABLE `orders` ADD COLUMN `tax_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER `discount`');

-- =========================================================
-- Cleanup helpers (optional)
-- =========================================================
DROP PROCEDURE IF EXISTS sp_add_column_if_not_exists;
DROP PROCEDURE IF EXISTS sp_add_index_if_not_exists;
DROP PROCEDURE IF EXISTS sp_drop_index_if_exists;
DROP PROCEDURE IF EXISTS sp_add_fk_if_not_exists;
DROP PROCEDURE IF EXISTS sp_exec_if_table_exists;

SET FOREIGN_KEY_CHECKS = 1;

