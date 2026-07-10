// ============================================================
// CStat — faculty.js  |  Faculty Dashboard & Views
// ============================================================

const FacultyViews = {

  manageUsers() {
    const renderTab = () => {
      const users = DB.getUsers('student');
      return `<div class="table-wrap glass-card"><table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Year</th><th>Batch</th><th>Roll No</th><th>Email</th><th>Actions</th></tr></thead><tbody>
        ${users.map(u => `<tr><td><code>${u.id}</code></td><td>${u.name}</td><td>${u.department}</td><td>${u.year || '-'}</td><td>${u.batch || '-'}</td><td>${u.rollNo || '-'}</td><td>${u.email}</td>
        <td class="list-item-actions">
          <button class="btn btn-ghost btn-sm" onclick="FacultyViews._editUser('${u.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="FacultyViews._deleteUser('${u.id}')">🗑️</button>
        </td></tr>`).join('')}
      </tbody></table></div>`;
    };

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="page-header">
        <h2>Manage Students</h2>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="fac-add-user-btn"><span class="icon-add"></span> Add Student</button>
        </div>
      </div>
      <div class="glass-card mb-3" style="border-left:3px solid var(--primary)"><div class="card-body" style="font-size:0.85rem;padding:10px 16px">
        <strong>ℹ Batch Matching:</strong> Student <strong>Batch</strong> must exactly match the Subject's <strong>Batch</strong> for attendance marking to work. Use the ✏️ edit button to update each student's batch.
      </div></div>
      <div id="stu-tab" class="tab-content active">${renderTab()}</div>
    </div>`;

    setTimeout(() => {
      document.getElementById('fac-add-user-btn').addEventListener('click', () => this._addUserModal());
    }, 0);
  },

  _addUserModal() {
    const depts = DB.getDepartments().filter(d => d.institutionId === App.currentUser.institutionId);

    App.showModal('Add New Student', `
      <div class="form-row"><div class="form-group"><label class="form-label">Name</label><input class="form-input" id="mu-name" required/></div><div class="form-group"><label class="form-label">Email</label><input class="form-input" id="mu-email" type="email"/></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="mu-phone"/></div><div class="form-group"><label class="form-label">Password</label><input class="form-input" id="mu-password" type="password"/></div></div>
      <div class="form-group"><label class="form-label">Department</label><select class="form-select" id="mu-dept"><option value="">Select Dept</option>${depts.map(d => `<option value="${d.name}">${d.name}</option>`).join('')}</select></div>
      <div id="mu-stu-fields"><div class="form-row"><div class="form-group"><label class="form-label">Batch</label><select class="form-select" id="mu-batch"><option value="">Select Batch</option></select></div><div class="form-group"><label class="form-label">Roll No</label><input class="form-input" id="mu-rollno"/></div></div></div>
    `, `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="mu-save">Save</button>`);
    
    setTimeout(() => {
      document.getElementById('mu-dept').addEventListener('change', (e) => {
        const dName = e.target.value;
        const dept = depts.find(d => d.name === dName);
        const sel = document.getElementById('mu-batch');
        if (dept && dept.batches) sel.innerHTML = '<option value="">Select Batch</option>' + dept.batches.map(b => `<option value="${b}">${b}</option>`).join('');
        else sel.innerHTML = '<option value="">No batches</option>';
      });

      document.getElementById('mu-save').addEventListener('click', () => {
        const name = document.getElementById('mu-name').value.trim();
        const email = document.getElementById('mu-email').value.trim();
        const pw = document.getElementById('mu-password').value;
        const dept = document.getElementById('mu-dept').value;
        const batch = document.getElementById('mu-batch').value;
        const rollNo = document.getElementById('mu-rollno').value.trim();

        if (!name || !email || !pw || !dept || !batch) {
          App.showToast('Please fill all required fields', 'error'); return;
        }
        
        DB.addUser({
          id: genId('U'),
          role: 'student',
          name, email,
          password: pw,
          department: dept,
          batch,
          rollNo,
          phone: document.getElementById('mu-phone').value.trim(),
          institutionId: App.currentUser.institutionId
        });
        App.closeModal();
        App.showToast('Student created', 'success');
        this.manageUsers();
      });
    }, 0);
  },

  _editUser(id) {
    const user = DB.getUserById(id);
    if (!user) return;
    const depts = DB.getDepartments().filter(d => d.institutionId === App.currentUser.institutionId);
    
    App.showModal('Edit Student', `
      <div class="form-row"><div class="form-group"><label class="form-label">Name</label><input class="form-input" id="eu-name" value="${user.name}"/></div><div class="form-group"><label class="form-label">Email</label><input class="form-input" id="eu-email" value="${user.email}" type="email"/></div></div>
      <div class="form-group"><label class="form-label">Department</label><select class="form-select" id="eu-dept"><option value="">Select Dept</option>${depts.map(d => `<option value="${d.name}" ${d.name === user.department ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Batch</label><select class="form-select" id="eu-batch"><option value="">Select Batch</option></select></div><div class="form-group"><label class="form-label">Roll No</label><input class="form-input" id="eu-rollno" value="${user.rollNo || ''}"/></div></div>
    `, `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="eu-save">Update</button>`);
    
    setTimeout(() => {
      const updateBatches = () => {
        const dName = document.getElementById('eu-dept').value;
        const dept = depts.find(d => d.name === dName);
        const sel = document.getElementById('eu-batch');
        if (dept && dept.batches) sel.innerHTML = '<option value="">Select Batch</option>' + dept.batches.map(b => `<option value="${b}" ${b === user.batch ? 'selected' : ''}>${b}</option>`).join('');
        else sel.innerHTML = '<option value="">No batches</option>';
      };
      updateBatches();
      document.getElementById('eu-dept').addEventListener('change', updateBatches);
      
      document.getElementById('eu-save').addEventListener('click', () => {
        const updates = {
          name: document.getElementById('eu-name').value.trim(),
          email: document.getElementById('eu-email').value.trim(),
          department: document.getElementById('eu-dept').value,
          batch: document.getElementById('eu-batch').value,
          rollNo: document.getElementById('eu-rollno').value.trim()
        };
        DB.updateUser(id, updates);
        App.closeModal();
        App.showToast('Student updated', 'success');
        this.manageUsers();
      });
    }, 0);
  },

  _deleteUser(id) {
    if(confirm('Are you sure you want to delete this student?')) {
      DB.deleteUser(id);
      App.showToast('Student deleted', 'success');
      this.manageUsers();
    }
  },

  dashboard() {
    const u = App.currentUser;
    const subjects = DB.getSubjects({ facultyId: u.id });
    const todayTT = DB.getTimetable({ facultyId: u.id, day: dayName() });
    const facAtt = DB.getFacultyAttendance({ facultyId: u.id });
    const assignments = DB.getAssignments({ facultyId: u.id });
    const anns = DB.getAnnouncements('faculty').slice(0, 3);

    const totalDays = facAtt.length;
    const presentDays = facAtt.filter(a => a.status === 'present').length;
    const attPct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    const pendingAsgn = assignments.filter(a => new Date(a.dueDate) >= new Date(today())).length;

    // To compute students below 75% attendance for all classes taught by this faculty
    let lowAttCount = 0;
    const students = DB.getUsers('student');
    students.forEach(s => {
      const stats = DB.getStudentAttendanceStats(s.id);
      const mySubjectsStats = stats.filter(st => st.subject.facultyId === u.id);
      if (mySubjectsStats.some(st => st.percentage < 75)) {
        lowAttCount++;
      }
    });

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon primary">📚</div><div class="stat-value">${subjects.length}</div><div class="stat-label">My Subjects</div></div>
        <div class="stat-card"><div class="stat-icon secondary">📅</div><div class="stat-value">${todayTT.length}</div><div class="stat-label">Today's Classes</div></div>
        <div class="stat-card"><div class="stat-icon ${attPct >= 75 ? 'success' : 'warning'}">📈</div><div class="stat-value">${attPct}%</div><div class="stat-label">My Attendance</div></div>
        <div class="stat-card"><div class="stat-icon info">⚠️</div><div class="stat-value">${lowAttCount}</div><div class="stat-label">Students < 75% Att.</div></div>
      </div>

      <div class="dashboard-grid">
        <div class="glass-card"><div class="card-header"><h4>Quick Actions</h4></div><div class="card-body" style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="App.navigate('faculty-scan-student')"><span class="icon-scan"></span> Mark Student Attendance</button>
          <button class="btn btn-secondary" onclick="App.navigate('faculty-myqr')"><span class="icon-qr"></span> My Codes</button>
          <button class="btn btn-ghost" onclick="App.navigate('faculty-assignments')"><span class="icon-file"></span> Assignments</button>
        </div></div>

        <div class="glass-card"><div class="card-header"><h4>Today's Schedule</h4></div><div class="card-body">
          ${todayTT.length ? `<table class="data-table"><thead><tr><th>Period</th><th>Time</th><th>Subject</th><th>Batch</th><th>Room</th></tr></thead><tbody>
            ${todayTT.sort((a,b) => a.period - b.period).map(t => { const sub = DB.getSubjectById(t.subjectId); return `<tr><td>P${t.period}</td><td>${t.time}</td><td>${sub ? sub.name : '-'}</td><td>${t.batch}</td><td>${t.room}</td></tr>`; }).join('')}
          </tbody></table>` : '<p class="text-muted text-center">No classes today</p>'}
        </div></div>
      </div>

      <div class="glass-card"><div class="card-header"><h4>Recent Announcements</h4></div><div class="card-body">
        ${anns.map(a => `<div class="announcement-card priority-${a.priority}"><h4>${a.title}</h4><p class="announcement-body">${a.body.substring(0, 100)}...</p><div class="announcement-meta"><span>${formatDate(a.date)}</span><span class="status-badge ${a.priority}">${a.priority}</span></div></div>`).join('') || '<p class="text-muted text-center">No announcements</p>'}
      </div></div>
    </div>`;
  },

  myCode() {
    const u = App.currentUser;
    const entryCode = genUniqueCode(u.id, today(), 'entry');
    const exitCode = genUniqueCode(u.id, today(), 'exit');
    
    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="page-header"><h2>My Entry/Exit Codes</h2></div>
      <div class="glass-card" style="max-width:600px;margin:0 auto"><div class="card-body text-center">
        <h3 class="mb-4">Today's Unique Codes</h3>
        <p class="text-muted mb-4">Provide these codes to the Admin when entering or leaving the campus.</p>
        
        <div style="display:grid;gap:12px;text-align:left;">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;border-left:4px solid var(--success);">
            <div>
              <strong style="font-size:1.1rem;">Entry Code</strong>
              <div class="text-muted" style="font-size:0.9rem;">Show upon arrival</div>
            </div>
            <div style="font-size:1.5rem;font-weight:bold;letter-spacing:2px;color:var(--success);">${entryCode}</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;border-left:4px solid var(--warning);">
            <div>
              <strong style="font-size:1.1rem;">Exit Code</strong>
              <div class="text-muted" style="font-size:0.9rem;">Show upon departure</div>
            </div>
            <div style="font-size:1.5rem;font-weight:bold;letter-spacing:2px;color:var(--warning);">${exitCode}</div>
          </div>
        </div>
      </div></div>
    </div>`;
  },

  markAttendanceList() {
    const u = App.currentUser;
    const subjects = DB.getSubjects({ facultyId: u.id });
    const defaultSub = subjects[0] ? subjects[0].id : '';
    let selectedPeriod = 1;
    let selectedSubject = defaultSub;

    const renderStudentList = () => {
      const sub = DB.getSubjectById(selectedSubject);
      if (!sub) return '<p class="text-muted text-center mt-4">Select a subject to view students</p>';
      
      const students = DB.getUsers('student').filter(s => s.batch === sub.batch);
      if (!students.length) return `
        <div class="glass-card" style="border-left:3px solid var(--warning);margin-top:1rem">
          <div class="card-body">
            <strong style="color:var(--warning)">⚠ No students found for batch: <code>${sub.batch}</code></strong>
            <p class="text-muted mt-2" style="font-size:0.9rem">
              The subject <strong>${sub.name}</strong> is set for batch <code>${sub.batch}</code>.<br>
              Make sure student accounts have their <strong>Batch</strong> field set to <code>${sub.batch}</code>.<br>
              Ask your Admin to update the students' batch in <em>Manage Users</em>.
            </p>
          </div>
        </div>`;
      
      // Get today's attendance to see who is already marked
      const todayRecords = DB.getStudentAttendance({ subjectId: selectedSubject, date: today(), period: selectedPeriod });
      
      return `
        <div class="table-wrap mt-4">
          <table class="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Code Input</th>
                <th>Action / Status</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => {
                const marked = todayRecords.find(r => r.studentId === s.id);
                if (marked) {
                  return `<tr>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.rollNo || '-'}</td>
                    <td>-</td>
                    <td><span class="status-badge ${marked.status}">${marked.status}</span></td>
                  </tr>`;
                } else {
                  return `<tr>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.rollNo || '-'}</td>
                    <td><input type="text" class="form-input code-input" id="code-${s.id}" placeholder="6-digit code" style="width:120px; font-family:monospace; letter-spacing:1px;" maxlength="6"/></td>
                    <td>
                      <button class="btn btn-primary btn-sm mark-btn" data-student="${s.id}" data-action="present">Present</button>
                      <button class="btn btn-warning btn-sm mark-btn" data-student="${s.id}" data-action="late">Late</button>
                    </td>
                  </tr>`;
                }
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="mt-4 text-right">
          <button class="btn btn-danger" id="mark-remaining-absent">Submit Remaining as Absent</button>
        </div>
      `;
    };

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="page-header"><h2>Mark Class Attendance</h2><span class="text-muted">${formatDate(today())}</span></div>

      <div class="dashboard-grid">
        <div class="glass-card"><div class="card-header"><h4>Class Setup</h4></div><div class="card-body">
          <div class="form-group"><label class="form-label">Subject</label>
            <select class="form-select" id="scan-subject">
              ${subjects.map(s => `<option value="${s.id}">${s.name} (${s.code}) — Batch: ${s.batch || 'Any'}</option>`).join('')}
            </select>
          </div>
          <div id="batch-info-badge" style="margin-bottom:12px"></div>
          <div class="form-group"><label class="form-label">Period</label>
            <div class="period-selector" id="period-selector">${[1,2,3,4,5,6,7,8].map(p => `<button class="period-pill ${p === 1 ? 'active' : ''}" data-period="${p}">${p}</button>`).join('')}</div></div>
        </div></div>

        <div class="glass-card" style="grid-column: 1 / -1;"><div class="card-header"><h4>Student List</h4></div><div class="card-body">
          <div id="student-att-list">${renderStudentList()}</div>
        </div></div>
      </div>
    </div>`;

    const attachListEvents = () => {
      document.querySelectorAll('.mark-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const studentId = e.target.dataset.student;
          const action = e.target.dataset.action; // 'present' or 'late'
          const codeInput = document.getElementById(`code-${studentId}`).value.trim();
          
          if (!codeInput) {
            App.showToast('Please enter the code provided by the student.', 'error');
            return;
          }
          
          const expectedCode = genUniqueCode(studentId, today(), selectedPeriod);
          if (codeInput !== expectedCode) {
            App.showToast('Invalid code! Please check again.', 'error');
            return;
          }
          
          DB.addStudentAttendance({ id: genId('SA'), studentId, subjectId: selectedSubject, date: today(), period: selectedPeriod, status: action, markedBy: u.id, timestamp: now() });
          App.showToast(`Marked ${action} successfully`, 'success');
          document.getElementById('student-att-list').innerHTML = renderStudentList();
          attachListEvents();
        });
      });

      const markRemBtn = document.getElementById('mark-remaining-absent');
      if (markRemBtn) {
        markRemBtn.addEventListener('click', () => {
          const sub = DB.getSubjectById(selectedSubject);
          if (!sub) return;
          const students = DB.getUsers('student').filter(s => s.batch === sub.batch);
          const todayRecords = DB.getStudentAttendance({ subjectId: selectedSubject, date: today(), period: selectedPeriod });
          
          let count = 0;
          students.forEach(s => {
            const marked = todayRecords.find(r => r.studentId === s.id);
            if (!marked) {
              DB.addStudentAttendance({ id: genId('SA'), studentId: s.id, subjectId: selectedSubject, date: today(), period: selectedPeriod, status: 'absent', markedBy: u.id, timestamp: now() });
              count++;
            }
          });
          App.showToast(`Marked ${count} remaining students as absent.`, 'info');
          document.getElementById('student-att-list').innerHTML = renderStudentList();
          attachListEvents();
        });
      }
    };

    const updateBatchBadge = () => {
      const sub = DB.getSubjectById(selectedSubject);
      const badge = document.getElementById('batch-info-badge');
      if (!badge) return;
      if (sub) {
        const studentCount = DB.getUsers('student').filter(s => s.batch === sub.batch).length;
        badge.innerHTML = `<span class="status-badge" style="background:rgba(99,102,241,0.15);color:var(--primary);font-size:0.8rem">
          Batch: <strong>${sub.batch || 'Not Set'}</strong> &nbsp;|&nbsp; ${studentCount} student(s)
        </span>`;
      }
    };

    setTimeout(() => {
      updateBatchBadge();
      document.querySelectorAll('#period-selector .period-pill').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('#period-selector .period-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); selectedPeriod = parseInt(btn.dataset.period);
        document.getElementById('student-att-list').innerHTML = renderStudentList();
        attachListEvents();
      }));
      const scanSubSelect = document.getElementById('scan-subject');
      if (scanSubSelect) {
        scanSubSelect.addEventListener('change', function() {
          selectedSubject = this.value;
          updateBatchBadge();
          document.getElementById('student-att-list').innerHTML = renderStudentList();
          attachListEvents();
        });
      }
      attachListEvents();
    }, 0);
  },

  myAttendance() {
    const u = App.currentUser;
    const records = DB.getFacultyAttendance({ facultyId: u.id });
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const leave = records.filter(r => r.status === 'leave').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="page-header"><h2>My Attendance</h2></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon primary">📅</div><div class="stat-value">${total}</div><div class="stat-label">Total Days</div></div>
        <div class="stat-card"><div class="stat-icon success">✓</div><div class="stat-value">${present}</div><div class="stat-label">Present</div></div>
        <div class="stat-card"><div class="stat-icon warning">🏖️</div><div class="stat-value">${leave}</div><div class="stat-label">Leave</div></div>
        <div class="stat-card"><div class="stat-icon danger">✕</div><div class="stat-value">${absent}</div><div class="stat-label">Absent</div></div>
      </div>
      <div class="glass-card mb-5"><div class="card-body"><div class="flex-between mb-2"><span style="font-weight:600">Attendance</span><span>${pct}%</span></div><div class="attendance-bar"><div class="fill ${pct >= 75 ? 'green' : pct >= 60 ? 'amber' : 'rose'}" style="width:${pct}%"></div></div></div></div>
      <div class="table-wrap glass-card"><table class="data-table"><thead><tr><th>Date</th><th>Status</th><th>Entry Time</th><th>Exit Time</th><th>Duration</th></tr></thead><tbody>
        ${records.sort((a,b) => new Date(b.date) - new Date(a.date)).map(r => {
          const entryStr = r.entryTime ? new Date(r.entryTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-';
          const exitStr = r.exitTime ? new Date(r.exitTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-';
          let durStr = '-';
          if (r.entryTime && r.exitTime) {
            const diffMin = Math.round((new Date(r.exitTime) - new Date(r.entryTime)) / 60000);
            const h = Math.floor(diffMin / 60), m = diffMin % 60;
            durStr = `${h}h ${m}m`;
          }
          return `<tr><td>${formatDate(r.date)}</td><td><span class="status-badge ${r.status}">${r.status}</span></td><td>${entryStr}</td><td>${exitStr}</td><td>${durStr}</td></tr>`;
        }).join('') || '<tr><td colspan="5" class="text-center text-muted">No records</td></tr>'}
      </tbody></table></div>
    </div>`;
  },

  classAttendance() {
    const u = App.currentUser;
    const subjects = DB.getSubjects({ facultyId: u.id });
    const render = (subjectId, dateVal) => {
      const filter = {}; if (subjectId) filter.subjectId = subjectId; if (dateVal) filter.date = dateVal; filter.markedBy = u.id;
      const records = DB.getStudentAttendance(filter);
      const p = records.filter(r => r.status === 'present').length, l = records.filter(r => r.status === 'late').length, a = records.filter(r => r.status === 'absent').length;
      return `<div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-card"><div class="stat-icon success">✓</div><div class="stat-value">${p}</div><div class="stat-label">Present</div></div>
        <div class="stat-card"><div class="stat-icon warning">⏰</div><div class="stat-value">${l}</div><div class="stat-label">Late</div></div>
        <div class="stat-card"><div class="stat-icon danger">✕</div><div class="stat-value">${a}</div><div class="stat-label">Absent</div></div>
      </div>
      <div class="table-wrap glass-card"><table class="data-table"><thead><tr><th>Student</th><th>Roll No</th><th>Period</th><th>Status</th><th>Time</th></tr></thead><tbody>
        ${records.map(r => { const s = DB.getUserById(r.studentId); return `<tr><td>${s ? s.name : r.studentId}</td><td>${s ? s.rollNo || '-' : '-'}</td><td>P${r.period}</td><td><span class="status-badge ${r.status}">${r.status}</span></td><td>${formatDateTime(r.timestamp)}</td></tr>`; }).join('') || '<tr><td colspan="5" class="text-center text-muted">No records</td></tr>'}
      </tbody></table></div>`;
    };

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>Class Attendance</h2></div>
      <div class="filter-row">
        <div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="ca-sub"><option value="">All Subjects</option>${subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="ca-date" value="${today()}"/></div>
        <button class="btn btn-primary" id="ca-go">Filter</button>
      </div>
      <div id="ca-results">${render(subjects[0]?.id || '', today())}</div>
    </div>`;
    setTimeout(() => { document.getElementById('ca-go').addEventListener('click', () => { document.getElementById('ca-results').innerHTML = render(document.getElementById('ca-sub').value, document.getElementById('ca-date').value); }); }, 0);
  },

  timetable() {
    const u = App.currentUser;
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const subjects = DB.getSubjects({ facultyId: u.id });
    
    const renderDay = (day) => {
      const tt = DB.getTimetable({ facultyId: u.id, day });
      if (!tt.length) return '<p class="text-muted text-center p-4">No classes scheduled. Click "Add Class" below to schedule one.</p>';
      return `<table class="data-table"><thead><tr><th>Period</th><th>Time</th><th>Subject</th><th>Batch</th><th>Room</th><th>Actions</th></tr></thead><tbody>
        ${tt.sort((a,b) => a.period - b.period).map(t => { 
          const sub = DB.getSubjectById(t.subjectId); 
          return `<tr>
            <td>P${t.period}</td>
            <td>${t.time}</td>
            <td>${sub ? sub.name : '-'}</td>
            <td>${t.batch}</td>
            <td>${t.room}</td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="FacultyViews._editTimetableEntry('${t.id}')">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="FacultyViews._deleteTimetableEntry('${t.id}')">🗑️</button>
            </td>
          </tr>`; 
        }).join('')}
      </tbody></table>`;
    };

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="page-header">
        <h2>My Timetable</h2>
        <div class="page-header-actions">
          <button class="btn btn-secondary" id="fac-add-sub-btn" style="margin-right:8px"><span class="icon-add"></span> Add Subject</button>
          <button class="btn btn-primary" id="fac-add-class-btn"><span class="icon-add"></span> Add Class</button>
        </div>
      </div>
      <div class="tab-nav" id="tt-days">${days.map(d => `<button class="tab-btn ${d === dayName() ? 'active' : ''}" data-day="${d}">${d.substring(0,3)}</button>`).join('')}</div>
      <div id="tt-out" class="glass-card"><div class="card-body">${renderDay(dayName() || 'Monday')}</div></div>
    </div>`;

    setTimeout(() => { 
      document.querySelectorAll('#tt-days .tab-btn').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('#tt-days .tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
        document.querySelector('#tt-out .card-body').innerHTML = renderDay(btn.dataset.day);
      }));

      document.getElementById('fac-add-sub-btn').addEventListener('click', () => FacultyViews._addSubjectModal());

      document.getElementById('fac-add-class-btn').addEventListener('click', () => {
        const activeDay = document.querySelector('#tt-days .tab-btn.active')?.dataset.day || 'Monday';
        const depts = DB.getDepartments().filter(d => d.institutionId === App.currentUser.institutionId);
        
        App.showModal('Add Timetable Class', `
          <div class="form-row">
            <div class="form-group"><label class="form-label">Day</label><select class="form-select" id="add-tt-day">${days.map(d => `<option ${d === activeDay ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Period</label><input type="number" class="form-input" id="add-tt-period" min="1" value="1"/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Start Time</label><input type="time" class="form-input" id="add-tt-start" value="09:00" required/></div>
            <div class="form-group"><label class="form-label">End Time</label><input type="time" class="form-input" id="add-tt-end" value="10:00" required/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Room</label><input class="form-input" id="add-tt-room" required placeholder="e.g. Room 402"/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="add-tt-sub">${subjects.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Batch</label><input class="form-input" id="add-tt-batch" placeholder="e.g. CS-2026" required readonly/></div>
          </div>
        `, `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="add-tt-save">Save</button>`);

        const subSelector = document.getElementById('add-tt-sub');
        if (subSelector && subjects.length > 0) {
          const updateBatch = () => {
            const selectedSub = DB.getSubjectById(subSelector.value);
            if (selectedSub) document.getElementById('add-tt-batch').value = selectedSub.batch;
          };
          subSelector.addEventListener('change', updateBatch);
          updateBatch();
        }

        document.getElementById('add-tt-save').addEventListener('click', () => {
          const day = document.getElementById('add-tt-day').value;
          const period = parseInt(document.getElementById('add-tt-period').value);
          const time = `${document.getElementById('add-tt-start').value} - ${document.getElementById('add-tt-end').value}`;
          const room = document.getElementById('add-tt-room').value.trim();
          const subjectId = document.getElementById('add-tt-sub').value;
          const batch = document.getElementById('add-tt-batch').value.trim();

          if (!time || !room || !subjectId || !batch || isNaN(period)) {
            App.showToast('Please fill all fields correctly', 'error');
            return;
          }

          const conflict = DB.getTimetable({ batch, day, period }).length > 0;
          if (conflict) {
            App.showToast(`Conflict: Class already scheduled for P${period} on ${day} for ${batch}`, 'error');
            return;
          }

          DB.addTimetable({ id: genId('TT'), batch, day, period, time, subjectId, facultyId: u.id, room });
          App.closeModal();
          App.showToast('Timetable entry added successfully', 'success');
          setTimeout(() => FacultyViews.timetable(), 300);
        });
      });
    }, 0);
  },

  _addSubjectModal() {
    const depts = DB.getDepartments().filter(d => d.institutionId === App.currentUser.institutionId);
    
    App.showModal('Add Subject', `
      <div class="form-group"><label class="form-label">Subject Name</label><input class="form-input" id="fac-sub-name" required placeholder="e.g. Data Structures"/></div>
      <div class="form-group"><label class="form-label">Subject Code</label><input class="form-input" id="fac-sub-code" required placeholder="e.g. CS-201"/></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Department</label><select class="form-select" id="fac-sub-dept"><option value="">Select Dept</option>${depts.map(d => `<option value="${d.name}">${d.name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Batch</label><select class="form-select" id="fac-sub-batch"><option value="">Select Batch</option></select></div>
      </div>
    `, `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="fac-sub-save">Save</button>`);

    setTimeout(() => {
      document.getElementById('fac-sub-dept').addEventListener('change', (e) => {
        const dName = e.target.value;
        const dept = depts.find(d => d.name === dName);
        const sel = document.getElementById('fac-sub-batch');
        if (dept && dept.batches) sel.innerHTML = '<option value="">Select Batch</option>' + dept.batches.map(b => `<option value="${b}">${b}</option>`).join('');
        else sel.innerHTML = '<option value="">No batches</option>';
      });

      document.getElementById('fac-sub-save').addEventListener('click', () => {
        const name = document.getElementById('fac-sub-name').value.trim();
        const code = document.getElementById('fac-sub-code').value.trim();
        const dept = document.getElementById('fac-sub-dept').value;
        const batch = document.getElementById('fac-sub-batch').value;

        if (!name || !code || !dept || !batch) {
          App.showToast('All fields are required', 'error'); return;
        }
        
        DB.addSubject({ id: genId('SUB'), name, code, facultyId: App.currentUser.id, department: dept, batch });
        App.closeModal();
        App.showToast('Subject created successfully', 'success');
        FacultyViews.timetable();
      });
    }, 0);
  },

  _editTimetableEntry(id) {
    const entry = DB.getTimetable().find(t => t.id === id);
    if (!entry) return;
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const subjects = DB.getSubjects({ facultyId: App.currentUser.id });

    App.showModal('Edit Timetable Class', `
      <div class="form-row">
        <div class="form-group"><label class="form-label">Day</label><select class="form-select" id="edit-tt-day">${days.map(d => `<option ${d === entry.day ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Period</label><input type="number" class="form-input" id="edit-tt-period" min="1" value="${entry.period}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Start Time</label><input type="time" class="form-input" id="edit-tt-start" value="${entry.time.split(' - ')[0] || '09:00'}" required/></div>
        <div class="form-group"><label class="form-label">End Time</label><input type="time" class="form-input" id="edit-tt-end" value="${entry.time.split(' - ')[1] || '10:00'}" required/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Room</label><input class="form-input" id="edit-tt-room" value="${entry.room}" required/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="edit-tt-sub">${subjects.map(s => `<option value="${s.id}" ${s.id === entry.subjectId ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Batch</label><input class="form-input" id="edit-tt-batch" value="${entry.batch}" required/></div>
      </div>
    `, `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="edit-tt-save">Update</button>`);

    document.getElementById('edit-tt-save').addEventListener('click', () => {
      const day = document.getElementById('edit-tt-day').value;
      const period = parseInt(document.getElementById('edit-tt-period').value);
      const time = `${document.getElementById('edit-tt-start').value} - ${document.getElementById('edit-tt-end').value}`;
      const room = document.getElementById('edit-tt-room').value.trim();
      const subjectId = document.getElementById('edit-tt-sub').value;
      const batch = document.getElementById('edit-tt-batch').value.trim();

      if (!time || !room || !subjectId || !batch || isNaN(period)) {
        App.showToast('Please fill all fields correctly', 'error');
        return;
      }

      DB.updateTimetable(id, { batch, day, period, time, subjectId, room });
      App.closeModal();
      App.showToast('Timetable entry updated', 'success');
      setTimeout(() => FacultyViews.timetable(), 300);
    });
  },

  _deleteTimetableEntry(id) {
    App.showModal('Confirm Delete', '<p>Are you sure you want to delete this timetable entry?</p>', `
      <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-danger" id="del-tt-confirm">Delete</button>
    `);
    document.getElementById('del-tt-confirm').addEventListener('click', () => {
      DB.deleteTimetable(id);
      App.closeModal();
      App.showToast('Entry deleted', 'success');
      setTimeout(() => FacultyViews.timetable(), 300);
    });
  },

  assignments() {
    const u = App.currentUser;
    const asgns = DB.getAssignments({ facultyId: u.id });
    const subjects = DB.getSubjects({ facultyId: u.id });

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>Assignments & Grading</h2><button class="btn btn-primary" id="add-asgn"><span class="icon-add"></span> New Assignment</button></div>
      ${asgns.length ? asgns.map(a => { 
        const sub = DB.getSubjectById(a.subjectId); 
        const totalStu = DB.getUsers('student').filter(s => s.batch === a.batch).length;
        const subCount = a.submissions ? a.submissions.length : 0;
        return `<div class="glass-card mb-4"><div class="card-body">
          <div class="flex-between">
            <div>
              <h4>${a.title}</h4>
              <p class="text-muted" style="font-size:var(--fs-sm)">${sub ? sub.name : '-'} · ${a.batch} · Due: ${formatDate(a.dueDate)}</p>
            </div>
            <div class="text-right">
              <div style="font-size:var(--fs-lg);font-weight:700">${subCount}/${totalStu}</div>
              <div class="text-muted" style="font-size:var(--fs-xs)">Submissions</div>
            </div>
          </div>
          <p class="mt-3" style="font-size:var(--fs-sm);color:var(--text-secondary)">${a.description}</p>
          <div class="mt-3 flex-between flex-wrap gap-2">
            <div>
              <span class="status-badge">Max: ${a.maxMarks || 20} marks</span>
              ${a.pdfPath ? `<a href="${BASE_URL}/uploads/${a.pdfPath}" target="_blank" class="btn btn-ghost btn-sm ml-2">📄 Download Question PDF</a>` : ''}
            </div>
            <button class="btn btn-secondary btn-sm" onclick="FacultyViews._viewSubmissions('${a.id}')">Grade Submissions</button>
          </div>
        </div></div>`; 
      }).join('') : '<div class="empty-state"><div class="empty-icon">📄</div><h3>No assignments</h3></div>'}
    </div>`;

    setTimeout(() => {
      document.getElementById('add-asgn').addEventListener('click', () => {
        App.showModal('New Assignment (Drag & Drop)', `
          <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="asgn-title" required/></div>
          <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="asgn-desc" rows="2"></textarea></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="asgn-sub">${subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Batch</label><input class="form-input" id="asgn-batch" value="${subjects[0]?.batch || ''}"/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Due Date</label><input type="date" class="form-input" id="asgn-due"/></div>
            <div class="form-group"><label class="form-label">Max Marks</label><input type="number" class="form-input" id="asgn-marks" value="20"/></div>
          </div>
          <div class="form-group">
            <label class="form-label">Question PDF (Drag & Drop or click to browse)</label>
            <div class="drag-drop-zone" id="asgn-dropzone">
              <span class="drag-icon">📁</span>
              <p>Drag file here or click to upload</p>
              <input type="file" id="asgn-file" accept="application/pdf" style="display:none" />
              <div id="file-name-preview" class="text-success mt-2 font-semibold"></div>
            </div>
          </div>
        `, `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="asgn-save">Create</button>`);

        const subEl = document.getElementById('asgn-sub');
        if (subEl) {
          subEl.addEventListener('change', function() {
            const s = DB.getSubjectById(this.value);
            if (s) document.getElementById('asgn-batch').value = s.batch;
          });
        }

        const dropzone = document.getElementById('asgn-dropzone');
        const fileInput = document.getElementById('asgn-file');
        const preview = document.getElementById('file-name-preview');

        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropzone.classList.remove('dragover');
          if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            preview.textContent = fileInput.files[0].name;
          }
        });
        fileInput.addEventListener('change', () => {
          if (fileInput.files.length) preview.textContent = fileInput.files[0].name;
        });

        document.getElementById('asgn-save').addEventListener('click', async () => {
          const title = document.getElementById('asgn-title').value.trim();
          if (!title) { App.showToast('Title required', 'error'); return; }
          const fd = new FormData();
          fd.append('title', title);
          fd.append('description', document.getElementById('asgn-desc').value);
          fd.append('subjectId', document.getElementById('asgn-sub').value);
          fd.append('facultyId', u.id);
          fd.append('batch', document.getElementById('asgn-batch').value);
          fd.append('dueDate', document.getElementById('asgn-due').value);
          fd.append('maxMarks', document.getElementById('asgn-marks').value);
          if (fileInput.files.length) fd.append('pdf', fileInput.files[0]);

          App.showToast('Uploading assignment...', 'info');
          const result = await DB.addAssignmentWithPDF(fd);
          if (result.success) {
            App.closeModal();
            App.showToast('Assignment created successfully', 'success');
            FacultyViews.assignments();
          } else {
            App.showToast(result.error || 'Failed to upload assignment', 'error');
          }
        });
      });
    }, 0);
  },

  _viewSubmissions(asgnId) {
    const asgn = DB.getAssignments().find(a => a.id === asgnId);
    if (!asgn) return;
    const subs = asgn.submissions || [];
    
    const renderSubmissionList = () => {
      if (!subs.length) return '<p class="text-muted text-center p-4">No submissions received yet.</p>';
      return `<table class="data-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Submitted At</th>
            <th>Submission PDF</th>
            <th>Grade / Score (Max ${asgn.maxMarks || 20})</th>
          </tr>
        </thead>
        <tbody>
          ${subs.map(s => {
            const stu = DB.getUserById(s.studentId);
            return `<tr>
              <td><strong>${stu ? stu.name : s.studentId}</strong></td>
              <td>${formatDateTime(s.submittedAt)}</td>
              <td>
                ${s.content ? `<a href="${BASE_URL}/uploads/${s.content}" target="_blank" class="btn btn-ghost btn-sm">📄 Open PDF</a>` : '-'}
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <input type="number" class="form-input" style="width:70px" id="score-${s.studentId}" value="${s.score || ''}" min="0" max="${asgn.maxMarks || 20}"/>
                  <button class="btn btn-primary btn-sm" onclick="FacultyViews._saveScore('${asgnId}', '${s.studentId}')">Save</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    };

    App.showModal(`Submissions for: ${asgn.title}`, `
      <div class="table-wrap">${renderSubmissionList()}</div>
    `, `<button class="btn btn-ghost" onclick="App.closeModal()">Close</button>`);
  },

  async _saveScore(asgnId, studentId) {
    const scoreVal = parseInt(document.getElementById(`score-${studentId}`).value);
    if (isNaN(scoreVal)) {
      App.showToast('Please enter a valid numeric score', 'error');
      return;
    }
    const asgn = DB.getAssignments().find(a => a.id === asgnId);
    const maxMarks = asgn ? asgn.maxMarks || 20 : 20;

    const res = await DB.scoreAssignment(asgnId, studentId, scoreVal, maxMarks);
    if (res.success) {
      App.showToast('Score updated successfully', 'success');
    } else {
      App.showToast(res.error || 'Failed to grade submission', 'error');
    }
  },

  marksEntry() {
    const u = App.currentUser;
    const subjects = DB.getSubjects({ facultyId: u.id });

    const renderMarks = (subjectId) => {
      if (!subjectId) return '<p class="text-muted text-center">Select a subject</p>';
      const sub = DB.getSubjectById(subjectId);
      const students = DB.getUsers('student').filter(s => s.batch === sub.batch);
      const existingMarks = DB.getMarks({ subjectId });
      return `<div class="form-row mb-4"><div class="form-group"><label class="form-label">Exam Type</label><input class="form-input" id="mk-exam" placeholder="e.g. Internal 1"/></div>
        <div class="form-group"><label class="form-label">Max Marks</label><input type="number" class="form-input" id="mk-max" value="50"/></div></div>
        <table class="data-table"><thead><tr><th>Student</th><th>Roll No</th><th>Marks</th></tr></thead><tbody>
        ${students.map(s => `<tr><td>${s.name}</td><td>${s.rollNo || '-'}</td><td><input type="number" class="form-input" style="width:80px" data-student="${s.id}" value=""/></td></tr>`).join('')}
        </tbody></table>
        <button class="btn btn-primary mt-4" id="save-marks">Save Marks</button>
        ${existingMarks.length ? `<div class="divider"></div><h4>Existing Records</h4><table class="data-table mt-3"><thead><tr><th>Student</th><th>Exam</th><th>Marks</th><th>Max</th></tr></thead><tbody>
          ${existingMarks.map(m => { const s = DB.getUserById(m.studentId); return `<tr><td>${s ? s.name : m.studentId}</td><td>${m.examType}</td><td>${m.marksObtained}</td><td>${m.maxMarks}</td></tr>`; }).join('')}
        </tbody></table>` : ''}`;
    };

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>Marks Entry</h2></div>
      <div class="filter-row"><div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="mk-sub"><option value="">Select Subject</option>${subjects.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('')}</select></div></div>
      <div class="glass-card"><div class="card-body" id="mk-content"><p class="text-muted text-center">Select a subject to begin</p></div></div>
    </div>`;

    setTimeout(() => {
      document.getElementById('mk-sub').addEventListener('change', function() {
        document.getElementById('mk-content').innerHTML = renderMarks(this.value);
        setTimeout(() => {
          const saveBtn = document.getElementById('save-marks');
          if (saveBtn) saveBtn.addEventListener('click', () => {
            const exam = document.getElementById('mk-exam').value.trim();
            const max = parseInt(document.getElementById('mk-max').value) || 50;
            if (!exam) { App.showToast('Enter exam type', 'error'); return; }
            let count = 0;
            document.querySelectorAll('[data-student]').forEach(inp => {
              const marks = parseInt(inp.value);
              if (!isNaN(marks)) { DB.addMark({ id: genId('MK'), studentId: inp.dataset.student, subjectId: document.getElementById('mk-sub').value, examType: exam, marksObtained: marks, maxMarks: max, date: today() }); count++; }
            });
            App.showToast(`${count} marks saved`, 'success');
            document.getElementById('mk-content').innerHTML = renderMarks(document.getElementById('mk-sub').value);
          });
        }, 0);
      });
    }, 0);
  },

  leaveRequest() {
    const u = App.currentUser;
    const leaves = DB.getLeaveRequests({ userId: u.id });

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>Leave Request</h2></div>
      <div class="dashboard-grid">
        <div class="glass-card"><div class="card-header"><h4>Apply for Leave</h4></div><div class="card-body">
          <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="lv-type"><option>Medical</option><option>Personal</option><option>Other</option></select></div>
          <div class="form-row"><div class="form-group"><label class="form-label">From</label><input type="date" class="form-input" id="lv-from"/></div>
          <div class="form-group"><label class="form-label">To</label><input type="date" class="form-input" id="lv-to"/></div></div>
          <div class="form-group"><label class="form-label">Reason</label><textarea class="form-textarea" id="lv-reason" rows="3" placeholder="Describe the reason..."></textarea></div>
          <button class="btn btn-primary w-full" id="lv-submit">Submit Leave Request</button>
        </div></div>
        <div class="glass-card"><div class="card-header"><h4>My Leave History</h4></div><div class="card-body">
          ${leaves.length ? leaves.map(l => `<div class="leave-card"><div class="leave-card-header"><div><strong>${l.type}</strong></div><span class="status-badge ${l.status}">${l.status}</span></div><div class="leave-card-body">${l.reason}</div><div class="leave-dates">📅 ${formatDate(l.from)} → ${formatDate(l.to)}</div></div>`).join('')
          : '<p class="text-muted text-center">No leave requests</p>'}
        </div></div>
      </div>
    </div>`;

    setTimeout(() => {
      document.getElementById('lv-submit').addEventListener('click', () => {
        const from = document.getElementById('lv-from').value;
        const to = document.getElementById('lv-to').value;
        const reason = document.getElementById('lv-reason').value.trim();
        if (!from || !to || !reason) { App.showToast('Fill all fields', 'error'); return; }
        DB.addLeaveRequest({ id: genId('LR'), userId: u.id, role: 'faculty', type: document.getElementById('lv-type').value, from, to, reason, status: 'pending', appliedOn: today(), reviewedBy: null, reviewedOn: null });
        App.showToast('Leave request submitted', 'success'); FacultyViews.leaveRequest();
      });
    }, 0);
  },

  profile() {
    const u = App.currentUser;
    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>My Profile</h2></div>
      <div class="dashboard-grid">
        <div class="profile-card"><div class="avatar avatar-lg">${u.avatar}</div><h2>${u.name}</h2><span class="status-badge faculty">Faculty</span>
          <div class="profile-details">
            <div class="profile-detail-item"><div class="detail-label">User ID</div><div class="detail-value">${u.id}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Email</div><div class="detail-value">${u.email}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Phone</div><div class="detail-value">${u.phone || '-'}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Department</div><div class="detail-value">${u.department}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Joined</div><div class="detail-value">${formatDate(u.joined)}</div></div>
          </div>
        </div>
        <div class="glass-card"><div class="card-header"><h4>My QR Code</h4></div><div class="card-body"><div class="qr-display"><div class="qr-frame" id="fac-prof-qr"></div><div class="qr-instructions">Show to Admin for attendance</div></div></div></div>
      </div>
    </div>`;
    setTimeout(() => QRManager.render('fac-prof-qr', u, 200), 100);
  }
};
