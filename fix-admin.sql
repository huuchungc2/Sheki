-- Update admin password
UPDATE users 
SET password_hash = '$2a$10$9m6B9Jw2qg.5dxWpz1EmKulTLCvGgLNvxamHHAo1oG6p9OALpwXQq' 
WHERE email = 'admin@velocity.vn';

-- Verify update
SELECT id, email, role, is_active FROM users;
