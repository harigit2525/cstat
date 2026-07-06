// ============================================================
// CStat — data.js  |  REST API Sync Database Wrapper
// Synced in real-time with the Node/Express + MySQL Backend
// ============================================================

// If hosted on GitHub Pages (static), point to your local or deployed API server
const BASE_URL = window.location.hostname.includes('github.io')
  ? 'http://localhost:3000' // Change this to your deployed backend URL (e.g., https://your-app.render.com)
  : window.location.origin;

// ─── Empty Database Structure ────────────────────────────────
const EMPTY_DB = {
  institutions: [],
  users: [],
  subjects: [],
  timetable: [],
  studentAttendance: [],
  facultyAttendance: [],
  assignments: [],
  marks: [],
  leaveRequests: [],
  announcements: [],
  departments: []
};

let memoryDB = { ...EMPTY_DB };

// ─── DB Helper ───────────────────────────────────────────────
const DB = {
  async init() {
    await this.syncState();
    
    // Poll the backend every 5 seconds to stay up-to-date across multiple devices
    setInterval(() => this.syncState(), 5000);
  },

  async syncState() {
    try {
      const res = await fetch(`${BASE_URL}/api/db-state`);
      if (res.ok) {
        const data = await res.json();
        memoryDB = { ...EMPTY_DB, ...data };
      }
    } catch (e) {
      console.warn('[CStat DB] Offline mode or server disconnected.', e);
    }
  },

  get() {
    return memoryDB;
  },

  // ── Institutions ──
  getInstitutions() {
    return this.get().institutions || [];
  },
  getInstitutionById(id) {
    return this.getInstitutions().find(i => i.id === id);
  },
  addInstitution(name) {
    // Generate a quick local ID, then send to backend
    const id = genId('INST');
    
    // Optimistic local update
    const db = this.get();
    db.institutions.push({ id, name, createdAt: today() });
    
    // Background POST
    fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin', name: 'Institution Root', email: `root@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, password: 'RootPassword1!', institutionName: name })
    }).catch(err => console.error('[CStat DB] Error adding institution:', err));

    return id;
  },

  // ── Users ──
  getUsers(role = null, instId = null) {
    let users = this.get().users || [];
    if (role) users = users.filter(u => u.role === role);
    if (instId) users = users.filter(u => u.institutionId === instId);
    return users;
  },
  getUserById(id) {
    return this.getUsers().find(u => u.id === id) || null;
  },
  getUserByEmail(email) {
    return this.getUsers().find(u => u.email === email) || null;
  },
  authenticate(id, password) {
    // To handle login synchronously for matching, we check local state, 
    // but the actual login checks are handled by the backend during the login form submission.
    return this.getUsers().find(u => u.id === id) || null; 
  },
  addUser(user) {
    // Optimistic local update
    const db = this.get();
    db.users.push(user);

    // Send to backend
    fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    }).catch(err => console.error('[CStat DB] Error saving user:', err));
  },
  updateUser(id, updates) {
    // Optimistic local update
    const db = this.get();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      db.users[idx] = { ...db.users[idx], ...updates };
    }

    // Send to backend
    fetch(`${BASE_URL}/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }).catch(err => console.error('[CStat DB] Error updating user:', err));
  },
  deleteUser(id) {
    // Optimistic local update
    const db = this.get();
    db.users = db.users.filter(u => u.id !== id);

    // Send to backend
    fetch(`${BASE_URL}/api/users/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error('[CStat DB] Error deleting user:', err));
  },

  // ── Subjects ──
  getSubjects(filter = {}) {
    let subjects = this.get().subjects || [];
    if (filter.facultyId) subjects = subjects.filter(s => s.facultyId === filter.facultyId);
    if (filter.batch) subjects = subjects.filter(s => s.batch === filter.batch);
    if (filter.department) subjects = subjects.filter(s => s.department === filter.department);
    return subjects;
  },
  getSubjectById(id) { return this.getSubjects().find(s => s.id === id); },
  addSubject(subject) {
    const db = this.get();
    db.subjects.push(subject);
    
    fetch(`${BASE_URL}/api/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subject)
    }).catch(err => console.error('[CStat DB] Error saving subject:', err));
  },

  // ── Timetable ──
  getTimetable(filter = {}) {
    let tt = this.get().timetable || [];
    if (filter.batch) tt = tt.filter(t => t.batch === filter.batch);
    if (filter.day) tt = tt.filter(t => t.day === filter.day);
    if (filter.facultyId) tt = tt.filter(t => t.facultyId === filter.facultyId);
    return tt;
  },
  addTimetable(entry) {
    const db = this.get();
    db.timetable.push(entry);
    
    fetch(`${BASE_URL}/api/timetable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).catch(err => console.error('[CStat DB] Error saving timetable:', err));
  },

  // ── Student Attendance ──
  getStudentAttendance(filter = {}) {
    let sa = this.get().studentAttendance || [];
    if (filter.studentId) sa = sa.filter(a => a.studentId === filter.studentId);
    if (filter.subjectId) sa = sa.filter(a => a.subjectId === filter.subjectId);
    if (filter.date) sa = sa.filter(a => a.date === filter.date);
    if (filter.markedBy) sa = sa.filter(a => a.markedBy === filter.markedBy);
    return sa;
  },
  addStudentAttendance(record) {
    const db = this.get();
    if (!db.studentAttendance) db.studentAttendance = [];
    const exists = db.studentAttendance.find(a =>
      a.studentId === record.studentId &&
      a.subjectId === record.subjectId &&
      a.date === record.date &&
      a.period === record.period
    );
    if (exists) {
      const idx = db.studentAttendance.indexOf(exists);
      db.studentAttendance[idx] = { ...exists, ...record };
    } else {
      db.studentAttendance.push(record);
    }

    fetch(`${BASE_URL}/api/student-attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(err => console.error('[CStat DB] Error saving student attendance:', err));
  },

  // ── Faculty Attendance ──
  getFacultyAttendance(filter = {}) {
    let fa = this.get().facultyAttendance || [];
    if (filter.facultyId) fa = fa.filter(a => a.facultyId === filter.facultyId);
    if (filter.date) fa = fa.filter(a => a.date === filter.date);
    return fa;
  },
  addFacultyAttendance(record) {
    const db = this.get();
    if (!db.facultyAttendance) db.facultyAttendance = [];
    const exists = db.facultyAttendance.find(a =>
      a.facultyId === record.facultyId && a.date === record.date
    );
    if (exists) {
      const idx = db.facultyAttendance.indexOf(exists);
      db.facultyAttendance[idx] = { ...exists, ...record };
    } else {
      db.facultyAttendance.push(record);
    }

    fetch(`${BASE_URL}/api/faculty-attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(err => console.error('[CStat DB] Error saving faculty attendance:', err));
  },

  // ── Assignments ──
  getAssignments(filter = {}) {
    let asgn = this.get().assignments || [];
    if (filter.facultyId) asgn = asgn.filter(a => a.facultyId === filter.facultyId);
    if (filter.batch) asgn = asgn.filter(a => a.batch === filter.batch);
    if (filter.subjectId) asgn = asgn.filter(a => a.subjectId === filter.subjectId);
    return asgn;
  },
  addAssignment(asgn) {
    const db = this.get();
    db.assignments.push({ ...asgn, submissions: [] });

    fetch(`${BASE_URL}/api/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asgn)
    }).catch(err => console.error('[CStat DB] Error saving assignment:', err));
  },
  submitAssignment(asgnId, submission) {
    const db = this.get();
    const asgn = db.assignments.find(a => a.id === asgnId);
    if (asgn) {
      if (!asgn.submissions) asgn.submissions = [];
      const existIdx = asgn.submissions.findIndex(s => s.studentId === submission.studentId);
      if (existIdx !== -1) asgn.submissions[existIdx] = submission;
      else asgn.submissions.push(submission);
    }

    fetch(`${BASE_URL}/api/assignments/${asgnId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    }).catch(err => console.error('[CStat DB] Error submitting assignment:', err));
  },

  // ── Marks ──
  getMarks(filter = {}) {
    let marks = this.get().marks || [];
    if (filter.studentId) marks = marks.filter(m => m.studentId === filter.studentId);
    if (filter.subjectId) marks = marks.filter(m => m.subjectId === filter.subjectId);
    return marks;
  },
  addMark(mark) {
    const db = this.get();
    db.marks.push(mark);

    fetch(`${BASE_URL}/api/marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mark)
    }).catch(err => console.error('[CStat DB] Error saving mark:', err));
  },

  // ── Leave Requests ──
  getLeaveRequests(filter = {}) {
    let lr = this.get().leaveRequests || [];
    if (filter.userId) lr = lr.filter(l => l.userId === filter.userId);
    if (filter.role) lr = lr.filter(l => l.role === filter.role);
    if (filter.status) lr = lr.filter(l => l.status === filter.status);
    return lr;
  },
  addLeaveRequest(req) {
    const db = this.get();
    db.leaveRequests.push(req);

    fetch(`${BASE_URL}/api/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    }).catch(err => console.error('[CStat DB] Error saving leave request:', err));
  },
  updateLeaveRequest(id, updates) {
    const db = this.get();
    const idx = db.leaveRequests.findIndex(l => l.id === id);
    if (idx !== -1) {
      db.leaveRequests[idx] = { ...db.leaveRequests[idx], ...updates };
    }

    fetch(`${BASE_URL}/api/leaves/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }).catch(err => console.error('[CStat DB] Error updating leave request:', err));
  },

  // ── Announcements ──
  getAnnouncements(audience = null) {
    let ann = this.get().announcements || [];
    if (audience) ann = ann.filter(a => a.audience === 'all' || a.audience === audience);
    return ann.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  addAnnouncement(ann) {
    const db = this.get();
    db.announcements.push(ann);

    fetch(`${BASE_URL}/api/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ann)
    }).catch(err => console.error('[CStat DB] Error saving announcement:', err));
  },

  // ── Departments ──
  getDepartments() {
    return this.get().departments || [];
  },
  addDepartment(dept) {
    const db = this.get();
    db.departments.push(dept);

    fetch(`${BASE_URL}/api/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dept)
    }).catch(err => console.error('[CStat DB] Error saving department:', err));
  },

  // ── Student Attendance Stats ──
  getStudentAttendanceStats(studentId) {
    const db = this.get();
    const user = this.getUserById(studentId);
    if (!user) return [];
    const subjects = this.getSubjects({ batch: user.batch });
    return subjects.map(sub => {
      const records = (db.studentAttendance || []).filter(a => a.studentId === studentId && a.subjectId === sub.id);
      const total = records.length;
      const present = records.filter(a => a.status === 'present').length;
      const late = records.filter(a => a.status === 'late').length;
      const absent = records.filter(a => a.status === 'absent').length;
      const attended = present + late;
      const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
      return { subject: sub, total, present, late, absent, attended, pct };
    });
  }
};

// ─── ID Generator ────────────────────────────────────────────
function genId(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

// ─── Date Helpers ────────────────────────────────────────────
function today() { return new Date().toISOString().split('T')[0]; }
function now() { return new Date().toISOString(); }
function dayName() { return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()]; }
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(dtStr) {
  const d = new Date(dtStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
