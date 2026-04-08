-- Update default password for all Sales users to "abc123"
-- NOTE: This updates ALL users with roles.code='sales'
USE `erp`;

UPDATE users u
JOIN roles r ON u.role_id = r.id
SET u.password_hash = '$2a$10$qTMEmtj46j0yexPvtoyo3elQvIWkSft96w0DJphILaGewZfSkfYea'
WHERE r.code = 'sales';

