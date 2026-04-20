const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { getPool } = require('./config/db');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const customersRouter = require('./routes/customers');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const inventoryRouter = require('./routes/inventory');
const commissionsRouter = require('./routes/commissions');
const reportsRouter = require('./routes/reports');
const warehousesRouter = require('./routes/warehouses');
const categoriesRouter = require('./routes/categories');
const settingsRouter = require('./routes/settings');
const importRouter = require('./routes/import');
const uploadsRouter = require('./routes/uploads');
const logsRouter = require('./routes/logs');
const groupsRouter = require('./routes/groups');
const commissionTiersRouter = require('./routes/commission-tiers');
const collaboratorsRouter = require('./routes/collaborators');
const notificationsRouter = require('./routes/notifications');
const returnsRouter = require('./routes/returns');
const rolesRouter = require('./routes/roles');
const cashTransactionsRouter = require('./routes/cash-transactions');
const shopsRouter = require('./routes/shops');
const { logMiddleware } = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Create logs directory
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Process-level crash logging (để chẩn đoán lỗi runtime)
function appendProcessLog(type, err) {
  try {
    const payload = {
      ts: new Date().toISOString(),
      type,
      message: err?.message || String(err),
      stack: err?.stack || null,
    };
    fs.appendFileSync(path.join(logsDir, 'process.log'), JSON.stringify(payload) + '\n', 'utf8');
  } catch (e) {
    console.error('❌ Failed to write process.log:', e?.message || e);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('❌ UnhandledRejection:', reason);
  appendProcessLog('unhandledRejection', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ UncaughtException:', err);
  appendProcessLog('uncaughtException', err);
});

// Middleware — cho phép cả localhost và 127.0.0.1 (trình duyệt coi là 2 origin khác nhau)
const CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const isAllowedLanOrigin = (origin) => {
  if (!origin) return true;
  return /^http:\/\/(192\.168|10|172\.(1[6-9]|2\d|3[0-1]))\.\d+\.\d+:(5173|4173)$/.test(origin);
};
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || CORS_ORIGINS.includes(origin) || isAllowedLanOrigin(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging - HTTP requests
// NOTE: per requirement: do NOT write access.log (only error.log via errorHandler)
app.use(morgan('dev')); // Console logging only

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📝 ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Activity logging - MUST be before routes to wrap res.json
app.use(logMiddleware);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/commissions', commissionsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/warehouses', warehousesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/import', importRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/commission-tiers', commissionTiersRouter);
app.use('/api/collaborators', collaboratorsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/returns', returnsRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/cash-transactions', cashTransactionsRouter);
app.use('/api/shops', shopsRouter);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT 1 as test');
    res.json({ status: 'ok', db: 'connected', test: rows[0].test });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    await getPool();
    console.log('✅ Database connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📝 API Health: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
