-- English column name (was nv_chiu from migration 013)
ALTER TABLE `orders`
  CHANGE COLUMN `nv_chiu` `salesperson_absorbed_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00
  COMMENT 'Amount absorbed by salesperson (customer shortfall); deducted from commission later' AFTER `shop_collect`;
