-- 022_roles_shop_id.sql
-- Roles scoped by shop (multi-shop): roles.shop_id
-- - shop_id = 0: global/system roles (admin, sales)
-- - shop_id > 0: roles created within that shop
--
-- Existing DB (pre-change): roles were global. We migrate all custom roles to shop_id = 1 (Sheki).

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) Add shop_id
ALTER TABLE `roles`
  ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `id`;

-- 2) Move existing non-system roles into shop 1 (Sheki)
UPDATE `roles`
SET `shop_id` = 1
WHERE COALESCE(`is_system`, 0) = 0;

-- Ensure system roles stay global
UPDATE `roles`
SET `shop_id` = 0
WHERE COALESCE(`is_system`, 0) = 1
   OR `code` IN ('admin', 'sales');

-- 3) Unique by (shop_id, code) instead of global code unique
-- NOTE: index name for the old UNIQUE(code) may vary across environments.
-- We drop it safely via information_schema + dynamic SQL.
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
  @idx_to_drop IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE `roles` DROP INDEX `', REPLACE(@idx_to_drop, '`', ''), '`')
);
PREPARE stmt_drop_roles_idx FROM @drop_sql;
EXECUTE stmt_drop_roles_idx;
DEALLOCATE PREPARE stmt_drop_roles_idx;

ALTER TABLE `roles`
  ADD UNIQUE KEY `uk_roles_shop_code` (`shop_id`, `code`),
  ADD KEY `idx_roles_shop` (`shop_id`);

SET FOREIGN_KEY_CHECKS = 1;

