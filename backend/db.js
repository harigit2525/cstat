// ============================================================
// CStat — db.js  |  PostgreSQL Connection Pool
// ============================================================
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let dbUrl = process.env.DATABASE_URL || '';
// Clean sslmode parameter if present to let Pool handle ssl config
dbUrl = dbUrl.replace(/\?sslmode=[^&]*/, '').replace(/&sslmode=[^&]*/, '');

const pgPool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
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
  const sqlContent = fs.readFileSync(path.join(__dirname, 'setup.sql'), 'utf8');
  // Split statements by semicolon to execute individually
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      await pgPool.query(statement);
    } catch (err) {
      // Ignore if table or relation already exists
      if (err.code !== '42P07' && err.code !== '42710') {
        console.warn(`[CStat DB Warning] Schema statement failed: ${err.message}`);
      }
    }
  }

  // Safe migrations for new columns
  const safeMigrations = [
    'ALTER TABLE users ADD COLUMN year VARCHAR(20) DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN position VARCHAR(100) DEFAULT NULL',
    'ALTER TABLE assignments ADD COLUMN pdf_path VARCHAR(255) DEFAULT NULL',
    'ALTER TABLE faculty_attendance ADD COLUMN entry_time TIMESTAMP DEFAULT NULL',
    'ALTER TABLE faculty_attendance ADD COLUMN exit_time TIMESTAMP DEFAULT NULL',
    'ALTER TABLE institutions ADD COLUMN faculty_positions JSON DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN plain_password VARCHAR(255) DEFAULT NULL',
    `CREATE TABLE IF NOT EXISTS assignment_scores (
      assignment_id VARCHAR(50) NOT NULL,
      student_id VARCHAR(50) NOT NULL,
      score INT NOT NULL,
      PRIMARY KEY (assignment_id, student_id),
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
    )`
  ];

  for (const mig of safeMigrations) {
    try { await pgPool.query(mig); } catch(e) {}
  }

  console.log('[CStat DB] Database connected and schema applied successfully.');
}

module.exports = { pool, initDB };

