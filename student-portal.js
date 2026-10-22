/**
 * Alpha Classes — Student & Parent Portal Controller
 * Displays personalized attendance statistics, fee records, receipts, and announcements.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'alpha_classes_data_v1';

  // 1. Auth Guard: Check if Student is logged in
  const student = AlphaAuth.getCurrentStudent();
  if (!student) {
    window.location.href = 'login.html?type=student';
    return;
  }

  function getStorageData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Storage error', e);
    }
    return {};
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

  function initStudentPortal() {
    // 2. Render Student Profile Header
    document.getElementById('stName').textContent = student.name;
    document.getElementById('stMeta').textContent = `${student.grade} • ${student.batch} Batch`;
    document.getElementById('stRoll').textContent = student.roll;
    document.getElementById('stParent').textContent = student.parentName || 'Parent / Guardian';
    document.getElementById('stPhone').textContent = student.phone || '—';

    // 3. Render Attendance Analytics
    renderStudentAttendance();

    // 4. Render Fee Status & Receipts
    renderStudentFees();

    // 5. Render Announcements
    renderStudentAnnouncements();

    // 6. Logout listener
    document.getElementById('studentLogoutBtn').addEventListener('click', () => {
      AlphaAuth.logoutStudent();
      window.location.href = 'index.html';
    });

    // 7. Real-time Google Cloud Sync
    if (typeof window.AlphaFirebase !== 'undefined') {
      window.AlphaFirebase.initSync(function (cloudData) {
        if (cloudData) {
          // Check if current student data was updated
          if (cloudData.students && Array.isArray(cloudData.students)) {
            const updated = cloudData.students.find(s => s.id === student.id || s.roll === student.roll);
            if (updated) {
              Object.assign(student, updated);
              document.getElementById('stName').textContent = student.name;
              document.getElementById('stMeta').textContent = `${student.grade} • ${student.batch} Batch`;
              document.getElementById('stParent').textContent = student.parentName || 'Parent / Guardian';
              document.getElementById('stPhone').textContent = student.phone || '—';
            }
          }
          // Re-render live attendance, fees, and announcements
          renderStudentAttendance();
          renderStudentFees();
          renderStudentAnnouncements();
        }
      });
    }
  }

  function renderStudentAttendance() {
    const data = getStorageData();
    const attendance = data.attendance || {};

    let totalClasses = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    const recentLogs = [];

    // Sort dates descending
    const dateKeys = Object.keys(attendance).sort().reverse();

    dateKeys.forEach(dateKey => {
      const dayRecords = attendance[dateKey];
      if (dayRecords && dayRecords[student.id]) {
        const st = dayRecords[student.id];
        totalClasses++;
        if (st === 'P') presentCount++;
        else if (st === 'A') absentCount++;
        else if (st === 'L') lateCount++;
        else if (st === 'E') excusedCount++;

        recentLogs.push({ date: dateKey, status: st });
      }
    });

    const rate = totalClasses > 0 ? Math.round(((presentCount + lateCount) / totalClasses) * 100) : 100;

    // Update Counter values
    document.getElementById('statTotalClasses').textContent = totalClasses;
    document.getElementById('statPresentDays').textContent = presentCount;
    document.getElementById('statAbsentDays').textContent = absentCount;
    document.getElementById('statLateDays').textContent = lateCount;

    document.getElementById('attPercentText').textContent = `${rate}%`;
    const deg = Math.round((rate / 100) * 360);
    document.getElementById('attGauge').style.setProperty('--att-deg', `${deg}deg`);

    const statusWord = document.getElementById('attStatusWord');
    if (rate >= 85) {
      statusWord.textContent = 'Attendance Status: Excellent 🌟';
      statusWord.className = 'fw-bold mb-1 text-success';
    } else if (rate >= 75) {
      statusWord.textContent = 'Attendance Status: Good 👍';
      statusWord.className = 'fw-bold mb-1 text-dark';
    } else {
      statusWord.textContent = 'Attendance Status: Needs Attention ⚠️';
      statusWord.className = 'fw-bold mb-1 text-danger';
    }

    // Recent Attendance Log list
    const logContainer = document.getElementById('stRecentAttList');
    logContainer.innerHTML = '';

    if (recentLogs.length === 0) {
      logContainer.innerHTML = '<p class="small text-muted py-2">No attendance marked yet for this term.</p>';
      return;
    }

    recentLogs.slice(0, 10).forEach(log => {
      const div = document.createElement('div');
      div.className = 'd-flex justify-content-between align-items-center py-1 border-bottom small';

      let badge = '<span class="badge bg-success">Present</span>';
      if (log.status === 'A') badge = '<span class="badge bg-danger">Absent</span>';
      else if (log.status === 'L') badge = '<span class="badge bg-warning text-dark">Late</span>';
      else if (log.status === 'E') badge = '<span class="badge bg-info">Excused</span>';

      div.innerHTML = `
        <span class="text-muted"><i class="bi bi-calendar3 me-1"></i> ${formatDisplayDate(log.date)}</span>
        <div>${badge}</div>
      `;
      logContainer.appendChild(div);
    });
  }

  function renderStudentFees() {
    const data = getStorageData();
    const fees = data.fees || {};

    const curMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const curMonthRecord = (fees[curMonthKey] && fees[curMonthKey][student.id]) || { paid: 0 };

    const expectedFee = Number(student.monthlyFee) || 0;
    const paidAmount = Number(curMonthRecord.paid) || 0;
    const balanceDue = Math.max(0, expectedFee - paidAmount);

    document.getElementById('stMonthlyFeeText').textContent = `₹${expectedFee.toLocaleString('en-IN')}`;
    document.getElementById('stMonthLabel').textContent = formatMonthName(curMonthKey);

    const pill = document.getElementById('stFeeStatusPill');
    const dueText = document.getElementById('stAmountDueText');

    if (balanceDue === 0 && paidAmount > 0) {
      pill.className = 'status-pill status-paid';
      pill.textContent = 'PAID';
      dueText.className = 'h5 fw-bold text-success mb-0';
      dueText.textContent = 'All Clear (Paid)';
    } else if (paidAmount > 0 && balanceDue > 0) {
      pill.className = 'status-pill status-partial';
      pill.textContent = 'PARTIAL';
      dueText.className = 'h5 fw-bold text-warning mb-0';
      dueText.textContent = `Due: ₹${balanceDue.toLocaleString('en-IN')}`;
    } else {
      pill.className = 'status-pill status-pending';
      pill.textContent = 'PENDING';
      dueText.className = 'h5 fw-bold text-danger mb-0';
      dueText.textContent = `Due: ₹${balanceDue.toLocaleString('en-IN')}`;
    }

    // Payment History Table
    const tbody = document.getElementById('stPaymentHistoryBody');
    tbody.innerHTML = '';

    const monthKeys = Object.keys(fees).sort().reverse();
    let historyCount = 0;

    monthKeys.forEach(mKey => {
      const rec = fees[mKey][student.id];
      if (rec) {
        historyCount++;
        const p = Number(rec.paid) || 0;
        const due = Math.max(0, expectedFee - p);

        let stPill = '<span class="status-pill status-paid">Paid</span>';
        if (due > 0 && p > 0) stPill = '<span class="status-pill status-partial">Partial</span>';
        else if (p === 0) stPill = '<span class="status-pill status-pending">Unpaid</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${formatMonthName(mKey)}</strong></td>
          <td class="fw-bold text-success">₹${p.toLocaleString('en-IN')}</td>
          <td>${stPill}</td>
          <td>
            ${p > 0 ? `<button class="btn btn-sm btn-outline-danger view-receipt-btn" data-month="${mKey}">Receipt</button>` : '—'}
          </td>
        `;
        tbody.appendChild(tr);
      }
    });

    if (historyCount === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No payment records found yet.</td></tr>';
    }

    // Receipt modal click handlers
    tbody.querySelectorAll('.view-receipt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openStudentReceipt(btn.dataset.month);
      });
    });
  }

  function openStudentReceipt(monthKey) {
    const data = getStorageData();
    const rec = (data.fees && data.fees[monthKey] && data.fees[monthKey][student.id]) || {};

    const paid = Number(rec.paid) || 0;
    const total = Number(student.monthlyFee) || 0;
    const balance = Math.max(0, total - paid);

    document.getElementById('stRecNo').textContent = rec.receiptNo || `AC-REC-${Date.now().toString().slice(-6)}`;
    document.getElementById('stRecDate').textContent = formatDisplayDate(rec.date || new Date().toISOString().split('T')[0]);
    document.getElementById('stRecStudentName').textContent = student.name;
    document.getElementById('stRecRollNo').textContent = student.roll;
    document.getElementById('stRecClass').textContent = `${student.grade} (${student.batch} Batch)`;
    document.getElementById('stRecMonth').textContent = formatMonthName(monthKey);

    document.getElementById('stRecTotalFee').textContent = `₹${total.toLocaleString('en-IN')}`;
    document.getElementById('stRecAmountPaid').textContent = `₹${paid.toLocaleString('en-IN')}`;
    document.getElementById('stRecBalanceDue').textContent = `₹${balance.toLocaleString('en-IN')}`;
    document.getElementById('stRecPaymentMode').textContent = rec.mode || 'Cash / Online';
    document.getElementById('stRecPaidBadge').textContent = `₹${paid.toLocaleString('en-IN')}`;

    new bootstrap.Modal(document.getElementById('studentReceiptModal')).show();
  }

  function renderStudentAnnouncements() {
    const announcements = AlphaAuth.getAnnouncements();
    const container = document.getElementById('stAnnouncementsList');
    container.innerHTML = '';

    if (announcements.length === 0) {
      container.innerHTML = '<p class="text-muted">No new announcements at this time.</p>';
      return;
    }

    announcements.forEach(ann => {
      const div = document.createElement('div');
      div.className = 'announcement-card';
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-1">
          <h6 class="fw-bold mb-0 text-dark">${ann.title}</h6>
          <span class="badge bg-light text-muted border">${formatDisplayDate(ann.date)}</span>
        </div>
        <p class="small text-secondary mb-1">${ann.content}</p>
        <div class="small text-muted fst-italic">— By ${ann.author}</div>
      `;
      container.appendChild(div);
    });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', initStudentPortal);

})();

