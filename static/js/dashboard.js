/**
 * dashboard.js — WorkMate Dashboard Logic (Manager & Employee Views)
 * Renders:
 * - Manager View: Team task KPIs, area activity chart, leave donut, pending queue, workload
 * - Employee View: Personal task KPIs, active tasks quick board with 1-click actions, leave feedback
 */

"use strict";

// ----------------------------------------------------------------
// Load Dashboard
// ----------------------------------------------------------------
async function loadDashboard() {
  const name = currentUser?.full_name || currentUser?.name || 'there';
  const firstName = name.split(' ')[0];
  const greetingEl = document.getElementById('greeting-text');
  if (greetingEl) {
    greetingEl.textContent = `${getGreeting()}, ${firstName}! 👋`;
  }

  const dateEl = document.getElementById('greeting-date');
  if (dateEl) dateEl.textContent = formatFullDate();

  const isMgr = (currentUser?.role === 'manager');
  const mgrView = document.getElementById('manager-dashboard-view');
  const empView = document.getElementById('employee-dashboard-view');

  if (mgrView && empView) {
    mgrView.style.display = isMgr ? 'block' : 'none';
    empView.style.display = isMgr ? 'none' : 'block';
  }

  try {
    const { ok, data } = await apiFetch('/api/dashboard');
    if (!ok) {
      showToast('Failed to load dashboard metrics.', 'error');
      return;
    }

    if (isMgr) {
      renderManagerDashboard(data);
    } else {
      renderEmployeeDashboard(data);
    }
    updateDashboardNavBadges(data);
  } catch (e) {
    showToast('Dashboard load error.', 'error');
  }
}

// ----------------------------------------------------------------
// MANAGER DASHBOARD RENDERER
// ----------------------------------------------------------------
function renderManagerDashboard(data) {
  const totalTasks = data.total || 0;
  const inProgTasks = data.in_progress || 0;
  const pendingLeaves = data.pending_leaves !== undefined ? data.pending_leaves : (data.leave_stats?.pending || 0);
  const approvedLeaves = data.approved_leaves !== undefined ? data.approved_leaves : (data.leave_stats?.approved || 0);

  animateCounter('stat-total', totalTasks);
  animateCounter('stat-progress', inProgTasks);
  animateCounter('stat-leaves-pending', pendingLeaves);
  animateCounter('stat-leaves-approved', approvedLeaves);

  // Profile stats
  const ptEl = document.getElementById('profile-total-tasks');
  const pcEl = document.getElementById('profile-completed-tasks');
  if (ptEl) ptEl.textContent = totalTasks;
  if (pcEl) pcEl.textContent = data.completed || 0;

  renderLeaveDonut(data.leave_stats || {});
  renderAreaChart(data);
  renderRecentTasks(data.recent_tasks || []);
  renderDashboardPendingLeaves(data.recent_leave_requests || data.leave_stats?.recent_requests || []);
  renderDashboardUpcomingLeaves(data.upcoming_approved_leaves || []);
  renderWorkload(data.employee_workload || []);
}

// ----------------------------------------------------------------
// EMPLOYEE DASHBOARD RENDERER
// ----------------------------------------------------------------
function renderEmployeeDashboard(data) {
  const totalTasks = data.total || 0;
  const inProg = data.in_progress || 0;
  const pending = data.pending || 0;
  const completed = data.completed || 0;

  animateCounter('emp-stat-total', totalTasks);
  animateCounter('emp-stat-progress', inProg);
  animateCounter('emp-stat-pending', pending);
  animateCounter('emp-stat-completed', completed);

  // Profile stats
  const ptEl = document.getElementById('profile-total-tasks');
  const pcEl = document.getElementById('profile-completed-tasks');
  if (ptEl) ptEl.textContent = totalTasks;
  if (pcEl) pcEl.textContent = completed;

  renderEmployeeActiveTasks(data.active_tasks || []);
  renderEmployeeLeaveStatus(data.recent_leave_requests || []);
}

