-- Returns + Commission Adjustments (for post-settlement returns)
-- Goal:
-- - Sales tạo "yêu cầu hoàn" (return_request)
-- - Admin duyệt và tạo "đơn hoàn" (return)
-- - Khi hoàn phát sinh sau khi đã trả hoa hồng: tạo bút toán hoa hồng âm theo ngày hoàn (commission_adjustments)

CREATE TABLE IF NOT EXISTS `return_requests` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL,
  `requested_by` INT UNSIGNED NOT NULL COMMENT 'Sales tạo yêu cầu',
  `status` ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `reason` TEXT DEFAULT NULL,
  `admin_note` TEXT DEFAULT NULL,
  `approved_by` INT UNSIGNED DEFAULT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_return_requests_order` (`order_id`),
  INDEX `idx_return_requests_requested_by` (`requested_by`),
  INDEX `idx_return_requests_status` (`status`),
  INDEX `idx_return_requests_created_at` (`created_at`),
  CONSTRAINT `fk_return_requests_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_return_requests_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_return_requests_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `return_request_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `return_request_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `qty` DECIMAL(10,3) NOT NULL DEFAULT 0,
  INDEX `idx_rri_request` (`return_request_id`),
  INDEX `idx_rri_product` (`product_id`),
  CONSTRAINT `fk_rri_request` FOREIGN KEY (`return_request_id`) REFERENCES `return_requests`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rri_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `returns` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL COMMENT 'Đơn gốc',
  `return_request_id` INT UNSIGNED DEFAULT NULL,
  `warehouse_id` INT UNSIGNED NOT NULL COMMENT 'Kho nhập hoàn (mặc định = kho của đơn gốc)',
  `created_by` INT UNSIGNED NOT NULL COMMENT 'Admin tạo đơn hoàn',
  `note` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_returns_order` (`order_id`),
  INDEX `idx_returns_request` (`return_request_id`),
  INDEX `idx_returns_created_at` (`created_at`),
  CONSTRAINT `fk_returns_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_returns_request` FOREIGN KEY (`return_request_id`) REFERENCES `return_requests`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_returns_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_returns_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `return_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `return_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `qty` DECIMAL(10,3) NOT NULL DEFAULT 0,
  INDEX `idx_return_items_return` (`return_id`),
  INDEX `idx_return_items_product` (`product_id`),
  CONSTRAINT `fk_return_items_return` FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_return_items_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `commission_adjustments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL COMMENT 'Đơn gốc liên quan',
  `return_id` INT UNSIGNED DEFAULT NULL COMMENT 'Đơn hoàn tạo adjustment này',
  `user_id` INT UNSIGNED NOT NULL COMMENT 'Người bị điều chỉnh hoa hồng',
  `type` ENUM('direct','override') NOT NULL DEFAULT 'direct',
  `ctv_user_id` INT UNSIGNED DEFAULT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Có thể âm (trừ hoa hồng)',
  `reason` VARCHAR(255) DEFAULT NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ca_order` (`order_id`),
  INDEX `idx_ca_return` (`return_id`),
  INDEX `idx_ca_user` (`user_id`),
  INDEX `idx_ca_type` (`type`),
  INDEX `idx_ca_created_at` (`created_at`),
  CONSTRAINT `fk_ca_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ca_return` FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ca_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ca_ctv` FOREIGN KEY (`ctv_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ca_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

