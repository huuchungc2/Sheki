-- ============================================
-- TÙY CHỌN — chạy khi nghi ngờ bảng customers lệch schema
-- Cách: mysql -u root erp < migrations/017_customers_verify_optional.sql
-- Hoặc copy từng khối vào MySQL Workbench / HeidiSQL
-- ============================================

-- 1) Xem cấu trúc hiện tại (so sánh với schema.sql bảng customers)
SHOW COLUMNS FROM customers;

-- 2) Kiểm tra khóa ngoại (created_by, assigned_employee_id → users)
SELECT
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'customers'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- 3) Không bắt buộc: chỉ cập nhật COMMENT cột source (thêm gợi ý zalo) — an toàn nếu cột đã tồn tại
-- ALTER TABLE customers
--   MODIFY COLUMN source VARCHAR(50) DEFAULT NULL
--   COMMENT 'zalo/store/facebook/website/referral';

-- Nếu lỗi "Unknown column 'source'" hoặc thiếu city/district/ward:
-- → DB quá cũ: cần ALTER TABLE bổ sung cột theo đúng schema.sql (mục CREATE TABLE customers),
--    hoặc backup dữ liệu rồi import lại schema.sql phù hợp phiên bản dự án.
