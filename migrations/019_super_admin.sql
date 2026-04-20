-- Super admin (global) + seed user
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE `users`
  ADD COLUMN `is_super_admin` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`;

-- Seed 1 super admin user
-- NOTE: copy password_hash from existing admin user to avoid mismatch across environments.
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

SET FOREIGN_KEY_CHECKS = 1;

