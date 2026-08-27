/**
 * leaves.js — WorkMate Leave Management Module Logic
 * Handles:
 * - Manager View: Review approvals queue, approve/reject with mandatory reasons, view full history
 * - Employee View: Submit personal leave requests, auto-calculate days, track approval status and feedback
 */

"use strict";

let leaveFilterDebounceTimer = null;

// ----------------------------------------------------------------
// Load & Render Leaves
// ----------------------------------------------------------------
async function loadLeaves() {
  const search   = (document.getElementById('leave-search')?.value || '').trim();
  const type     = document.getElementById('leave-type-filter')?.value || '';
  const status   = document.getElementById('leave-status-filter')?.value || '';
  const empId    = document.getElementById('leave-emp-filter')?.value || '';
  const startD   = document.getElementById('leave-date-start')?.value || '';
  const endD     = document.getElementById('leave-date-end')?.value || '';

  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (type) params.set('type', type);
  if (status) params.set('status', status);
  if (empId) params.set('employee_id', empId);
  if (startD) params.set('start_date', startD);
  if (endD) params.set('end_date', endD);

  const isMgr = (currentUser?.role === 'manager');

  try {
    const [leavesRes, statsRes] = await Promise.all([
      apiFetch(`/api/leaves?${params.toString()}`),
      apiFetch('/api/leaves/stats'),
    ]);

    if (statsRes.ok) {
      renderLeaveStats(statsRes.data);
      updateLeaveNavBadges(statsRes.data);
    }

    if (leavesRes.ok) {
      if (isMgr) {
        renderPendingApprovalsQueue(leavesRes.data.filter(l => l.status === 'Pending'));
      }
      renderLeavesTable(leavesRes.data);
      const sub = document.getElementById('leave-count-sub');
      if (sub) {
        sub.textContent = isMgr
          ? `${leavesRes.data.length} leave record${leavesRes.data.length !== 1 ? 's' : ''} found`
          : `My leave history (${leavesRes.data.length} request${leavesRes.data.length !== 1 ? 's' : ''})`;
      }
    } else {
      renderLeavesTable([]);
      showToast(leavesRes.data.error || 'Failed to load leaves.', 'error');
    }

    if (isMgr) {
      populateLeaveEmployeeFilter();
    }
  } catch (e) {
    showToast('Failed to load leave records.', 'error');
  }
}

// ----------------------------------------------------------------
// Render Top Metric Cards
// ----------------------------------------------------------------
function renderLeaveStats(stats) {
  const pendingEl  = document.getElementById('leave-stat-pending');
  const approvedEl = document.getElementById('leave-stat-approved');
  const rejectedEl = document.getElementById('leave-stat-rejected');
  const daysEl     = document.getElementById('leave-stat-days');

  if (pendingEl)  pendingEl.textContent  = stats.pending || 0;
  if (approvedEl) approvedEl.textContent = stats.approved || 0;
  if (rejectedEl) rejectedEl.textContent = stats.rejected || 0;
  if (daysEl)     daysEl.textContent     = stats.total_leave_days_approved || 0;

  const countBadge = document.getElementById('pending-approvals-count-badge');
  if (countBadge) countBadge.textContent = stats.pending || 0;
}

