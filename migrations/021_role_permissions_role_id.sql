-- 021_role_permissions_role_id.sql
-- Chuyển role_permissions từ role(code) -> role_id (FK roles.id), giữ lại cột role để tương thích ngược.

SET FOREIGN_KEY_CHECKS = 0;

-- 1) Add role_id
ALTER TABLE `role_permissions`
  ADD COLUMN `role_id` INT UNSIGNED NULL AFTER `shop_id`;

-- 2) Backfill role_id từ roles.code
UPDATE `role_permissions` rp
JOIN `roles` r ON r.code = rp.role
SET rp.role_id = r.id
WHERE rp.role_id IS NULL;

-- 3) Nếu vẫn còn NULL (role code lạ), fallback về sales (nếu có)
UPDATE `role_permissions` rp
JOIN `roles` r ON r.code = 'sales'
SET rp.role_id = r.id
WHERE rp.role_id IS NULL;

-- 4) Index + unique theo role_id
ALTER TABLE `role_permissions`
  DROP INDEX `uk_shop_role_module_action`;

ALTER TABLE `role_permissions`
  ADD UNIQUE KEY `uk_shop_roleId_module_action` (`shop_id`, `role_id`, `module`, `action`),
  ADD KEY `idx_role_permissions_role_id` (`role_id`);

-- 5) FK
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_role_permissions_role`
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;

