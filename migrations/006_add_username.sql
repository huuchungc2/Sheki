-- Tên đăng nhập (username) — đăng nhập bằng username + mật khẩu
USE `erp`;

ALTER TABLE `users` ADD COLUMN `username` VARCHAR(64) NULL UNIQUE AFTER `full_name`;

-- Gán username cho bản ghi cũ (seed chuẩn + fallback)
UPDATE `users` SET `username` = 'admin' WHERE `email` = 'admin@velocity.vn';
UPDATE `users` SET `username` = 'lan_sales' WHERE `email` = 'lan.sales@velocity.vn';
UPDATE `users` SET `username` = 'minh_sales' WHERE `email` = 'minh.sales@velocity.vn';
UPDATE `users` SET `username` = CONCAT('user_', `id`) WHERE `username` IS NULL OR `username` = '';

ALTER TABLE `users` MODIFY `username` VARCHAR(64) NOT NULL;
CREATE INDEX `idx_users_username` ON `users` (`username`);
