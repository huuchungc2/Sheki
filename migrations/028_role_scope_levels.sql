-- 028_role_scope_levels.sql
-- Data-scope levels per target (own/group/shop) per shop + role.
--
-- Table:
-- - role_scopes(shop_id, role_id, target, scope)
--
-- Targets (initial):
-- - orders, customers, reports
--
-- Notes:
-- - This coexists with legacy role_module_scopes (own/shop) for backward compatibility.
-- - Safe to run multiple times due to IF NOT EXISTS + unique key.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;

