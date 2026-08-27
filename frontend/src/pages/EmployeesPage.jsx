import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Building,
  CheckSquare,
  Sparkles,
  Shield,
  Search,
  RefreshCw,
  AlertCircle,
  Filter,
  Palmtree,
  UserCheck,
} from 'lucide-react';
import { api } from '../services/api';

export default function EmployeesPage({
  user,
  onOpenEmployeeModal,
  onOpenEditEmployeeModal,
  onDeleteEmployee,
  onOpenTaskModal,
  showToast,
}) {
  const [employees, setEmployees] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const role = user?.role || 'manager';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';

  const loadEmployees = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getEmployees();
      if (res.ok) {
        setEmployees(res.data || []);
      } else if (res.status === 401) {
        /* Session loading */
      } else {
        setError(res.data?.error || 'Failed to load employee directory.');
        if (showToast) showToast(res.data?.error || 'Failed to load employees.', 'error');
      }
    } catch (e) {
      setError('Network error loading employees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [user]);

  // Derived filter options
  const departments = ['all', ...new Set(employees.map((e) => e.department).filter(Boolean))];
  const managers = [
    'all',
    ...new Set(
      employees
        .map((e) => e.manager_name || e.manager_id)
        .filter(Boolean)
    ),
  ];

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (emp.name || '').toLowerCase().includes(q) ||
      (emp.employee_id || '').toLowerCase().includes(q) ||
      (emp.email || '').toLowerCase().includes(q) ||
      (emp.department || '').toLowerCase().includes(q) ||
      (emp.manager_name || '').toLowerCase().includes(q) ||
      (emp.manager_id || '').toLowerCase().includes(q);

    const matchesDept = deptFilter === 'all' || emp.department === deptFilter;
    const matchesManager =
      managerFilter === 'all' ||
      emp.manager_name === managerFilter ||
      emp.manager_id === managerFilter;

    let matchesStatus = true;
    if (statusFilter === 'checked_in') {
      matchesStatus = emp.attendance_status === 'Checked In' || emp.attendance_status === 'Present';
    } else if (statusFilter === 'checked_out') {
      matchesStatus = emp.attendance_status === 'Checked Out';
    } else if (statusFilter === 'on_leave') {
      matchesStatus = emp.attendance_status === 'On Leave' || (emp.leave_status && emp.leave_status !== 'Active');
    } else if (statusFilter === 'not_checked_in') {
      matchesStatus = emp.attendance_status === 'Not Checked In';
    }

    return matchesSearch && matchesDept && matchesManager && matchesStatus;
  });

  return (
    <div>
      {/* Top Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-100)' }}>
              {isAdmin ? 'Organization Employee Directory' : 'Team Directory & Workload'}
            </h2>
            <span
              className="badge"
              style={{
                background: isAdmin ? 'rgba(255, 210, 31, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                color: isAdmin ? 'var(--primary-yellow)' : 'var(--sky)',
                border: `1px solid ${isAdmin ? 'rgba(255, 210, 31, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                fontWeight: 800,
              }}
            >
              {isAdmin ? '🛡️ Organization View' : '👔 Department Team'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
            {isAdmin
              ? 'Company-wide workforce overview, reporting manager hierarchy, active tasks, attendance, and leave statuses.'
              : 'Manage assigned team members, department capacities, workloads, and login credentials.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* View Mode Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px',
              border: '1px solid var(--border)',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: viewMode === 'grid' ? 'var(--primary-yellow)' : 'transparent',
                color: viewMode === 'grid' ? '#0A0A0A' : 'var(--text-300)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s var(--ease)',
              }}
            >
              <LayoutGrid size={14} /> Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: viewMode === 'table' ? 'var(--primary-yellow)' : 'transparent',
                color: viewMode === 'table' ? '#0A0A0A' : 'var(--text-300)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s var(--ease)',
              }}
            >
              <List size={14} /> Table
            </button>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={loadEmployees} title="Refresh employee roster">
            <RefreshCw size={14} /> Refresh
          </button>

          {isManager && (
            <button className="btn btn-primary" onClick={onOpenEmployeeModal}>
              <Plus size={16} /> Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          marginBottom: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '220px', flex: '1 1 220px' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, ID, email, manager..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '32px',
                paddingRight: '12px',
                paddingTop: '7px',
                paddingBottom: '7px',
                fontSize: '12.5px',
                width: '100%',
                background: 'var(--bg-base)',
              }}
            />
          </div>

          {/* Department Filter */}
          <select
            className="form-input"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{
              paddingTop: '7px',
              paddingBottom: '7px',
              fontSize: '12.5px',
              width: 'auto',
              minWidth: '150px',
              background: 'var(--bg-base)',
            }}
          >
            <option value="all">All Departments</option>
            {departments.filter((d) => d !== 'all').map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Manager Filter (for CEO/Admin) */}
          {isAdmin && managers.length > 1 && (
            <select
              className="form-input"
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              style={{
                paddingTop: '7px',
                paddingBottom: '7px',
                fontSize: '12.5px',
                width: 'auto',
                minWidth: '150px',
                background: 'var(--bg-base)',
              }}
            >
              <option value="all">All Managers</option>
              {managers.filter((m) => m !== 'all').map((m) => (
                <option key={m} value={m}>
                  Manager: {m}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              paddingTop: '7px',
              paddingBottom: '7px',
              fontSize: '12.5px',
              width: 'auto',
              minWidth: '140px',
              background: 'var(--bg-base)',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="checked_in">Checked In / Present</option>
            <option value="checked_out">Checked Out</option>
            <option value="on_leave">On Leave</option>
            <option value="not_checked_in">Not Checked In</option>
          </select>
        </div>

        {(searchQuery || deptFilter !== 'all' || managerFilter !== 'all' || statusFilter !== 'all') && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchQuery('');
              setDeptFilter('all');
              setManagerFilter('all');
              setStatusFilter('all');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin-slow" style={{ margin: '0 auto 12px', display: 'block' }} />
          Loading organization employee directory...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '36px', textAlign: 'center', border: '1px solid rgba(255,107,107,0.3)' }}>
          <AlertCircle size={36} color="var(--coral)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--coral)', marginBottom: '8px' }}>
            Failed to Load Employees
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
          <button className="btn btn-secondary" onClick={loadEmployees}>
            <RefreshCw size={14} /> Retry Loading
          </button>
        </div>
      ) : employees.length === 0 ? (
        <div className="empty-state card" style={{ padding: '48px', textAlign: 'center' }}>
          <div
            className="empty-state-icon"
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(255,210,31,0.1)',
              color: 'var(--primary-yellow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Users size={28} />
          </div>
          <h3 className="empty-state-title" style={{ fontSize: '17px', fontWeight: 800, marginBottom: '6px' }}>
            No Employees Registered
          </h3>
          <p
            className="empty-state-desc"
            style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px' }}
          >
            {isManager
              ? 'As a Manager, you create employee accounts for your direct team members. Add your first team member below.'
              : 'Employees registered under department managers will appear in this company-wide directory.'}
          </p>
          {isManager && (
            <button className="btn btn-primary" onClick={onOpenEmployeeModal}>
              <Plus size={16} /> Add Team Member
            </button>
          )}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No employees match your search or filter criteria.</p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchQuery('');
              setDeptFilter('all');
              setManagerFilter('all');
              setStatusFilter('all');
            }}
            style={{ marginTop: '12px' }}
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ====================================================================
           GRID / CARD VIEW
        ==================================================================== */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredEmployees.map((emp) => {
            const initials = (emp.name || 'U')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0].toUpperCase())
              .join('');

            const total = emp.task_count || 0;
            const completed = emp.completed_tasks || 0;
            const active = emp.active_task_count || Math.max(0, total - completed);

            const attStatus = emp.attendance_status || 'Not Checked In';
            const leaveStatus = emp.leave_status || 'Active';

            const attBadgeClass =
              attStatus === 'Checked In' || attStatus === 'Present'
                ? 'badge-completed'
                : attStatus === 'Checked Out'
                ? 'badge-in-progress'
                : attStatus === 'On Leave'
                ? 'badge-priority-high'
                : '';

            return (
              <div
                key={emp.employee_id}
                className="card card-hover"
                style={{
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Employee Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #FFE44D 0%, #FFD21F 100%)',
                      color: '#0A0A0A',
                      fontWeight: 800,
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 0 12px rgba(255, 210, 31, 0.2)',
                    }}
                  >
                    {emp.avatar ? (
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '15.5px',
                        color: 'var(--text-100)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {emp.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--primary-yellow)',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {emp.employee_id}
                      </span>
                      <span
                        className="badge"
                        style={{
                          fontSize: '10.5px',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-200)',
                          border: '1px solid var(--border)',
                          padding: '1px 6px',
                        }}
                      >
                        {emp.department}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reporting Manager Info Pill */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    color: 'var(--text-200)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Reporting Manager:</span>
                  <strong style={{ color: 'var(--text-100)' }}>
                    {emp.manager_name || 'Alex Morgan'} ({emp.manager_id || 'MGR-001'})
                  </strong>
                </div>

                {/* Contact info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', color: 'var(--text-300)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={13} color="var(--text-muted)" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</span>
                  </div>
                  {emp.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={13} color="var(--text-muted)" />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                </div>

                {/* Live Status Row */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={`badge ${attBadgeClass}`} style={{ fontSize: '11px' }}>
                    <Clock size={11} style={{ marginRight: '4px' }} />
                    {attStatus}
                  </span>

                  {leaveStatus !== 'Active' ? (
                    <span className="badge badge-priority-high" style={{ fontSize: '11px' }}>
                      <Palmtree size={11} style={{ marginRight: '4px' }} />
                      {leaveStatus}
                    </span>
                  ) : (
                    <span className="badge" style={{ fontSize: '11px', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      Active Roster
                    </span>
                  )}
                </div>

                {/* Task statistics */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    background: 'var(--bg-surface)',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                    marginTop: 'auto',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-100)' }}>{total}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Tasks</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sky)' }}>{active}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Active</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--emerald)' }}>{completed}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Completed</div>
                  </div>
                </div>

                {/* Action buttons (for Manager) */}
                {isManager && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => onOpenEditEmployeeModal(emp)}
                    >
                      <Edit2 size={13} /> Edit Profile
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDeleteEmployee(emp.employee_id, emp.name)}
                      title="Remove Employee"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ====================================================================
           TABLE VIEW
        ==================================================================== */
        <div className="card">
          <div className="table-wrap">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Reporting Manager</th>
                  <th>Email &amp; Phone</th>
                  <th>Total Tasks</th>
                  <th>Completed</th>
                  <th>Attendance Status</th>
                  <th>Leave Status</th>
                  {isManager && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const attStatus = emp.attendance_status || 'Not Checked In';
                  const leaveStatus = emp.leave_status || 'Active';
                  const total = emp.task_count || 0;
                  const completed = emp.completed_tasks || 0;

                  return (
                    <tr key={emp.employee_id}>
                      <td>
                        <span style={{ color: 'var(--primary-yellow)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {emp.employee_id}
                        </span>
                      </td>
                      <td>
                        <div className="table-avatar-cell">
                          <div
                            className="table-avatar"
                            style={{ background: 'linear-gradient(135deg, #FFE44D, #FFD21F)', color: '#0A0A0A' }}
                          >
                            {(emp.name || 'U')[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-100)' }}>
                              {emp.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.role || 'Employee'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-in-progress" style={{ fontSize: '11px' }}>
                          {emp.department}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-100)' }}>
                          {emp.manager_name || 'Alex Morgan'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          ID: {emp.manager_id || 'MGR-001'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-200)' }}>{emp.email}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{emp.phone || '—'}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-100)' }}>{total} tasks</span>
                      </td>
                      <td>
                        <span className="badge badge-completed" style={{ fontWeight: 800 }}>
                          {completed} done
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            attStatus === 'Checked In' || attStatus === 'Present'
                              ? 'badge-completed'
                              : attStatus === 'Checked Out'
                              ? 'badge-in-progress'
                              : attStatus === 'On Leave'
                              ? 'badge-priority-high'
                              : ''
                          }`}
                          style={{ fontSize: '11px' }}
                        >
                          {attStatus}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            leaveStatus !== 'Active' ? 'badge-priority-high' : ''
                          }`}
                          style={{
                            fontSize: '11px',
                            background: leaveStatus === 'Active' ? 'var(--bg-surface)' : undefined,
                            border: leaveStatus === 'Active' ? '1px solid var(--border)' : undefined,
                            color: leaveStatus === 'Active' ? 'var(--text-muted)' : undefined,
                          }}
                        >
                          {leaveStatus}
                        </span>
                      </td>
                      {isManager && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => onOpenEditEmployeeModal(emp)}
                              title="Edit Profile"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => onDeleteEmployee(emp.employee_id, emp.name)}
                              title="Remove Employee"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
