-- 027_rbac_feature_permissions.sql
-- Detailed RBAC (Nhanh.vn-style): feature-key permissions per shop + role.
--
-- Table:
-- - role_feature_permissions(shop_id, role_id, feature_key, allowed)
--
-- Notes:
-- - This is separate from legacy role_permissions(module/action).
-- - Safe to run multiple times due to IF NOT EXISTS + unique key.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;

