-- Đồng bộ quyền chi tiết: ai được orders.counter thì mặc định được sửa/xóa đơn quầy (có thể tắt riêng trong Cài đặt → Phân quyền nhóm).
SET NAMES utf8mb4;

INSERT INTO role_feature_permissions (shop_id, role_id, feature_key, allowed)
SELECT shop_id, role_id, 'orders.counter_edit', allowed
FROM role_feature_permissions
WHERE feature_key = 'orders.counter'
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);

INSERT INTO role_feature_permissions (shop_id, role_id, feature_key, allowed)
SELECT shop_id, role_id, 'orders.counter_delete', allowed
FROM role_feature_permissions
WHERE feature_key = 'orders.counter'
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);
