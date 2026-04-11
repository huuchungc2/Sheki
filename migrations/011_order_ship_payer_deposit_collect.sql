-- Phí ship: shop trả (mặc định) / khách trả; cọc; thu khách & shop thu (theo LOGIC_BUSINESS.md)

ALTER TABLE `orders`
  ADD COLUMN `ship_payer` ENUM('shop','customer') NOT NULL DEFAULT 'shop' COMMENT 'shop=shop trả ship; customer=khách trả ship' AFTER `shipping_fee`,
  ADD COLUMN `deposit` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Tiền đặt cọc' AFTER `ship_payer`,
  ADD COLUMN `customer_collect` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Thu khách' AFTER `deposit`,
  ADD COLUMN `shop_collect` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Shop thu' AFTER `customer_collect`;

-- Dữ liệu cũ: coi như khách trả ship, cọc=0; thu khách = total_amount hiện có; shop thu = tạm tính - giảm giá đơn
UPDATE `orders` SET
  `ship_payer` = 'customer',
  `deposit` = 0,
  `customer_collect` = GREATEST(0, `total_amount`),
  `shop_collect` = GREATEST(0, `subtotal` - COALESCE(`discount`, 0))
WHERE 1=1;
