-- Hạn sử dụng shop (NULL = không giới hạn)
ALTER TABLE `shops`
  ADD COLUMN `valid_until` DATE NULL DEFAULT NULL COMMENT 'Hết hạn dùng shop; NULL = không giới hạn' AFTER `is_active`;
