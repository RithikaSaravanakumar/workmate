/**
 * app.js — WorkMate SPA Core & Role-Aware Navigation
 * Handles: routing, navigation, role switching, sidebar, toasts,
 * session management, logout, and app initialization.
 */

"use strict";

// ----------------------------------------------------------------
// Shared Global State
// ----------------------------------------------------------------
let currentUser = null;
let currentPage = 'dashboard';
let filterDebounceTimer = null;

// ----------------------------------------------------------------
// API Fetch Helper
// ----------------------------------------------------------------
async function apiFetch(url, options = {}) {
  const defaults = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  };
  const merged = { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } };
  const res = await fetch(url, merged);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ----------------------------------------------------------------
// Toast Notifications
// ----------------------------------------------------------------
function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ----------------------------------------------------------------
// Confirmation Modal
// ----------------------------------------------------------------
let confirmResolver = null;

function showConfirm(title, text, icon = '⚠️', okLabel = 'Delete') {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-text').textContent = text;
    document.getElementById('confirm-icon').textContent = icon;
    const okBtn = document.getElementById('confirm-ok-btn');
    okBtn.textContent = okLabel;
    openOverlay('confirm-modal-overlay');
  });
}

function closeConfirm(result = false) {
  closeOverlay('confirm-modal-overlay');
  if (confirmResolver) {
    confirmResolver(result);
    confirmResolver = null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const okBtn = document.getElementById('confirm-ok-btn');
  if (okBtn) okBtn.onclick = () => closeConfirm(true);
});

