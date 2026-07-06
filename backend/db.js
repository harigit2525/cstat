// ============================================================
// CStat — db.js  |  MySQL Connection Pool
// ============================================================
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Hari@sql.2025',
  database: 'cstat_db',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
});

// Run the setup.sql schema on first launch
async function initDB() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Hari@sql.2025',
    multipleStatements: true
  });
  const sql = fs.readFileSync(path.join(__dirname, 'setup.sql'), 'utf8');
  await conn.query(sql);
  await conn.end();
  console.log('[CStat DB] Database and tables created successfully.');
}

module.exports = { pool, initDB };
