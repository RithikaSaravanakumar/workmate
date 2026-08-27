/**
 * employees.js — WorkMate Employee Management Logic (Manager Only)
 * Handles: employee directory rendering, employee credentials creation,
 * editing employee details/password, and active-task protected deletion.
 */

"use strict";

// ----------------------------------------------------------------
// Load Employees
// ----------------------------------------------------------------
async function loadEmployees() {
  const grid = document.getElementById('employees-grid');
  if (!grid) return;

  grid.innerHTML = `<div style="text-align:center;grid-column:1/-1;padding:40px;"><div class="loading-spinner"></div></div>`;

  const { ok, data } = await apiFetch('/api/employees');

  if (!ok) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-state-icon">❌</div>
      <div class="empty-state-title">Failed to load employees</div>
    </div>`;
    showToast(data.error || 'Failed to load employees.', 'error');
    return;
  }

  // Update nav badge and subtitle
  const badge = document.getElementById('nav-emp-badge');
  if (badge) badge.textContent = data.length;
  const sub = document.getElementById('emp-count-sub');
  if (sub) sub.textContent = `${data.length} employee${data.length !== 1 ? 's' : ''} on your team`;

  // Update profile employees count
  const profEmp = document.getElementById('profile-employees');
  if (profEmp) profEmp.textContent = data.length;

  renderEmployeeGrid(data);
}

function renderEmployeeGrid(employees) {
  const grid = document.getElementById('employees-grid');
  if (!grid) return;

  if (!employees.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">👥</div>
        <div class="empty-state-title">No employees yet</div>
        <div class="empty-state-text">Add your first team member with login credentials to get started.</div>
        <button class="btn btn-primary" onclick="openAddEmployeeModal()">＋ Add Employee</button>
      </div>`;
    return;
  }

  grid.innerHTML = employees.map(emp => renderEmployeeCard(emp)).join('');
}

