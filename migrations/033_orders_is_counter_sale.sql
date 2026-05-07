-- Add flag to distinguish counter-sale orders.
-- This avoids relying on shipping_address string heuristics.

ALTER TABLE `orders`
  ADD COLUMN `is_counter_sale` TINYINT(1) NOT NULL DEFAULT 0 AFTER `collaborator_user_id`,
  ADD KEY `idx_orders_counter_sale` (`is_counter_sale`);

-- Optional backfill (run manually if you are 100% sure about legacy data):
-- UPDATE `orders`
-- SET `is_counter_sale` = 1
-- WHERE `shipping_address` = 'Mua tại cửa hàng'
--   AND `status` = 'completed'
--   AND COALESCE(`shipping_fee`, 0) = 0
--   AND COALESCE(`deposit`, 0) = 0;

