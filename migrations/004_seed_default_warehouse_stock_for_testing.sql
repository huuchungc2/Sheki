-- Seed test data: ensure products "belong" to default warehouse (kho tổng)
-- Safe mode: only applies to products that currently have NO rows in warehouse_stock.
-- It copies products.stock_qty into default warehouse, sets reserved_stock=0, available_stock=stock_qty.

START TRANSACTION;

SET @default_warehouse_id := (
  SELECT id FROM warehouses
  WHERE is_active = 1
  ORDER BY is_default DESC, (name = 'Kho trung tâm') DESC, id ASC
  LIMIT 1
);

INSERT INTO warehouse_stock (warehouse_id, product_id, stock_qty, available_stock, reserved_stock)
SELECT
  @default_warehouse_id,
  p.id,
  COALESCE(p.stock_qty, 0),
  COALESCE(p.stock_qty, 0),
  0
FROM products p
WHERE p.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM warehouse_stock ws WHERE ws.product_id = p.id
  );

COMMIT;