function renderEmployeeCard(emp) {
  const initials = getInitials(emp.name);
  const color = avatarColor(emp.name);
  const totalTasks    = emp.task_count || 0;
  const activeTasks   = emp.active_task_count || 0;
  const completedTasks = totalTasks - activeTasks;

  return `
    <div class="employee-card" id="emp-card-${escapeHtml(emp.employee_id)}">
      <div class="emp-card-header">
        <div class="emp-avatar" style="background:${color}; color: #0A0A0A;">${initials}</div>
        <div class="emp-card-info">
          <div class="emp-name">${escapeHtml(emp.name)}</div>
          <div class="emp-id">${escapeHtml(emp.employee_id)}</div>
          <div class="emp-dept" style="display:inline-block; margin-top:4px; padding: 2px 8px; border-radius: 999px; background: var(--bg-500); color: var(--yellow-400); font-size:11px; font-weight:600;">
            ${escapeHtml(emp.department)}
          </div>
        </div>
      </div>

      <div class="emp-detail-row">
        <span class="emp-detail-icon">✉️</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;">${escapeHtml(emp.email)}</span>
      </div>

      ${emp.phone ? `
        <div class="emp-detail-row" style="margin-top:2px;">
          <span class="emp-detail-icon">📞</span>
          <span style="font-size:13px; color:var(--text-300);">${escapeHtml(emp.phone)}</span>
        </div>
      ` : ''}

      <div class="emp-task-counts">
        <div class="emp-count-chip">
          <div class="emp-count-num" style="color:var(--text-100)">${totalTasks}</div>
          <div class="emp-count-label">Total</div>
        </div>
        <div class="emp-count-chip">
          <div class="emp-count-num" style="color:var(--amber-400)">${activeTasks}</div>
          <div class="emp-count-label">Active</div>
        </div>
        <div class="emp-count-chip">
          <div class="emp-count-num" style="color:var(--emerald-500)">${completedTasks}</div>
          <div class="emp-count-label">Done</div>
        </div>
      </div>

      <div class="emp-card-actions">
        <button class="btn btn-secondary btn-sm" style="flex:1;"
          onclick="openEditEmployeeModal('${escapeHtml(emp.employee_id)}')">
          ✏ Edit / Pwd
        </button>
        <button class="btn btn-sm" style="background:rgba(240,124,108,0.1);color:var(--coral-500);border:1px solid rgba(240,124,108,0.2);"
          onclick="deleteEmployee('${escapeHtml(emp.employee_id)}', '${escapeHtml(emp.name)}')">
          🗑 Remove
        </button>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------
// Add / Edit Employee Modals
// ----------------------------------------------------------------
function openAddEmployeeModal() {
  document.getElementById('emp-modal-title').textContent = 'Add Employee';
  document.getElementById('emp-submit-text').textContent = 'Add Employee';
  document.getElementById('emp-form').reset();
  document.getElementById('emp-edit-id').value = '';
  document.getElementById('emp-id-input').disabled = false;
  document.getElementById('emp-password-label').textContent = 'Initial Password (Default: Emp@1234)';
  clearEmpFormErrors();

  apiFetch('/api/employees').then(({ data }) => {
    if (Array.isArray(data)) {
      const nums = data.map(e => parseInt((e.employee_id || '').replace(/\D/g, '')) || 0);
      const next = Math.max(100, ...nums) + 1;
      document.getElementById('emp-id-input').value = `EMP-${String(next).padStart(3, '0')}`;
    }
  }).catch(() => {});

  openOverlay('emp-modal-overlay');
}

async function openEditEmployeeModal(empId) {
  document.getElementById('emp-modal-title').textContent = 'Edit Employee';
  document.getElementById('emp-submit-text').textContent = 'Save Changes';
  document.getElementById('emp-password-label').textContent = 'Reset Password (Leave blank to keep unchanged)';
  clearEmpFormErrors();

  const { ok, data } = await apiFetch('/api/employees');
  if (!ok) { showToast('Failed to load employee data.', 'error'); return; }

  const emp = data.find(e => e.employee_id.toUpperCase() === empId.toUpperCase());
  if (!emp) { showToast('Employee not found.', 'error'); return; }

  document.getElementById('emp-edit-id').value = emp.employee_id;
  document.getElementById('emp-id-input').value = emp.employee_id;
  document.getElementById('emp-id-input').disabled = true;
  document.getElementById('emp-name-input').value = emp.name;
  document.getElementById('emp-email-input').value = emp.email;
  document.getElementById('emp-dept-input').value = emp.department;
  document.getElementById('emp-password-input').value = '';

  openOverlay('emp-modal-overlay');
}

function closeEmpModal() {
  closeOverlay('emp-modal-overlay');
}

async function handleEmpSubmit(event) {
  event.preventDefault();
  if (!validateEmpForm()) return;

  const isEdit = !!document.getElementById('emp-edit-id').value;
  const editId = document.getElementById('emp-edit-id').value;
  const rawPassword = document.getElementById('emp-password-input').value.trim();

  const payload = {
    employee_id: document.getElementById('emp-id-input').value.trim(),
    name: document.getElementById('emp-name-input').value.trim(),
    email: document.getElementById('emp-email-input').value.trim(),
    department: document.getElementById('emp-dept-input').value,
  };

  if (rawPassword) {
    payload.password = rawPassword;
  }

  const btn = document.getElementById('emp-submit-btn');
  btn.disabled = true;

  try {
    let res;
    if (isEdit) {
      res = await apiFetch(`/api/employees/${encodeURIComponent(editId)}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      res = await apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(payload) });
    }

    if (res.ok) {
      showToast(isEdit ? 'Employee updated successfully!' : 'Employee added with login access!', 'success');
      closeEmpModal();
      loadEmployees();
    } else {
      const errEl = document.getElementById('emp-form-err');
      errEl.textContent = res.data.error || 'An error occurred.';
      errEl.classList.add('show');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  } finally {
    btn.disabled = false;
  }
}

function validateEmpForm() {
  clearEmpFormErrors();
  let valid = true;

  const id = document.getElementById('emp-id-input').value.trim();
  const name = document.getElementById('emp-name-input').value.trim();
  const email = document.getElementById('emp-email-input').value.trim();
  const dept = document.getElementById('emp-dept-input').value;

  if (!id) { setEmpErr('emp-id-err', 'Employee ID is required.'); valid = false; }
  if (!name) { setEmpErr('emp-name-err', 'Name is required.'); valid = false; }
  if (!email) { setEmpErr('emp-email-err', 'Email is required.'); valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmpErr('emp-email-err', 'Enter a valid email.'); valid = false; }
  if (!dept) { setEmpErr('emp-dept-err', 'Department is required.'); valid = false; }

  return valid;
}

function setEmpErr(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('show'); }
}

function clearEmpFormErrors() {
  ['emp-id-err', 'emp-name-err', 'emp-email-err', 'emp-dept-err', 'emp-password-err', 'emp-form-err']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.classList.remove('show'); }
    });
}

// ----------------------------------------------------------------
// Delete Employee (Checked for active tasks)
// ----------------------------------------------------------------
async function deleteEmployee(empId, empName) {
  const confirmed = await showConfirm(
    'Remove Employee',
    `Are you sure you want to remove "${empName}" (${empId})? Note: Deletion is blocked if active tasks are assigned.`,
    '👤',
    'Remove'
  );
  if (!confirmed) return;

  const { ok, data } = await apiFetch(`/api/employees/${encodeURIComponent(empId)}`, { method: 'DELETE' });
  if (ok) {
    showToast(`${empName} removed from team.`, 'success');
    loadEmployees();
  } else {
    showToast(data.error || 'Failed to remove employee.', 'error');
  }
}
