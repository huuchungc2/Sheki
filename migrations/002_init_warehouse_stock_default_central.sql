-- Init warehouse_stock for all existing products into default warehouse
-- This is a one-time local migration to align data with per-warehouse stock model.

START TRANSACTION;

-- Resolve default warehouse: is_default=1, fallback "Kho trung tâm", fallback first active warehouse
SET @default_warehouse_id := (
  SELECT id FROM warehouses
  WHERE is_active = 1
  ORDER BY is_default DESC, (name = 'Kho trung tâm') DESC, id ASC
  LIMIT 1
);

-- Create per-warehouse stock rows (do not overwrite if already exists)
INSERT IGNORE INTO warehouse_stock (warehouse_id, product_id, stock_qty, available_stock, reserved_stock)
SELECT
  @default_warehouse_id,
  p.id,
  COALESCE(p.stock_qty, 0),
  COALESCE(p.available_stock, 0),
  COALESCE(p.reserved_stock, 0)
FROM products p
WHERE p.is_active = 1;

COMMIT;

