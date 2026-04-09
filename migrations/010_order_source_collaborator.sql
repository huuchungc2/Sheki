-- Đơn ghi nhận quản lý là người bán (HH direct cho quản lý), CTV là nguồn đơn
ALTER TABLE `orders`
  ADD COLUMN `source_type` ENUM('sales','collaborator') NOT NULL DEFAULT 'sales'
    COMMENT 'sales=bán trực tiếp; collaborator=quản lý là salesperson_id, CTV=collaborator_user_id' AFTER `group_id`,
  ADD COLUMN `collaborator_user_id` INT UNSIGNED DEFAULT NULL COMMENT 'CTV khi source_type=collaborator' AFTER `source_type`,
  ADD INDEX `idx_orders_collaborator` (`collaborator_user_id`),
  ADD CONSTRAINT `fk_orders_collaborator_user` FOREIGN KEY (`collaborator_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;
