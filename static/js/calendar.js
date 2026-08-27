/**
 * calendar.js — WorkMate Calendar Integration
 * Renders an interactive monthly calendar displaying approved employee leaves
 * with distinct visual indicators and task schedules.
 */

"use strict";

let calCurrentDate = new Date();

async function loadCalendar() {
  const monthTitle = document.getElementById('calendar-month-title');
  if (monthTitle) {
    monthTitle.textContent = calCurrentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const grid = document.getElementById('calendar-days-grid');
  if (grid) {
    grid.innerHTML = '<div class="loading-spinner" style="grid-column:1/-1; margin:60px auto;"></div>';
  }

  try {
    const { ok, data } = await apiFetch('/api/calendar');
    if (!ok) {
      showToast('Failed to load calendar events.', 'error');
      return;
    }

    const approvedLeaves = data.approved_leaves || [];
    const tasks = data.tasks || [];

    renderCalendarGrid(calCurrentDate, approvedLeaves, tasks);
    renderCalendarUpcomingLeaves(approvedLeaves);
  } catch (e) {
    showToast('Failed to load calendar data.', 'error');
  }
}

function calendarPrevMonth() {
  calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
  loadCalendar();
}

function calendarNextMonth() {
  calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
  loadCalendar();
}

function calendarGoToday() {
  calCurrentDate = new Date();
  loadCalendar();
}

function renderCalendarGrid(dateObj, leaves, tasks) {
  const grid = document.getElementById('calendar-days-grid');
  if (!grid) return;

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();

  // First day of month & total days
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
  // Convert so Monday is 0: (day + 6) % 7
  const startOffset = (firstDayIndex + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  let html = '';

  // 1. Previous month trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    const prevD = daysInPrevMonth - i;
    html += `
      <div class="calendar-day-cell other-month">
        <div class="day-num">${prevD}</div>
      </div>
    `;
  }

  // 2. Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = isCurrentMonth && day === todayDate;

    // Filter leaves active on this day (start_date <= dateStr <= end_date)
    const dayLeaves = leaves.filter(l => l.start_date <= dateStr && l.end_date >= dateStr);
    
    // Filter tasks created on this day or due
    const dayTasks = tasks.filter(t => (t.created_at || '').startsWith(dateStr));

    html += `
      <div class="calendar-day-cell ${isToday ? 'today' : ''} ${dayLeaves.length ? 'has-leaves' : ''}" id="cal-day-${dateStr}">
        <div class="day-header">
          <span class="day-num ${isToday ? 'today-badge' : ''}">${day}</span>
          ${isToday ? '<span class="today-label">Today</span>' : ''}
        </div>
        <div class="day-events">
          ${dayLeaves.map(l => `
            <div class="calendar-event-pill event-leave"
                 onclick="openLeaveDetails('${escapeHtml(l.id)}')"
                 title="${escapeHtml(l.employee_name || l.employee_id)} (${l.leave_type} Leave: ${l.start_date} to ${l.end_date}) - ${escapeHtml(l.reason)}">
              <span class="event-icon">🌴</span>
              <span class="event-text"><strong>${escapeHtml(l.employee_name ? l.employee_name.split(' ')[0] : l.employee_id)}</strong> (${escapeHtml(l.leave_type)})</span>
            </div>
          `).join('')}

          ${dayTasks.slice(0, 2).map(t => `
            <div class="calendar-event-pill event-task priority-${(t.priority || 'medium').toLowerCase()}"
                 onclick="openEditTaskModal('${escapeHtml(t.id)}')"
                 title="Task: ${escapeHtml(t.title)} (${t.employee || 'Unassigned'})">
              <span class="event-icon">☑</span>
              <span class="event-text">${escapeHtml(t.title)}</span>
            </div>
          `).join('')}

          ${dayTasks.length > 2 ? `
            <div class="event-more" onclick="navigate('tasks')">+${dayTasks.length - 2} more tasks</div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // 3. Next month trailing days to complete grid (total cells multiple of 7)
  const totalCells = startOffset + daysInMonth;
  const trailingDays = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= trailingDays; i++) {
    html += `
      <div class="calendar-day-cell other-month">
        <div class="day-num">${i}</div>
      </div>
    `;
  }

  grid.innerHTML = html;
}

function renderCalendarUpcomingLeaves(leaves) {
  const container = document.getElementById('calendar-upcoming-list');
  if (!container) return;

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = leaves
    .filter(l => l.end_date >= todayStr)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 5);

  if (!upcoming.length) {
    container.innerHTML = `<div class="text-muted fs-sm text-center" style="padding:16px 0">No upcoming leaves scheduled.</div>`;
    return;
  }

  container.innerHTML = upcoming.map(l => `
    <div class="upcoming-leave-item" onclick="openLeaveDetails('${escapeHtml(l.id)}')" style="cursor:pointer;" title="Click to view details">
      <div class="d-flex align-center gap-sm">
        <div style="width:28px; height:28px; border-radius:50%; background:${avatarColor(l.employee_name || l.employee_id)}; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#0A0A0A;">
          ${getInitials(l.employee_name || l.employee_id || '?')}
        </div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:13px; font-weight:600; color:var(--text-100); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${escapeHtml(l.employee_name || l.employee_id)}
          </div>
          <div style="font-size:11px; color:var(--text-300);">
            ${formatDate(l.start_date)} – ${formatDate(l.end_date)}
          </div>
        </div>
      </div>
      <div class="d-flex align-center gap-xs">
        ${leaveTypeBadge(l.leave_type)}
      </div>
    </div>
  `).join('');
}
