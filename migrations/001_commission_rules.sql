-- Commission Tiers: Định nghĩa mức hoa hồng CTV → hoa hồng Sale quản lý
CREATE TABLE IF NOT EXISTS `commission_tiers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ctv_rate_min` DECIMAL(5,2) NOT NULL COMMENT 'Hoa hồng CTV >= mức này',
  `ctv_rate_max` DECIMAL(5,2) DEFAULT NULL COMMENT 'Hoa hồng CTV <= mức này (NULL = không giới hạn)',
  `sales_override_rate` DECIMAL(5,2) NOT NULL COMMENT '% hoa hồng Sale quản lý hưởng',
  `note` VARCHAR(200) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tiers_rate` (`ctv_rate_min`, `ctv_rate_max`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Collaborators: Gán CTV (user sales) cho Sale quản lý
CREATE TABLE IF NOT EXISTS `collaborators` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `sales_id` INT UNSIGNED NOT NULL COMMENT 'Sale quản lý',
  `ctv_id` INT UNSIGNED NOT NULL COMMENT 'Cộng tác viên (cũng là user sales)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_sales_ctv` (`sales_id`, `ctv_id`),
  INDEX `idx_collab_ctv` (`ctv_id`),
  CONSTRAINT `fk_collab_sales` FOREIGN KEY (`sales_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_collab_ctv` FOREIGN KEY (`ctv_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm cột commission_override vào bảng commissions
ALTER TABLE `commissions` 
  ADD COLUMN `type` ENUM('direct', 'override') NOT NULL DEFAULT 'direct' COMMENT 'direct=hoa hồng trực tiếp, override=hoa hồng quản lý CTV',
  ADD COLUMN `ctv_user_id` INT UNSIGNED DEFAULT NULL COMMENT 'ID CTV tạo ra hoa hồng override (chỉ có khi type=override)',
  ADD INDEX `idx_commissions_type` (`type`),
  ADD INDEX `idx_commissions_ctv` (`ctv_user_id`),
  ADD CONSTRAINT `fk_commissions_ctv` FOREIGN KEY (`ctv_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Seed data mẫu: commission tiers
INSERT INTO `commission_tiers` (`ctv_rate_min`, `ctv_rate_max`, `sales_override_rate`, `note`) VALUES
(10.00, NULL, 3.00, 'CTV từ 10% trở lên → Sale hưởng 3%'),
(7.00, 9.99, 2.00, 'CTV từ 7% đến 9.99% → Sale hưởng 2%'),
(4.00, 6.99, 1.00, 'CTV từ 4% đến 6.99% → Sale hưởng 1%');
