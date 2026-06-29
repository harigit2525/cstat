// ============================================================
// CStat — data.js  |  Firebase Integration & Sync Helpers
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyAAS0p483n8eTFMChDD_y8UOxhsZKyJj7c",
  authDomain: "cstat-e7e92.firebaseapp.com",
  projectId: "cstat-e7e92",
  storageBucket: "cstat-e7e92.firebasestorage.app",
  messagingSenderId: "484771515339",
  appId: "1:484771515339:web:833bc594d9a8f19da6c44e",
  measurementId: "G-KEF3QEVH8S"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();
const auth = firebase.auth();

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
let dbLoaded = false;

// ─── DB Helper ───────────────────────────────────────────────
const DB = {
  async init() {
    return new Promise((resolve) => {
      // Listen to Firestore document updates in real-time
      firestore.collection("appData").doc("main").onSnapshot((doc) => {
        if (doc.exists) {
          memoryDB = { ...EMPTY_DB, ...doc.data() };
        } else {
          // If no document exists, bootstrap with empty DB
          firestore.collection("appData").doc("main").set(EMPTY_DB);
          memoryDB = { ...EMPTY_DB };
        }
        if (!dbLoaded) {
          dbLoaded = true;
          resolve();
        }
      }, (error) => {
        console.error("Firestore sync error:", error);
        // Fallback resolve to prevent application hang
        if (!dbLoaded) {
          dbLoaded = true;
          resolve();
        }
      });
    });
  },
  get() {
    return memoryDB;
  },
  set(data) {
    memoryDB = data;
    firestore.collection("appData").doc("main").set(data).catch(err => {
      console.error("Error setting database document:", err);
    });
  },
  reset() {
    this.set(EMPTY_DB);
  },

  // ── Institutions ──
  getInstitutions() {
    return this.get().institutions || [];
  },
  getInstitutionById(id) {
    return this.getInstitutions().find(i => i.id === id);
  },
  addInstitution(name) {
    const db = this.get();
    if (!db.institutions) db.institutions = [];
    const id = genId('INST');
    db.institutions.push({ id, name, createdAt: today() });
    this.set(db);
    return id;
  },

  // ── Users ──
  getUsers(role = null, instId = null) {
    const db = this.get();
    let users = db.users || [];
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
    return this.getUsers().find(u => u.id === id && u.password === password) || null;
  },
  addUser(user) {
    const db = this.get();
    if (!db.users) db.users = [];
    db.users.push(user);
    this.set(db);
  },
  updateUser(id, updates) {
    const db = this.get();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx !== -1) { db.users[idx] = { ...db.users[idx], ...updates }; this.set(db); }
  },
  deleteUser(id) {
    const db = this.get();
    db.users = db.users.filter(u => u.id !== id);
    this.set(db);
  },

  // ── Subjects ──
  getSubjects(filter = {}) {
    let subjects = this.get().subjects || [];
    if (filter.facultyId) subjects = subjects.filter(s => s.facultyId === filter.facultyId);
    if (filter.batch) subjects = subjects.filter(s => s.batch === filter.batch);
    if (filter.department) subjects = subjects.filter(s => s.department === filter.department);
    return subjects;
  },
  getSubjectById(id) { return (this.get().subjects || []).find(s => s.id === id); },

  // ── Timetable ──
  getTimetable(filter = {}) {
    let tt = this.get().timetable || [];
    if (filter.batch) tt = tt.filter(t => t.batch === filter.batch);
    if (filter.day) tt = tt.filter(t => t.day === filter.day);
    if (filter.facultyId) tt = tt.filter(t => t.facultyId === filter.facultyId);
    return tt;
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
    this.set(db);
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
    this.set(db);
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
    if (!db.assignments) db.assignments = [];
    db.assignments.push(asgn); this.set(db);
  },
  submitAssignment(asgnId, submission) {
    const db = this.get();
    const asgn = db.assignments.find(a => a.id === asgnId);
    if (asgn) {
      if (!asgn.submissions) asgn.submissions = [];
      const existIdx = asgn.submissions.findIndex(s => s.studentId === submission.studentId);
      if (existIdx !== -1) asgn.submissions[existIdx] = submission;
      else asgn.submissions.push(submission);
      this.set(db);
    }
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
    if (!db.marks) db.marks = [];
    db.marks.push(mark); this.set(db);
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
    if (!db.leaveRequests) db.leaveRequests = [];
    db.leaveRequests.push(req); this.set(db);
  },
  updateLeaveRequest(id, updates) {
    const db = this.get();
    const idx = db.leaveRequests.findIndex(l => l.id === id);
    if (idx !== -1) { db.leaveRequests[idx] = { ...db.leaveRequests[idx], ...updates }; this.set(db); }
  },

  // ── Announcements ──
  getAnnouncements(audience = null) {
    let ann = this.get().announcements || [];
    if (audience) ann = ann.filter(a => a.audience === 'all' || a.audience === audience);
    return ann.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  addAnnouncement(ann) {
    const db = this.get();
    if (!db.announcements) db.announcements = [];
    db.announcements.push(ann); this.set(db);
  },

  // ── Departments ──
  getDepartments() { return this.get().departments || []; },

  // ── Utility: Attendance % for a student per subject ──
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
