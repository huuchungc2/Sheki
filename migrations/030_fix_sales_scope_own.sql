-- 030_fix_sales_scope_own.sql
-- Ensure Sales role is own-scope by default (orders/customers/reports).
-- This prevents Sales from seeing whole-shop data when scopes were seeded/edited incorrectly.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) Sales role should have legacy flag scope_own_data=1 (system role shop_id=0 or legacy DB).
UPDATE roles
SET scope_own_data = 1
WHERE LOWER(TRIM(code)) = 'sales';

-- 2) role_module_scopes fallback table: force own for Sales on scope-capable modules.
-- Safe even if table doesn't exist? (Will error if missing; run after 025/026 if you use it.)
UPDATE role_module_scopes rms
JOIN roles r ON r.id = rms.role_id
SET rms.scope = 'own'
WHERE LOWER(TRIM(r.code)) = 'sales'
  AND rms.module IN ('orders', 'customers', 'reports');

-- 3) role_scopes primary table (own/group/shop): force own for Sales on targets.
-- Safe even if table doesn't exist? (Will error if missing; run after 028 if you use it.)
UPDATE role_scopes rs
JOIN roles r ON r.id = rs.role_id
SET rs.scope = 'own'
WHERE LOWER(TRIM(r.code)) = 'sales'
  AND rs.target IN ('orders', 'customers', 'reports');

SET FOREIGN_KEY_CHECKS = 1;

