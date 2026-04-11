-- Tiền NV chịu: NV tự bỏ ra (chênh lệch thu), trừ HH sau — không đổi công thức thu khách/shop thu

ALTER TABLE `orders`
  ADD COLUMN `nv_chiu` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Tiền NV chịu' AFTER `shop_collect`;
