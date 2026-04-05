const mysql = require('mysql2/promise');
require('dotenv').config();

let dbPool = null;

async function createPool() {
  dbPool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    connectTimeout: 30000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });

  // Test connection
  const connection = await dbPool.getConnection();
  connection.release();
  
  console.log('✅ MySQL connected directly at', `${process.env.DB_HOST}:${process.env.DB_PORT}`);
  return dbPool;
}

async function getPool() {
  if (!dbPool) {
    await createPool();
  }
  return dbPool;
}

async function closeConnection() {
  if (dbPool) {
    await dbPool.end();
    console.log('✅ MySQL pool closed');
  }
}

module.exports = { getPool, closeConnection, createPool };
