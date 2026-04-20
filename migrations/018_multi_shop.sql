-- Multi-shop (tenant): shops, user_shops, shop_id trên bảng nghiệp vụ
-- Sau khi chạy: toàn bộ dữ liệu cũ gán shop_id = 1 (Sheki)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) Bảng shops
CREATE TABLE IF NOT EXISTS `shops` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(32) NOT NULL COMMENT 'Mã shop (slug)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shops_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `shops` (`id`, `name`, `code`, `is_active`) VALUES (1, 'Sheki', 'sheki', 1)
  ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2) user — shop — role trong shop
CREATE TABLE IF NOT EXISTS `user_shops` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `shop_id` INT UNSIGNED NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_shop` (`user_id`, `shop_id`),
  KEY `idx_user_shops_shop` (`shop_id`),
  KEY `idx_user_shops_user` (`user_id`),
  CONSTRAINT `fk_user_shops_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_shops_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_shops_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `user_shops` (`user_id`, `shop_id`, `role_id`)
SELECT `id`, 1, `role_id` FROM `users`
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- 3) Thêm shop_id (DEFAULT 1) — thứ tự: bảng không phụ thuộc bảng khác (ngoài users/shops)

ALTER TABLE `categories` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `categories` ADD KEY `idx_categories_shop` (`shop_id`);
ALTER TABLE `categories` ADD CONSTRAINT `fk_categories_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

ALTER TABLE `warehouses` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `warehouses` ADD KEY `idx_warehouses_shop` (`shop_id`);
ALTER TABLE `warehouses` ADD CONSTRAINT `fk_warehouses_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

ALTER TABLE `groups` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `groups` ADD KEY `idx_groups_shop` (`shop_id`);
ALTER TABLE `groups` ADD CONSTRAINT `fk_groups_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

ALTER TABLE `commission_tiers` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `commission_tiers` ADD KEY `idx_commission_tiers_shop` (`shop_id`);
ALTER TABLE `commission_tiers` ADD CONSTRAINT `fk_commission_tiers_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

ALTER TABLE `products` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `products` ADD KEY `idx_products_shop` (`shop_id`);
ALTER TABLE `products` ADD CONSTRAINT `fk_products_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

ALTER TABLE `customers` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `customers` ADD KEY `idx_customers_shop` (`shop_id`);
ALTER TABLE `customers` ADD CONSTRAINT `fk_customers_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

-- collaborators: unique theo shop
ALTER TABLE `collaborators` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `collaborators` DROP INDEX `uk_sales_ctv`;
ALTER TABLE `collaborators` ADD UNIQUE KEY `uk_collab_shop_sales_ctv` (`shop_id`, `sales_id`, `ctv_id`);
ALTER TABLE `collaborators` ADD KEY `idx_collaborators_shop` (`shop_id`);
ALTER TABLE `collaborators` ADD CONSTRAINT `fk_collaborators_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE;

-- products: SKU unique trong shop
ALTER TABLE `products` DROP INDEX `sku`;
ALTER TABLE `products` ADD UNIQUE KEY `uk_products_shop_sku` (`shop_id`, `sku`);

-- orders: mã đơn unique trong shop
ALTER TABLE `orders` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `orders` ADD KEY `idx_orders_shop` (`shop_id`);
ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;
ALTER TABLE `orders` DROP INDEX `code`;
ALTER TABLE `orders` ADD UNIQUE KEY `uk_orders_shop_code` (`shop_id`, `code`);

ALTER TABLE `warehouse_stock` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `warehouse_stock` ADD KEY `idx_warehouse_stock_shop` (`shop_id`);
ALTER TABLE `warehouse_stock` ADD CONSTRAINT `fk_warehouse_stock_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

ALTER TABLE `stock_movements` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `stock_movements` ADD KEY `idx_stock_movements_shop` (`shop_id`);
ALTER TABLE `stock_movements` ADD CONSTRAINT `fk_stock_movements_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

ALTER TABLE `commissions` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `commissions` ADD KEY `idx_commissions_shop` (`shop_id`);
ALTER TABLE `commissions` ADD CONSTRAINT `fk_commissions_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

ALTER TABLE `loyalty_points` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `loyalty_points` ADD KEY `idx_loyalty_shop` (`shop_id`);
ALTER TABLE `loyalty_points` ADD CONSTRAINT `fk_loyalty_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

ALTER TABLE `activity_logs` ADD COLUMN `shop_id` INT UNSIGNED NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `activity_logs` ADD KEY `idx_logs_shop` (`shop_id`);
ALTER TABLE `activity_logs` ADD CONSTRAINT `fk_logs_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE SET NULL;

ALTER TABLE `return_requests` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `return_requests` ADD KEY `idx_return_requests_shop` (`shop_id`);
ALTER TABLE `return_requests` ADD CONSTRAINT `fk_return_requests_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

ALTER TABLE `returns` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `returns` ADD KEY `idx_returns_shop` (`shop_id`);
ALTER TABLE `returns` ADD CONSTRAINT `fk_returns_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

ALTER TABLE `commission_adjustments` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `commission_adjustments` ADD KEY `idx_ca_shop` (`shop_id`);
ALTER TABLE `commission_adjustments` ADD CONSTRAINT `fk_ca_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

ALTER TABLE `cash_transactions` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `cash_transactions` ADD KEY `idx_cash_tx_shop` (`shop_id`);
ALTER TABLE `cash_transactions` ADD CONSTRAINT `fk_cash_tx_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE RESTRICT;

-- role_permissions: phân quyền theo shop (mặc định shop 1)
ALTER TABLE `role_permissions` ADD COLUMN `shop_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `role_permissions` DROP INDEX `uk_role_module_action`;
ALTER TABLE `role_permissions` ADD UNIQUE KEY `uk_shop_role_module_action` (`shop_id`, `role`, `module`, `action`);
ALTER TABLE `role_permissions` ADD KEY `idx_role_permissions_shop` (`shop_id`);
ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permissions_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
