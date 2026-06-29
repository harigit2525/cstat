// ============================================================
// CStat — faculty.js  |  Faculty Dashboard & Views
// ============================================================

const FacultyViews = {

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

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon primary">📚</div><div class="stat-value">${subjects.length}</div><div class="stat-label">My Subjects</div></div>
        <div class="stat-card"><div class="stat-icon secondary">📅</div><div class="stat-value">${todayTT.length}</div><div class="stat-label">Today's Classes</div></div>
        <div class="stat-card"><div class="stat-icon ${attPct >= 75 ? 'success' : 'warning'}">📈</div><div class="stat-value">${attPct}%</div><div class="stat-label">My Attendance</div></div>
        <div class="stat-card"><div class="stat-icon info">📄</div><div class="stat-value">${pendingAsgn}</div><div class="stat-label">Active Assignments</div></div>
      </div>

      <div class="dashboard-grid">
        <div class="glass-card"><div class="card-header"><h4>Quick Actions</h4></div><div class="card-body" style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="App.navigate('faculty-scan-student')"><span class="icon-scan"></span> Scan Student QR</button>
          <button class="btn btn-secondary" onclick="App.navigate('faculty-myqr')"><span class="icon-qr"></span> My QR Code</button>
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

  myQR() {
    const u = App.currentUser;
    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="page-header"><h2>My QR Code</h2></div>
      <div class="glass-card" style="max-width:500px;margin:0 auto">
        <div class="card-body">
          <div class="qr-display">
            <div class="qr-frame" id="faculty-qr-container"></div>
            <div class="qr-info"><h3>${u.name}</h3><p>${u.id} · ${u.department}</p><p class="text-muted">${u.email}</p></div>
            <div class="qr-instructions">Show this QR code to the Admin for day-wise attendance marking</div>
          </div>
        </div>
      </div>
    </div>`;
    setTimeout(() => QRManager.render('faculty-qr-container', u, 250), 100);
  },

  scanStudentQR() {
    const u = App.currentUser;
    const subjects = DB.getSubjects({ facultyId: u.id });
    const defaultSub = subjects[0] ? subjects[0].id : '';
    let selectedPeriod = 1;
    let selectedSubject = defaultSub;

    const renderTodayAtt = () => {
      const records = DB.getStudentAttendance({ subjectId: selectedSubject, date: today() });
      if (!records.length) return '<p class="text-muted text-center mt-4">No attendance marked yet</p>';
      return `<table class="data-table mt-4"><thead><tr><th>Student</th><th>Roll No</th><th>Period</th><th>Status</th><th>Time</th></tr></thead><tbody>
        ${records.map(r => { const s = DB.getUserById(r.studentId); return `<tr><td>${s ? s.name : r.studentId}</td><td>${s ? s.rollNo || '-' : '-'}</td><td>P${r.period}</td><td><span class="status-badge ${r.status}">${r.status}</span></td><td>${formatDateTime(r.timestamp)}</td></tr>`; }).join('')}
      </tbody></table>`;
    };

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="page-header"><h2>Scan Student QR — Period Attendance</h2><span class="text-muted">${formatDate(today())}</span></div>

      <div class="dashboard-grid">
        <div class="glass-card"><div class="card-header"><h4>Scanner Setup</h4></div><div class="card-body">
          <div class="form-group"><label class="form-label">Subject</label>
            <select class="form-select" id="scan-subject">${subjects.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Period</label>
            <div class="period-selector" id="period-selector">${[1,2,3,4,5,6,7,8].map(p => `<button class="period-pill ${p === 1 ? 'active' : ''}" data-period="${p}">${p}</button>`).join('')}</div></div>
          <div class="divider"></div>
          <div id="faculty-scanner-container"><div class="text-center">
            <button class="btn btn-primary btn-lg" id="start-stu-scan"><span class="icon-scan"></span> Start Camera Scanner</button>
            <p class="text-muted mt-3">Point camera at student's QR code</p>
          </div></div>
          <div id="stu-scan-result" style="display:none"></div>
        </div></div>

        <div class="glass-card"><div class="card-header"><h4>Today's Attendance</h4></div><div class="card-body">
          <div id="today-att-list">${renderTodayAtt()}</div>
        </div></div>
      </div>
    </div>`;

    setTimeout(() => {
      document.querySelectorAll('#period-selector .period-pill').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('#period-selector .period-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); selectedPeriod = parseInt(btn.dataset.period);
      }));
      document.getElementById('scan-subject').addEventListener('change', function() { selectedSubject = this.value; document.getElementById('today-att-list').innerHTML = renderTodayAtt(); });

      document.getElementById('start-stu-scan').addEventListener('click', () => {
        QRScanner.start(document.getElementById('faculty-scanner-container'), (data) => {
          if (data.role !== 'student') { App.showToast('Not a student QR code', 'error'); return; }
          const stu = DB.getUserById(data.id);
          if (!stu) { App.showToast('Student not found', 'error'); return; }
          const res = document.getElementById('stu-scan-result');
          res.style.display = 'block';
          res.innerHTML = `<div class="scan-result"><div class="result-header"><div class="avatar">${stu.avatar}</div><div><div class="result-name">${stu.name}</div><p class="text-muted">${stu.rollNo || ''} · ${stu.batch} · ${stu.department}</p></div></div>
            <p class="text-muted mb-3">Subject: <strong>${DB.getSubjectById(selectedSubject)?.name || '-'}</strong> | Period: <strong>P${selectedPeriod}</strong></p>
            <div class="mark-btn-group">
              <button class="mark-btn present" id="mark-present">✓ Present</button>
              <button class="mark-btn late" id="mark-late">⏰ Late</button>
              <button class="mark-btn absent" id="mark-absent">✕ Absent</button>
            </div></div>`;

          ['present', 'late', 'absent'].forEach(status => {
            document.getElementById(`mark-${status}`).addEventListener('click', () => {
              DB.addStudentAttendance({ id: genId('SA'), studentId: stu.id, subjectId: selectedSubject, date: today(), period: selectedPeriod, status, markedBy: u.id, timestamp: now() });
              App.showToast(`${stu.name} marked as ${status}`, 'success');
              res.style.display = 'none';
              document.getElementById('today-att-list').innerHTML = renderTodayAtt();
            });
          });
        });
      });
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
      <div class="table-wrap glass-card"><table class="data-table"><thead><tr><th>Date</th><th>Status</th><th>Marked At</th></tr></thead><tbody>
        ${records.sort((a,b) => new Date(b.date) - new Date(a.date)).map(r => `<tr><td>${formatDate(r.date)}</td><td><span class="status-badge ${r.status}">${r.status}</span></td><td>${formatDateTime(r.timestamp)}</td></tr>`).join('') || '<tr><td colspan="3" class="text-center text-muted">No records</td></tr>'}
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
    const renderDay = (day) => {
      const tt = DB.getTimetable({ facultyId: u.id, day });
      if (!tt.length) return '<p class="text-muted text-center p-4">No classes</p>';
      return `<table class="data-table"><thead><tr><th>Period</th><th>Time</th><th>Subject</th><th>Batch</th><th>Room</th></tr></thead><tbody>
        ${tt.sort((a,b) => a.period - b.period).map(t => { const sub = DB.getSubjectById(t.subjectId); return `<tr><td>P${t.period}</td><td>${t.time}</td><td>${sub ? sub.name : '-'}</td><td>${t.batch}</td><td>${t.room}</td></tr>`; }).join('')}
      </tbody></table>`;
    };

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>My Timetable</h2></div>
      <div class="tab-nav" id="tt-days">${days.map(d => `<button class="tab-btn ${d === dayName() ? 'active' : ''}" data-day="${d}">${d.substring(0,3)}</button>`).join('')}</div>
      <div id="tt-out" class="glass-card"><div class="card-body">${renderDay(dayName() || 'Monday')}</div></div>
    </div>`;
    setTimeout(() => { document.querySelectorAll('#tt-days .tab-btn').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('#tt-days .tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
      document.querySelector('#tt-out .card-body').innerHTML = renderDay(btn.dataset.day);
    })); }, 0);
  },

  assignments() {
    const u = App.currentUser;
    const asgns = DB.getAssignments({ facultyId: u.id });
    const subjects = DB.getSubjects({ facultyId: u.id });

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>Assignments</h2><button class="btn btn-primary" id="add-asgn"><span class="icon-add"></span> New Assignment</button></div>
      ${asgns.length ? asgns.map(a => { const sub = DB.getSubjectById(a.subjectId); const totalStu = DB.getUsers('student').filter(s => s.batch === a.batch).length;
        return `<div class="glass-card mb-4"><div class="card-body"><div class="flex-between"><div><h4>${a.title}</h4><p class="text-muted" style="font-size:var(--fs-sm)">${sub ? sub.name : '-'} · ${a.batch} · Due: ${formatDate(a.dueDate)}</p></div>
          <div class="text-right"><div style="font-size:var(--fs-lg);font-weight:700">${a.submissions.length}/${totalStu}</div><div class="text-muted" style="font-size:var(--fs-xs)">Submissions</div></div></div>
          <p class="mt-3" style="font-size:var(--fs-sm);color:var(--text-secondary)">${a.description.substring(0, 100)}...</p>
          <div class="mt-3"><span class="status-badge">Max: ${a.maxMarks} marks</span></div></div></div>`; }).join('')
        : '<div class="empty-state"><div class="empty-icon">📄</div><h3>No assignments</h3></div>'}
    </div>`;

    setTimeout(() => {
      document.getElementById('add-asgn').addEventListener('click', () => {
        App.showModal('New Assignment', `
          <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="asgn-title" required/></div>
          <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="asgn-desc" rows="3"></textarea></div>
          <div class="form-row"><div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="asgn-sub">${subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Batch</label><input class="form-input" id="asgn-batch" value="${subjects[0]?.batch || ''}"/></div></div>
          <div class="form-row"><div class="form-group"><label class="form-label">Due Date</label><input type="date" class="form-input" id="asgn-due"/></div>
          <div class="form-group"><label class="form-label">Max Marks</label><input type="number" class="form-input" id="asgn-marks" value="20"/></div></div>`,
          `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="asgn-save">Create</button>`);
        setTimeout(() => {
          document.getElementById('asgn-sub').addEventListener('change', function() { const sub = DB.getSubjectById(this.value); if (sub) document.getElementById('asgn-batch').value = sub.batch; });
          document.getElementById('asgn-save').addEventListener('click', () => {
            const title = document.getElementById('asgn-title').value.trim(); if (!title) { App.showToast('Title required', 'error'); return; }
            DB.addAssignment({ id: genId('ASG'), title, description: document.getElementById('asgn-desc').value, subjectId: document.getElementById('asgn-sub').value, facultyId: u.id, batch: document.getElementById('asgn-batch').value, dueDate: document.getElementById('asgn-due').value, maxMarks: parseInt(document.getElementById('asgn-marks').value) || 20, createdAt: today(), submissions: [] });
            App.closeModal(); App.showToast('Assignment created', 'success'); FacultyViews.assignments();
          });
        }, 0);
      });
    }, 0);
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
          ${existingMarks.map(m => { const s = DB.getUserById(m.studentId); return `<tr><td>${s ? s.name : m.studentId}</td><td>${m.examType}</td><td>${m.marks}</td><td>${m.maxMarks}</td></tr>`; }).join('')}
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
              if (!isNaN(marks)) { DB.addMark({ id: genId('MK'), studentId: inp.dataset.student, subjectId: document.getElementById('mk-sub').value, examType: exam, marks, maxMarks: max, date: today() }); count++; }
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
