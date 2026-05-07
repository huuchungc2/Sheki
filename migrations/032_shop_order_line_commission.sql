-- Cấu hình form đơn: hiển thị cột HH + % mặc định khi thêm dòng (theo shop)
ALTER TABLE `shops`
  ADD COLUMN `order_line_show_commission` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=hiện cột HH trên OrderForm' AFTER `valid_until`,
  ADD COLUMN `order_default_commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 10.00 COMMENT '% HH mặc định dòng mới' AFTER `order_line_show_commission`;
