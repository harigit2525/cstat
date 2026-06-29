// ============================================================
// CStat — student.js  |  Student Dashboard & Views
// ============================================================

const StudentViews = {

  dashboard() {
    const u = App.currentUser;
    const stats = DB.getStudentAttendanceStats(u.id);
    const subjects = DB.getSubjects({ batch: u.batch });
    const assignments = DB.getAssignments({ batch: u.batch });
    const allMarks = DB.getMarks({ studentId: u.id });
    const anns = DB.getAnnouncements('students').slice(0, 3);
    const todayTT = DB.getTimetable({ batch: u.batch, day: dayName() });

    const totalClasses = stats.reduce((s, x) => s + x.total, 0);
    const totalAttended = stats.reduce((s, x) => s + x.attended, 0);
    const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
    const pendingAsgn = assignments.filter(a => !a.submissions.find(s => s.studentId === u.id)).length;
    let avgMarks = 0;
    if (allMarks.length) { avgMarks = Math.round(allMarks.reduce((s, m) => s + (m.marks / m.maxMarks) * 100, 0) / allMarks.length); }
    const lowSubjects = stats.filter(s => s.percentage < 75);

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon ${overallPct >= 75 ? 'success' : 'warning'}">📊</div><div class="stat-value">${overallPct}%</div><div class="stat-label">Overall Attendance</div></div>
        <div class="stat-card"><div class="stat-icon primary">📚</div><div class="stat-value">${subjects.length}</div><div class="stat-label">Subjects</div></div>
        <div class="stat-card"><div class="stat-icon warning">📄</div><div class="stat-value">${pendingAsgn}</div><div class="stat-label">Pending Assignments</div></div>
        <div class="stat-card"><div class="stat-icon info">🏆</div><div class="stat-value">${avgMarks}%</div><div class="stat-label">Average Marks</div></div>
      </div>

      ${lowSubjects.length ? `<div class="glass-card mb-5" style="border-left:3px solid var(--danger)"><div class="card-body flex items-center gap-3"><span class="icon-alert"></span><div><strong class="text-danger">Attendance Alert</strong><p style="font-size:var(--fs-sm);margin:0">Below 75% in: ${lowSubjects.map(s => `${s.subjectName} (${s.percentage}%)`).join(', ')}</p></div></div></div>` : ''}

      <div class="dashboard-grid">
        <div class="glass-card"><div class="card-header"><h4>Subject-wise Attendance</h4></div><div class="card-body">
          ${stats.length ? stats.map(s => `<div style="margin-bottom:16px"><div class="flex-between mb-2"><span style="font-weight:500;font-size:var(--fs-sm)">${s.subjectName}</span><span style="font-size:var(--fs-sm)">${s.percentage}% (${s.attended}/${s.total})</span></div><div class="attendance-bar"><div class="fill ${s.percentage >= 75 ? 'green' : s.percentage >= 60 ? 'amber' : 'rose'}" style="width:${s.percentage}%"></div></div></div>`).join('') : '<p class="text-muted text-center">No attendance data</p>'}
        </div></div>

        <div class="glass-card"><div class="card-header"><h4>Today's Schedule</h4></div><div class="card-body">
          ${todayTT.length ? `<table class="data-table"><thead><tr><th>Period</th><th>Time</th><th>Subject</th><th>Room</th></tr></thead><tbody>
            ${todayTT.sort((a,b) => a.period - b.period).map(t => { const sub = DB.getSubjectById(t.subjectId); return `<tr><td>P${t.period}</td><td>${t.time}</td><td>${sub ? sub.name : '-'}</td><td>${t.room}</td></tr>`; }).join('')}
          </tbody></table>` : '<p class="text-muted text-center">No classes today</p>'}
        </div></div>
      </div>

      <div class="glass-card"><div class="card-header"><h4>Announcements</h4></div><div class="card-body">
        ${anns.map(a => `<div class="announcement-card priority-${a.priority}"><h4>${a.title}</h4><p class="announcement-body">${a.body.substring(0, 100)}...</p><div class="announcement-meta"><span>${formatDate(a.date)}</span><span class="status-badge ${a.priority}">${a.priority}</span></div></div>`).join('') || '<p class="text-muted text-center">No announcements</p>'}
      </div></div>
    </div>`;
  },

  myQR() {
    const u = App.currentUser;
    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="page-header"><h2>My QR Code</h2></div>
      <div class="glass-card" style="max-width:500px;margin:0 auto"><div class="card-body">
        <div class="qr-display">
          <div class="qr-frame" id="student-qr-container"></div>
          <div class="qr-info"><h3>${u.name}</h3><p>${u.rollNo || ''} · ${u.batch} · ${u.department}</p></div>
          <div class="qr-instructions">Show this QR code to Faculty for period-wise attendance marking</div>
        </div>
      </div></div>
    </div>`;
    setTimeout(() => QRManager.render('student-qr-container', u, 250), 100);
  },

  attendance() {
    const u = App.currentUser;
    const stats = DB.getStudentAttendanceStats(u.id);
    const totalClasses = stats.reduce((s, x) => s + x.total, 0);
    const totalAttended = stats.reduce((s, x) => s + x.attended, 0);
    const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="page-header"><h2>My Attendance</h2></div>
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-card"><div class="stat-icon primary">📊</div><div class="stat-value">${overallPct}%</div><div class="stat-label">Overall</div></div>
        <div class="stat-card"><div class="stat-icon success">✓</div><div class="stat-value">${totalAttended}</div><div class="stat-label">Classes Attended</div></div>
        <div class="stat-card"><div class="stat-icon secondary">📅</div><div class="stat-value">${totalClasses}</div><div class="stat-label">Total Classes</div></div>
      </div>

      <div class="glass-card mb-5"><div class="card-header"><h4>Subject-wise Breakdown</h4></div><div class="card-body">
        ${stats.map(s => `<div style="margin-bottom:20px"><div class="flex-between mb-2"><span style="font-weight:600">${s.subjectName}</span><span>${s.percentage}% (${s.attended}/${s.total})</span></div><div class="attendance-bar"><div class="fill ${s.percentage >= 75 ? 'green' : s.percentage >= 60 ? 'amber' : 'rose'}" style="width:${s.percentage}%"></div></div></div>`).join('') || '<p class="text-muted text-center">No data yet</p>'}
      </div></div>

      <div class="glass-card"><div class="card-header"><h4>Recent Records</h4></div><div class="card-body">
        ${(() => { const records = DB.getStudentAttendance({ studentId: u.id }).slice(-20).reverse();
          return records.length ? `<table class="data-table"><thead><tr><th>Date</th><th>Subject</th><th>Period</th><th>Status</th></tr></thead><tbody>
            ${records.map(r => { const sub = DB.getSubjectById(r.subjectId); return `<tr><td>${formatDate(r.date)}</td><td>${sub ? sub.name : '-'}</td><td>P${r.period}</td><td><span class="status-badge ${r.status}">${r.status}</span></td></tr>`; }).join('')}
          </tbody></table>` : '<p class="text-muted text-center">No records</p>';
        })()}
      </div></div>
    </div>`;
  },

  timetable() {
    const u = App.currentUser;
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const renderDay = (day) => {
      const tt = DB.getTimetable({ batch: u.batch, day });
      if (!tt.length) return '<p class="text-muted text-center p-4">No classes</p>';
      return `<table class="data-table"><thead><tr><th>Period</th><th>Time</th><th>Subject</th><th>Faculty</th><th>Room</th></tr></thead><tbody>
        ${tt.sort((a,b) => a.period - b.period).map(t => { const sub = DB.getSubjectById(t.subjectId); const fac = DB.getUserById(t.facultyId); return `<tr><td>P${t.period}</td><td>${t.time}</td><td>${sub ? sub.name : '-'}</td><td>${fac ? fac.name : '-'}</td><td>${t.room}</td></tr>`; }).join('')}
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
    const asgns = DB.getAssignments({ batch: u.batch });

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>Assignments</h2></div>
      ${asgns.length ? asgns.map(a => {
        const sub = DB.getSubjectById(a.subjectId);
        const submission = a.submissions.find(s => s.studentId === u.id);
        const isPast = new Date(a.dueDate) < new Date(today());
        return `<div class="glass-card mb-4"><div class="card-body"><div class="flex-between flex-wrap gap-3"><div><h4>${a.title}</h4><p class="text-muted" style="font-size:var(--fs-sm)">${sub ? sub.name : '-'} · Due: ${formatDate(a.dueDate)}</p></div>
          <div>${submission ? '<span class="status-badge submitted">Submitted</span>' : isPast ? '<span class="status-badge absent">Missed</span>' : `<button class="btn btn-primary btn-sm" onclick="StudentViews._submitAssignment('${a.id}')">Submit</button>`}</div></div>
          <p class="mt-3" style="font-size:var(--fs-sm);color:var(--text-secondary)">${a.description}</p>
          <div class="mt-2"><span class="status-badge">Max: ${a.maxMarks} marks</span></div></div></div>`; }).join('')
      : '<div class="empty-state"><div class="empty-icon">📄</div><h3>No assignments</h3></div>'}
    </div>`;
  },

  _submitAssignment(asgnId) {
    App.showModal('Submit Assignment', `
      <div class="form-group"><label class="form-label">Your Submission</label><textarea class="form-textarea" id="sub-text" rows="4" placeholder="Describe your work or paste a link..."></textarea></div>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="sub-save">Submit</button>`);
    setTimeout(() => {
      document.getElementById('sub-save').addEventListener('click', () => {
        const text = document.getElementById('sub-text').value.trim();
        if (!text) { App.showToast('Enter submission details', 'error'); return; }
        DB.submitAssignment(asgnId, { studentId: App.currentUser.id, content: text, submittedAt: now() });
        App.closeModal(); App.showToast('Assignment submitted', 'success'); StudentViews.assignments();
      });
    }, 0);
  },

  marks() {
    const u = App.currentUser;
    const allMarks = DB.getMarks({ studentId: u.id });
    const subjects = DB.getSubjects({ batch: u.batch });

    const subjectMarks = {};
    allMarks.forEach(m => {
      if (!subjectMarks[m.subjectId]) subjectMarks[m.subjectId] = [];
      subjectMarks[m.subjectId].push(m);
    });

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>My Marks</h2></div>
      ${Object.keys(subjectMarks).length ? Object.entries(subjectMarks).map(([subId, marks]) => {
        const sub = DB.getSubjectById(subId);
        return `<div class="glass-card mb-4"><div class="card-header"><h4>${sub ? sub.name : subId}</h4></div><div class="card-body">
          <table class="data-table"><thead><tr><th>Exam</th><th>Marks</th><th>Max</th><th>Percentage</th></tr></thead><tbody>
          ${marks.map(m => `<tr><td>${m.examType}</td><td>${m.marks}</td><td>${m.maxMarks}</td><td><span class="status-badge ${Math.round((m.marks/m.maxMarks)*100) >= 50 ? 'present' : 'absent'}">${Math.round((m.marks/m.maxMarks)*100)}%</span></td></tr>`).join('')}
          </tbody></table></div></div>`; }).join('')
      : '<div class="empty-state"><div class="empty-icon">🏆</div><h3>No marks recorded yet</h3></div>'}
    </div>`;
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
        const from = document.getElementById('lv-from').value, to = document.getElementById('lv-to').value, reason = document.getElementById('lv-reason').value.trim();
        if (!from || !to || !reason) { App.showToast('Fill all fields', 'error'); return; }
        DB.addLeaveRequest({ id: genId('LR'), userId: u.id, role: 'student', type: document.getElementById('lv-type').value, from, to, reason, status: 'pending', appliedOn: today(), reviewedBy: null, reviewedOn: null });
        App.showToast('Leave request submitted', 'success'); StudentViews.leaveRequest();
      });
    }, 0);
  },

  profile() {
    const u = App.currentUser;
    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>My Profile</h2></div>
      <div class="dashboard-grid">
        <div class="profile-card"><div class="avatar avatar-lg">${u.avatar}</div><h2>${u.name}</h2><span class="status-badge student">Student</span>
          <div class="profile-details">
            <div class="profile-detail-item"><div class="detail-label">User ID</div><div class="detail-value">${u.id}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Roll No</div><div class="detail-value">${u.rollNo || '-'}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Email</div><div class="detail-value">${u.email}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Phone</div><div class="detail-value">${u.phone || '-'}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Department</div><div class="detail-value">${u.department}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Batch</div><div class="detail-value">${u.batch}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Year</div><div class="detail-value">${u.year || '-'}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Joined</div><div class="detail-value">${formatDate(u.joined)}</div></div>
          </div>
        </div>
        <div class="glass-card"><div class="card-header"><h4>My QR Code</h4></div><div class="card-body"><div class="qr-display"><div class="qr-frame" id="stu-prof-qr"></div><div class="qr-instructions">Show to Faculty for attendance</div></div></div></div>
      </div>
    </div>`;
    setTimeout(() => QRManager.render('stu-prof-qr', u, 200), 100);
  }
};
