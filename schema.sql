-- ============================================
-- ERP SYSTEM - DATABASE SCHEMA
-- Engine: InnoDB | Charset: utf8mb4
-- ============================================

CREATE DATABASE IF NOT EXISTS `erp` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `erp`;

-- ============================================
-- 1. USERS (Nhân viên)
-- ============================================
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `role` ENUM('admin', 'sales') NOT NULL DEFAULT 'sales',
  `department` VARCHAR(50) DEFAULT NULL,
  `position` VARCHAR(100) DEFAULT NULL,
  `commission_rate` DECIMAL(5,2) DEFAULT 5.00 COMMENT '% hoa hồng',
  `salary` DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Lương cơ bản',
  `join_date` DATE DEFAULT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `city` VARCHAR(50) DEFAULT NULL,
  `district` VARCHAR(50) DEFAULT NULL,
  `postal_code` VARCHAR(10) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. CATEGORIES (Danh mục sản phẩm)
-- ============================================
CREATE TABLE `categories` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `parent_id` INT UNSIGNED DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_categories_parent` (`parent_id`),
  INDEX `idx_categories_is_active` (`is_active`),
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. WAREHOUSES (Kho)
-- ============================================
CREATE TABLE `warehouses` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `address` TEXT DEFAULT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Kho mặc định/kho tổng hệ thống',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_warehouses_is_active` (`is_active`),
  INDEX `idx_warehouses_is_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. CUSTOMERS (Khách hàng)
-- ============================================
CREATE TABLE `customers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `address` TEXT DEFAULT NULL COMMENT 'Số nhà, tên đường',
  `city` VARCHAR(50) DEFAULT NULL,
  `district` VARCHAR(50) DEFAULT NULL,
  `ward` VARCHAR(50) DEFAULT NULL,
  `birthday` DATE DEFAULT NULL,
  `tier` ENUM('new', 'silver', 'gold', 'platinum', 'diamond') NOT NULL DEFAULT 'new',
  `total_spent` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `points_balance` INT NOT NULL DEFAULT 0 COMMENT 'Điểm tích lũy',
  `source` VARCHAR(50) DEFAULT NULL COMMENT 'store/facebook/website/referral',
  `assigned_employee_id` INT UNSIGNED DEFAULT NULL COMMENT 'Nhân viên phụ trách',
  `note` TEXT DEFAULT NULL COMMENT 'Ghi chú đặc biệt',
  `created_by` INT UNSIGNED NOT NULL COMMENT 'Người tạo',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_customers_phone` (`phone`),
  INDEX `idx_customers_email` (`email`),
  INDEX `idx_customers_tier` (`tier`),
  INDEX `idx_customers_created_by` (`created_by`),
  INDEX `idx_customers_assigned` (`assigned_employee_id`),
  CONSTRAINT `fk_customers_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_customers_assigned` FOREIGN KEY (`assigned_employee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. PRODUCTS (Sản phẩm)
