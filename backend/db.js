// ============================================================
// CStat — db.js  |  PostgreSQL Connection Pool
// ============================================================
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const pool = {
  query: async (sql, params = []) => {
    // Convert MySQL '?' to PostgreSQL '$1, $2...'
    let i = 1;
    const pgSql = sql.replace(/\?/g, () => `$${i++}`)
                     .replace(/CURDATE\(\)/gi, 'CURRENT_DATE')
                     .replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');
    const result = await pgPool.query(pgSql, params);
    // Mimic mysql2 return signature: [rows, fields]
    return [result.rows, result.fields];
  }
};

// Run the setup.sql schema on first launch
async function initDB() {
  const sql = fs.readFileSync(path.join(__dirname, 'setup.sql'), 'utf8');
  await pgPool.query(sql);
  console.log('[CStat DB] Database connected and schema applied successfully.');
}

module.exports = { pool, initDB };
