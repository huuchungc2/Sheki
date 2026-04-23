-- 023_backfill_roles_shop_id_from_user_shops.sql
-- Backfill roles.shop_id (custom roles) based on actual usage in user_shops.
--
-- Context:
-- - 022_roles_shop_id.sql migrated all non-system roles to shop_id=1 (Sheki) by default.
-- - If you had multiple shops before this migration, roles created for other shops may have been "pulled" into Sheki.
--
-- Strategy:
-- - For each non-system role currently shop_id=1, if it is used by memberships in user_shops,
--   move it to the shop where it is used the most.
-- - If a role is used in multiple shops with the SAME max count, we keep it at shop_id=1 (ambiguous) for manual review.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) Build usage counts
DROP TEMPORARY TABLE IF EXISTS tmp_role_shop_usage;
CREATE TEMPORARY TABLE tmp_role_shop_usage AS
SELECT
  us.role_id,
  us.shop_id,
  COUNT(*) AS c
FROM user_shops us
GROUP BY us.role_id, us.shop_id;

-- 2) Max usage per role
DROP TEMPORARY TABLE IF EXISTS tmp_role_shop_max;
CREATE TEMPORARY TABLE tmp_role_shop_max AS
SELECT role_id, MAX(c) AS max_c
FROM tmp_role_shop_usage
GROUP BY role_id;

-- 3) Candidate (role_id -> shop_id) where usage is uniquely the max
DROP TEMPORARY TABLE IF EXISTS tmp_role_shop_pick;
CREATE TEMPORARY TABLE tmp_role_shop_pick AS
SELECT u.role_id, u.shop_id
FROM tmp_role_shop_usage u
JOIN tmp_role_shop_max m ON m.role_id = u.role_id AND m.max_c = u.c
GROUP BY u.role_id, u.shop_id
HAVING COUNT(*) = 1;

-- 4) Apply update for roles that were defaulted to Sheki (shop_id=1)
--    and are not system roles.
UPDATE roles r
JOIN tmp_role_shop_pick p ON p.role_id = r.id
SET r.shop_id = p.shop_id
WHERE COALESCE(r.is_system, 0) = 0
  AND r.shop_id = 1
  AND r.code NOT IN ('admin', 'sales');

SET FOREIGN_KEY_CHECKS = 1;

