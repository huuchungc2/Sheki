-- 025_role_module_scopes.sql
-- Module-level data scope per role in a shop:
-- - scope = 'own': chỉ dữ liệu cá nhân (vd sales chỉ xem đơn/khách của mình)
-- - scope = 'shop': toàn shop
--
-- This decouples "permission to access module" (role_permissions) from "data scope" (own vs shop).

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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

-- Seed defaults for existing memberships:
-- - Admin roles => shop scope for all modules
-- - Non-admin:
--   - if roles.scope_own_data=1 => own scope for orders/customers/reports
--   - else => shop scope for orders/customers/reports
-- NOTE: this seed is safe to rerun due to ON DUPLICATE KEY.
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

