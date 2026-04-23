// Central mapping of API routes to feature keys.
// This is documentation + a convenient checklist for enforcing requireFeature() consistently.
//
// NOTE: Express routers are mounted under `/api/*` in server entrypoint.

module.exports = {
  // Auth / Settings
  'GET /auth/me': null, // returns caps
  'GET /auth/features': null, // exposes config
  'GET /settings/feature-matrix': 'settings.view',
  'PUT /settings/feature-matrix': 'settings.edit',
  'GET /settings/scope-matrix': 'settings.view',
  'PUT /settings/scope-matrix': 'settings.edit',

  // Orders
  'GET /orders': 'orders.list',
  'GET /orders/export-items': 'orders.export_items',
  'GET /orders/page-items': 'orders.list',
  'GET /orders/:id': 'orders.view',
  'POST /orders': 'orders.create',
  'PUT /orders/:id': 'orders.edit',
  'DELETE /orders/:id': 'orders.delete',

  // Customers
  'GET /customers': 'customers.list',
  'GET /customers/suggest': 'customers.list',
  'GET /customers/:id': 'customers.view',
  'POST /customers': 'customers.create',
  'PUT /customers/:id': 'customers.edit',
  'DELETE /customers/:id': 'customers.delete',

  // Reports
  'GET /reports/dashboard': 'reports.dashboard',
  'GET /reports/salary': 'reports.salary',
  'GET /reports/revenue': 'reports.revenue',

  // Commissions
  'GET /commissions': 'reports.commissions',
  'GET /commissions/ctv': 'reports.commissions_ctv',

  // Cash transactions
  'GET /cash-transactions': 'cash_transactions.view',
  'POST /cash-transactions': 'cash_transactions.edit',
  'PUT /cash-transactions/:id': 'cash_transactions.edit',
  'DELETE /cash-transactions/:id': 'cash_transactions.edit',

  // Inventory
  'GET /inventory': 'inventory.view',
  'POST /inventory/import': 'inventory.import',
  'POST /inventory/export': 'inventory.export',
};

