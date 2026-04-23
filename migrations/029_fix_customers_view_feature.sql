-- 029_fix_customers_view_feature.sql
-- Fix default feature seed gap: ensure roles that can list customers can also view customer detail.
--
-- Context:
-- - API GET /customers/:id is gated by requireFeature('customers.view')
-- - Some shops seeded role_feature_permissions without customers.view => Sales can't open customer detail.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- If the table doesn't exist yet, this migration is a no-op in practice (will error).
-- Run after 027_rbac_feature_permissions.sql.

INSERT INTO role_feature_permissions (shop_id, role_id, feature_key, allowed)
SELECT
  rfp.shop_id,
  rfp.role_id,
  'customers.view' AS feature_key,
  1 AS allowed
FROM role_feature_permissions rfp
WHERE rfp.feature_key = 'customers.list'
  AND COALESCE(rfp.allowed, 0) = 1
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);

SET FOREIGN_KEY_CHECKS = 1;

