-- Thu chi nội bộ (Admin): gắn nhân viên + nhóm bán hàng + loại thu/chi
CREATE TABLE IF NOT EXISTS `cash_transactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL COMMENT 'Nhân viên',
  `group_id` INT UNSIGNED DEFAULT NULL COMMENT 'Nhóm BH (NULL = không gắn)',
  `kind` ENUM('income','expense') NOT NULL COMMENT 'Thu / Chi',
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `note` TEXT DEFAULT NULL,
  `created_by` INT UNSIGNED NOT NULL COMMENT 'Admin tạo bản ghi',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cash_tx_user` (`user_id`),
  INDEX `idx_cash_tx_group` (`group_id`),
  INDEX `idx_cash_tx_kind` (`kind`),
  INDEX `idx_cash_tx_created` (`created_at`),
  CONSTRAINT `fk_cash_tx_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cash_tx_group` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cash_tx_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
