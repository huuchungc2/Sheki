-- Add default warehouse flag

START TRANSACTION;

ALTER TABLE warehouses
  ADD COLUMN is_default TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Kho mặc định/kho tổng hệ thống' AFTER address,
  ADD INDEX idx_warehouses_is_default (is_default);

-- Set default = Kho trung tâm if exists, else first active warehouse
SET @default_id := (
  SELECT id FROM warehouses
  WHERE is_active = 1 AND name = 'Kho trung tâm'
  ORDER BY id ASC
  LIMIT 1
);
SET @default_id := IFNULL(@default_id, (SELECT id FROM warehouses WHERE is_active = 1 ORDER BY id ASC LIMIT 1));

UPDATE warehouses SET is_default = 0;
UPDATE warehouses SET is_default = 1 WHERE id = @default_id;

COMMIT;

