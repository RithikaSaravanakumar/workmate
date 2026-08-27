/**
 * reports.js — WorkMate Reports & Analytics Module (Manager Only)
 * Renders: team productivity metrics, employee turnaround stats,
 * completion rate progress bars, and department workload breakdown.
 */

"use strict";

async function loadReports() {
  const tbodyEmp = document.getElementById('report-emp-tbody');
  const tbodyDept = document.getElementById('report-dept-tbody');
  if (tbodyEmp) tbodyEmp.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;"><div class="loading-spinner"></div></td></tr>';
  if (tbodyDept) tbodyDept.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;"><div class="loading-spinner"></div></td></tr>';

  try {
    const { ok, data } = await apiFetch('/api/reports');
    if (!ok) {
      showToast(data.error || 'Failed to load reports.', 'error');
      return;
    }

    renderReportKPIs(data);
    renderEmployeeProductivityTable(data.employee_stats || []);
    renderDepartmentBreakdownTable(data.department_breakdown || []);
  } catch (e) {
    showToast('Failed to load team analytics.', 'error');
  }
}

function renderReportKPIs(data) {
  const rate = data.completion_rate || 0;
  const kpiRate = document.getElementById('report-kpi-rate');
  const kpiRateBar = document.getElementById('report-kpi-rate-bar');
  const kpiDoneTasks = document.getElementById('report-kpi-done-tasks');
  const kpiTeam = document.getElementById('report-kpi-team');
  const kpiLeaves = document.getElementById('report-kpi-leaves');
  const kpiLeaveDays = document.getElementById('report-kpi-leave-days');

  if (kpiRate) kpiRate.textContent = `${rate}%`;
  if (kpiRateBar) kpiRateBar.style.width = `${rate}%`;
  if (kpiDoneTasks) kpiDoneTasks.textContent = `${data.completed_tasks || 0} of ${data.total_tasks || 0} tasks completed`;
  if (kpiTeam) kpiTeam.textContent = data.total_employees || 0;

  const leavesStats = data.leave_stats || {};
  if (kpiLeaves) kpiLeaves.textContent = leavesStats.approved || 0;
  if (kpiLeaveDays) kpiLeaveDays.textContent = `${leavesStats.total_leave_days_approved || 0} total days approved`;
}

function renderEmployeeProductivityTable(empStats) {
  const tbody = document.getElementById('report-emp-tbody');
  if (!tbody) return;

  if (!empStats.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:24px;">No employee records available.</td></tr>`;
    return;
  }

  tbody.innerHTML = empStats.map(e => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:28px; height:28px; border-radius:50%; background:${avatarColor(e.name)}; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#0A0A0A;">
            ${getInitials(e.name)}
          </div>
          <div>
            <div style="font-weight:600; color:var(--text-100);">${escapeHtml(e.name)}</div>
            <div style="font-size:11px; color:var(--text-300);">${escapeHtml(e.employee_id)}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-other">${escapeHtml(e.department)}</span></td>
      <td><strong>${e.total_tasks}</strong></td>
      <td><span class="text-sky">${e.in_progress}</span></td>
      <td><span class="text-emerald">${e.completed}</span></td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="progress-bar-wrap" style="width:70px; height:6px; margin:0;">
            <div class="progress-bar-fill" style="width:${e.completion_rate}%;"></div>
          </div>
          <span style="font-size:12px; font-weight:600; color:var(--text-100);">${e.completion_rate}%</span>
        </div>
      </td>
      <td><span class="badge badge-days">🌴 ${e.days_off} Days</span></td>
    </tr>
  `).join('');
}

function renderDepartmentBreakdownTable(deptStats) {
  const tbody = document.getElementById('report-dept-tbody');
  if (!tbody) return;

  if (!deptStats.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:24px;">No department data available.</td></tr>`;
    return;
  }

  tbody.innerHTML = deptStats.map(d => `
    <tr>
      <td><strong>${escapeHtml(d.department)}</strong></td>
      <td>${d.employees} Member${d.employees !== 1 ? 's' : ''}</td>
      <td>${d.tasks} Total Tasks</td>
      <td><span class="text-emerald font-weight-bold">${d.completed} Done</span></td>
      <td><span class="badge badge-days">🌴 ${d.days_off} Days</span></td>
    </tr>
  `).join('');
}
