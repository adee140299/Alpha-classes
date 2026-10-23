/**
 * Alpha Classes — Teacher & Classroom Management Portal
 * Full student roster, daily attendance tracking, fee management, receipts, and WhatsApp alerts.
 */

(function () {
  'use strict';

  // Auth Guard: Ensure teacher session exists
  const currentTeacher = typeof AlphaAuth !== 'undefined' ? AlphaAuth.getCurrentTeacher() : null;
  if (!currentTeacher) {
    window.location.href = 'login.html';
    return;
  }

  const STORAGE_KEY = 'alpha_classes_data_v1';

  const DEMO_STUDENTS = [];

  const ALL_CLASSES = [
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
    'Class 6', 'Class 7', 'Class 8', 'Class 9',
    'Class 10 (SSC Board)', '11th Science', '12th Science (HSC Board)'
  ];

  // State Structure
  let state = {
    students: [],
    attendance: {}, // { 'YYYY-MM-DD': { studentId: 'P' | 'A' | 'L' | 'E' } }
    fees: {},       // { 'YYYY-MM': { studentId: { paid: number, date: string, mode: string, receiptNo: string, remarks: string } } }
    activeTab: 'dashboard',
    selectedDate: getTodayDateKey(),
    selectedFeeMonth: getCurrentMonthKey()
  };

  /* ==========================================================================
     Date Helpers
     ========================================================================== */
  function getTodayDateKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getCurrentMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatMonthName(monthKey) {
    if (!monthKey) return '';
    const [y, m] = monthKey.split('-');
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  /* ==========================================================================
     Persistence
     ========================================================================== */
  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const rawStudents = Array.isArray(parsed.students) ? parsed.students : [];
        const demoIds = ['101', '102', '103', '104', '105', '106', '107', '108'];
        state.students = rawStudents.filter(s => !demoIds.includes(String(s.id)) && !String(s.roll).startsWith('AC-10'));
        state.attendance = parsed.attendance || {};
        state.fees = parsed.fees || {};
        return;
      }
    } catch (e) {
      console.error('Failed to load portal data', e);
    }
    // Clean initial state (never re-inject demo students when starting fresh or empty)
    state.students = [];
    state.attendance = {};
    state.fees = {};
  }

  function saveData() {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const full = Object.assign({}, existing, {
        students: state.students,
        attendance: state.attendance,
        fees: state.fees,
        initialized: true
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
      if (typeof window.AlphaFirebase !== 'undefined' && window.AlphaFirebase.isCloudReady()) {
        window.AlphaFirebase.saveToCloud(full, currentTeacher ? currentTeacher.name : 'Teacher');
      }
    } catch (e) {
      console.error('Failed to save portal data', e);
    }
    updateKPIs();
  }

  /* ==========================================================================
     Tab Management
     ========================================================================== */
  function switchTab(tabName) {
    state.activeTab = tabName;

    // Update nav links
    document.querySelectorAll('.portal-nav-link').forEach(link => {
      if (link.dataset.tab === tabName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update tab panels
    document.querySelectorAll('.portal-tab-content').forEach(section => {
      if (section.id === `tab-${tabName}`) {
        section.classList.remove('d-none');
        section.classList.add('active');
      } else {
        section.classList.add('d-none');
        section.classList.remove('active');
      }
    });

    // Update titles
    const titles = {
      'dashboard': { title: 'Classroom Dashboard', sub: 'Welcome, Instructor Pradeep Yadav' },
      'attendance': { title: 'Daily Attendance Tracker', sub: 'Record and track student attendance' },
      'monthly-register': { title: 'Monthly Attendance Register', sub: 'Comprehensive monthly attendance sheet' },
      'fees': { title: 'Student Fees & Accounts', sub: 'Track fee payments, dues and issue receipts' },
      'students': { title: 'Student Directory', sub: 'Manage enrolled student roster and details' },
      'teachers': { title: 'Staff & Teacher Access', sub: 'Manage teacher logins and role permissions' },
      'announcements': { title: 'Notice Board Management', sub: 'Post announcements for students & parents' }
    };

    if (titles[tabName]) {
      document.getElementById('pageTitleText').textContent = titles[tabName].title;
      document.getElementById('pageSubtitleText').textContent = titles[tabName].sub;
    }

    // Refresh content for active tab
    if (tabName === 'dashboard') renderDashboard();
    if (tabName === 'attendance') renderAttendanceRoster();
    if (tabName === 'monthly-register') renderMonthlyRegister();
    if (tabName === 'fees') renderFeesLedger();
    if (tabName === 'students') renderStudentsTable();
    if (tabName === 'teachers') renderTeachersTable();
    if (tabName === 'announcements') renderTeacherAnnouncements();

    // Close mobile sidebar
    document.getElementById('portalSidebar').classList.remove('open');
  }

  /* ==========================================================================
     Tab 1: Dashboard Rendering
     ========================================================================== */
  function renderDashboard() {
    updateKPIs();
    renderTodayAbsentees();
    renderDashboardFeeDues();
  }

  function updateKPIs() {
    // 1. Total Active Students
    const activeStudents = state.students.filter(s => s.active !== false);
    document.getElementById('kpiTotalStudents').textContent = activeStudents.length;

    // 2. Today's Attendance
    const today = getTodayDateKey();
    const todayAtt = state.attendance[today] || {};
    let presentCount = 0;
    let markedCount = 0;

    activeStudents.forEach(s => {
      const status = todayAtt[s.id];
      if (status) {
        markedCount++;
        if (status === 'P' || status === 'L') presentCount++;
      }
    });

    const rate = markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0;
    document.getElementById('kpiAttendanceRate').textContent = `${rate}%`;
    document.getElementById('kpiAttendanceSummary').textContent = `${presentCount} / ${activeStudents.length} Students Present`;

    // 3. Fees Collected & Pending this month
    const curMonth = getCurrentMonthKey();
    const monthFees = state.fees[curMonth] || {};
    let totalCollected = 0;
    let totalPending = 0;
    let defaultersCount = 0;

    activeStudents.forEach(s => {
      const rec = monthFees[s.id] || { paid: 0 };
      const paid = Number(rec.paid) || 0;
      const expected = Number(s.monthlyFee) || 0;
      totalCollected += paid;

      const due = Math.max(0, expected - paid);
      if (due > 0) {
        totalPending += due;
        defaultersCount++;
      }
    });

    document.getElementById('kpiCollectedFees').textContent = `₹${totalCollected.toLocaleString('en-IN')}`;
    document.getElementById('kpiPendingFees').textContent = `₹${totalPending.toLocaleString('en-IN')}`;
    document.getElementById('kpiDefaultersCount').textContent = `${defaultersCount} pending accounts`;
    document.getElementById('kpiCurrentMonthName').textContent = formatMonthName(curMonth);
  }

  function renderTodayAbsentees() {
    const today = getTodayDateKey();
    const todayAtt = state.attendance[today] || {};
    const tbody = document.getElementById('todayAbsenteesList');
    tbody.innerHTML = '';

    const absentees = state.students.filter(s => todayAtt[s.id] === 'A');
    document.getElementById('todayAbsentBadge').textContent = `${absentees.length} Absent`;

    if (absentees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No absentees marked today! 🎉</td></tr>';
      return;
    }

    absentees.forEach(s => {
      const tr = document.createElement('tr');
      const waMsg = encodeURIComponent(`Dear Parent, your child ${s.name} was marked ABSENT at Alpha Classes on ${formatDisplayDate(today)}. Kindly let us know if there is any reason. - Alpha Classes`);
      const waUrl = `https://wa.me/91${s.phone}?text=${waMsg}`;

      tr.innerHTML = `
        <td>
          <div class="fw-bold">${s.name}</div>
          <div class="small text-muted">${s.roll}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${s.grade}</span></td>
        <td>
          <div>${s.parentName || 'Parent'}</div>
          <div class="small text-muted">${s.phone}</div>
        </td>
        <td>
          <a href="${waUrl}" target="_blank" class="btn-whatsapp">
            <i class="bi bi-whatsapp"></i> Notify
          </a>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderDashboardFeeDues() {
    const curMonth = getCurrentMonthKey();
    const monthFees = state.fees[curMonth] || {};
    const tbody = document.getElementById('dashboardFeeDueList');
    tbody.innerHTML = '';

    const defaulters = [];
    state.students.forEach(s => {
      if (s.active === false) return;
      const rec = monthFees[s.id] || { paid: 0 };
      const paid = Number(rec.paid) || 0;
      const fee = Number(s.monthlyFee) || 0;
      const due = Math.max(0, fee - paid);
      if (due > 0) {
        defaulters.push({ student: s, fee, paid, due });
      }
    });

    if (defaulters.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">All student accounts are up to date! 👏</td></tr>';
      return;
    }

    defaulters.slice(0, 5).forEach(item => {
      const s = item.student;
      const tr = document.createElement('tr');
      const waMsg = encodeURIComponent(`Dear Parent, coaching fee of Rs. ${item.due} for ${formatMonthName(curMonth)} for ${s.name} is pending at Alpha Classes. Kindly clear at your earliest. - Alpha Classes`);
      const waUrl = `https://wa.me/91${s.phone}?text=${waMsg}`;

      tr.innerHTML = `
        <td>
          <div class="fw-bold">${s.name}</div>
          <div class="small text-muted">${s.roll}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${s.grade}</span></td>
        <td>
          <div class="fw-bold text-danger">₹${item.due.toLocaleString('en-IN')}</div>
          <div class="small text-muted">of ₹${item.fee}</div>
        </td>
        <td>
          <a href="${waUrl}" target="_blank" class="btn-whatsapp">
            <i class="bi bi-whatsapp"></i> Remind
          </a>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* ==========================================================================
     Tab 2: Daily Attendance Roster
     ========================================================================== */
  function renderAttendanceRoster() {
    const dateInput = document.getElementById('attendanceDateInput');
    if (!dateInput.value) dateInput.value = state.selectedDate;

    const curDate = dateInput.value;
    document.getElementById('attDisplayDate').textContent = formatDisplayDate(curDate);

    const classFilter = document.getElementById('attendanceClassFilter').value;
    const batchFilter = document.getElementById('attendanceBatchFilter').value;
    const searchVal = document.getElementById('attendanceSearchInput').value.toLowerCase().trim();

    const tbody = document.getElementById('attendanceRosterBody');
    tbody.innerHTML = '';

    const dateRecords = state.attendance[curDate] || {};

    let present = 0, absent = 0, late = 0, excused = 0;
    let filteredStudents = state.students.filter(s => s.active !== false);

    if (classFilter !== 'all') {
      filteredStudents = filteredStudents.filter(s => s.grade === classFilter);
    }
    if (batchFilter !== 'all') {
      filteredStudents = filteredStudents.filter(s => s.batch === batchFilter);
    }
    if (searchVal) {
      filteredStudents = filteredStudents.filter(s => s.name.toLowerCase().includes(searchVal) || s.roll.toLowerCase().includes(searchVal));
    }

    if (filteredStudents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No matching students found for selected filters.</td></tr>';
      return;
    }

    filteredStudents.forEach(s => {
      const curStatus = dateRecords[s.id] || '';
      if (curStatus === 'P') present++;
      else if (curStatus === 'A') absent++;
      else if (curStatus === 'L') late++;
      else if (curStatus === 'E') excused++;

      const tr = document.createElement('tr');

      const waMsg = encodeURIComponent(`Dear Parent, your child ${s.name} attendance status on ${formatDisplayDate(curDate)} is: ${curStatus ? (curStatus === 'P' ? 'PRESENT' : curStatus === 'A' ? 'ABSENT' : curStatus === 'L' ? 'LATE' : 'EXCUSED') : 'Not marked'}. Regards, Alpha Classes.`);
      const waUrl = `https://wa.me/91${s.phone}?text=${waMsg}`;

      tr.innerHTML = `
        <td><span class="badge bg-light text-dark border font-monospace">${s.roll}</span></td>
        <td>
          <div class="student-meta-cell">
            <div class="student-avatar">${s.name.charAt(0)}</div>
            <div>
              <div class="student-name">${s.name}</div>
              <div class="small text-muted">${s.parentName || 'Parent'} (${s.phone})</div>
            </div>
          </div>
        </td>
        <td>
          <div><span class="badge bg-light text-dark border">${s.grade}</span></div>
          <div class="small text-muted mt-1"><i class="bi bi-clock"></i> ${s.batch} Batch</div>
        </td>
        <td>
          <div class="btn-att-group">
            <button class="btn-att ${curStatus === 'P' ? 'active-p' : ''}" data-id="${s.id}" data-status="P" title="Present">P</button>
            <button class="btn-att ${curStatus === 'A' ? 'active-a' : ''}" data-id="${s.id}" data-status="A" title="Absent">A</button>
            <button class="btn-att ${curStatus === 'L' ? 'active-l' : ''}" data-id="${s.id}" data-status="L" title="Late">L</button>
            <button class="btn-att ${curStatus === 'E' ? 'active-e' : ''}" data-id="${s.id}" data-status="E" title="Excused">E</button>
          </div>
        </td>
        <td>
          <a href="${waUrl}" target="_blank" class="btn-whatsapp" title="Send WhatsApp alert to parent">
            <i class="bi bi-whatsapp"></i> Alert
          </a>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Update attendance counter bar
    document.getElementById('statPresentCount').textContent = `${present} Present`;
    document.getElementById('statAbsentCount').textContent = `${absent} Absent`;
    document.getElementById('statLateCount').textContent = `${late} Late`;
    document.getElementById('statExcusedCount').textContent = `${excused} Excused`;

    const totalMarked = present + absent + late + excused;
    const rate = totalMarked > 0 ? Math.round(((present + late) / totalMarked) * 100) : 0;
    document.getElementById('statAttendancePercent').textContent = `${rate}%`;

    // Attach listeners to attendance buttons
    tbody.querySelectorAll('.btn-att').forEach(btn => {
      btn.addEventListener('click', () => {
        const studentId = btn.dataset.id;
        const status = btn.dataset.status;
        setStudentAttendance(curDate, studentId, status);
      });
    });
  }

  function setStudentAttendance(date, studentId, status) {
    if (!state.attendance[date]) {
      state.attendance[date] = {};
    }
    state.attendance[date][studentId] = status;
    saveData();
    renderAttendanceRoster();
  }

  function markAllVisible(status) {
    const curDate = document.getElementById('attendanceDateInput').value;
    if (!state.attendance[curDate]) state.attendance[curDate] = {};

    const classFilter = document.getElementById('attendanceClassFilter').value;
    const batchFilter = document.getElementById('attendanceBatchFilter').value;

    let targetStudents = state.students.filter(s => s.active !== false);
    if (classFilter !== 'all') targetStudents = targetStudents.filter(s => s.grade === classFilter);
    if (batchFilter !== 'all') targetStudents = targetStudents.filter(s => s.batch === batchFilter);

    targetStudents.forEach(s => {
      state.attendance[curDate][s.id] = status;
    });

    saveData();
    renderAttendanceRoster();
    showToast(`Marked all ${targetStudents.length} students as ${status === 'P' ? 'Present' : 'Absent'}!`);
  }

  /* ==========================================================================
     Tab 3: Monthly Register Grid
     ========================================================================== */
  function renderMonthlyRegister() {
    const monthSelect = document.getElementById('registerMonthSelect');
    const yearSelect = document.getElementById('registerYearSelect');
    const classFilter = document.getElementById('registerClassFilter').value;

    const selectedM = parseInt(monthSelect.value, 10);
    const selectedY = parseInt(yearSelect.value, 10);

    const daysInMonth = new Date(selectedY, selectedM + 1, 0).getDate();
    const table = document.getElementById('monthlyRegisterTable');
    table.innerHTML = '';

    // Header Row
    let theadHTML = `
      <thead>
        <tr>
          <th style="min-width: 160px; text-align: left;">Student Name</th>
          <th style="min-width: 90px;">Roll</th>
          <th style="min-width: 100px;">Class</th>
    `;
    for (let d = 1; d <= daysInMonth; d++) {
      theadHTML += `<th style="width: 28px; padding: 6px 2px; font-size: 0.72rem;">${d}</th>`;
    }
    theadHTML += `
          <th style="min-width: 40px; background:#d1fae5; color:#065f46;">P</th>
          <th style="min-width: 40px; background:#fee2e2; color:#991b1b;">A</th>
          <th style="min-width: 50px;">%</th>
        </tr>
      </thead>
    `;

    let tbodyHTML = '<tbody>';
    let filteredStudents = state.students.filter(s => s.active !== false);
    if (classFilter !== 'all') {
      filteredStudents = filteredStudents.filter(s => s.grade === classFilter);
    }

    filteredStudents.forEach(s => {
      let pCount = 0;
      let aCount = 0;
      let totalMarked = 0;

      let rowCells = `
        <td style="text-align: left; font-weight: 700;">${s.name}</td>
        <td><span class="badge bg-light text-dark border font-monospace">${s.roll}</span></td>
        <td><span class="badge bg-light text-dark border">${s.grade}</span></td>
      `;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${selectedY}-${String(selectedM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayAtt = (state.attendance[dateKey] && state.attendance[dateKey][s.id]) || '';

        let badgeStyle = 'color: #94a3b8;';
        let text = '·';

        if (dayAtt === 'P') {
          pCount++;
          totalMarked++;
          badgeStyle = 'background:#10b981; color:#fff; font-weight:bold; border-radius:3px;';
          text = 'P';
        } else if (dayAtt === 'A') {
          aCount++;
          totalMarked++;
          badgeStyle = 'background:#ef4444; color:#fff; font-weight:bold; border-radius:3px;';
          text = 'A';
        } else if (dayAtt === 'L') {
          pCount++;
          totalMarked++;
          badgeStyle = 'background:#f59e0b; color:#fff; font-weight:bold; border-radius:3px;';
          text = 'L';
        } else if (dayAtt === 'E') {
          totalMarked++;
          badgeStyle = 'background:#3b82f6; color:#fff; font-weight:bold; border-radius:3px;';
          text = 'E';
        }

        rowCells += `<td style="padding: 4px 1px; font-size: 0.75rem; ${badgeStyle}">${text}</td>`;
      }

      const percent = totalMarked > 0 ? Math.round((pCount / totalMarked) * 100) : 0;
      rowCells += `
        <td style="font-weight: 800; color: #065f46; background: #ecfdf5;">${pCount}</td>
        <td style="font-weight: 800; color: #991b1b; background: #fef2f2;">${aCount}</td>
        <td style="font-weight: 800;">${percent}%</td>
      `;

      tbodyHTML += `<tr>${rowCells}</tr>`;
    });

    tbodyHTML += '</tbody>';
    table.innerHTML = theadHTML + tbodyHTML;
  }

  /* ==========================================================================
     Tab 4: Fees Management & Receipts
     ========================================================================== */
  function renderFeesLedger() {
    const monthSelect = document.getElementById('feeMonthFilter');
    const selectedMonth = monthSelect.value || state.selectedFeeMonth;
    const classFilter = document.getElementById('feeClassFilter').value;
    const statusFilter = document.getElementById('feeStatusFilter').value;
    const searchVal = document.getElementById('feeSearchInput').value.toLowerCase().trim();

    const tbody = document.getElementById('feesTableBody');
    tbody.innerHTML = '';

    const monthRecords = state.fees[selectedMonth] || {};
    let filteredStudents = state.students.filter(s => s.active !== false);

    if (classFilter !== 'all') {
      filteredStudents = filteredStudents.filter(s => s.grade === classFilter);
    }
    if (searchVal) {
      filteredStudents = filteredStudents.filter(s => s.name.toLowerCase().includes(searchVal) || s.roll.toLowerCase().includes(searchVal));
    }

    filteredStudents.forEach(s => {
      const feeInfo = monthRecords[s.id] || { paid: 0, date: '', mode: 'Cash', receiptNo: '', remarks: '' };
      const paid = Number(feeInfo.paid) || 0;
      const expected = Number(s.monthlyFee) || 0;
      const balance = Math.max(0, expected - paid);

      let status = 'Pending';
      if (paid >= expected && expected > 0) status = 'Paid';
      else if (paid > 0 && paid < expected) status = 'Partial';

      if (statusFilter !== 'all' && statusFilter !== status) return;

      const tr = document.createElement('tr');

      const waMsg = encodeURIComponent(`Dear Parent, this is a receipt/reminder from Alpha Classes for ${s.name}: Month: ${formatMonthName(selectedMonth)}, Monthly Fee: Rs. ${expected}, Amount Paid: Rs. ${paid}, Balance Due: Rs. ${balance}. Regards, Alpha Classes.`);
      const waUrl = `https://wa.me/91${s.phone}?text=${waMsg}`;

      tr.innerHTML = `
        <td>
          <div class="fw-bold">${s.name}</div>
          <div class="small text-muted font-monospace">${s.roll}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${s.grade}</span></td>
        <td class="fw-bold">₹${expected.toLocaleString('en-IN')}</td>
        <td class="fw-bold text-success">₹${paid.toLocaleString('en-IN')}</td>
        <td class="fw-bold text-danger">₹${balance.toLocaleString('en-IN')}</td>
        <td>
          <span class="status-pill status-${status.toLowerCase()}">${status}</span>
        </td>
        <td>
          <div class="small">${feeInfo.date ? formatDisplayDate(feeInfo.date) : '—'}</div>
          <div class="small text-muted">${feeInfo.mode || ''}</div>
        </td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-danger pay-btn" data-id="${s.id}" title="Record/Edit Payment">
              <i class="bi bi-credit-card"></i> Pay
            </button>
            <button class="btn btn-sm btn-outline-dark receipt-btn" data-id="${s.id}" title="Print Receipt">
              <i class="bi bi-receipt"></i>
            </button>
            <a href="${waUrl}" target="_blank" class="btn-whatsapp" title="WhatsApp Reminder/Receipt">
              <i class="bi bi-whatsapp"></i>
            </a>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });

    if (tbody.children.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No fee records match the selected filters.</td></tr>';
    }

    // Attach listeners
    tbody.querySelectorAll('.pay-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openPaymentModal(btn.dataset.id, selectedMonth);
      });
    });

    tbody.querySelectorAll('.receipt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showReceiptModal(btn.dataset.id, selectedMonth);
      });
    });
  }

  function openPaymentModal(studentId, monthKey) {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;

    const select = document.getElementById('paymentStudentSelect');
    select.innerHTML = `<option value="${student.id}">${student.name} (${student.roll}) — Monthly Fee: ₹${student.monthlyFee}</option>`;

    const monthSelect = document.getElementById('paymentMonthSelect');
    monthSelect.value = monthKey;

    const currentFee = (state.fees[monthKey] && state.fees[monthKey][studentId]) || {};
    document.getElementById('paymentDateInput').value = currentFee.date || getTodayDateKey();
    document.getElementById('paymentAmountInput').value = currentFee.paid || student.monthlyFee;
    document.getElementById('paymentModeSelect').value = currentFee.mode || 'Cash';
    document.getElementById('paymentRemarksInput').value = currentFee.remarks || '';

    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
  }

  function showReceiptModal(studentId, monthKey) {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;

    const feeInfo = (state.fees[monthKey] && state.fees[monthKey][studentId]) || { paid: 0, date: getTodayDateKey(), mode: 'Cash', remarks: '' };
    const paid = Number(feeInfo.paid) || 0;
    const total = Number(student.monthlyFee) || 0;
    const balance = Math.max(0, total - paid);

    document.getElementById('recNo').textContent = feeInfo.receiptNo || `AC-REC-${Date.now().toString().slice(-6)}`;
    document.getElementById('recDate').textContent = formatDisplayDate(feeInfo.date || getTodayDateKey());
    document.getElementById('recStudentName').textContent = student.name;
    document.getElementById('recRollNo').textContent = student.roll;
    document.getElementById('recClass').textContent = `${student.grade} (${student.batch} Batch)`;
    document.getElementById('recMonth').textContent = formatMonthName(monthKey);

    document.getElementById('recTotalFee').textContent = `₹${total.toLocaleString('en-IN')}`;
    document.getElementById('recAmountPaid').textContent = `₹${paid.toLocaleString('en-IN')}`;
    document.getElementById('recBalanceDue').textContent = `₹${balance.toLocaleString('en-IN')}`;
    document.getElementById('recPaymentMode').textContent = feeInfo.mode || 'Cash';
    document.getElementById('recRemarks').textContent = feeInfo.remarks || 'Fee received with thanks';
    document.getElementById('recPaidBadge').textContent = `₹${paid.toLocaleString('en-IN')}`;

    const modal = new bootstrap.Modal(document.getElementById('receiptModal'));
    modal.show();
  }

  /* ==========================================================================
     Tab 5: Students Directory
     ========================================================================== */
  function renderStudentsTable() {
    const classFilter = document.getElementById('studentsClassFilter').value;
    const batchFilter = document.getElementById('studentsBatchFilter').value;
    const searchVal = document.getElementById('studentsSearchInput').value.toLowerCase().trim();

    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    let filtered = [...state.students];

    if (classFilter !== 'all') filtered = filtered.filter(s => s.grade === classFilter);
    if (batchFilter !== 'all') filtered = filtered.filter(s => s.batch === batchFilter);
    if (searchVal) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchVal) ||
        s.roll.toLowerCase().includes(searchVal) ||
        s.phone.includes(searchVal)
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No students found. Click "Add New Student" above to enroll one!</td></tr>';
      return;
    }

    filtered.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="badge bg-light text-dark border font-monospace">${s.roll}</span></td>
        <td>
          <div class="student-meta-cell">
            <div class="student-avatar">${s.name.charAt(0)}</div>
            <div>
              <div class="student-name">${s.name}</div>
              <div class="small text-muted">${s.active !== false ? '<span class="text-success">● Active</span>' : '<span class="text-muted">○ Inactive</span>'}</div>
            </div>
          </div>
        </td>
        <td><span class="badge bg-light text-dark border">${s.grade}</span></td>
        <td><i class="bi bi-clock text-muted"></i> ${s.batch}</td>
        <td>
          <div>${s.parentName || 'Parent'}</div>
          <div class="small text-muted">${s.phone}</div>
        </td>
        <td class="fw-bold">₹${Number(s.monthlyFee).toLocaleString('en-IN')}</td>
        <td class="small text-muted">${formatDisplayDate(s.joinDate)}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-secondary edit-student-btn" data-id="${s.id}" title="Edit Profile">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger delete-student-btn" data-id="${s.id}" title="Delete Student">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.edit-student-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditStudentModal(btn.dataset.id));
    });

    tbody.querySelectorAll('.delete-student-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteStudent(btn.dataset.id));
    });
  }

  function openEditStudentModal(studentId) {
    const s = state.students.find(item => item.id === studentId);
    if (!s) return;

    document.getElementById('studentModalTitle').textContent = 'Edit Student Profile';
    document.getElementById('studentEditId').value = s.id;
    document.getElementById('studentNameInput').value = s.name;
    document.getElementById('studentRollInput').value = s.roll;
    document.getElementById('studentClassInput').value = s.grade;
    document.getElementById('studentBatchInput').value = s.batch;
    document.getElementById('studentParentInput').value = s.parentName || '';
    document.getElementById('studentPhoneInput').value = s.phone;
    document.getElementById('studentFeeInput').value = s.monthlyFee;
    document.getElementById('studentJoinDateInput').value = s.joinDate || getTodayDateKey();

    const modal = new bootstrap.Modal(document.getElementById('studentModal'));
    modal.show();
  }

  function deleteStudent(studentId) {
    const s = state.students.find(item => item.id === studentId);
    if (!s) return;

    if (confirm(`Are you sure you want to delete student "${s.name}" (${s.roll})?`)) {
      state.students = state.students.filter(item => item.id !== studentId);

      // Clean up orphan attendance for this student
      if (state.attendance) {
        Object.keys(state.attendance).forEach(dateKey => {
          if (state.attendance[dateKey] && state.attendance[dateKey][studentId]) {
            delete state.attendance[dateKey][studentId];
          }
        });
      }

      // Clean up orphan fees for this student
      if (state.fees) {
        Object.keys(state.fees).forEach(monthKey => {
          if (state.fees[monthKey] && state.fees[monthKey][studentId]) {
            delete state.fees[monthKey][studentId];
          }
        });
      }

      saveData();
      renderStudentsTable();
      populateDropdowns();
      showToast(`Student ${s.name} deleted.`);
    }
  }



  /* ==========================================================================
     Tab 6: Staff & Teachers Access Management
     ========================================================================== */
  function renderTeachersTable() {
    const tbody = document.getElementById('teachersTableBody');
    tbody.innerHTML = '';

    const teachers = AlphaAuth.getTeachers();

    teachers.forEach(t => {
      const tr = document.createElement('tr');
      const isCurrent = t.id === currentTeacher.id;
      const isAdmin = t.role === 'Admin';

      tr.innerHTML = `
        <td>
          <div class="fw-bold">${t.name} ${isCurrent ? '<span class="badge bg-danger ms-1">You</span>' : ''}</div>
          <div class="small text-muted">${t.phone || ''}</div>
        </td>
        <td><code>${t.username}</code></td>
        <td>
          <span class="badge ${isAdmin ? 'bg-danger' : 'bg-primary'}">${t.role}</span>
        </td>
        <td>${t.subject || 'Faculty'}</td>
        <td><code>••••••••</code></td>
        <td>
          ${!isCurrent && currentTeacher.role === 'Admin' ? `
            <button class="btn btn-sm btn-outline-danger delete-teacher-btn" data-id="${t.id}" title="Revoke Access">
              <i class="bi bi-trash"></i> Delete
            </button>
          ` : '<span class="text-muted small">Protected</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.delete-teacher-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Revoke access for this teacher?')) {
          const res = AlphaAuth.deleteTeacher(btn.dataset.id);
          if (res.success) {
            renderTeachersTable();
            showToast('Teacher access revoked.');
          } else {
            showToast(res.message || 'Cannot delete.');
          }
        }
      });
    });
  }

  /* ==========================================================================
     Tab 7: Notice Board & Announcements
     ========================================================================== */
  function renderTeacherAnnouncements() {
    const container = document.getElementById('teacherAnnouncementsList');
    container.innerHTML = '';

    const announcements = AlphaAuth.getAnnouncements();

    if (announcements.length === 0) {
      container.innerHTML = '<p class="text-muted py-3 text-center">No announcements posted yet. Click "Post Announcement" to create one.</p>';
      return;
    }

    announcements.forEach(ann => {
      const div = document.createElement('div');
      div.className = 'announcement-card d-flex justify-content-between align-items-start';
      div.innerHTML = `
        <div class="flex-grow-1">
          <div class="d-flex align-items-center gap-2 mb-1">
            <h6 class="fw-bold mb-0 text-dark">${ann.title}</h6>
            <span class="badge bg-light text-muted border">${formatDisplayDate(ann.date)}</span>
          </div>
          <p class="small text-secondary mb-1">${ann.content}</p>
          <div class="small text-muted fst-italic">— By ${ann.author}</div>
        </div>
        <button class="btn btn-sm btn-outline-danger delete-ann-btn ms-3" data-id="${ann.id}" title="Remove Notice">
          <i class="bi bi-trash"></i>
        </button>
      `;
      container.appendChild(div);
    });

    container.querySelectorAll('.delete-ann-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this announcement?')) {
          AlphaAuth.deleteAnnouncement(btn.dataset.id);
          renderTeacherAnnouncements();
          showToast('Announcement removed.');
        }
      });
    });
  }

  /* ==========================================================================
     Dropdown Population (Months, Classes, Students)
     ========================================================================== */
  function populateDropdowns() {
    // 1. Class Filters
    const classSelects = [
      document.getElementById('attendanceClassFilter'),
      document.getElementById('feeClassFilter'),
      document.getElementById('studentsClassFilter'),
      document.getElementById('registerClassFilter')
    ];

    classSelects.forEach(sel => {
      if (!sel) return;
      const cur = sel.value;
      sel.innerHTML = '<option value="all">All Classes</option>';
      ALL_CLASSES.forEach(cls => {
        sel.innerHTML += `<option value="${cls}">${cls}</option>`;
      });
      if (cur) sel.value = cur;
    });

    // 2. Billing Months dropdowns (Current, Past 5 months, Next 2 months)
    const monthSelects = [
      document.getElementById('feeMonthFilter'),
      document.getElementById('paymentMonthSelect'),
      document.getElementById('registerMonthSelect')
    ];

    const now = new Date();
    const monthsList = [];
    for (let i = -5; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsList.push({ key, label: formatMonthName(key), monthIdx: d.getMonth(), year: d.getFullYear() });
    }

    const feeMonthFilter = document.getElementById('feeMonthFilter');
    if (feeMonthFilter) {
      feeMonthFilter.innerHTML = '';
      monthsList.forEach(m => {
        feeMonthFilter.innerHTML += `<option value="${m.key}">${m.label}</option>`;
      });
      feeMonthFilter.value = state.selectedFeeMonth;
    }

    const payMonthSelect = document.getElementById('paymentMonthSelect');
    if (payMonthSelect) {
      payMonthSelect.innerHTML = '';
      monthsList.forEach(m => {
        payMonthSelect.innerHTML += `<option value="${m.key}">${m.label}</option>`;
      });
      payMonthSelect.value = state.selectedFeeMonth;
    }

    // Register Month & Year
    const regMSelect = document.getElementById('registerMonthSelect');
    const regYSelect = document.getElementById('registerYearSelect');
    if (regMSelect && regYSelect) {
      regMSelect.innerHTML = '';
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      monthNames.forEach((name, idx) => {
        regMSelect.innerHTML += `<option value="${idx}">${name}</option>`;
      });
      regMSelect.value = now.getMonth();

      regYSelect.innerHTML = '';
      for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) {
        regYSelect.innerHTML += `<option value="${y}">${y}</option>`;
      }
      regYSelect.value = now.getFullYear();
    }
  }

  /* ==========================================================================
     Backup & Restore
     ========================================================================== */
  function exportBackup() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      institute: 'Alpha Classes',
      students: state.students,
      attendance: state.attendance,
      fees: state.fees
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alpha-classes-backup-${getTodayDateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Alpha Classes data exported successfully!');
  }

  function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.students) {
          state.students = imported.students;
          state.attendance = imported.attendance || {};
          state.fees = imported.fees || {};
          saveData();
          populateDropdowns();
          switchTab(state.activeTab);
          showToast('Data restored successfully!');
        } else {
          showToast('Invalid backup file format.');
        }
      } catch (err) {
        showToast('Error reading backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function showToast(message) {
    const toastEl = document.getElementById('portalToast');
    document.getElementById('toastMessage').textContent = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }

  /* ==========================================================================
     Event Listeners
     ========================================================================== */
  function setupEventListeners() {
    // Nav tab switching
    document.querySelectorAll('.portal-nav-link[data-tab]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(link.dataset.tab);
      });
    });

    // Mobile sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.getElementById('portalSidebar').classList.toggle('open');
    });

    // Quick Topbar Buttons
    document.getElementById('quickAddStudentBtn').addEventListener('click', () => {
      document.getElementById('studentModalTitle').textContent = 'Add New Student';
      document.getElementById('studentForm').reset();
      document.getElementById('studentEditId').value = '';
      document.getElementById('studentJoinDateInput').value = getTodayDateKey();
      document.getElementById('studentRollInput').value = `AC-${state.students.length + 101}`;
      new bootstrap.Modal(document.getElementById('studentModal')).show();
    });

    document.getElementById('quickAttendanceBtn').addEventListener('click', () => {
      switchTab('attendance');
    });

    const forceSyncBtn = document.getElementById('forceSyncCloudBtn');
    if (forceSyncBtn) {
      forceSyncBtn.addEventListener('click', () => {
        forceSyncBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Syncing...';
        if (typeof window.AlphaFirebase !== 'undefined') {
          window.AlphaFirebase.fetchLatestCloudData().then(cloudData => {
            if (cloudData) {
              if (Array.isArray(cloudData.students)) {
                const demoIds = ['101', '102', '103', '104', '105', '106', '107', '108'];
                state.students = cloudData.students.filter(s => !demoIds.includes(String(s.id)) && !String(s.roll).startsWith('AC-10'));
              }
              if (cloudData.attendance) state.attendance = cloudData.attendance;
              if (cloudData.fees) state.fees = cloudData.fees;
              updateKPIs();
              populateDropdowns();
              switchTab(state.activeTab);
              showToast('Latest data synced from Google Cloud! ☁️');
            }
            forceSyncBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sync';
          }).catch(() => {
            forceSyncBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sync';
          });
        }
      });
    }

    document.getElementById('viewAllFeesBtn').addEventListener('click', () => {
      switchTab('fees');
    });



    document.getElementById('addNewStudentBtn').addEventListener('click', () => {
      document.getElementById('studentModalTitle').textContent = 'Add New Student';
      document.getElementById('studentForm').reset();
      document.getElementById('studentEditId').value = '';
      document.getElementById('studentJoinDateInput').value = getTodayDateKey();
      document.getElementById('studentRollInput').value = `AC-${state.students.length + 101}`;
      new bootstrap.Modal(document.getElementById('studentModal')).show();
    });

    // Student Form Submit
    document.getElementById('studentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = document.getElementById('studentEditId').value;
      const name = document.getElementById('studentNameInput').value.trim();
      const roll = document.getElementById('studentRollInput').value.trim();
      const grade = document.getElementById('studentClassInput').value;
      const batch = document.getElementById('studentBatchInput').value;
      const parentName = document.getElementById('studentParentInput').value.trim();
      const phone = document.getElementById('studentPhoneInput').value.trim().replace(/\D/g, '');
      const monthlyFee = Number(document.getElementById('studentFeeInput').value) || 0;
      const joinDate = document.getElementById('studentJoinDateInput').value || getTodayDateKey();

      if (editId) {
        const student = state.students.find(s => s.id === editId);
        if (student) {
          student.name = name;
          student.roll = roll;
          student.grade = grade;
          student.batch = batch;
          student.parentName = parentName;
          student.phone = phone;
          student.monthlyFee = monthlyFee;
          student.joinDate = joinDate;
        }
        showToast(`Student ${name} updated!`);
      } else {
        const newStudent = {
          id: Date.now().toString(),
          roll,
          name,
          grade,
          batch,
          parentName,
          phone,
          monthlyFee,
          joinDate,
          active: true
        };
        state.students.push(newStudent);
        showToast(`Student ${name} enrolled successfully! 🎉`);
      }

      saveData();
      bootstrap.Modal.getInstance(document.getElementById('studentModal')).hide();
      renderStudentsTable();
      populateDropdowns();
    });

    // Attendance Filter Events
    document.getElementById('attendanceDateInput').addEventListener('change', renderAttendanceRoster);
    document.getElementById('attendanceClassFilter').addEventListener('change', renderAttendanceRoster);
    document.getElementById('attendanceBatchFilter').addEventListener('change', renderAttendanceRoster);
    document.getElementById('attendanceSearchInput').addEventListener('input', renderAttendanceRoster);

    document.getElementById('markAllPresentBtn').addEventListener('click', () => markAllVisible('P'));
    document.getElementById('markAllAbsentBtn').addEventListener('click', () => markAllVisible('A'));
    document.getElementById('printAttendanceBtn').addEventListener('click', () => window.print());

    // Monthly Register Events
    document.getElementById('registerMonthSelect').addEventListener('change', renderMonthlyRegister);
    document.getElementById('registerYearSelect').addEventListener('change', renderMonthlyRegister);
    document.getElementById('registerClassFilter').addEventListener('change', renderMonthlyRegister);

    // Fee Filter Events
    document.getElementById('feeMonthFilter').addEventListener('change', (e) => {
      state.selectedFeeMonth = e.target.value;
      renderFeesLedger();
    });
    document.getElementById('feeClassFilter').addEventListener('change', renderFeesLedger);
    document.getElementById('feeStatusFilter').addEventListener('change', renderFeesLedger);
    document.getElementById('feeSearchInput').addEventListener('input', renderFeesLedger);

    document.getElementById('openAddPaymentModalBtn').addEventListener('click', () => {
      if (state.students.length === 0) {
        showToast('Please add students first.');
        return;
      }
      openPaymentModal(state.students[0].id, state.selectedFeeMonth);
    });

    document.getElementById('printFeeReportBtn').addEventListener('click', () => window.print());

    // Payment Form Submit
    document.getElementById('paymentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const studentId = document.getElementById('paymentStudentSelect').value;
      const monthKey = document.getElementById('paymentMonthSelect').value;
      const date = document.getElementById('paymentDateInput').value;
      const amount = Number(document.getElementById('paymentAmountInput').value) || 0;
      const mode = document.getElementById('paymentModeSelect').value;
      const remarks = document.getElementById('paymentRemarksInput').value.trim();

      if (!state.fees[monthKey]) state.fees[monthKey] = {};
      const recNo = `AC-REC-${Date.now().toString().slice(-6)}`;

      state.fees[monthKey][studentId] = {
        paid: amount,
        date,
        mode,
        receiptNo: recNo,
        remarks
      };

      saveData();
      bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
      renderFeesLedger();
      showToast('Fee payment recorded successfully! 💳');
    });

    // Student Filter Events
    document.getElementById('studentsClassFilter').addEventListener('change', renderStudentsTable);
    document.getElementById('studentsBatchFilter').addEventListener('change', renderStudentsTable);
    document.getElementById('studentsSearchInput').addEventListener('input', renderStudentsTable);

    // Backup & Restore
    document.getElementById('backupDataBtn').addEventListener('click', exportBackup);
    document.getElementById('restoreInput').addEventListener('change', importBackup);

    // Teacher Logout
    const logoutBtn = document.getElementById('teacherLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        AlphaAuth.logoutTeacher();
        window.location.href = 'index.html';
      });
    }

    // Add Teacher Modal & Form
    const openAddTeacherBtn = document.getElementById('openAddTeacherModalBtn');
    if (openAddTeacherBtn) {
      openAddTeacherBtn.addEventListener('click', () => {
        document.getElementById('teacherForm').reset();
        new bootstrap.Modal(document.getElementById('teacherModal')).show();
      });
    }

    const teacherForm = document.getElementById('teacherForm');
    if (teacherForm) {
      teacherForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('teacherNameInput').value.trim();
        const username = document.getElementById('teacherUsernameInput').value.trim();
        const pass = document.getElementById('teacherPassInput').value.trim();
        const role = document.getElementById('teacherRoleSelect').value;
        const subj = document.getElementById('teacherSubjectInput').value.trim();

        const res = AlphaAuth.addTeacher(name, username, pass, role, subj);
        if (res.success) {
          bootstrap.Modal.getInstance(document.getElementById('teacherModal')).hide();
          renderTeachersTable();
          showToast(`Teacher account for ${name} created!`);
        } else {
          showToast(res.message || 'Error creating account');
        }
      });
    }

    // Change Password Modal & Form
    const openChangePassBtn = document.getElementById('openChangePasswordModalBtn');
    if (openChangePassBtn) {
      openChangePassBtn.addEventListener('click', () => {
        document.getElementById('changePasswordForm').reset();
        document.getElementById('changePassUserDisplay').value = `${currentTeacher.name} (@${currentTeacher.username})`;
        new bootstrap.Modal(document.getElementById('changePasswordModal')).show();
      });
    }

    const changePassForm = document.getElementById('changePasswordForm');
    if (changePassForm) {
      changePassForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const p1 = document.getElementById('newPasswordInput').value.trim();
        const p2 = document.getElementById('confirmNewPasswordInput').value.trim();

        if (p1 !== p2) {
          alert('Passwords do not match! Please verify both fields.');
          return;
        }

        const res = AlphaAuth.updateTeacherPassword(currentTeacher.username, p1);
        if (res.success) {
          bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
          showToast('Password updated and saved to Google Cloud! 🔒');
        } else {
          showToast(res.message || 'Error updating password.');
        }
      });
    }

    // Add Announcement Modal & Form
    const openAddAnnBtn = document.getElementById('openAddAnnouncementModalBtn');
    if (openAddAnnBtn) {
      openAddAnnBtn.addEventListener('click', () => {
        document.getElementById('announcementForm').reset();
        new bootstrap.Modal(document.getElementById('announcementModal')).show();
      });
    }

    const annForm = document.getElementById('announcementForm');
    if (annForm) {
      annForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('annTitleInput').value.trim();
        const content = document.getElementById('annContentInput').value.trim();

        AlphaAuth.addAnnouncement(title, content, currentTeacher.name);
        bootstrap.Modal.getInstance(document.getElementById('announcementModal')).hide();
        renderTeacherAnnouncements();
        showToast('Announcement posted to Student Portal! 📢');
      });
    }
  }

  /* ==========================================================================
     Initialization
     ========================================================================== */
  function init() {
    loadData();
    populateDropdowns();

    // Set active teacher info
    const nameEl = document.getElementById('activeTeacherName');
    if (nameEl && currentTeacher) {
      nameEl.textContent = currentTeacher.name;
    }
    const subEl = document.getElementById('pageSubtitleText');
    if (subEl && currentTeacher) {
      subEl.textContent = `Logged in as: ${currentTeacher.name} (${currentTeacher.role})`;
    }

    // Set today's date in header
    const now = new Date();
    document.getElementById('currentDateDisplay').textContent = now.toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });

    setupEventListeners();
    switchTab('dashboard');

    // Initialize Real-time Google Firebase Cloud Sync
    if (typeof window.AlphaFirebase !== 'undefined') {
      window.AlphaFirebase.initSync(function (cloudData, source) {
        if (cloudData) {
          if (Array.isArray(cloudData.students)) {
            const demoIds = ['101', '102', '103', '104', '105', '106', '107', '108'];
            state.students = cloudData.students.filter(s => !demoIds.includes(String(s.id)) && !String(s.roll).startsWith('AC-10'));
          }
          if (cloudData.attendance) {
            state.attendance = cloudData.attendance;
          }
          if (cloudData.fees) {
            state.fees = cloudData.fees;
          }
          updateKPIs();
          populateDropdowns();
          // Seamlessly re-render currently active view with live cloud data
          switchTab(state.activeTab);
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

