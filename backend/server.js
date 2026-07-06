// ============================================================
// CStat — server.js  |  Express Backend API
// ============================================================
const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool, initDB } = require('./db');
const bcrypt = require('bcryptjs');

const app = express();
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend static files from project root
app.use(express.static(path.join(__dirname, '..')));

// ─── Helper: generate unique IDs ────────────────────────────
function genId(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

// ─── Email Validation ───────────────────────────────────────
function isValidEmail(email) {
  // Must have proper format and a real-ish domain (at least 2 char TLD)
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(email)) return false;
  // Block obviously fake single-char domains
  const domain = email.split('@')[1];
  const parts = domain.split('.');
  if (parts[0].length < 2) return false;
  return true;
}

// ─── Password Validation ────────────────────────────────────
function isValidPassword(pw) {
  return /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);
}

// GET /api/db-state
app.get('/api/db-state', async (req, res) => {
  try {
    const [institutions] = await pool.query('SELECT * FROM institutions');
    const [users] = await pool.query('SELECT id, institution_id, role, name, email, phone, department, avatar, batch, roll_no, year, position, joined FROM users');
    const [subjects] = await pool.query('SELECT * FROM subjects');
    const [timetable] = await pool.query('SELECT * FROM timetable');
    const [studentAttendance] = await pool.query('SELECT * FROM student_attendance');
    const [facultyAttendance] = await pool.query('SELECT * FROM faculty_attendance');
    const [assignmentsRows] = await pool.query('SELECT * FROM assignments');
    const assignments = [];
    for (const r of assignmentsRows) {
      const [subs] = await pool.query('SELECT * FROM assignment_submissions WHERE assignment_id=?', [r.id]);
      const [scores] = await pool.query('SELECT * FROM assignment_scores WHERE assignment_id=?', [r.id]);
      assignments.push({ 
        id: r.id, 
        title: r.title, 
        description: r.description, 
        facultyId: r.faculty_id, 
        subjectId: r.subject_id, 
        batch: r.batch, 
        dueDate: r.due_date, 
        pdfPath: r.pdf_path,
        createdAt: r.created_at, 
        submissions: subs.map(s => {
          const matchedScore = scores.find(sc => sc.student_id === s.student_id);
          return {
            studentId: s.student_id,
            content: s.content,
            submittedAt: s.submitted_at,
            score: matchedScore ? matchedScore.score : null
          };
        }) 
      });
    }
    const [marks] = await pool.query('SELECT * FROM marks');
    const [leaveRequests] = await pool.query('SELECT * FROM leave_requests');
    const [announcements] = await pool.query('SELECT * FROM announcements');
    const [departments] = await pool.query('SELECT * FROM departments');

    res.json({
      institutions: institutions.map(i => ({ id: i.id, name: i.name, createdAt: i.created_at })),
      users: users.map(u => ({ id: u.id, institutionId: u.institution_id, role: u.role, name: u.name, email: u.email, phone: u.phone, department: u.department, avatar: u.avatar, batch: u.batch, rollNo: u.roll_no, year: u.year, position: u.position, joined: u.joined })),
      subjects: subjects.map(s => ({ id: s.id, name: s.name, code: s.code, facultyId: s.faculty_id, department: s.department, batch: s.batch })),
      timetable: timetable.map(t => ({ id: t.id, batch: t.batch, day: t.day, period: t.period, time: t.time, subjectId: t.subject_id, facultyId: t.faculty_id, room: t.room })),
      studentAttendance: studentAttendance.map(sa => ({ id: sa.id, studentId: sa.student_id, subjectId: sa.subject_id, date: sa.date, period: sa.period, status: sa.status, markedBy: sa.marked_by, timestamp: sa.timestamp })),
      facultyAttendance: facultyAttendance.map(fa => ({ id: fa.id, facultyId: fa.faculty_id, date: fa.date, status: fa.status, markedBy: fa.marked_by, timestamp: fa.timestamp })),
      assignments,
      marks: marks.map(m => ({ id: m.id, studentId: m.student_id, subjectId: m.subject_id, examType: m.exam_type, marksObtained: m.marks_obtained, maxMarks: m.max_marks, date: m.date })),
      leaveRequests: leaveRequests.map(lr => ({ id: lr.id, userId: lr.user_id, role: lr.role, type: lr.type, reason: lr.reason, from: lr.from_date, to: lr.to_date, status: lr.status, reviewedBy: lr.reviewed_by, reviewedOn: lr.reviewed_on, createdAt: lr.created_at })),
      announcements: announcements.map(a => ({ id: a.id, title: a.title, body: a.body, audience: a.audience, priority: a.priority, postedBy: a.posted_by, date: a.date })),
      departments: departments.map(d => ({ id: d.id, name: d.name, head: d.head, batches: d.batches || [], institutionId: d.institution_id }))
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error fetching db-state' });
  }
});

// ════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════════════════════════

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) return res.status(400).json({ error: 'User ID and password required.' });

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId.trim().toUpperCase()]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid User ID or Password.' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid User ID or Password.' });

    // Return user data (exclude password)
    const { password: _, ...safeUser } = user;
    // Convert snake_case to camelCase for frontend
    const userData = {
      id: safeUser.id,
      institutionId: safeUser.institution_id,
      role: safeUser.role,
      name: safeUser.name,
      email: safeUser.email,
      phone: safeUser.phone,
      department: safeUser.department,
      avatar: safeUser.avatar,
      batch: safeUser.batch,
      rollNo: safeUser.roll_no,
      year: safeUser.year,
      position: safeUser.position,
      joined: safeUser.joined
    };
    res.json({ success: true, user: userData });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { role, name, email, password, institutionName, institutionId, userId, department, year, position } = req.body;

    if (!role || !name || !email || !password || !userId) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with 1 uppercase letter and 1 number.' });
    }

    // Check if userId already exists
    const [existingUser] = await pool.query('SELECT id FROM users WHERE id = ?', [userId.trim().toUpperCase()]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'This User ID / Register No is already taken. Please choose another.' });
    }

    // Check if email already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPw = await bcrypt.hash(password, 10);
    let instId = institutionId || '';

    // Admin creates institution
    if (role === 'admin') {
      if (!institutionName) return res.status(400).json({ error: 'Institution name is required for admin.' });
      instId = genId('INST');
      await pool.query('INSERT INTO institutions (id, name, created_at) VALUES (?, ?, CURDATE())', [instId, institutionName]);
    } else {
      if (!instId) return res.status(400).json({ error: 'Please select an institution.' });
      // Verify institution exists
      const [inst] = await pool.query('SELECT id FROM institutions WHERE id = ?', [instId]);
      if (inst.length === 0) return res.status(400).json({ error: 'Institution not found.' });
    }

    const finalUserId = userId.trim().toUpperCase();
    const avatar = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const dept = department || (role === 'admin' ? 'Administration' : 'General');

    await pool.query(
      `INSERT INTO users (id, institution_id, role, name, email, phone, department, password, avatar, batch, roll_no, year, position, joined) 
       VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
      [finalUserId, instId, role, name, email, dept, hashedPw, avatar,
       role === 'student' ? 'Batch-1' : null, role === 'student' ? finalUserId : null,
       role === 'student' ? (year || null) : null, role === 'faculty' ? (position || null) : null]
    );

    const userData = { id: finalUserId, institutionId: instId, role, name, email, phone: '', department: dept, avatar, batch: role === 'student' ? 'Batch-1' : null, rollNo: role === 'student' ? finalUserId : null, year: role === 'student' ? (year || null) : null, position: role === 'faculty' ? (position || null) : null, joined: new Date().toISOString().split('T')[0] };
    res.json({ success: true, user: userData });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════
//  INSTITUTIONS
// ════════════════════════════════════════════════════════════

app.get('/api/institutions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM institutions ORDER BY name');
    res.json(rows.map(r => ({ id: r.id, name: r.name, createdAt: r.created_at })));
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

// ════════════════════════════════════════════════════════════
//  USERS
// ════════════════════════════════════════════════════════════

app.get('/api/users', async (req, res) => {
  try {
    let sql = 'SELECT id, institution_id, role, name, email, phone, department, avatar, batch, roll_no, year, position, joined FROM users WHERE 1=1';
    const params = [];
    if (req.query.role) { sql += ' AND role = ?'; params.push(req.query.role); }
    if (req.query.institutionId) { sql += ' AND institution_id = ?'; params.push(req.query.institutionId); }
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => ({ id: r.id, institutionId: r.institution_id, role: r.role, name: r.name, email: r.email, phone: r.phone, department: r.department, avatar: r.avatar, batch: r.batch, rollNo: r.roll_no, year: r.year, position: r.position, joined: r.joined })));
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, institution_id, role, name, email, phone, department, avatar, batch, roll_no, year, position, joined FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const r = rows[0];
    res.json({ id: r.id, institutionId: r.institution_id, role: r.role, name: r.name, email: r.email, phone: r.phone, department: r.department, avatar: r.avatar, batch: r.batch, rollNo: r.roll_no, year: r.year, position: r.position, joined: r.joined });
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/users', async (req, res) => {
  try {
    const { id, role, name, email, phone, department, password, avatar, batch, rollNo, institutionId } = req.body;
    const hashedPw = await bcrypt.hash(password || (role === 'student' ? 'Student@123' : 'Faculty@123'), 10);
    await pool.query(
      'INSERT INTO users (id, institution_id, role, name, email, phone, department, password, avatar, batch, roll_no, joined) VALUES (?,?,?,?,?,?,?,?,?,?,?, CURDATE())',
      [id, institutionId || '', role, name, email || '', phone || '', department || 'General', hashedPw, avatar || '', batch || null, rollNo || null]
    );
    res.json({ success: true });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const updates = req.body;
    const fields = []; const params = [];
    if (updates.name !== undefined) { fields.push('name=?'); params.push(updates.name); }
    if (updates.email !== undefined) { fields.push('email=?'); params.push(updates.email); }
    if (updates.phone !== undefined) { fields.push('phone=?'); params.push(updates.phone); }
    if (updates.department !== undefined) { fields.push('department=?'); params.push(updates.department); }
    if (updates.avatar !== undefined) { fields.push('avatar=?'); params.push(updates.avatar); }
    if (updates.batch !== undefined) { fields.push('batch=?'); params.push(updates.batch); }
    if (updates.rollNo !== undefined) { fields.push('roll_no=?'); params.push(updates.rollNo); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update.' });
    params.push(req.params.id);
    await pool.query(`UPDATE users SET ${fields.join(',')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

// ════════════════════════════════════════════════════════════
//  DEPARTMENTS
// ════════════════════════════════════════════════════════════

app.get('/api/departments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments');
    res.json(rows.map(r => ({ id: r.id, name: r.name, head: r.head, batches: r.batches || [], institutionId: r.institution_id })));
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/departments', async (req, res) => {
  try {
    const { name, head, batches, institutionId } = req.body;
    const id = genId('DEPT');
    await pool.query('INSERT INTO departments (id, institution_id, name, head, batches) VALUES (?,?,?,?,?)',
      [id, institutionId || null, name, head || null, JSON.stringify(batches || [])]);
    res.json({ success: true, id });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ════════════════════════════════════════════════════════════
//  SUBJECTS
// ════════════════════════════════════════════════════════════

app.get('/api/subjects', async (req, res) => {
  try {
    let sql = 'SELECT * FROM subjects WHERE 1=1'; const params = [];
    if (req.query.facultyId) { sql += ' AND faculty_id=?'; params.push(req.query.facultyId); }
    if (req.query.batch) { sql += ' AND batch=?'; params.push(req.query.batch); }
    if (req.query.department) { sql += ' AND department=?'; params.push(req.query.department); }
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => ({ id: r.id, name: r.name, code: r.code, facultyId: r.faculty_id, department: r.department, batch: r.batch })));
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/subjects', async (req, res) => {
  try {
    const { name, code, facultyId, department, batch } = req.body;
    const id = genId('SUB');
    await pool.query('INSERT INTO subjects (id, name, code, faculty_id, department, batch) VALUES (?,?,?,?,?,?)',
      [id, name, code, facultyId, department, batch]);
    res.json({ success: true, id });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ════════════════════════════════════════════════════════════
//  TIMETABLE
// ════════════════════════════════════════════════════════════

app.get('/api/timetable', async (req, res) => {
  try {
    let sql = 'SELECT * FROM timetable WHERE 1=1'; const params = [];
    if (req.query.batch) { sql += ' AND batch=?'; params.push(req.query.batch); }
    if (req.query.day) { sql += ' AND day=?'; params.push(req.query.day); }
    if (req.query.facultyId) { sql += ' AND faculty_id=?'; params.push(req.query.facultyId); }
    sql += ' ORDER BY period';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => ({ id: r.id, batch: r.batch, day: r.day, period: r.period, time: r.time, subjectId: r.subject_id, facultyId: r.faculty_id, room: r.room })));
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/timetable', async (req, res) => {
  try {
    const { batch, day, period, time, subjectId, facultyId, room } = req.body;
    // Conflict check
    const [conflict] = await pool.query('SELECT id FROM timetable WHERE batch=? AND day=? AND period=?', [batch, day, period]);
    if (conflict.length > 0) return res.status(400).json({ error: `Conflict: Class already exists for Period P${period}` });
    const id = genId('TT');
    await pool.query('INSERT INTO timetable (id, batch, day, period, time, subject_id, faculty_id, room) VALUES (?,?,?,?,?,?,?,?)',
      [id, batch, day, period, time, subjectId, facultyId, room]);
    res.json({ success: true, id });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ════════════════════════════════════════════════════════════
//  STUDENT ATTENDANCE
// ════════════════════════════════════════════════════════════

app.get('/api/student-attendance', async (req, res) => {
  try {
    let sql = 'SELECT * FROM student_attendance WHERE 1=1'; const params = [];
    if (req.query.studentId) { sql += ' AND student_id=?'; params.push(req.query.studentId); }
    if (req.query.subjectId) { sql += ' AND subject_id=?'; params.push(req.query.subjectId); }
    if (req.query.date) { sql += ' AND date=?'; params.push(req.query.date); }
    if (req.query.markedBy) { sql += ' AND marked_by=?'; params.push(req.query.markedBy); }
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => ({ id: r.id, studentId: r.student_id, subjectId: r.subject_id, date: r.date, period: r.period, status: r.status, markedBy: r.marked_by, timestamp: r.timestamp })));
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/student-attendance', async (req, res) => {
  try {
    const { studentId, subjectId, date, period, status, markedBy } = req.body;
    // Upsert: delete existing if present
    await pool.query('DELETE FROM student_attendance WHERE student_id=? AND subject_id=? AND date=? AND period=?', [studentId, subjectId, date, period]);
    const id = genId('SA');
    await pool.query('INSERT INTO student_attendance (id, student_id, subject_id, date, period, status, marked_by, timestamp) VALUES (?,?,?,?,?,?,?,NOW())',
      [id, studentId, subjectId, date, period, status, markedBy]);
    res.json({ success: true });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ════════════════════════════════════════════════════════════
//  FACULTY ATTENDANCE
// ════════════════════════════════════════════════════════════

app.get('/api/faculty-attendance', async (req, res) => {
  try {
    let sql = 'SELECT * FROM faculty_attendance WHERE 1=1'; const params = [];
    if (req.query.facultyId) { sql += ' AND faculty_id=?'; params.push(req.query.facultyId); }
    if (req.query.date) { sql += ' AND date=?'; params.push(req.query.date); }
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => ({ id: r.id, facultyId: r.faculty_id, date: r.date, status: r.status, markedBy: r.marked_by, timestamp: r.timestamp })));
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/faculty-attendance', async (req, res) => {
  try {
    const { facultyId, date, status, markedBy } = req.body;
    await pool.query('DELETE FROM faculty_attendance WHERE faculty_id=? AND date=?', [facultyId, date]);
    const id = genId('FA');
    await pool.query('INSERT INTO faculty_attendance (id, faculty_id, date, status, marked_by, timestamp) VALUES (?,?,?,?,?,NOW())',
      [id, facultyId, date, status, markedBy]);
    res.json({ success: true });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ════════════════════════════════════════════════════════════
//  ASSIGNMENTS
// ════════════════════════════════════════════════════════════

// New endpoint for QR attendance logging (single scan)
app.post('/api/attendance/scan', async (req, res) => {
  try {
    const { userId, role } = req.body; // Expected fields
    const date = new Date().toISOString().split('T')[0];
    if (!userId || !role) return res.status(400).json({ error: 'userId and role required' });
    if (role === 'student') {
      // Insert a generic attendance record for student (no subject context)
      const id = genId('SA');
      await pool.query('INSERT INTO student_attendance (id, student_id, subject_id, date, period, status, marked_by, timestamp) VALUES (?,?,?,?,?,?,?,NOW())', [id, userId, NULL, date, 0, 'present', 'qr',]);
    } else if (role === 'faculty') {
      const id = genId('FA');
      await pool.query('INSERT INTO faculty_attendance (id, faculty_id, date, status, marked_by, timestamp) VALUES (?,?,?,?,?,NOW())', [id, userId, date, 'present', 'qr']);
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }
    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update timetable entry (PUT)
app.put('/api/timetable', async (req, res) => {
  try {
    const { id, batch, day, period, time, subjectId, facultyId, room } = req.body;
    if (!id) return res.status(400).json({ error: 'Timetable entry id required' });
    const fields = [];
    const params = [];
    if (batch !== undefined) { fields.push('batch=?'); params.push(batch); }
    if (day !== undefined) { fields.push('day=?'); params.push(day); }
    if (period !== undefined) { fields.push('period=?'); params.push(period); }
    if (time !== undefined) { fields.push('time=?'); params.push(time); }
    if (subjectId !== undefined) { fields.push('subject_id=?'); params.push(subjectId); }
    if (facultyId !== undefined) { fields.push('faculty_id=?'); params.push(facultyId); }
    if (room !== undefined) { fields.push('room=?'); params.push(room); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    await pool.query(`UPDATE timetable SET ${fields.join(',')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete timetable entry (DELETE)
app.delete('/api/timetable/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM timetable WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assignment PDF upload (faculty)
app.post('/api/assignments', upload.single('pdf'), async (req, res) => {
  try {
    const { title, description, facultyId, subjectId, batch, dueDate } = req.body;
    const pdfPath = req.file ? req.file.filename : null;
    const id = genId('ASG');
    await pool.query('INSERT INTO assignments (id, title, description, faculty_id, subject_id, batch, due_date, pdf_path, created_at) VALUES (?,?,?,?,?,?,?, ?, CURDATE())', [id, title, description || '', facultyId, subjectId, batch, dueDate, pdfPath]);
    res.json({ success: true, id });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Student submission PDF upload
app.post('/api/assignments/:id/submit', upload.single('pdf'), async (req, res) => {
  try {
    const { studentId } = req.body;
    const contentPath = req.file ? req.file.filename : null;
    await pool.query('DELETE FROM assignment_submissions WHERE assignment_id=? AND student_id=?', [req.params.id, studentId]);
    await pool.query('INSERT INTO assignment_submissions (assignment_id, student_id, content, submitted_at) VALUES (?,?,?,NOW())', [req.params.id, studentId, contentPath]);
    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Score assignment for a student
app.patch('/api/assignments/:id/score', async (req, res) => {
  try {
    const { studentId, score } = req.body;
    // Store scores in a separate table 'assignment_scores' (create if not exists)
    await pool.query('INSERT INTO assignment_scores (assignment_id, student_id, score) VALUES (?,?,?) ON DUPLICATE KEY UPDATE score = VALUES(score)', [req.params.id, studentId, score]);
    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get assignment results for a student
app.get('/api/assignments/:id/result', async (req, res) => {
  try {
    const studentId = req.query.studentId;
    const [rows] = await pool.query('SELECT score FROM assignment_scores WHERE assignment_id=? AND student_id=?', [req.params.id, studentId]);
    if (rows.length === 0) return res.json({ score: null });
    res.json({ score: rows[0].score });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Continue with existing assignments routes
app.get('/api/assignments', async (req, res) => {
  try {
    let sql = 'SELECT * FROM assignments WHERE 1=1'; const params = [];
    if (req.query.facultyId) { sql += ' AND faculty_id=?'; params.push(req.query.facultyId); }
    if (req.query.batch) { sql += ' AND batch=?'; params.push(req.query.batch); }
    if (req.query.subjectId) { sql += ' AND subject_id=?'; params.push(req.query.subjectId); }
    const [rows] = await pool.query(sql, params);
    // Fetch submissions for each assignment
    const result = [];
    for (const r of rows) {
      const [subs] = await pool.query('SELECT * FROM assignment_submissions WHERE assignment_id=?', [r.id]);
      const [scores] = await pool.query('SELECT * FROM assignment_scores WHERE assignment_id=?', [r.id]);
      result.push({ 
        id: r.id, 
        title: r.title, 
        description: r.description, 
        facultyId: r.faculty_id, 
        subjectId: r.subject_id, 
        batch: r.batch, 
        dueDate: r.due_date, 
        pdfPath: r.pdf_path,
        createdAt: r.created_at, 
        submissions: subs.map(s => {
          const matchedScore = scores.find(sc => sc.student_id === s.student_id);
          return {
            studentId: s.student_id,
            content: s.content,
            submittedAt: s.submitted_at,
            score: matchedScore ? matchedScore.score : null
          };
        }) 
      });
    }
    res.json(result);
  } catch(e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ════════════════════════════════════════════════════════════
//  MARKS
// ════════════════════════════════════════════════════════════

app.get('/api/marks', async (req, res) => {
  try {
    let sql = 'SELECT * FROM marks WHERE 1=1'; const params = [];
    if (req.query.studentId) { sql += ' AND student_id=?'; params.push(req.query.studentId); }
    if (req.query.subjectId) { sql += ' AND subject_id=?'; params.push(req.query.subjectId); }
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => ({ id: r.id, studentId: r.student_id, subjectId: r.subject_id, examType: r.exam_type, marksObtained: r.marks_obtained, maxMarks: r.max_marks, date: r.date })));
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/marks', async (req, res) => {
  try {
    const { studentId, subjectId, examType, marksObtained, maxMarks } = req.body;
    const id = genId('MRK');
    await pool.query('INSERT INTO marks (id, student_id, subject_id, exam_type, marks_obtained, max_marks, date) VALUES (?,?,?,?,?,?,CURDATE())',
      [id, studentId, subjectId, examType, marksObtained, maxMarks]);
    res.json({ success: true, id });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ════════════════════════════════════════════════════════════
//  LEAVE REQUESTS
// ════════════════════════════════════════════════════════════

app.get('/api/leaves', async (req, res) => {
  try {
    let sql = 'SELECT * FROM leave_requests WHERE 1=1'; const params = [];
    if (req.query.userId) { sql += ' AND user_id=?'; params.push(req.query.userId); }
    if (req.query.role) { sql += ' AND role=?'; params.push(req.query.role); }
    if (req.query.status) { sql += ' AND status=?'; params.push(req.query.status); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => ({ id: r.id, userId: r.user_id, role: r.role, type: r.type, reason: r.reason, from: r.from_date, to: r.to_date, status: r.status, reviewedBy: r.reviewed_by, reviewedOn: r.reviewed_on, createdAt: r.created_at })));
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/leaves', async (req, res) => {
  try {
    const { userId, role, type, reason, from, to } = req.body;
    const id = genId('LV');
    await pool.query('INSERT INTO leave_requests (id, user_id, role, type, reason, from_date, to_date, status, created_at) VALUES (?,?,?,?,?,?,?,\'pending\',CURDATE())',
      [id, userId, role, type, reason, from, to]);
    res.json({ success: true, id });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.put('/api/leaves/:id', async (req, res) => {
  try {
    const { status, reviewedBy } = req.body;
    await pool.query('UPDATE leave_requests SET status=?, reviewed_by=?, reviewed_on=CURDATE() WHERE id=?', [status, reviewedBy, req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

// ════════════════════════════════════════════════════════════
//  ANNOUNCEMENTS
// ════════════════════════════════════════════════════════════

app.get('/api/announcements', async (req, res) => {
  try {
    let sql = 'SELECT * FROM announcements';
    if (req.query.audience) sql += ` WHERE audience='all' OR audience='${req.query.audience}'`;
    sql += ' ORDER BY date DESC';
    const [rows] = await pool.query(sql);
    res.json(rows.map(r => ({ id: r.id, title: r.title, body: r.body, audience: r.audience, priority: r.priority, postedBy: r.posted_by, date: r.date })));
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const { title, body, audience, priority, postedBy } = req.body;
    const id = genId('AN');
    await pool.query('INSERT INTO announcements (id, title, body, audience, priority, posted_by, date) VALUES (?,?,?,?,?,?,CURDATE())',
      [id, title, body || '', audience || 'all', priority || 'low', postedBy]);
    res.json({ success: true, id });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ════════════════════════════════════════════════════════════
//  ATTENDANCE STATS (for student dashboard)
// ════════════════════════════════════════════════════════════

app.get('/api/attendance-stats/:studentId', async (req, res) => {
  try {
    const [userRows] = await pool.query('SELECT * FROM users WHERE id=?', [req.params.studentId]);
    if (userRows.length === 0) return res.json([]);
    const user = userRows[0];
    const [subjects] = await pool.query('SELECT * FROM subjects WHERE batch=?', [user.batch]);
    const stats = [];
    for (const sub of subjects) {
      const [records] = await pool.query('SELECT * FROM student_attendance WHERE student_id=? AND subject_id=?', [req.params.studentId, sub.id]);
      const total = records.length;
      const present = records.filter(a => a.status === 'present').length;
      const late = records.filter(a => a.status === 'late').length;
      const absent = records.filter(a => a.status === 'absent').length;
      const attended = present + late;
      const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
      stats.push({ subject: { id: sub.id, name: sub.name, code: sub.code, facultyId: sub.faculty_id, department: sub.department, batch: sub.batch }, total, present, late, absent, attended, pct });
    }
    res.json(stats);
  } catch(e) { res.status(500).json({ error: 'Server error.' }); }
});

// ════════════════════════════════════════════════════════════
//  BOOT
// ════════════════════════════════════════════════════════════

const os = require('os');
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function start() {
  try {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      const localIp = getLocalIp();
      console.log(`\n  ╔══════════════════════════════════════════╗`);
      console.log(`  ║  CStat Backend running!                  ║`);
      console.log(`  ║  Local: http://localhost:${PORT}             ║`);
      console.log(`  ║  Mobile: http://${localIp.padEnd(15)}:${PORT}     ║`);
      console.log(`  ╚══════════════════════════════════════════╝\n`);
    });
  } catch(e) {
    console.error('[CStat] Failed to start server:', e);
    console.error('Make sure MySQL is running and password is correct.');
    process.exit(1);
  }
}

start();
