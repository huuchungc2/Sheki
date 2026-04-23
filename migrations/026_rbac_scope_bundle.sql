-- 026_rbac_scope_bundle.sql
-- Bundle: roles per shop + module-level data scopes (own/shop)
-- Run once on an existing DB.
--
-- Includes logic from:
-- - 022_roles_shop_id.sql (roles.shop_id + unique (shop_id, code))
-- - 025_role_module_scopes.sql (role_module_scopes + seed)
-- - 023_backfill_roles_shop_id_from_user_shops.sql (optional backfill if multi-shop existed)
--
-- Notes:
-- - System roles should remain global (shop_id = 0): admin, sales, and is_system=1.
-- - Custom roles become shop-scoped.
-- - Scope table is used for filtering data (own vs shop) per module.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- A) roles.shop_id + unique (shop_id, code)
-- =========================================================

-- Add roles.shop_id if missing
SET @has_roles_shop_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'roles'
    AND COLUMN_NAME = 'shop_id'
);
SET @sql_add_roles_shop_id := IF(
  @has_roles_shop_id = 0,
  'ALTER TABLE `roles` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `id`',
  'SELECT 1'
);
PREPARE stmt_add_roles_shop_id FROM @sql_add_roles_shop_id;
EXECUTE stmt_add_roles_shop_id;
DEALLOCATE PREPARE stmt_add_roles_shop_id;

-- Move existing non-system roles into shop 1 (Sheki) by default (legacy DB had global roles)
UPDATE `roles`
SET `shop_id` = 1
WHERE COALESCE(`is_system`, 0) = 0
  AND (COALESCE(`shop_id`, 0) = 0 OR `shop_id` IS NULL);

-- Ensure system roles stay global
UPDATE `roles`
SET `shop_id` = 0
WHERE COALESCE(`is_system`, 0) = 1
   OR `code` IN ('admin', 'sales');

-- Drop legacy UNIQUE(code) (index name may vary), then add UNIQUE(shop_id, code)
SET @has_uk_shop_code := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS s
  WHERE s.TABLE_SCHEMA = DATABASE()
    AND s.TABLE_NAME = 'roles'
    AND s.INDEX_NAME = 'uk_roles_shop_code'
);

-- Drop old unique index only if new one doesn't exist yet
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

-- Add new unique if missing
SET @sql_add_uk_shop_code := IF(
  @has_uk_shop_code = 0,
  'ALTER TABLE `roles` ADD UNIQUE KEY `uk_roles_shop_code` (`shop_id`, `code`), ADD KEY `idx_roles_shop` (`shop_id`)',
  'SELECT 1'
);
PREPARE stmt_add_uk_shop_code FROM @sql_add_uk_shop_code;
EXECUTE stmt_add_uk_shop_code;
DEALLOCATE PREPARE stmt_add_uk_shop_code;

-- =========================================================
-- B) Optional backfill: move roles back to correct shop by usage
-- =========================================================

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
-- C) role_module_scopes (own/shop) + seed defaults
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

SET FOREIGN_KEY_CHECKS = 1;

