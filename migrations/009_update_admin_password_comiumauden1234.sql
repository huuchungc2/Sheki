-- Update Admin password to "comiumauden1234"
USE `erp`;

UPDATE users u
JOIN roles r ON u.role_id = r.id
SET u.password_hash = '$2a$10$8D60BsH2Qr1MXC8XoHhPCucLqN7sP4pbZPROr3T6wNk1WzRdc1Wpa'
WHERE r.code = 'admin';

