-- Mặc định phí ship: khách trả (đơn mới không gửi ship_payer sẽ là customer)

ALTER TABLE `orders`
  MODIFY COLUMN `ship_payer` ENUM('shop','customer') NOT NULL DEFAULT 'customer' COMMENT 'shop=shop trả ship; customer=khách trả ship (mặc định)';
