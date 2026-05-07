-- Cột CK% bật/tắt theo shop (OrderForm + Bán tại quầy)
ALTER TABLE `shops`
  ADD COLUMN `order_line_show_discount` TINYINT(1) NOT NULL DEFAULT 1
    COMMENT '1=hiện cột CK% trên form đơn & bán quầy'
    AFTER `order_default_commission_rate`;