// ----------------------------------------------------------------
// Render Pending Approvals Queue (Manager Only)
// ----------------------------------------------------------------
function renderPendingApprovalsQueue(pendingLeaves) {
  const container = document.getElementById('pending-approvals-cards');
  if (!container) return;

  if (!pendingLeaves.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px 0;">
        <div class="empty-state-icon">✨</div>
        <div class="empty-state-title" style="font-size: 15px;">All caught up!</div>
        <div class="empty-state-text">No pending leave requests requiring manager review.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="pending-approvals-grid">
      ${pendingLeaves.map(leave => `
        <div class="approval-card" id="approval-card-${escapeHtml(leave.id)}">
          <div class="approval-card-header">
            <div class="d-flex align-center gap-sm">
              <div class="emp-avatar-sm" style="background:${avatarColor(leave.employee_name || leave.employee_id)}; color:#0A0A0A;">
                ${getInitials(leave.employee_name || leave.employee_id || '?')}
              </div>
              <div>
                <div class="approval-emp-name">${escapeHtml(leave.employee_name || leave.employee_id)}</div>
                <div class="approval-emp-dept">${escapeHtml(leave.department || 'Employee')} • ${escapeHtml(leave.employee_id)}</div>
              </div>
            </div>
            ${leaveTypeBadge(leave.leave_type)}
          </div>

          <div class="approval-card-dates">
            <div class="date-chip">
              <span class="date-icon">📅</span>
              <span>${formatDate(leave.start_date)} ➔ ${formatDate(leave.end_date)}</span>
            </div>
            <div class="days-pill">${leave.days_count} Day${leave.days_count !== 1 ? 's' : ''}</div>
          </div>

          <div class="approval-card-reason" title="${escapeHtml(leave.reason)}">
            "${escapeHtml(leave.reason)}"
          </div>

          <div class="approval-card-actions">
            <button class="btn btn-sm btn-approve" onclick="approveLeave('${escapeHtml(leave.id)}')">
              ✓ Approve
            </button>
            <button class="btn btn-sm btn-reject" onclick="openRejectModal('${escapeHtml(leave.id)}')">
              ✕ Reject
            </button>
            <button class="btn btn-sm btn-ghost" onclick="openLeaveDetails('${escapeHtml(leave.id)}')">
              Details
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ----------------------------------------------------------------
// Render Leave History Table
// ----------------------------------------------------------------
function renderLeavesTable(leaves) {
  const tbody = document.getElementById('leaves-tbody');
  if (!tbody) return;

  const isMgr = (currentUser?.role === 'manager');

  if (!leaves.length) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-state-icon">🌴</div>
          <div class="empty-state-title">No leave records found</div>
          <div class="empty-state-text">Try adjusting your filters or apply for leave.</div>
          <button class="btn btn-primary" onclick="openLeaveModal()">🌴 Request Leave</button>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = leaves.map(l => {
    let actionButtons = '';
    if (isMgr) {
      actionButtons = `
        <div class="action-btns">
          <button class="action-btn" onclick="openLeaveDetails('${escapeHtml(l.id)}')" title="View details">👁</button>
          ${l.status === 'Pending' ? `
            <button class="action-btn action-btn-approve" onclick="approveLeave('${escapeHtml(l.id)}')" title="Approve">✓</button>
            <button class="action-btn action-btn-reject" onclick="openRejectModal('${escapeHtml(l.id)}')" title="Reject">✕</button>
          ` : ''}
          <button class="action-btn action-btn-delete" onclick="deleteLeave('${escapeHtml(l.id)}', '${escapeHtml(l.employee_name || l.employee_id)}')" title="Delete">🗑</button>
        </div>
      `;
    } else {
      // Employee Actions: View Details & Cancel if Pending
      actionButtons = `
        <div class="action-btns">
          <button class="action-btn" onclick="openLeaveDetails('${escapeHtml(l.id)}')" title="View details">👁</button>
          ${l.status === 'Pending' ? `
            <button class="action-btn action-btn-delete" onclick="deleteLeave('${escapeHtml(l.id)}', 'your leave request')" title="Cancel Request">✕</button>
          ` : ''}
        </div>
      `;
    }

    return `
      <tr id="leave-row-${escapeHtml(l.id)}">
        <td><span class="task-id-cell">${escapeHtml(l.id)}</span></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:30px; height:30px; border-radius:50%; background:${avatarColor(l.employee_name || l.employee_id)}; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#0A0A0A; flex-shrink:0;">
              ${getInitials(l.employee_name || l.employee_id || '?')}
            </div>
            <div>
              <div style="font-size:14px; font-weight:600; color:var(--text-100);">${escapeHtml(l.employee_name || l.employee_id)}</div>
              <div style="font-size:12px; color:var(--text-300);">${escapeHtml(l.department || '')} (${escapeHtml(l.employee_id)})</div>
            </div>
          </div>
        </td>
        <td>${leaveTypeBadge(l.leave_type)}</td>
        <td>
          <div style="font-size:13px; font-weight:500; color:var(--text-100);">${formatDate(l.start_date)} – ${formatDate(l.end_date)}</div>
          <div class="badge badge-days mt-xs" style="font-size:11px;">⏱ ${l.days_count} day${l.days_count !== 1 ? 's' : ''}</div>
        </td>
        <td>
          <div class="leave-reason-text" title="${escapeHtml(l.reason)}">${escapeHtml(l.reason)}</div>
          ${l.status === 'Rejected' && l.rejection_reason ? `
            <div class="leave-rejection-note" title="Rejection Reason: ${escapeHtml(l.rejection_reason)}">
              <span style="color:var(--coral-500); font-weight:600;">Reason:</span> ${escapeHtml(l.rejection_reason)}
            </div>
          ` : ''}
          ${l.manager_comment ? `
            <div class="leave-comment-note fs-xs text-muted" style="margin-top:2px;">
              💬 <em>${escapeHtml(l.manager_comment)}</em>
            </div>
          ` : ''}
        </td>
        <td>${leaveStatusBadge(l.status)}</td>
        <td>${actionButtons}</td>
      </tr>
    `;
  }).join('');
}

// ----------------------------------------------------------------
// Badges
// ----------------------------------------------------------------
function leaveStatusBadge(status) {
  const map = {
    'Approved': 'badge-approved',
    'Pending':  'badge-pending',
    'Rejected': 'badge-rejected',
  };
  const cls = map[status] || 'badge-pending';
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${escapeHtml(status)}</span>`;
}

function leaveTypeBadge(type) {
  const map = {
    'Casual': 'badge-casual',
    'Sick':   'badge-sick',
    'Earned': 'badge-earned',
    'Other':  'badge-other',
  };
  const cls = map[type] || 'badge-other';
  return `<span class="badge ${cls}">${escapeHtml(type)}</span>`;
}

// ----------------------------------------------------------------
// Filters & Search
// ----------------------------------------------------------------
function applyLeaveFilters() {
  if (currentPage === 'leaves') loadLeaves();
}

function clearLeaveFilters() {
  const search = document.getElementById('leave-search');
  const type   = document.getElementById('leave-type-filter');
  const status = document.getElementById('leave-status-filter');
  const emp    = document.getElementById('leave-emp-filter');
  const dStart = document.getElementById('leave-date-start');
  const dEnd   = document.getElementById('leave-date-end');

  if (search) search.value = '';
  if (type)   type.value = '';
  if (status) status.value = '';
  if (emp)    emp.value = '';
  if (dStart) dStart.value = '';
  if (dEnd)   dEnd.value = '';

  loadLeaves();
}

function debounceLeaveFilter() {
  clearTimeout(leaveFilterDebounceTimer);
  leaveFilterDebounceTimer = setTimeout(applyLeaveFilters, 300);
}

// ----------------------------------------------------------------
// Populate Employee Filter Dropdown (Manager Only)
// ----------------------------------------------------------------
async function populateLeaveEmployeeFilter() {
  const filterSelect = document.getElementById('leave-emp-filter');
  if (!filterSelect || filterSelect.dataset.loaded === 'true') return;

  try {
    const { ok, data } = await apiFetch('/api/employees');
    if (ok && Array.isArray(data)) {
      const currentVal = filterSelect.value;
      filterSelect.innerHTML = '<option value="">All Employees</option>' +
        data.map(e => `<option value="${escapeHtml(e.employee_id)}" ${e.employee_id === currentVal ? 'selected' : ''}>${escapeHtml(e.name)}</option>`).join('');
      filterSelect.dataset.loaded = 'true';
    }
  } catch (e) { /* ignore */ }
}

async function populateLeaveEmployeeModalSelect(selectedId = '') {
  const select = document.getElementById('leave-employee');
  if (!select) return;

  select.innerHTML = '<option value="">Loading team members…</option>';

  try {
    const { ok, data } = await apiFetch('/api/employees');
    if (!ok || !data.length) {
      select.innerHTML = '<option value="">No employees found — add employees first</option>';
      return;
    }

    select.innerHTML = '<option value="">Select team member…</option>' +
      data.map(e => `
        <option value="${escapeHtml(e.employee_id)}"
                data-name="${escapeHtml(e.name)}"
                data-dept="${escapeHtml(e.department)}"
                ${e.employee_id === selectedId ? 'selected' : ''}>
          ${escapeHtml(e.name)} (${escapeHtml(e.employee_id)} - ${escapeHtml(e.department)})
        </option>
      `).join('');
  } catch (e) {
    select.innerHTML = '<option value="">Failed to load employees</option>';
  }
}

function onLeaveEmployeeChange() {
  const select = document.getElementById('leave-employee');
  const err = document.getElementById('leave-employee-err');
  if (select && select.value && err) {
    err.textContent = '';
    err.classList.remove('show');
  }
}

// ----------------------------------------------------------------
// Submit Leave Modal & Auto Days Calculation
// ----------------------------------------------------------------
function openLeaveModal() {
  document.getElementById('leave-form').reset();
  clearLeaveFormErrors();

  const isMgr = (currentUser?.role === 'manager');
  const empGroup = document.getElementById('leave-employee-group');

  if (isMgr) {
    if (empGroup) empGroup.style.display = 'block';
    populateLeaveEmployeeModalSelect();
  } else {
    // If employee, hide employee dropdown because it's their own request
    if (empGroup) empGroup.style.display = 'none';
  }

  // Set default dates to today & tomorrow
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const formatDateYMD = (d) => {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const startInput = document.getElementById('leave-start-date');
  const endInput = document.getElementById('leave-end-date');
  if (startInput) startInput.value = formatDateYMD(today);
  if (endInput)   endInput.value = formatDateYMD(today);

  calculateModalLeaveDays();
  openOverlay('leave-modal-overlay');
}

function closeLeaveModal() {
  closeOverlay('leave-modal-overlay');
}

function calculateModalLeaveDays() {
  const startVal = document.getElementById('leave-start-date')?.value;
  const endVal = document.getElementById('leave-end-date')?.value;
  const preview = document.getElementById('leave-duration-preview');
  const textEl = document.getElementById('leave-duration-text');
  const tagEl = document.getElementById('leave-duration-tag');
  const errEl = document.getElementById('leave-end-date-err');

  if (!startVal || !endVal) {
    if (textEl) textEl.innerHTML = 'Duration: <strong>—</strong>';
    return 0;
  }

  const d1 = new Date(startVal + 'T00:00:00');
  const d2 = new Date(endVal + 'T00:00:00');

  if (d2 < d1) {
    if (preview) preview.classList.add('error');
    if (textEl) textEl.innerHTML = '<span style="color:var(--coral-500); font-weight:600;">⚠️ End date must be on or after start date</span>';
    if (tagEl) tagEl.textContent = 'Invalid Range';
    if (errEl) { errEl.textContent = 'End date cannot precede start date.'; errEl.classList.add('show'); }
    return -1;
  }

  if (preview) preview.classList.remove('error');
  if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }

  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (textEl) {
    textEl.innerHTML = `Duration: <strong>${diffDays} Day${diffDays !== 1 ? 's' : ''}</strong>`;
  }
  if (tagEl) {
    tagEl.textContent = diffDays === 1 ? 'Single Day' : `${diffDays} Days Total`;
  }
  return diffDays;
}

// ----------------------------------------------------------------
// Handle Leave Request Submission
// ----------------------------------------------------------------
async function handleLeaveSubmit(event) {
  event.preventDefault();
  clearLeaveFormErrors();

  const isMgr = (currentUser?.role === 'manager');
  let empId = '';
  let empName = '';
  let dept = '';

  if (isMgr) {
    const empSelect = document.getElementById('leave-employee');
    empId = empSelect?.value;
    const opt = empSelect?.options[empSelect.selectedIndex];
    empName = opt?.dataset?.name || '';
    dept = opt?.dataset?.dept || '';

    if (!empId) {
      setLeaveErr('leave-employee-err', 'Please select an employee.');
      return;
    }
  } else {
    empId = currentUser.employee_id;
    empName = currentUser.name || currentUser.full_name;
    dept = currentUser.department || '';
  }

  const leaveType  = document.getElementById('leave-type')?.value;
  const startDate  = document.getElementById('leave-start-date')?.value;
  const endDate    = document.getElementById('leave-end-date')?.value;
  const reason     = document.getElementById('leave-reason')?.value.trim();

  let valid = true;
  if (!leaveType) {
    setLeaveErr('leave-type-err', 'Please select leave type.');
    valid = false;
  }
  if (!startDate) {
    setLeaveErr('leave-start-date-err', 'Start date is required.');
    valid = false;
  }
  if (!endDate) {
    setLeaveErr('leave-end-date-err', 'End date is required.');
    valid = false;
  }
  if (startDate && endDate && endDate < startDate) {
    setLeaveErr('leave-end-date-err', 'End date cannot precede start date.');
    valid = false;
  }
  if (!reason) {
    setLeaveErr('leave-reason-err', 'Reason for leave is required.');
    valid = false;
  }

  if (!valid) return;

  const payload = {
    employee_id: empId,
    employee_name: empName,
    department: dept,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    reason: reason,
  };

  const btn = document.getElementById('leave-submit-btn');
  if (btn) btn.disabled = true;

  try {
    const { ok, data } = await apiFetch('/api/leaves', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (ok) {
      showToast('Leave request submitted successfully!', 'success');
      closeLeaveModal();
      loadLeaves();
      if (currentPage === 'dashboard') loadDashboard();
      if (currentPage === 'calendar') loadCalendar();
    } else {
      const errEl = document.getElementById('leave-form-err');
      if (errEl) {
        errEl.textContent = data.error || 'Failed to submit leave request.';
        errEl.classList.add('show');
      }
    }
  } catch (e) {
    showToast('Network error while submitting leave.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function setLeaveErr(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('show'); }
}

function clearLeaveFormErrors() {
  ['leave-employee-err', 'leave-type-err', 'leave-start-date-err', 'leave-end-date-err', 'leave-reason-err', 'leave-form-err']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.classList.remove('show'); }
    });
}

// ----------------------------------------------------------------
// Manager Approve Action
// ----------------------------------------------------------------
async function approveLeave(leaveId) {
  try {
    const { ok, data } = await apiFetch(`/api/leaves/${encodeURIComponent(leaveId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment: 'Approved by manager.' })
    });

    if (ok) {
      showToast(`Leave request ${leaveId} approved!`, 'success');
      loadLeaves();
      if (currentPage === 'dashboard') loadDashboard();
      if (currentPage === 'calendar') loadCalendar();
    } else {
      showToast(data.error || 'Failed to approve leave.', 'error');
    }
  } catch (e) {
    showToast('Network error during approval.', 'error');
  }
}

// ----------------------------------------------------------------
// Manager Reject Modal & Action
// ----------------------------------------------------------------
async function openRejectModal(leaveId) {
  document.getElementById('reject-leave-id').value = leaveId;
  const reasonInput = document.getElementById('reject-reason-input');
  if (reasonInput) reasonInput.value = '';
  const errEl = document.getElementById('reject-reason-err');
  if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }
  const formErr = document.getElementById('reject-form-err');
  if (formErr) { formErr.textContent = ''; formErr.classList.remove('show'); }

  const summaryEl = document.getElementById('reject-leave-summary');
  if (summaryEl) {
    summaryEl.innerHTML = '<div class="text-muted">Loading details…</div>';
  }

  openOverlay('reject-modal-overlay');

  try {
    const { ok, data } = await apiFetch(`/api/leaves/${encodeURIComponent(leaveId)}`);
    if (ok && summaryEl) {
      summaryEl.innerHTML = `
        <div style="font-weight:600; color:var(--text-100); margin-bottom:4px;">
          ${escapeHtml(data.employee_name || data.employee_id)} (${escapeHtml(data.leave_type)} Leave)
        </div>
        <div style="color:var(--text-200); font-size:12px;">
          Dates: <strong>${formatDate(data.start_date)}</strong> to <strong>${formatDate(data.end_date)}</strong> (${data.days_count} Days)
        </div>
        <div style="color:var(--text-300); font-size:12px; margin-top:4px;">
          Reason: <em>"${escapeHtml(data.reason)}"</em>
        </div>
      `;
    }
  } catch (e) { /* ignore */ }
}

function setRejectPreset(text) {
  const input = document.getElementById('reject-reason-input');
  if (input) {
    input.value = text;
    const err = document.getElementById('reject-reason-err');
    if (err) { err.textContent = ''; err.classList.remove('show'); }
  }
}

function closeRejectModal() {
  closeOverlay('reject-modal-overlay');
}

async function handleRejectSubmit() {
  const leaveId = document.getElementById('reject-leave-id')?.value;
  const reason = document.getElementById('reject-reason-input')?.value.trim();
  const errEl = document.getElementById('reject-reason-err');

  if (!reason) {
    if (errEl) {
      errEl.textContent = 'Please provide a rejection reason/comment.';
      errEl.classList.add('show');
    }
    return;
  }

  const btn = document.getElementById('reject-confirm-btn');
  if (btn) btn.disabled = true;

  try {
    const { ok, data } = await apiFetch(`/api/leaves/${encodeURIComponent(leaveId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: reason })
    });

    if (ok) {
      showToast(`Leave request ${leaveId} rejected.`, 'info');
      closeRejectModal();
      loadLeaves();
      if (currentPage === 'dashboard') loadDashboard();
      if (currentPage === 'calendar') loadCalendar();
    } else {
      const formErr = document.getElementById('reject-form-err');
      if (formErr) {
        formErr.textContent = data.error || 'Failed to reject leave.';
        formErr.classList.add('show');
      }
    }
  } catch (e) {
    showToast('Network error during rejection.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ----------------------------------------------------------------
// View Leave Details Modal
// ----------------------------------------------------------------
async function openLeaveDetails(leaveId) {
  const body = document.getElementById('leave-details-body');
  const footer = document.getElementById('leave-details-footer');
  if (body) body.innerHTML = '<div style="text-align:center; padding:30px;"><div class="loading-spinner"></div></div>';
  openOverlay('leave-details-modal-overlay');

  const isMgr = (currentUser?.role === 'manager');

  try {
    const { ok, data } = await apiFetch(`/api/leaves/${encodeURIComponent(leaveId)}`);
    if (!ok || !data) {
      if (body) body.innerHTML = '<div class="field-error show">Failed to load leave details.</div>';
      return;
    }

    if (body) {
      body.innerHTML = `
        <div class="leave-detail-card">
          <div class="d-flex justify-between align-center mb-md" style="flex-wrap:wrap; gap:10px;">
            <div class="d-flex align-center gap-sm">
              <div style="width:36px; height:36px; border-radius:50%; background:${avatarColor(data.employee_name || data.employee_id)}; display:flex; align-items:center; justify-content:center; font-weight:700; color:#0A0A0A;">
                ${getInitials(data.employee_name || data.employee_id || '?')}
              </div>
              <div>
                <div style="font-size:16px; font-weight:700; color:var(--text-100);">${escapeHtml(data.employee_name || data.employee_id)}</div>
                <div style="font-size:12px; color:var(--text-300);">${escapeHtml(data.department || 'General')} • ID: ${escapeHtml(data.employee_id)}</div>
              </div>
            </div>
            <div class="d-flex align-center gap-sm">
              ${leaveTypeBadge(data.leave_type)}
              ${leaveStatusBadge(data.status)}
            </div>
          </div>

          <div class="divider"></div>

          <div class="stats-grid mb-md" style="grid-template-columns: repeat(3, 1fr); gap:12px;">
            <div class="stat-card" style="padding:12px;">
              <div class="stat-label">Start Date</div>
              <div style="font-size:14px; font-weight:600; color:var(--text-100); margin-top:2px;">${formatDate(data.start_date)}</div>
            </div>
            <div class="stat-card" style="padding:12px;">
              <div class="stat-label">End Date</div>
              <div style="font-size:14px; font-weight:600; color:var(--text-100); margin-top:2px;">${formatDate(data.end_date)}</div>
            </div>
            <div class="stat-card" style="padding:12px;">
              <div class="stat-label">Total Duration</div>
              <div style="font-size:14px; font-weight:600; color:var(--yellow-500); margin-top:2px;">${data.days_count} Day${data.days_count !== 1 ? 's' : ''}</div>
            </div>
          </div>

          <div style="margin-bottom:16px;">
            <div class="fs-xs text-muted fw-600 mb-xs">REASON FOR LEAVE</div>
            <div style="background:var(--bg-600); border:1px solid var(--border); border-radius:var(--radius-md); padding:12px; font-size:14px; color:var(--text-100); line-height:1.5;">
              ${escapeHtml(data.reason)}
            </div>
          </div>

          ${data.status === 'Rejected' && data.rejection_reason ? `
            <div style="margin-bottom:16px;">
              <div class="fs-xs text-coral fw-600 mb-xs">✕ REJECTION REASON &amp; COMMENTS</div>
              <div style="background:rgba(240,124,108,0.1); border:1px solid rgba(240,124,108,0.3); border-radius:var(--radius-md); padding:12px; font-size:14px; color:var(--coral-400);">
                ${escapeHtml(data.rejection_reason)}
              </div>
            </div>
          ` : ''}

          ${data.manager_comment ? `
            <div style="margin-bottom:16px;">
              <div class="fs-xs text-muted fw-600 mb-xs">MANAGER NOTES</div>
              <div style="background:var(--bg-600); border:1px solid var(--border); border-radius:var(--radius-md); padding:12px; font-size:13px; color:var(--text-200);">
                💬 ${escapeHtml(data.manager_comment)}
              </div>
            </div>
          ` : ''}

          <div class="d-flex justify-between fs-xs text-muted" style="margin-top:16px; border-top:1px solid var(--border); padding-top:12px;">
            <div>Applied: ${formatDate(data.created_at)}</div>
            <div>Last Updated: ${formatDate(data.updated_at)}</div>
          </div>
        </div>
      `;
    }

    if (footer) {
      if (isMgr && data.status === 'Pending') {
        footer.innerHTML = `
          <button class="btn btn-secondary" onclick="closeLeaveDetailsModal()">Close</button>
          <button class="btn btn-danger" onclick="closeLeaveDetailsModal(); openRejectModal('${escapeHtml(data.id)}');">✕ Reject</button>
          <button class="btn btn-primary" onclick="closeLeaveDetailsModal(); approveLeave('${escapeHtml(data.id)}');">✓ Approve Leave</button>
        `;
      } else {
        footer.innerHTML = `<button class="btn btn-secondary" onclick="closeLeaveDetailsModal()">Close</button>`;
      }
    }
  } catch (e) {
    if (body) body.innerHTML = '<div class="field-error show">Error loading details.</div>';
  }
}

function closeLeaveDetailsModal() {
  closeOverlay('leave-details-modal-overlay');
}

// ----------------------------------------------------------------
// Delete Leave Record
// ----------------------------------------------------------------
async function deleteLeave(leaveId, empName) {
  const confirmed = await showConfirm(
    'Cancel / Delete Leave',
    `Are you sure you want to cancel or delete leave request ${leaveId}?`,
    '🌴',
    'Confirm'
  );
  if (!confirmed) return;

  const { ok, data } = await apiFetch(`/api/leaves/${encodeURIComponent(leaveId)}`, { method: 'DELETE' });
  if (ok) {
    showToast(`Leave request ${leaveId} removed.`, 'success');
    loadLeaves();
    if (currentPage === 'dashboard') loadDashboard();
    if (currentPage === 'calendar') loadCalendar();
  } else {
    showToast(data.error || 'Failed to delete leave.', 'error');
  }
}

// ----------------------------------------------------------------
// Update Navigation Badges
// ----------------------------------------------------------------
function updateLeaveNavBadges(stats) {
  const badge = document.getElementById('nav-leave-badge');
  if (badge) {
    const count = stats.pending || 0;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }

  const notifBadge = document.getElementById('header-notif-badge');
  if (notifBadge) {
    const count = stats.pending || 0;
    notifBadge.style.display = count > 0 ? 'block' : 'none';
  }
}
