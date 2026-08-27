/**
 * tasks.js — WorkMate Task Board & Activity History Logic
 * Handles:
 * - Manager View: Full CRUD, assignment, filtering, activity log audit trail
 * - Employee View: Assigned tasks, 1-click status transitions (Start, Complete, Reopen), task activity timeline
 */

"use strict";

// ----------------------------------------------------------------
// Load & Render Tasks
// ----------------------------------------------------------------
async function loadTasks() {
  const search = (document.getElementById('task-search')?.value || '').trim();
  const status = document.getElementById('status-filter')?.value || '';
  const priority = document.getElementById('priority-filter')?.value || '';
  const empFilter = document.getElementById('task-emp-filter')?.value || '';

  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (empFilter) params.set('employee_id', empFilter);

  // If Manager, populate the employee filter dropdown
  if (currentUser?.role === 'manager') {
    populateEmployeeFilterDropdown();
  }

  const { ok, data } = await apiFetch(`/api/tasks?${params.toString()}`);

  if (!ok) {
    renderTasksTable([]);
    showToast(data.error || 'Failed to load tasks.', 'error');
    return;
  }

  renderTasksTable(data);

  // Update nav badge & subtitle
  const taskBadge = document.getElementById('nav-task-badge');
  if (taskBadge) taskBadge.textContent = data.length;
  const sub = document.getElementById('task-count-sub');
  if (sub) sub.textContent = `${data.length} task${data.length !== 1 ? 's' : ''} found`;
}

function renderTasksTable(tasks) {
  const tbody = document.getElementById('tasks-tbody');
  if (!tbody) return;

  const isMgr = (currentUser?.role === 'manager');

  if (!tasks.length) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">No tasks found</div>
          <div class="empty-state-text">${isMgr ? 'Try adjusting your filters or add a new task.' : 'No tasks assigned matching your criteria.'}</div>
          ${isMgr ? '<button class="btn btn-primary" onclick="openAddTaskModal()">＋ Add First Task</button>' : ''}
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = tasks.map(task => {
    let actionButtons = '';

    if (isMgr) {
      actionButtons = `
        <div class="action-btns">
          <button class="action-btn action-btn-history" onclick="openTaskActivityModal('${escapeHtml(task.id)}')" title="Activity Log">📋</button>
          <button class="action-btn action-btn-edit" onclick="openEditTaskModal('${escapeHtml(task.id)}')" title="Edit task">✏</button>
          <button class="action-btn action-btn-delete" onclick="deleteTask('${escapeHtml(task.id)}', '${escapeHtml(task.title)}')" title="Delete task">🗑</button>
        </div>
      `;
    } else {
      // Employee Actions: Status transitions + History
      let transitionBtn = '';
      if (task.status === 'Pending') {
        transitionBtn = `<button class="btn-action-start" onclick="quickUpdateTaskStatus('${escapeHtml(task.id)}', 'In Progress')" title="Start working">▶ Start</button>`;
      } else if (task.status === 'In Progress') {
        transitionBtn = `<button class="btn-action-complete" onclick="quickUpdateTaskStatus('${escapeHtml(task.id)}', 'Completed')" title="Mark as completed">✓ Done</button>`;
      } else if (task.status === 'Completed') {
        transitionBtn = `<button class="btn-action-reopen" onclick="quickUpdateTaskStatus('${escapeHtml(task.id)}', 'In Progress')" title="Reopen this task">⟳ Reopen</button>`;
      }

      actionButtons = `
        <div style="display:flex; align-items:center; gap:6px;">
          ${transitionBtn}
          <button class="action-btn action-btn-history" onclick="openTaskActivityModal('${escapeHtml(task.id)}')" title="View History &amp; Logs">📋</button>
        </div>
      `;
    }

    return `
      <tr>
        <td><span class="task-id-cell">${escapeHtml(task.id)}</span></td>
        <td>
          <div class="task-title-cell">${escapeHtml(task.title)}</div>
          ${task.description ? `<div class="task-desc-cell">${escapeHtml(task.description.slice(0, 60))}${task.description.length > 60 ? '…' : ''}</div>` : ''}
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:28px;height:28px;border-radius:50%;background:${avatarColor(task.employee || task.employee_id || 'Unknown')};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0A0A0A;flex-shrink:0;">
              ${getInitials(task.employee || task.employee_id || '?')}
            </div>
            <span style="font-size:14px;font-weight:500;color:var(--text-100);">${escapeHtml(task.employee || task.employee_id || '—')}</span>
          </div>
        </td>
        <td>${priorityBadge(task.priority)}</td>
        <td>${statusBadge(task.status)}</td>
        <td><span style="font-size:13px;color:var(--text-300);">${formatDate(task.updated_at || task.created_at)}</span></td>
        <td>${actionButtons}</td>
      </tr>
    `;
  }).join('');
}

