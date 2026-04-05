-- Migration: Add Groups & Order Group
-- Run this to add groups support without recreating tables

-- 1. Create groups table (if not exists)
CREATE TABLE IF NOT EXISTS `groups` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_groups_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create user_groups table (if not exists)
CREATE TABLE IF NOT EXISTS `user_groups` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `group_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_group` (`user_id`, `group_id`),
  INDEX `idx_user_groups_user` (`user_id`),
  INDEX `idx_user_groups_group` (`group_id`),
  CONSTRAINT `fk_user_groups_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_groups_group` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Add group_id to orders table (if not exists)
ALTER TABLE `orders` ADD COLUMN `group_id` INT UNSIGNED DEFAULT NULL COMMENT 'Nhóm nhân viên khi lên đơn' AFTER `warehouse_id`;
ALTER TABLE `orders` ADD INDEX `idx_orders_group` (`group_id`);
ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_group` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE SET NULL;

-- 4. Add district, ward, note to customers (if not exists)
ALTER TABLE `customers` ADD COLUMN `district` VARCHAR(50) DEFAULT NULL AFTER `city`;
ALTER TABLE `customers` ADD COLUMN `ward` VARCHAR(50) DEFAULT NULL AFTER `district`;
ALTER TABLE `customers` ADD COLUMN `note` TEXT DEFAULT NULL AFTER `assigned_employee_id`;

-- 5. Seed default groups
INSERT IGNORE INTO `groups` (`name`, `description`) VALUES
('TNK', 'Nhóm TNK'),
('SHEKI', 'Nhóm SHEKI'),
('KHA', 'Nhóm KHA');
