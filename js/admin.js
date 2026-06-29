// ============================================================
// CStat — admin.js  |  Admin Dashboard & Views
// ============================================================

const AdminViews = {

  dashboard() {
    const students = DB.getUsers('student');
    const faculty = DB.getUsers('faculty');
    const todayFacAtt = DB.getFacultyAttendance({ date: today() });
    const presentFac = todayFacAtt.filter(a => a.status === 'present').length;
    const facRate = faculty.length > 0 ? Math.round((presentFac / faculty.length) * 100) : 0;
    const pendingLeaves = DB.getLeaveRequests({ status: 'pending' }).length;
    const announcements = DB.getAnnouncements().slice(0, 3);
    const recentAtt = DB.getFacultyAttendance({}).slice(-5).reverse();

    document.getElementById('main-content').innerHTML = `
      <div class="animate-fadeIn">
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-icon primary">👥</div><div class="stat-value">${students.length}</div><div class="stat-label">Total Students</div></div>
          <div class="stat-card"><div class="stat-icon secondary">🎓</div><div class="stat-value">${faculty.length}</div><div class="stat-label">Total Faculty</div></div>
          <div class="stat-card"><div class="stat-icon success">✓</div><div class="stat-value">${facRate}%</div><div class="stat-label">Faculty Present Today</div></div>
          <div class="stat-card"><div class="stat-icon warning">📋</div><div class="stat-value">${pendingLeaves}</div><div class="stat-label">Pending Leaves</div></div>
        </div>

        <div class="dashboard-grid">
          <div class="glass-card">
            <div class="card-header"><h4>Quick Actions</h4></div>
            <div class="card-body" style="display:flex;gap:12px;flex-wrap:wrap">
              <button class="btn btn-primary" onclick="App.navigate('admin-scan-faculty')"><span class="icon-scan"></span> Scan Faculty QR</button>
              <button class="btn btn-secondary" onclick="App.navigate('admin-users')"><span class="icon-users"></span> Manage Users</button>
              <button class="btn btn-warning" onclick="App.navigate('admin-leaves')"><span class="icon-leave"></span> Leave Requests</button>
              <button class="btn btn-ghost" onclick="App.navigate('admin-announcements')"><span class="icon-bell"></span> Announcements</button>
            </div>
          </div>
          <div class="glass-card">
            <div class="card-header"><h4>Recent Faculty Attendance</h4></div>
            <div class="card-body">
              ${recentAtt.length ? `<table class="data-table"><thead><tr><th>Faculty</th><th>Date</th><th>Status</th></tr></thead><tbody>
                ${recentAtt.map(a => { const f = DB.getUserById(a.facultyId); return `<tr><td>${f ? f.name : a.facultyId}</td><td>${formatDate(a.date)}</td><td><span class="status-badge ${a.status}">${a.status}</span></td></tr>`; }).join('')}
              </tbody></table>` : '<p class="text-muted text-center">No records yet</p>'}
            </div>
          </div>
        </div>

        <div class="glass-card">
          <div class="card-header"><h4>Recent Announcements</h4></div>
          <div class="card-body">
            ${announcements.map(a => `<div class="announcement-card priority-${a.priority}"><h4>${a.title}</h4><p class="announcement-body">${a.body.substring(0, 120)}...</p><div class="announcement-meta"><span>${formatDate(a.date)}</span><span class="status-badge ${a.priority}">${a.priority}</span><span class="status-badge">${a.audience}</span></div></div>`).join('') || '<p class="text-muted text-center">No announcements</p>'}
          </div>
        </div>
      </div>`;
  },

  manageUsers() {
    const renderTab = (role) => {
      const users = DB.getUsers(role);
      const isStu = role === 'student';
      return `<div class="table-wrap glass-card"><table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>Department</th>${isStu ? '<th>Batch</th><th>Roll No</th>' : ''}<th>Email</th><th>Actions</th></tr></thead><tbody>
        ${users.map(u => `<tr><td><code>${u.id}</code></td><td>${u.name}</td><td>${u.department}</td>${isStu ? `<td>${u.batch || '-'}</td><td>${u.rollNo || '-'}</td>` : ''}<td>${u.email}</td>
        <td class="list-item-actions"><button class="btn btn-ghost btn-sm" onclick="AdminViews._viewQR('${u.id}')">QR</button><button class="btn btn-ghost btn-sm" onclick="AdminViews._editUser('${u.id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="AdminViews._deleteUser('${u.id}')">🗑️</button></td></tr>`).join('')}
      </tbody></table></div>`;
    };

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="page-header"><h2>Manage Users</h2><div class="page-header-actions"><button class="btn btn-primary" id="add-user-btn"><span class="icon-add"></span> Add User</button></div></div>
      <div class="tab-nav"><button class="tab-btn active" data-tab="stu-tab">Students</button><button class="tab-btn" data-tab="fac-tab">Faculty</button></div>
      <div id="stu-tab" class="tab-content active">${renderTab('student')}</div>
      <div id="fac-tab" class="tab-content">${renderTab('faculty')}</div>
    </div>`;

    setTimeout(() => {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active'); document.getElementById(btn.dataset.tab).classList.add('active');
      }));
      document.getElementById('add-user-btn').addEventListener('click', () => AdminViews._addUserModal());
    }, 0);
  },

  _addUserModal() {
    const depts = DB.getDepartments();
    App.showModal('Add New User', `
      <div class="form-group"><label class="form-label">Role</label><select class="form-select" id="mu-role"><option value="student">Student</option><option value="faculty">Faculty</option></select></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Name</label><input class="form-input" id="mu-name" required/></div><div class="form-group"><label class="form-label">Email</label><input class="form-input" id="mu-email" type="email"/></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="mu-phone"/></div><div class="form-group"><label class="form-label">Password</label><input class="form-input" id="mu-password" type="password"/></div></div>
      <div class="form-group"><label class="form-label">Department</label><select class="form-select" id="mu-dept">${depts.map(d => `<option>${d.name}</option>`).join('')}</select></div>
      <div id="mu-stu-fields"><div class="form-row"><div class="form-group"><label class="form-label">Batch</label><input class="form-input" id="mu-batch"/></div><div class="form-group"><label class="form-label">Roll No</label><input class="form-input" id="mu-rollno"/></div></div></div>
    `, `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="mu-save">Save</button>`);
    setTimeout(() => {
      document.getElementById('mu-role').addEventListener('change', function(){ document.getElementById('mu-stu-fields').style.display = this.value === 'student' ? 'block' : 'none'; });
      document.getElementById('mu-save').addEventListener('click', () => {
        const role = document.getElementById('mu-role').value;
        const name = document.getElementById('mu-name').value.trim();
        if (!name) { App.showToast('Name is required', 'error'); return; }
        const id = genId(role === 'student' ? 'STU' : 'FAC');
        const user = { id, role, name, avatar: name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
          email: document.getElementById('mu-email').value || '', phone: document.getElementById('mu-phone').value || '',
          department: document.getElementById('mu-dept').value, password: document.getElementById('mu-password').value || (role === 'student' ? 'student123' : 'faculty123'), joined: today() };
        if (role === 'student') { user.batch = document.getElementById('mu-batch').value || ''; user.rollNo = document.getElementById('mu-rollno').value || ''; user.year = 1; }
        else { user.subjects = []; }
        DB.addUser(user); App.closeModal(); App.showToast(`${name} added`, 'success'); AdminViews.manageUsers();
      });
    }, 0);
  },

  _editUser(userId) {
    const u = DB.getUserById(userId); if (!u) return;
    App.showModal('Edit User', `
      <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="eu-name" value="${u.name}"/></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Email</label><input class="form-input" id="eu-email" value="${u.email || ''}"/></div><div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="eu-phone" value="${u.phone || ''}"/></div></div>
      <div class="form-group"><label class="form-label">Department</label><input class="form-input" id="eu-dept" value="${u.department}"/></div>
      ${u.role === 'student' ? `<div class="form-row"><div class="form-group"><label class="form-label">Batch</label><input class="form-input" id="eu-batch" value="${u.batch || ''}"/></div><div class="form-group"><label class="form-label">Roll No</label><input class="form-input" id="eu-rollno" value="${u.rollNo || ''}"/></div></div>` : ''}
    `, `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="eu-save">Update</button>`);
    setTimeout(() => {
      document.getElementById('eu-save').addEventListener('click', () => {
        const updates = { name: document.getElementById('eu-name').value.trim(), email: document.getElementById('eu-email').value, phone: document.getElementById('eu-phone').value, department: document.getElementById('eu-dept').value };
        updates.avatar = updates.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        if (u.role === 'student') { updates.batch = document.getElementById('eu-batch').value; updates.rollNo = document.getElementById('eu-rollno').value; }
        DB.updateUser(userId, updates); App.closeModal(); App.showToast('User updated', 'success'); AdminViews.manageUsers();
      });
    }, 0);
  },

  _deleteUser(userId) {
    const u = DB.getUserById(userId); if (!u) return;
    App.showModal('Confirm Delete', `<p>Delete <strong>${u.name}</strong> (${u.id})?</p><p class="text-danger mt-2">This cannot be undone.</p>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button><button class="btn btn-danger" id="del-confirm">Delete</button>`);
    setTimeout(() => { document.getElementById('del-confirm').addEventListener('click', () => { DB.deleteUser(userId); App.closeModal(); App.showToast('User deleted', 'success'); AdminViews.manageUsers(); }); }, 0);
  },

  _viewQR(userId) {
    const u = DB.getUserById(userId); if (!u) return;
    App.showModal(`${u.name}'s QR Code`, `<div class="qr-display"><div class="qr-frame" id="modal-qr-container"></div><div class="qr-info"><h3>${u.name}</h3><p>${u.id} · ${u.role} · ${u.department}</p></div></div>`);
    setTimeout(() => QRManager.render('modal-qr-container', u, 200), 100);
  },

  scanFacultyQR() {
    const todayAtt = DB.getFacultyAttendance({ date: today() });
    const allFaculty = DB.getUsers('faculty');

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn">
      <div class="page-header"><h2>Scan Faculty QR — Day Attendance</h2><span class="text-muted">${formatDate(today())}</span></div>
      <div class="dashboard-grid">
        <div class="glass-card"><div class="card-header"><h4>QR Scanner</h4></div><div class="card-body">
          <div id="admin-scanner-container"><div class="text-center">
            <button class="btn btn-primary btn-lg" id="start-faculty-scan"><span class="icon-scan"></span> Start Camera Scanner</button>
            <p class="text-muted mt-3">Point your camera at a faculty member's QR code</p>
          </div></div>
          <div id="faculty-scan-result" style="display:none"></div>
        </div></div>
        <div class="glass-card"><div class="card-header"><h4>Today's Status (${todayAtt.length}/${allFaculty.length})</h4></div><div class="card-body">
          ${allFaculty.length ? `<table class="data-table"><thead><tr><th>Faculty</th><th>Department</th><th>Status</th></tr></thead><tbody>
            ${allFaculty.map(f => { const att = todayAtt.find(a => a.facultyId === f.id); return `<tr><td>${f.name}</td><td>${f.department}</td><td>${att ? `<span class="status-badge ${att.status}">${att.status}</span>` : '<span class="status-badge pending">Not Marked</span>'}</td></tr>`; }).join('')}
          </tbody></table>` : '<p class="text-muted">No faculty</p>'}
        </div></div>
      </div>
    </div>`;

    setTimeout(() => {
      document.getElementById('start-faculty-scan').addEventListener('click', () => {
        QRScanner.start(document.getElementById('admin-scanner-container'), (data) => {
          if (data.role !== 'faculty') { App.showToast('Not a faculty QR code', 'error'); return; }
          const fac = DB.getUserById(data.id);
          if (!fac) { App.showToast('Faculty not found', 'error'); return; }
          const res = document.getElementById('faculty-scan-result');
          res.style.display = 'block';
          res.innerHTML = `<div class="scan-result"><div class="result-header"><div class="avatar">${fac.avatar}</div><div><div class="result-name">${fac.name}</div><p class="text-muted">${fac.id} · ${fac.department}</p></div></div>
            <div class="mark-btn-group">
              <button class="mark-btn present" onclick="AdminViews._markFac('${fac.id}','present')">✓ Present</button>
              <button class="mark-btn late" onclick="AdminViews._markFac('${fac.id}','leave')">🏖️ Leave</button>
              <button class="mark-btn absent" onclick="AdminViews._markFac('${fac.id}','absent')">✕ Absent</button>
            </div></div>`;
        });
      });
    }, 0);
  },

  _markFac(facultyId, status) {
    DB.addFacultyAttendance({ id: genId('FA'), facultyId, date: today(), status, markedBy: App.currentUser.id, timestamp: now() });
    App.showToast(`Faculty marked as ${status}`, 'success'); this.scanFacultyQR();
  },

  facultyAttendance() {
    const render = (dateVal) => {
      const records = dateVal ? DB.getFacultyAttendance({ date: dateVal }) : DB.getFacultyAttendance({});
      const p = records.filter(r => r.status === 'present').length, a = records.filter(r => r.status === 'absent').length, l = records.filter(r => r.status === 'leave').length;
      return `<div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-card"><div class="stat-icon success">✓</div><div class="stat-value">${p}</div><div class="stat-label">Present</div></div>
        <div class="stat-card"><div class="stat-icon danger">✕</div><div class="stat-value">${a}</div><div class="stat-label">Absent</div></div>
        <div class="stat-card"><div class="stat-icon warning">🏖️</div><div class="stat-value">${l}</div><div class="stat-label">Leave</div></div>
      </div><div class="table-wrap glass-card"><table class="data-table"><thead><tr><th>Faculty</th><th>Department</th><th>Date</th><th>Status</th><th>Marked At</th></tr></thead><tbody>
        ${records.map(r => { const f = DB.getUserById(r.facultyId); return `<tr><td>${f ? f.name : r.facultyId}</td><td>${f ? f.department : '-'}</td><td>${formatDate(r.date)}</td><td><span class="status-badge ${r.status}">${r.status}</span></td><td>${formatDateTime(r.timestamp)}</td></tr>`; }).join('') || '<tr><td colspan="5" class="text-center text-muted">No records</td></tr>'}
      </tbody></table></div>`;
    };
    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>Faculty Attendance</h2></div>
      <div class="filter-row"><div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="fa-date" value="${today()}"/></div>
      <button class="btn btn-primary" id="fa-filter">Filter</button><button class="btn btn-ghost" id="fa-clear">Show All</button></div>
      <div id="fa-results">${render(today())}</div></div>`;
    setTimeout(() => {
      document.getElementById('fa-filter').addEventListener('click', () => { document.getElementById('fa-results').innerHTML = render(document.getElementById('fa-date').value); });
      document.getElementById('fa-clear').addEventListener('click', () => { document.getElementById('fa-date').value = ''; document.getElementById('fa-results').innerHTML = render(null); });
    }, 0);
  },

  studentAttendance() {
    const render = (dateVal) => {
      const filter = {}; if (dateVal) filter.date = dateVal;
      const records = DB.getStudentAttendance(filter);
      return `<div class="table-wrap glass-card"><table class="data-table"><thead><tr><th>Student</th><th>Roll No</th><th>Subject</th><th>Period</th><th>Status</th><th>Marked By</th></tr></thead><tbody>
        ${records.map(r => { const s = DB.getUserById(r.studentId); const sub = DB.getSubjectById(r.subjectId); const f = DB.getUserById(r.markedBy);
          return `<tr><td>${s ? s.name : r.studentId}</td><td>${s ? s.rollNo || '-' : '-'}</td><td>${sub ? sub.name : '-'}</td><td>P${r.period}</td><td><span class="status-badge ${r.status}">${r.status}</span></td><td>${f ? f.name : '-'}</td></tr>`;
        }).join('') || '<tr><td colspan="6" class="text-center text-muted">No records</td></tr>'}
      </tbody></table></div>`;
    };
    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>Student Attendance</h2></div>
      <div class="filter-row"><div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="sa-date" value="${today()}"/></div>
      <button class="btn btn-primary" id="sa-filter">Filter</button><button class="btn btn-ghost" id="sa-clear">Show All</button></div>
      <div id="sa-results">${render(today())}</div></div>`;
    setTimeout(() => {
      document.getElementById('sa-filter').addEventListener('click', () => { document.getElementById('sa-results').innerHTML = render(document.getElementById('sa-date').value); });
      document.getElementById('sa-clear').addEventListener('click', () => { document.getElementById('sa-date').value = ''; document.getElementById('sa-results').innerHTML = render(null); });
    }, 0);
  },

  leaveRequests() {
    const renderLeaves = (status) => {
      const leaves = status ? DB.getLeaveRequests({ status }) : DB.getLeaveRequests({});
      if (!leaves.length) return '<div class="empty-state"><div class="empty-icon">📋</div><h3>No leave requests</h3></div>';
      return leaves.map(l => { const user = DB.getUserById(l.userId); return `<div class="leave-card"><div class="leave-card-header"><div class="flex items-center gap-3"><div class="avatar avatar-sm">${user ? user.avatar : '?'}</div><div><strong>${user ? user.name : l.userId}</strong><br/><span class="status-badge ${l.role}">${l.role}</span> · ${l.type}</div></div><span class="status-badge ${l.status}">${l.status}</span></div>
        <div class="leave-card-body">${l.reason}</div>
        <div class="leave-card-footer"><span class="leave-dates">📅 ${formatDate(l.from)} → ${formatDate(l.to)}</span>${l.status === 'pending' ? `<div class="flex gap-2"><button class="btn btn-success btn-sm" onclick="AdminViews._reviewLeave('${l.id}','approved')">Approve</button><button class="btn btn-danger btn-sm" onclick="AdminViews._reviewLeave('${l.id}','rejected')">Reject</button></div>` : ''}</div></div>`; }).join('');
    };
    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>Leave Requests</h2></div>
      <div class="tab-nav"><button class="tab-btn active" data-tab="pending-lv">Pending</button><button class="tab-btn" data-tab="all-lv">All</button></div>
      <div id="pending-lv" class="tab-content active">${renderLeaves('pending')}</div>
      <div id="all-lv" class="tab-content">${renderLeaves(null)}</div></div>`;
    setTimeout(() => { document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); btn.classList.add('active'); document.getElementById(btn.dataset.tab).classList.add('active'); })); }, 0);
  },

  _reviewLeave(id, status) { DB.updateLeaveRequest(id, { status, reviewedBy: App.currentUser.id, reviewedOn: today() }); App.showToast(`Leave ${status}`, 'success'); this.leaveRequests(); },

  announcements() {
    const anns = DB.getAnnouncements();
    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>Announcements</h2><button class="btn btn-primary" id="add-ann-btn"><span class="icon-add"></span> New Announcement</button></div>
      ${anns.map(a => { const p = DB.getUserById(a.postedBy); return `<div class="announcement-card priority-${a.priority}"><h4>${a.title}</h4><p class="announcement-body">${a.body}</p><div class="announcement-meta"><span>${formatDate(a.date)}</span><span>By ${p ? p.name : 'Admin'}</span><span class="status-badge ${a.priority}">${a.priority}</span><span class="status-badge">${a.audience}</span></div></div>`; }).join('') || '<div class="empty-state"><div class="empty-icon">📢</div><h3>No announcements</h3></div>'}
    </div>`;
    setTimeout(() => {
      document.getElementById('add-ann-btn').addEventListener('click', () => {
        App.showModal('New Announcement', `<div class="form-group"><label class="form-label">Title</label><input class="form-input" id="ann-title" required/></div>
          <div class="form-group"><label class="form-label">Body</label><textarea class="form-textarea" id="ann-body" rows="4"></textarea></div>
          <div class="form-row"><div class="form-group"><label class="form-label">Audience</label><select class="form-select" id="ann-aud"><option value="all">All</option><option value="students">Students</option><option value="faculty">Faculty</option></select></div>
          <div class="form-group"><label class="form-label">Priority</label><select class="form-select" id="ann-pri"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div></div>`,
          `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="ann-save">Publish</button>`);
        setTimeout(() => { document.getElementById('ann-save').addEventListener('click', () => {
          const title = document.getElementById('ann-title').value.trim(); if (!title) { App.showToast('Title required', 'error'); return; }
          DB.addAnnouncement({ id: genId('AN'), title, body: document.getElementById('ann-body').value, audience: document.getElementById('ann-aud').value, priority: document.getElementById('ann-pri').value, postedBy: App.currentUser.id, date: today() });
          App.closeModal(); App.showToast('Published', 'success'); AdminViews.announcements();
        }); }, 0);
      });
    }, 0);
  },

  departments() {
    const depts = DB.getDepartments();
    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>Departments</h2></div>
      <div class="stats-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">
        ${depts.map(d => { const head = DB.getUserById(d.head); const fc = DB.getUsers('faculty').filter(f => f.department === d.name).length; const sc = DB.getUsers('student').filter(s => s.department === d.name).length;
          return `<div class="stat-card"><div class="stat-icon primary">📚</div><div class="stat-value" style="font-size:var(--fs-lg)">${d.name}</div><div class="stat-label">Head: ${head ? head.name : '-'}</div><div class="divider"></div><div class="flex-between" style="font-size:var(--fs-sm)"><span>Faculty: <strong>${fc}</strong></span><span>Students: <strong>${sc}</strong></span></div><div class="mt-2 text-muted" style="font-size:var(--fs-xs)">Batches: ${d.batches.join(', ')}</div></div>`; }).join('')}
      </div></div>`;
  },

  reports() {
    const depts = DB.getDepartments(); const allStu = DB.getUsers('student'); const allSA = DB.getStudentAttendance({});
    const totalR = allSA.length; const totalP = allSA.filter(a => a.status === 'present' || a.status === 'late').length;
    const overallPct = totalR > 0 ? Math.round((totalP / totalR) * 100) : 0;
    const deptData = depts.map(d => { const ds = allStu.filter(s => s.department === d.name); const dr = allSA.filter(a => ds.some(s => s.id === a.studentId)); const dp = dr.filter(a => a.status === 'present' || a.status === 'late').length; const pct = dr.length > 0 ? Math.round((dp / dr.length) * 100) : 0; return { name: d.name, pct }; });

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>Reports & Analytics</h2></div>
      <div class="stats-grid" style="grid-template-columns:repeat(2,1fr)">
        <div class="stat-card"><div class="stat-icon primary">📊</div><div class="stat-value">${overallPct}%</div><div class="stat-label">Overall Student Attendance</div></div>
        <div class="stat-card"><div class="stat-icon secondary">📋</div><div class="stat-value">${totalR}</div><div class="stat-label">Total Records</div></div>
      </div>
      <div class="glass-card"><div class="card-header"><h4>Department-wise Attendance</h4></div><div class="card-body">
        ${deptData.map(d => `<div style="margin-bottom:20px"><div class="flex-between mb-2"><span style="font-weight:600">${d.name}</span><span>${d.pct}%</span></div><div class="attendance-bar"><div class="fill ${d.pct >= 75 ? 'green' : d.pct >= 60 ? 'amber' : 'rose'}" style="width:${d.pct}%"></div></div></div>`).join('')}
      </div></div></div>`;
  },

  timetableView() {
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const batches = DB.getDepartments().flatMap(d => d.batches); const defBatch = batches[0] || '';
    const renderTT = (batch, day) => { const tt = DB.getTimetable({ batch, day }); if (!tt.length) return '<p class="text-muted text-center p-4">No classes</p>';
      return `<table class="data-table"><thead><tr><th>Period</th><th>Time</th><th>Subject</th><th>Faculty</th><th>Room</th></tr></thead><tbody>${tt.sort((a,b) => a.period - b.period).map(t => { const sub = DB.getSubjectById(t.subjectId); const fac = DB.getUserById(t.facultyId); return `<tr><td>P${t.period}</td><td>${t.time}</td><td>${sub ? sub.name : '-'}</td><td>${fac ? fac.name : '-'}</td><td>${t.room}</td></tr>`; }).join('')}</tbody></table>`; };

    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>Timetable Management</h2></div>
      <div class="filter-row"><div class="form-group"><label class="form-label">Batch</label><select class="form-select" id="tt-batch">${batches.map(b => `<option>${b}</option>`).join('')}</select></div></div>
      <div class="tab-nav" id="tt-days">${days.map(d => `<button class="tab-btn ${d === dayName() ? 'active' : ''}" data-day="${d}">${d.substring(0,3)}</button>`).join('')}</div>
      <div id="tt-out" class="glass-card"><div class="card-body">${renderTT(defBatch, dayName() || 'Monday')}</div></div></div>`;
    setTimeout(() => {
      const upd = () => { const b = document.getElementById('tt-batch').value; const ad = document.querySelector('#tt-days .tab-btn.active'); document.querySelector('#tt-out .card-body').innerHTML = renderTT(b, ad ? ad.dataset.day : 'Monday'); };
      document.querySelectorAll('#tt-days .tab-btn').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('#tt-days .tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); upd(); }));
      document.getElementById('tt-batch').addEventListener('change', upd);
    }, 0);
  },

  profile() {
    const u = App.currentUser;
    document.getElementById('main-content').innerHTML = `<div class="animate-fadeIn"><div class="page-header"><h2>My Profile</h2></div>
      <div class="dashboard-grid">
        <div class="profile-card"><div class="avatar avatar-lg">${u.avatar}</div><h2>${u.name}</h2><span class="status-badge admin">Administrator</span>
          <div class="profile-details">
            <div class="profile-detail-item"><div class="detail-label">User ID</div><div class="detail-value">${u.id}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Email</div><div class="detail-value">${u.email}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Phone</div><div class="detail-value">${u.phone || '-'}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Department</div><div class="detail-value">${u.department}</div></div>
            <div class="profile-detail-item"><div class="detail-label">Joined</div><div class="detail-value">${formatDate(u.joined)}</div></div>
          </div>
        </div>
        <div class="glass-card"><div class="card-header"><h4>My QR Code</h4></div><div class="card-body"><div class="qr-display"><div class="qr-frame" id="admin-qr"></div><div class="qr-instructions">This QR uniquely identifies your admin account</div></div></div></div>
      </div></div>`;
    setTimeout(() => QRManager.render('admin-qr', u, 200), 100);
  }
};
