-- ============================================================
-- CStat Database Schema — PostgreSQL
-- ============================================================

-- Institutions
CREATE TABLE IF NOT EXISTS institutions (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at DATE NOT NULL
);

-- Users (Admin, Faculty, Student)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  institution_id VARCHAR(50) NOT NULL,
  role VARCHAR(20) CHECK(role IN ('admin','faculty','student')) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT '',
  department VARCHAR(100) DEFAULT 'General',
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(10) DEFAULT '',
  batch VARCHAR(50) DEFAULT NULL,
  roll_no VARCHAR(50) DEFAULT NULL,
  year VARCHAR(20) DEFAULT NULL,
  position VARCHAR(100) DEFAULT NULL,
  joined DATE NOT NULL,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(50) PRIMARY KEY,
  institution_id VARCHAR(50) DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  head VARCHAR(50) DEFAULT NULL,
  batches JSON DEFAULT NULL
);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  faculty_id VARCHAR(50) DEFAULT NULL,
  department VARCHAR(100) DEFAULT '',
  batch VARCHAR(50) DEFAULT ''
);

-- Timetable
CREATE TABLE IF NOT EXISTS timetable (
  id VARCHAR(50) PRIMARY KEY,
  batch VARCHAR(50) NOT NULL,
  day VARCHAR(20) NOT NULL,
  period INT NOT NULL,
  time VARCHAR(50) NOT NULL,
  subject_id VARCHAR(50) NOT NULL,
  faculty_id VARCHAR(50) NOT NULL,
  room VARCHAR(50) NOT NULL
);

-- Student Attendance
CREATE TABLE IF NOT EXISTS student_attendance (
  id VARCHAR(50) PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  subject_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  period INT NOT NULL,
  status VARCHAR(20) CHECK(status IN ('present','absent','late')) NOT NULL,
  marked_by VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL
);

-- Faculty Attendance
CREATE TABLE IF NOT EXISTS faculty_attendance (
  id VARCHAR(50) PRIMARY KEY,
  faculty_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20) CHECK(status IN ('present','absent','leave')) NOT NULL,
  marked_by VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  faculty_id VARCHAR(50) NOT NULL,
  subject_id VARCHAR(50) NOT NULL,
  batch VARCHAR(50) NOT NULL,
  due_date DATE NOT NULL,
  pdf_path VARCHAR(255) DEFAULT NULL,
  created_at DATE NOT NULL
);

-- Assignment Submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id SERIAL PRIMARY KEY,
  assignment_id VARCHAR(50) NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  content TEXT,
  submitted_at TIMESTAMP NOT NULL,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

-- Assignment Scores
CREATE TABLE IF NOT EXISTS assignment_scores (
  assignment_id VARCHAR(50) NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  score INT NOT NULL,
  PRIMARY KEY (assignment_id, student_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

-- Marks
CREATE TABLE IF NOT EXISTS marks (
  id VARCHAR(50) PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  subject_id VARCHAR(50) NOT NULL,
  exam_type VARCHAR(100) NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL,
  max_marks DECIMAL(5,2) NOT NULL,
  date DATE NOT NULL
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  role VARCHAR(20) CHECK(role IN ('student','faculty')) NOT NULL,
  type VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  status VARCHAR(20) CHECK(status IN ('pending','approved','rejected')) DEFAULT 'pending',
  reviewed_by VARCHAR(50) DEFAULT NULL,
  reviewed_on DATE DEFAULT NULL,
  created_at DATE NOT NULL
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  audience VARCHAR(20) CHECK(audience IN ('all','students','faculty')) DEFAULT 'all',
  priority VARCHAR(20) CHECK(priority IN ('low','medium','high')) DEFAULT 'low',
  posted_by VARCHAR(50) NOT NULL,
  date DATE NOT NULL
);
