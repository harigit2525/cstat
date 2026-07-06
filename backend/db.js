// ============================================================
// CStat — db.js  |  PostgreSQL Connection Pool
// ============================================================
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace('?sslmode=require', '') : '';

const pgPool = new Pool({
  connectionString: dbUrl,
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
  
  // Safe migrations for new columns
  try { await pgPool.query('ALTER TABLE users ADD COLUMN year VARCHAR(20) DEFAULT NULL'); } catch(e) {}
  try { await pgPool.query('ALTER TABLE users ADD COLUMN position VARCHAR(100) DEFAULT NULL'); } catch(e) {}
  try { await pgPool.query('ALTER TABLE assignments ADD COLUMN pdf_path VARCHAR(255) DEFAULT NULL'); } catch(e) {}
  try { await pgPool.query(`CREATE TABLE IF NOT EXISTS assignment_scores (
    assignment_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    score INT NOT NULL,
    PRIMARY KEY (assignment_id, student_id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
  )`); } catch(e) {}

  console.log('[CStat DB] Database connected and schema applied successfully.');
}

module.exports = { pool, initDB };