// ----------------------------------------------------------------
// Modal Helpers
// ----------------------------------------------------------------
function openOverlay(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeOverlay(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// Close modals on clicking outside or ESC
document.addEventListener('click', (e) => {
  [
    'task-modal-overlay',
    'emp-modal-overlay',
    'confirm-modal-overlay',
    'leave-modal-overlay',
    'reject-modal-overlay',
    'leave-details-modal-overlay',
    'task-activity-modal-overlay'
  ].forEach(id => {
    const overlay = document.getElementById(id);
    if (e.target === overlay) {
      closeOverlay(id);
      if (id === 'confirm-modal-overlay') closeConfirm(false);
    }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    [
      'task-modal-overlay',
      'emp-modal-overlay',
      'confirm-modal-overlay',
      'leave-modal-overlay',
      'reject-modal-overlay',
      'leave-details-modal-overlay',
      'task-activity-modal-overlay'
    ].forEach(id => closeOverlay(id));
    closeConfirm(false);
  }
});

// ----------------------------------------------------------------
// Formatting & String Utilities
// ----------------------------------------------------------------
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function avatarColor(name) {
  const colors = [
    '#FFD21F', '#A78BFA', '#60A5FA', '#34D399',
    '#F07C6C', '#FDBA8C', '#5DD6D0', '#F5C542',
    '#818CF8', '#A8C69F', '#FBBF24', '#F4729A'
  ];
  let hash = 0;
  for (let c of (name || 'WorkMate')) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatFullDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function togglePwdApp(inputId, iconEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  iconEl.textContent = input.type === 'password' ? '👁' : '🙈';
}

// ----------------------------------------------------------------
// Navigation Router
// ----------------------------------------------------------------
const PAGE_CONFIG = {
  dashboard: { title: 'Dashboard', section: 'page-dashboard' },
  tasks:     { title: 'Task Board', section: 'page-tasks' },
  leaves:    { title: 'Leave Management', section: 'page-leaves' },
  calendar:  { title: 'Calendar & Schedule', section: 'page-calendar' },
  employees: { title: 'Employees Directory', section: 'page-employees', managerOnly: true },
  reports:   { title: 'Productivity Reports', section: 'page-reports', managerOnly: true },
  profile:   { title: 'My Profile', section: 'page-profile' },
  settings:  { title: 'System Settings', section: 'page-settings', managerOnly: true },
};

function navigate(page) {
  if (!PAGE_CONFIG[page]) return;

  // Block employee from manager-only pages
  if (currentUser && currentUser.role === 'employee' && PAGE_CONFIG[page].managerOnly) {
    showToast('Access denied: Manager permissions required.', 'error');
    return;
  }

  currentPage = page;

  // Update visible sections
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const sectionEl = document.getElementById(PAGE_CONFIG[page].section);
  if (sectionEl) sectionEl.classList.add('active');

  // Update nav link active state
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');

  // Update header title & action button
  const pageTitle = (page === 'tasks' && currentUser?.role === 'employee') ? 'My Tasks' : PAGE_CONFIG[page].title;
  document.getElementById('header-title').textContent = pageTitle;

  const actionBtn = document.getElementById('header-action-btn');
  if (currentUser && currentUser.role === 'employee') {
    if (page === 'leaves' || page === 'calendar' || page === 'dashboard') {
      actionBtn.style.display = 'flex';
      actionBtn.textContent = '🌴 Request Leave';
    } else {
      actionBtn.style.display = 'none';
    }
  } else {
    // Manager actions
    if (page === 'employees') {
      actionBtn.style.display = 'flex';
      actionBtn.textContent = '＋ Add Employee';
    } else if (page === 'leaves' || page === 'calendar') {
      actionBtn.style.display = 'flex';
      actionBtn.textContent = '🌴 Request Leave';
    } else if (page === 'profile' || page === 'settings' || page === 'reports') {
      actionBtn.style.display = 'none';
    } else {
      actionBtn.style.display = 'flex';
      actionBtn.textContent = '＋ Add Task';
    }
  }

  closeSidebar();

  // Load page-specific data
  if (page === 'dashboard') loadDashboard();
  else if (page === 'tasks') loadTasks();
  else if (page === 'leaves') loadLeaves();
  else if (page === 'calendar') loadCalendar();
  else if (page === 'employees') loadEmployees();
  else if (page === 'reports') loadReports();
  else if (page === 'profile') loadProfileData();
}

function headerActionClick() {
  if (currentUser && currentUser.role === 'employee') {
    openLeaveModal();
    return;
  }
  if (currentPage === 'employees') openAddEmployeeModal();
  else if (currentPage === 'leaves' || currentPage === 'calendar') openLeaveModal();
  else openAddTaskModal();
}

// ----------------------------------------------------------------
// Mobile Sidebar Controls
// ----------------------------------------------------------------
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').style.display =
    document.getElementById('sidebar').classList.contains('open') ? 'block' : 'none';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').style.display = 'none';
}

// ----------------------------------------------------------------
// Logout Handler
// ----------------------------------------------------------------
async function handleLogout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (e) { /* ignore */ }
  window.location.href = '/';
}

// ----------------------------------------------------------------
// App Initialization & Role Configuration
// ----------------------------------------------------------------
async function initApp() {
  const { ok, data } = await apiFetch('/api/auth/me');

  if (!ok) {
    window.location.href = '/';
    return;
  }

  currentUser = data;
  applyUserRoleView(currentUser);
  navigate('dashboard');
}

function applyUserRoleView(user) {
  const name = user.full_name || user.name || 'User';
  const role = user.role || 'manager';
  const initials = getInitials(name);
  const color = avatarColor(name);

  // Update Sidebar user display
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  if (sidebarAvatar) {
    sidebarAvatar.textContent = initials;
    sidebarAvatar.style.background = color;
  }

  const sidebarName = document.getElementById('sidebar-user-name');
  if (sidebarName) sidebarName.textContent = name;

  const sidebarRole = document.getElementById('sidebar-user-role');
  if (sidebarRole) sidebarRole.textContent = role === 'manager' ? '👔 Manager' : '👤 Employee';

  // Update Header Avatar & Role Badge
  const headerAvatar = document.getElementById('header-avatar');
  if (headerAvatar) {
    headerAvatar.textContent = initials;
    headerAvatar.style.background = color;
  }

  const roleBadge = document.getElementById('header-role-badge');
  if (roleBadge) {
    roleBadge.textContent = role === 'manager' ? 'Manager' : 'Employee';
    roleBadge.className = `role-badge ${role === 'manager' ? 'role-badge-manager' : 'role-badge-employee'}`;
  }

  // Manage visibility of role-restricted elements
  const isMgr = (role === 'manager');
  document.querySelectorAll('.manager-only').forEach(el => {
    el.style.display = isMgr ? '' : 'none';
  });

  // Customize task navigation label for employee
  const tasksNavText = document.getElementById('nav-tasks-text');
  if (tasksNavText) {
    tasksNavText.textContent = isMgr ? 'Task Board' : 'My Tasks';
  }
  const tasksPageTitle = document.getElementById('tasks-page-title');
  if (tasksPageTitle) {
    tasksPageTitle.textContent = isMgr ? 'Task Board' : 'My Tasks';
  }
}

// Global search bar handler
function handleGlobalSearch(e) {
  const val = e.target.value.trim();
  if (e.key === 'Enter') {
    if (currentPage === 'leaves') {
      const ls = document.getElementById('leave-search');
      if (ls) { ls.value = val; applyLeaveFilters(); }
    } else {
      navigate('tasks');
      const ts = document.getElementById('task-search');
      if (ts) { ts.value = val; applyTaskFilters(); }
    }
  }
}

function debounceFilter() {
  clearTimeout(filterDebounceTimer);
  filterDebounceTimer = setTimeout(applyTaskFilters, 300);
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