// ----------------------------------------------------------------
// Fast Status Update (Employee & Manager)
// ----------------------------------------------------------------
async function quickUpdateTaskStatus(taskId, newStatus, note = '') {
  try {
    const { ok, data } = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: newStatus, note }),
    });

    if (ok) {
      showToast(`Task ${taskId} moved to ${newStatus}!`, 'success');
      if (currentPage === 'tasks') loadTasks();
      if (currentPage === 'dashboard') loadDashboard();
    } else {
      showToast(data.error || 'Failed to update status.', 'error');
    }
  } catch (e) {
    showToast('Network error while updating status.', 'error');
  }
}

// ----------------------------------------------------------------
// Task Activity Timeline Modal
// ----------------------------------------------------------------
async function openTaskActivityModal(taskId) {
  const container = document.getElementById('task-activity-body');
  const titleEl = document.getElementById('task-activity-title');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center; padding:30px;"><div class="loading-spinner"></div></div>';
  openOverlay('task-activity-modal-overlay');

  try {
    const { ok, data } = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}/activity`);
    if (!ok) {
      container.innerHTML = `<div class="field-error show">${escapeHtml(data.error || 'Failed to load activity.')}</div>`;
      return;
    }

    if (titleEl) {
      titleEl.textContent = `📋 Task History — ${escapeHtml(data.task_id)}: ${escapeHtml(data.title)}`;
    }

    const logs = data.activity_log || [];
    if (!logs.length) {
      container.innerHTML = `<div class="text-muted fs-sm text-center" style="padding:20px 0;">No activity recorded yet for this task.</div>`;
      return;
    }

    // Render timeline (newest first)
    const reversedLogs = [...logs].reverse();
    container.innerHTML = `
      <div class="activity-timeline">
        ${reversedLogs.map(log => {
          let dotClass = 'updated';
          if (log.action === 'Created') dotClass = 'created';
          else if (log.action === 'Reopened') dotClass = 'reopened';
          else if (log.new_status === 'Completed') dotClass = 'completed';

          return `
            <div class="activity-item">
              <div class="activity-dot ${dotClass}"></div>
              <div class="activity-header">
                <span class="activity-actor">👤 ${escapeHtml(log.actor || 'User')}</span>
                <span class="activity-time">🕒 ${escapeHtml(log.timestamp || '—')}</span>
              </div>
              <div class="activity-action">
                <strong>${escapeHtml(log.action)}:</strong> ${log.previous_status ? `${escapeHtml(log.previous_status)} ➔ ` : ''}${escapeHtml(log.new_status || '')}
              </div>
              ${log.note ? `<div class="activity-note">${escapeHtml(log.note)}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="field-error show">Network error loading activity.</div>`;
  }
}

function closeTaskActivityModal() {
  closeOverlay('task-activity-modal-overlay');
}

// ----------------------------------------------------------------
// Filters
// ----------------------------------------------------------------
function applyTaskFilters() {
  if (currentPage === 'tasks') loadTasks();
}

function clearTaskFilters() {
  document.getElementById('task-search').value = '';
  document.getElementById('status-filter').value = '';
  document.getElementById('priority-filter').value = '';
  const empF = document.getElementById('task-emp-filter');
  if (empF) empF.value = '';
  loadTasks();
}

async function populateEmployeeFilterDropdown() {
  const select = document.getElementById('task-emp-filter');
  if (!select || select.options.length > 1) return;

  try {
    const { ok, data } = await apiFetch('/api/employees');
    if (ok && data.length) {
      data.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.employee_id;
        opt.textContent = `${e.name} (${e.employee_id})`;
        select.appendChild(opt);
      });
    }
  } catch (e) { /* ignore */ }
}

// ----------------------------------------------------------------
// Add / Edit Task Modal (Manager)
// ----------------------------------------------------------------
let taskModalMode = 'add'; // 'add' | 'edit'

async function openAddTaskModal() {
  taskModalMode = 'add';
  document.getElementById('task-modal-title').textContent = 'Add New Task';
  document.getElementById('task-submit-text').textContent = 'Add Task';
  document.getElementById('task-form').reset();
  document.getElementById('task-edit-id').value = '';
  document.getElementById('task-id-input').disabled = false;
  clearTaskFormErrors();

  try {
    const { data: tasks } = await apiFetch('/api/tasks');
    const nums = (tasks || []).map(t => parseInt((t.id || '').replace(/\D/g, '')) || 0);
    const next = Math.max(100, ...nums) + 1;
    document.getElementById('task-id-input').value = `TASK-${String(next).padStart(3, '0')}`;
  } catch (e) { /* ignore */ }

  await populateEmployeeDropdown('task-employee');
  document.getElementById('task-status').value = 'Pending';
  document.getElementById('task-priority').value = 'Medium';
  openOverlay('task-modal-overlay');
}

async function openEditTaskModal(taskId) {
  taskModalMode = 'edit';
  document.getElementById('task-modal-title').textContent = 'Edit Task';
  document.getElementById('task-submit-text').textContent = 'Save Changes';
  clearTaskFormErrors();

  const { ok, data } = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}`);
  if (!ok) { showToast(data.error || 'Failed to load task.', 'error'); return; }

  document.getElementById('task-edit-id').value = data.id;
  document.getElementById('task-id-input').value = data.id;
  document.getElementById('task-id-input').disabled = true;
  document.getElementById('task-title-input').value = data.title || '';
  document.getElementById('task-desc').value = data.description || '';
  document.getElementById('task-priority').value = data.priority || 'Medium';
  document.getElementById('task-status').value = data.status || 'Pending';

  await populateEmployeeDropdown('task-employee', data.employee_id);
  openOverlay('task-modal-overlay');
}

function closeTaskModal() {
  closeOverlay('task-modal-overlay');
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  if (!validateTaskForm()) return;

  const isEdit = taskModalMode === 'edit';
  const taskId = document.getElementById('task-id-input').value.trim();
  const editId = document.getElementById('task-edit-id').value;

  const empSelect = document.getElementById('task-employee');
  const empId = empSelect.value;
  const empName = empSelect.options[empSelect.selectedIndex]?.text || '';

  const payload = {
    id: taskId,
    title: document.getElementById('task-title-input').value.trim(),
    description: document.getElementById('task-desc').value.trim(),
    employee_id: empId,
    employee: empName,
    priority: document.getElementById('task-priority').value,
    status: document.getElementById('task-status').value,
  };

  const btn = document.getElementById('task-submit-btn');
  btn.disabled = true;

  try {
    let res;
    if (isEdit) {
      res = await apiFetch(`/api/tasks/${encodeURIComponent(editId)}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      res = await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
    }

    if (res.ok) {
      showToast(isEdit ? 'Task updated successfully!' : 'Task added successfully!', 'success');
      closeTaskModal();
      loadTasks();
      if (currentPage === 'dashboard') loadDashboard();
    } else {
      document.getElementById('task-form-err').textContent = res.data.error || 'An error occurred.';
      document.getElementById('task-form-err').classList.add('show');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  } finally {
    btn.disabled = false;
  }
}

function validateTaskForm() {
  clearTaskFormErrors();
  let valid = true;

  const id = document.getElementById('task-id-input').value.trim();
  const title = document.getElementById('task-title-input').value.trim();
  const employee = document.getElementById('task-employee').value;
  const priority = document.getElementById('task-priority').value;
  const status = document.getElementById('task-status').value;

  if (!id) { setTaskErr('task-id-err', 'Task ID is required.'); valid = false; }
  if (!title) { setTaskErr('task-title-err', 'Title is required.'); valid = false; }
  if (!employee) { setTaskErr('task-employee-err', 'Please assign an employee.'); valid = false; }
  if (!priority) { setTaskErr('task-priority-err', 'Priority is required.'); valid = false; }
  if (!status) { setTaskErr('task-status-err', 'Status is required.'); valid = false; }

  return valid;
}

function setTaskErr(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('show'); }
}

function clearTaskFormErrors() {
  ['task-id-err', 'task-title-err', 'task-employee-err', 'task-priority-err', 'task-status-err', 'task-form-err']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.classList.remove('show'); }
    });
}

// ----------------------------------------------------------------
// Delete Task (Manager)
// ----------------------------------------------------------------
async function deleteTask(taskId, taskTitle) {
  const confirmed = await showConfirm(
    'Delete Task',
    `Are you sure you want to delete "${taskTitle}"? This action cannot be undone.`,
    '🗑️',
    'Delete'
  );
  if (!confirmed) return;

  const { ok, data } = await apiFetch(`/api/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
  if (ok) {
    showToast('Task deleted successfully.', 'success');
    loadTasks();
    if (currentPage === 'dashboard') loadDashboard();
  } else {
    showToast(data.error || 'Failed to delete task.', 'error');
  }
}

// ----------------------------------------------------------------
// Populate Employee Dropdown
// ----------------------------------------------------------------
async function populateEmployeeDropdown(selectId, selectedEmpId = '') {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option value="">Loading employees…</option>';

  try {
    const { ok, data } = await apiFetch('/api/employees');
    if (!ok || !data.length) {
      select.innerHTML = '<option value="">No employees found — add one first</option>';
      return;
    }

    select.innerHTML = '<option value="">Select employee…</option>' +
      data.map(e => `<option value="${escapeHtml(e.employee_id)}" ${e.employee_id === selectedEmpId ? 'selected' : ''}>${escapeHtml(e.name)}</option>`).join('');
  } catch (e) {
    select.innerHTML = '<option value="">Failed to load employees</option>';
  }
}