-- ============================================
CREATE TABLE `products` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `sku` VARCHAR(50) NOT NULL UNIQUE,
  `category_id` INT UNSIGNED DEFAULT NULL,
  `unit` VARCHAR(20) NOT NULL DEFAULT 'Cái',
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Giá bán lẻ',
  `cost_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Giá vốn',
  `stock_qty` DECIMAL(10,3) NOT NULL DEFAULT 0 COMMENT 'Tổng tồn kho',
  `available_stock` DECIMAL(10,3) NOT NULL DEFAULT 0 COMMENT 'Có thể bán',
  `reserved_stock` DECIMAL(10,3) NOT NULL DEFAULT 0 COMMENT 'Tạm giữ',
  `low_stock_threshold` DECIMAL(10,3) NOT NULL DEFAULT 10 COMMENT 'Cảnh báo hết hàng',
  `weight` DECIMAL(8,2) DEFAULT NULL COMMENT 'gram',
  `length` DECIMAL(8,2) DEFAULT NULL COMMENT 'cm',
  `width` DECIMAL(8,2) DEFAULT NULL COMMENT 'cm',
  `height` DECIMAL(8,2) DEFAULT NULL COMMENT 'cm',
  `description` TEXT DEFAULT NULL,
  `images` JSON DEFAULT NULL COMMENT 'Array of image URLs',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_products_sku` (`sku`),
  INDEX `idx_products_category` (`category_id`),
  INDEX `idx_products_is_active` (`is_active`),
  INDEX `idx_products_stock` (`stock_qty`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. ORDERS (Đơn hàng)
-- ============================================
CREATE TABLE `orders` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(30) NOT NULL UNIQUE COMMENT 'DH-YYYYMMDD-XXXX',
  `customer_id` INT UNSIGNED NOT NULL,
  `salesperson_id` INT UNSIGNED NOT NULL COMMENT 'Nhân viên tạo đơn',
  `warehouse_id` INT UNSIGNED NOT NULL,
  `group_id` INT UNSIGNED DEFAULT NULL COMMENT 'Nhóm nhân viên khi lên đơn',
  `status` ENUM('draft', 'confirmed', 'shipping', 'done', 'cancelled') NOT NULL DEFAULT 'draft',
  `shipping_address` TEXT DEFAULT NULL,
  `carrier_service` VARCHAR(100) DEFAULT NULL,
  `shipping_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(50) DEFAULT 'cash',
  `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Giảm giá đơn',
  `tax_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `note` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_orders_code` (`code`),
  INDEX `idx_orders_customer` (`customer_id`),
  INDEX `idx_orders_salesperson` (`salesperson_id`),
  INDEX `idx_orders_warehouse` (`warehouse_id`),
  INDEX `idx_orders_group` (`group_id`),
  INDEX `idx_orders_status` (`status`),
  INDEX `idx_orders_created_at` (`created_at`),
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_orders_salesperson` FOREIGN KEY (`salesperson_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_orders_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_orders_group` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. ORDER_ITEMS (Chi tiết đơn hàng)
-- ============================================
CREATE TABLE `order_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `qty` DECIMAL(10,3) NOT NULL DEFAULT 1 COMMENT 'Số lượng (hỗ trợ số lẻ)',
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Giá tại thời điểm bán',
  `discount_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '% giảm giá item',
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Tiền giảm item',
  `commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '% hoa hồng item',
  `commission_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Tiền hoa hồng item',
  `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'qty * unit_price - discount_amount',
  INDEX `idx_order_items_order` (`order_id`),
  INDEX `idx_order_items_product` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. WAREHOUSE_STOCK (Tồn kho theo kho)
-- ============================================
CREATE TABLE `warehouse_stock` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `warehouse_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `stock_qty` DECIMAL(10,3) NOT NULL DEFAULT 0 COMMENT 'Tồn vật lý tại kho',
  `available_stock` DECIMAL(10,3) NOT NULL DEFAULT 0 COMMENT 'Có thể bán tại kho',
  `reserved_stock` DECIMAL(10,3) NOT NULL DEFAULT 0 COMMENT 'Tạm giữ tại kho',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_warehouse_stock` (`warehouse_id`, `product_id`),
  INDEX `idx_warehouse_stock_warehouse` (`warehouse_id`),
  INDEX `idx_warehouse_stock_product` (`product_id`),
  CONSTRAINT `fk_warehouse_stock_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_warehouse_stock_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. STOCK_MOVEMENTS (Xuất nhập tồn)
-- ============================================
CREATE TABLE `stock_movements` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `warehouse_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `type` ENUM('import', 'export', 'adjust') NOT NULL COMMENT 'import=nhập, export=xuất, adjust=điều chỉnh',
  `qty` DECIMAL(10,3) NOT NULL COMMENT '+ nhập, - xuất',
  `reason` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('draft', 'completed') NOT NULL DEFAULT 'draft',
  `total_value` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_stock_movements_warehouse` (`warehouse_id`),
  INDEX `idx_stock_movements_product` (`product_id`),
  INDEX `idx_stock_movements_type` (`type`),
  INDEX `idx_stock_movements_status` (`status`),
  INDEX `idx_stock_movements_created_by` (`created_by`),
  INDEX `idx_stock_movements_created_at` (`created_at`),
  CONSTRAINT `fk_stock_movements_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_stock_movements_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_stock_movements_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. COMMISSIONS (Hoa hồng)
-- ============================================
CREATE TABLE `commissions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL COMMENT 'Sales nhận hoa hồng',
  `commission_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_commissions_order` (`order_id`),
  INDEX `idx_commissions_user` (`user_id`),
  INDEX `idx_commissions_created_at` (`created_at`),
  CONSTRAINT `fk_commissions_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_commissions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 11. LOYALTY_POINTS (Điểm tích lũy)
-- ============================================
CREATE TABLE `loyalty_points` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT UNSIGNED NOT NULL,
  `order_id` INT UNSIGNED DEFAULT NULL,
  `points` INT NOT NULL COMMENT '+ tích lũy, - đổi điểm',
  `type` ENUM('earn', 'redeem') NOT NULL,
  `note` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_loyalty_customer` (`customer_id`),
  INDEX `idx_loyalty_order` (`order_id`),
  INDEX `idx_loyalty_type` (`type`),
  INDEX `idx_loyalty_created_at` (`created_at`),
  CONSTRAINT `fk_loyalty_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_loyalty_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 12. ROLE_PERMISSIONS (Phân quyền)
-- ============================================
CREATE TABLE `role_permissions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `role` VARCHAR(20) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `action` VARCHAR(20) NOT NULL,
  `allowed` TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY `uk_role_module_action` (`role`, `module`, `action`),
  INDEX `idx_role_permissions_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 13. ACTIVITY_LOGS (Nhật ký hoạt động)
-- ============================================
CREATE TABLE `activity_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `user_name` VARCHAR(100) DEFAULT NULL,
  `module` VARCHAR(50) NOT NULL COMMENT 'employees, products, customers, orders, inventory, auth, settings',
  `action` VARCHAR(50) NOT NULL COMMENT 'create, update, delete, login, logout, import, export',
  `target_id` INT UNSIGNED DEFAULT NULL COMMENT 'ID của bản ghi bị tác động',
  `target_name` VARCHAR(200) DEFAULT NULL COMMENT 'Tên/mô tả bản ghi',
  `details` TEXT DEFAULT NULL COMMENT 'Chi tiết thay đổi (JSON)',
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `status` ENUM('success', 'error') NOT NULL DEFAULT 'success',
  `error_message` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_logs_user` (`user_id`),
  INDEX `idx_logs_module` (`module`),
  INDEX `idx_logs_action` (`action`),
  INDEX `idx_logs_status` (`status`),
  INDEX `idx_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 14. GROUPS (Nhóm nhân viên)
-- ============================================
CREATE TABLE `groups` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_groups_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 15. USER_GROUPS (Nhóm nhân viên - Many to Many)
-- ============================================
CREATE TABLE `user_groups` (
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

-- Default permissions for admin (all allowed)
INSERT INTO `role_permissions` (`role`, `module`, `action`, `allowed`) VALUES
('admin', 'dashboard', 'view', 1), ('admin', 'dashboard', 'create', 1), ('admin', 'dashboard', 'edit', 1), ('admin', 'dashboard', 'delete', 1),
('admin', 'employees', 'view', 1), ('admin', 'employees', 'create', 1), ('admin', 'employees', 'edit', 1), ('admin', 'employees', 'delete', 1),
('admin', 'products', 'view', 1), ('admin', 'products', 'create', 1), ('admin', 'products', 'edit', 1), ('admin', 'products', 'delete', 1),
('admin', 'customers', 'view', 1), ('admin', 'customers', 'create', 1), ('admin', 'customers', 'edit', 1), ('admin', 'customers', 'delete', 1),
('admin', 'orders', 'view', 1), ('admin', 'orders', 'create', 1), ('admin', 'orders', 'edit', 1), ('admin', 'orders', 'delete', 1),
('admin', 'inventory', 'view', 1), ('admin', 'inventory', 'create', 1), ('admin', 'inventory', 'edit', 1), ('admin', 'inventory', 'delete', 1),
('admin', 'reports', 'view', 1), ('admin', 'reports', 'create', 1), ('admin', 'reports', 'edit', 1), ('admin', 'reports', 'delete', 1),
('admin', 'settings', 'view', 1), ('admin', 'settings', 'create', 1), ('admin', 'settings', 'edit', 1), ('admin', 'settings', 'delete', 1);

-- Default permissions for sales (limited)
INSERT INTO `role_permissions` (`role`, `module`, `action`, `allowed`) VALUES
('sales', 'dashboard', 'view', 1), ('sales', 'dashboard', 'create', 0), ('sales', 'dashboard', 'edit', 0), ('sales', 'dashboard', 'delete', 0),
('sales', 'employees', 'view', 0), ('sales', 'employees', 'create', 0), ('sales', 'employees', 'edit', 0), ('sales', 'employees', 'delete', 0),
('sales', 'products', 'view', 1), ('sales', 'products', 'create', 0), ('sales', 'products', 'edit', 0), ('sales', 'products', 'delete', 0),
('sales', 'customers', 'view', 1), ('sales', 'customers', 'create', 1), ('sales', 'customers', 'edit', 1), ('sales', 'customers', 'delete', 0),
('sales', 'orders', 'view', 1), ('sales', 'orders', 'create', 1), ('sales', 'orders', 'edit', 1), ('sales', 'orders', 'delete', 0),
('sales', 'inventory', 'view', 0), ('sales', 'inventory', 'create', 0), ('sales', 'inventory', 'edit', 0), ('sales', 'inventory', 'delete', 0),
('sales', 'reports', 'view', 1), ('sales', 'reports', 'create', 0), ('sales', 'reports', 'edit', 0), ('sales', 'reports', 'delete', 0),
('sales', 'settings', 'view', 0), ('sales', 'settings', 'create', 0), ('sales', 'settings', 'edit', 0), ('sales', 'settings', 'delete', 0);

-- ============================================
-- SEED DATA
-- ============================================

-- Default admin user (password: admin123)
INSERT INTO `users` (`full_name`, `email`, `password_hash`, `role`, `commission_rate`, `is_active`) VALUES
('Admin Velocity', 'admin@velocity.vn', '$2a$10$Zhz.v5UVYxRL/paZZa7VC.2Se3NpDgUcaOCUFd1QkNBx4gkohcuRu', 'admin', 0.00, 1);

-- Sales employees (password: sales123)
INSERT INTO `users` (`full_name`, `email`, `password_hash`, `phone`, `role`, `commission_rate`, `is_active`) VALUES
('Nguyễn Thị Lan', 'lan.sales@velocity.vn', '$2a$10$B2V8iKNaD94Dizq95/eEvufoc0220B93okzsqMVCW536cp2/aAxbG', '0912345678', 'sales', 5.00, 1),
('Trần Văn Minh', 'minh.sales@velocity.vn', '$2a$10$B2V8iKNaD94Dizq95/eEvufoc0220B93okzsqMVCW536cp2/aAxbG', '0987654321', 'sales', 5.00, 1);

-- Default warehouses
INSERT INTO `warehouses` (`name`, `address`, `is_active`) VALUES
('Kho trung tâm', '123 Đường Láng, Đống Đa, Hà Nội', 1),
('Kho chi nhánh 1', '456 Nguyễn Trãi, Thanh Xuân, Hà Nội', 1),
('Kho chi nhánh 2', '789 Cầu Giấy, Cầu Giấy, Hà Nội', 1);

-- Default categories
INSERT INTO `categories` (`name`, `is_active`) VALUES
('Áo nam', 1),
('Quần nam', 1),
('Giày dép', 1),
('Phụ kiện', 1);
