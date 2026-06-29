// ============================================================
// CStat — app.js  |  Router, Auth, Init
// ============================================================

const App = {
  currentUser: null,
  sessionToken: null,
  SESSION_KEY: 'cstat_session',
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes

  // ─── Session / Auth ──────────────────────────────────────
  generateToken(user) {
    const payload = {
      id: user.id,
      role: user.role,
      name: user.name,
      iat: Date.now(),
      exp: Date.now() + this.SESSION_TIMEOUT,
      sig: btoa(user.id + ':' + user.role + ':' + Date.now() + ':cstat_secret_key')
    };
    return btoa(JSON.stringify(payload));
  },

  validateToken(token) {
    try {
      const payload = JSON.parse(atob(token));
      if (!payload.id || !payload.role || !payload.exp) return null;
      if (Date.now() > payload.exp) {
        this.logout('Session expired. Please login again.');
        return null;
      }
      return payload;
    } catch (e) {
      return null;
    }
  },

  refreshSession() {
    if (this.sessionToken) {
      try {
        const payload = JSON.parse(atob(this.sessionToken));
        payload.exp = Date.now() + this.SESSION_TIMEOUT;
        this.sessionToken = btoa(JSON.stringify(payload));
        sessionStorage.setItem(this.SESSION_KEY, this.sessionToken);
      } catch(e) {}
    }
  },

  login(userId, password) {
    const errorEl = document.getElementById('login-error');
    const btnEl = document.getElementById('login-btn');

    // Clear previous errors
    if (errorEl) errorEl.style.display = 'none';

    // Validate inputs
    if (!userId || !password) {
      this.showLoginError('Please enter both User ID and Password.');
      return;
    }

    // Show loading state
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = '<span class="spinner"></span> Authenticating...';
    }

    // Simulate network delay for realism
    setTimeout(() => {
      const user = DB.authenticate(userId.trim().toUpperCase(), password);
      
      if (!user) {
        this.showLoginError('Invalid User ID or Password. Please check your credentials.');
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.innerHTML = '<span class="icon-lock"></span> Sign In';
        }
        // Track failed attempts
        const attempts = parseInt(sessionStorage.getItem('login_attempts') || '0') + 1;
        sessionStorage.setItem('login_attempts', attempts.toString());
        if (attempts >= 3) {
          this.showLoginError('Multiple failed attempts detected. Please verify your credentials carefully.');
        }
        return;
      }

      // Success — create session
      this.currentUser = user;
      this.sessionToken = this.generateToken(user);
      sessionStorage.setItem(this.SESSION_KEY, this.sessionToken);
      sessionStorage.setItem('login_attempts', '0');

      // Log login activity
      console.log(`[CStat Auth] Login successful: ${user.name} (${user.role})`);

      this.showApp();
      this.navigate(user.role + '-dashboard');
      this.showToast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');
    }, 600);
  },

  logout(message = null) {
    QRScanner.stop();
    this.currentUser = null;
    this.sessionToken = null;
    sessionStorage.removeItem(this.SESSION_KEY);
    this.showLogin();
    if (message) {
      setTimeout(() => this.showToast(message, 'warning'), 300);
    }
  },

  restoreSession() {
    const token = sessionStorage.getItem(this.SESSION_KEY);
    if (!token) return false;

    const payload = this.validateToken(token);
    if (!payload) return false;

    const user = DB.getUserById(payload.id);
    if (!user) {
      sessionStorage.removeItem(this.SESSION_KEY);
      return false;
    }

    this.currentUser = user;
    this.sessionToken = token;
    this.refreshSession();
    return true;
  },

  showLoginError(msg) {
    const el = document.getElementById('login-error');
    if (el) {
      el.textContent = msg;
      el.style.display = 'flex';
      el.classList.add('animate-slideUp');
    }
  },

  // ─── UI State ────────────────────────────────────────────
  showLogin(e) {
    if(e) e.preventDefault();
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('forgot-page').style.display = 'none';
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app-page').style.display = 'none';
    document.getElementById('login-id').value = '';
    document.getElementById('login-password').value = '';
    const errEl = document.getElementById('login-error');
    if (errEl) errEl.style.display = 'none';
    const btnEl = document.getElementById('login-btn');
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = '<span class="icon-lock"></span> Sign In';
    }
  },

  showRegister(e) {
    if(e) e.preventDefault();
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('forgot-page').style.display = 'none';
    document.getElementById('app-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'flex';
    
    // Populate institutions
    const sel = document.getElementById('reg-inst-select');
    if(sel) {
      const insts = DB.getInstitutions();
      sel.innerHTML = insts.length ? insts.map(i => `<option value="${i.id}">${i.name}</option>`).join('') : '<option value="">No institutions registered yet</option>';
    }
  },

  showForgotPassword(e) {
    if(e) e.preventDefault();
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('app-page').style.display = 'none';
    document.getElementById('forgot-page').style.display = 'flex';
  },

  showApp() {
    document.getElementById('forgot-page').style.display = 'none';
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('app-page').style.display = 'flex';
    this.buildSidebar();
    this.buildTopbar();
  },

  // ─── AUTHENTICATION HELPERS ──────────────────────────────
  validatePasswordComplexity(pw) {
    // 8 chars, 1 uppercase, 1 number
    const re = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return re.test(pw);
  },

  requestOTP(email, onSuccessCallback) {
    const modal = document.getElementById('otp-modal');
    modal.style.display = 'flex';
    document.getElementById('otp-message').textContent = `We've sent a 4-digit verification code to ${email || 'your device'}.`;
    
    const inputs = document.querySelectorAll('.otp-digit');
    inputs.forEach(input => input.value = '');
    if(inputs.length > 0) inputs[0].focus();

    // Setup input auto-advance
    inputs.forEach((input, index) => {
      input.oninput = (e) => {
        if(e.target.value && index < inputs.length - 1) inputs[index + 1].focus();
      };
      input.onkeydown = (e) => {
        if(e.key === 'Backspace' && !e.target.value && index > 0) {
          inputs[index - 1].focus();
        }
      };
    });

    const form = document.getElementById('otp-form');
    // Clear previous event listeners by replacing node
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = Array.from(document.querySelectorAll('.otp-digit')).map(i => i.value).join('');
      if (code === '1234') {
        document.getElementById('otp-modal').style.display = 'none';
        this.showToast('Identity verified successfully!', 'success');
        if (onSuccessCallback) onSuccessCallback();
      } else {
        this.showToast('Invalid verification code. Try 1234.', 'error');
      }
    });
  },

  mockGoogleSignIn(source) {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
      .then((result) => {
        const email = result.user.email;
        const name = result.user.displayName;
        const existingUser = DB.getUserByEmail(email);

        if (existingUser) {
          this.showToast('Google Sign-In successful!', 'success');
          this.requestOTP(existingUser.email, () => {
            this.sessionToken = this.generateToken(existingUser);
            sessionStorage.setItem('cstat_session', this.sessionToken);
            this.currentUser = existingUser;
            this.showApp();
            this.navigate(existingUser.role + '-dashboard');
          });
        } else {
          this.showToast('Google login successful! Please complete your profile registration.', 'info');
          this.showRegister();
          document.getElementById('reg-name').value = name || '';
          document.getElementById('reg-email').value = email || '';
          document.getElementById('reg-pw').value = 'GoogleLinkedAccount1!'; // Auto-satisfies password constraints
        }
      })
      .catch((error) => {
        console.error("Google Auth error:", error);
        this.showToast('Google Sign-In failed: ' + error.message, 'error');
      });
  },

  // ─── Sidebar ─────────────────────────────────────────────
  buildSidebar() {
    const user = this.currentUser;
    if (!user) return;

    const navItems = this.getNavItems(user.role);
    const sidebarEl = document.getElementById('sidebar');

    sidebarEl.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon">CS</div>
          <span class="logo-text">CStat</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${navItems.map(section => `
          <div class="nav-section">
            <div class="nav-section-title">${section.title}</div>
            ${section.items.map(item => `
              <a class="nav-link" data-route="${item.route}" id="nav-${item.route}">
                <span class="${item.icon}"></span>
                <span class="nav-text">${item.label}</span>
              </a>
            `).join('')}
          </div>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="avatar avatar-sm">${user.avatar}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${user.name.split(' ').slice(0, 2).join(' ')}</div>
            <div class="sidebar-user-role">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</div>
          </div>
        </div>
        <a class="nav-link" id="nav-logout">
          <span class="icon-logout"></span>
          <span class="nav-text">Logout</span>
        </a>
      </div>
    `;

    // Bind nav clicks
    sidebarEl.querySelectorAll('.nav-link[data-route]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(link.dataset.route);
      });
    });

    document.getElementById('nav-logout').addEventListener('click', (e) => {
      e.preventDefault();
      this.logout('You have been logged out.');
    });
  },

  getNavItems(role) {
    const items = {
      admin: [
        { title: 'Main', items: [
          { route: 'admin-dashboard', label: 'Dashboard', icon: 'icon-dashboard' },
          { route: 'admin-scan-faculty', label: 'Scan Faculty QR', icon: 'icon-scan' },
        ]},
        { title: 'Management', items: [
          { route: 'admin-users', label: 'Manage Users', icon: 'icon-users' },
          { route: 'admin-departments', label: 'Departments', icon: 'icon-book' },
          { route: 'admin-timetable', label: 'Timetable', icon: 'icon-calendar' },
        ]},
        { title: 'Records', items: [
          { route: 'admin-faculty-attendance', label: 'Faculty Attendance', icon: 'icon-check' },
          { route: 'admin-student-attendance', label: 'Student Attendance', icon: 'icon-check' },
          { route: 'admin-leaves', label: 'Leave Requests', icon: 'icon-leave' },
          { route: 'admin-reports', label: 'Reports', icon: 'icon-chart' },
        ]},
        { title: 'Communication', items: [
          { route: 'admin-announcements', label: 'Announcements', icon: 'icon-bell' },
        ]},
        { title: 'Account', items: [
          { route: 'admin-profile', label: 'My Profile', icon: 'icon-person' },
        ]}
      ],
      faculty: [
        { title: 'Main', items: [
          { route: 'faculty-dashboard', label: 'Dashboard', icon: 'icon-dashboard' },
          { route: 'faculty-myqr', label: 'My QR Code', icon: 'icon-qr' },
          { route: 'faculty-scan-student', label: 'Scan Student QR', icon: 'icon-scan' },
        ]},
        { title: 'Academics', items: [
          { route: 'faculty-timetable', label: 'Timetable', icon: 'icon-calendar' },
          { route: 'faculty-class-attendance', label: 'Class Attendance', icon: 'icon-check' },
          { route: 'faculty-assignments', label: 'Assignments', icon: 'icon-file' },
          { route: 'faculty-marks', label: 'Marks Entry', icon: 'icon-edit' },
        ]},
        { title: 'Personal', items: [
          { route: 'faculty-my-attendance', label: 'My Attendance', icon: 'icon-chart' },
          { route: 'faculty-leave', label: 'Leave Request', icon: 'icon-leave' },
          { route: 'faculty-profile', label: 'My Profile', icon: 'icon-person' },
        ]}
      ],
      student: [
        { title: 'Main', items: [
          { route: 'student-dashboard', label: 'Dashboard', icon: 'icon-dashboard' },
          { route: 'student-myqr', label: 'My QR Code', icon: 'icon-qr' },
        ]},
        { title: 'Academics', items: [
          { route: 'student-attendance', label: 'Attendance', icon: 'icon-check' },
          { route: 'student-timetable', label: 'Timetable', icon: 'icon-calendar' },
          { route: 'student-marks', label: 'Marks & Grades', icon: 'icon-award' },
          { route: 'student-assignments', label: 'Assignments', icon: 'icon-file' },
        ]},
        { title: 'Personal', items: [
          { route: 'student-leave', label: 'Leave Request', icon: 'icon-leave' },
          { route: 'student-announcements', label: 'Announcements', icon: 'icon-bell' },
          { route: 'student-profile', label: 'My Profile', icon: 'icon-person' },
        ]}
      ]
    };
    return items[role] || [];
  },

  // ─── Topbar ──────────────────────────────────────────────
  buildTopbar() {
    const user = this.currentUser;
    const topbar = document.getElementById('topbar');
    topbar.innerHTML = `
      <div class="topbar-left">
        <button class="btn btn-ghost btn-icon sidebar-toggle" id="sidebar-toggle-btn">☰</button>
        <div class="topbar-title" id="topbar-title">Dashboard</div>
      </div>
      <div class="topbar-right">
        <div class="topbar-search">
          <span class="icon-search"></span>
          <input type="text" class="search-input" placeholder="Search..." id="global-search" />
        </div>
        <button class="btn btn-ghost btn-icon topbar-bell" id="topbar-bell">
          <span class="icon-bell"></span>
          <span class="notification-dot"></span>
        </button>
        <div class="topbar-user" id="topbar-user">
          <div class="avatar avatar-sm">${user.avatar}</div>
          <span class="topbar-user-name">${user.name.split(' ')[0]}</span>
        </div>
      </div>
    `;

    document.getElementById('sidebar-toggle-btn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
      document.getElementById('sidebar').classList.toggle('mobile-open');
    });
  },

  // ─── Router ──────────────────────────────────────────────
  navigate(route) {
    // Auth check
    if (!this.currentUser) {
      this.showLogin();
      return;
    }
    this.refreshSession();

    // Stop any running scanner
    QRScanner.stop();

    // Update active nav
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeNav = document.getElementById('nav-' + route);
    if (activeNav) activeNav.classList.add('active');

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('mobile-open');

    // Route map
    const routes = {
      // Admin
      'admin-dashboard':          () => AdminViews.dashboard(),
      'admin-users':              () => AdminViews.manageUsers(),
      'admin-scan-faculty':       () => AdminViews.scanFacultyQR(),
      'admin-faculty-attendance': () => AdminViews.facultyAttendance(),
      'admin-student-attendance': () => AdminViews.studentAttendance(),
      'admin-leaves':             () => AdminViews.leaveRequests(),
      'admin-announcements':      () => AdminViews.announcements(),
      'admin-departments':        () => AdminViews.departments(),
      'admin-timetable':          () => AdminViews.timetableView ? AdminViews.timetableView() : AdminViews.departments(),
      'admin-reports':            () => AdminViews.reports(),
      'admin-profile':            () => AdminViews.profile(),
      // Faculty
      'faculty-dashboard':        () => FacultyViews.dashboard(),
      'faculty-myqr':             () => FacultyViews.myQR(),
      'faculty-scan-student':     () => FacultyViews.scanStudentQR(),
      'faculty-timetable':        () => FacultyViews.timetable(),
      'faculty-class-attendance': () => FacultyViews.classAttendance(),
      'faculty-assignments':      () => FacultyViews.assignments(),
      'faculty-marks':            () => FacultyViews.marksEntry(),
      'faculty-my-attendance':    () => FacultyViews.myAttendance(),
      'faculty-leave':            () => FacultyViews.leaveRequest(),
      'faculty-profile':          () => FacultyViews.profile(),
      // Student
      'student-dashboard':        () => StudentViews.dashboard(),
      'student-myqr':             () => StudentViews.myQR(),
      'student-attendance':       () => StudentViews.attendance(),
      'student-timetable':        () => StudentViews.timetable(),
      'student-marks':            () => StudentViews.marks(),
      'student-assignments':      () => StudentViews.assignments(),
      'student-leave':            () => StudentViews.leaveRequest(),
      'student-announcements':    () => StudentViews.announcements(),
      'student-profile':          () => StudentViews.profile(),
    };

    // Update topbar title
    const titleMap = {
      'admin-dashboard': 'Admin Dashboard',
      'admin-users': 'Manage Users',
      'admin-scan-faculty': 'Scan Faculty QR',
      'admin-faculty-attendance': 'Faculty Attendance',
      'admin-student-attendance': 'Student Attendance',
      'admin-leaves': 'Leave Requests',
      'admin-announcements': 'Announcements',
      'admin-departments': 'Departments',
      'admin-timetable': 'Timetable Management',
      'admin-reports': 'Reports & Analytics',
      'admin-profile': 'My Profile',
      'faculty-dashboard': 'Faculty Dashboard',
      'faculty-myqr': 'My QR Code',
      'faculty-scan-student': 'Scan Student QR',
      'faculty-timetable': 'My Timetable',
      'faculty-class-attendance': 'Class Attendance',
      'faculty-assignments': 'Assignments',
      'faculty-marks': 'Marks Entry',
      'faculty-my-attendance': 'My Attendance',
      'faculty-leave': 'Leave Request',
      'faculty-profile': 'My Profile',
      'student-dashboard': 'Student Dashboard',
      'student-myqr': 'My QR Code',
      'student-attendance': 'My Attendance',
      'student-timetable': 'Timetable',
      'student-marks': 'Marks & Grades',
      'student-assignments': 'Assignments',
      'student-leave': 'Leave Request',
      'student-announcements': 'Announcements',
      'student-profile': 'My Profile',
    };

    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = titleMap[route] || 'CStat';

    if (routes[route]) {
      routes[route]();
    } else {
      document.getElementById('main-content').innerHTML = `
        <div class="empty-state animate-fadeIn">
          <div class="empty-icon">🚧</div>
          <h3>Page Not Found</h3>
          <p class="text-muted">The page you're looking for doesn't exist.</p>
        </div>
      `;
    }
  },

  // ─── Toast Notifications ─────────────────────────────────
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slideInRight`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ'}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // ─── Modal ────────────────────────────────────────────────
  showModal(title, bodyHtml, footerHtml = '') {
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="modal animate-slideUp">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    `;

    overlay.style.display = 'flex';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });
    document.getElementById('modal-close-btn').addEventListener('click', () => this.closeModal());
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.innerHTML = '';
    }
  },

  // ─── Init ────────────────────────────────────────────────
  async init() {
    await DB.init();

    // Try restoring session
    if (this.restoreSession()) {
      this.showApp();
      this.navigate(this.currentUser.role + '-dashboard');
    } else {
      this.showLogin();
    }

    // Bind login form
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const userId = document.getElementById('login-id').value;
      const password = document.getElementById('login-password').value;
      this.login(userId, password);
    });

    // Password visibility toggle
    document.getElementById('toggle-password').addEventListener('click', () => {
      const pwInput = document.getElementById('login-password');
      const icon = document.getElementById('toggle-password');
      if (pwInput.type === 'password') {
        pwInput.type = 'text';
        icon.textContent = '🙈';
      } else {
        pwInput.type = 'password';
        icon.textContent = '👁';
      }
    });

    // Bind register form role toggle
    document.querySelectorAll('input[name="reg-role"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const role = e.target.value;
        document.getElementById('reg-admin-fields').style.display = role === 'admin' ? 'block' : 'none';
        document.getElementById('reg-member-fields').style.display = role !== 'admin' ? 'block' : 'none';
        document.getElementById('reg-inst-name').required = role === 'admin';
        document.getElementById('reg-inst-select').required = role !== 'admin';
      });
    });

    // Bind register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const role = document.querySelector('input[name="reg-role"]:checked').value;
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const pw = document.getElementById('reg-pw').value;

        if (!name || !email || !pw) {
          this.showToast('Please fill all required fields.', 'error');
          return;
        }

        if (!this.validatePasswordComplexity(pw)) {
          this.showToast('Password must be at least 8 characters, with 1 uppercase letter and 1 number.', 'error');
          return;
        }

        let instId = '';
        if (role === 'admin') {
          const instName = document.getElementById('reg-inst-name').value.trim();
          if (!instName) { this.showToast('Institution name is required.', 'error'); return; }
          instId = DB.addInstitution(instName);
          this.showToast(`Institution ${instName} created successfully!`, 'success');
        } else {
          instId = document.getElementById('reg-inst-select').value;
          if (!instId) { this.showToast('Please select an institution.', 'error'); return; }
        }

        let prefix = role === 'admin' ? 'ADMIN' : (role === 'faculty' ? 'FAC' : 'STU');
        const user = {
          id: genId(prefix),
          institutionId: instId,
          role: role,
          name: name,
          email: email,
          phone: '',
          department: role === 'admin' ? 'Administration' : 'General',
          password: pw,
          avatar: name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
          joined: today()
        };

        if (role === 'student') {
          user.batch = 'Batch-1';
          user.rollNo = 'Pending';
        }

        DB.addUser(user);
        
        this.requestOTP(user.email, () => {
          this.showToast(`Account created! Your User ID is ${user.id}. Please remember this.`, 'success');
          // Auto-login after OTP success
          setTimeout(() => {
            this.sessionToken = this.generateToken(user);
            sessionStorage.setItem('cstat_session', this.sessionToken);
            this.currentUser = user;
            this.showApp();
            this.navigate(user.role + '-dashboard');
          }, 500);
        });
      });
    }
    
    // Bind Forgot Password form
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
      forgotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        if(email) {
          this.showToast('Password reset link sent to ' + email, 'success');
          setTimeout(() => this.showLogin(), 2000);
        }
      });
    }

    // Session activity refresh
    ['click', 'keydown', 'mousemove', 'scroll'].forEach(evt => {
      document.addEventListener(evt, () => {
        if (this.currentUser) this.refreshSession();
      }, { passive: true });
    });

    // Periodic session check (every 60 seconds)
    setInterval(() => {
      if (this.sessionToken) {
        const payload = this.validateToken(this.sessionToken);
        if (!payload) {
          this.logout('Session expired. Please login again.');
        }
      }
    }, 60000);
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
