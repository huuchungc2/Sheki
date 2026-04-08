-- Bảng vai trò động + users.role_id (thay ENUM role)
USE `erp`;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(64) NOT NULL UNIQUE COMMENT 'Slug: admin, sales, ke_toan...',
  `name` VARCHAR(100) NOT NULL COMMENT 'Tên hiển thị',
  `description` VARCHAR(255) NULL,
  `can_access_admin` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = menu & API quản trị',
  `scope_own_data` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = chỉ đơn/KH của mình (như sales)',
  `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Không xóa',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_roles_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `roles` (`code`, `name`, `description`, `can_access_admin`, `scope_own_data`, `is_system`) VALUES
('admin', 'Quản trị viên', 'Toàn quyền hệ thống', 1, 0, 1),
('sales', 'Nhân viên kinh doanh', 'Đơn hàng & KH theo nhân viên', 0, 1, 1);

ALTER TABLE `role_permissions` MODIFY `role` VARCHAR(64) NOT NULL;

ALTER TABLE `users` ADD COLUMN `role_id` INT UNSIGNED NULL AFTER `username`;

UPDATE `users` u
JOIN `roles` r ON r.code = u.`role`
SET u.`role_id` = r.`id`
WHERE u.`role_id` IS NULL;

ALTER TABLE `users` MODIFY `role_id` INT UNSIGNED NOT NULL;
ALTER TABLE `users` ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`);
ALTER TABLE `users` DROP COLUMN `role`;
ALTER TABLE `users` DROP INDEX `idx_users_role`;
CREATE INDEX `idx_users_role_id` ON `users` (`role_id`);
