/**
 * frontend/src/services/api.js — Unified API Client
 * Wraps fetch calls to Flask backend with credentials, Bearer Token fallback & JSON parsing.
 */

export const TOKEN_KEY = 'workmate_auth_token';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    /* ignore */
  }
}

export async function apiFetch(endpoint, options = {}) {
  const token = getStoredToken();
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
    defaultHeaders['X-Auth-Token'] = token;
  }

  const defaultOptions = {
    headers: defaultHeaders,
    credentials: 'include',
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  };

  try {
    const res = await fetch(endpoint, config);
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { error: 'Network error. Please check server connection.' },
    };
  }
}

export const api = {
  // Auth
  login: async (credentials) => {
    const res = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    if (res.ok && res.data && res.data.token) {
      setStoredToken(res.data.token);
    }
    return res;
  },
  register: async (data) => {
    const res = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });
    if (res.ok && res.data && res.data.token) {
      setStoredToken(res.data.token);
    }
    return res;
  },
  getMe: () => apiFetch('/api/auth/me'),
  logout: async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },
  updateProfile: (data) => apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => apiFetch('/api/auth/password', { method: 'PUT', body: JSON.stringify(data) }),

  // Tasks
  getTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/tasks${qs ? `?${qs}` : ''}`);
  },
  getTask: (id) => apiFetch(`/api/tasks/${encodeURIComponent(id)}`),
  createTask: (data) => apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) => apiFetch(`/api/tasks/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateTaskStatus: (id, status, note = '') =>
    apiFetch(`/api/tasks/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    }),
  getTaskActivity: (id) => apiFetch(`/api/tasks/${encodeURIComponent(id)}/activity`),
  deleteTask: (id) => apiFetch(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Employees & Team
  getEmployees: () => apiFetch('/api/employees'),
  getMyTeam: () => apiFetch('/api/employee/team'),
  createEmployee: (data) => apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => apiFetch(`/api/employees/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id) => apiFetch(`/api/employees/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Leaves
  getLeaves: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/leaves${qs ? `?${qs}` : ''}`);
  },
  getLeaveStats: () => apiFetch('/api/leaves/stats'),
  getLeaveDetails: (id) => apiFetch(`/api/leaves/${encodeURIComponent(id)}`),
  createLeave: (data) => apiFetch('/api/leaves', { method: 'POST', body: JSON.stringify(data) }),
  approveLeave: (id, comment = '') =>
    apiFetch(`/api/leaves/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  rejectLeave: (id, rejection_reason) =>
    apiFetch(`/api/leaves/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason }),
    }),
  deleteLeave: (id) => apiFetch(`/api/leaves/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Manager's own leave & CEO Approvals
  getManagerOwnLeaves: () => apiFetch('/api/manager/leaves'),
  submitManagerOwnLeave: (data) => apiFetch('/api/manager/leaves', { method: 'POST', body: JSON.stringify(data) }),
  getAdminLeaves: () => apiFetch('/api/admin/leaves'),
  ceoApproveLeave: (id, comment = '') =>
    apiFetch(`/api/admin/leaves/${encodeURIComponent(id)}/approve`, { method: 'POST', body: JSON.stringify({ comment }) }),
  ceoRejectLeave: (id, reason) =>
    apiFetch(`/api/admin/leaves/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ rejection_reason: reason }) }),

  // Attendance
  checkIn: () => apiFetch('/api/attendance/check-in', { method: 'POST' }),
  checkOut: () => apiFetch('/api/attendance/check-out', { method: 'POST' }),
  getTodayAttendance: () => apiFetch('/api/attendance/today'),
  getAttendanceHistory: () => apiFetch('/api/attendance/history'),
  getTeamAttendance: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/attendance/team${qs ? `?${qs}` : ''}`);
  },
  getOrganizationAttendance: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/attendance/organization${qs ? `?${qs}` : ''}`);
  },

  // CEO / Admin
  getAdminDashboard: () => apiFetch('/api/admin/dashboard'),
  getAdminManagers: () => apiFetch('/api/admin/managers'),
  getAdminEmployees: () => apiFetch('/api/admin/employees'),

  // Dashboard & Reports & Calendar
  getDashboard: () => apiFetch('/api/dashboard'),
  getReports: () => apiFetch('/api/reports'),
  getCalendar: () => apiFetch('/api/calendar'),
};