function renderEmployeeActiveTasks(activeTasks) {
  const container = document.getElementById('emp-active-tasks-list');
  if (!container) return;

  if (!activeTasks.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:32px 0;">
        <div class="empty-state-icon">🎉</div>
        <div class="empty-state-text" style="font-weight:600; color:var(--text-100);">All Caught Up!</div>
        <p class="fs-xs text-muted" style="margin-top:4px;">You have no active pending or in-progress tasks right now.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="emp-tasks-container">
      ${activeTasks.map(t => {
        let actionBtn = '';
        if (t.status === 'Pending') {
          actionBtn = `<button class="btn-action-start" onclick="quickUpdateTaskStatus('${escapeHtml(t.id)}', 'In Progress')">▶ Start Task</button>`;
        } else if (t.status === 'In Progress') {
          actionBtn = `<button class="btn-action-complete" onclick="quickUpdateTaskStatus('${escapeHtml(t.id)}', 'Completed')">✓ Mark Done</button>`;
        } else {
          actionBtn = `<button class="btn-action-reopen" onclick="quickUpdateTaskStatus('${escapeHtml(t.id)}', 'In Progress')">⟳ Reopen</button>`;
        }

        return `
          <div class="emp-task-card">
            <div class="emp-task-info">
              <div class="emp-task-header">
                <span class="emp-task-id">${escapeHtml(t.id)}</span>
                ${priorityBadge(t.priority)}
                ${statusBadge(t.status)}
              </div>
              <div class="emp-task-title">${escapeHtml(t.title)}</div>
              ${t.description ? `<div class="emp-task-desc">${escapeHtml(t.description)}</div>` : ''}
            </div>
            <div class="emp-task-actions">
              ${actionBtn}
              <button class="btn btn-sm btn-secondary" onclick="openTaskActivityModal('${escapeHtml(t.id)}')" title="Activity Log">📋 History</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderEmployeeLeaveStatus(leaves) {
  const container = document.getElementById('emp-leaves-summary-list');
  if (!container) return;

  if (!leaves.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 16px 0;">
        <div class="empty-state-icon">🌴</div>
        <div class="empty-state-text">No leave requests submitted yet.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = leaves.slice(0, 4).map(l => `
    <div class="upcoming-leave-row" onclick="openLeaveDetails('${escapeHtml(l.id)}')" style="cursor:pointer; flex-direction:column; align-items:flex-start; gap:4px;">
      <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
        <div style="font-weight:600; font-size:13px; color:var(--text-100);">${escapeHtml(l.leave_type)} Leave (${l.days_count} Days)</div>
        ${leaveStatusBadge(l.status)}
      </div>
      <div style="font-size:11px; color:var(--text-300);">📅 ${formatDate(l.start_date)} to ${formatDate(l.end_date)}</div>
      ${l.manager_comment ? `<div style="font-size:11px; color:var(--emerald-400); margin-top:2px;">💬 Manager: "${escapeHtml(l.manager_comment)}"</div>` : ''}
      ${l.rejection_reason ? `<div style="font-size:11px; color:var(--coral-400); margin-top:2px;">✕ Reason: "${escapeHtml(l.rejection_reason)}"</div>` : ''}
    </div>
  `).join('');
}

// ----------------------------------------------------------------
// Shared Counter Animation
// ----------------------------------------------------------------
function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ----------------------------------------------------------------
// Manager Leave Donut Chart
// ----------------------------------------------------------------
function renderLeaveDonut(leaveStats) {
  const approved = leaveStats.approved || 0;
  const pending  = leaveStats.pending || 0;
  const rejected = leaveStats.rejected || 0;
  const total    = approved + pending + rejected;
  const circ     = 2 * Math.PI * 38;

  const totalEl = document.getElementById('donut-leave-total');
  const legApp  = document.getElementById('legend-approved');
  const legPen  = document.getElementById('legend-pending');
  const legRej  = document.getElementById('legend-rejected');

  if (totalEl) totalEl.textContent = total;
  if (legApp)  legApp.textContent  = approved;
  if (legPen)  legPen.textContent  = pending;
  if (legRej)  legRej.textContent  = rejected;

  if (total === 0) {
    setArc('donut-approved', 0, circ, 0);
    setArc('donut-pending',  0, circ, 0);
    setArc('donut-rejected', 0, circ, 0);
    return;
  }

  const lenA = circ * (approved / total);
  const lenP = circ * (pending / total);
  const lenR = circ * (rejected / total);

  setTimeout(() => {
    setArc('donut-approved', lenA, circ - lenA, 0);
    setArc('donut-pending',  lenP, circ - lenP, lenA);
    setArc('donut-rejected', lenR, circ - lenR, lenA + lenP);
  }, 150);
}

function setArc(id, dashLen, dashGap, offset) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.strokeDasharray  = `${dashLen} ${dashGap}`;
  el.style.strokeDashoffset = `${-offset}`;
}

// ----------------------------------------------------------------
// Area Activity Chart
// ----------------------------------------------------------------
let areaChartMode = 'week';
let areaChartData = null;

function setChartFilter(mode, btn) {
  areaChartMode = mode;
  document.querySelectorAll('.chart-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (areaChartData) drawAreaChart(areaChartData);
}

function renderAreaChart(data) {
  areaChartData = data;
  drawAreaChart(data);
}

function drawAreaChart(data) {
  const svg = document.getElementById('area-chart-svg');
  if (!svg) return;

  const total = data.total || 0;
  const days = areaChartMode === 'week'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['W1', 'W2', 'W3', 'W4'];

  const seed = total + (data.completed || 0) + (data.pending_leaves || 0);
  const points = days.map((_, i) => {
    return Math.max(1, Math.floor((seed * (0.35 + 0.12 * i)) % (Math.max(seed, 6))));
  });

  if (total > 0) {
    const sum = points.reduce((a, b) => a + b, 0) || 1;
    points.forEach((_, i) => points[i] = Math.round((points[i] / sum) * total) + 1);
  }

  const W = 600, H = 160;
  const padL = 10, padR = 20, padT = 10, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(...points, 1);
  const stepX = chartW / (points.length - 1);

  const toX = (i) => padL + i * stepX;
  const toY = (v) => padT + chartH - (v / maxVal) * chartH;

  let pathD = `M ${toX(0)} ${toY(points[0])}`;
  for (let i = 1; i < points.length; i++) {
    const x1 = toX(i - 1) + stepX / 3;
    const y1 = toY(points[i - 1]);
    const x2 = toX(i) - stepX / 3;
    const y2 = toY(points[i]);
    pathD += ` C ${x1} ${y1}, ${x2} ${y2}, ${toX(i)} ${toY(points[i])}`;
  }

  let areaD = pathD;
  areaD += ` L ${toX(points.length - 1)} ${padT + chartH}`;
  areaD += ` L ${toX(0)} ${padT + chartH} Z`;

  const gradId = 'area-grad-' + Date.now();

  svg.innerHTML = `
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--yellow-500)" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="var(--yellow-500)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${[0.25, 0.5, 0.75, 1].map(t => {
      const y = padT + chartH * (1 - t);
      return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4"/>`;
    }).join('')}
    <path d="${areaD}" fill="url(#${gradId})"/>
    <path d="${pathD}" fill="none" stroke="var(--yellow-500)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map((v, i) => `<circle cx="${toX(i)}" cy="${toY(v)}" r="4" fill="var(--yellow-500)" stroke="var(--bg-700)" stroke-width="2"/>`).join('')}
    ${days.map((d, i) => `<text x="${toX(i)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="var(--text-300)" font-family="Inter, sans-serif">${d}</text>`).join('')}
  `;
}

// ----------------------------------------------------------------
// Manager Pending Leaves Queue
// ----------------------------------------------------------------
function renderDashboardPendingLeaves(recentLeaves) {
  const container = document.getElementById('dash-pending-leaves-list');
  if (!container) return;

  const pending = recentLeaves.filter(l => l.status === 'Pending');

  if (!pending.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px 0;">
        <div class="empty-state-icon">🌴</div>
        <div class="empty-state-text">No pending leave requests at the moment.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = pending.slice(0, 3).map((l, i) => `
    <div class="recent-task-row" style="animation: fadeUp 0.3s ${i * 0.05}s var(--ease-out) both;">
      <div class="d-flex align-center gap-sm" style="flex:1; min-width:0;">
        <div style="width:32px; height:32px; border-radius:50%; background:${avatarColor(l.employee_name || l.employee_id)}; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#0A0A0A; flex-shrink:0;">
          ${getInitials(l.employee_name || l.employee_id || '?')}
        </div>
        <div style="overflow:hidden; text-overflow:ellipsis;">
          <div class="recent-task-title" style="font-weight:600;">${escapeHtml(l.employee_name || l.employee_id)} (${escapeHtml(l.leave_type)})</div>
          <div class="recent-task-emp" style="font-size:12px;">📅 ${formatDate(l.start_date)} – ${formatDate(l.end_date)} (${l.days_count} Days)</div>
        </div>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <button class="btn btn-sm btn-approve" onclick="approveLeave('${escapeHtml(l.id)}')" title="Approve">✓</button>
        <button class="btn btn-sm btn-reject" onclick="openRejectModal('${escapeHtml(l.id)}')" title="Reject">✕</button>
        <button class="btn btn-sm btn-ghost" onclick="openLeaveDetails('${escapeHtml(l.id)}')">👁</button>
      </div>
    </div>
  `).join('');
}

// ----------------------------------------------------------------
// Manager Upcoming Leaves
// ----------------------------------------------------------------
function renderDashboardUpcomingLeaves(upcomingLeaves) {
  const container = document.getElementById('dash-upcoming-leaves-list');
  if (!container) return;

  if (!upcomingLeaves.length) {
    container.innerHTML = `<div class="text-muted fs-sm text-center" style="padding:16px 0">No upcoming leaves scheduled.</div>`;
    return;
  }

  container.innerHTML = upcomingLeaves.slice(0, 4).map(l => `
    <div class="upcoming-leave-row" onclick="openLeaveDetails('${escapeHtml(l.id)}')" style="cursor:pointer;">
      <div class="d-flex align-center gap-sm" style="flex:1; min-width:0;">
        <div style="width:26px; height:26px; border-radius:50%; background:${avatarColor(l.employee_name || l.employee_id)}; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#0A0A0A; flex-shrink:0;">
          ${getInitials(l.employee_name || l.employee_id || '?')}
        </div>
        <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          <div style="font-size:13px; font-weight:600; color:var(--text-100);">${escapeHtml(l.employee_name || l.employee_id)}</div>
          <div style="font-size:11px; color:var(--text-300);">${formatDate(l.start_date)} – ${formatDate(l.end_date)}</div>
        </div>
      </div>
      <div class="badge badge-approved" style="font-size:10px; padding:2px 6px;">🌴 ${escapeHtml(l.leave_type)}</div>
    </div>
  `).join('');
}

// ----------------------------------------------------------------
// Manager Recent Tasks
// ----------------------------------------------------------------
function renderRecentTasks(tasks) {
  const container = document.getElementById('recent-tasks-list');
  if (!container) return;

  if (!tasks.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:24px 0">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">No tasks yet. Add your first task!</div>
      </div>`;
    return;
  }

  container.innerHTML = tasks.slice(0, 5).map((t, i) => `
    <div class="recent-task-row" style="animation: fadeUp 0.3s ${i * 0.05}s var(--ease-out) both;">
      <div style="flex:1; min-width:0;">
        <div class="recent-task-title">${escapeHtml(t.title)}</div>
        <div class="recent-task-emp">${escapeHtml(t.employee || t.employee_id || '—')}</div>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        ${priorityBadge(t.priority)}
        ${statusBadge(t.status)}
      </div>
    </div>
  `).join('');
}

// ----------------------------------------------------------------
// Manager Team Workload
// ----------------------------------------------------------------
function renderWorkload(workload) {
  const container = document.getElementById('workload-list');
  if (!container) return;

  if (!workload.length) {
    container.innerHTML = `<div class="text-muted fs-sm text-center" style="padding:20px 0">No employees yet.</div>`;
    return;
  }

  const maxTotal = Math.max(...workload.map(w => w.total), 1);

  container.innerHTML = workload.slice(0, 5).map(w => `
    <div class="workload-row">
      <div class="workload-emp">${escapeHtml(w.name)}</div>
      <div class="workload-bar-wrap">
        <div class="workload-bar" style="width:0%" data-target="${Math.round((w.total / maxTotal) * 100)}"></div>
      </div>
      <div class="workload-count">${w.total}</div>
    </div>
  `).join('');

  setTimeout(() => {
    container.querySelectorAll('.workload-bar').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  }, 100);
}

// ----------------------------------------------------------------
// Update Dashboard Badges
// ----------------------------------------------------------------
function updateDashboardNavBadges(data) {
  const taskBadge = document.getElementById('nav-task-badge');
  if (taskBadge) taskBadge.textContent = data.total || 0;

  const leaveBadge = document.getElementById('nav-leave-badge');
  if (leaveBadge && data.pending_leaves !== undefined) {
    leaveBadge.textContent = data.pending_leaves;
    leaveBadge.style.display = data.pending_leaves > 0 ? 'inline-block' : 'none';
  }

  const notifBadge = document.getElementById('header-notif-badge');
  if (notifBadge && data.pending_leaves !== undefined) {
    notifBadge.style.display = data.pending_leaves > 0 ? 'block' : 'none';
  }
}

// ----------------------------------------------------------------
// Status Badges Helpers
// ----------------------------------------------------------------
function statusBadge(status) {
  const map = {
    'Pending':     'badge-pending',
    'In Progress': 'badge-progress',
    'Completed':   'badge-completed',
  };
  const cls = map[status] || 'badge-pending';
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${escapeHtml(status)}</span>`;
}

function priorityBadge(priority) {
  const map = {
    'High':   'badge-high',
    'Medium': 'badge-medium',
    'Low':    'badge-low',
  };
  const cls = map[priority] || 'badge-low';
  return `<span class="badge ${cls}">${escapeHtml(priority)}</span>`;
}

function leaveStatusBadge(status) {
  const map = {
    'Pending':  'badge-pending',
    'Approved': 'badge-approved',
    'Rejected': 'badge-rejected',
  };
  const cls = map[status] || 'badge-pending';
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}
