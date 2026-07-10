const { pool } = require('../db');

async function resetDB() {
  console.log('Starting full database reset...');
  try {
    const tables = [
      'class_materials',
      'assignment_scores',
      'assignment_submissions',
      'assignments',
      'faculty_attendance',
      'student_attendance',
      'timetable',
      'subjects',
      'departments',
      'users',
      'institutions'
    ];

    for (const table of tables) {
      try {
        await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
        console.log(`Truncated table: ${table}`);
      } catch (err) {
        if (err.code === '42P01') {
          // Table doesn't exist, ignore
          console.log(`Table ${table} does not exist, skipping...`);
        } else {
          console.error(`Error truncating table ${table}:`, err.message);
        }
      }
    }

    console.log('Database reset complete. All data wiped.');
  } catch (err) {
    console.error('Fatal error during reset:', err);
  } finally {
    process.exit(0);
  }
}

resetDB();
