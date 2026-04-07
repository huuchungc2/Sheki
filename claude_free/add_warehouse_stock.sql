-- Migration: Thêm bảng warehouse_stock để quản lý tồn kho theo từng kho
-- Chạy file này trong MySQL: mysql -u root erp < add_warehouse_stock.sql

USE erp;

-- Tạo bảng warehouse_stock
CREATE TABLE IF NOT EXISTS `warehouse_stock` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `warehouse_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `stock_qty` DECIMAL(10,3) NOT NULL DEFAULT 0 COMMENT 'Tồn kho thực tế kho này',
  `available_stock` DECIMAL(10,3) NOT NULL DEFAULT 0 COMMENT 'Có thể bán từ kho này',
  `reserved_stock` DECIMAL(10,3) NOT NULL DEFAULT 0 COMMENT 'Đang giữ cho đơn pending/shipping',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_warehouse_product` (`warehouse_id`, `product_id`),
  INDEX `idx_ws_warehouse` (`warehouse_id`),
  INDEX `idx_ws_product` (`product_id`),
  CONSTRAINT `fk_ws_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ws_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed dữ liệu ban đầu: copy tồn kho hiện tại vào kho trung tâm (id=1)
INSERT IGNORE INTO `warehouse_stock` (`warehouse_id`, `product_id`, `stock_qty`, `available_stock`, `reserved_stock`)
SELECT 1, id, stock_qty, available_stock, reserved_stock
FROM `products`
WHERE is_active = 1;

SELECT 'Migration warehouse_stock hoàn thành!' as result;
